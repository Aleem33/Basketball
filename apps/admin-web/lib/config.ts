import { z } from 'zod';

const publicConfigSchema = z.object({
  apiUrl: z.string().url(),
  websocketUrl: z.string().url(),
  appName: z.string().min(1),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/u),
  supportEmail: z.string(),
  privacyPolicyUrl: z.string(),
  termsUrl: z.string(),
});

export const publicConfig = publicConfigSchema.parse({
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  websocketUrl: process.env.NEXT_PUBLIC_WEBSOCKET_URL ?? 'http://localhost:4000/live',
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'Tournament Platform',
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR ?? '#174A7E',
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? '',
  privacyPolicyUrl: process.env.NEXT_PUBLIC_PRIVACY_POLICY_URL ?? '',
  termsUrl: process.env.NEXT_PUBLIC_TERMS_URL ?? '',
});
