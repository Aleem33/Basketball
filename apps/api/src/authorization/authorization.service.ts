import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { PermissionKey } from './permissions';

export type ResourceScope = {
  tournamentId?: string;
  teamId?: string;
  gameId?: string;
  stageId?: string;
};

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async hasPermission(
    userId: string,
    organizationId: string,
    permission: PermissionKey,
    scope: ResourceScope,
  ): Promise<boolean> {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: {
        roles: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    if (membership?.status !== 'ACTIVE') return false;
    const tournamentIds = new Set<string>();
    if (scope.tournamentId) tournamentIds.add(scope.tournamentId);
    if (scope.gameId) {
      const game = await this.prisma.game.findFirst({
        where: { id: scope.gameId, organizationId, deletedAt: null },
        select: { tournamentId: true },
      });
      if (game) tournamentIds.add(game.tournamentId);
    }
    if (scope.stageId) {
      const stage = await this.prisma.competitionStage.findFirst({
        where: { id: scope.stageId, organizationId },
        select: { division: { select: { tournamentId: true } } },
      });
      if (stage) tournamentIds.add(stage.division.tournamentId);
    }
    if (scope.teamId) {
      const registrations = await this.prisma.tournamentTeam.findMany({
        where: { teamId: scope.teamId, tournament: { organizationId, archivedAt: null } },
        select: { tournamentId: true },
      });
      for (const registration of registrations) tournamentIds.add(registration.tournamentId);
    }
    return membership.roles.some((assignment) => {
      if (!assignment.role.permissions.some((item) => item.permission.key === permission))
        return false;
      switch (assignment.role.scopeType) {
        case 'PLATFORM':
        case 'ORGANIZATION':
          return true;
        case 'TOURNAMENT':
          return Boolean(assignment.tournamentId && tournamentIds.has(assignment.tournamentId));
        case 'TEAM':
          return Boolean(scope.teamId && assignment.teamId === scope.teamId);
        case 'GAME':
          return Boolean(scope.gameId && assignment.gameId === scope.gameId);
      }
    });
  }
}
