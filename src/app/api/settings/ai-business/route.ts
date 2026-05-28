import { NextResponse } from "next/server";
import { defaultAiBusinessSettings, type AiBusinessSettings } from "@/lib/ai-business-settings";
import { getAiBusinessSettings, saveAiBusinessSettings } from "@/lib/services/ai-business-settings-service";

export async function GET() {
  const settings = await getAiBusinessSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<AiBusinessSettings>;
  const settings = await saveAiBusinessSettings({
    agentName: body.agentName ?? defaultAiBusinessSettings.agentName,
    prices: body.prices ?? defaultAiBusinessSettings.prices,
    address: body.address ?? defaultAiBusinessSettings.address,
    hours: body.hours ?? defaultAiBusinessSettings.hours
  });

  return NextResponse.json({ settings });
}
