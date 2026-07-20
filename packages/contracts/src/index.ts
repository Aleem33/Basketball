export const API_VERSION = 'v1' as const;

export type ApiMeta = {
  correlationId: string;
  timestamp: string;
  nextCursor?: string;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ValidationIssue = {
  path: string;
  code: string;
  message: string;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    issues?: ValidationIssue[];
  };
  meta: ApiMeta;
};

export const gameStatuses = [
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'PAUSED',
  'FINAL',
  'POSTPONED',
  'CANCELLED',
  'ABANDONED',
  'FORFEITED',
] as const;
export type GameStatus = (typeof gameStatuses)[number];

export const scoreEventTypes = [
  'ADD_ONE',
  'ADD_TWO',
  'ADD_THREE',
  'CORRECTION',
  'TIMEOUT',
  'NOTE',
] as const;
export type ScoreEventType = (typeof scoreEventTypes)[number];

export type PublicTournamentSummary = {
  id: string;
  name: string;
  slug: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

export type PublicTeamSummary = {
  id: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
};

export type PublicGameSummary = {
  id: string;
  scheduledAt: string;
  status: GameStatus;
  homeTeam: PublicTeamSummary | null;
  awayTeam: PublicTeamSummary | null;
  homeScore: number;
  awayScore: number;
  version: number;
};

export type GameState = PublicGameSummary & {
  currentPeriod: number;
  periods: { period: number; homeScore: number; awayScore: number }[];
  lastEventSequence: number;
};

export type ScoreCommand = {
  gameId: string;
  scoringSessionId: string;
  idempotencyKey: string;
  expectedVersion: number;
  occurredAt: string;
  period: number;
  teamId?: string;
  type: ScoreEventType;
  correctionOfEventId?: string;
  correctionReason?: string;
  note?: string;
};

export type LiveGameUpdate = {
  event: 'game.updated';
  game: GameState;
  correlationId: string;
};

export type VersionResponse = {
  apiVersion: string;
  buildVersion: string;
  minimumMobileVersion: string;
  maintenance: boolean;
};
