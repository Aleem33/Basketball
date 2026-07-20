export type ScheduledPairing = {
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  leg: 1 | 2;
};

export function generateRoundRobin(
  teamIds: readonly string[],
  doubleRound = false,
): ScheduledPairing[] {
  const unique = [...new Set(teamIds)];
  if (unique.length < 2) throw new Error('At least two unique teams are required');
  const rotation: (string | null)[] = unique.length % 2 === 0 ? [...unique] : [...unique, null];
  const rounds = rotation.length - 1;
  const firstLeg: ScheduledPairing[] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index];
      const right = rotation[rotation.length - 1 - index];
      if (!left || !right) continue;
      const flip = (round + index) % 2 === 1;
      firstLeg.push({
        round: round + 1,
        homeTeamId: flip ? right : left,
        awayTeamId: flip ? left : right,
        leg: 1,
      });
    }
    const fixed = rotation[0];
    const tail = rotation.slice(1);
    const last = tail.pop();
    rotation.splice(0, rotation.length, fixed ?? null, last ?? null, ...tail);
  }
  if (!doubleRound) return firstLeg;
  return [
    ...firstLeg,
    ...firstLeg.map((pairing) => ({
      round: pairing.round + rounds,
      homeTeamId: pairing.awayTeamId,
      awayTeamId: pairing.homeTeamId,
      leg: 2 as const,
    })),
  ];
}
