import { get, put } from "@vercel/blob";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import { FatalError, RetryableError } from "workflow";
import { AiProviderError, getAiProvider, PREVIEW_LIMITS } from "@/lib/ai/provider";
import { workflowRpc } from "@/lib/workflow-db";

type ClaimedJob = {
  id: string;
  owner_id: string;
  input_version: string;
  state: string;
  result?: { input?: IngestInput };
  _claimed?: boolean;
};

type IngestInput = {
  fileKey: string;
  goal: "understand" | "presentation" | "compare";
  question: string;
  level: "beginner" | "familiar" | "advanced";
  duration: 5 | 10 | 20;
};

const planSchema = z.object({
  title: z.string().min(1).max(160),
  question: z.string().min(1).max(500),
  goal: z.enum(["understand", "presentation", "compare"]),
  level: z.enum(["beginner", "familiar", "advanced"]),
  duration: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  objective: z.string().min(1).max(500),
  dialogue: z.array(z.object({
    speaker: z.enum(["host_a", "host_b"]),
    text: z.string().min(1).max(450),
    page: z.number().int().positive(),
  })).min(2).max(8),
  notes: z.array(z.string().min(1).max(350)).min(1).max(6),
  flashcards: z.array(z.object({ front: z.string().min(1).max(160), back: z.string().min(1).max(300), page: z.number().int().positive() })).max(6),
  outline: z.array(z.object({ title: z.string().min(1).max(120), points: z.array(z.string().min(1).max(240)).min(1).max(4) })).min(1).max(5),
});

async function claimJob(jobId: string) {
  "use step";
  return workflowRpc<ClaimedJob>("workflow_claim", { p_job_id: jobId });
}
claimJob.maxRetries = 2;

async function checkpoint(jobId: string, value: string) {
  "use step";
  await workflowRpc<void>("workflow_checkpoint", { p_job_id: jobId, p_checkpoint: value });
}
checkpoint.maxRetries = 2;

async function extractPdf(input: IngestInput) {
  "use step";
  const blob = await get(input.fileKey, { access: "private", useCache: false });
  if (!blob || !blob.stream) throw new FatalError("SOURCE_MISSING");
  if (blob.blob.size > PREVIEW_LIMITS.pdfBytes) throw new FatalError("SOURCE_LIMIT_EXCEEDED");
  const bytes = new Uint8Array(await new Response(blob.stream).arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new FatalError("SOURCE_UNSUPPORTED");
  const pdf = await getDocumentProxy(bytes);
  const extracted = await extractText(pdf, { mergePages: false });
  const text = Array.isArray(extracted.text) ? extracted.text : [extracted.text];
  if (extracted.totalPages < 1 || extracted.totalPages > PREVIEW_LIMITS.pdfPages) throw new FatalError("SOURCE_PAGE_LIMIT");
  const pages = text.map((pageText, index) => ({ page: index + 1, text: pageText.trim() })).filter((page) => page.text);
  if (!pages.length) throw new FatalError("SOURCE_NO_TEXT");
  if (pages.reduce((total, page) => total + page.text.length, 0) > PREVIEW_LIMITS.extractedCharacters) throw new FatalError("SOURCE_TEXT_LIMIT_EXCEEDED");
  return pages;
}
extractPdf.maxRetries = 1;

function providerFailure(error: unknown): Error {
  if (error instanceof FatalError || error instanceof RetryableError) return error;
  if (error instanceof AiProviderError) {
    if (error.code === "AI_PROVIDER_NOT_CONFIGURED") return new FatalError("AI_PROVIDER_NOT_CONFIGURED");
    if (error.code === "AI_DAILY_LIMIT_REACHED") return new FatalError("AI_DAILY_LIMIT_REACHED");
    if (error.code === "AI_RATE_LIMIT") return new FatalError("AI_RATE_LIMIT");
    return new FatalError(error.code);
  }
  const candidate = error as { statusCode?: number; status?: number; message?: string };
  const status = candidate?.statusCode ?? candidate?.status;
  if (status === 429) return new RetryableError("AI_RATE_LIMIT", { retryAfter: "30s" });
  if (status && status >= 500) return new RetryableError("AI_PROVIDER_RETRYABLE", { retryAfter: "30s" });
  return new FatalError("AI_PROVIDER_FAILED");
}

async function generatePlan(pages: Array<{ page: number; text: string }>, input: IngestInput) {
  "use step";
  if (input.duration !== 5) throw new FatalError("PREVIEW_DURATION_LIMIT");
  const source = pages.map((page) => `[Physical PDF page ${page.page}]\n${page.text}`).join("\n\n");
  try {
    const plan = await getAiProvider().generateJson({
      schema: planSchema,
      maxTokens: 3072,
      system: "Use only the source evidence provided. Cite the physical PDF page for each dialogue line and never invent a page. Preserve disagreements and uncertainty. Produce a concise English two-host audio lesson, under five minutes, plus editable goal-shaped learning outputs.",
      prompt: `Goal: ${input.goal}\nLevel: ${input.level}\nDuration: 5 minutes maximum\nLearner question: ${input.question}\n\nSOURCE EXCERPTS (physical page numbers are authoritative):\n${source}`,
    });
    const maxPage = Math.max(...pages.map((page) => page.page));
    if (plan.dialogue.some((line) => line.page > maxPage) || plan.flashcards.some((card) => card.page > maxPage)) {
      throw new FatalError("AI_SOURCE_CITATION_INVALID");
    }
    const script = plan.dialogue.map((line) => `${line.speaker === "host_a" ? "Host A" : "Host B"}: ${line.text}`).join("\n");
    if (script.length > PREVIEW_LIMITS.scriptCharacters || script.split(/\s+/).filter(Boolean).length > PREVIEW_LIMITS.scriptWords) {
      throw new FatalError("AI_SCRIPT_LIMIT_EXCEEDED");
    }
    return plan;
  } catch (error) {
    throw providerFailure(error);
  }
}
generatePlan.maxRetries = 0;

async function synthesizeAndStore(jobId: string, ownerId: string, plan: z.infer<typeof planSchema>) {
  "use step";
  const script = plan.dialogue.map((line) => `${line.speaker === "host_a" ? "Host A" : "Host B"}: ${line.text}`).join("\n");
  try {
    const result = await getAiProvider().synthesize(script);
    const pathname = `${ownerId}/audio/${jobId}.mp3`;
    const stored = await put(pathname, new Blob([Uint8Array.from(result.bytes).buffer], { type: result.mediaType }), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: result.mediaType,
    });
    return { audioKey: stored.pathname, durationMs: result.durationMs };
  } catch (error) {
    throw providerFailure(error);
  }
}
synthesizeAndStore.maxRetries = 0;

async function completeJob(jobId: string, pages: Array<{ page: number; text: string }>, plan: z.infer<typeof planSchema>, audio: { audioKey: string; durationMs: number }) {
  "use step";
  return workflowRpc<Record<string, string>>("workflow_complete_source", {
    p_job_id: jobId,
    p_pages: pages,
    p_plan: plan,
    p_audio_key: audio.audioKey,
    p_duration_ms: audio.durationMs,
  });
}
completeJob.maxRetries = 2;

async function failJob(jobId: string, code: string, retryable: boolean) {
  "use step";
  await workflowRpc<void>("workflow_fail", { p_job_id: jobId, p_error_code: code, p_retryable: retryable });
}
failJob.maxRetries = 0;

export async function ingestSourceWorkflow(jobId: string) {
  "use workflow";
  try {
    const job = await claimJob(jobId);
    if (!job._claimed) return job.result ?? { state: job.state };
    const input = job.result?.input;
    if (!input) throw new FatalError("INVALID_JOB_INPUT");
    const pages = await extractPdf(input);
    await checkpoint(jobId, "generating_plan");
    const plan = await generatePlan(pages, input);
    await checkpoint(jobId, "synthesizing_audio");
    const audio = await synthesizeAndStore(jobId, job.owner_id, plan);
    await checkpoint(jobId, "persisting_revision");
    return await completeJob(jobId, pages, plan, audio);
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 80) : "WORKFLOW_FAILED";
    await failJob(jobId, code, code.includes("RETRYABLE") || code === "AI_RATE_LIMIT");
    throw error;
  }
}
