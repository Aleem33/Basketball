import { z } from 'zod';
import { gameStatuses } from '@tournament/contracts';
import { pageQuerySchema, uuidSchema } from '@tournament/validation';

export const publicTournamentQuerySchema = pageQuerySchema.extend({
  search: z.string().trim().max(120).optional(),
  historical: z.coerce.boolean().optional(),
});

export const publicGameQuerySchema = pageQuerySchema.extend({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  tournamentId: uuidSchema.optional(),
  divisionId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  venueId: uuidSchema.optional(),
  status: z.enum(gameStatuses).optional(),
});

export const publicSearchQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().min(2).max(120),
});
