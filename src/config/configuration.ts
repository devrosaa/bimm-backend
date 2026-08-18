import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  NHTSA_BASE_URL: z
    .string()
    .url()
    .default('https://vpic.nhtsa.dot.gov/api/vehicles'),
  NHTSA_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  NHTSA_RETRY_COUNT: z.coerce.number().int().nonnegative().default(2),
  INGEST_CONCURRENCY: z.coerce.number().int().positive().default(10),
  INGEST_MAKE_LIMIT: z.coerce.number().int().nonnegative().default(0),
  INGEST_ON_BOOT: z
    .union([z.boolean(), z.string()])
    .transform((value) => {
      if (typeof value === 'boolean') return value;
      return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
    })
    .default(false),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  return parsed.data;
}
