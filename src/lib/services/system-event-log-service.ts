import { SYSTEM_USER_ID } from "@/lib/constants";
import { db } from "@/lib/db/client";
import { systemEventLogs } from "@/lib/db/schema";

type SystemEventSeverity = "info" | "success" | "warning" | "error";

type LogSystemEventInput = {
  source: string;
  event: string;
  severity?: SystemEventSeverity;
  message: string;
  leadId?: string | null;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
  modifiedBy?: string;
};

export async function logSystemEvent(input: LogSystemEventInput) {
  try {
    await db.insert(systemEventLogs).values({
      source: input.source.slice(0, 120),
      event: input.event.slice(0, 160),
      severity: input.severity ?? "info",
      message: input.message.slice(0, 1200),
      lead_id: input.leadId ?? null,
      conversation_id: input.conversationId ?? null,
      metadata: sanitizeMetadata(input.metadata ?? {}),
      modified_by: input.modifiedBy ?? SYSTEM_USER_ID
    });
  } catch (error) {
    console.warn("[system-event-log] failed to persist event", {
      source: input.source,
      event: input.event,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  return JSON.parse(
    JSON.stringify(metadata, (_key, value) => {
      if (value instanceof Date) return value.toISOString();
      if (value instanceof Error) return { name: value.name, message: value.message };
      if (typeof value === "bigint") return value.toString();
      return value;
    })
  ) as Record<string, unknown>;
}
