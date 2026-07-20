import { MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AccessModule } from './access/access.module';
import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { CorrelationIdMiddleware } from './common/correlation-id.middleware';
import { validateEnvironment, type Environment } from './config/environment';
import { DatabaseModule } from './database/database.module';
import { EmailModule } from './email/email.module';
import { FansModule } from './fans/fans.module';
import { GamesModule } from './games/games.module';
import { JobsModule } from './jobs/jobs.module';
import { InvitationsModule } from './invitations/invitations.module';
import { LiveScoringModule } from './live-scoring/live-scoring.module';
import { ManagementModule } from './management/management.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ClientCompatibilityMiddleware } from './observability/client-compatibility.middleware';
import { ObservabilityModule } from './observability/observability.module';
import { PublicModule } from './public/public.module';
import { RedisModule } from './redis/redis.module';
import { SecurityModule } from './security/security.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Environment, true>) => [
        {
          ttl: config.get('RATE_LIMIT_TTL_MS', { infer: true }),
          limit: config.get('RATE_LIMIT_MAX', { infer: true }),
        },
      ],
    }),
    DatabaseModule,
    RedisModule,
    SecurityModule,
    AuditModule,
    AuthModule,
    AuthorizationModule,
    AccessModule,
    PublicModule,
    ManagementModule,
    GamesModule,
    LiveScoringModule,
    StorageModule,
    FansModule,
    NotificationsModule,
    EmailModule,
    JobsModule,
    InvitationsModule,
    ObservabilityModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware, ClientCompatibilityMiddleware).forRoutes('*');
  }
}
