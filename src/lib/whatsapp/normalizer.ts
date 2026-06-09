import type { EvolutionWebhookInput } from "@/lib/validators/evolution";

export type NormalizedInboundMessage = {
  externalChatId: string;
  externalMessageId?: string;
  phone: string;
  leadName?: string;
  avatarUrl?: string;
  text: string;
  messageType?: string;
  media?: {
    type: "audio" | "image" | "video" | "document";
    fileName?: string;
    caption?: string;
    mimeType?: string;
    url?: string;
  };
  fromMe: boolean;
};

export function normalizeEvolutionMessage(input: EvolutionWebhookInput): NormalizedInboundMessage | null {
  const extracted = extractMessage(input.data.message);
  const text = extracted.text;

  if (!text.trim()) {
    return null;
  }

  return {
    externalChatId: input.data.key.remoteJid,
    externalMessageId: input.data.key.id,
    phone: input.data.key.remoteJid.replace(/\D/g, ""),
    leadName: input.data.pushName,
    avatarUrl: input.data.profilePictureUrl ?? input.data.profilePicUrl ?? input.data.picture,
    text,
    messageType: input.data.messageType,
    media: extracted.media,
    fromMe: input.data.key.fromMe
  };
}

function extractMessage(message: Record<string, unknown> | undefined): Pick<NormalizedInboundMessage, "text" | "media"> {
  if (!message) return { text: "" };

  const unwrapped = unwrapMessage(message);

  const conversation = unwrapped.conversation;
  if (typeof conversation === "string") return { text: conversation };

  const extended = unwrapped.extendedTextMessage;
  if (isRecord(extended) && typeof extended.text === "string") return { text: extended.text };

  const image = unwrapped.imageMessage;
  if (isRecord(image)) {
    const caption = getString(image.caption);
    return {
      text: caption || "[imagem recebida]",
      media: {
        type: "image",
        caption,
        mimeType: getString(image.mimetype) ?? getString(image.mimeType),
        url: getString(image.url)
      }
    };
  }

  const audio = unwrapped.audioMessage;
  if (isRecord(audio)) {
    return {
      text: "[audio recebido]",
      media: {
        type: "audio",
        mimeType: getString(audio.mimetype) ?? getString(audio.mimeType),
        url: getString(audio.url)
      }
    };
  }

  const video = unwrapped.videoMessage;
  if (isRecord(video)) {
    const caption = getString(video.caption);
    return {
      text: caption || "[video recebido]",
      media: {
        type: "video",
        caption,
        mimeType: getString(video.mimetype) ?? getString(video.mimeType),
        url: getString(video.url)
      }
    };
  }

  const document = unwrapped.documentMessage;
  if (isRecord(document)) {
    const fileName = getString(document.fileName);
    const caption = getString(document.caption);
    return {
      text: caption || (fileName ? `[documento recebido: ${fileName}]` : "[documento recebido]"),
      media: {
        type: "document",
        fileName,
        caption,
        mimeType: getString(document.mimetype) ?? getString(document.mimeType),
        url: getString(document.url)
      }
    };
  }

  return { text: "" };
}

function unwrapMessage(message: Record<string, unknown>) {
  const wrappers = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "documentWithCaptionMessage"
  ];

  let current = message;
  for (const wrapper of wrappers) {
    const wrapped = current[wrapper];
    if (isRecord(wrapped) && isRecord(wrapped.message)) {
      current = wrapped.message;
    }
  }

  return current;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
