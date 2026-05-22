import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

type RealtimeEvent = {
  type: "message.created" | "conversation.updated" | "handoff.changed";
  conversationId: string;
  payload: Record<string, unknown>;
};

export async function publishRealtimeEvent(event: RealtimeEvent) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return;
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  await supabase.channel(env.SUPABASE_REALTIME_CHANNEL).send({
    type: "broadcast",
    event: event.type,
    payload: event
  });
}
