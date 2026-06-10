import { env } from "@/lib/env";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/normalizer";

type AudioMedia = NonNullable<NormalizedInboundMessage["media"]>;

export type AudioTranscriptionResult = {
  status: "transcribed" | "unavailable" | "error";
  text: string;
  reason?: string;
};

const openAiTranscriptionUrl = "https://api.openai.com/v1/audio/transcriptions";
const transcriptionModel = "whisper-1";

export async function transcribeInboundAudio(media: AudioMedia): Promise<AudioTranscriptionResult> {
  if (media.type !== "audio") {
    return { status: "unavailable", text: "", reason: "Midia recebida nao e audio." };
  }

  try {
    const audio = await getAudioBlob(media);
    if (!audio) {
      return {
        status: "unavailable",
        text: "",
        reason: "Audio recebido sem URL ou base64 disponivel para transcricao."
      };
    }

    const formData = new FormData();
    formData.append("model", transcriptionModel);
    formData.append("file", audio.blob, audio.fileName);
    formData.append("language", "pt");
    formData.append("response_format", "json");

    const response = await fetch(openAiTranscriptionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`
      },
      body: formData
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        status: "error",
        text: "",
        reason: `OpenAI transcription failed: ${response.status} ${body.slice(0, 240)}`
      };
    }

    const data = await response.json().catch(() => null) as { text?: string } | null;
    const text = data?.text?.trim();
    if (!text) {
      return { status: "unavailable", text: "", reason: "OpenAI nao retornou texto para o audio." };
    }

    return { status: "transcribed", text };
  } catch (error) {
    return {
      status: "error",
      text: "",
      reason: error instanceof Error ? error.message : "Falha desconhecida ao transcrever audio."
    };
  }
}

async function getAudioBlob(media: AudioMedia) {
  if (media.base64) {
    const buffer = Buffer.from(stripDataUrlPrefix(media.base64), "base64");
    return {
      blob: new Blob([buffer], { type: media.mimeType || "audio/ogg" }),
      fileName: fileNameForMime(media.mimeType)
    };
  }

  if (!media.url) return null;

  const response = await fetch(media.url, {
    headers: {
      apikey: env.EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Falha ao baixar audio da Evolution: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? media.mimeType ?? "audio/ogg";
  const buffer = await response.arrayBuffer();

  return {
    blob: new Blob([buffer], { type: contentType }),
    fileName: fileNameForMime(contentType)
  };
}

function stripDataUrlPrefix(value: string) {
  const [, payload] = value.match(/^data:[^;]+;base64,(.+)$/i) ?? [];
  return payload ?? value;
}

function fileNameForMime(mimeType?: string | null) {
  if (mimeType?.includes("mpeg") || mimeType?.includes("mp3")) return "audio.mp3";
  if (mimeType?.includes("wav")) return "audio.wav";
  if (mimeType?.includes("webm")) return "audio.webm";
  if (mimeType?.includes("mp4")) return "audio.mp4";
  return "audio.ogg";
}
