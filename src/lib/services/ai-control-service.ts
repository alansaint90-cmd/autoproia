import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

export const aiControlSettingsKey = "auto-pro-ia:ai-control";

export type AiControlSettings = {
  whatsappPaused: boolean;
  pausedReason: string;
  updatedAt?: string;
};

const defaultAiControlSettings: AiControlSettings = {
  whatsappPaused: false,
  pausedReason: ""
};

function normalizeAiControlSettings(value: unknown): AiControlSettings {
  const partial = typeof value === "object" && value !== null ? (value as Partial<AiControlSettings>) : {};

  return {
    whatsappPaused: Boolean(partial.whatsappPaused),
    pausedReason: partial.pausedReason?.trim() ?? "",
    updatedAt: partial.updatedAt
  };
}

export async function getAiControlSettings() {
  try {
    const [record] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, aiControlSettingsKey))
      .limit(1);

    return normalizeAiControlSettings(record?.value);
  } catch (error) {
    console.warn("[ai-control] using defaults", error);
    return defaultAiControlSettings;
  }
}

export async function saveAiControlSettings(input: Partial<AiControlSettings>) {
  const settings = normalizeAiControlSettings({
    ...defaultAiControlSettings,
    ...input,
    updatedAt: new Date().toISOString()
  });

  await db
    .insert(appSettings)
    .values({
      key: aiControlSettingsKey,
      value: settings as unknown as Record<string, unknown>
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value: settings as unknown as Record<string, unknown>,
        updated_at: new Date()
      }
    });

  return settings;
}

export async function isWhatsAppAiPaused() {
  const settings = await getAiControlSettings();
  return settings.whatsappPaused;
}
