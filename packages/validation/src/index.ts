import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const emailSchema = z.string().trim().toLowerCase().email().max(320);
export const passwordSchema = z
  .string()
  .min(12)
  .max(128)
  .refine((value) => /[a-z]/u.test(value) && /[A-Z]/u.test(value) && /\d/u.test(value), {
    message: 'Password must contain upper-case, lower-case, and numeric characters',
  });
export const idempotencyKeySchema = z.string().uuid();
export const safeCursorSchema = z.string().max(512);

export const pageQuerySchema = z.object({
  cursor: safeCursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
