import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
  type NestMiddleware,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NextFunction, Response } from 'express';
import type { Environment } from '../config/environment';
import type { AppRequest } from '../common/request-context';

@Injectable()
export class ClientCompatibilityMiddleware implements NestMiddleware {
  constructor(private readonly config: ConfigService<Environment, true>) {}

  use(request: AppRequest, _response: Response, next: NextFunction): void {
    if (
      request.path.endsWith('/health') ||
      request.path.endsWith('/ready') ||
      request.path.endsWith('/version')
    ) {
      next();
      return;
    }
    if (this.config.get('MAINTENANCE_MODE', { infer: true })) {
      throw new ServiceUnavailableException({
        code: 'MAINTENANCE',
        message: 'Service is temporarily unavailable for maintenance',
      });
    }
    const appVersion = request.header('x-mobile-app-version');
    const minimumVersion: string = this.config.get('MOBILE_MINIMUM_VERSION', { infer: true });
    if (appVersion && compareVersions(appVersion, minimumVersion) < 0) {
      throw new HttpException(
        {
          code: 'APP_UPGRADE_REQUIRED',
          message: 'This application version is no longer supported',
          minimumVersion,
        },
        426,
      );
    }
    next();
  }
}

function compareVersions(left: string, right: string): number {
  const parse = (value: string) =>
    value
      .split('.')
      .slice(0, 3)
      .map((part) => Number.parseInt(part, 10) || 0);
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
