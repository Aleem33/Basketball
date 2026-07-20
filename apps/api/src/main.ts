import 'reflect-metadata';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Environment } from './config/environment';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { PinoLoggerService } from './observability/pino-logger.service';
import { AppModule } from './app.module';

export async function createApplication() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  app.useLogger(new PinoLoggerService(config.get('LOG_LEVEL', { infer: true })));
  app.use(
    pinoHttp({
      redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      customProps: (request) => ({ correlationId: request.headers['x-correlation-id'] }),
    }),
  );
  app.use(
    helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }),
  );
  app.use(cookieParser());
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: false, limit: '64kb' }));
  app.enableCors({
    origin: config.get('TRUSTED_ORIGINS', { infer: true }),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'authorization',
      'content-type',
      'idempotency-key',
      'x-correlation-id',
      'x-csrf-token',
      'x-client-platform',
      'x-mobile-app-version',
      'x-organization-id',
      'x-scoring-lease-token',
    ],
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Basketball Tournament Platform API')
      .setDescription(
        'Versioned tenant-aware API. Database models are not exposed as unrestricted DTOs.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth(config.get('COOKIE_NAME', { infer: true }))
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' });
  app.enableShutdownHooks();
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApplication();
  const config = app.get<ConfigService<Environment, true>>(ConfigService);
  await app.listen(config.get('PORT', { infer: true }), '0.0.0.0');
}

if (require.main === module) void bootstrap();
