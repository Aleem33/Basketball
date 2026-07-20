import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { AppRequest } from '../common/request-context';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.actor?.platformSuperAdmin) {
      throw new ForbiddenException({
        code: 'ELEVATED_ACCESS_REQUIRED',
        message: 'Elevated access is required',
      });
    }
    return true;
  }
}
