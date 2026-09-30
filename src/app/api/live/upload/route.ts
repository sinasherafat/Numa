import { del, get } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { start } from "workflow/api";
import { z } from "zod";
import { getAiProvider, PREVIEW_LIMITS } from "@/lib/ai/provider";
import { apiError } from "@/lib/domain";
import { getVerifiedUser } from "@/lib/supabase/server";
import { workflowRpc } from "@/lib/workflow-db";
import { ingestSourceWorkflow } from "@/workflows/source-ingest";

export const runtime = "nodejs";
export const maxDuration = 60;

const payloadSchema = z.object({
  title: z.string().trim().min(1).max(300),
  goal: z.enum(["understand", "presentation", "compare"]),
  question: z.string().trim().min(3).max(500),
  level: z.enum(["beginner", "familiar", "advanced"]),
  duration: z.literal(5),
  aiProcessingNoticeAccepted: z.literal(true),
  idempotencyKey: z.string().min(8).max(200),
});

type UploadTokenPayload = z.infer<typeof payloadSchema> & { ownerId: string };
type SourceJobResult = {
  job_id: string | null;
  duplicate: boolean;
  state: string;
  file_key?: string | null;
  workflow_run_id?: string | null;
};

async function readPrivateBlob(pathname: string) {
  const blob = await get(pathname, { access: "private", useCache: false });
  if (!blob?.stream) throw new Error("SOURCE_MISSING");
  if (blob.blob.size > PREVIEW_LIMITS.pdfBytes) throw new Error("SOURCE_LIMIT_EXCEEDED");
  return new Uint8Array(await new Response(blob.stream).arrayBuffer());
}

export async function POST(request: Request) {
  let body: HandleUploadBody;
  let stage = "read_upload_event";
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return apiError("INVALID_REQUEST", "The upload request is invalid.", 400);
  }
  stage = body.type === "blob.upload-completed" ? "verify_upload_callback" : "authorize_upload";

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        stage = "authorize_upload";
        const user = await getVerifiedUser();
        if (!user) throw new Error("AUTH_REQUIRED");
        const parsed = payloadSchema.safeParse(clientPayload ? JSON.parse(clientPayload) : null);
        if (!parsed.success || !/^uploads\/[a-f0-9-]{36}\.pdf$/i.test(pathname)) {
          throw new Error("INVALID_REQUEST");
        }
        getAiProvider();
        const tokenPayload: UploadTokenPayload = { ...parsed.data, ownerId: user.id };
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: PREVIEW_LIMITS.pdfBytes,
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify(tokenPayload),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        stage = "verify_upload_callback";
        const parsed = z.object({ ownerId: z.string().uuid() }).and(payloadSchema).parse(JSON.parse(tokenPayload ?? "null"));
        let bytes: Uint8Array;
        let status: "processing" | "unsupported" | "failed" = "processing";
        let errorCode: string | null = null;
        try {
          stage = "read_private_blob";
          bytes = await readPrivateBlob(blob.pathname);
          if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
            status = "unsupported";
            errorCode = "SOURCE_UNSUPPORTED";
          }
        } catch (error) {
            status = error instanceof Error && error.message === "SOURCE_LIMIT_EXCEEDED" ? "failed" : "unsupported";
          errorCode = error instanceof Error ? error.message : "SOURCE_VALIDATION_FAILED";
          bytes = new Uint8Array();
        }
        const digest = await crypto.subtle.digest("SHA-256", Uint8Array.from(bytes).buffer);
        const contentHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
        const input = {
          fileKey: blob.pathname,
          goal: parsed.goal,
          question: parsed.question,
          level: parsed.level,
          duration: parsed.duration,
        };
        stage = "persist_source_job";
        const job = await workflowRpc<SourceJobResult>("workflow_create_source_job", {
          p_owner_id: parsed.ownerId,
          p_title: parsed.title,
          p_content_hash: contentHash,
          p_file_key: blob.pathname,
          p_idempotency_key: parsed.idempotencyKey,
          p_input: input,
          p_status: status,
          p_error_code: errorCode,
        });
        if (job.duplicate && job.file_key !== blob.pathname) {
          stage = "remove_duplicate_blob";
          await del(blob.pathname);
          return;
        }
        if (status !== "processing" || !job.job_id || job.workflow_run_id) return;
        try {
          stage = "start_source_workflow";
          const run = await start(ingestSourceWorkflow, [job.job_id]);
          stage = "attach_source_workflow";
          await workflowRpc<void>("workflow_attach_run", { p_job_id: job.job_id, p_run_id: run.runId });
        } catch (error) {
          console.error("Numa source workflow dispatch failed", { stage, code: error instanceof Error ? error.message : "UNKNOWN" });
          await workflowRpc<void>("workflow_fail", { p_job_id: job.job_id, p_error_code: "WORKFLOW_START_FAILED", p_retryable: true });
        }
      },
    });
    return Response.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "UPLOAD_FAILED";
    console.error("Numa upload request failed", { stage, code });
    if (code === "AUTH_REQUIRED") return apiError("AUTH_REQUIRED", "Sign in to upload a private source.", 401);
    if (code === "AI_PROVIDER_NOT_CONFIGURED") return apiError("AI_PROVIDER_NOT_CONFIGURED", "Preview AI needs Cloudflare account credentials before private source processing can start.", 503);
    if (stage === "verify_upload_callback") return apiError("UPLOAD_CALLBACK_INVALID", "Vercel Blob did not authenticate its private upload callback.", 400);
    if (["persist_source_job", "attach_source_workflow", "start_source_workflow"].includes(stage)) {
      return apiError("SOURCE_JOB_PERSISTENCE_FAILED", "The PDF was privately uploaded but its processing job could not be recorded. Retry after checking the Preview Workflow connection.", 503, true);
    }
    return apiError("INVALID_REQUEST", "The private PDF upload could not be authorized.", 400);
  }
}
