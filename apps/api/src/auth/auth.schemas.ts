import { z } from 'zod';
import { emailSchema, passwordSchema, uuidSchema } from '@tournament/validation';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(120),
  timezone: z.string().trim().min(1).max(64).default('UTC'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(32).max(512).optional(),
});

export const tokenSchema = z.object({ token: z.string().min(32).max(512) });

export const requestPasswordResetSchema = z.object({ email: emailSchema });

export const completePasswordResetSchema = z.object({
  token: z.string().min(32).max(512),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const revokeSessionSchema = z.object({ sessionId: uuidSchema });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CompletePasswordResetInput = z.infer<typeof completePasswordResetSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
