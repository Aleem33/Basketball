import type { Request } from 'express';

export type RequestActor = {
  userId: string;
  sessionId: string;
  platformSuperAdmin: boolean;
};

export type AppRequest = Request & {
  correlationId: string;
  actor?: RequestActor;
};
