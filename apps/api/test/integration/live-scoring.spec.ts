import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { LiveScoringService } from '../../src/live-scoring/live-scoring.service';
import type { ScoringLeaseService } from '../../src/live-scoring/scoring-lease.service';
import { createOrganization, createUser, prisma, prismaService } from './helpers';

const leaseBypass = { assertValid: () => Promise.resolve() } as unknown as ScoringLeaseService;

async function gameFixture(status: 'LIVE' | 'FINAL' = 'LIVE') {
  const organization = await createOrganization();
  const user = await createUser('scorekeeper');
  const [home, away] = await Promise.all([
    prisma.team.create({ data: { organizationId: organization.id, name: `Home ${randomUUID()}` } }),
    prisma.team.create({ data: { organizationId: organization.id, name: `Away ${randomUUID()}` } }),
  ]);
  const tournament = await prisma.tournament.create({
    data: {
      organizationId: organization.id,
      name: `Tournament ${randomUUID()}`,
      slug: `t-${randomUUID()}`,
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86_400_000),
    },
  });
  const game = await prisma.game.create({
    data: {
      organizationId: organization.id,
      tournamentId: tournament.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      scheduledAt: new Date(),
      status,
      currentPeriod: 1,
      finalizedAt: status === 'FINAL' ? new Date() : null,
    },
  });
  await prisma.gameAssignment.create({
    data: {
      organizationId: organization.id,
      gameId: game.id,
      userId: user.id,
      type: 'SCOREKEEPER',
    },
  });
  return { organization, user, home, away, game };
}

describe('transactional live scoring', () => {
  const service = new LiveScoringService(prismaService, leaseBypass);
  afterAll(async () => prisma.$disconnect());

  it('deduplicates the same score command', async () => {
    const fixture = await gameFixture();
    const command = {
      scoringSessionId: randomUUID(),
      idempotencyKey: randomUUID(),
      expectedVersion: 0,
      occurredAt: new Date(),
      period: 1,
      teamId: fixture.home.id,
      type: 'ADD_TWO' as const,
    };
    const first = await service.applyScoreCommand(
      fixture.organization.id,
      fixture.game.id,
      fixture.user.id,
      'lease',
      command,
      randomUUID(),
    );
    const duplicate = await service.applyScoreCommand(
      fixture.organization.id,
      fixture.game.id,
      fixture.user.id,
      'lease',
      command,
      randomUUID(),
    );
    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.game.homeScore).toBe(2);
    expect(await prisma.gameScoreEvent.count({ where: { gameId: fixture.game.id } })).toBe(1);
  });

  it('allows only one concurrent command at the same expected version', async () => {
    const fixture = await gameFixture();
    const command = (idempotencyKey: string) => ({
      scoringSessionId: randomUUID(),
      idempotencyKey,
      expectedVersion: 0,
      occurredAt: new Date(),
      period: 1,
      teamId: fixture.home.id,
      type: 'ADD_ONE' as const,
    });
    const results = await Promise.allSettled([
      service.applyScoreCommand(
        fixture.organization.id,
        fixture.game.id,
        fixture.user.id,
        'lease',
        command(randomUUID()),
        randomUUID(),
      ),
      service.applyScoreCommand(
        fixture.organization.id,
        fixture.game.id,
        fixture.user.id,
        'lease',
        command(randomUUID()),
        randomUUID(),
      ),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const game = await prisma.game.findUniqueOrThrow({ where: { id: fixture.game.id } });
    expect(game.homeScore).toBe(1);
    expect(game.version).toBe(1);
  });

  it('rejects stale commands, unauthorized users, and finalized games', async () => {
    const fixture = await gameFixture();
    const outsider = await createUser('outsider');
    const base = {
      scoringSessionId: randomUUID(),
      idempotencyKey: randomUUID(),
      occurredAt: new Date(),
      period: 1,
      teamId: fixture.home.id,
      type: 'ADD_ONE' as const,
    };
    await expect(
      service.applyScoreCommand(
        fixture.organization.id,
        fixture.game.id,
        fixture.user.id,
        'lease',
        { ...base, expectedVersion: 4 },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'STALE_GAME_VERSION' }) });
    await expect(
      service.applyScoreCommand(
        fixture.organization.id,
        fixture.game.id,
        outsider.id,
        'lease',
        { ...base, idempotencyKey: randomUUID(), expectedVersion: 0 },
        randomUUID(),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NOT_ASSIGNED_SCOREKEEPER' }),
    });
    const finalFixture = await gameFixture('FINAL');
    await expect(
      service.applyScoreCommand(
        finalFixture.organization.id,
        finalFixture.game.id,
        finalFixture.user.id,
        'lease',
        { ...base, idempotencyKey: randomUUID(), teamId: finalFixture.home.id, expectedVersion: 0 },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'GAME_NOT_LIVE' }) });
  });

  it('rolls back a correction that would make a total negative', async () => {
    const fixture = await gameFixture();
    const score = await service.applyScoreCommand(
      fixture.organization.id,
      fixture.game.id,
      fixture.user.id,
      'lease',
      {
        scoringSessionId: randomUUID(),
        idempotencyKey: randomUUID(),
        expectedVersion: 0,
        occurredAt: new Date(),
        period: 1,
        teamId: fixture.home.id,
        type: 'ADD_THREE',
      },
      randomUUID(),
    );
    await prisma.game.update({ where: { id: fixture.game.id }, data: { homeScore: 1 } });
    await expect(
      service.applyScoreCommand(
        fixture.organization.id,
        fixture.game.id,
        fixture.user.id,
        'lease',
        {
          scoringSessionId: randomUUID(),
          idempotencyKey: randomUUID(),
          expectedVersion: 1,
          occurredAt: new Date(),
          period: 1,
          type: 'CORRECTION',
          correctionOfEventId: score.eventId,
          correctionReason: 'Incorrect three point event',
        },
        randomUUID(),
      ),
    ).rejects.toThrow('negative score');
    expect(await prisma.gameScoreEvent.count({ where: { gameId: fixture.game.id } })).toBe(1);
    expect((await prisma.game.findUniqueOrThrow({ where: { id: fixture.game.id } })).version).toBe(
      1,
    );
  });
});
