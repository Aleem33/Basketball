import { z } from 'zod';
import { passwordSchema, slugSchema, uuidSchema } from '@tournament/validation';

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
});

export const createLeagueSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: slugSchema,
  description: z.string().trim().max(5000).optional(),
});

export const createSeasonSchema = z.object({
  leagueId: uuidSchema,
  name: z.string().trim().min(2).max(160),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export const createTournamentSchema = z
  .object({
    leagueId: uuidSchema.optional(),
    seasonId: uuidSchema.optional(),
    name: z.string().trim().min(2).max(180),
    slug: slugSchema,
    description: z.string().trim().max(10_000).optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    timezone: z.string().trim().min(1).max(64).default('UTC'),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    path: ['endsAt'],
    message: 'End must be after start',
  });

export const updateTournamentSchema = z.object({
  name: z.string().trim().min(2).max(180).optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
  status: z.enum(['DRAFT', 'REGISTRATION', 'ACTIVE', 'COMPLETED', 'ARCHIVED']).optional(),
  published: z.boolean().optional(),
  expectedVersion: z.number().int().min(1),
});

export const createDivisionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).default(0),
});

export const tieBreakerSchema = z.enum([
  'WINS',
  'POINTS',
  'HEAD_TO_HEAD',
  'HEAD_TO_HEAD_POINT_DIFFERENCE',
  'OVERALL_POINT_DIFFERENCE',
  'POINTS_SCORED',
  'FEWEST_POINTS_CONCEDED',
]);

export const createStageSchema = z.object({
  name: z.string().trim().min(1).max(120),
  format: z.enum([
    'MANUAL',
    'SINGLE_ROUND_ROBIN',
    'DOUBLE_ROUND_ROBIN',
    'SINGLE_ELIMINATION',
    'GROUPS_THEN_KNOCKOUT',
  ]),
  sequence: z.number().int().min(1),
  rules: z.object({
    regulationPeriods: z.number().int().min(1).max(12).default(4),
    periodDurationSeconds: z.number().int().min(60).max(3600).default(600),
    overtimeDurationSeconds: z.number().int().min(60).max(1800).default(300),
    allowDraws: z.boolean().default(false),
    winPoints: z.number().int().min(0).default(2),
    lossPoints: z.number().int().min(0).default(0),
    drawPoints: z.number().int().min(0).default(1),
    forfeitWinPoints: z.number().int().min(0).default(2),
    forfeitScoreFor: z.number().int().min(0).default(20),
    forfeitScoreAgainst: z.number().int().min(0).default(0),
    tieBreakers: z.array(tieBreakerSchema).min(1),
    advancementRules: z.record(z.unknown()).default({}),
  }),
});

export const createVenueSchema = z.object({
  name: z.string().trim().min(2).max(160),
  addressLine1: z.string().trim().min(2).max(180),
  addressLine2: z.string().trim().max(180).optional(),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(32).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
});

export const createCourtSchema = z.object({ name: z.string().trim().min(1).max(100) });

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(160),
  shortName: z.string().trim().min(1).max(32).optional(),
  description: z.string().trim().max(5000).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(2).max(160).optional(),
  shortName: z.string().trim().min(1).max(32).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  published: z.boolean().optional(),
  expectedVersion: z.number().int().min(1),
});

export const createPlayerSchema = z.object({
  givenName: z.string().trim().min(1).max(80),
  familyName: z.string().trim().min(1).max(80),
  dateOfBirth: z.coerce.date().optional(),
  position: z
    .enum(['POINT_GUARD', 'SHOOTING_GUARD', 'SMALL_FORWARD', 'POWER_FORWARD', 'CENTER', 'UTILITY'])
    .optional(),
  defaultJersey: z.number().int().min(0).max(99).optional(),
  publicVisibility: z.enum(['PRIVATE', 'MEMBERS', 'PUBLIC']).default('PRIVATE'),
});

export const updatePlayerSchema = createPlayerSchema
  .partial()
  .extend({ expectedVersion: z.number().int().min(1) });

export const createRosterSchema = z.object({
  tournamentId: uuidSchema,
  seasonId: uuidSchema.optional(),
  visibility: z.enum(['PRIVATE', 'MEMBERS', 'PUBLIC']).default('PRIVATE'),
});

export const rosterPlayerSchema = z.object({
  playerId: uuidSchema,
  jerseyNumber: z.number().int().min(0).max(99),
  position: z
    .enum(['POINT_GUARD', 'SHOOTING_GUARD', 'SMALL_FORWARD', 'POWER_FORWARD', 'CENTER', 'UTILITY'])
    .optional(),
  captain: z.boolean().default(false),
});

export const submitRosterSchema = z.object({
  message: z.string().trim().max(2000).optional(),
  expectedVersion: z.number().int().min(1),
});

export const decideRosterSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
  message: z.string().trim().min(1).max(2000),
  expectedVersion: z.number().int().min(1),
});

export const createAnnouncementSchema = z.object({
  tournamentId: uuidSchema.optional(),
  title: z.string().trim().min(2).max(180),
  body: z.string().trim().min(1).max(20_000),
  published: z.boolean().default(false),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const submitTeamApplicationSchema = z.object({
  message: z.string().trim().max(2000).optional(),
});

export const decideTeamApplicationSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  reason: z.string().trim().min(1).max(2000),
});

export const createCorrectionRequestSchema = z.object({
  resourceType: z.enum(['TEAM', 'PLAYER', 'ROSTER', 'GAME']),
  resourceId: uuidSchema,
  description: z.string().trim().min(10).max(5000),
  proposedChanges: z.record(z.unknown()).optional(),
});

export const resolveCorrectionRequestSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  resolution: z.string().trim().min(1).max(5000),
});

export const exportResourceSchema = z.enum(['teams', 'games', 'rosters', 'audit']);

export const bootstrapArgumentsSchema = z
  .object({
    email: z.string().trim().toLowerCase().email(),
    password: passwordSchema.refine(
      (value) => value.length >= 16,
      'Bootstrap password must contain at least 16 characters',
    ),
    displayName: z.string().trim().min(2).max(120),
    organizationName: z.string().trim().min(2).max(160),
    organizationSlug: slugSchema,
  })
  .refine((value) => !/change_me|placeholder|password123|example-secret/iu.test(value.password), {
    path: ['password'],
    message: 'Bootstrap password cannot be a placeholder',
  });
