import type { EvolutionWebhookInput } from "@/lib/validators/evolution";

export type NormalizedInboundMessage = {
  externalChatId: string;
  externalMessageId?: string;
  phone: string;
  leadName?: string;
  text: string;
  fromMe: boolean;
};

export function normalizeEvolutionMessage(input: EvolutionWebhookInput): NormalizedInboundMessage | null {
  const text = extractText(input.data.message);

  if (!text.trim()) {
    return null;
  }

  return {
    externalChatId: input.data.key.remoteJid,
    externalMessageId: input.data.key.id,
    phone: input.data.key.remoteJid.replace(/\D/g, ""),
    leadName: input.data.pushName,
    text,
    fromMe: input.data.key.fromMe
  };
}

function extractText(message: Record<string, unknown> | undefined) {
  if (!message) return "";

  const conversation = message.conversation;
  if (typeof conversation === "string") return conversation;

  const extended = message.extendedTextMessage;
  if (isRecord(extended) && typeof extended.text === "string") return extended.text;

  const image = message.imageMessage;
  if (isRecord(image) && typeof image.caption === "string") return image.caption;

  return "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
