import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Param,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { uuidSchema } from '@tournament/validation';
import type { Environment } from '../config/environment';
import { CorrelationId, CurrentActor } from '../common/current-request.decorators';
import type { RequestActor } from '../common/request-context';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { TokenCryptoService } from '../security/token-crypto.service';
import {
  changePasswordSchema,
  completePasswordResetSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  requestPasswordResetSchema,
  tokenSchema,
} from './auth.schemas';
import { AuthService, type AuthTokens } from './auth.service';
import { CsrfGuard } from './csrf.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { StorageService } from '../storage/storage.service';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Environment, true>,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly storage: StorageService,
  ) {}

  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) input: ReturnType<typeof registerSchema.parse>,
    @CorrelationId() correlationId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.auth.register(input, {
      correlationId,
      ipAddress,
      ...(userAgent ? { userAgent } : {}),
    });
  }

  @Post('verify-email')
  verifyEmail(
    @Body(new ZodValidationPipe(tokenSchema)) input: ReturnType<typeof tokenSchema.parse>,
    @CorrelationId() correlationId: string,
  ) {
    return this.auth.verifyEmail(input.token, correlationId);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: ReturnType<typeof loginSchema.parse>,
    @CorrelationId() correlationId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-client-platform') clientPlatform: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.auth.login(input, {
      correlationId,
      ipAddress,
      ...(userAgent ? { userAgent } : {}),
    });
    return this.deliverTokens(tokens, clientPlatform, response);
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(CsrfGuard)
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) input: ReturnType<typeof refreshSchema.parse>,
    @Req() request: Request,
    @CorrelationId() correlationId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('x-client-platform') clientPlatform: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieName = this.config.get('COOKIE_NAME', { infer: true });
    const refreshToken = input.refreshToken ?? (request.cookies[cookieName] as string | undefined);
    if (!refreshToken)
      throw new UnauthorizedException({
        code: 'INVALID_SESSION',
        message: 'Session is invalid or expired',
      });
    const tokens = await this.auth.refresh(refreshToken, {
      correlationId,
      ipAddress,
      ...(userAgent ? { userAgent } : {}),
    });
    return this.deliverTokens(tokens, clientPlatform, response);
  }

  @Post('password-reset/request')
  @HttpCode(202)
  requestPasswordReset(
    @Body(new ZodValidationPipe(requestPasswordResetSchema))
    input: ReturnType<typeof requestPasswordResetSchema.parse>,
  ) {
    return this.auth.requestPasswordReset(input.email);
  }

  @Post('password-reset/complete')
  completePasswordReset(
    @Body(new ZodValidationPipe(completePasswordResetSchema))
    input: ReturnType<typeof completePasswordResetSchema.parse>,
    @CorrelationId() correlationId: string,
  ) {
    return this.auth.completePasswordReset(input, correlationId);
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentActor() actor: RequestActor,
    @Body(new ZodValidationPipe(changePasswordSchema))
    input: ReturnType<typeof changePasswordSchema.parse>,
    @CorrelationId() correlationId: string,
  ) {
    return this.auth.changePassword(actor.userId, input, correlationId);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentActor() actor: RequestActor,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.revokeSession(actor.userId, actor.sessionId, 'LOGOUT');
    this.clearCookies(response);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  logoutAll(@CurrentActor() actor: RequestActor) {
    return this.auth.revokeAllSessions(actor.userId);
  }

  @Post('account/export')
  @UseGuards(JwtAuthGuard)
  requestExport(@CurrentActor() actor: RequestActor) {
    return this.auth.requestDataAction(actor.userId, 'EXPORT');
  }

  @Post('account/delete')
  @UseGuards(JwtAuthGuard)
  requestDeletion(@CurrentActor() actor: RequestActor) {
    return this.auth.requestDataAction(actor.userId, 'DELETION');
  }

  @Get('account/requests/:requestId')
  @UseGuards(JwtAuthGuard)
  async dataRequest(
    @CurrentActor() actor: RequestActor,
    @Param('requestId', new ZodValidationPipe(uuidSchema)) requestId: string,
  ) {
    const request = await this.auth.dataRequest(actor.userId, requestId);
    const download =
      request.status === 'COMPLETED' &&
      request.resultObjectKey &&
      request.expiresAt &&
      request.expiresAt > new Date()
        ? await this.storage.privateDownloadUrl(request.resultObjectKey)
        : {};
    return {
      id: request.id,
      type: request.type,
      status: request.status,
      requestedAt: request.requestedAt,
      completedAt: request.completedAt,
      expiresAt: request.expiresAt,
      resultChecksum: request.resultChecksum,
      ...download,
    };
  }

  private deliverTokens(tokens: AuthTokens, platform: string | undefined, response: Response) {
    if (platform === 'mobile') return tokens;
    const cookieOptions = {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite: 'lax' as const,
      path: '/api/v1/auth',
      maxAge: this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }) * 86_400_000,
      ...(this.config.get('COOKIE_DOMAIN', { infer: true })
        ? { domain: this.config.get('COOKIE_DOMAIN', { infer: true }) }
        : {}),
    };
    response.cookie(
      this.config.get('COOKIE_NAME', { infer: true }),
      tokens.refreshToken,
      cookieOptions,
    );
    const csrf = this.tokenCrypto.signCsrf(this.tokenCrypto.generateOpaqueToken());
    response.cookie('tp_csrf', csrf, { ...cookieOptions, httpOnly: false });
    return {
      accessToken: tokens.accessToken,
      accessTokenExpiresIn: tokens.accessTokenExpiresIn,
      sessionId: tokens.sessionId,
      user: tokens.user,
    };
  }

  private clearCookies(response: Response): void {
    response.clearCookie(this.config.get('COOKIE_NAME', { infer: true }), { path: '/api/v1/auth' });
    response.clearCookie('tp_csrf', { path: '/api/v1/auth' });
  }
}
