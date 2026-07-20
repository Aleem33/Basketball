import { ConfigService } from '@nestjs/config';
import { afterAll, describe, expect, it } from 'vitest';
import type { Environment } from '../../src/config/environment';
import { StorageService } from '../../src/storage/storage.service';
import { createOrganization, createUser, prisma, prismaService } from './helpers';

const configValues = {
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_FORCE_PATH_STYLE: true,
  S3_ACCESS_KEY: 'test',
  S3_SECRET_KEY: 'test',
  S3_BUCKET: 'test-bucket',
  MAX_UPLOAD_BYTES: 1024,
};

describe('media metadata', () => {
  afterAll(async () => prisma.$disconnect());
  it('creates a tenant-prefixed unique key and rejects oversized files', async () => {
    const config = new ConfigService(configValues) as unknown as ConfigService<Environment, true>;
    const service = new StorageService(config, prismaService);
    const organization = await createOrganization();
    const user = await createUser('media');
    const request = await service.requestUpload(organization.id, user.id, {
      purpose: 'TEAM_LOGO',
      fileName: 'logo.png',
      contentType: 'image/png',
      byteLength: 512,
      visibility: 'PUBLIC',
    });
    const asset = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: request.assetId } });
    expect(asset.objectKey).toMatch(new RegExp(`^organizations/${organization.id}/team_logo/`));
    await expect(
      service.requestUpload(organization.id, user.id, {
        purpose: 'TEAM_LOGO',
        fileName: 'large.png',
        contentType: 'image/png',
        byteLength: 2048,
        visibility: 'PUBLIC',
      }),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'FILE_TOO_LARGE' }) });
  });
});
