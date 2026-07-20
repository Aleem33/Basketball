import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { OutboxEvent } from '../../generated/client';
import { PrismaService } from '../database/prisma.service';
import { JobQueueService } from './job-queue.service';

@Injectable()
export class OutboxDispatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxDispatcherService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: JobQueueService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => void this.dispatchBatch(), 1000);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async dispatchBatch(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const claimed = await this.claim(25);
      for (const event of claimed) await this.publish(event);
      return claimed.length;
    } finally {
      this.running = false;
    }
  }

  private async claim(limit: number): Promise<OutboxEvent[]> {
    return this.prisma.$transaction(async (transaction) => {
      const events = await transaction.$queryRaw<OutboxEvent[]>`
        SELECT * FROM "OutboxEvent"
        WHERE "status" IN ('PENDING', 'FAILED')
          AND "availableAt" <= NOW()
          AND ("lockedAt" IS NULL OR "lockedAt" < NOW() - INTERVAL '5 minutes')
        ORDER BY "createdAt"
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      `;
      if (events.length > 0) {
        await transaction.outboxEvent.updateMany({
          where: { id: { in: events.map((event) => event.id) } },
          data: { status: 'PROCESSING', lockedAt: new Date(), attemptCount: { increment: 1 } },
        });
      }
      return events;
    });
  }

  private async publish(event: OutboxEvent): Promise<void> {
    try {
      await this.queue.add({
        id: event.id,
        eventType: event.eventType,
        payload: event.payload as object,
      });
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: 'PUBLISHED', publishedAt: new Date(), lockedAt: null, lastError: null },
      });
    } catch (error) {
      const delay = Math.min(300_000, 2 ** Math.min(event.attemptCount, 8) * 1000);
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: 'FAILED',
          lockedAt: null,
          lastError: error instanceof Error ? error.message.slice(0, 500) : 'Queue publish failed',
          availableAt: new Date(Date.now() + delay),
        },
      });
      this.logger.warn({ message: 'Outbox publish failed; event retained', eventId: event.id });
    }
  }
}
