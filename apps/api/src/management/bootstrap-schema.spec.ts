import { describe, expect, it } from 'vitest';
import { bootstrapArgumentsSchema } from './management.schemas';

const valid = {
  email: 'owner@example.invalid',
  password: 'Unique-Bootstrap-Secret-8472',
  displayName: 'Platform owner',
  organizationName: 'Client organization',
  organizationSlug: 'client-organization',
};

describe('administrator bootstrap input', () => {
  it('accepts a deliberately supplied strong one-time bootstrap request', () => {
    expect(bootstrapArgumentsSchema.parse(valid).organizationSlug).toBe('client-organization');
  });

  it('rejects short and placeholder passwords', () => {
    expect(() =>
      bootstrapArgumentsSchema.parse({ ...valid, password: 'Short-Secret-1' }),
    ).toThrow();
    expect(() =>
      bootstrapArgumentsSchema.parse({ ...valid, password: 'CHANGE_ME-password123' }),
    ).toThrow();
  });

  it('requires an explicit valid organization slug', () => {
    expect(() =>
      bootstrapArgumentsSchema.parse({ ...valid, organizationSlug: 'Invalid Slug' }),
    ).toThrow();
  });
});
