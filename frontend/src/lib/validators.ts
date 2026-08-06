import { z } from 'zod';

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Needs a lowercase letter')
  .regex(/[A-Z]/, 'Needs an uppercase letter')
  .regex(/\d/, 'Needs a number')
  .regex(/[^A-Za-z0-9]/, 'Needs a special character');

export const loginSchema = z.object({
  username: z.string().min(3, 'Username is too short').max(50),
  password: z.string().min(8, 'Password is too short').max(128),
  captcha: z
    .string()
    .min(4, 'Enter the captcha code')
    .max(12)
    .regex(/^[a-zA-Z0-9]+$/, 'Letters and numbers only'),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const createPageSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase alphanumeric with hyphens only'),
  title: z.string().min(3).max(220),
  content: z.string().min(1).max(100_000),
  seoTitle: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;