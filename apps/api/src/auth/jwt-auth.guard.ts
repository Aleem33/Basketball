import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import type { AppRequest } from '../common/request-context';
import { PrismaService } from '../database/prisma.service';

type AccessClaims = {
  sub: string;
  sid: string;
  psa: boolean;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required',
      });
    }
    try {
      const claims = await this.jwt.verifyAsync<AccessClaims>(authorization.slice(7), {
        secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
        issuer: this.config.get('JWT_ISSUER', { infer: true }),
        audience: this.config.get('JWT_AUDIENCE', { infer: true }),
      });
      const session = await this.prisma.session.findFirst({
        where: {
          id: claims.sid,
          userId: claims.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { status: 'ACTIVE', deletedAt: null },
        },
        select: { id: true },
      });
      if (!session) throw new Error('Session is inactive');
      request.actor = {
        userId: claims.sub,
        sessionId: claims.sid,
        platformSuperAdmin: claims.psa,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    }
  }
}
