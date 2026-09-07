import { apiError, isPublicHttpUrl, livePrivatePathReady, requireIdempotency } from "@/lib/domain";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const idempotencyError = requireIdempotency(request);
  if (idempotencyError) return idempotencyError;

  const body = (await request.json().catch(() => null)) as { public_pdf_url?: string } | null;
  if (!body?.public_pdf_url || !isPublicHttpUrl(body.public_pdf_url)) {
    return apiError("SOURCE_UNSUPPORTED", "Use a public HTTP(S) URL that does not resolve to a private network.", 422);
  }
  if (!livePrivatePathReady) {
    return apiError("PROVIDER_UNAVAILABLE", "Private source processing needs database, storage, authentication, and generation providers.", 503, true);
  }
  return apiError("PROVIDER_UNAVAILABLE", "The configured document worker has not been activated for this deployment.", 503, true);
}
