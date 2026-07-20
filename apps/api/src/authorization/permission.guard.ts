import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AppRequest } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import { AuthorizationService } from './authorization.service';
import type { PermissionKey } from './permissions';
import { REQUIRED_PERMISSION } from './require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorization: AuthorizationService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey | undefined>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<AppRequest>();
    if (!request.actor)
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' });
    const organizationId =
      routeParam(request.params.organizationId) ?? request.header('x-organization-id');
    if (!organizationId) {
      throw new ForbiddenException({
        code: 'ORGANIZATION_CONTEXT_REQUIRED',
        message: 'Organization context is required',
      });
    }
    if (request.actor.platformSuperAdmin) {
      await this.audit.record({
        organizationId,
        actorUserId: request.actor.userId,
        correlationId: request.correlationId,
        action: 'platform.elevated-access',
        resourceType: 'Request',
        outcome: 'SUCCESS',
        metadata: { permission, method: request.method, path: request.path },
      });
      return true;
    }
    const permitted = await this.authorization.hasPermission(
      request.actor.userId,
      organizationId,
      permission,
      {
        ...((routeParam(request.params.tournamentId) ?? bodyParam(request.body, 'tournamentId'))
          ? {
              tournamentId:
                routeParam(request.params.tournamentId) ?? bodyParam(request.body, 'tournamentId'),
            }
          : {}),
        ...(routeParam(request.params.teamId) ? { teamId: routeParam(request.params.teamId) } : {}),
        ...(routeParam(request.params.gameId) ? { gameId: routeParam(request.params.gameId) } : {}),
        ...(routeParam(request.params.stageId)
          ? { stageId: routeParam(request.params.stageId) }
          : {}),
      },
    );
    if (!permitted) {
      await this.audit.record({
        organizationId,
        actorUserId: request.actor.userId,
        correlationId: request.correlationId,
        action: 'authorization.denied',
        resourceType: 'Request',
        outcome: 'DENIED',
        metadata: { permission, method: request.method, path: request.path },
      });
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Access denied' });
    }
    return true;
  }
}

function routeParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function bodyParam(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = Reflect.get(value, key) as unknown;
  return typeof candidate === 'string' ? candidate : undefined;
}
