import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GameState } from '@tournament/contracts';
import { Prisma, type Game, type GameScoreEvent } from '../../generated/client';
import { PrismaService } from '../database/prisma.service';
import { applyScoreMutation } from './score-state';
import { ScoringLeaseService } from './scoring-lease.service';
import type { ScoreCommandInput, TransitionCommandInput } from './live-scoring.schemas';

@Injectable()
export class LiveScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leases: ScoringLeaseService,
  ) {}

  async applyScoreCommand(
    organizationId: string,
    gameId: string,
    actorUserId: string,
    leaseToken: string,
    command: ScoreCommandInput,
    correlationId: string,
  ): Promise<{ game: GameState; eventId: string; duplicate: boolean }> {
    return this.prisma.$transaction(
      async (transaction) => {
        const duplicate = await transaction.gameScoreEvent.findUnique({
          where: { gameId_idempotencyKey: { gameId, idempotencyKey: command.idempotencyKey } },
        });
        if (duplicate) {
          const game = await this.requireGame(transaction, organizationId, gameId);
          return {
            game: await this.state(transaction, game),
            eventId: duplicate.id,
            duplicate: true,
          };
        }
        await this.leases.assertValid(
          transaction,
          gameId,
          organizationId,
          actorUserId,
          command.scoringSessionId,
          leaseToken,
        );
        const assignment = await transaction.gameAssignment.findFirst({
          where: { organizationId, gameId, userId: actorUserId, type: 'SCOREKEEPER', active: true },
        });
        if (!assignment)
          throw new ForbiddenException({
            code: 'NOT_ASSIGNED_SCOREKEEPER',
            message: 'Scorekeeper assignment is required',
          });
        const game = await this.requireGame(transaction, organizationId, gameId);
        if (game.status !== 'LIVE') {
          throw new ConflictException({
            code: 'GAME_NOT_LIVE',
            message: 'Points may be recorded only while the game is live',
          });
        }
        if (game.version !== command.expectedVersion) throw this.stale();
        if (game.currentPeriod !== command.period) {
          throw new ConflictException({
            code: 'INVALID_PERIOD',
            message: 'Command period does not match the active period',
          });
        }
        let corrected: GameScoreEvent | null = null;
        if (command.correctionOfEventId) {
          corrected = await transaction.gameScoreEvent.findFirst({
            where: { id: command.correctionOfEventId, gameId, organizationId, correctedBy: null },
          });
          if (!corrected)
            throw new ConflictException({
              code: 'INVALID_CORRECTION',
              message: 'Score event cannot be corrected',
            });
        }
        const applied = applyScoreMutation(
          {
            homeTeamId: game.homeTeamId ?? '',
            awayTeamId: game.awayTeamId ?? '',
            homeScore: game.homeScore,
            awayScore: game.awayScore,
          },
          {
            type: command.type,
            ...(command.teamId ? { teamId: command.teamId } : {}),
            ...(corrected
              ? {
                  correctedPointsDelta: corrected.pointsDelta,
                  correctedTeamId: corrected.teamId ?? undefined,
                }
              : {}),
          },
        );
        const nextVersion = game.version + 1;
        const nextSequence = game.lastEventSequence + 1;
        const updated = await transaction.game.updateMany({
          where: { id: gameId, organizationId, version: command.expectedVersion, status: 'LIVE' },
          data: {
            homeScore: applied.homeScore,
            awayScore: applied.awayScore,
            version: nextVersion,
            lastEventSequence: nextSequence,
          },
        });
        if (updated.count !== 1) throw this.stale();
        if (applied.pointsDelta !== 0) {
          await transaction.gamePeriod.upsert({
            where: { gameId_periodNumber: { gameId, periodNumber: command.period } },
            create: {
              organizationId,
              gameId,
              periodNumber: command.period,
              homeScore: applied.teamId === game.homeTeamId ? applied.pointsDelta : 0,
              awayScore: applied.teamId === game.awayTeamId ? applied.pointsDelta : 0,
            },
            update: {
              homeScore:
                applied.teamId === game.homeTeamId ? { increment: applied.pointsDelta } : undefined,
              awayScore:
                applied.teamId === game.awayTeamId ? { increment: applied.pointsDelta } : undefined,
            },
          });
        }
        const event = await transaction.gameScoreEvent.create({
          data: {
            organizationId,
            gameId,
            actorUserId,
            scoringSessionId: command.scoringSessionId,
            idempotencyKey: command.idempotencyKey,
            sequence: nextSequence,
            resultingGameVersion: nextVersion,
            period: command.period,
            type: command.type,
            pointsDelta: applied.pointsDelta,
            occurredAt: command.occurredAt,
            ...(applied.teamId ? { teamId: applied.teamId } : {}),
            ...(command.correctionOfEventId
              ? { correctionOfEventId: command.correctionOfEventId }
              : {}),
            ...(command.correctionReason ? { correctionReason: command.correctionReason } : {}),
            ...(command.note ? { note: command.note } : {}),
          },
        });
        await transaction.auditLog.create({
          data: {
            organizationId,
            actorUserId,
            correlationId,
            action: 'game.score-event.recorded',
            resourceType: 'GameScoreEvent',
            resourceId: event.id,
            outcome: 'SUCCESS',
            changes: {
              type: command.type,
              pointsDelta: applied.pointsDelta,
              gameVersion: nextVersion,
            },
            metadata: { gameId, idempotencyKey: command.idempotencyKey },
          },
        });
        await transaction.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'Game',
            aggregateId: gameId,
            eventType: 'game.score-updated',
            payload: { gameId, gameVersion: nextVersion, scoreEventId: event.id, correlationId },
          },
        });
        const committedGame = await this.requireGame(transaction, organizationId, gameId);
        return {
          game: await this.state(transaction, committedGame),
          eventId: event.id,
          duplicate: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async transition(
    organizationId: string,
    gameId: string,
    actorUserId: string,
    leaseToken: string | undefined,
    command: TransitionCommandInput,
    correlationId: string,
    elevated: boolean,
  ): Promise<{ game: GameState; transitionId: string; duplicate: boolean }> {
    return this.prisma.$transaction(
      async (transaction) => {
        const duplicate = await transaction.gameStateTransition.findUnique({
          where: { gameId_idempotencyKey: { gameId, idempotencyKey: command.idempotencyKey } },
        });
        if (duplicate) {
          const game = await this.requireGame(transaction, organizationId, gameId);
          return {
            game: await this.state(transaction, game),
            transitionId: duplicate.id,
            duplicate: true,
          };
        }
        if (!elevated) {
          if (!command.scoringSessionId || !leaseToken) {
            throw new ForbiddenException({
              code: 'INVALID_SCORING_LEASE',
              message: 'Scoring lease is required',
            });
          }
          await this.leases.assertValid(
            transaction,
            gameId,
            organizationId,
            actorUserId,
            command.scoringSessionId,
            leaseToken,
          );
        }
        const game = await this.requireGame(transaction, organizationId, gameId);
        if (game.version !== command.expectedVersion) throw this.stale();
        const next = this.nextTransition(game, command, elevated);
        const resultingGameVersion = game.version + 1;
        const updated = await transaction.game.updateMany({
          where: { id: gameId, organizationId, version: command.expectedVersion },
          data: { ...next.update, version: resultingGameVersion },
        });
        if (updated.count !== 1) throw this.stale();
        if (
          command.type === 'GAME_STARTED' ||
          command.type === 'PERIOD_STARTED' ||
          command.type === 'OVERTIME_STARTED'
        ) {
          const period = next.period;
          await transaction.gamePeriod.upsert({
            where: { gameId_periodNumber: { gameId, periodNumber: period } },
            create: {
              organizationId,
              gameId,
              periodNumber: period,
              isOvertime: period > game.regulationPeriods,
              startedAt: command.occurredAt,
            },
            update: { startedAt: command.occurredAt, endedAt: null },
          });
        }
        if (command.type === 'PERIOD_ENDED') {
          await transaction.gamePeriod.updateMany({
            where: { gameId, periodNumber: next.period },
            data: { endedAt: command.occurredAt },
          });
        }
        const transition = await transaction.gameStateTransition.create({
          data: {
            organizationId,
            gameId,
            actorUserId,
            idempotencyKey: command.idempotencyKey,
            type: command.type,
            fromStatus: game.status,
            toStatus: next.status,
            resultingGameVersion,
            occurredAt: command.occurredAt,
            ...(next.period ? { period: next.period } : {}),
            ...(command.reason ? { reason: command.reason } : {}),
          },
        });
        await transaction.auditLog.create({
          data: {
            organizationId,
            actorUserId,
            correlationId,
            action: `game.transition.${command.type.toLowerCase()}`,
            resourceType: 'Game',
            resourceId: gameId,
            outcome: 'SUCCESS',
            changes: { from: game.status, to: next.status, version: resultingGameVersion },
            metadata: { elevated },
          },
        });
        await transaction.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'Game',
            aggregateId: gameId,
            eventType: command.type === 'GAME_FINALIZED' ? 'game.finalized' : 'game.state-updated',
            payload: {
              gameId,
              gameVersion: resultingGameVersion,
              transitionId: transition.id,
              correlationId,
            },
          },
        });
        const committed = await this.requireGame(transaction, organizationId, gameId);
        return {
          game: await this.state(transaction, committed),
          transitionId: transition.id,
          duplicate: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getState(organizationId: string, gameId: string): Promise<GameState> {
    const game = await this.requireGame(this.prisma, organizationId, gameId);
    return this.state(this.prisma, game);
  }

  private nextTransition(game: Game, command: TransitionCommandInput, elevated: boolean) {
    switch (command.type) {
      case 'GAME_STARTED':
        if (game.status !== 'SCHEDULED') throw this.invalidTransition();
        return {
          status: 'LIVE' as const,
          period: 1,
          update: { status: 'LIVE' as const, currentPeriod: 1, startedAt: command.occurredAt },
        };
      case 'PERIOD_STARTED': {
        if (
          !['PAUSED', 'LIVE'].includes(game.status) ||
          !command.period ||
          command.period > game.regulationPeriods
        )
          throw this.invalidTransition();
        return {
          status: 'LIVE' as const,
          period: command.period,
          update: { status: 'LIVE' as const, currentPeriod: command.period },
        };
      }
      case 'PERIOD_PAUSED':
        if (game.status !== 'LIVE') throw this.invalidTransition();
        return {
          status: 'PAUSED' as const,
          period: game.currentPeriod,
          update: { status: 'PAUSED' as const },
        };
      case 'PERIOD_ENDED':
        if (game.status !== 'LIVE' || command.period !== game.currentPeriod)
          throw this.invalidTransition();
        return {
          status: 'PAUSED' as const,
          period: game.currentPeriod,
          update: { status: 'PAUSED' as const },
        };
      case 'OVERTIME_STARTED': {
        const period = command.period ?? game.currentPeriod + 1;
        if (
          !['PAUSED', 'LIVE'].includes(game.status) ||
          period <= game.regulationPeriods ||
          game.homeScore !== game.awayScore
        )
          throw this.invalidTransition();
        return {
          status: 'LIVE' as const,
          period,
          update: { status: 'LIVE' as const, currentPeriod: period },
        };
      }
      case 'GAME_ENDED':
        if (!['LIVE', 'PAUSED'].includes(game.status)) throw this.invalidTransition();
        return {
          status: 'PAUSED' as const,
          period: game.currentPeriod,
          update: { status: 'PAUSED' as const },
        };
      case 'GAME_FINALIZED':
        if (!['PAUSED', 'LIVE'].includes(game.status)) throw this.invalidTransition();
        return {
          status: 'FINAL' as const,
          period: game.currentPeriod,
          update: { status: 'FINAL' as const, finalizedAt: command.occurredAt },
        };
      case 'GAME_REOPENED':
        if (!elevated || game.status !== 'FINAL' || !command.reason) throw this.invalidTransition();
        return {
          status: 'PAUSED' as const,
          period: game.currentPeriod,
          update: { status: 'PAUSED' as const, finalizedAt: null },
        };
    }
  }

  private async requireGame(
    client: Pick<PrismaService, 'game'>,
    organizationId: string,
    gameId: string,
  ): Promise<Game> {
    const game = await client.game.findFirst({
      where: { id: gameId, organizationId, deletedAt: null },
    });
    if (!game)
      throw new NotFoundException({ code: 'GAME_NOT_FOUND', message: 'Game was not found' });
    if (!game.homeTeamId || !game.awayTeamId) {
      throw new ConflictException({
        code: 'GAME_TEAMS_INCOMPLETE',
        message: 'Both teams must be assigned before scoring',
      });
    }
    return game;
  }

  private async state(client: Pick<PrismaService, 'gamePeriod'>, game: Game): Promise<GameState> {
    const periods = await client.gamePeriod.findMany({
      where: { gameId: game.id },
      orderBy: { periodNumber: 'asc' },
    });
    return {
      id: game.id,
      scheduledAt: game.scheduledAt.toISOString(),
      status: game.status,
      homeTeam: game.homeTeamId
        ? { id: game.homeTeamId, name: '', shortName: null, logoUrl: null }
        : null,
      awayTeam: game.awayTeamId
        ? { id: game.awayTeamId, name: '', shortName: null, logoUrl: null }
        : null,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      version: game.version,
      currentPeriod: game.currentPeriod,
      lastEventSequence: game.lastEventSequence,
      periods: periods.map((period) => ({
        period: period.periodNumber,
        homeScore: period.homeScore,
        awayScore: period.awayScore,
      })),
    };
  }

  private stale(): ConflictException {
    return new ConflictException({
      code: 'STALE_GAME_VERSION',
      message: 'Game state changed; resynchronize before retrying',
    });
  }

  private invalidTransition(): ConflictException {
    return new ConflictException({
      code: 'INVALID_GAME_TRANSITION',
      message: 'Game cannot make that transition from its current state',
    });
  }
}
