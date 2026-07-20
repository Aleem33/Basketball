export type BracketSlot = {
  round: number;
  slot: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  sourceHome?: { round: number; slot: number };
  sourceAway?: { round: number; slot: number };
};

export function generateSingleElimination(teamIds: readonly string[]): BracketSlot[] {
  const unique = [...new Set(teamIds)];
  if (unique.length < 2) throw new Error('At least two unique teams are required');
  const size = 2 ** Math.ceil(Math.log2(unique.length));
  const seeds: (string | null)[] = Array.from(
    { length: size },
    (_, index) => unique[index] ?? null,
  );
  const result: BracketSlot[] = [];
  let gamesInRound = size / 2;
  for (let round = 1; gamesInRound >= 1; round += 1) {
    for (let slot = 0; slot < gamesInRound; slot += 1) {
      if (round === 1) {
        result.push({
          round,
          slot,
          homeTeamId: seeds[slot] ?? null,
          awayTeamId: seeds[size - 1 - slot] ?? null,
        });
      } else {
        result.push({
          round,
          slot,
          homeTeamId: null,
          awayTeamId: null,
          sourceHome: { round: round - 1, slot: slot * 2 },
          sourceAway: { round: round - 1, slot: slot * 2 + 1 },
        });
      }
    }
    gamesInRound /= 2;
  }
  return result;
}
