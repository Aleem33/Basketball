import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../../generated/client';

@Injectable()
export class ManagementService {
  constructor(private readonly prisma: PrismaService) {}

  createOrganization(input: { name: string; slug: string }) {
    return this.prisma.organization.create({ data: input });
  }

  createLeague(
    organizationId: string,
    input: { name: string; slug: string; description?: string },
  ) {
    return this.prisma.league.create({ data: { organizationId, ...input } });
  }

  async createSeason(
    organizationId: string,
    input: { leagueId: string; name: string; startsAt: Date; endsAt: Date },
  ) {
    await this.requireLeague(organizationId, input.leagueId);
    return this.prisma.season.create({ data: { organizationId, ...input } });
  }

  async createTournament(
    organizationId: string,
    input: {
      leagueId?: string;
      seasonId?: string;
      name: string;
      slug: string;
      description?: string;
      startsAt: Date;
      endsAt: Date;
      timezone: string;
    },
  ) {
    if (input.leagueId) await this.requireLeague(organizationId, input.leagueId);
    if (input.seasonId) {
      const season = await this.prisma.season.findFirst({
        where: { id: input.seasonId, organizationId, archivedAt: null },
      });
      if (!season) throw this.notFound('Season');
    }
    return this.prisma.tournament.create({ data: { organizationId, ...input } });
  }

  async updateTournament(
    organizationId: string,
    tournamentId: string,
    input: {
      name?: string;
      description?: string | null;
      startsAt?: Date;
      endsAt?: Date;
      timezone?: string;
      status?: 'DRAFT' | 'REGISTRATION' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
      published?: boolean;
      expectedVersion: number;
    },
  ) {
    const { expectedVersion, ...changes } = input;
    const result = await this.prisma.tournament.updateMany({
      where: { id: tournamentId, organizationId, archivedAt: null, version: expectedVersion },
      data: { ...changes, version: { increment: 1 } },
    });
    if (result.count !== 1) throw this.conflict();
    return this.prisma.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
  }

  createDivision(
    organizationId: string,
    tournamentId: string,
    input: { name: string; sortOrder: number },
  ) {
    return this.prisma.division.create({ data: { organizationId, tournamentId, ...input } });
  }

  createStage(
    organizationId: string,
    divisionId: string,
    input: {
      name: string;
      format:
        | 'MANUAL'
        | 'SINGLE_ROUND_ROBIN'
        | 'DOUBLE_ROUND_ROBIN'
        | 'SINGLE_ELIMINATION'
        | 'GROUPS_THEN_KNOCKOUT';
      sequence: number;
      rules: {
        regulationPeriods: number;
        periodDurationSeconds: number;
        overtimeDurationSeconds: number;
        allowDraws: boolean;
        winPoints: number;
        lossPoints: number;
        drawPoints: number;
        forfeitWinPoints: number;
        forfeitScoreFor: number;
        forfeitScoreAgainst: number;
        tieBreakers: string[];
        advancementRules: Record<string, unknown>;
      };
    },
  ) {
    const { rules, ...stage } = input;
    return this.prisma.competitionStage.create({
      data: {
        organizationId,
        divisionId,
        ...stage,
        ruleSet: {
          create: {
            organizationId,
            ...rules,
            advancementRules: rules.advancementRules as Prisma.InputJsonValue,
          },
        },
      },
      include: { ruleSet: true },
    });
  }

  createVenue(
    organizationId: string,
    input: {
      name: string;
      addressLine1: string;
      addressLine2?: string;
      city: string;
      region?: string;
      postalCode?: string;
      countryCode: string;
    },
  ) {
    return this.prisma.venue.create({ data: { organizationId, ...input } });
  }

  async createCourt(organizationId: string, venueId: string, input: { name: string }) {
    const venue = await this.prisma.venue.findFirst({
      where: { id: venueId, organizationId, archivedAt: null },
    });
    if (!venue) throw this.notFound('Venue');
    return this.prisma.court.create({ data: { organizationId, venueId, ...input } });
  }

  createTeam(
    organizationId: string,
    input: { name: string; shortName?: string; description?: string },
  ) {
    return this.prisma.team.create({ data: { organizationId, ...input } });
  }

  async updateTeam(
    organizationId: string,
    teamId: string,
    input: {
      name?: string;
      shortName?: string | null;
      description?: string | null;
      published?: boolean;
      expectedVersion: number;
    },
  ) {
    const { expectedVersion, ...changes } = input;
    const result = await this.prisma.team.updateMany({
      where: { id: teamId, organizationId, archivedAt: null, version: expectedVersion },
      data: { ...changes, version: { increment: 1 } },
    });
    if (result.count !== 1) throw this.conflict();
    return this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
  }

  createPlayer(
    organizationId: string,
    teamId: string,
    input: {
      givenName: string;
      familyName: string;
      dateOfBirth?: Date;
      position?:
        'POINT_GUARD' | 'SHOOTING_GUARD' | 'SMALL_FORWARD' | 'POWER_FORWARD' | 'CENTER' | 'UTILITY';
      defaultJersey?: number;
      publicVisibility: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
    },
  ) {
    return this.prisma.player.create({ data: { organizationId, teamId, ...input } });
  }

  async updatePlayer(
    organizationId: string,
    teamId: string,
    playerId: string,
    input: {
      givenName?: string;
      familyName?: string;
      dateOfBirth?: Date;
      position?:
        'POINT_GUARD' | 'SHOOTING_GUARD' | 'SMALL_FORWARD' | 'POWER_FORWARD' | 'CENTER' | 'UTILITY';
      defaultJersey?: number;
      publicVisibility?: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
      expectedVersion: number;
    },
  ) {
    const { expectedVersion, ...changes } = input;
    const result = await this.prisma.player.updateMany({
      where: { id: playerId, organizationId, teamId, archivedAt: null, version: expectedVersion },
      data: { ...changes, version: { increment: 1 } },
    });
    if (result.count !== 1) throw this.conflict();
    return this.prisma.player.findUniqueOrThrow({ where: { id: playerId } });
  }

  async archivePlayer(organizationId: string, teamId: string, playerId: string): Promise<void> {
    const player = await this.prisma.player.updateMany({
      where: { id: playerId, organizationId, teamId, archivedAt: null },
      data: { archivedAt: new Date(), version: { increment: 1 } },
    });
    if (player.count !== 1) throw this.notFound('Player');
  }

  async createRoster(
    organizationId: string,
    teamId: string,
    input: {
      tournamentId: string;
      seasonId?: string;
      visibility: 'PRIVATE' | 'MEMBERS' | 'PUBLIC';
    },
  ) {
    const registered = await this.prisma.tournamentTeam.findUnique({
      where: { tournamentId_teamId: { tournamentId: input.tournamentId, teamId } },
    });
    if (!registered)
      throw new ConflictException({
        code: 'TEAM_NOT_REGISTERED',
        message: 'Team is not approved for this tournament',
      });
    return this.prisma.roster.create({ data: { organizationId, teamId, ...input } });
  }

  async upsertRosterPlayer(
    organizationId: string,
    teamId: string,
    rosterId: string,
    input: {
      playerId: string;
      jerseyNumber: number;
      position?:
        'POINT_GUARD' | 'SHOOTING_GUARD' | 'SMALL_FORWARD' | 'POWER_FORWARD' | 'CENTER' | 'UTILITY';
      captain: boolean;
    },
  ) {
    const roster = await this.prisma.roster.findFirst({
      where: {
        id: rosterId,
        organizationId,
        teamId,
        status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
        archivedAt: null,
      },
    });
    const player = await this.prisma.player.findFirst({
      where: { id: input.playerId, organizationId, teamId, archivedAt: null },
    });
    if (!roster || !player) throw this.notFound('Roster or player');
    return this.prisma.rosterPlayer.upsert({
      where: { rosterId_playerId: { rosterId, playerId: input.playerId } },
      update: {
        jerseyNumber: input.jerseyNumber,
        position: input.position,
        captain: input.captain,
      },
      create: { rosterId, ...input },
    });
  }

  async submitRoster(
    organizationId: string,
    teamId: string,
    rosterId: string,
    submittedById: string,
    input: { message?: string; expectedVersion: number },
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.roster.updateMany({
        where: {
          id: rosterId,
          organizationId,
          teamId,
          archivedAt: null,
          version: input.expectedVersion,
          status: { in: ['DRAFT', 'CHANGES_REQUESTED'] },
          players: { some: {} },
        },
        data: { status: 'SUBMITTED', version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.conflict();
      return transaction.rosterSubmission.create({
        data: {
          organizationId,
          rosterId,
          submittedById,
          ...(input.message ? { message: input.message } : {}),
        },
      });
    });
  }

  async decideRoster(
    organizationId: string,
    rosterId: string,
    decidedById: string,
    input: {
      decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
      message: string;
      expectedVersion: number;
    },
  ) {
    const status =
      input.decision === 'APPROVED'
        ? 'APPROVED'
        : input.decision === 'REJECTED'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.roster.updateMany({
        where: {
          id: rosterId,
          organizationId,
          status: 'SUBMITTED',
          version: input.expectedVersion,
          archivedAt: null,
        },
        data: { status, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw this.conflict();
      const latest = await transaction.rosterSubmission.findFirst({
        where: { rosterId, decision: 'SUBMITTED' },
        orderBy: { submittedAt: 'desc' },
      });
      if (!latest) throw this.notFound('Roster submission');
      const submission = await transaction.rosterSubmission.update({
        where: { id: latest.id },
        data: {
          decision: input.decision,
          message: input.message,
          decidedById,
          decidedAt: new Date(),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          organizationId,
          aggregateType: 'Roster',
          aggregateId: rosterId,
          eventType:
            input.decision === 'APPROVED' ? 'roster.approved' : 'roster.corrections-requested',
          payload: { rosterId, submissionId: submission.id, decision: input.decision },
        },
      });
      return submission;
    });
  }

  async submitTeamApplication(
    organizationId: string,
    tournamentId: string,
    teamId: string,
    submittedById: string,
    input: { message?: string },
  ) {
    const [tournament, team, registration] = await Promise.all([
      this.prisma.tournament.findFirst({
        where: { id: tournamentId, organizationId, archivedAt: null },
      }),
      this.prisma.team.findFirst({ where: { id: teamId, organizationId, archivedAt: null } }),
      this.prisma.tournamentTeam.findUnique({
        where: { tournamentId_teamId: { tournamentId, teamId } },
      }),
    ]);
    if (!tournament || !team) throw this.notFound('Tournament or team');
    if (tournament.status !== 'REGISTRATION') {
      throw new ConflictException({
        code: 'REGISTRATION_CLOSED',
        message: 'Tournament registration is not open',
      });
    }
    if (registration)
      throw new ConflictException({
        code: 'TEAM_ALREADY_REGISTERED',
        message: 'Team is already registered',
      });
    return this.prisma.teamApplication.upsert({
      where: { tournamentId_teamId: { tournamentId, teamId } },
      create: {
        organizationId,
        tournamentId,
        teamId,
        submittedById,
        ...(input.message ? { message: input.message } : {}),
      },
      update: {
        submittedById,
        status: 'OPEN',
        message: input.message ?? null,
        decisionReason: null,
        decidedById: null,
        decidedAt: null,
        submittedAt: new Date(),
      },
      include: { team: true, tournament: true },
    });
  }

  async teamApplications(organizationId: string, tournamentId: string) {
    const items = await this.prisma.teamApplication.findMany({
      where: { organizationId, tournamentId },
      include: {
        team: { select: { id: true, name: true, shortName: true } },
        submittedBy: {
          select: { id: true, email: true, profile: { select: { displayName: true } } },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });
    return { items };
  }

  async decideTeamApplication(
    organizationId: string,
    tournamentId: string,
    applicationId: string,
    decidedById: string,
    correlationId: string,
    input: { decision: 'APPROVED' | 'REJECTED'; reason: string },
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const application = await transaction.teamApplication.findFirst({
        where: {
          id: applicationId,
          organizationId,
          tournamentId,
          status: { in: ['OPEN', 'IN_REVIEW'] },
        },
      });
      if (!application) throw this.notFound('Open team application');
      const decided = await transaction.teamApplication.update({
        where: { id: application.id },
        data: {
          status: input.decision,
          decisionReason: input.reason,
          decidedById,
          decidedAt: new Date(),
        },
      });
      if (input.decision === 'APPROVED') {
        await transaction.tournamentTeam.upsert({
          where: { tournamentId_teamId: { tournamentId, teamId: application.teamId } },
          create: { tournamentId, teamId: application.teamId, approvedAt: new Date() },
          update: { approvedAt: new Date() },
        });
      }
      await transaction.auditLog.create({
        data: {
          organizationId,
          actorUserId: decidedById,
          correlationId,
          action: 'team-application.decided',
          resourceType: 'TeamApplication',
          resourceId: application.id,
          outcome: 'SUCCESS',
          changes: { status: input.decision, reason: input.reason },
        },
      });
      return decided;
    });
  }

  async createCorrectionRequest(
    organizationId: string,
    tournamentId: string,
    teamId: string,
    requestedById: string,
    input: {
      resourceType: 'TEAM' | 'PLAYER' | 'ROSTER' | 'GAME';
      resourceId: string;
      description: string;
      proposedChanges?: Record<string, unknown>;
    },
  ) {
    await this.validateCorrectionResource(
      organizationId,
      tournamentId,
      teamId,
      input.resourceType,
      input.resourceId,
    );
    return this.prisma.correctionRequest.create({
      data: {
        organizationId,
        requestedById,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        description: input.description,
        ...(input.proposedChanges
          ? { proposedChanges: input.proposedChanges as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async correctionRequests(organizationId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.count({
      where: { id: tournamentId, organizationId, archivedAt: null },
    });
    if (tournament !== 1) throw this.notFound('Tournament');
    const [registrations, games, rosters] = await Promise.all([
      this.prisma.tournamentTeam.findMany({ where: { tournamentId }, select: { teamId: true } }),
      this.prisma.game.findMany({
        where: { organizationId, tournamentId, deletedAt: null },
        select: { id: true },
      }),
      this.prisma.roster.findMany({
        where: { organizationId, tournamentId, archivedAt: null },
        select: { id: true },
      }),
    ]);
    const teamIds = registrations.map((registration) => registration.teamId);
    const players = await this.prisma.player.findMany({
      where: { organizationId, teamId: { in: teamIds }, archivedAt: null },
      select: { id: true },
    });
    const items = await this.prisma.correctionRequest.findMany({
      where: {
        organizationId,
        OR: [
          { resourceType: 'TEAM', resourceId: { in: teamIds } },
          { resourceType: 'PLAYER', resourceId: { in: players.map((player) => player.id) } },
          { resourceType: 'ROSTER', resourceId: { in: rosters.map((roster) => roster.id) } },
          { resourceType: 'GAME', resourceId: { in: games.map((game) => game.id) } },
        ],
      },
      include: {
        requestedBy: {
          select: { id: true, email: true, profile: { select: { displayName: true } } },
        },
        resolvedBy: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { items };
  }

  async resolveCorrectionRequest(
    organizationId: string,
    tournamentId: string,
    correctionId: string,
    resolvedById: string,
    correlationId: string,
    input: { decision: 'APPROVED' | 'REJECTED'; resolution: string },
  ) {
    const scoped = await this.correctionRequests(organizationId, tournamentId);
    if (
      !scoped.items.some(
        (item) => item.id === correctionId && ['OPEN', 'IN_REVIEW'].includes(item.status),
      )
    ) {
      throw this.notFound('Open correction request');
    }
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.correctionRequest.updateMany({
        where: { id: correctionId, organizationId, status: { in: ['OPEN', 'IN_REVIEW'] } },
        data: {
          status: input.decision,
          resolution: input.resolution,
          resolvedById,
          resolvedAt: new Date(),
        },
      });
      if (result.count !== 1) throw this.conflict();
      await transaction.auditLog.create({
        data: {
          organizationId,
          actorUserId: resolvedById,
          correlationId,
          action: 'correction-request.decided',
          resourceType: 'CorrectionRequest',
          resourceId: correctionId,
          outcome: 'SUCCESS',
          changes: { status: input.decision, resolution: input.resolution },
        },
      });
      return transaction.correctionRequest.findUniqueOrThrow({ where: { id: correctionId } });
    });
  }

  async exportCsv(
    organizationId: string,
    resource: 'teams' | 'games' | 'rosters' | 'audit',
  ): Promise<string> {
    if (resource === 'teams') {
      const rows = await this.prisma.team.findMany({
        where: { organizationId, archivedAt: null },
        select: { id: true, name: true, shortName: true, published: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      return csv(['id', 'name', 'shortName', 'published', 'createdAt'], rows);
    }
    if (resource === 'games') {
      const rows = await this.prisma.game.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          tournamentId: true,
          homeTeamId: true,
          awayTeamId: true,
          scheduledAt: true,
          status: true,
          homeScore: true,
          awayScore: true,
        },
        orderBy: { scheduledAt: 'asc' },
      });
      return csv(
        [
          'id',
          'tournamentId',
          'homeTeamId',
          'awayTeamId',
          'scheduledAt',
          'status',
          'homeScore',
          'awayScore',
        ],
        rows,
      );
    }
    if (resource === 'rosters') {
      const rows = await this.prisma.roster.findMany({
        where: { organizationId, archivedAt: null },
        select: {
          id: true,
          tournamentId: true,
          teamId: true,
          status: true,
          visibility: true,
          version: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });
      return csv(
        ['id', 'tournamentId', 'teamId', 'status', 'visibility', 'version', 'createdAt'],
        rows,
      );
    }
    const rows = await this.prisma.auditLog.findMany({
      where: { organizationId },
      select: {
        id: true,
        createdAt: true,
        actorUserId: true,
        action: true,
        resourceType: true,
        resourceId: true,
        outcome: true,
        correlationId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return csv(
      [
        'id',
        'createdAt',
        'actorUserId',
        'action',
        'resourceType',
        'resourceId',
        'outcome',
        'correlationId',
      ],
      rows,
    );
  }

  createAnnouncement(
    organizationId: string,
    authorUserId: string,
    input: {
      tournamentId?: string;
      title: string;
      body: string;
      published: boolean;
      publishAt?: Date;
      expiresAt?: Date;
    },
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const announcement = await transaction.announcement.create({
        data: { organizationId, authorUserId, ...input },
      });
      if (input.published || input.publishAt) {
        await transaction.outboxEvent.create({
          data: {
            organizationId,
            aggregateType: 'Announcement',
            aggregateId: announcement.id,
            eventType: 'announcement.publish-requested',
            payload: { announcementId: announcement.id },
            ...(input.publishAt ? { availableAt: input.publishAt } : {}),
          },
        });
      }
      return announcement;
    });
  }

  dashboard(organizationId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const [tournaments, teams, upcomingGames, liveGames, pendingRosters, openCorrections] =
        await Promise.all([
          transaction.tournament.count({ where: { organizationId, archivedAt: null } }),
          transaction.team.count({ where: { organizationId, archivedAt: null } }),
          transaction.game.count({
            where: {
              organizationId,
              status: 'SCHEDULED',
              deletedAt: null,
              scheduledAt: { gte: new Date() },
            },
          }),
          transaction.game.count({
            where: { organizationId, status: { in: ['LIVE', 'PAUSED'] }, deletedAt: null },
          }),
          transaction.roster.count({
            where: { organizationId, status: 'SUBMITTED', archivedAt: null },
          }),
          transaction.correctionRequest.count({
            where: { organizationId, status: { in: ['OPEN', 'IN_REVIEW'] } },
          }),
        ]);
      return { tournaments, teams, upcomingGames, liveGames, pendingRosters, openCorrections };
    });
  }

  private async requireLeague(organizationId: string, leagueId: string): Promise<void> {
    const league = await this.prisma.league.findFirst({
      where: { id: leagueId, organizationId, archivedAt: null },
    });
    if (!league) throw this.notFound('League');
  }

  private async validateCorrectionResource(
    organizationId: string,
    tournamentId: string,
    teamId: string,
    resourceType: 'TEAM' | 'PLAYER' | 'ROSTER' | 'GAME',
    resourceId: string,
  ): Promise<void> {
    const [registered, tournament, team] = await Promise.all([
      this.prisma.tournamentTeam.count({ where: { tournamentId, teamId } }),
      this.prisma.tournament.count({
        where: { id: tournamentId, organizationId, archivedAt: null },
      }),
      this.prisma.team.count({ where: { id: teamId, organizationId, archivedAt: null } }),
    ]);
    if (registered !== 1 || tournament !== 1 || team !== 1) throw this.notFound('Registered team');
    const count =
      resourceType === 'TEAM'
        ? Number(resourceId === teamId)
        : resourceType === 'PLAYER'
          ? await this.prisma.player.count({
              where: { id: resourceId, organizationId, teamId, archivedAt: null },
            })
          : resourceType === 'ROSTER'
            ? await this.prisma.roster.count({
                where: { id: resourceId, organizationId, tournamentId, teamId, archivedAt: null },
              })
            : await this.prisma.game.count({
                where: {
                  id: resourceId,
                  organizationId,
                  tournamentId,
                  deletedAt: null,
                  OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
                },
              });
    if (count !== 1) throw this.notFound('Correction resource');
  }

  private notFound(resource: string): NotFoundException {
    return new NotFoundException({
      code: 'RESOURCE_NOT_FOUND',
      message: `${resource} was not found`,
    });
  }

  private conflict(): ConflictException {
    return new ConflictException({
      code: 'STALE_RESOURCE_VERSION',
      message: 'The resource changed; refresh and retry',
    });
  }
}

function csv(headers: readonly string[], rows: readonly Record<string, unknown>[]): string {
  const encode = (value: unknown): string => {
    let text: string;
    if (value instanceof Date) text = value.toISOString();
    else if (value === null || value === undefined) text = '';
    else if (typeof value === 'object') text = JSON.stringify(value);
    else if (typeof value === 'string') text = value;
    else if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean')
      text = value.toString();
    else if (typeof value === 'symbol') text = value.description ?? '';
    else text = '[unsupported value]';
    const formulaSafe = /^[=+\-@\t\r]/u.test(text) ? `'${text}` : text;
    return `"${formulaSafe.replaceAll('"', '""')}"`;
  };
  return `${headers.map(encode).join(',')}\r\n${rows.map((row) => headers.map((header) => encode(row[header])).join(',')).join('\r\n')}\r\n`;
}
