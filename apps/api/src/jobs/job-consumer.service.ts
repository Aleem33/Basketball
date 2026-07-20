import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import type { Environment } from '../config/environment';
import { JobHandlerService } from './job-handler.service';
import { PLATFORM_QUEUE } from './job-queue.service';

type JobEnvelope = { outboxEventId: string; eventType: string; payload: Record<string, unknown> };

@Injectable()
export class JobConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobConsumerService.name);
  private readonly connection: Redis;
  private worker?: Worker<JobEnvelope>;

  constructor(
    config: ConfigService<Environment, true>,
    private readonly handler: JobHandlerService,
  ) {
    this.connection = new Redis(config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<JobEnvelope>(
      PLATFORM_QUEUE,
      async (job: Job<JobEnvelope>) => this.handler.handle(job.data),
      { connection: this.connection, concurrency: 8 },
    );
    this.worker.on('failed', (job, error) => {
      this.logger.error({
        message: 'Background job failed',
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
      });
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    this.connection.disconnect();
  }
}
