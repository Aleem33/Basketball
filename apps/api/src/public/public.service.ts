import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PublicGameSummary,
  PublicTeamSummary,
  PublicTournamentSummary,
} from '@tournament/contracts';
import { PrismaService } from '../database/prisma.service';

type CursorQuery = { cursor?: string; limit: number };
type TournamentQuery = CursorQuery & { search?: string; historical?: boolean };
type GameQuery = CursorQuery & {
  dateFrom?: Date;
  dateTo?: Date;
  tournamentId?: string;
  divisionId?: string;
  teamId?: string;
  venueId?: string;
  status?: string;
};

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async tournaments(query: TournamentQuery) {
    const now = new Date();
    const items = await this.prisma.tournament.findMany({
      where: {
        published: true,
        archivedAt: null,
        organization: { archivedAt: null },
        ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
        ...(query.historical === true
          ? { endsAt: { lt: now } }
          : query.historical === false
            ? { endsAt: { gte: now } }
            : {}),
      },
      orderBy: [{ startsAt: 'desc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, name: true, slug: true, startsAt: true, endsAt: true, status: true },
    });
    const hasMore = items.length > query.limit;
    const page = items.slice(0, query.limit);
    return {
      items: page.map((item): PublicTournamentSummary => ({
        ...item,
        startsAt: item.startsAt.toISOString(),
        endsAt: item.endsAt.toISOString(),
      })),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async tournament(id: string) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id, published: true, archivedAt: null, organization: { archivedAt: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        divisions: {
          where: { published: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            stages: {
              where: { published: true },
              orderBy: { sequence: 'asc' },
              select: { id: true, name: true, format: true },
            },
          },
        },
        announcements: {
          where: {
            published: true,
            archivedAt: null,
            OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, title: true, body: true, publishAt: true, createdAt: true },
        },
      },
    });
    if (!tournament)
      throw new NotFoundException({
        code: 'TOURNAMENT_NOT_FOUND',
        message: 'Tournament is unavailable',
      });
    return tournament;
  }

  async games(query: GameQuery) {
    const items = await this.prisma.game.findMany({
      where: {
        published: true,
        deletedAt: null,
        tournament: { published: true, archivedAt: null },
        ...(query.dateFrom || query.dateTo
          ? {
              scheduledAt: {
                ...(query.dateFrom ? { gte: query.dateFrom } : {}),
                ...(query.dateTo ? { lte: query.dateTo } : {}),
              },
            }
          : {}),
        ...(query.tournamentId ? { tournamentId: query.tournamentId } : {}),
        ...(query.divisionId ? { divisionId: query.divisionId } : {}),
        ...(query.venueId ? { venueId: query.venueId } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.teamId
          ? { OR: [{ homeTeamId: query.teamId }, { awayTeamId: query.teamId }] }
          : {}),
      },
      orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        homeTeam: { include: { logoAsset: true } },
        awayTeam: { include: { logoAsset: true } },
      },
    });
    const hasMore = items.length > query.limit;
    const page = items.slice(0, query.limit);
    return {
      items: page.map((game) => this.toPublicGame(game)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async game(id: string) {
    const game = await this.prisma.game.findFirst({
      where: {
        id,
        published: true,
        deletedAt: null,
        tournament: { published: true, archivedAt: null },
      },
      include: {
        homeTeam: { include: { logoAsset: true } },
        awayTeam: { include: { logoAsset: true } },
        venue: { select: { id: true, name: true, city: true, countryCode: true } },
        court: { select: { id: true, name: true } },
        periods: { orderBy: { periodNumber: 'asc' } },
        tournament: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!game)
      throw new NotFoundException({ code: 'GAME_NOT_FOUND', message: 'Game is unavailable' });
    return game;
  }

  async team(id: string) {
    const team = await this.prisma.team.findFirst({
      where: { id, published: true, archivedAt: null, organization: { archivedAt: null } },
      include: {
        logoAsset: true,
        players: {
          where: { archivedAt: null, publicVisibility: 'PUBLIC' },
          select: {
            id: true,
            givenName: true,
            familyName: true,
            position: true,
            defaultJersey: true,
          },
        },
      },
    });
    if (!team)
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team is unavailable' });
    return team;
  }

  async leagues() {
    const items = await this.prisma.league.findMany({
      where: { published: true, archivedAt: null, organization: { archivedAt: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seasons: {
          where: { published: true, archivedAt: null },
          orderBy: { startsAt: 'desc' },
          select: { id: true, name: true, startsAt: true, endsAt: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    return { items };
  }

  async league(id: string) {
    const league = await this.prisma.league.findFirst({
      where: { id, published: true, archivedAt: null, organization: { archivedAt: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seasons: {
          where: { published: true, archivedAt: null },
          orderBy: { startsAt: 'desc' },
          select: { id: true, name: true, startsAt: true, endsAt: true },
        },
        tournaments: {
          where: { published: true, archivedAt: null },
          orderBy: { startsAt: 'desc' },
          select: { id: true, name: true, slug: true, status: true, startsAt: true, endsAt: true },
        },
      },
    });
    if (!league)
      throw new NotFoundException({ code: 'LEAGUE_NOT_FOUND', message: 'League is unavailable' });
    return league;
  }

  async venues() {
    const items = await this.prisma.venue.findMany({
      where: { published: true, archivedAt: null, organization: { archivedAt: null } },
      select: {
        id: true,
        name: true,
        city: true,
        region: true,
        countryCode: true,
        courts: {
          where: { published: true, archivedAt: null },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: [{ city: 'asc' }, { name: 'asc' }],
    });
    return { items };
  }

  async announcements(tournamentId?: string) {
    const items = await this.prisma.announcement.findMany({
      where: {
        published: true,
        archivedAt: null,
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
        AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }],
        ...(tournamentId ? { tournamentId } : {}),
        organization: { archivedAt: null },
      },
      select: {
        id: true,
        tournamentId: true,
        title: true,
        body: true,
        publishAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items };
  }

  async standings(stageId: string) {
    const stage = await this.prisma.competitionStage.findFirst({
      where: {
        id: stageId,
        published: true,
        division: { published: true, tournament: { published: true } },
      },
      select: {
        id: true,
        name: true,
        standings: {
          orderBy: { rank: 'asc' },
          select: {
            rank: true,
            played: true,
            wins: true,
            losses: true,
            draws: true,
            pointsFor: true,
            pointsAgainst: true,
            pointDifference: true,
            standingPoints: true,
            tieBreakExplanation: true,
            team: { select: { id: true, name: true, shortName: true } },
          },
        },
      },
    });
    if (!stage)
      throw new NotFoundException({
        code: 'STAGE_NOT_FOUND',
        message: 'Competition stage is unavailable',
      });
    return stage;
  }

  async bracket(stageId: string) {
    const bracket = await this.prisma.bracket.findFirst({
      where: {
        stageId,
        published: true,
        stage: { published: true, division: { tournament: { published: true } } },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' },
          include: {
            links: {
              include: {
                sourceGame: { include: { homeTeam: true, awayTeam: true } },
                targetGame: { select: { id: true } },
              },
            },
          },
        },
      },
    });
    if (!bracket)
      throw new NotFoundException({ code: 'BRACKET_NOT_FOUND', message: 'Bracket is unavailable' });
    return bracket;
  }

  async search(query: string, limit: number) {
    const [tournaments, teams, games] = await Promise.all([
      this.prisma.tournament.findMany({
        where: {
          published: true,
          archivedAt: null,
          name: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.team.findMany({
        where: {
          published: true,
          archivedAt: null,
          name: { contains: query, mode: 'insensitive' },
        },
        take: limit,
        select: { id: true, name: true, shortName: true },
      }),
      this.prisma.game.findMany({
        where: {
          published: true,
          deletedAt: null,
          OR: [
            { homeTeam: { name: { contains: query, mode: 'insensitive' } } },
            { awayTeam: { name: { contains: query, mode: 'insensitive' } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          scheduledAt: true,
          status: true,
          homeTeam: { select: { name: true } },
          awayTeam: { select: { name: true } },
        },
      }),
    ]);
    return { tournaments, teams, games };
  }

  private toPublicGame(game: {
    id: string;
    scheduledAt: Date;
    status: string;
    homeScore: number;
    awayScore: number;
    version: number;
    homeTeam: {
      id: string;
      name: string;
      shortName: string | null;
      logoAsset: { objectKey: string } | null;
    } | null;
    awayTeam: {
      id: string;
      name: string;
      shortName: string | null;
      logoAsset: { objectKey: string } | null;
    } | null;
  }): PublicGameSummary {
    const mapTeam = (team: typeof game.homeTeam): PublicTeamSummary | null =>
      team
        ? {
            id: team.id,
            name: team.name,
            shortName: team.shortName,
            logoUrl: team.logoAsset?.objectKey ?? null,
          }
        : null;
    return {
      id: game.id,
      scheduledAt: game.scheduledAt.toISOString(),
      status: game.status as PublicGameSummary['status'],
      homeTeam: mapTeam(game.homeTeam),
      awayTeam: mapTeam(game.awayTeam),
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      version: game.version,
    };
  }
}
