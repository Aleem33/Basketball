import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { afterAll, describe, expect, it } from 'vitest';
import { AuthService } from '../../src/auth/auth.service';
import type { Environment } from '../../src/config/environment';
import { TokenCryptoService } from '../../src/security/token-crypto.service';
import { createUser, prisma, prismaService } from './helpers';

const values = {
  JWT_ACCESS_SECRET: 'test-only-access-secret-at-least-thirty-two-characters',
  JWT_ISSUER: 'test',
  JWT_AUDIENCE: 'test',
  ACCESS_TOKEN_TTL_SECONDS: 900,
  REFRESH_TOKEN_TTL_DAYS: 30,
  CSRF_SECRET: 'test-only-csrf-secret-at-least-thirty-two-characters',
  TOKEN_ENCRYPTION_KEY: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
};

describe('refresh token rotation', () => {
  afterAll(async () => prisma.$disconnect());
  it('rotates a token and revokes the family when the old token is reused', async () => {
    const config = new ConfigService(values) as unknown as ConfigService<Environment, true>;
    const crypto = new TokenCryptoService(config);
    const service = new AuthService(prismaService, new JwtService(), config, crypto);
    const user = await createUser('rotation');
    const raw = crypto.generateOpaqueToken();
    const familyId = randomUUID();
    await prisma.session.create({
      data: {
        userId: user.id,
        familyId,
        refreshTokenHash: crypto.hash(raw),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    const rotated = await service.refresh(raw, { correlationId: randomUUID() });
    expect(rotated.refreshToken).not.toBe(raw);
    await expect(service.refresh(raw, { correlationId: randomUUID() })).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'SESSION_REUSE_DETECTED' }),
    });
    expect(await prisma.session.count({ where: { familyId, revokedAt: null } })).toBe(0);
  });
});
