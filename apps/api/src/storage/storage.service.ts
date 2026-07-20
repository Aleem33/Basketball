import { randomUUID } from 'node:crypto';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';

const allowedPurposes: Record<string, readonly string[]> = {
  TEAM_LOGO: ['image/jpeg', 'image/png', 'image/webp'],
  PLAYER_PHOTO: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENT: ['application/pdf'],
};

@Injectable()
export class StorageService {
  private readonly client: S3Client;

  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT', { infer: true }),
      region: config.get('S3_REGION', { infer: true }),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE', { infer: true }),
      credentials: {
        accessKeyId: config.get('S3_ACCESS_KEY', { infer: true }),
        secretAccessKey: config.get('S3_SECRET_KEY', { infer: true }),
      },
    });
  }

  async requestUpload(
    organizationId: string,
    createdById: string,
    input: {
      purpose: 'TEAM_LOGO' | 'PLAYER_PHOTO' | 'DOCUMENT';
      fileName: string;
      contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
      byteLength: number;
      visibility: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
    },
  ) {
    if (!allowedPurposes[input.purpose]?.includes(input.contentType)) {
      throw new ConflictException({
        code: 'INVALID_MEDIA_TYPE',
        message: 'File type is not allowed for this purpose',
      });
    }
    if (input.byteLength > this.config.get('MAX_UPLOAD_BYTES', { infer: true })) {
      throw new ConflictException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds the configured upload limit',
      });
    }
    const extension = input.contentType === 'image/jpeg' ? 'jpg' : input.contentType.split('/')[1];
    const objectKey = `organizations/${organizationId}/${input.purpose.toLowerCase()}/${randomUUID()}.${extension}`;
    const bucket = this.config.get('S3_BUCKET', { infer: true });
    const asset = await this.prisma.mediaAsset.create({
      data: {
        organizationId,
        createdById,
        objectKey,
        bucket,
        contentType: input.contentType,
        expectedBytes: input.byteLength,
        visibility: input.visibility,
      },
    });
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: input.contentType,
      ContentLength: input.byteLength,
      Metadata: { assetId: asset.id, organizationId },
    });
    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn: 600 });
    return {
      assetId: asset.id,
      uploadUrl,
      expiresInSeconds: 600,
      requiredHeaders: {
        'content-type': input.contentType,
        'content-length': String(input.byteLength),
      },
    };
  }

  async completeUpload(
    organizationId: string,
    assetId: string,
    checksum: string,
    createdById: string,
  ) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        id: assetId,
        organizationId,
        createdById,
        status: 'PENDING_UPLOAD',
        deletedAt: null,
      },
    });
    if (!asset)
      throw new NotFoundException({
        code: 'MEDIA_NOT_FOUND',
        message: 'Pending media asset was not found',
      });
    const metadata = await this.client.send(
      new HeadObjectCommand({ Bucket: asset.bucket, Key: asset.objectKey }),
    );
    if (
      metadata.ContentLength !== asset.expectedBytes ||
      metadata.ContentType !== asset.contentType
    ) {
      await this.prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { status: 'REJECTED' },
      });
      throw new ConflictException({
        code: 'UPLOAD_METADATA_MISMATCH',
        message: 'Uploaded object does not match the signed request',
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.mediaAsset.update({
        where: { id: asset.id },
        data: {
          status: 'AVAILABLE',
          actualBytes: metadata.ContentLength,
          checksum,
          uploadedAt: new Date(),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          organizationId,
          aggregateType: 'MediaAsset',
          aggregateId: asset.id,
          eventType: 'media.upload-completed',
          payload: { assetId: asset.id, contentType: asset.contentType },
        },
      });
      return updated;
    });
  }

  async replaceTeamLogo(
    organizationId: string,
    teamId: string,
    assetId: string,
    expectedTeamVersion: number,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const [team, asset] = await Promise.all([
        transaction.team.findFirst({ where: { id: teamId, organizationId, archivedAt: null } }),
        transaction.mediaAsset.findFirst({
          where: {
            id: assetId,
            organizationId,
            status: 'AVAILABLE',
            contentType: { in: ['image/jpeg', 'image/png', 'image/webp'] },
          },
        }),
      ]);
      if (!team || !asset)
        throw new NotFoundException({
          code: 'RESOURCE_NOT_FOUND',
          message: 'Team or available image was not found',
        });
      if (team.version !== expectedTeamVersion) {
        throw new ConflictException({
          code: 'STALE_RESOURCE_VERSION',
          message: 'Team changed; refresh and retry',
        });
      }
      await transaction.team.update({
        where: { id: teamId },
        data: { logoAssetId: assetId, version: { increment: 1 } },
      });
      if (team.logoAssetId && team.logoAssetId !== assetId) {
        await transaction.mediaAsset.update({
          where: { id: team.logoAssetId },
          data: { status: 'REPLACED' },
        });
        await transaction.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'MediaAsset',
            aggregateId: team.logoAssetId,
            eventType: 'media.orphan-cleanup.requested',
            payload: {
              assetId: team.logoAssetId,
              notBefore: new Date(Date.now() + 7 * 86_400_000),
            },
            availableAt: new Date(Date.now() + 7 * 86_400_000),
          },
        });
      }
      return transaction.team.findUniqueOrThrow({
        where: { id: teamId },
        include: { logoAsset: true },
      });
    });
  }

  async health(): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.config.get('S3_BUCKET', { infer: true }),
          Key: '.health',
        }),
      );
      return true;
    } catch (error) {
      const status = error instanceof Error && 'name' in error ? error.name : '';
      return status === 'NotFound' || status === 'NoSuchKey';
    }
  }

  async storePrivateJson(
    objectKey: string,
    value: object,
  ): Promise<{ objectKey: string; checksum: string }> {
    const body = Buffer.from(JSON.stringify(value), 'utf8');
    const { createHash } = await import('node:crypto');
    const checksum = createHash('sha256').update(body).digest('hex');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.get('S3_BUCKET', { infer: true }),
        Key: objectKey,
        Body: body,
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256',
        Metadata: { checksum },
      }),
    );
    return { objectKey, checksum };
  }

  async privateDownloadUrl(
    objectKey: string,
  ): Promise<{ downloadUrl: string; expiresInSeconds: number }> {
    const command = new GetObjectCommand({
      Bucket: this.config.get('S3_BUCKET', { infer: true }),
      Key: objectKey,
      ResponseContentDisposition: 'attachment',
    });
    return {
      downloadUrl: await getSignedUrl(this.client, command, { expiresIn: 300 }),
      expiresInSeconds: 300,
    };
  }
}
