import { z } from "zod";
import { apiData, apiError, requireIdempotency } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

const teachbackInput = z.object({
  sessionId: z.string().uuid(),
  transcript: z.string().trim().min(20).max(10000),
  prompt: z.string().trim().min(3).max(1000),
});

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to save an explain-back.", 401);
  const parsed = teachbackInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "A confirmed transcript and session are required.", 400);
  const { data: session } = await user.supabase.from("sessions").select("id,active_revision_id").eq("id", parsed.data.sessionId).single();
  if (!session?.active_revision_id) return apiError("NOT_FOUND", "Session not found.", 404);
  const { data, error } = await user.supabase.from("teachbacks").insert({
    owner_id: user.id,
    session_id: session.id,
    revision_id: session.active_revision_id,
    prompt: parsed.data.prompt,
    transcript: parsed.data.transcript,
    edited_transcript: parsed.data.transcript,
    status: "user_confirmed",
  }).select("id,status,edited_transcript,created_at").single();
  if (error) return apiError("PROVIDER_UNAVAILABLE", "The confirmed transcript could not be saved.", 503, true);
  return apiData({
    ...data,
    assessment: { state: "blocked", code: "AI_CREDITS_REQUIRED", message: "The transcript is saved. Grounded assessment starts when AI Gateway billing access is enabled." },
  }, 201);
}

