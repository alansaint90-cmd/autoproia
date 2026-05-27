import { sql } from "drizzle-orm";
import Redis from "ioredis";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

export const runtime = "nodejs";

function configured(value?: string, missingValue?: string) {
  return Boolean(value && value.trim() && value !== missingValue);
}

async function checkDatabase() {
  try {
    await db.execute(sql`select 1`);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido no Postgres." };
  }
}

async function checkRedis() {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

  try {
    await redis.connect();
    const response = await redis.ping();
    return { ok: response === "PONG" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Erro desconhecido no Redis." };
  } finally {
    redis.disconnect();
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  return NextResponse.json({
    ok: database.ok && redis.ok,
    environment: {
      databaseUrl: configured(env.DATABASE_URL),
      redisUrl: configured(env.REDIS_URL),
      openAiKey: configured(env.OPENAI_API_KEY, "missing-openai-key"),
      openAiModel: env.OPENAI_MODEL,
      evolutionApiUrl: configured(env.EVOLUTION_API_URL),
      evolutionApiKey: configured(env.EVOLUTION_API_KEY, "missing-evolution-key"),
      evolutionInstanceName: configured(env.EVOLUTION_INSTANCE_NAME),
      evolutionWebhookSecret: configured(env.EVOLUTION_WEBHOOK_SECRET),
      supabaseUrl: configured(env.SUPABASE_URL),
      supabaseServiceRoleKey: configured(env.SUPABASE_SERVICE_ROLE_KEY)
    },
    services: {
      database,
      redis
    }
  });
}
