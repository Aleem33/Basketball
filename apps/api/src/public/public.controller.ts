import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { uuidSchema } from '@tournament/validation';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import {
  publicGameQuerySchema,
  publicSearchQuerySchema,
  publicTournamentQuerySchema,
} from './public.schemas';
import { PublicService } from './public.service';

const announcementQuerySchema = z.object({ tournamentId: uuidSchema.optional() });

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('tournaments')
  tournaments(
    @Query(new ZodValidationPipe(publicTournamentQuerySchema))
    query: ReturnType<typeof publicTournamentQuerySchema.parse>,
  ) {
    return this.publicService.tournaments(query);
  }

  @Get('tournaments/:id')
  tournament(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.tournament(id);
  }

  @Get('games')
  games(
    @Query(new ZodValidationPipe(publicGameQuerySchema))
    query: ReturnType<typeof publicGameQuerySchema.parse>,
  ) {
    return this.publicService.games(query);
  }

  @Get('games/:id')
  game(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.game(id);
  }

  @Get('teams/:id')
  team(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.team(id);
  }

  @Get('leagues')
  leagues() {
    return this.publicService.leagues();
  }

  @Get('leagues/:id')
  league(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.league(id);
  }

  @Get('venues')
  venues() {
    return this.publicService.venues();
  }

  @Get('announcements')
  announcements(
    @Query(new ZodValidationPipe(announcementQuerySchema))
    query: ReturnType<typeof announcementQuerySchema.parse>,
  ) {
    return this.publicService.announcements(query.tournamentId);
  }

  @Get('stages/:id/standings')
  standings(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.standings(id);
  }

  @Get('stages/:id/bracket')
  bracket(@Param('id', new ZodValidationPipe(uuidSchema)) id: string) {
    return this.publicService.bracket(id);
  }

  @Get('search')
  search(
    @Query(new ZodValidationPipe(publicSearchQuerySchema))
    query: ReturnType<typeof publicSearchQuerySchema.parse>,
  ) {
    return this.publicService.search(query.q, query.limit);
  }
}
