import { apiError, isPublicHttpUrl, requireIdempotency } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to import a private source.", 401);

  const body = (await request.json().catch(() => null)) as { public_pdf_url?: string } | null;
  if (!body?.public_pdf_url || !isPublicHttpUrl(body.public_pdf_url)) {
    return apiError("SOURCE_UNSUPPORTED", "Use a public HTTP(S) URL that does not resolve to a private network.", 422);
  }
  return apiError("PROVIDER_UNAVAILABLE", "Public-URL importing is not enabled in v1; upload the PDF privately in /workspace.", 501);
}
