import { Controller, Get, Header, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import { JobQueueService } from '../jobs/job-queue.service';
import { RedisService } from '../redis/redis.service';
import { StorageService } from '../storage/storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../authorization/super-admin.guard';

@ApiTags('operations')
@Controller()
export class HealthController {
  constructor(
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: StorageService,
    private readonly queue: JobQueueService,
  ) {}

  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    const [database, redis, storage] = await Promise.all([
      this.prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      this.redis.ping(),
      this.storage.health(),
    ]);
    const checks = { database, redis, storage };
    if (!database || !storage) {
      throw new ServiceUnavailableException({
        code: 'NOT_READY',
        message: 'Required services are unavailable',
        checks,
      });
    }
    return { status: redis ? 'ready' : 'degraded', checks };
  }

  @Get('version')
  version() {
    return {
      apiVersion: 'v1',
      buildVersion: this.config.get('APP_VERSION', { infer: true }),
      minimumMobileVersion: this.config.get('MOBILE_MINIMUM_VERSION', { infer: true }),
      maintenance: this.config.get('MAINTENANCE_MODE', { infer: true }),
    };
  }

  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4')
  async metrics(): Promise<string> {
    const [outboxPending, jobsFailed, liveGames] = await Promise.all([
      this.prisma.outboxEvent.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
      this.prisma.backgroundJobRecord.count({
        where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
      }),
      this.prisma.game.count({ where: { status: { in: ['LIVE', 'PAUSED'] }, deletedAt: null } }),
    ]);
    return [
      '# HELP tournament_outbox_pending Pending or retryable outbox records.',
      '# TYPE tournament_outbox_pending gauge',
      `tournament_outbox_pending ${outboxPending}`,
      '# HELP tournament_jobs_failed Failed background job records.',
      '# TYPE tournament_jobs_failed gauge',
      `tournament_jobs_failed ${jobsFailed}`,
      '# HELP tournament_live_games Games currently live or paused.',
      '# TYPE tournament_live_games gauge',
      `tournament_live_games ${liveGames}`,
      '',
    ].join('\n');
  }

  @Get('operations/queues')
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async queueHealth() {
    const [counts, failed] = await Promise.all([
      this.queue.counts(),
      this.prisma.backgroundJobRecord.findMany({
        where: { status: { in: ['FAILED', 'DEAD_LETTER'] } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          jobKey: true,
          jobType: true,
          status: true,
          attemptCount: true,
          lastError: true,
          updatedAt: true,
        },
      }),
    ]);
    return { counts, failed };
  }
}
