import { createHash, randomUUID } from 'node:crypto';
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify, argon2id } from 'argon2';
import type { Environment } from '../config/environment';
import { PrismaService } from '../database/prisma.service';
import { TokenCryptoService } from '../security/token-crypto.service';
import type {
  ChangePasswordInput,
  CompletePasswordResetInput,
  LoginInput,
  RegisterInput,
} from './auth.schemas';

const PASSWORD_HASH_OPTIONS = {
  type: argon2id,
  memoryCost: 65_536,
  timeCost: 3,
  parallelism: 1,
} as const;

type ClientContext = {
  correlationId: string;
  ipAddress?: string;
  userAgent?: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  sessionId: string;
  user: { id: string; email: string; displayName: string; platformSuperAdmin: boolean };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  async register(input: RegisterInput, context: ClientContext): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException({
        code: 'REGISTRATION_UNAVAILABLE',
        message: 'Registration could not be completed',
      });
    }
    const token = this.tokenCrypto.generateOpaqueToken();
    const passwordHash = await hash(input.password, PASSWORD_HASH_OPTIONS);
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          email: input.email,
          passwordHash,
          profile: {
            create: { displayName: input.displayName, timezone: input.timezone },
          },
        },
      });
      await transaction.emailVerificationToken.create({
        data: {
          userId: user.id,
          tokenHash: this.tokenCrypto.hash(token),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: 'User',
          aggregateId: user.id,
          eventType: 'auth.email-verification.requested',
          payload: { userId: user.id, encryptedToken: this.tokenCrypto.encrypt(token) },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          correlationId: context.correlationId,
          action: 'auth.register',
          resourceType: 'User',
          resourceId: user.id,
          outcome: 'SUCCESS',
          metadata: {},
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
        },
      });
    });
    return { message: 'Registration accepted. Check your email to verify the account.' };
  }

  async verifyEmail(rawToken: string, correlationId: string): Promise<{ message: string }> {
    const tokenHash = this.tokenCrypto.hash(rawToken);
    const result = await this.prisma.$transaction(async (transaction) => {
      const token = await transaction.emailVerificationToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      });
      if (!token || token.usedAt || token.expiresAt <= new Date()) return null;
      await transaction.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      await transaction.user.update({
        where: { id: token.userId },
        data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: token.userId,
          correlationId,
          action: 'auth.email-verified',
          resourceType: 'User',
          resourceId: token.userId,
          outcome: 'SUCCESS',
          metadata: {},
        },
      });
      return token.userId;
    });
    if (!result) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is invalid or expired',
      });
    }
    return { message: 'Email verified.' };
  }

  async login(input: LoginInput, context: ClientContext): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { profile: true },
    });
    const now = new Date();
    const valid = user ? await verify(user.passwordHash, input.password).catch(() => false) : false;
    if (
      !user ||
      !valid ||
      user.status !== 'ACTIVE' ||
      user.deletedAt ||
      (user.lockedUntil && user.lockedUntil > now)
    ) {
      if (user && !valid) await this.recordFailedLogin(user.id, user.failedLoginCount);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect',
      });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lastFailedLoginAt: null, lockedUntil: null },
    });
    return this.createSession(
      {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName ?? '',
        platformSuperAdmin: user.platformSuperAdmin,
      },
      context,
    );
  }

  async refresh(rawToken: string, context: ClientContext): Promise<AuthTokens> {
    const tokenHash = this.tokenCrypto.hash(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: { include: { profile: true } } },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE' ||
      session.user.deletedAt
    ) {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }
    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'REFRESH_TOKEN_REUSE' },
      });
      throw new UnauthorizedException({
        code: 'SESSION_REUSE_DETECTED',
        message: 'Session is invalid or expired',
      });
    }

    const nextToken = this.tokenCrypto.generateOpaqueToken();
    const nextSessionId = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000,
    );
    await this.prisma.$transaction(async (transaction) => {
      const revoked = await transaction.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'ROTATED', lastUsedAt: new Date() },
      });
      if (revoked.count !== 1) throw new Error('Concurrent refresh detected');
      await transaction.session.create({
        data: {
          id: nextSessionId,
          userId: session.userId,
          familyId: session.familyId,
          refreshTokenHash: this.tokenCrypto.hash(nextToken),
          userAgentHash: context.userAgent
            ? createHash('sha256').update(context.userAgent).digest('hex')
            : null,
          ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
          rotationCounter: session.rotationCounter + 1,
          expiresAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: session.userId,
          correlationId: context.correlationId,
          action: 'auth.session-rotated',
          resourceType: 'Session',
          resourceId: nextSessionId,
          outcome: 'SUCCESS',
          metadata: { familyId: session.familyId, rotationCounter: session.rotationCounter + 1 },
        },
      });
    });
    const accessToken = await this.signAccessToken(session.user, nextSessionId);
    return {
      accessToken,
      refreshToken: nextToken,
      accessTokenExpiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      sessionId: nextSessionId,
      user: {
        id: session.user.id,
        email: session.user.email,
        displayName: session.user.profile?.displayName ?? '',
        platformSuperAdmin: session.user.platformSuperAdmin,
      },
    };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });
    if (user?.status === 'ACTIVE') {
      const token = this.tokenCrypto.generateOpaqueToken();
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.tokenCrypto.hash(token),
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          },
        }),
        this.prisma.outboxEvent.create({
          data: {
            aggregateType: 'User',
            aggregateId: user.id,
            eventType: 'auth.password-reset.requested',
            payload: { userId: user.id, encryptedToken: this.tokenCrypto.encrypt(token) },
          },
        }),
      ]);
    }
    return { message: 'If the account is eligible, password reset instructions will be sent.' };
  }

  async completePasswordReset(
    input: CompletePasswordResetInput,
    correlationId: string,
  ): Promise<{ message: string }> {
    const tokenHash = this.tokenCrypto.hash(input.token);
    const passwordHash = await hash(input.newPassword, PASSWORD_HASH_OPTIONS);
    const succeeded = await this.prisma.$transaction(async (transaction) => {
      const token = await transaction.passwordResetToken.findUnique({ where: { tokenHash } });
      if (!token || token.usedAt || token.expiresAt <= new Date()) return false;
      await transaction.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      });
      await transaction.user.update({
        where: { id: token.userId },
        data: {
          passwordHash,
          passwordChangedAt: new Date(),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await transaction.session.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'PASSWORD_RESET' },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: token.userId,
          correlationId,
          action: 'auth.password-reset.completed',
          resourceType: 'User',
          resourceId: token.userId,
          outcome: 'SUCCESS',
          metadata: {},
        },
      });
      return true;
    });
    if (!succeeded) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is invalid or expired',
      });
    }
    return { message: 'Password changed. Sign in again on every device.' };
  }

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    correlationId: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await verify(user.passwordHash, input.currentPassword).catch(() => false))) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }
    const passwordHash = await hash(input.newPassword, PASSWORD_HASH_OPTIONS);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordChangedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date(), revokeReason: 'PASSWORD_CHANGED' },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          correlationId,
          action: 'auth.password-changed',
          resourceType: 'User',
          resourceId: userId,
          outcome: 'SUCCESS',
          metadata: {},
        },
      }),
    ]);
    return { message: 'Password changed. Sign in again on every device.' };
  }

  async revokeSession(userId: string, sessionId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeAllSessions(userId: string): Promise<{ revoked: number }> {
    const result = await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'LOGOUT_ALL' },
    });
    return { revoked: result.count };
  }

  async requestDataAction(
    userId: string,
    type: 'EXPORT' | 'DELETION',
  ): Promise<{ requestId: string }> {
    return this.prisma.$transaction(async (transaction) => {
      const request = await transaction.dataRequest.create({ data: { userId, type } });
      await transaction.outboxEvent.create({
        data: {
          aggregateType: 'DataRequest',
          aggregateId: request.id,
          eventType: type === 'EXPORT' ? 'privacy.export.requested' : 'privacy.deletion.requested',
          payload: { requestId: request.id, userId },
        },
      });
      if (type === 'DELETION') {
        await transaction.user.update({
          where: { id: userId },
          data: { status: 'DELETION_REQUESTED' },
        });
      }
      return { requestId: request.id };
    });
  }

  async dataRequest(userId: string, requestId: string) {
    const request = await this.prisma.dataRequest.findFirst({
      where: { id: requestId, userId },
      select: {
        id: true,
        type: true,
        status: true,
        requestedAt: true,
        completedAt: true,
        expiresAt: true,
        resultObjectKey: true,
        resultChecksum: true,
      },
    });
    if (!request)
      throw new UnauthorizedException({
        code: 'DATA_REQUEST_NOT_FOUND',
        message: 'Data request was not found',
      });
    return request;
  }

  private async createSession(
    user: { id: string; email: string; displayName: string; platformSuperAdmin: boolean },
    context: ClientContext,
  ): Promise<AuthTokens> {
    const refreshToken = this.tokenCrypto.generateOpaqueToken();
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: this.tokenCrypto.hash(refreshToken),
        userAgentHash: context.userAgent
          ? createHash('sha256').update(context.userAgent).digest('hex')
          : null,
        ...(context.ipAddress ? { ipAddress: context.ipAddress } : {}),
        expiresAt: new Date(
          Date.now() + this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000,
        ),
      },
    });
    return {
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken,
      accessTokenExpiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      sessionId: session.id,
      user,
    };
  }

  private async signAccessToken(
    user: { id: string; platformSuperAdmin: boolean },
    sessionId: string,
  ): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, sid: sessionId, psa: user.platformSuperAdmin },
      {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      },
    );
  }

  private async recordFailedLogin(userId: string, currentCount: number): Promise<void> {
    const failures = currentCount + 1;
    const delaySeconds = failures >= 5 ? Math.min(3600, 2 ** (failures - 5) * 30) : 0;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: failures,
        lastFailedLoginAt: new Date(),
        ...(delaySeconds > 0 ? { lockedUntil: new Date(Date.now() + delaySeconds * 1000) } : {}),
      },
    });
  }
}
