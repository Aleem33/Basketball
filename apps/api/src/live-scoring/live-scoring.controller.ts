import { Body, Controller, Headers, Param, Post, UseGuards } from '@nestjs/common';
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
  acquireLeaseSchema,
  heartbeatLeaseSchema,
  scoreCommandSchema,
  transitionCommandSchema,
} from './live-scoring.schemas';
import { LiveScoringGateway } from './live-scoring.gateway';
import { LiveScoringService } from './live-scoring.service';
import { ScoringLeaseService } from './scoring-lease.service';

@ApiTags('live scoring')
@Controller('organizations/:organizationId/games/:gameId/scoring')
@UseGuards(JwtAuthGuard)
export class LiveScoringController {
  constructor(
    private readonly scoring: LiveScoringService,
    private readonly leases: ScoringLeaseService,
    private readonly gateway: LiveScoringGateway,
  ) {}

  @Post('lease')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.gameScore)
  acquireLease(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(acquireLeaseSchema))
    body: ReturnType<typeof acquireLeaseSchema.parse>,
  ) {
    return this.leases.acquire(organizationId, gameId, actor.userId, body.expectedGameVersion);
  }

  @Post('lease/heartbeat')
  heartbeat(
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(heartbeatLeaseSchema))
    body: ReturnType<typeof heartbeatLeaseSchema.parse>,
  ) {
    return this.leases.heartbeat(body.scoringSessionId, body.leaseToken, actor.userId);
  }

  @Post('events')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.gameScore)
  async score(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Headers('x-scoring-lease-token') leaseToken: string,
    @Body(new ZodValidationPipe(scoreCommandSchema))
    body: ReturnType<typeof scoreCommandSchema.parse>,
  ) {
    const result = await this.scoring.applyScoreCommand(
      organizationId,
      gameId,
      actor.userId,
      leaseToken,
      body,
      correlationId,
    );
    this.gateway.broadcastCommittedGame(gameId, { game: result.game, correlationId });
    return result;
  }

  @Post('transitions')
  @UseGuards(PermissionGuard)
  @RequirePermission(permissions.gameScore)
  async transition(
    @Param('organizationId', new ZodValidationPipe(uuidSchema)) organizationId: string,
    @Param('gameId', new ZodValidationPipe(uuidSchema)) gameId: string,
    @CurrentActor() actor: RequestActor,
    @CorrelationId() correlationId: string,
    @Headers('x-scoring-lease-token') leaseToken: string | undefined,
    @Body(new ZodValidationPipe(transitionCommandSchema))
    body: ReturnType<typeof transitionCommandSchema.parse>,
  ) {
    const result = await this.scoring.transition(
      organizationId,
      gameId,
      actor.userId,
      leaseToken,
      body,
      correlationId,
      false,
    );
    this.gateway.broadcastCommittedGame(gameId, { game: result.game, correlationId });
    return result;
  }
}
