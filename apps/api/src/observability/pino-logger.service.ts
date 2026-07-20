import type { LoggerService } from '@nestjs/common';
import pino, { type Logger } from 'pino';

export class PinoLoggerService implements LoggerService {
  private readonly logger: Logger;

  constructor(level: string) {
    this.logger = pino({
      level,
      redact: {
        paths: [
          'password',
          '*.password',
          'accessToken',
          'refreshToken',
          'authorization',
          'req.headers.authorization',
          'token',
          '*.token',
          '*.encryptedToken',
        ],
        censor: '[REDACTED]',
      },
      base: { service: 'tournament-api' },
    });
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, this.messageText(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, this.messageText(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, this.messageText(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, this.messageText(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, this.messageText(message));
  }

  private messageText(message: unknown): string {
    if (typeof message === 'string') return message;
    if (message instanceof Error) return message.message;
    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
