import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from '../config/environment';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { GamesService } from '../games/games.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { SecurityModule } from '../security/security.module';
import { StorageService } from '../storage/storage.service';
import { JobConsumerService } from './job-consumer.service';
import { JobHandlerService } from './job-handler.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    DatabaseModule,
    SecurityModule,
    EmailModule,
    NotificationsModule,
  ],
  providers: [GamesService, StorageService, JobHandlerService, JobConsumerService],
})
export class WorkerModule {}
