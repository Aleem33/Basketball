import { z } from 'zod';

export const tournamentFormSchema = z
  .object({
    name: z.string().trim().min(2),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
    startsAt: z.string().min(1),
    endsAt: z.string().min(1),
    timezone: z.string().min(1),
  })
  .refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
    path: ['endsAt'],
    message: 'End must be after start',
  });

export type TournamentFormValues = z.infer<typeof tournamentFormSchema>;
