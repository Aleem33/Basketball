import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TokenCryptoService } from '../security/token-crypto.service';

const LEASE_MILLISECONDS = 45_000;

@Injectable()
export class ScoringLeaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async acquire(
    organizationId: string,
    gameId: string,
    userId: string,
    expectedGameVersion: number,
  ): Promise<{
    scoringSessionId: string;
    leaseToken: string;
    expiresAt: Date;
    redisCoordinated: boolean;
  }> {
    const leaseToken = this.tokenCrypto.generateOpaqueToken();
    const lease = await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${gameId}))`;
        const game = await transaction.game.findFirst({
          where: { id: gameId, organizationId, deletedAt: null },
          select: { id: true, version: true, status: true },
        });
        if (!game)
          throw new NotFoundException({ code: 'GAME_NOT_FOUND', message: 'Game was not found' });
        if (game.version !== expectedGameVersion) throw this.stale();
        if (!['SCHEDULED', 'LIVE', 'PAUSED'].includes(game.status)) {
          throw new ConflictException({
            code: 'GAME_NOT_SCOREABLE',
            message: 'Game cannot be scored in its current state',
          });
        }
        const assignment = await transaction.gameAssignment.findFirst({
          where: {
            gameId,
            organizationId,
            userId,
            type: 'SCOREKEEPER',
            active: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
        });
        if (!assignment)
          throw new ForbiddenException({
            code: 'NOT_ASSIGNED_SCOREKEEPER',
            message: 'Scorekeeper assignment is required',
          });
        await transaction.scoringLease.updateMany({
          where: { gameId, revokedAt: null, expiresAt: { lte: new Date() } },
          data: { revokedAt: new Date() },
        });
        const active = await transaction.scoringLease.findFirst({
          where: { gameId, revokedAt: null, expiresAt: { gt: new Date() } },
        });
        if (active && active.userId !== userId) {
          throw new ConflictException({
            code: 'SCORING_LEASE_HELD',
            message: 'Another assigned scorekeeper currently controls this game',
          });
        }
        if (active) {
          await transaction.scoringLease.update({
            where: { id: active.id },
            data: { revokedAt: new Date() },
          });
        }
        return transaction.scoringLease.create({
          data: {
            organizationId,
            gameId,
            userId,
            sessionId: randomUUID(),
            leaseTokenHash: this.tokenCrypto.hash(leaseToken),
            expiresAt: new Date(Date.now() + LEASE_MILLISECONDS),
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
    const redisCoordinated = await this.redis.setIfAbsent(
      `scoring-lease:${gameId}`,
      lease.sessionId,
      LEASE_MILLISECONDS,
    );
    return {
      scoringSessionId: lease.sessionId,
      leaseToken,
      expiresAt: lease.expiresAt,
      redisCoordinated,
    };
  }

  async heartbeat(scoringSessionId: string, leaseToken: string, userId: string) {
    const lease = await this.prisma.scoringLease.findUnique({
      where: { sessionId: scoringSessionId },
    });
    if (
      lease?.userId !== userId ||
      lease.revokedAt ||
      lease.expiresAt <= new Date() ||
      lease.leaseTokenHash !== this.tokenCrypto.hash(leaseToken)
    ) {
      throw new ForbiddenException({
        code: 'INVALID_SCORING_LEASE',
        message: 'Scoring lease is invalid or expired',
      });
    }
    const expiresAt = new Date(Date.now() + LEASE_MILLISECONDS);
    const updated = await this.prisma.scoringLease.update({
      where: { id: lease.id },
      data: { lastHeartbeatAt: new Date(), expiresAt },
    });
    await this.redis.setIfAbsent(
      `scoring-lease:${lease.gameId}`,
      lease.sessionId,
      LEASE_MILLISECONDS,
    );
    return { scoringSessionId, expiresAt: updated.expiresAt };
  }

  async assertValid(
    transaction: Pick<PrismaService, 'scoringLease'>,
    gameId: string,
    organizationId: string,
    userId: string,
    scoringSessionId: string,
    leaseToken: string,
  ): Promise<void> {
    const lease = await transaction.scoringLease.findFirst({
      where: {
        gameId,
        organizationId,
        userId,
        sessionId: scoringSessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (lease?.leaseTokenHash !== this.tokenCrypto.hash(leaseToken)) {
      throw new ForbiddenException({
        code: 'INVALID_SCORING_LEASE',
        message: 'Scoring lease is invalid or expired',
      });
    }
  }

  private stale(): ConflictException {
    return new ConflictException({
      code: 'STALE_GAME_VERSION',
      message: 'Game state changed; resynchronize before retrying',
    });
  }
}
