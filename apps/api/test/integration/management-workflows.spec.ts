import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { ManagementService } from '../../src/management/management.service';
import { createOrganization, createUser, prisma, prismaService } from './helpers';

describe('team application and correction workflows', () => {
  const service = new ManagementService(prismaService);

  afterAll(async () => prisma.$disconnect());

  it('approves a team application, scopes the correction, and records both decisions', async () => {
    const organization = await createOrganization();
    const [teamManager, organizer] = await Promise.all([
      createUser('team-manager'),
      createUser('organizer'),
    ]);
    const team = await prisma.team.create({
      data: { organizationId: organization.id, name: `Applicant ${randomUUID()}` },
    });
    const tournament = await prisma.tournament.create({
      data: {
        organizationId: organization.id,
        name: `Registration tournament ${randomUUID()}`,
        slug: `registration-${randomUUID()}`,
        status: 'REGISTRATION',
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 172_800_000),
      },
    });

    const application = await service.submitTeamApplication(
      organization.id,
      tournament.id,
      team.id,
      teamManager.id,
      { message: 'Please review our team.' },
    );
    await service.decideTeamApplication(
      organization.id,
      tournament.id,
      application.id,
      organizer.id,
      randomUUID(),
      { decision: 'APPROVED', reason: 'Eligibility verified.' },
    );

    expect(
      await prisma.tournamentTeam.count({
        where: { tournamentId: tournament.id, teamId: team.id, approvedAt: { not: null } },
      }),
    ).toBe(1);

    const correction = await service.createCorrectionRequest(
      organization.id,
      tournament.id,
      team.id,
      teamManager.id,
      {
        resourceType: 'TEAM',
        resourceId: team.id,
        description: 'Update the public short name.',
        proposedChanges: { shortName: 'APPL' },
      },
    );
    const resolved = await service.resolveCorrectionRequest(
      organization.id,
      tournament.id,
      correction.id,
      organizer.id,
      randomUUID(),
      { decision: 'APPROVED', resolution: 'Approved for the team manager to apply.' },
    );

    expect(resolved.status).toBe('APPROVED');
    expect(
      await prisma.auditLog.count({
        where: {
          organizationId: organization.id,
          action: { in: ['team-application.decided', 'correction-request.decided'] },
        },
      }),
    ).toBe(2);
  });

  it('does not expose applications through a different organization scope', async () => {
    const [first, second] = await Promise.all([createOrganization(), createOrganization()]);
    const user = await createUser('tenant-application');
    const team = await prisma.team.create({
      data: { organizationId: first.id, name: `Scoped team ${randomUUID()}` },
    });
    const tournament = await prisma.tournament.create({
      data: {
        organizationId: first.id,
        name: `Scoped tournament ${randomUUID()}`,
        slug: `scoped-${randomUUID()}`,
        status: 'REGISTRATION',
        startsAt: new Date(Date.now() + 86_400_000),
        endsAt: new Date(Date.now() + 172_800_000),
      },
    });
    await service.submitTeamApplication(first.id, tournament.id, team.id, user.id, {});

    expect((await service.teamApplications(second.id, tournament.id)).items).toHaveLength(0);
  });
});
