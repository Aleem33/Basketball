import { afterAll, describe, expect, it } from 'vitest';
import { AccessService } from '../../src/access/access.service';
import { createOrganization, createUser, prisma, prismaService } from './helpers';

describe('tenant isolation', () => {
  afterAll(async () => prisma.$disconnect());

  it('does not return another organization teams to a scoped member', async () => {
    const [organizationA, organizationB, user] = await Promise.all([
      createOrganization(),
      createOrganization(),
      createUser('tenant-user'),
    ]);
    await prisma.organizationMembership.create({
      data: {
        organizationId: organizationA.id,
        userId: user.id,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });
    const [teamA, teamB] = await Promise.all([
      prisma.team.create({
        data: { organizationId: organizationA.id, name: `Team A ${organizationA.id}` },
      }),
      prisma.team.create({
        data: { organizationId: organizationB.id, name: `Team B ${organizationB.id}` },
      }),
    ]);
    await prisma.teamMembership.create({
      data: { organizationId: organizationA.id, teamId: teamA.id, userId: user.id, role: 'COACH' },
    });
    const service = new AccessService(prismaService);
    const resultA = await service.teams(
      { userId: user.id, sessionId: crypto.randomUUID(), platformSuperAdmin: false },
      organizationA.id,
    );
    const resultB = await service.teams(
      { userId: user.id, sessionId: crypto.randomUUID(), platformSuperAdmin: false },
      organizationB.id,
    );
    expect(resultA.items.map((team) => team.id)).toEqual([teamA.id]);
    expect(resultB.items.map((team) => team.id)).not.toContain(teamB.id);
  });
});
