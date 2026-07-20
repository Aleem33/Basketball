import { z } from 'zod';
import { idempotencyKeySchema, uuidSchema } from '@tournament/validation';

export const acquireLeaseSchema = z.object({ expectedGameVersion: z.number().int().min(0) });

export const heartbeatLeaseSchema = z.object({
  scoringSessionId: uuidSchema,
  leaseToken: z.string().min(32).max(512),
});

export const scoreCommandSchema = z
  .object({
    scoringSessionId: uuidSchema,
    idempotencyKey: idempotencyKeySchema,
    expectedVersion: z.number().int().min(0),
    occurredAt: z.coerce.date(),
    period: z.number().int().min(1).max(32),
    teamId: uuidSchema.optional(),
    type: z.enum(['ADD_ONE', 'ADD_TWO', 'ADD_THREE', 'CORRECTION', 'TIMEOUT', 'NOTE']),
    correctionOfEventId: uuidSchema.optional(),
    correctionReason: z.string().trim().min(3).max(500).optional(),
    note: z.string().trim().min(1).max(2000).optional(),
  })
  .superRefine((value, context) => {
    if (['ADD_ONE', 'ADD_TWO', 'ADD_THREE'].includes(value.type) && !value.teamId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['teamId'],
        message: 'Team is required for scoring events',
      });
    }
    if (value.type === 'CORRECTION' && (!value.correctionOfEventId || !value.correctionReason)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctionOfEventId'],
        message: 'Correction target and reason are required',
      });
    }
  });

export const transitionCommandSchema = z.object({
  scoringSessionId: uuidSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  expectedVersion: z.number().int().min(0),
  occurredAt: z.coerce.date(),
  type: z.enum([
    'GAME_STARTED',
    'PERIOD_STARTED',
    'PERIOD_PAUSED',
    'PERIOD_ENDED',
    'OVERTIME_STARTED',
    'GAME_ENDED',
    'GAME_FINALIZED',
    'GAME_REOPENED',
  ]),
  period: z.number().int().min(1).max(32).optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});

export type ScoreCommandInput = z.infer<typeof scoreCommandSchema>;
export type TransitionCommandInput = z.infer<typeof transitionCommandSchema>;
