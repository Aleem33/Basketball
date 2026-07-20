import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { uuidSchema } from '@tournament/validation';
import { CorrelationId, CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { permissions } from '../authorization/permissions';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { SuperAdminGuard } from '../authorization/super-admin.guard';
import {
  createAnnouncementSchema,
  createCorrectionRequestSchema,
  createCourtSchema,
  createDivisionSchema,
  createLeagueSchema,
  createOrganizationSchema,
  createPlayerSchema,
  createRosterSchema,
  createSeasonSchema,
  createStageSchema,
  createTeamSchema,
  createTournamentSchema,
  createVenueSchema,
  decideRosterSchema,
  decideTeamApplicationSchema,
  exportResourceSchema,
  rosterPlayerSchema,
  resolveCorrectionRequestSchema,
  submitTeamApplicationSchema,
  submitRosterSchema,
  updatePlayerSchema,
  updateTeamSchema,
  updateTournamentSchema,
} from './management.schemas';
import { ManagementService } from './management.service';

@ApiTags('management')
@Controller('management')
@UseGuards(JwtAuthGuard)
export class ManagementController {
  constructor(private readonly management: ManagementService) {}

  @Post('organizations')
  @UseGuards(SuperAdminGuard)
  createOrganization(
    @Body(new ZodValidationPipe(createOrganizationSchema))
    body: ReturnType<typeof createOrganizationSchema.parse>,
  ) {
    return this.management.createOrganization(body);
  }

  @Get('organizations/:organizationId/dashboard')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.organizationManage)
  dashboard(@Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string) {
    return this.management.dashboard(organizationId);
  }

  @Post('organizations/:organizationId/leagues')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createLeague(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createLeagueSchema))
    body: ReturnType<typeof createLeagueSchema.parse>,
  ) {
    return this.management.createLeague(organizationId, body);
  }

  @Post('organizations/:organizationId/seasons')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createSeason(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createSeasonSchema))
    body: ReturnType<typeof createSeasonSchema.parse>,
  ) {
    return this.management.createSeason(organizationId, body);
  }

  @Post('organizations/:organizationId/tournaments')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createTournament(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createTournamentSchema))
    body: ReturnType<typeof createTournamentSchema.parse>,
  ) {
    return this.management.createTournament(organizationId, body);
  }

  @Patch('organizations/:organizationId/tournaments/:tournamentId')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  updateTournament(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Body(new ZodValidationPipe(updateTournamentSchema))
    body: ReturnType<typeof updateTournamentSchema.parse>,
  ) {
    return this.management.updateTournament(organizationId, tournamentId, body);
  }

  @Post('organizations/:organizationId/tournaments/:tournamentId/divisions')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createDivision(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Body(new ZodValidationPipe(createDivisionSchema))
    body: ReturnType<typeof createDivisionSchema.parse>,
  ) {
    return this.management.createDivision(organizationId, tournamentId, body);
  }

  @Post('organizations/:organizationId/tournaments/:tournamentId/divisions/:divisionId/stages')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createStage(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('divisionId', new ZodValidationPipe(uuidSchema)) divisionId: string,
    @Body(new ZodValidationPipe(createStageSchema))
    body: ReturnType<typeof createStageSchema.parse>,
  ) {
    return this.management.createStage(organizationId, divisionId, body);
  }

  @Post('organizations/:organizationId/venues')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createVenue(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createVenueSchema))
    body: ReturnType<typeof createVenueSchema.parse>,
  ) {
    return this.management.createVenue(organizationId, body);
  }

  @Post('organizations/:organizationId/venues/:venueId/courts')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  createCourt(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('venueId', new ZodValidationPipe(uuidSchema)) venueId: string,
    @Body(new ZodValidationPipe(createCourtSchema))
    body: ReturnType<typeof createCourtSchema.parse>,
  ) {
    return this.management.createCourt(organizationId, venueId, body);
  }

  @Post('organizations/:organizationId/teams')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.organizationManage)
  createTeam(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createTeamSchema)) body: ReturnType<typeof createTeamSchema.parse>,
  ) {
    return this.management.createTeam(organizationId, body);
  }

  @Patch('organizations/:organizationId/teams/:teamId')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  updateTeam(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Body(new ZodValidationPipe(updateTeamSchema)) body: ReturnType<typeof updateTeamSchema.parse>,
  ) {
    return this.management.updateTeam(organizationId, teamId, body);
  }

  @Post('organizations/:organizationId/teams/:teamId/players')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  createPlayer(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Body(new ZodValidationPipe(createPlayerSchema))
    body: ReturnType<typeof createPlayerSchema.parse>,
  ) {
    return this.management.createPlayer(organizationId, teamId, body);
  }

  @Patch('organizations/:organizationId/teams/:teamId/players/:playerId')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  updatePlayer(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Param('playerId', new ZodValidationPipe(uuidSchema)) playerId: string,
    @Body(new ZodValidationPipe(updatePlayerSchema))
    body: ReturnType<typeof updatePlayerSchema.parse>,
  ) {
    return this.management.updatePlayer(organizationId, teamId, playerId, body);
  }

  @Delete('organizations/:organizationId/teams/:teamId/players/:playerId')
  @HttpCode(204)
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  archivePlayer(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Param('playerId', new ZodValidationPipe(uuidSchema)) playerId: string,
  ) {
    return this.management.archivePlayer(organizationId, teamId, playerId);
  }

  @Post('organizations/:organizationId/teams/:teamId/rosters')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.rosterManage)
  createRoster(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Body(new ZodValidationPipe(createRosterSchema))
    body: ReturnType<typeof createRosterSchema.parse>,
  ) {
    return this.management.createRoster(organizationId, teamId, body);
  }

  @Post('organizations/:organizationId/teams/:teamId/rosters/:rosterId/players')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.rosterManage)
  upsertRosterPlayer(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Param('rosterId', new ZodValidationPipe(uuidSchema)) rosterId: string,
    @Body(new ZodValidationPipe(rosterPlayerSchema))
    body: ReturnType<typeof rosterPlayerSchema.parse>,
  ) {
    return this.management.upsertRosterPlayer(organizationId, teamId, rosterId, body);
  }

  @Post('organizations/:organizationId/teams/:teamId/rosters/:rosterId/submit')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.rosterManage)
  submitRoster(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @Param('rosterId', new ZodValidationPipe(uuidSchema)) rosterId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(submitRosterSchema))
    body: ReturnType<typeof submitRosterSchema.parse>,
  ) {
    return this.management.submitRoster(organizationId, teamId, rosterId, actor.userId, body);
  }

  @Post('organizations/:organizationId/rosters/:rosterId/decision')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.rosterApprove)
  decideRoster(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('rosterId', new ZodValidationPipe(uuidSchema)) rosterId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(decideRosterSchema))
    body: ReturnType<typeof decideRosterSchema.parse>,
  ) {
    return this.management.decideRoster(organizationId, rosterId, actor.userId, body);
  }

  @Post('organizations/:organizationId/tournaments/:tournamentId/teams/:teamId/applications')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  submitTeamApplication(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(submitTeamApplicationSchema))
    body: ReturnType<typeof submitTeamApplicationSchema.parse>,
  ) {
    return this.management.submitTeamApplication(
      organizationId,
      tournamentId,
      teamId,
      actor.userId,
      body,
    );
  }

  @Get('organizations/:organizationId/tournaments/:tournamentId/team-applications')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  teamApplications(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
  ) {
    return this.management.teamApplications(organizationId, tournamentId);
  }

  @Post(
    'organizations/:organizationId/tournaments/:tournamentId/team-applications/:applicationId/decision',
  )
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  decideTeamApplication(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('applicationId', new ZodValidationPipe(uuidSchema)) applicationId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Body(new ZodValidationPipe(decideTeamApplicationSchema))
    body: ReturnType<typeof decideTeamApplicationSchema.parse>,
  ) {
    return this.management.decideTeamApplication(
      organizationId,
      tournamentId,
      applicationId,
      actor.userId,
      correlationId,
      body,
    );
  }

  @Post('organizations/:organizationId/tournaments/:tournamentId/teams/:teamId/corrections')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.teamManage)
  createCorrectionRequest(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(createCorrectionRequestSchema))
    body: ReturnType<typeof createCorrectionRequestSchema.parse>,
  ) {
    return this.management.createCorrectionRequest(
      organizationId,
      tournamentId,
      teamId,
      actor.userId,
      body,
    );
  }

  @Get('organizations/:organizationId/tournaments/:tournamentId/corrections')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  correctionRequests(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
  ) {
    return this.management.correctionRequests(organizationId, tournamentId);
  }

  @Post(
    'organizations/:organizationId/tournaments/:tournamentId/corrections/:correctionId/decision',
  )
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.tournamentManage)
  resolveCorrectionRequest(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('correctionId', new ZodValidationPipe(uuidSchema)) correctionId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Body(new ZodValidationPipe(resolveCorrectionRequestSchema))
    body: ReturnType<typeof resolveCorrectionRequestSchema.parse>,
  ) {
    return this.management.resolveCorrectionRequest(
      organizationId,
      tournamentId,
      correctionId,
      actor.userId,
      correlationId,
      body,
    );
  }

  @Get('organizations/:organizationId/exports/:resource')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.exportCreate)
  async exportCsv(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('resource', new ZodValidationPipe(exportResourceSchema))
    resource: ReturnType<typeof exportResourceSchema.parse>,
    @Res() response: Response,
  ): Promise<void> {
    const csv = await this.management.exportCsv(organizationId, resource);
    response.setHeader('content-type', 'text/csv; charset=utf-8');
    response.setHeader('content-disposition', `attachment; filename="${resource}.csv"`);
    response.send(csv);
  }

  @Post('organizations/:organizationId/announcements')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.announcementManage)
  createAnnouncement(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(createAnnouncementSchema))
    body: ReturnType<typeof createAnnouncementSchema.parse>,
  ) {
    return this.management.createAnnouncement(organizationId, actor.userId, body);
  }
}
