import { describe, expect, it } from 'vitest';
import { API_VERSION, gameStatuses } from './index.js';

describe('shared API contracts', () => {
  it('exposes a stable version prefix', () => {
    expect(API_VERSION).toBe('v1');
  });

  it('contains all terminal game states', () => {
    expect(gameStatuses).toEqual(
      expect.arrayContaining(['FINAL', 'CANCELLED', 'ABANDONED', 'FORFEITED']),
    );
  });
});
