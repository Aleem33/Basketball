export type ScoreState = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export type ScoreMutation = {
  type: 'ADD_ONE' | 'ADD_TWO' | 'ADD_THREE' | 'CORRECTION' | 'TIMEOUT' | 'NOTE';
  teamId?: string;
  correctedPointsDelta?: number;
  correctedTeamId?: string;
};

export type AppliedScoreMutation = ScoreState & { teamId: string | null; pointsDelta: number };

export function applyScoreMutation(
  state: ScoreState,
  mutation: ScoreMutation,
): AppliedScoreMutation {
  const pointsDelta = pointsFor(mutation);
  const teamId = mutation.type === 'CORRECTION' ? mutation.correctedTeamId : mutation.teamId;
  if (pointsDelta === 0) return { ...state, teamId: null, pointsDelta: 0 };
  if (!teamId || (teamId !== state.homeTeamId && teamId !== state.awayTeamId)) {
    throw new Error('Score event team is not participating in the game');
  }
  const homeScore = state.homeScore + (teamId === state.homeTeamId ? pointsDelta : 0);
  const awayScore = state.awayScore + (teamId === state.awayTeamId ? pointsDelta : 0);
  if (homeScore < 0 || awayScore < 0) throw new Error('Correction would produce a negative score');
  return { ...state, homeScore, awayScore, teamId, pointsDelta };
}

function pointsFor(mutation: ScoreMutation): number {
  switch (mutation.type) {
    case 'ADD_ONE':
      return 1;
    case 'ADD_TWO':
      return 2;
    case 'ADD_THREE':
      return 3;
    case 'CORRECTION':
      if (!mutation.correctedPointsDelta || mutation.correctedPointsDelta <= 0) {
        throw new Error('Only a positive scoring event can be corrected');
      }
      return -mutation.correctedPointsDelta;
    case 'TIMEOUT':
    case 'NOTE':
      return 0;
  }
}
