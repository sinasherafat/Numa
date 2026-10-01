import { getSupabaseConfig } from "@/lib/supabase/config";

function getWorkflowSecret() {
  const value = process.env.NUMA_WORKFLOW_SECRET;
  if (!value) throw new Error("WORKFLOW_CONFIG_MISSING");
  return value;
}

export async function workflowRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { url, publishableKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      "Content-Type": "application/json",
      "Content-Profile": "numa",
      Accept: "application/json",
    },
    body: JSON.stringify({ p_secret: getWorkflowSecret(), ...body }),
  });
  if (!response.ok) {
    throw new Error(response.status >= 500 ? "DATABASE_RETRYABLE" : "DATABASE_OPERATION_FAILED");
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

