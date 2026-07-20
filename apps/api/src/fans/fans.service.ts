import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/client';
import { PrismaService } from '../database/prisma.service';
import { TokenCryptoService } from '../security/token-crypto.service';

@Injectable()
export class FansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async setFavoriteTeam(userId: string, teamId: string, favorite: boolean) {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, published: true, archivedAt: null },
    });
    if (!team)
      throw new NotFoundException({ code: 'TEAM_NOT_FOUND', message: 'Team is unavailable' });
    if (favorite) {
      await this.prisma.favoriteTeam.upsert({
        where: { userId_teamId: { userId, teamId } },
        create: { userId, teamId },
        update: {},
      });
    } else {
      await this.prisma.favoriteTeam.deleteMany({ where: { userId, teamId } });
    }
    return { teamId, favorite };
  }

  async setFavoriteTournament(userId: string, tournamentId: string, favorite: boolean) {
    const tournament = await this.prisma.tournament.findFirst({
      where: { id: tournamentId, published: true, archivedAt: null },
    });
    if (!tournament)
      throw new NotFoundException({
        code: 'TOURNAMENT_NOT_FOUND',
        message: 'Tournament is unavailable',
      });
    if (favorite) {
      await this.prisma.favoriteTournament.upsert({
        where: { userId_tournamentId: { userId, tournamentId } },
        create: { userId, tournamentId },
        update: {},
      });
    } else {
      await this.prisma.favoriteTournament.deleteMany({ where: { userId, tournamentId } });
    }
    return { tournamentId, favorite };
  }

  favorites(userId: string) {
    return Promise.all([
      this.prisma.favoriteTeam.findMany({
        where: { userId, team: { published: true, archivedAt: null } },
        include: { team: true },
      }),
      this.prisma.favoriteTournament.findMany({
        where: { userId, tournament: { published: true, archivedAt: null } },
        include: { tournament: true },
      }),
    ]).then(([teams, tournaments]) => ({
      teams: teams.map((row) => row.team),
      tournaments: tournaments.map((row) => row.tournament),
    }));
  }

  setPreference(
    userId: string,
    organizationId: string | undefined,
    input: {
      type: string;
      emailEnabled: boolean;
      pushEnabled: boolean;
      inAppEnabled: boolean;
      timezone: string;
      quietHours?: { start: string; end: string } | null;
      consented: boolean;
    },
  ) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_scopeKey_type: { userId, scopeKey: organizationId ?? 'global', type: input.type },
      },
      create: {
        userId,
        organizationId,
        scopeKey: organizationId ?? 'global',
        type: input.type,
        emailEnabled: input.emailEnabled,
        pushEnabled: input.pushEnabled,
        inAppEnabled: input.inAppEnabled,
        timezone: input.timezone,
        quietHours: input.quietHours ?? Prisma.JsonNull,
        consentedAt: input.consented ? new Date() : null,
      },
      update: {
        emailEnabled: input.emailEnabled,
        pushEnabled: input.pushEnabled,
        inAppEnabled: input.inAppEnabled,
        timezone: input.timezone,
        quietHours: input.quietHours ?? Prisma.JsonNull,
        consentedAt: input.consented ? new Date() : null,
      },
    });
  }

  registerDevice(
    userId: string,
    organizationId: string | undefined,
    input: {
      platform: 'ANDROID' | 'IOS' | 'WEB';
      provider: 'fcm' | 'apns' | 'webpush';
      token: string;
      deviceLabel?: string;
      appVersion: string;
    },
  ) {
    const tokenHash = this.tokenCrypto.hash(input.token);
    return this.prisma.deviceRegistration.upsert({
      where: { tokenHash },
      create: {
        userId,
        organizationId,
        platform: input.platform,
        provider: input.provider,
        tokenHash,
        encryptedToken: this.tokenCrypto.encrypt(input.token),
        appVersion: input.appVersion,
        ...(input.deviceLabel ? { deviceLabel: input.deviceLabel } : {}),
      },
      update: {
        userId,
        organizationId,
        active: true,
        invalidatedAt: null,
        encryptedToken: this.tokenCrypto.encrypt(input.token),
        appVersion: input.appVersion,
        lastSeenAt: new Date(),
      },
      select: { id: true, platform: true, provider: true, active: true, appVersion: true },
    });
  }
}
