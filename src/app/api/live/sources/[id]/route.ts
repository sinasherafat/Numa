import { del } from "@vercel/blob";
import { apiData, apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to delete a private source.", 401);
  const { id } = await params;
  const { data, error } = await user.supabase.from("source_versions").select("file_key").eq("source_id", id);
  if (error || !data?.length) return apiError("NOT_FOUND", "Source not found.", 404);
  const keys = data.map((row) => row.file_key).filter((value): value is string => typeof value === "string");
  try {
    if (keys.length) await del(keys);
  } catch {
    return apiError("PROVIDER_UNAVAILABLE", "Private source storage could not be deleted; database records were preserved.", 503, true);
  }
  const { data: removed, error: removeError } = await user.supabase.rpc("delete_owned_source", { p_source_id: id });
  if (removeError || removed !== true) return apiError("NOT_FOUND", "Source not found.", 404);
  return apiData({ deleted: true });
}

