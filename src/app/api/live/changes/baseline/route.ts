import { z } from "zod";
import { apiData, apiError, requireIdempotency } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

const baselineInput = z.object({
  sessionId: z.string().uuid(),
  sourceVersionIds: z.array(z.string().uuid()).min(1).max(5),
});

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to set a review baseline.", 401);
  const parsed = baselineInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new Set(parsed.data?.sourceVersionIds).size !== parsed.data?.sourceVersionIds.length) {
    return apiError("INVALID_REQUEST", "Choose one to five distinct ready source versions.", 400);
  }
  const { data: session } = await user.supabase.from("sessions").select("id,topic_id,active_revision_id").eq("id", parsed.data.sessionId).eq("owner_id", user.id).single();
  if (!session?.topic_id || !session.active_revision_id) return apiError("NOT_FOUND", "A ready private session is required to anchor a baseline.", 404);
  const { data: versions, error: versionError } = await user.supabase.from("source_versions")
    .select("id,status,content_hash,sources(topic_id)").eq("owner_id", user.id).in("id", parsed.data.sourceVersionIds).eq("status", "ready");
  if (versionError || !versions || versions.length !== parsed.data.sourceVersionIds.length) {
    return apiError("SOURCE_NOT_READY", "Every baseline source must be ready and belong to your account.", 409);
  }
  if (versions.some((version) => {
    const source = Array.isArray(version.sources) ? version.sources[0] : version.sources;
    return source?.topic_id !== session.topic_id;
  })) return apiError("INVALID_REQUEST", "All baseline sources must belong to the active topic.", 400);
  const { data: snapshot, error: snapshotError } = await user.supabase.from("source_snapshots")
    .insert({ owner_id: user.id, topic_id: session.topic_id, version_ids: parsed.data.sourceVersionIds })
    .select("id,version_ids,created_at").single();
  if (snapshotError || !snapshot) return apiError("PROVIDER_UNAVAILABLE", "The explicit source baseline could not be saved.", 503, true);
  const { data: checkpoint, error: checkpointError } = await user.supabase.from("review_checkpoints")
    .insert({ owner_id: user.id, topic_id: session.topic_id, snapshot_id: snapshot.id, session_revision_id: session.active_revision_id })
    .select("id,marked_reviewed_at").single();
  if (checkpointError || !checkpoint) return apiError("PROVIDER_UNAVAILABLE", "The source snapshot was saved but its review checkpoint could not be recorded.", 503, true);
  return apiData({ ...checkpoint, snapshotId: snapshot.id, topicId: session.topic_id, sourceVersionIds: snapshot.version_ids, sourceHashes: versions.map((item) => ({ id: item.id, sha256: item.content_hash })) }, 201);
}
