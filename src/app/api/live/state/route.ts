import { apiData, apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const user = await getVerifiedUser();
  if (!user) return apiError("AUTH_REQUIRED", "Sign in to view your private workspace.", 401);

  const [sources, jobs, sessions, chapters, consents, evidence, outcomes, reviewCheckpoints, changeSets] = await Promise.all([
    user.supabase.from("sources").select("id,title,origin_type,created_at,source_versions(id,status,added_at,extracted_word_count,content_hash)").is("deleted_at", null).order("created_at", { ascending: false }),
    user.supabase.from("jobs").select("id,type,state,checkpoint,error_code,result,workflow_run_id,created_at,updated_at").order("created_at", { ascending: false }).limit(25),
    user.supabase.from("sessions").select("id,goal_type,goal_details,level,duration_target,state,active_revision_id,created_at,topics(title,question)").order("created_at", { ascending: false }),
    user.supabase.from("chapters").select("id,objective,duration_ms,status,created_at").eq("status", "ready").order("created_at", { ascending: false }).limit(10),
    user.supabase.from("consents").select("type,enabled,policy_version,updated_at"),
    user.supabase.from("concept_evidence").select("id,type,evidence_text,created_at,rejected_at,concepts(label,description)").is("rejected_at", null).order("created_at", { ascending: false }),
    user.supabase.from("outcomes").select("id,session_id,type,content,version,user_edited_at,status,updated_at").order("updated_at", { ascending: false }),
    user.supabase.from("review_checkpoints").select("id,topic_id,snapshot_id,marked_reviewed_at,source_snapshots(version_ids)").order("marked_reviewed_at", { ascending: false }),
    user.supabase.from("change_sets").select("id,topic_id,baseline_id,new_snapshot_id,items,state,created_at").order("created_at", { ascending: false }),
  ]);
  const firstError = [sources, jobs, sessions, chapters, consents, evidence, outcomes, reviewCheckpoints, changeSets].find((result) => result.error)?.error;
  if (firstError) return apiError("PROVIDER_UNAVAILABLE", "The private workspace could not be loaded.", 503, true);

  return apiData({
    user: { id: user.id, email: user.email },
    sources: sources.data ?? [],
    jobs: jobs.data ?? [],
    sessions: sessions.data ?? [],
    chapters: chapters.data ?? [],
    consents: consents.data ?? [],
    evidence: evidence.data ?? [],
    outcomes: outcomes.data ?? [],
    reviewCheckpoints: reviewCheckpoints.data ?? [],
    changeSets: changeSets.data ?? [],
  });
}
