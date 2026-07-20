import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { Environment } from '../config/environment';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(config: ConfigService<Environment, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 1500,
      retryStrategy: () => null,
    });
    this.client.on('error', (error) =>
      this.logger.warn({ message: 'Redis degraded', error: error.message }),
    );
  }

  async connect(): Promise<boolean> {
    if (this.client.status === 'ready') return true;
    try {
      await this.client.connect();
      return true;
    } catch {
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      if (!(await this.connect())) return false;
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async publish(channel: string, payload: string): Promise<boolean> {
    try {
      if (!(await this.connect())) return false;
      await this.client.publish(channel, payload);
      return true;
    } catch {
      return false;
    }
  }

  async setIfAbsent(key: string, value: string, ttlMilliseconds: number): Promise<boolean> {
    try {
      if (!(await this.connect())) return false;
      return (await this.client.set(key, value, 'PX', ttlMilliseconds, 'NX')) === 'OK';
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (await this.connect()) await this.client.del(key);
    } catch {
      // PostgreSQL is authoritative; Redis cleanup is best effort.
    }
  }

  rawClient(): Redis {
    return this.client;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready') await this.client.quit();
    else this.client.disconnect();
  }
}
