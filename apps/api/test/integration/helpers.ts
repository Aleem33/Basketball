import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../generated/client';
import type { PrismaService } from '../../src/database/prisma.service';

export const prisma = new PrismaClient();
export const prismaService = prisma as unknown as PrismaService;

export async function createUser(emailPrefix: string) {
  return prisma.user.create({
    data: {
      email: `${emailPrefix}-${randomUUID()}@example.invalid`,
      passwordHash: 'test-fixture-not-a-login-secret',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      profile: { create: { displayName: 'Test fixture user' } },
    },
  });
}

export async function createOrganization() {
  return prisma.organization.create({
    data: { name: `Test organization ${randomUUID()}`, slug: `test-${randomUUID()}` },
  });
}
