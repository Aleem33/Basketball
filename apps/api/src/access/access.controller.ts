import { Controller, Get, Headers, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { uuidSchema } from '@tournament/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { permissions } from '../authorization/permissions';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AccessService } from './access.service';

const statusQuery = z.object({
  status: z
    .enum([
      'DRAFT',
      'SCHEDULED',
      'LIVE',
      'PAUSED',
      'FINAL',
      'POSTPONED',
      'CANCELLED',
      'ABANDONED',
      'FORFEITED',
    ])
    .optional(),
});
const auditQuery = z.object({ search: z.string().trim().max(120).optional() });

@ApiTags('access and private queries')
@Controller()
@UseGuards(JwtAuthGuard)
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Get('me/access')
  access(@CurrentActor() actor: RequestActor) {
    return this.accessService.access(actor);
  }

  @Get('me/scoring-games')
  scoringGames(
    @CurrentActor() actor: RequestActor,
    @Headers('x-organization-id') organizationId: string,
  ) {
    return this.accessService.scoringGames(actor, uuidSchema.parse(organizationId));
  }

  @Get('management/organizations/:organizationId/tournaments')
  tournaments(
    @CurrentActor() actor: RequestActor,
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
  ) {
    return this.accessService.tournaments(actor, organizationId);
  }

  @Get('management/organizations/:organizationId/teams')
  teams(
    @CurrentActor() actor: RequestActor,
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
  ) {
    return this.accessService.teams(actor, organizationId);
  }

  @Get('management/organizations/:organizationId/teams/:teamId/workspace')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  teamWorkspace(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
  ) {
    return this.accessService.teamWorkspace(organizationId, teamId);
  }

  @Get('management/organizations/:organizationId/games')
  games(
    @CurrentActor() actor: RequestActor,
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Query(new ZodValidationPipe(statusQuery)) query: ReturnType<typeof statusQuery.parse>,
  ) {
    return this.accessService.games(actor, organizationId, query.status);
  }

  @Get('management/organizations/:organizationId/rosters')
  rosters(
    @CurrentActor() actor: RequestActor,
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
  ) {
    return this.accessService.submittedRosters(actor, organizationId);
  }

  @Get('management/organizations/:organizationId/audit')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.auditRead)
  audit(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Query(new ZodValidationPipe(auditQuery)) query: ReturnType<typeof auditQuery.parse>,
  ) {
    return this.accessService.audit(organizationId, query.search);
  }
}
