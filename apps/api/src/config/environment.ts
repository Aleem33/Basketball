import { z } from 'zod';

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    APP_VERSION: z.string().min(1).default('0.0.0-local'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ISSUER: z.string().min(1),
    JWT_AUDIENCE: z.string().min(1),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(180).default(30),
    COOKIE_NAME: z.string().min(1).default('tp_refresh'),
    COOKIE_SECURE: booleanString.default('true'),
    COOKIE_DOMAIN: z.string().optional(),
    CSRF_SECRET: z.string().min(32),
    TOKEN_ENCRYPTION_KEY: z.string().regex(/^[A-Za-z0-9+/]{43}=$/u),
    TRUSTED_ORIGINS: z.string().transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
    ADMIN_WEB_URL: z.string().url(),
    PUBLIC_API_URL: z.string().url(),
    WEBSOCKET_URL: z.string().url(),
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().min(1).max(65535),
    SMTP_SECURE: booleanString.default('true'),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    SMTP_FROM: z.string().min(1),
    S3_ENDPOINT: z.string().url(),
    S3_REGION: z.string().min(1),
    S3_BUCKET: z.string().min(3),
    S3_ACCESS_KEY: z.string().min(1),
    S3_SECRET_KEY: z.string().min(1),
    S3_FORCE_PATH_STYLE: booleanString.default('false'),
    S3_PUBLIC_BASE_URL: z.string().url(),
    MAX_UPLOAD_BYTES: z.coerce
      .number()
      .int()
      .min(1024)
      .max(20 * 1024 * 1024)
      .default(5 * 1024 * 1024),
    NOTIFICATION_PROVIDER: z.enum(['noop', 'fcm', 'apns']).default('noop'),
    MOBILE_MINIMUM_VERSION: z.string().regex(/^\d+\.\d+\.\d+$/u),
    MAINTENANCE_MODE: booleanString.default('false'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    RATE_LIMIT_TTL_MS: z.coerce.number().int().min(1000).default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
    DATA_RETENTION_DAYS: z.coerce.number().int().min(1).default(2555),
    ERROR_TRACKING_DSN: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production') {
      const forbidden = ['CHANGE_ME', 'localhost'];
      const secretValues = [
        value.DATABASE_URL,
        value.JWT_ACCESS_SECRET,
        value.CSRF_SECRET,
        value.SMTP_PASSWORD,
        value.S3_SECRET_KEY,
      ];
      if (secretValues.some((secret) => forbidden.some((marker) => secret.includes(marker)))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production configuration contains a placeholder or localhost secret',
        });
      }
      if (!value.COOKIE_SECURE) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production',
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(values: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(values);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return result.data;
}
