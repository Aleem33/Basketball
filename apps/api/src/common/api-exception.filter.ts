import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiError, ValidationIssue } from '@tournament/contracts';
import type { AppRequest } from './request-context';

type ErrorPayload = {
  code?: string;
  message?: string | string[];
  issues?: ValidationIssue[];
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<AppRequest>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = isHttpException ? exception.getResponse() : undefined;
    const payload: ErrorPayload = typeof raw === 'object' ? raw : {};
    const rawMessage = payload.message;
    const message = Array.isArray(rawMessage)
      ? 'The request contains invalid values'
      : (rawMessage ?? (status >= 500 ? 'An unexpected error occurred' : 'Request failed'));

    if (status >= 500) {
      this.logger.error({
        correlationId: request.correlationId,
        method: request.method,
        path: request.path,
        error: exception instanceof Error ? exception.message : 'Unknown error',
        stack: exception instanceof Error ? exception.stack : undefined,
      });
    }

    const body: ApiError = {
      success: false,
      error: {
        code: payload.code ?? `HTTP_${status}`,
        message,
        ...(payload.issues ? { issues: payload.issues } : {}),
      },
      meta: {
        correlationId: request.correlationId,
        timestamp: new Date().toISOString(),
      },
    };
    response.status(status).json(body);
  }
}
