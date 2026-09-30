import { redirect } from "next/navigation";
import { LiveWorkspace } from "@/components/live-workspace";
import { getVerifiedUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getVerifiedUser();
  if (!user) redirect("/login?next=/workspace");
  return <LiveWorkspace />;
}

