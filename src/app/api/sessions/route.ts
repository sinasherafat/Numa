import { apiError, requireIdempotency, sessionInput } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to create a private session.", 401);
  const parsed = sessionInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "The session request is incomplete or outside v1 limits.", 422);
  return apiError("INVALID_REQUEST", "Create a private session from /workspace so its source snapshot, durable job, and revision are persisted together.", 409);
}
