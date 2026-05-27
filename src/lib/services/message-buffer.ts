import Redis from "ioredis";
import { env } from "@/lib/env";

const bufferTtlSeconds = 60 * 10;
const processingWindowSeconds = 60;
let redisClient: Redis | null = null;

export type BufferedMessage = {
  conversationId: string;
  messageId: string;
  content: string;
  receivedAt: string;
};

export async function pushToConversationBuffer(message: BufferedMessage) {
  const redis = getRedis();
  const key = bufferKey(message.conversationId);
  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, bufferTtlSeconds);
  console.info("[message-buffer] message pushed", { conversationId: message.conversationId });
}

export async function drainConversationBuffer(conversationId: string) {
  const redis = getRedis();
  const key = bufferKey(conversationId);
  const items = await redis.lrange(key, 0, -1);
  await redis.del(key);
  console.info("[message-buffer] buffer drained", { conversationId, count: items.length });

  return items.map((item) => JSON.parse(item) as BufferedMessage);
}

export async function scheduleBufferProcessing(conversationId: string) {
  const redis = getRedis();
  await redis.set(processingKey(conversationId), "pending", "EX", processingWindowSeconds);
  console.info("[message-buffer] processing scheduled", { conversationId });
}

export async function shouldProcessBuffer(conversationId: string) {
  const redis = getRedis();
  const status = await redis.get(processingKey(conversationId));
  console.info("[message-buffer] processing status", { conversationId, status });
  return status === "pending";
}

function getRedis() {
  redisClient ??= new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2
  });

  return redisClient;
}

function bufferKey(conversationId: string) {
  return `conversation:${conversationId}:buffer`;
}

function processingKey(conversationId: string) {
  return `conversation:${conversationId}:processing`;
}
