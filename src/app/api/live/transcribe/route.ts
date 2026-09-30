import { del, put } from "@vercel/blob";
import { AiProviderError, getAiProvider } from "@/lib/ai/provider";
import { apiData, apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);

function providerCode(error: unknown) {
  if (error instanceof AiProviderError) return error.code;
  const candidate = error as { statusCode?: number; status?: number; message?: string };
  const status = candidate?.statusCode ?? candidate?.status;
  if (status === 429) return "AI_RATE_LIMIT";
  return "AI_PROVIDER_FAILED";
}

export async function POST(request: Request) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to transcribe a private explanation.", 401);

  const form = await request.formData().catch(() => null);
  const sessionId = form?.get("sessionId");
  const audio = form?.get("audio");
  if (typeof sessionId !== "string" || !(audio instanceof File) || !AUDIO_TYPES.has(audio.type) || audio.size < 1 || audio.size > MAX_AUDIO_BYTES) {
    return apiError("INVALID_REQUEST", "Record up to 3 MB of WebM, MP4, MP3, WAV, or OGG audio.", 400);
  }

  const { data: session } = await user.supabase.from("sessions").select("id,active_revision_id").eq("id", sessionId).single();
  if (!session?.active_revision_id) return apiError("NOT_FOUND", "Session not found.", 404);

  const { data: rawConsent } = await user.supabase.from("consents").select("enabled").eq("type", "raw_audio_retention").eq("policy_version", "numa-v1").maybeSingle();
  const extension = audio.type === "audio/mp4" ? "m4a" : audio.type.split("/")[1].replace("mpeg", "mp3");
  const pathname = `${user.id}/teachbacks/${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await audio.arrayBuffer());
  let storedPath: string | null = null;

  try {
    const aiProvider = getAiProvider();
    const stored = await put(pathname, new Blob([bytes.buffer], { type: audio.type }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: audio.type,
    });
    storedPath = stored.pathname;

    const result = await aiProvider.transcribe(bytes);
    const transcript = result.text.trim();
    if (!transcript) throw new Error("EMPTY_TRANSCRIPT");

    const keepRaw = rawConsent?.enabled === true;
    const { data, error } = await user.supabase.from("teachbacks").insert({
      owner_id: user.id,
      session_id: session.id,
      revision_id: session.active_revision_id,
      prompt: "Explain the key idea and one important limitation.",
      raw_audio_key: keepRaw ? storedPath : null,
      transcript,
      edited_transcript: transcript,
      status: "transcribed",
    }).select("id,status,edited_transcript,created_at").single();
    if (error) throw new Error("PERSISTENCE_FAILED");
    if (!keepRaw) {
      await del(storedPath);
      storedPath = null;
    }
    return apiData({ ...data, language: result.language ?? null, rawAudioRetained: keepRaw }, 201);
  } catch (error) {
    if (storedPath && rawConsent?.enabled !== true) await del(storedPath).catch(() => undefined);
    const code = providerCode(error);
    if (code === "AI_PROVIDER_NOT_CONFIGURED") return apiError(code, "Preview speech transcription is not configured yet. You can still type and save your explanation.", 503);
    if (code === "AI_DAILY_LIMIT_REACHED") return apiError(code, "The Preview AI daily free allowance has been reached. Try again after it resets.", 429);
    if (code === "AI_RATE_LIMIT") return apiError(code, "Speech transcription is temporarily rate limited. Try again or type your explanation.", 429, true);
    return apiError(code, "Speech transcription failed. You can still type and save your explanation.", 503, true);
  }
}
