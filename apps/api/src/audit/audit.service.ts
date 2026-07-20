import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type AuditInput = {
  organizationId?: string;
  actorUserId?: string;
  correlationId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  changes?: object;
  metadata?: object;
  ipAddress?: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        correlationId: input.correlationId,
        action: input.action,
        resourceType: input.resourceType,
        outcome: input.outcome,
        metadata: input.metadata ?? {},
        ...(input.organizationId ? { organizationId: input.organizationId } : {}),
        ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
        ...(input.resourceId ? { resourceId: input.resourceId } : {}),
        ...(input.changes ? { changes: input.changes } : {}),
        ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
      },
    });
  }
}
