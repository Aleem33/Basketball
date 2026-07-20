import { z } from 'zod';

export const notificationPreferenceSchema = z.object({
  type: z.enum([
    'GAME_STARTING_SOON',
    'GAME_STARTED',
    'PERIOD_ENDED',
    'FINAL_RESULT',
    'SCHEDULE_CHANGED',
    'VENUE_CHANGED',
    'GAME_POSTPONED',
    'GAME_CANCELLED',
    'ROSTER_APPROVED',
    'ROSTER_CORRECTIONS_REQUESTED',
    'TOURNAMENT_ANNOUNCEMENT',
  ]),
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  inAppEnabled: z.boolean(),
  timezone: z.string().trim().min(1).max(64),
  quietHours: z
    .object({ start: z.string().regex(/^\d{2}:\d{2}$/u), end: z.string().regex(/^\d{2}:\d{2}$/u) })
    .nullable()
    .optional(),
  consented: z.boolean(),
});

export const deviceRegistrationSchema = z.object({
  platform: z.enum(['ANDROID', 'IOS', 'WEB']),
  provider: z.enum(['fcm', 'apns', 'webpush']),
  token: z.string().min(16).max(4096),
  deviceLabel: z.string().trim().max(100).optional(),
  appVersion: z.string().trim().min(1).max(32),
});
