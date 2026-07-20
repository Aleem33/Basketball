export type TieBreaker =
  | 'WINS'
  | 'POINTS'
  | 'HEAD_TO_HEAD'
  | 'HEAD_TO_HEAD_POINT_DIFFERENCE'
  | 'OVERALL_POINT_DIFFERENCE'
  | 'POINTS_SCORED'
  | 'FEWEST_POINTS_CONCEDED';

export type AuthoritativeResult = {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: 'FINAL' | 'FORFEITED' | 'ABANDONED';
  countsForStandings: boolean;
};

export type StandingsRules = {
  winPoints: number;
  lossPoints: number;
  drawPoints: number;
  tieBreakers: readonly TieBreaker[];
};

export type StandingRow = {
  teamId: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  standingPoints: number;
  rank: number;
  tieBreakExplanation: {
    orderedCriteria: readonly TieBreaker[];
    values: Record<TieBreaker, number>;
    sourceGameIds: string[];
    manualOverride?: { rank: number; reason: string };
  };
};

type MutableRow = Omit<StandingRow, 'rank' | 'tieBreakExplanation'> & { sourceGameIds: string[] };
type ManualOverride = { rank: number; reason: string };

export function calculateStandings(
  teamIds: readonly string[],
  results: readonly AuthoritativeResult[],
  rules: StandingsRules,
  manualOverrides: ReadonlyMap<string, ManualOverride> = new Map(),
): StandingRow[] {
  const rows = new Map<string, MutableRow>();
  for (const teamId of [...new Set(teamIds)]) {
    rows.set(teamId, emptyRow(teamId));
  }
  const included = results.filter((result) => result.countsForStandings);
  for (const result of included) {
    const home = rows.get(result.homeTeamId);
    const away = rows.get(result.awayTeamId);
    if (!home || !away || result.homeScore < 0 || result.awayScore < 0) {
      throw new Error(`Invalid authoritative result ${result.gameId}`);
    }
    applyGame(home, result.homeScore, result.awayScore, result.gameId, rules);
    applyGame(away, result.awayScore, result.homeScore, result.gameId, rules);
  }
  const headToHead = buildHeadToHead(included, rows.keys());
  const sorted = [...rows.values()].sort((left, right) => {
    const leftOverride = manualOverrides.get(left.teamId);
    const rightOverride = manualOverrides.get(right.teamId);
    if (leftOverride || rightOverride) {
      if (leftOverride && rightOverride)
        return leftOverride.rank - rightOverride.rank || left.teamId.localeCompare(right.teamId);
      return leftOverride ? -1 : 1;
    }
    for (const criterion of rules.tieBreakers) {
      const difference = compareCriterion(criterion, left, right, headToHead);
      if (difference !== 0) return difference;
    }
    return left.teamId.localeCompare(right.teamId);
  });
  return sorted.map((row, index) => {
    const override = manualOverrides.get(row.teamId);
    return {
      teamId: row.teamId,
      played: row.played,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      pointsFor: row.pointsFor,
      pointsAgainst: row.pointsAgainst,
      pointDifference: row.pointDifference,
      standingPoints: row.standingPoints,
      rank: index + 1,
      tieBreakExplanation: {
        orderedCriteria: rules.tieBreakers,
        values: criterionValues(row, headToHead),
        sourceGameIds: [...row.sourceGameIds].sort(),
        ...(override ? { manualOverride: override } : {}),
      },
    };
  });
}

function emptyRow(teamId: string): MutableRow {
  return {
    teamId,
    played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointDifference: 0,
    standingPoints: 0,
    sourceGameIds: [],
  };
}

function applyGame(
  row: MutableRow,
  pointsFor: number,
  pointsAgainst: number,
  gameId: string,
  rules: StandingsRules,
): void {
  row.played += 1;
  row.pointsFor += pointsFor;
  row.pointsAgainst += pointsAgainst;
  row.pointDifference = row.pointsFor - row.pointsAgainst;
  row.sourceGameIds.push(gameId);
  if (pointsFor > pointsAgainst) {
    row.wins += 1;
    row.standingPoints += rules.winPoints;
  } else if (pointsFor < pointsAgainst) {
    row.losses += 1;
    row.standingPoints += rules.lossPoints;
  } else {
    row.draws += 1;
    row.standingPoints += rules.drawPoints;
  }
}

type HeadToHeadRow = { wins: number; pointDifference: number };
type HeadToHead = Map<string, HeadToHeadRow>;

function buildHeadToHead(
  results: readonly AuthoritativeResult[],
  teamIds: Iterable<string>,
): HeadToHead {
  const table: HeadToHead = new Map();
  for (const teamId of teamIds) table.set(teamId, { wins: 0, pointDifference: 0 });
  for (const result of results) {
    const home = table.get(result.homeTeamId);
    const away = table.get(result.awayTeamId);
    if (!home || !away) continue;
    home.pointDifference += result.homeScore - result.awayScore;
    away.pointDifference += result.awayScore - result.homeScore;
    if (result.homeScore > result.awayScore) home.wins += 1;
    if (result.awayScore > result.homeScore) away.wins += 1;
  }
  return table;
}

function compareCriterion(
  criterion: TieBreaker,
  left: MutableRow,
  right: MutableRow,
  headToHead: HeadToHead,
): number {
  const leftValue = valueFor(criterion, left, headToHead);
  const rightValue = valueFor(criterion, right, headToHead);
  return criterion === 'FEWEST_POINTS_CONCEDED' ? leftValue - rightValue : rightValue - leftValue;
}

function valueFor(criterion: TieBreaker, row: MutableRow, headToHead: HeadToHead): number {
  switch (criterion) {
    case 'WINS':
      return row.wins;
    case 'POINTS':
      return row.standingPoints;
    case 'HEAD_TO_HEAD':
      return headToHead.get(row.teamId)?.wins ?? 0;
    case 'HEAD_TO_HEAD_POINT_DIFFERENCE':
      return headToHead.get(row.teamId)?.pointDifference ?? 0;
    case 'OVERALL_POINT_DIFFERENCE':
      return row.pointDifference;
    case 'POINTS_SCORED':
      return row.pointsFor;
    case 'FEWEST_POINTS_CONCEDED':
      return row.pointsAgainst;
  }
}

function criterionValues(row: MutableRow, headToHead: HeadToHead): Record<TieBreaker, number> {
  return {
    WINS: valueFor('WINS', row, headToHead),
    POINTS: valueFor('POINTS', row, headToHead),
    HEAD_TO_HEAD: valueFor('HEAD_TO_HEAD', row, headToHead),
    HEAD_TO_HEAD_POINT_DIFFERENCE: valueFor('HEAD_TO_HEAD_POINT_DIFFERENCE', row, headToHead),
    OVERALL_POINT_DIFFERENCE: valueFor('OVERALL_POINT_DIFFERENCE', row, headToHead),
    POINTS_SCORED: valueFor('POINTS_SCORED', row, headToHead),
    FEWEST_POINTS_CONCEDED: valueFor('FEWEST_POINTS_CONCEDED', row, headToHead),
  };
}
