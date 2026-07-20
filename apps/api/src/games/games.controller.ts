import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '@tournament/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionGuard } from '../authorization/permission.guard';
import { permissions } from '../authorization/permissions';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { CorrelationId, CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  assignScorekeeperSchema,
  createFixtureSchema,
  generateBracketSchema,
  generateRoundRobinSchema,
  manualStandingOverrideSchema,
  rescheduleGameSchema,
  setGameStatusSchema,
} from './games.schemas';
import { GamesService } from './games.service';

@ApiTags('games and competition rules')
@Controller('organizations/:organizationId')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class GamesController {
  constructor(private readonly games: GamesService) {}

  @Post('games')
  @RequirePermission(permissions.gameManage)
  createFixture(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Body(new ZodValidationPipe(createFixtureSchema))
    body: ReturnType<typeof createFixtureSchema.parse>,
  ) {
    return this.games.createFixture(organizationId, body);
  }

  @Post('tournaments/:tournamentId/stages/:stageId/schedule/round-robin')
  @RequirePermission(permissions.gameManage)
  roundRobin(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('stageId', new ZodValidationPipe(uuidSchema)) stageId: string,
    @Body(new ZodValidationPipe(generateRoundRobinSchema))
    body: ReturnType<typeof generateRoundRobinSchema.parse>,
  ) {
    return this.games.generateRoundRobinFixtures(organizationId, tournamentId, stageId, body);
  }

  @Post('tournaments/:tournamentId/stages/:stageId/brackets')
  @RequirePermission(permissions.gameManage)
  bracket(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
    @Param('stageId', new ZodValidationPipe(uuidSchema)) stageId: string,
    @Body(new ZodValidationPipe(generateBracketSchema))
    body: ReturnType<typeof generateBracketSchema.parse>,
  ) {
    return this.games.generateBracket(organizationId, tournamentId, stageId, body);
  }

  @Post('games/:gameId/scorekeepers')
  @RequirePermission(permissions.gameManage)
  assignScorekeeper(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @Body(new ZodValidationPipe(assignScorekeeperSchema))
    body: ReturnType<typeof assignScorekeeperSchema.parse>,
  ) {
    return this.games.assignScorekeeper(organizationId, gameId, body.userId, body.expiresAt);
  }

  @Post('games/:gameId/reschedule')
  @RequirePermission(permissions.gameManage)
  reschedule(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Body(new ZodValidationPipe(rescheduleGameSchema))
    body: ReturnType<typeof rescheduleGameSchema.parse>,
  ) {
    return this.games.reschedule(organizationId, gameId, actor.userId, correlationId, body);
  }

  @Post('games/:gameId/status')
  @RequirePermission(permissions.gameManage)
  status(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Body(new ZodValidationPipe(setGameStatusSchema))
    body: ReturnType<typeof setGameStatusSchema.parse>,
  ) {
    return this.games.setStatus(organizationId, gameId, actor.userId, correlationId, body);
  }

  @Post('stages/:stageId/standings/recalculate')
  @RequirePermission(permissions.standingManage)
  recalculateStandings(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('stageId', new ZodValidationPipe(uuidSchema)) stageId: string,
  ) {
    return this.games.recalculateStandings(organizationId, stageId);
  }

  @Post('stages/:stageId/standings/manual-override')
  @RequirePermission(permissions.standingManage)
  manualOverride(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('stageId', new ZodValidationPipe(uuidSchema)) stageId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(manualStandingOverrideSchema))
    body: ReturnType<typeof manualStandingOverrideSchema.parse>,
  ) {
    return this.games.setManualOverride(
      organizationId,
      stageId,
      actor.userId,
      body.teamId,
      body.rank,
      body.reason,
    );
  }
}
