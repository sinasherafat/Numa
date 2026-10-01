export type JobState = "queued" | "running" | "retry_wait" | "succeeded" | "failed" | "cancel_requested" | "cancelled";

export type JobRecord = {
  id: string;
  ownerId: string;
  type: "source_ingest" | "session_generate" | "adaptation" | "assessment" | "comparison" | "changes" | "export" | "deletion";
  idempotencyKey: string;
  inputVersion: string;
  state: JobState;
  attempts: number;
  checkpoint?: string;
  errorCode?: string;
};

export interface DurableJobRuntime {
  start(job: Omit<JobRecord, "id" | "state" | "attempts">): Promise<JobRecord>;
  getOwned(ownerId: string, jobId: string): Promise<JobRecord | null>;
  cancel(ownerId: string, jobId: string): Promise<JobRecord>;
}

export interface PrivateObjectStore {
  createUpload(ownerId: string, name: string, mediaType: "application/pdf", size: number): Promise<{ uploadId: string; uploadUrl: string }>;
  signRead(ownerId: string, key: string, expiresInSeconds: number): Promise<string>;
  enqueueDelete(ownerId: string, keys: string[]): Promise<string>;
}

export interface GenerationAdapters {
  plan(inputSnapshotId: string): Promise<{ schemaVersion: string; chapterObjectives: string[] }>;
  synthesize(script: string, voice: "host_a" | "host_b"): Promise<{ audioKey: string; durationMs: number }>;
  transcribe(audioKey: string): Promise<string>;
  assess(confirmedTranscript: string, sourceSnapshotId: string): Promise<{ assessability: "assessable" | "cannot_assess"; findings: unknown[] }>;
}

export class ProviderUnavailableError extends Error {
  readonly code = "PROVIDER_UNAVAILABLE";
}

export class UnconfiguredDurableJobRuntime implements DurableJobRuntime {
  private unavailable(): never { throw new ProviderUnavailableError("Configure the durable workflow runtime before private source processing."); }
  async start(): Promise<JobRecord> { return this.unavailable(); }
  async getOwned(): Promise<JobRecord | null> { return this.unavailable(); }
  async cancel(): Promise<JobRecord> { return this.unavailable(); }
}
