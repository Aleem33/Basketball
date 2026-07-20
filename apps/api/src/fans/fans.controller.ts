import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { uuidSchema } from '@tournament/validation';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { deviceRegistrationSchema, notificationPreferenceSchema } from './fans.schemas';
import { FansService } from './fans.service';

@ApiTags('fan personalization')
@Controller('me')
@UseGuards(JwtAuthGuard)
export class FansController {
  constructor(private readonly fans: FansService) {}

  @Get('favorites')
  favorites(@CurrentActor() actor: RequestActor) {
    return this.fans.favorites(actor.userId);
  }

  @Put('favorites/teams/:teamId')
  favoriteTeam(
    @CurrentActor() actor: RequestActor,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
  ) {
    return this.fans.setFavoriteTeam(actor.userId, teamId, true);
  }

  @Delete('favorites/teams/:teamId')
  unfavoriteTeam(
    @CurrentActor() actor: RequestActor,
    @Param('teamId', new ZodValidationPipe(uuidSchema)) teamId: string,
  ) {
    return this.fans.setFavoriteTeam(actor.userId, teamId, false);
  }

  @Put('favorites/tournaments/:tournamentId')
  favoriteTournament(
    @CurrentActor() actor: RequestActor,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
  ) {
    return this.fans.setFavoriteTournament(actor.userId, tournamentId, true);
  }

  @Delete('favorites/tournaments/:tournamentId')
  unfavoriteTournament(
    @CurrentActor() actor: RequestActor,
    @Param('tournamentId', new ZodValidationPipe(uuidSchema)) tournamentId: string,
  ) {
    return this.fans.setFavoriteTournament(actor.userId, tournamentId, false);
  }

  @Put('notification-preferences')
  preference(
    @CurrentActor() actor: RequestActor,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Body(new ZodValidationPipe(notificationPreferenceSchema))
    body: ReturnType<typeof notificationPreferenceSchema.parse>,
  ) {
    return this.fans.setPreference(actor.userId, organizationId, body);
  }

  @Post('devices')
  registerDevice(
    @CurrentActor() actor: RequestActor,
    @Headers('x-organization-id') organizationId: string | undefined,
    @Body(new ZodValidationPipe(deviceRegistrationSchema))
    body: ReturnType<typeof deviceRegistrationSchema.parse>,
  ) {
    return this.fans.registerDevice(actor.userId, organizationId, body);
  }
}
