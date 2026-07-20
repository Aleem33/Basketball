import { z } from 'zod';
import { emailSchema, uuidSchema } from '@tournament/validation';

export const createInvitationSchema = z
  .object({
    email: emailSchema,
    roleKey: z.enum([
      'organization-admin',
      'tournament-manager',
      'coach',
      'team-manager',
      'scorekeeper',
    ]),
    tournamentId: uuidSchema.optional(),
    teamId: uuidSchema.optional(),
    gameId: uuidSchema.optional(),
    expiresInDays: z.number().int().min(1).max(30).default(7),
  })
  .superRefine((value, context) => {
    const requiredScope =
      value.roleKey === 'tournament-manager'
        ? value.tournamentId
        : ['coach', 'team-manager'].includes(value.roleKey)
          ? value.teamId
          : value.roleKey === 'scorekeeper'
            ? value.gameId
            : true;
    if (!requiredScope)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'The selected role requires its resource scope',
      });
  });

export const acceptInvitationSchema = z.object({ token: z.string().min(32).max(512) });

export const assignRoleSchema = z.object({
  userId: uuidSchema,
  roleKey: z.enum([
    'organization-admin',
    'tournament-manager',
    'coach',
    'team-manager',
    'scorekeeper',
  ]),
  tournamentId: uuidSchema.optional(),
  teamId: uuidSchema.optional(),
  gameId: uuidSchema.optional(),
  expiresAt: z.coerce.date().optional(),
});
