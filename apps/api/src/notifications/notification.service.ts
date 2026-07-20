import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import {
  DisabledPushProvider,
  type NotificationPayload,
  type NotificationProvider,
} from './notification-provider';

@Injectable()
export class NotificationService {
  private readonly pushProvider: NotificationProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {
    this.pushProvider = new DisabledPushProvider();
  }

  async enqueueForUser(
    organizationId: string | undefined,
    userId: string,
    type: string,
    payload: NotificationPayload,
    deduplicationKey: string,
  ): Promise<{ created: number }> {
    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_scopeKey_type: { userId, scopeKey: organizationId ?? 'global', type } },
    });
    if (preference && !preference.pushEnabled) return { created: 0 };
    const devices = await this.prisma.deviceRegistration.findMany({
      where: {
        userId,
        active: true,
        invalidatedAt: null,
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
      },
    });
    let created = 0;
    for (const device of devices) {
      await this.prisma.notificationDelivery.upsert({
        where: { deduplicationKey: `${deduplicationKey}:${device.id}:push` },
        create: {
          organizationId,
          userId,
          deviceRegistrationId: device.id,
          deduplicationKey: `${deduplicationKey}:${device.id}:push`,
          notificationType: type,
          channel: 'PUSH',
          payload,
        },
        update: {},
      });
      created += 1;
    }
    return { created };
  }

  async deliver(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.notificationDelivery.findUnique({
      where: { id: deliveryId },
      include: { deviceRegistration: true },
    });
    if (!delivery) throw new NotFoundException('Notification delivery was not found');
    if (['SENT', 'SUPPRESSED', 'INVALID_TARGET'].includes(delivery.status)) return;
    if (
      delivery.channel !== 'PUSH' ||
      !delivery.deviceRegistration ||
      !delivery.deviceRegistrationId
    ) {
      await this.prisma.notificationDelivery.update({
        where: { id: deliveryId },
        data: { status: 'SUPPRESSED', lastErrorCode: 'UNSUPPORTED_CHANNEL' },
      });
      return;
    }
    const result = await this.pushProvider.send(
      delivery.deviceRegistration.encryptedToken,
      delivery.payload as NotificationPayload,
    );
    const deviceRegistrationId = delivery.deviceRegistrationId;
    await this.prisma.$transaction(async (transaction) => {
      await transaction.notificationDelivery.update({
        where: { id: deliveryId },
        data: {
          status: result.status,
          attemptCount: { increment: 1 },
          ...(result.status === 'SENT' ? { sentAt: new Date(), lastErrorCode: null } : {}),
          ...(result.status === 'FAILED' ? { lastErrorCode: result.errorCode } : {}),
          ...(result.status === 'INVALID_TARGET' ? { lastErrorCode: result.errorCode } : {}),
          ...(result.status === 'SUPPRESSED' ? { lastErrorCode: result.reason } : {}),
        },
      });
      if (result.status === 'INVALID_TARGET') {
        await transaction.deviceRegistration.update({
          where: { id: deviceRegistrationId },
          data: { active: false, invalidatedAt: new Date() },
        });
      }
    });
  }

  providerStatus() {
    return {
      configured: this.config.get('NOTIFICATION_PROVIDER', { infer: true }),
      activeAdapter: this.pushProvider.name,
      remotePushEnabled: this.pushProvider.name !== 'disabled',
    };
  }
}
