import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './jobs/worker.module';

async function bootstrap(): Promise<void> {
  await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  new Logger('Worker').log('Background worker started');
}

void bootstrap();
