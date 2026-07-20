import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { RequestActor } from '../common/request-context';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async access(actor: RequestActor) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId: actor.userId, status: 'ACTIVE', organization: { archivedAt: null } },
      include: {
        organization: { select: { id: true, name: true } },
        roles: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
      orderBy: { organization: { name: 'asc' } },
    });
    if (actor.platformSuperAdmin) {
      const organizations = await this.prisma.organization.findMany({
        where: { archivedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
      const allPermissions = await this.prisma.permission.findMany({ select: { key: true } });
      return {
        platformSuperAdmin: true,
        memberships: organizations.map((organization) => ({
          organization,
          roles: [
            {
              key: 'platform-super-admin',
              permissions: allPermissions.map((permission) => permission.key),
            },
          ],
        })),
      };
    }
    return {
      platformSuperAdmin: false,
      memberships: memberships.map((membership) => ({
        organization: membership.organization,
        roles: membership.roles.map((assignment) => ({
          key: assignment.role.key,
          permissions: assignment.role.permissions.map((item) => item.permission.key),
          scope: {
            tournamentId: assignment.tournamentId,
            teamId: assignment.teamId,
            gameId: assignment.gameId,
          },
        })),
      })),
    };
  }

  async tournaments(actor: RequestActor, organizationId: string) {
    const scope = await this.scope(actor, organizationId);
    const items = await this.prisma.tournament.findMany({
      where: {
        organizationId,
        archivedAt: null,
        ...(scope.all ? {} : { id: { in: scope.tournamentIds } }),
      },
      orderBy: { startsAt: 'desc' },
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        published: true,
        startsAt: true,
        endsAt: true,
        version: true,
      },
    });
    return { items };
  }

  async teams(actor: RequestActor, organizationId: string) {
    const scope = await this.scope(actor, organizationId);
    const teamIds = new Set(scope.teamIds);
    const direct = await this.prisma.teamMembership.findMany({
      where: {
        organizationId,
        userId: actor.userId,
        active: true,
        OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
      },
      select: { teamId: true },
    });
    direct.forEach((row) => teamIds.add(row.teamId));
    const items = await this.prisma.team.findMany({
      where: {
        organizationId,
        archivedAt: null,
        ...(scope.all ? {} : { id: { in: [...teamIds] } }),
      },
      orderBy: { name: 'asc' },
      take: 200,
      select: {
        id: true,
        name: true,
        shortName: true,
        published: true,
        _count: {
          select: {
            players: { where: { archivedAt: null } },
            rosters: { where: { archivedAt: null } },
          },
        },
      },
    });
    return {
      items: items.map((team) => ({
        ...team,
        playerCount: team._count.players,
        rosterCount: team._count.rosters,
        _count: undefined,
      })),
    };
  }

  async teamWorkspace(organizationId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId, archivedAt: null },
      select: {
        id: true,
        name: true,
        shortName: true,
        description: true,
        version: true,
        players: {
          where: { archivedAt: null },
          orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
          select: {
            id: true,
            givenName: true,
            familyName: true,
            position: true,
            defaultJersey: true,
            publicVisibility: true,
            version: true,
          },
        },
        rosters: {
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            visibility: true,
            version: true,
            tournament: { select: { id: true, name: true } },
            players: { select: { id: true, playerId: true, jerseyNumber: true, captain: true } },
          },
        },
        tournaments: {
          select: {
            tournament: {
              select: { id: true, name: true, status: true, startsAt: true, endsAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!team)
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team was not found' });
    return { ...team, tournaments: team.tournaments.map((item) => item.tournament) };
  }

  async games(actor: RequestActor, organizationId: string, status?: string) {
    const scope = await this.scope(actor, organizationId);
    const assignedGameIds = await this.prisma.gameAssignment.findMany({
      where: { organizationId, userId: actor.userId, active: true },
      select: { gameId: true },
    });
    const items = await this.prisma.game.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(status ? { status: status as never } : {}),
        ...(scope.all
          ? {}
          : {
              OR: [
                { tournamentId: { in: scope.tournamentIds } },
                { homeTeamId: { in: scope.teamIds } },
                { awayTeamId: { in: scope.teamIds } },
                { id: { in: [...scope.gameIds, ...assignedGameIds.map((row) => row.gameId)] } },
              ],
            }),
      },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        version: true,
        homeScore: true,
        awayScore: true,
        currentPeriod: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        venue: { select: { id: true, name: true } },
      },
    });
    return { items };
  }

  async submittedRosters(actor: RequestActor, organizationId: string) {
    const scope = await this.scope(actor, organizationId);
    const items = await this.prisma.roster.findMany({
      where: {
        organizationId,
        status: 'SUBMITTED',
        archivedAt: null,
        ...(scope.all ? {} : { tournamentId: { in: scope.tournamentIds } }),
      },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      select: {
        id: true,
        version: true,
        team: { select: { name: true } },
        tournament: { select: { name: true } },
        players: { select: { id: true } },
      },
    });
    return { items };
  }

  async scoringGames(actor: RequestActor, organizationId: string) {
    const items = await this.prisma.game.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: ['SCHEDULED', 'LIVE', 'PAUSED'] },
        assignments: { some: { userId: actor.userId, type: 'SCOREKEEPER', active: true } },
        homeTeamId: { not: null },
        awayTeamId: { not: null },
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        currentPeriod: true,
        version: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        scoreEvents: {
          where: { correctionOfEventId: null, pointsDelta: { gt: 0 } },
          orderBy: { sequence: 'desc' },
          take: 10,
          select: {
            id: true,
            teamId: true,
            type: true,
            pointsDelta: true,
            period: true,
            sequence: true,
            occurredAt: true,
          },
        },
      },
    });
    return { items };
  }

  audit(organizationId: string, search?: string) {
    return this.prisma.auditLog
      .findMany({
        where: {
          organizationId,
          ...(search
            ? {
                OR: [
                  { action: { contains: search, mode: 'insensitive' as const } },
                  { resourceType: { contains: search, mode: 'insensitive' as const } },
                  ...(this.looksLikeUuid(search) ? [{ correlationId: search }] : []),
                ],
              }
            : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          createdAt: true,
          action: true,
          outcome: true,
          resourceType: true,
          correlationId: true,
          actor: { select: { email: true } },
        },
      })
      .then((items) => ({ items }));
  }

  private async scope(actor: RequestActor, organizationId: string) {
    if (actor.platformSuperAdmin) return { all: true, tournamentIds: [], teamIds: [], gameIds: [] };
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: actor.userId } },
      include: { roles: { include: { role: true } } },
    });
    if (membership?.status !== 'ACTIVE')
      return { all: false, tournamentIds: [], teamIds: [], gameIds: [] };
    const organizationWide = membership.roles.some((assignment) =>
      ['ORGANIZATION', 'PLATFORM'].includes(assignment.role.scopeType),
    );
    const teamIds = membership.roles.flatMap((assignment) =>
      assignment.teamId ? [assignment.teamId] : [],
    );
    const tournamentIds = new Set(
      membership.roles.flatMap((assignment) =>
        assignment.tournamentId ? [assignment.tournamentId] : [],
      ),
    );
    if (teamIds.length > 0) {
      const registrations = await this.prisma.tournamentTeam.findMany({
        where: { teamId: { in: teamIds }, tournament: { organizationId, archivedAt: null } },
        select: { tournamentId: true },
      });
      for (const registration of registrations) tournamentIds.add(registration.tournamentId);
    }
    return {
      all: organizationWide,
      tournamentIds: [...tournamentIds],
      teamIds,
      gameIds: membership.roles.flatMap((assignment) =>
        assignment.gameId ? [assignment.gameId] : [],
      ),
    };
  }

  private looksLikeUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value,
    );
  }
}
