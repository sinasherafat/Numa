import { z } from "zod";
import { apiData, apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

const consentInput = z.object({
  type: z.enum(["learning_memory", "raw_audio_retention"]),
  enabled: z.boolean(),
});

export async function POST(request: Request) {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to update private consent.", 401);
  const parsed = consentInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return apiError("INVALID_REQUEST", "The consent choice is invalid.", 400);
  const { data, error } = await user.supabase.from("consents").upsert({
    user_id: user.id,
    type: parsed.data.type,
    enabled: parsed.data.enabled,
    policy_version: "numa-v1",
    retention_choice: parsed.data.type === "raw_audio_retention" ? (parsed.data.enabled ? "keep" : "delete_after_processing") : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,type,policy_version" }).select("type,enabled,policy_version,updated_at").single();
  if (error) return apiError("PROVIDER_UNAVAILABLE", "Consent could not be saved.", 503, true);
  return apiData(data);
}

