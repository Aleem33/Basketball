import { randomUUID } from 'node:crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AppRequest } from './request-context';

const correlationPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: AppRequest, response: Response, next: NextFunction): void {
    const supplied = request.header('x-correlation-id');
    request.correlationId = supplied && correlationPattern.test(supplied) ? supplied : randomUUID();
    response.setHeader('x-correlation-id', request.correlationId);
    next();
  }
}
