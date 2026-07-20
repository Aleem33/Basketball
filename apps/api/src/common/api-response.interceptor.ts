import { CallHandler, ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccess } from '@tournament/contracts';
import type { AppRequest } from './request-context';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        meta: {
          correlationId: request.correlationId,
          timestamp: new Date().toISOString(),
        },
      })),
    );
  }
}
