import { z } from 'zod';
import { idempotencyKeySchema, uuidSchema } from '@tournament/validation';

export const createFixtureSchema = z
  .object({
    tournamentId: uuidSchema,
    divisionId: uuidSchema.optional(),
    stageId: uuidSchema.optional(),
    homeTeamId: uuidSchema,
    awayTeamId: uuidSchema,
    venueId: uuidSchema.optional(),
    courtId: uuidSchema.optional(),
    scheduledAt: z.coerce.date(),
    regulationPeriods: z.number().int().min(1).max(12).default(4),
    published: z.boolean().default(false),
  })
  .refine((value) => value.homeTeamId !== value.awayTeamId, {
    path: ['awayTeamId'],
    message: 'Teams must differ',
  });

export const generateRoundRobinSchema = z.object({
  teamIds: z.array(uuidSchema).min(2).max(128),
  startsAt: z.coerce.date(),
  intervalMinutes: z.number().int().min(15).max(10_080).default(120),
  venueId: uuidSchema.optional(),
  courtId: uuidSchema.optional(),
  published: z.boolean().default(false),
});

export const generateBracketSchema = z.object({
  name: z.string().trim().min(1).max(120),
  seededTeamIds: z.array(uuidSchema).min(2).max(128),
  startsAt: z.coerce.date(),
  roundIntervalMinutes: z.number().int().min(15).max(43_200).default(1440),
  venueId: uuidSchema.optional(),
  courtId: uuidSchema.optional(),
  published: z.boolean().default(false),
});

export const assignScorekeeperSchema = z.object({
  userId: uuidSchema,
  expiresAt: z.coerce.date().optional(),
});

export const rescheduleGameSchema = z.object({
  scheduledAt: z.coerce.date(),
  venueId: uuidSchema.nullable().optional(),
  courtId: uuidSchema.nullable().optional(),
  expectedVersion: z.number().int().min(0),
  idempotencyKey: idempotencyKeySchema,
  reason: z.string().trim().min(3).max(500),
});

export const setGameStatusSchema = z.object({
  status: z.enum(['POSTPONED', 'CANCELLED', 'ABANDONED', 'FORFEITED']),
  forfeitWinnerId: uuidSchema.optional(),
  expectedVersion: z.number().int().min(0),
  idempotencyKey: idempotencyKeySchema,
  reason: z.string().trim().min(3).max(500),
});

export const manualStandingOverrideSchema = z.object({
  teamId: uuidSchema,
  rank: z.number().int().min(1),
  reason: z.string().trim().min(10).max(500),
});
