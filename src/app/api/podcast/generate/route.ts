import { AiProviderError, getAiProvider } from "@/lib/ai/provider";
import { apiError } from "@/lib/domain";
import { podcastInputSchema, streamPodcast } from "@/lib/ai/podcast";

export const runtime = "nodejs";
export const maxDuration = 180;

const MAX_BODY_BYTES = 160 * 1024;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 2;
const recentRequests = new Map<string, { startedAt: number; count: number }>();

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) return false;
  } catch {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin";
}

function isRateLimited(request: Request) {
  const address = request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim()
    ?? "shared-preview-client";
  const now = Date.now();
  for (const [key, entry] of recentRequests) {
    if (now - entry.startedAt >= RATE_LIMIT_WINDOW_MS) recentRequests.delete(key);
  }
  const current = recentRequests.get(address);
  if (current && now - current.startedAt < RATE_LIMIT_WINDOW_MS && current.count >= RATE_LIMIT_REQUESTS) return true;
  recentRequests.set(address, current && now - current.startedAt < RATE_LIMIT_WINDOW_MS
    ? { ...current, count: current.count + 1 }
    : { startedAt: now, count: 1 });
  while (recentRequests.size > 1000) recentRequests.delete(recentRequests.keys().next().value as string);
  return false;
}

export async function POST(request: Request) {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "preview") {
    return apiError("NOT_FOUND", "Podcast generation is available only in the Preview environment.", 404);
  }
  if (!sameOrigin(request)) return apiError("INVALID_REQUEST", "Start podcast generation from the Numa Preview page.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return apiError("INVALID_REQUEST", "Send the extracted PDF text as JSON.", 415);
  }
  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") return apiError("SOURCE_LIMIT_EXCEEDED", "The extracted PDF payload is too large for Preview processing.", 413);
    return apiError("INVALID_REQUEST", "The podcast request body is invalid JSON.", 400);
  }
  const parsed = podcastInputSchema.safeParse(body);
  if (!parsed.success) return apiError("INVALID_REQUEST", "Choose a valid text-based PDF of up to 4 MiB, 20 pages and 20,000 extracted characters, then agree to send its text to Cloudflare for generation.", 400);
  if (isRateLimited(request)) {
    return new Response(JSON.stringify({ error: { code: "QUOTA_EXCEEDED", message: "Preview allows two podcast attempts per client every ten minutes. Please wait and try again.", retryable: true } }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(RATE_LIMIT_WINDOW_MS / 1000), "Cache-Control": "no-store" },
    });
  }
  try {
    const provider = getAiProvider();
    return streamPodcast(parsed.data, provider);
  } catch (error) {
    if (error instanceof AiProviderError && error.code === "AI_PROVIDER_NOT_CONFIGURED") {
      return apiError("AI_PROVIDER_NOT_CONFIGURED", "Cloudflare Workers AI is unavailable for this Preview. No podcast was created.", 503);
    }
    return apiError("AI_PROVIDER_FAILED", "The podcast provider could not be started. No podcast was created.", 503, true);
  }
}
