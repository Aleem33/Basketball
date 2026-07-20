export type Brand<TValue, TBrand extends string> = TValue & { readonly __brand: TBrand };

export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type TournamentId = Brand<string, 'TournamentId'>;
export type TeamId = Brand<string, 'TeamId'>;
export type GameId = Brand<string, 'GameId'>;

export type AuthenticatedActor = {
  userId: string;
  sessionId: string;
  organizationId?: string;
  platformSuperAdmin: boolean;
};

export type CorrelatedRequest = {
  correlationId: string;
  actor?: AuthenticatedActor;
};

export type PageRequest = {
  cursor?: string;
  limit: number;
};

export type PageResult<T> = {
  items: T[];
  nextCursor: string | null;
};
