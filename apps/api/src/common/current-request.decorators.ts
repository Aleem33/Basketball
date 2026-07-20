import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AppRequest, RequestActor } from './request-context';

export const CurrentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestActor => {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.actor) {
      throw new Error('CurrentActor used without authentication guard');
    }
    return request.actor;
  },
);

export const CorrelationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    return context.switchToHttp().getRequest<AppRequest>().correlationId;
  },
);
