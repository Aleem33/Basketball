import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailService } from '../email/email.service';
import { GamesService } from '../games/games.service';
import { NotificationService } from '../notifications/notification.service';
import { TokenCryptoService } from '../security/token-crypto.service';
import { StorageService } from '../storage/storage.service';
import { Prisma } from '../../generated/client';

type JobEnvelope = {
  outboxEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class JobHandlerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly games: GamesService,
    private readonly notifications: NotificationService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly storage: StorageService,
  ) {}

  async handle(envelope: JobEnvelope): Promise<void> {
    const jobKey = `outbox:${envelope.outboxEventId}`;
    const existing = await this.prisma.backgroundJobRecord.findUnique({ where: { jobKey } });
    if (existing?.status === 'SUCCEEDED') return;
    const record = await this.prisma.backgroundJobRecord.upsert({
      where: { jobKey },
      create: {
        jobKey,
        queueName: 'platform-jobs',
        jobType: envelope.eventType,
        status: 'ACTIVE',
        payload: envelope.payload as Prisma.InputJsonValue,
        startedAt: new Date(),
      },
      update: { status: 'ACTIVE', startedAt: new Date(), attemptCount: { increment: 1 } },
    });
    try {
      await this.route(envelope);
      await this.prisma.backgroundJobRecord.update({
        where: { id: record.id },
        data: {
          status: 'SUCCEEDED',
          completedAt: new Date(),
          result: { handled: true },
          lastError: null,
        },
      });
    } catch (error) {
      await this.prisma.backgroundJobRecord.update({
        where: { id: record.id },
        data: {
          status: 'FAILED',
          lastError: error instanceof Error ? error.message.slice(0, 1000) : 'Job failed',
        },
      });
      throw error;
    }
  }

  private async route(envelope: JobEnvelope): Promise<void> {
    switch (envelope.eventType) {
      case 'auth.email-verification.requested':
        return this.sendAuthEmail(envelope.payload, 'verification');
      case 'auth.password-reset.requested':
        return this.sendAuthEmail(envelope.payload, 'reset');
      case 'invitation.requested':
        return this.sendInvitation(envelope.payload);
      case 'game.finalized':
      case 'game.forfeited':
        return this.recalculateGameStage(envelope.payload);
      case 'game.score-updated':
      case 'game.state-updated':
      case 'game.schedule-changed':
      case 'game.postponed':
      case 'game.cancelled':
      case 'game.abandoned':
      case 'roster.approved':
      case 'roster.corrections-requested':
      case 'announcement.publish-requested':
        return this.enqueueDomainNotifications(envelope.eventType, envelope.payload);
      case 'media.upload-completed':
        return this.recordImageProcessingInterface(envelope.payload);
      case 'media.orphan-cleanup.requested':
        return this.markMediaForSecureDeletion(envelope.payload);
      case 'privacy.export.requested':
        return this.completeDataExport(envelope.payload);
      case 'privacy.deletion.requested':
        return this.completeDeletion(envelope.payload);
      default:
        throw new Error(`Unsupported outbox event type: ${envelope.eventType}`);
    }
  }

  private async sendAuthEmail(
    payload: Record<string, unknown>,
    kind: 'verification' | 'reset',
  ): Promise<void> {
    const userId = this.requiredString(payload, 'userId');
    const encryptedToken = this.requiredString(payload, 'encryptedToken');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    const token = this.tokenCrypto.decrypt(encryptedToken);
    if (kind === 'verification') await this.email.sendVerification(user.email, token);
    else await this.email.sendPasswordReset(user.email, token);
  }

  private async sendInvitation(payload: Record<string, unknown>): Promise<void> {
    await this.email.sendInvitation(
      this.requiredString(payload, 'email'),
      this.tokenCrypto.decrypt(this.requiredString(payload, 'encryptedToken')),
    );
  }

  private async recalculateGameStage(payload: Record<string, unknown>): Promise<void> {
    const game = await this.prisma.game.findUniqueOrThrow({
      where: { id: this.requiredString(payload, 'gameId') },
      select: { organizationId: true, stageId: true },
    });
    if (game.stageId) await this.games.recalculateStandings(game.organizationId, game.stageId);
    await this.enqueueDomainNotifications('game.final-result', payload);
  }

  private async enqueueDomainNotifications(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const gameId = typeof payload.gameId === 'string' ? payload.gameId : undefined;
    if (!gameId) return;
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: {
        homeTeam: { include: { favorites: true } },
        awayTeam: { include: { favorites: true } },
        tournament: { include: { favorites: true } },
      },
    });
    if (!game) return;
    const userIds = new Set([
      ...(game.homeTeam?.favorites.map((favorite) => favorite.userId) ?? []),
      ...(game.awayTeam?.favorites.map((favorite) => favorite.userId) ?? []),
      ...game.tournament.favorites.map((favorite) => favorite.userId),
    ]);
    const type = this.notificationType(eventType);
    for (const userId of userIds) {
      await this.notifications.enqueueForUser(
        game.organizationId,
        userId,
        type,
        {
          type,
          title: 'Game update',
          body: 'A followed game has new official information.',
          data: { gameId: game.id, tournamentId: game.tournamentId },
        },
        `${eventType}:${game.id}:${game.version}`,
      );
    }
  }

  private async recordImageProcessingInterface(payload: Record<string, unknown>): Promise<void> {
    const assetId = this.requiredString(payload, 'assetId');
    const asset = await this.prisma.mediaAsset.findUniqueOrThrow({ where: { id: assetId } });
    if (!asset.contentType.startsWith('image/')) return;
    await this.prisma.backgroundJobRecord.upsert({
      where: { jobKey: `image-process:${assetId}` },
      create: {
        organizationId: asset.organizationId,
        queueName: 'image-processing',
        jobKey: `image-process:${assetId}`,
        jobType: 'image.normalize',
        status: 'QUEUED',
        payload: {
          assetId,
          objectKey: asset.objectKey,
          operations: ['metadata-strip', 'orientation-normalize'],
        },
      },
      update: {},
    });
  }

  private async markMediaForSecureDeletion(payload: Record<string, unknown>): Promise<void> {
    const assetId = this.requiredString(payload, 'assetId');
    await this.prisma.mediaAsset.updateMany({
      where: { id: assetId, status: { in: ['REPLACED', 'DELETION_PENDING'] } },
      data: { status: 'DELETION_PENDING' },
    });
  }

  private async completeDataExport(payload: Record<string, unknown>): Promise<void> {
    const requestId = this.requiredString(payload, 'requestId');
    const userId = this.requiredString(payload, 'userId');
    const exportData = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        profile: true,
        memberships: { select: { organizationId: true, status: true, joinedAt: true } },
        favoritesTeams: { select: { teamId: true, createdAt: true } },
        favoritesTournaments: { select: { tournamentId: true, createdAt: true } },
        notificationPreferences: true,
      },
    });
    const objectKey = `privacy/users/${userId}/exports/${requestId}.json`;
    const stored = await this.storage.storePrivateJson(objectKey, exportData);
    await this.prisma.dataRequest.update({
      where: { id: requestId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        resultObjectKey: stored.objectKey,
        resultChecksum: stored.checksum,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        correlationId: randomUUID(),
        action: 'privacy.export.completed',
        resourceType: 'DataRequest',
        resourceId: requestId,
        outcome: 'SUCCESS',
        metadata: { checksum: stored.checksum, fields: Object.keys(exportData) },
      },
    });
  }

  private async completeDeletion(payload: Record<string, unknown>): Promise<void> {
    const requestId = this.requiredString(payload, 'requestId');
    const userId = this.requiredString(payload, 'userId');
    const anonymousEmail = `deleted-${createHash('sha256').update(userId).digest('hex')}@invalid.local`;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'ACCOUNT_DELETED' },
      });
      await transaction.deviceRegistration.updateMany({
        where: { userId },
        data: { active: false, invalidatedAt: new Date(), encryptedToken: '' },
      });
      await transaction.favoriteTeam.deleteMany({ where: { userId } });
      await transaction.favoriteTournament.deleteMany({ where: { userId } });
      await transaction.notificationPreference.deleteMany({ where: { userId } });
      await transaction.userProfile.updateMany({
        where: { userId },
        data: { displayName: 'Deleted account', givenName: null, familyName: null },
      });
      await transaction.user.update({
        where: { id: userId },
        data: {
          email: anonymousEmail,
          passwordHash: 'ACCOUNT_DELETED',
          status: 'DEACTIVATED',
          deletedAt: new Date(),
        },
      });
      await transaction.dataRequest.update({
        where: { id: requestId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    });
  }

  private notificationType(eventType: string): string {
    if (eventType.includes('schedule')) return 'SCHEDULE_CHANGED';
    if (eventType.includes('postponed')) return 'GAME_POSTPONED';
    if (eventType.includes('cancelled')) return 'GAME_CANCELLED';
    if (eventType.includes('final')) return 'FINAL_RESULT';
    if (eventType.includes('score') || eventType.includes('state')) return 'GAME_STARTED';
    return eventType.toUpperCase().replaceAll('.', '_').replaceAll('-', '_');
  }

  private requiredString(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];
    if (typeof value !== 'string' || value.length === 0)
      throw new Error(`Job payload is missing ${key}`);
    return value;
  }
}
