import { describe, expect, it } from 'vitest';
import { applyScoreMutation } from './score-state';

const state = { homeTeamId: 'home', awayTeamId: 'away', homeScore: 2, awayScore: 3 };

describe('authoritative score reducer', () => {
  it('adds only the commanded point value', () => {
    expect(applyScoreMutation(state, { type: 'ADD_THREE', teamId: 'home' })).toMatchObject({
      homeScore: 5,
      awayScore: 3,
      pointsDelta: 3,
    });
  });

  it('reverses an existing event without replacing totals', () => {
    expect(
      applyScoreMutation(state, {
        type: 'CORRECTION',
        correctedTeamId: 'away',
        correctedPointsDelta: 2,
      }),
    ).toMatchObject({ homeScore: 2, awayScore: 1, pointsDelta: -2 });
  });

  it('rejects a correction that would create a negative score', () => {
    expect(() =>
      applyScoreMutation(state, {
        type: 'CORRECTION',
        correctedTeamId: 'home',
        correctedPointsDelta: 3,
      }),
    ).toThrow('negative score');
  });

  it('does not alter totals for timeouts or notes', () => {
    expect(applyScoreMutation(state, { type: 'TIMEOUT' })).toMatchObject({
      homeScore: 2,
      awayScore: 3,
      pointsDelta: 0,
    });
  });
});
