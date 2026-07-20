import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TokenCryptoService } from '../security/token-crypto.service';

type RoleScope = { tournamentId?: string; teamId?: string; gameId?: string };

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async create(
    organizationId: string,
    sentById: string,
    input: {
      email: string;
      roleKey: string;
      tournamentId?: string;
      teamId?: string;
      gameId?: string;
      expiresInDays: number;
    },
  ) {
    const role = await this.requireRole(input.roleKey, input);
    await this.validateResources(organizationId, input);
    const token = this.tokenCrypto.generateOpaqueToken();
    const invitation = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.invitation.create({
        data: {
          organizationId,
          sentById,
          email: input.email,
          roleKey: role.key,
          tokenHash: this.tokenCrypto.hash(token),
          expiresAt: new Date(Date.now() + input.expiresInDays * 86_400_000),
          ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
          ...(input.teamId ? { teamId: input.teamId } : {}),
          ...(input.gameId ? { gameId: input.gameId } : {}),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          organizationId,
          aggregateType: 'Invitation',
          aggregateId: created.id,
          eventType: 'invitation.requested',
          payload: {
            invitationId: created.id,
            email: input.email,
            encryptedToken: this.tokenCrypto.encrypt(token),
          },
        },
      });
      return created;
    });
    return {
      id: invitation.id,
      email: invitation.email,
      roleKey: invitation.roleKey,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(userId: string, rawToken: string) {
    const tokenHash = this.tokenCrypto.hash(rawToken);
    return this.prisma.$transaction(async (transaction) => {
      const invitation = await transaction.invitation.findUnique({ where: { tokenHash } });
      if (
        !invitation ||
        invitation.acceptedAt ||
        invitation.revokedAt ||
        invitation.expiresAt <= new Date()
      ) {
        throw new NotFoundException({
          code: 'INVITATION_INVALID',
          message: 'Invitation is invalid or expired',
        });
      }
      const user = await transaction.user.findUniqueOrThrow({ where: { id: userId } });
      if (user.email !== invitation.email) {
        throw new ForbiddenException({
          code: 'INVITATION_EMAIL_MISMATCH',
          message: 'Invitation belongs to a different account',
        });
      }
      const role = await transaction.role.findUniqueOrThrow({ where: { key: invitation.roleKey } });
      const membership = await transaction.organizationMembership.upsert({
        where: { organizationId_userId: { organizationId: invitation.organizationId, userId } },
        create: {
          organizationId: invitation.organizationId,
          userId,
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
        update: { status: 'ACTIVE', joinedAt: new Date() },
      });
      await transaction.membershipRole.create({
        data: {
          membershipId: membership.id,
          roleId: role.id,
          ...(invitation.tournamentId ? { tournamentId: invitation.tournamentId } : {}),
          ...(invitation.teamId ? { teamId: invitation.teamId } : {}),
          ...(invitation.gameId ? { gameId: invitation.gameId } : {}),
        },
      });
      if (invitation.teamId && ['coach', 'team-manager'].includes(invitation.roleKey)) {
        await transaction.teamMembership.upsert({
          where: {
            teamId_userId_role: {
              teamId: invitation.teamId,
              userId,
              role: invitation.roleKey === 'coach' ? 'COACH' : 'TEAM_MANAGER',
            },
          },
          create: {
            organizationId: invitation.organizationId,
            teamId: invitation.teamId,
            userId,
            role: invitation.roleKey === 'coach' ? 'COACH' : 'TEAM_MANAGER',
          },
          update: { active: true, endsAt: null },
        });
      }
      await transaction.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return { organizationId: invitation.organizationId, roleKey: invitation.roleKey };
    });
  }

  async assign(
    organizationId: string,
    input: {
      userId: string;
      roleKey: string;
      tournamentId?: string;
      teamId?: string;
      gameId?: string;
      expiresAt?: Date;
    },
  ) {
    const role = await this.requireRole(input.roleKey, input);
    await this.validateResources(organizationId, input);
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: input.userId } },
    });
    if (membership?.status !== 'ACTIVE')
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Active member was not found',
      });
    return this.prisma.membershipRole.create({
      data: {
        membershipId: membership.id,
        roleId: role.id,
        ...(input.tournamentId ? { tournamentId: input.tournamentId } : {}),
        ...(input.teamId ? { teamId: input.teamId } : {}),
        ...(input.gameId ? { gameId: input.gameId } : {}),
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
      },
    });
  }

  private async requireRole(roleKey: string, scope: RoleScope) {
    const role = await this.prisma.role.findUnique({ where: { key: roleKey } });
    if (!role)
      throw new NotFoundException({
        code: 'ROLE_NOT_FOUND',
        message: 'System role was not found; run the explicit bootstrap first',
      });
    const valid =
      role.scopeType === 'ORGANIZATION' ||
      (role.scopeType === 'TOURNAMENT' && Boolean(scope.tournamentId)) ||
      (role.scopeType === 'TEAM' && Boolean(scope.teamId)) ||
      (role.scopeType === 'GAME' && Boolean(scope.gameId));
    if (!valid)
      throw new ConflictException({ code: 'INVALID_ROLE_SCOPE', message: 'Role scope is invalid' });
    return role;
  }

  private async validateResources(organizationId: string, scope: RoleScope): Promise<void> {
    const checks = await Promise.all([
      scope.tournamentId
        ? this.prisma.tournament.count({
            where: { id: scope.tournamentId, organizationId, archivedAt: null },
          })
        : 1,
      scope.teamId
        ? this.prisma.team.count({ where: { id: scope.teamId, organizationId, archivedAt: null } })
        : 1,
      scope.gameId
        ? this.prisma.game.count({ where: { id: scope.gameId, organizationId, deletedAt: null } })
        : 1,
    ]);
    if (checks.some((count) => count !== 1))
      throw new NotFoundException({
        code: 'RESOURCE_NOT_FOUND',
        message: 'Scoped resource was not found',
      });
  }
}
