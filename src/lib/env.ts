import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  APP_SECRET: z
    .string()
    .min(32, 'APP_SECRET must be at least 32 characters'),
  APP_TIMEZONE: z.string().default('Asia/Taipei'),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v == null ? undefined : v === 'true')),
  ADMIN_INITIAL_PASSWORD: z.string().min(1),
  MASTER_INITIAL_PASSWORD: z.string().min(1),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(20),
  AI_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const IS_PRODUCTION = env.NODE_ENV === 'production';
