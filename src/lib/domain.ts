import { z } from "zod";

export const sessionInput = z.object({
  goal: z.enum(["understand", "presentation", "compare"]),
  level: z.enum(["beginner", "familiar", "advanced"]),
  duration: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  language: z.literal("en"),
  sourceVersionIds: z.array(z.string().min(1)).min(1).max(5),
});

export const interactionInput = z.object({
  type: z.enum(["ask", "explain_this", "i_know_this"]),
  text: z.string().trim().max(2000),
  expectedRevision: z.number().int().positive(),
  cursorVersion: z.number().int().nonnegative(),
});

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "NOT_FOUND"
  | "SOURCE_UNSUPPORTED"
  | "SOURCE_NOT_READY"
  | "SOURCE_LIMIT_EXCEEDED"
  | "INSUFFICIENT_EVIDENCE"
  | "REVISION_CONFLICT"
  | "CONSENT_REQUIRED"
  | "QUOTA_EXCEEDED"
  | "PROVIDER_UNAVAILABLE"
  | "TRANSCRIPT_REQUIRED"
  | "BASELINE_UNAVAILABLE"
  | "INVALID_REQUEST";

export function apiError(code: ApiErrorCode, message: string, status = 400, retryable = false) {
  return Response.json(
    { error: { code, message, retryable }, request_id: crypto.randomUUID() },
    { status },
  );
}

export function apiData<T>(data: T, status = 200) {
  return Response.json({ data, request_id: crypto.randomUUID() }, { status });
}

export function requireIdempotency(request: Request) {
  const key = request.headers.get("Idempotency-Key");
  if (!key || key.length < 8 || key.length > 200) {
    return apiError("INVALID_REQUEST", "A valid Idempotency-Key header is required.", 400);
  }
  return null;
}

export function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "::1" || host.endsWith(".local")) return false;
    if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return false;
    const match = host.match(/^172\.(\d+)\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return false;
    if (/^169\.254\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export const providers = {
  database: Boolean(process.env.DATABASE_URL),
  storage: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  generation: Boolean(process.env.OPENAI_API_KEY || process.env.AI_GATEWAY_API_KEY),
  auth: Boolean(process.env.AUTH_SECRET),
};

export const livePrivatePathReady = Object.values(providers).every(Boolean);
