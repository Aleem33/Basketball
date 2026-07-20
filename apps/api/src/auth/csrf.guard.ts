import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import type { AppRequest } from '../common/request-context';
import { TokenCryptoService } from '../security/token-crypto.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly crypto: TokenCryptoService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (request.header('x-client-platform') === 'mobile') return true;
    const headerToken = request.header('x-csrf-token');
    const cookieToken = request.cookies.tp_csrf as string | undefined;
    const origin = request.header('origin');
    const trustedOrigins = this.config.get('TRUSTED_ORIGINS', { infer: true });
    if (
      !headerToken ||
      !cookieToken ||
      headerToken !== cookieToken ||
      !this.crypto.verifyCsrf(headerToken) ||
      !origin ||
      !trustedOrigins.includes(origin)
    ) {
      throw new ForbiddenException({
        code: 'CSRF_VALIDATION_FAILED',
        message: 'Request verification failed',
      });
    }
    return true;
  }
}
