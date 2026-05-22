import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().default("postgres://auto_pro_ia:auto_pro_ia@localhost:5432/auto_pro_ia"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  OPENAI_API_KEY: z.string().min(1).default("missing-openai-key"),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  EVOLUTION_API_URL: z.string().url().default("http://localhost:8080"),
  EVOLUTION_API_KEY: z.string().min(1).default("missing-evolution-key"),
  EVOLUTION_INSTANCE_NAME: z.string().min(1).default("auto-pro-ia"),
  EVOLUTION_WEBHOOK_SECRET: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_REALTIME_CHANNEL: z.string().default("conversations")
});

type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

function readEnv() {
  cachedEnv ??= envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME,
    EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_REALTIME_CHANNEL: process.env.SUPABASE_REALTIME_CHANNEL
  });

  return cachedEnv;
}

export const env = new Proxy({} as Env, {
  get(_target, property: string | symbol) {
    if (typeof property === "symbol") {
      return undefined;
    }

    return readEnv()[property as keyof Env];
  }
});
