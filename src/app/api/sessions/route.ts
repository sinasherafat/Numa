import { apiData, apiError, livePrivatePathReady, requireIdempotency, sessionInput } from "@/lib/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;
  const parsed = sessionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "The session request is incomplete or outside v1 limits.", 422);
  if (!livePrivatePathReady) {
    return apiError("PROVIDER_UNAVAILABLE", "Private sessions require configured database, storage, authentication, and generation providers. Try the labeled sample workspace.", 503, true);
  }
  return apiData({ session_id: crypto.randomUUID(), state: "draft", goal: parsed.data.goal }, 201);
}
