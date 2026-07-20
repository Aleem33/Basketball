import { Module } from '@nestjs/common';
import { LiveScoringController } from './live-scoring.controller';
import { LiveScoringGateway } from './live-scoring.gateway';
import { LiveScoringService } from './live-scoring.service';
import { ScoringLeaseService } from './scoring-lease.service';

@Module({
  controllers: [LiveScoringController],
  providers: [LiveScoringService, LiveScoringGateway, ScoringLeaseService],
  exports: [LiveScoringService, LiveScoringGateway],
})
export class LiveScoringModule {}
