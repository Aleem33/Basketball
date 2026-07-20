import { Module } from '@nestjs/common';
import { ClientCompatibilityMiddleware } from './client-compatibility.middleware';
import { HealthController } from './health.controller';

@Module({ controllers: [HealthController], providers: [ClientCompatibilityMiddleware] })
export class ObservabilityModule {}
