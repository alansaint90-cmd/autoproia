import { eq } from "drizzle-orm";
import {
  aiBusinessSettingsKey,
  defaultAiBusinessSettings,
  type AiBusinessSettings
} from "@/lib/ai-business-settings";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

function normalizeSettings(value: unknown): AiBusinessSettings {
  const partial = typeof value === "object" && value !== null ? (value as Partial<AiBusinessSettings>) : {};

  return {
    agentName: partial.agentName?.trim() || defaultAiBusinessSettings.agentName,
    prices: partial.prices?.trim() || defaultAiBusinessSettings.prices,
    address: partial.address?.trim() || defaultAiBusinessSettings.address,
    hours: partial.hours?.trim() || defaultAiBusinessSettings.hours,
    customPrompt: partial.customPrompt?.trim() || defaultAiBusinessSettings.customPrompt,
    triagePrompt: partial.triagePrompt?.trim() || defaultAiBusinessSettings.triagePrompt,
    sdrPrompt: partial.sdrPrompt?.trim() || defaultAiBusinessSettings.sdrPrompt,
    orchestratorPrompt: partial.orchestratorPrompt?.trim() || defaultAiBusinessSettings.orchestratorPrompt,
    supervisorPrompt: partial.supervisorPrompt?.trim() || defaultAiBusinessSettings.supervisorPrompt
  };
}

export async function getAiBusinessSettings(): Promise<AiBusinessSettings> {
  try {
    const [record] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, aiBusinessSettingsKey))
      .limit(1);

    return normalizeSettings(record?.value);
  } catch (error) {
    console.warn("[ai-business-settings] using defaults", error);
    return defaultAiBusinessSettings;
  }
}

export async function saveAiBusinessSettings(input: AiBusinessSettings) {
  const settings = normalizeSettings(input);

  await db
    .insert(appSettings)
    .values({
      key: aiBusinessSettingsKey,
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
