import { db } from "@/lib/db/client";
import { crmNotifications } from "@/lib/db/schema";
import { SYSTEM_USER_ID } from "@/lib/constants";

type CreateCrmNotificationInput = {
  leadId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  type: "payment_receipt" | "purchase_intent" | "pending_lead" | "human_required" | "human_requested";
  title: string;
  body: string;
  payload?: Record<string, unknown>;
};

export async function createCrmNotification(input: CreateCrmNotificationInput) {
  const [notification] = await db
    .insert(crmNotifications)
    .values({
      lead_id: input.leadId ?? null,
      conversation_id: input.conversationId ?? null,
      message_id: input.messageId ?? null,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: input.payload ?? {},
      modified_by: SYSTEM_USER_ID
    })
    .returning();

  return notification;
}
