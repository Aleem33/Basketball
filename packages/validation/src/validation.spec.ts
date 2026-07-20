import { describe, expect, it } from 'vitest';
import { normalizeEmail, pageQuerySchema, passwordSchema } from './index.js';

describe('validation', () => {
  it('normalizes email addresses', () => {
    expect(normalizeEmail(' Person@Example.COM ')).toBe('person@example.com');
  });

  it('rejects weak passwords', () => {
    expect(passwordSchema.safeParse('weak-password').success).toBe(false);
  });

  it('caps pagination', () => {
    expect(pageQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
  });
});
