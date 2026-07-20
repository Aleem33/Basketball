import { describe, expect, it } from 'vitest';
import { generateSingleElimination } from './bracket';
import { generateRoundRobin } from './round-robin';
import { calculateStandings } from './standings';

describe('round-robin scheduling', () => {
  it('schedules every pairing once without self-matches', () => {
    const fixtures = generateRoundRobin(['a', 'b', 'c', 'd']);
    expect(fixtures).toHaveLength(6);
    const pairs = fixtures.map((fixture) =>
      [fixture.homeTeamId, fixture.awayTeamId].sort().join(':'),
    );
    expect(new Set(pairs).size).toBe(6);
    expect(fixtures.every((fixture) => fixture.homeTeamId !== fixture.awayTeamId)).toBe(true);
  });

  it('reverses home and away in a double round robin', () => {
    const fixtures = generateRoundRobin(['a', 'b', 'c'], true);
    expect(fixtures).toHaveLength(6);
    const first = fixtures.find((fixture) => fixture.leg === 1);
    expect(first).toBeDefined();
    expect(fixtures).toContainEqual(
      expect.objectContaining({
        leg: 2,
        homeTeamId: first?.awayTeamId,
        awayTeamId: first?.homeTeamId,
      }),
    );
  });
});

describe('single-elimination brackets', () => {
  it('creates byes and explicit source links', () => {
    const bracket = generateSingleElimination(['a', 'b', 'c']);
    expect(bracket).toHaveLength(3);
    expect(bracket.filter((slot) => slot.round === 1)).toHaveLength(2);
    expect(bracket.find((slot) => slot.round === 2)).toMatchObject({
      sourceHome: { round: 1, slot: 0 },
      sourceAway: { round: 1, slot: 1 },
    });
  });
});

describe('standings calculation', () => {
  const rules = {
    winPoints: 2,
    lossPoints: 0,
    drawPoints: 1,
    tieBreakers: ['POINTS', 'OVERALL_POINT_DIFFERENCE', 'POINTS_SCORED'] as const,
  };

  it('is deterministic and ignores non-authoritative abandoned games', () => {
    const results = [
      {
        gameId: 'g1',
        homeTeamId: 'a',
        awayTeamId: 'b',
        homeScore: 70,
        awayScore: 60,
        status: 'FINAL' as const,
        countsForStandings: true,
      },
      {
        gameId: 'g2',
        homeTeamId: 'b',
        awayTeamId: 'c',
        homeScore: 80,
        awayScore: 50,
        status: 'FINAL' as const,
        countsForStandings: true,
      },
      {
        gameId: 'g3',
        homeTeamId: 'c',
        awayTeamId: 'a',
        homeScore: 1,
        awayScore: 0,
        status: 'ABANDONED' as const,
        countsForStandings: false,
      },
    ];
    const first = calculateStandings(['a', 'b', 'c'], results, rules);
    const second = calculateStandings(['c', 'b', 'a'], [...results].reverse(), rules);
    expect(first).toEqual(second);
    expect(first.map((row) => row.teamId)).toEqual(['b', 'a', 'c']);
    expect(first[0]?.tieBreakExplanation.sourceGameIds).toEqual(['g1', 'g2']);
  });

  it('applies an auditable manual override', () => {
    const overrides = new Map([
      ['c', { rank: 1, reason: 'Organizer ruling after eligibility review' }],
    ]);
    const rows = calculateStandings(['a', 'b', 'c'], [], rules, overrides);
    expect(rows[0]?.teamId).toBe('c');
    expect(rows[0]?.tieBreakExplanation.manualOverride?.reason).toContain('eligibility');
  });
});
