import { get } from "@vercel/blob";
import { apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to play private audio.", 401);
  const { id } = await params;
  const { data: chapter } = await user.supabase.from("chapters").select("audio_key").eq("id", id).eq("status", "ready").single();
  if (!chapter?.audio_key) return apiError("NOT_FOUND", "Audio not found.", 404);
  const blob = await get(chapter.audio_key, { access: "private", useCache: false });
  if (!blob?.stream) return apiError("NOT_FOUND", "Audio not found.", 404);
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "audio/mpeg",
      "Content-Length": String(blob.blob.size),
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${id}.mp3"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
