import { describe, expect, it } from 'vitest';
import { tournamentFormSchema } from '../lib/tournament-form';

describe('tournament form validation', () => {
  it('rejects an invalid slug and backwards dates', () => {
    const result = tournamentFormSchema.safeParse({
      name: 'Tournament',
      slug: 'Invalid Slug',
      startsAt: '2026-08-02T10:00',
      endsAt: '2026-08-01T10:00',
      timezone: 'UTC',
    });
    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining(['slug', 'endsAt']),
      );
  });
});
