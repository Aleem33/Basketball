import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    if (process.env.OPENAPI_GENERATION === 'true') return;
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    if (process.env.OPENAPI_GENERATION === 'true') return;
    await this.$disconnect();
  }
}
