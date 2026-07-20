import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../database/prisma.service';
import { generateSingleElimination } from '../competition/bracket';
import { generateRoundRobin } from '../competition/round-robin';
import {
  calculateStandings,
  type AuthoritativeResult,
  type TieBreaker,
} from '../competition/standings';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async createFixture(
    organizationId: string,
    input: {
      tournamentId: string;
      divisionId?: string;
      stageId?: string;
      homeTeamId: string;
      awayTeamId: string;
      venueId?: string;
      courtId?: string;
      scheduledAt: Date;
      regulationPeriods: number;
      published: boolean;
    },
  ) {
    await this.validateTeams(organizationId, input.tournamentId, [
      input.homeTeamId,
      input.awayTeamId,
    ]);
    return this.prisma.game.create({ data: { organizationId, status: 'SCHEDULED', ...input } });
  }

  async generateRoundRobinFixtures(
    organizationId: string,
    tournamentId: string,
    stageId: string,
    input: {
      teamIds: string[];
      startsAt: Date;
      intervalMinutes: number;
      venueId?: string;
      courtId?: string;
      published: boolean;
    },
  ) {
    const stage = await this.requireStage(organizationId, tournamentId, stageId);
    if (!['SINGLE_ROUND_ROBIN', 'DOUBLE_ROUND_ROBIN'].includes(stage.format)) {
      throw new ConflictException({
        code: 'INVALID_COMPETITION_FORMAT',
        message: 'Stage is not configured for round-robin scheduling',
      });
    }
    await this.validateTeams(organizationId, tournamentId, input.teamIds);
    const pairings = generateRoundRobin(input.teamIds, stage.format === 'DOUBLE_ROUND_ROBIN');
    const ids = pairings.map(() => randomUUID());
    await this.prisma.game.createMany({
      data: pairings.map((pairing, index) => ({
        id: ids[index] as string,
        organizationId,
        tournamentId,
        divisionId: stage.divisionId,
        stageId,
        homeTeamId: pairing.homeTeamId,
        awayTeamId: pairing.awayTeamId,
        scheduledAt: new Date(input.startsAt.getTime() + index * input.intervalMinutes * 60_000),
        regulationPeriods: stage.ruleSet?.regulationPeriods ?? 4,
        status: 'SCHEDULED' as const,
        published: input.published,
        ...(input.venueId ? { venueId: input.venueId } : {}),
        ...(input.courtId ? { courtId: input.courtId } : {}),
      })),
    });
    return {
      created: ids.length,
      gameIds: ids,
      rounds: Math.max(...pairings.map((pairing) => pairing.round)),
    };
  }

  async generateBracket(
    organizationId: string,
    tournamentId: string,
    stageId: string,
    input: {
      name: string;
      seededTeamIds: string[];
      startsAt: Date;
      roundIntervalMinutes: number;
      venueId?: string;
      courtId?: string;
      published: boolean;
    },
  ) {
    const stage = await this.requireStage(organizationId, tournamentId, stageId);
    if (!['SINGLE_ELIMINATION', 'GROUPS_THEN_KNOCKOUT'].includes(stage.format)) {
      throw new ConflictException({
        code: 'INVALID_COMPETITION_FORMAT',
        message: 'Stage is not configured for elimination scheduling',
      });
    }
    await this.validateTeams(organizationId, tournamentId, input.seededTeamIds);
    const slots = generateSingleElimination(input.seededTeamIds);
    return this.prisma.$transaction(
      async (transaction) => {
        const bracket = await transaction.bracket.create({
          data: { organizationId, stageId, name: input.name, published: input.published },
        });
        const roundIds = new Map<number, string>();
        const roundNumbers = [...new Set(slots.map((slot) => slot.round))];
        for (const roundNumber of roundNumbers) {
          const round = await transaction.bracketRound.create({
            data: {
              organizationId,
              bracketId: bracket.id,
              roundNumber,
              name: this.roundName(roundNumber, roundNumbers.length),
            },
          });
          roundIds.set(roundNumber, round.id);
        }
        const gameIds = new Map<string, string>();
        for (const slot of slots) {
          const id = randomUUID();
          gameIds.set(`${slot.round}:${slot.slot}`, id);
          await transaction.game.create({
            data: {
              id,
              organizationId,
              tournamentId,
              divisionId: stage.divisionId,
              stageId,
              homeTeamId: slot.homeTeamId,
              awayTeamId: slot.awayTeamId,
              scheduledAt: new Date(
                input.startsAt.getTime() + (slot.round - 1) * input.roundIntervalMinutes * 60_000,
              ),
              regulationPeriods: stage.ruleSet?.regulationPeriods ?? 4,
              status: slot.homeTeamId && slot.awayTeamId ? 'SCHEDULED' : 'DRAFT',
              published: input.published,
              ...(input.venueId ? { venueId: input.venueId } : {}),
              ...(input.courtId ? { courtId: input.courtId } : {}),
            },
          });
        }
        for (const slot of slots.filter((candidate) => candidate.round < roundNumbers.length)) {
          const sourceGameId = gameIds.get(`${slot.round}:${slot.slot}`);
          const targetGameId = gameIds.get(`${slot.round + 1}:${Math.floor(slot.slot / 2)}`);
          const roundId = roundIds.get(slot.round);
          if (!sourceGameId || !targetGameId || !roundId)
            throw new Error('Bracket topology is inconsistent');
          await transaction.bracketMatchLink.create({
            data: {
              organizationId,
              roundId,
              sourceGameId,
              targetGameId,
              targetSlot: slot.slot % 2 === 0 ? 'HOME' : 'AWAY',
              sourceOutcome: 'WINNER',
            },
          });
        }
        return {
          bracketId: bracket.id,
          gameIds: [...gameIds.values()],
          rounds: roundNumbers.length,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async assignScorekeeper(
    organizationId: string,
    gameId: string,
    userId: string,
    expiresAt?: Date,
  ) {
    const [game, membership, role] = await Promise.all([
      this.prisma.game.findFirst({ where: { id: gameId, organizationId, deletedAt: null } }),
      this.prisma.organizationMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId } },
      }),
      this.prisma.role.findUnique({ where: { key: 'scorekeeper' } }),
    ]);
    if (!game || membership?.status !== 'ACTIVE' || !role) {
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Game, active member, or scorekeeper role was not found',
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const assignment = await transaction.gameAssignment.upsert({
        where: { gameId_userId_type: { gameId, userId, type: 'SCOREKEEPER' } },
        create: {
          organizationId,
          gameId,
          userId,
          type: 'SCOREKEEPER',
          ...(expiresAt ? { expiresAt } : {}),
        },
        update: { active: true, expiresAt: expiresAt ?? null },
      });
      const membershipRole = await transaction.membershipRole.findFirst({
        where: { membershipId: membership.id, roleId: role.id, gameId },
      });
      if (membershipRole) {
        await transaction.membershipRole.update({
          where: { id: membershipRole.id },
          data: { expiresAt: expiresAt ?? null },
        });
      } else {
        await transaction.membershipRole.create({
          data: {
            membershipId: membership.id,
            roleId: role.id,
            gameId,
            ...(expiresAt ? { expiresAt } : {}),
          },
        });
      }
      return assignment;
    });
  }

  async reschedule(
    organizationId: string,
    gameId: string,
    actorUserId: string,
    correlationId: string,
    input: {
      scheduledAt: Date;
      venueId?: string | null;
      courtId?: string | null;
      expectedVersion: number;
      idempotencyKey: string;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const duplicate = await transaction.gameStateTransition.findUnique({
        where: { gameId_idempotencyKey: { gameId, idempotencyKey: input.idempotencyKey } },
      });
      if (duplicate) return transaction.game.findUniqueOrThrow({ where: { id: gameId } });
      const game = await transaction.game.findFirst({
        where: { id: gameId, organizationId, deletedAt: null },
      });
      if (!game) throw this.notFound();
      if (game.version !== input.expectedVersion || ['LIVE', 'FINAL'].includes(game.status))
        throw this.stale();
      const nextVersion = game.version + 1;
      await transaction.game.update({
        where: { id: gameId },
        data: {
          scheduledAt: input.scheduledAt,
          venueId: input.venueId,
          courtId: input.courtId,
          version: nextVersion,
        },
      });
      await transaction.gameStateTransition.create({
        data: {
          organizationId,
          gameId,
          actorUserId,
          idempotencyKey: input.idempotencyKey,
          type: 'STATUS_CHANGED',
          fromStatus: game.status,
          toStatus: game.status,
          resultingGameVersion: nextVersion,
          occurredAt: new Date(),
          reason: input.reason,
        },
      });
      await transaction.outboxEvent.create({
        data: {
          organizationId,
          aggregateType: 'Game',
          aggregateId: gameId,
          eventType: 'game.schedule-changed',
          payload: { gameId, scheduledAt: input.scheduledAt, correlationId },
        },
      });
      return transaction.game.findUniqueOrThrow({ where: { id: gameId } });
    });
  }

  async setStatus(
    organizationId: string,
    gameId: string,
    actorUserId: string,
    correlationId: string,
    input: {
      status: 'POSTPONED' | 'CANCELLED' | 'ABANDONED' | 'FORFEITED';
      forfeitWinnerId?: string;
      expectedVersion: number;
      idempotencyKey: string;
      reason: string;
    },
  ) {
    return this.prisma.$transaction(
      async (transaction) => {
        const duplicate = await transaction.gameStateTransition.findUnique({
          where: { gameId_idempotencyKey: { gameId, idempotencyKey: input.idempotencyKey } },
        });
        if (duplicate) return transaction.game.findUniqueOrThrow({ where: { id: gameId } });
        const game = await transaction.game.findFirst({
          where: { id: gameId, organizationId, deletedAt: null },
          include: { stage: { include: { ruleSet: true } } },
        });
        if (!game) throw this.notFound();
        if (game.version !== input.expectedVersion || game.status === 'FINAL') throw this.stale();
        if (
          input.status === 'FORFEITED' &&
          (!input.forfeitWinnerId ||
            ![game.homeTeamId, game.awayTeamId].includes(input.forfeitWinnerId))
        ) {
          throw new ConflictException({
            code: 'INVALID_FORFEIT_WINNER',
            message: 'Forfeit winner must participate in the game',
          });
        }
        const rules = game.stage?.ruleSet;
        const homeWon = input.status === 'FORFEITED' && input.forfeitWinnerId === game.homeTeamId;
        const awayWon = input.status === 'FORFEITED' && input.forfeitWinnerId === game.awayTeamId;
        const data = {
          status: input.status,
          version: game.version + 1,
          ...(input.status === 'FORFEITED'
            ? {
                forfeitWinnerId: input.forfeitWinnerId,
                homeScore: homeWon
                  ? (rules?.forfeitScoreFor ?? 20)
                  : (rules?.forfeitScoreAgainst ?? 0),
                awayScore: awayWon
                  ? (rules?.forfeitScoreFor ?? 20)
                  : (rules?.forfeitScoreAgainst ?? 0),
                finalizedAt: new Date(),
                resultExplanation: { type: 'FORFEIT', reason: input.reason },
              }
            : {}),
        };
        const updated = await transaction.game.update({ where: { id: gameId }, data });
        await transaction.gameStateTransition.create({
          data: {
            organizationId,
            gameId,
            actorUserId,
            idempotencyKey: input.idempotencyKey,
            type: 'STATUS_CHANGED',
            fromStatus: game.status,
            toStatus: input.status,
            resultingGameVersion: updated.version,
            occurredAt: new Date(),
            reason: input.reason,
          },
        });
        await transaction.auditLog.create({
          data: {
            organizationId,
            actorUserId,
            correlationId,
            action: `game.status.${input.status.toLowerCase()}`,
            resourceType: 'Game',
            resourceId: gameId,
            outcome: 'SUCCESS',
            changes: { from: game.status, to: input.status },
            metadata: {},
          },
        });
        await transaction.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'Game',
            aggregateId: gameId,
            eventType: `game.${input.status.toLowerCase()}`,
            payload: { gameId, gameVersion: updated.version, correlationId },
          },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async recalculateStandings(organizationId: string, stageId: string) {
    const stage = await this.prisma.competitionStage.findFirst({
      where: { id: stageId, organizationId },
      include: {
        ruleSet: true,
        games: { where: { status: { in: ['FINAL', 'FORFEITED', 'ABANDONED'] }, deletedAt: null } },
        standings: true,
      },
    });
    if (!stage?.ruleSet)
      throw new NotFoundException({
        code: 'RULE_SET_NOT_FOUND',
        message: 'Stage rule set was not found',
      });
    const teamIds = [
      ...new Set(
        stage.games
          .flatMap((game) => [game.homeTeamId, game.awayTeamId])
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const overrides = new Map(
      stage.standings
        .filter(
          (
            standing,
          ): standing is typeof standing & {
            manualRankOverride: number;
            manualOverrideReason: string;
          } => standing.manualRankOverride !== null && standing.manualOverrideReason !== null,
        )
        .map((standing) => [
          standing.teamId,
          { rank: standing.manualRankOverride, reason: standing.manualOverrideReason },
        ]),
    );
    const results: AuthoritativeResult[] = stage.games
      .filter((game): game is typeof game & { homeTeamId: string; awayTeamId: string } =>
        Boolean(game.homeTeamId && game.awayTeamId),
      )
      .map((game) => ({
        gameId: game.id,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        homeScore: game.homeScore,
        awayScore: game.awayScore,
        status: game.status as AuthoritativeResult['status'],
        countsForStandings: game.status !== 'ABANDONED' || Boolean(game.resultExplanation),
      }));
    const tieBreakers = stage.ruleSet.tieBreakers as TieBreaker[];
    const rows = calculateStandings(
      teamIds,
      results,
      {
        winPoints: stage.ruleSet.winPoints,
        lossPoints: stage.ruleSet.lossPoints,
        drawPoints: stage.ruleSet.drawPoints,
        tieBreakers,
      },
      overrides,
    );
    const sourceVersion =
      stage.games.reduce((total, game) => total + game.version, 0) + stage.games.length * 1_000_000;
    const checksum = createHash('sha256').update(JSON.stringify(rows)).digest('hex');
    return this.prisma.$transaction(async (transaction) => {
      await transaction.standing.deleteMany({ where: { stageId, organizationId } });
      if (rows.length > 0) {
        await transaction.standing.createMany({
          data: rows.map((row) => ({
            organizationId,
            stageId,
            teamId: row.teamId,
            played: row.played,
            wins: row.wins,
            losses: row.losses,
            draws: row.draws,
            pointsFor: row.pointsFor,
            pointsAgainst: row.pointsAgainst,
            pointDifference: row.pointDifference,
            standingPoints: row.standingPoints,
            rank: row.rank,
            tieBreakExplanation: row.tieBreakExplanation,
            calculatedAt: new Date(),
            ...(overrides.get(row.teamId)
              ? {
                  manualRankOverride: overrides.get(row.teamId)?.rank,
                  manualOverrideReason: overrides.get(row.teamId)?.reason,
                }
              : {}),
          })),
        });
      }
      await transaction.standingSnapshot.upsert({
        where: { stageId_sourceVersion: { stageId, sourceVersion } },
        create: {
          organizationId,
          stageId,
          sourceVersion,
          rows,
          explanation: { tieBreakers, sourceGameIds: results.map((r) => r.gameId).sort() },
          checksum,
        },
        update: {
          rows,
          explanation: { tieBreakers, sourceGameIds: results.map((r) => r.gameId).sort() },
          checksum,
        },
      });
      return { rows, checksum, sourceVersion };
    });
  }

  async setManualOverride(
    organizationId: string,
    stageId: string,
    actorUserId: string,
    teamId: string,
    rank: number,
    reason: string,
  ) {
    const standing = await this.prisma.standing.findFirst({
      where: { organizationId, stageId, teamId },
    });
    if (!standing) throw this.notFound();
    await this.prisma.standing.update({
      where: { id: standing.id },
      data: {
        manualRankOverride: rank,
        manualOverrideReason: reason,
        manualOverrideById: actorUserId,
        version: { increment: 1 },
      },
    });
    return this.recalculateStandings(organizationId, stageId);
  }

  private async requireStage(organizationId: string, tournamentId: string, stageId: string) {
    const stage = await this.prisma.competitionStage.findFirst({
      where: { id: stageId, organizationId, division: { tournamentId } },
      include: { ruleSet: true },
    });
    if (!stage) throw this.notFound();
    return stage;
  }

  private async validateTeams(
    organizationId: string,
    tournamentId: string,
    teamIds: readonly string[],
  ): Promise<void> {
    if (new Set(teamIds).size !== teamIds.length)
      throw new ConflictException({
        code: 'DUPLICATE_TEAM',
        message: 'Team list contains duplicates',
      });
    const approved = await this.prisma.tournamentTeam.count({
      where: {
        tournamentId,
        teamId: { in: [...teamIds] },
        approvedAt: { not: null },
        team: { organizationId, archivedAt: null },
      },
    });
    if (approved !== teamIds.length) {
      throw new ConflictException({
        code: 'TEAM_NOT_APPROVED',
        message: 'Every team must be approved for the tournament',
      });
    }
  }

  private roundName(round: number, totalRounds: number): string {
    const remaining = totalRounds - round;
    if (remaining === 0) return 'Final';
    if (remaining === 1) return 'Semifinal';
    if (remaining === 2) return 'Quarterfinal';
    return `Round ${round}`;
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'RESOURCE_NOT_FOUND', message: 'Resource was not found' });
  }

  private stale(): ConflictException {
    return new ConflictException({
      code: 'STALE_GAME_VERSION',
      message: 'Game state changed; resynchronize before retrying',
    });
  }
}
