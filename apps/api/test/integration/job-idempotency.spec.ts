import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import type { EmailService } from '../../src/email/email.service';
import type { GamesService } from '../../src/games/games.service';
import { JobHandlerService } from '../../src/jobs/job-handler.service';
import type { NotificationService } from '../../src/notifications/notification.service';
import type { TokenCryptoService } from '../../src/security/token-crypto.service';
import type { StorageService } from '../../src/storage/storage.service';
import { createOrganization, createUser, prisma, prismaService } from './helpers';

describe('background job idempotency', () => {
  const unused = {};
  const service = new JobHandlerService(
    prismaService,
    unused as EmailService,
    unused as GamesService,
    unused as NotificationService,
    unused as TokenCryptoService,
    unused as StorageService,
  );

  afterAll(async () => prisma.$disconnect());

  it('records an image-processing interface exactly once when an outbox event is redelivered', async () => {
    const organization = await createOrganization();
    const user = await createUser('image-job');
    const asset = await prisma.mediaAsset.create({
      data: {
        organizationId: organization.id,
        createdById: user.id,
        objectKey: `organizations/${organization.id}/team_logo/${randomUUID()}.png`,
        bucket: 'test-bucket',
        contentType: 'image/png',
        expectedBytes: 512,
        actualBytes: 512,
        visibility: 'PUBLIC',
        status: 'AVAILABLE',
        uploadedAt: new Date(),
      },
    });
    const outboxEventId = randomUUID();
    const envelope = {
      outboxEventId,
      eventType: 'media.upload-completed',
      payload: { assetId: asset.id },
    };

    await service.handle(envelope);
    await service.handle(envelope);

    expect(
      await prisma.backgroundJobRecord.count({ where: { jobKey: `image-process:${asset.id}` } }),
    ).toBe(1);
    const delivery = await prisma.backgroundJobRecord.findUniqueOrThrow({
      where: { jobKey: `outbox:${outboxEventId}` },
    });
    expect(delivery.status).toBe('SUCCEEDED');
    expect(delivery.attemptCount).toBe(0);
  });
});
