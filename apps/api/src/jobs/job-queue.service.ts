import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { Environment } from '../config/environment';

export const PLATFORM_QUEUE = 'platform-jobs';

@Injectable()
export class JobQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor(config: ConfigService<Environment, true>) {
    this.connection = new Redis(config.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    this.queue = new Queue(PLATFORM_QUEUE, { connection: this.connection });
  }

  async add(outboxEvent: { id: string; eventType: string; payload: object }): Promise<void> {
    await this.queue.add(
      outboxEvent.eventType,
      {
        outboxEventId: outboxEvent.id,
        eventType: outboxEvent.eventType,
        payload: outboxEvent.payload,
      },
      {
        jobId: outboxEvent.id,
        attempts: 8,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: false,
      },
    );
  }

  async counts() {
    return this.queue.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
    this.connection.disconnect();
  }
}
