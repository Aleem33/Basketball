import { z } from 'zod';
import { uuidSchema } from '@tournament/validation';

export const requestUploadSchema = z.object({
  purpose: z.enum(['TEAM_LOGO', 'PLAYER_PHOTO', 'DOCUMENT']),
  fileName: z.string().trim().min(1).max(180),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  byteLength: z.number().int().min(1),
  visibility: z.enum(['PRIVATE', 'MEMBERS', 'PUBLIC']).default('PRIVATE'),
});

export const completeUploadSchema = z.object({
  assetId: uuidSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/u),
});

export const replaceTeamLogoSchema = z.object({
  assetId: uuidSchema,
  expectedTeamVersion: z.number().int().min(1),
});
