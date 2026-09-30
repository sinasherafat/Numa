"use client";

import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PREVIEW_LIMITS } from "@/lib/ai/limits";
import { Brain, CheckCircle2, CircleAlert, Database, FileText, GitCompareArrows, Headphones, History, LogOut, Mic2, RefreshCw, ShieldCheck, Sparkles, Target, Trash2, UploadCloud } from "lucide-react";

type LiveState = {
  user: { id: string; email: string | null };
  sources: Array<{ id: string; title: string; created_at: string; source_versions: Array<{ id: string; status: string; added_at: string; extracted_word_count: number | null }> }>;
  jobs: Array<{ id: string; state: string; checkpoint: string | null; error_code: string | null; workflow_run_id: string | null; created_at: string; result?: { session_id?: string } }>;
  sessions: Array<{ id: string; goal_type: string; level: string; duration_target: number; state: string; topics: { title?: string; question?: string } | null }>;
  chapters: Array<{ id: string; objective: string; duration_ms: number; status: string; created_at: string }>;
  consents: Array<{ type: string; enabled: boolean }>;
  evidence: Array<{ id: string; type: string; evidence_text: string | null; concepts: { label?: string } | null }>;
  outcomes: Array<{ id: string; type: string; content: unknown; status: string }>;
};

const features = [
  { id: "F01", icon: Headphones, title: "Adaptive listening", detail: "The sample workspace demonstrates future-only adaptation. Live revision acceptance still needs implementation." },
  { id: "F02", icon: Brain, title: "My Understanding", detail: "Live consent and owner-scoped evidence are saved. Explain-back memory is recorded only with consent." },
  { id: "F03", icon: Mic2, title: "Explain it back", detail: "Confirmed text is saved privately; free-provider speech transcription and grounded assessment need Preview credentials." },
  { id: "F04", icon: GitCompareArrows, title: "Compare sources", detail: "The sample route is illustrative; live multi-source comparison is not yet implemented." },
  { id: "F05", icon: History, title: "What changed", detail: "The sample route is illustrative; live change analysis and baseline action are not yet implemented." },
  { id: "F06", icon: Target, title: "Learn for a goal", detail: "Live source ingestion creates goal-shaped learning outputs, bounded to 5 minutes in Preview." },
];

function statusLabel(job: LiveState["jobs"][number]) {
  if (job.state === "failed" && job.error_code === "AI_PROVIDER_NOT_CONFIGURED") return "Source secured; Preview AI provider needs its server-side credentials";
  if (job.state === "failed" && job.error_code === "AI_DAILY_LIMIT_REACHED") return "Source secured; Preview free AI allowance reached for today";
  if (job.state === "failed" && job.error_code === "SOURCE_LIMIT_EXCEEDED") return "PDF exceeds the 4 MiB Preview limit";
  if (job.state === "failed" && job.error_code === "SOURCE_PAGE_LIMIT") return "PDF exceeds the 20 page Preview limit";
  if (job.state === "failed" && job.error_code === "SOURCE_TEXT_LIMIT_EXCEEDED") return "Extracted text exceeds the 20,000 character Preview limit";
  if (job.state === "failed" && job.error_code === "PREVIEW_DURATION_LIMIT") return "Preview lessons are limited to 5 minutes";
  if (job.state === "failed") return `Failed: ${job.error_code ?? "unknown"}`;
  if (job.state === "succeeded") return "Private lesson ready";
  return `${job.state.replace("_", " ")} · ${job.checkpoint?.replaceAll("_", " ") ?? "waiting"}`;
}

export function LiveWorkspace() {
  const [state, setState] = useState<LiveState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [goal, setGoal] = useState<"understand" | "presentation" | "compare">("understand");
  const [question, setQuestion] = useState("What are the central claims and their limits?");
  const [level, setLevel] = useState<"beginner" | "familiar" | "advanced">("familiar");
  const duration = 5 as const;
  const [teachback, setTeachback] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/live/state", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error?.message ?? "Private workspace unavailable.");
    setState(payload.data);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/live/state", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error?.message ?? "Private workspace unavailable.");
        return payload.data as LiveState;
      })
      .then((payload) => { if (active) setState(payload); })
      .catch((reason: Error) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, []);
  const memoryEnabled = state?.consents.find((item) => item.type === "learning_memory")?.enabled ?? false;
  const rawAudioEnabled = state?.consents.find((item) => item.type === "raw_audio_retention")?.enabled ?? false;
  const newestSession = state?.sessions[0];
  const activeJobs = state?.jobs.filter((job) => ["queued", "running", "retry_wait"].includes(job.state)).length ?? 0;

  function downloadOutcomes() {
    if (!state?.outcomes.length) return;
    const sections = state.outcomes.map((outcome) => `## ${outcome.type.replaceAll("_", " ")}\n\n${typeof outcome.content === "string" ? outcome.content : JSON.stringify(outcome.content, null, 2)}`);
    const href = URL.createObjectURL(new Blob([`# Numa learning outcomes\n\n${sections.join("\n\n")}\n`], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = href; anchor.download = "numa-outcomes.md"; anchor.click();
    URL.revokeObjectURL(href);
  }

  async function uploadPdf(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("pdf");
    if (!(file instanceof File)) return;
    if (file.size > PREVIEW_LIMITS.pdfBytes) return setError("Preview PDFs must be 4 MiB or smaller.");
    const signature = new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer()));
    if (signature !== "%PDF-") return setError("This file does not have a valid PDF signature.");
    setBusy(true); setError(""); setProgress(0);
    try {
      await upload(`uploads/${crypto.randomUUID()}.pdf`, file, {
        access: "private",
        handleUploadUrl: "/api/live/upload",
        contentType: "application/pdf",
        clientPayload: JSON.stringify({ title: file.name.replace(/\.pdf$/i, ""), goal, question, level, duration, aiProcessingNoticeAccepted: new FormData(form).get("ai-processing-notice") === "on", idempotencyKey: crypto.randomUUID() }),
        onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage)),
      });
      for (let attempt = 0; attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await refresh();
      }
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally { setBusy(false); }
  }

  async function setConsent(enabled: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/live/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "learning_memory", enabled }) });
      if (!response.ok) throw new Error("Consent could not be saved.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Consent failed."); }
    finally { setBusy(false); }
  }

  async function removeSource(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/live/sources/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).error?.message ?? "Deletion failed.");
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Deletion failed."); }
    finally { setBusy(false); }
  }

  async function saveTeachback() {
    if (!newestSession) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/live/teachbacks", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ sessionId: newestSession.id, transcript: teachback, prompt: "Explain the key idea and one important limitation." }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message ?? "Explain-back could not be saved.");
      setTeachback("");
      setError(payload.data.assessment.message ?? `Confirmed explanation saved. Grounded assessment: ${payload.data.assessment.state}; ${payload.data.assessment.findings?.length ?? 0} cited findings.`);
      await refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Explain-back failed."); }
    finally { setBusy(false); }
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    if (!newestSession || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is unavailable in this browser. Type your explanation instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(chunksRef.current, { type: recorder.mimeType });
        if (audio.size > 3 * 1024 * 1024) return setError("The recording is over 3 MB. Record a shorter explanation or type it.");
        setBusy(true); setError("Transcribing your private recording…");
        try {
          const form = new FormData();
          form.set("sessionId", newestSession.id);
          form.set("audio", audio, `explanation.${recorder.mimeType.includes("webm") ? "webm" : "m4a"}`);
          const response = await fetch("/api/live/transcribe", { method: "POST", body: form });
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error?.message ?? "Transcription failed.");
          setTeachback(payload.data.edited_transcript);
          setError("Transcript ready. Correct it if needed, then save the confirmed text.");
          await refresh();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Transcription failed."); }
        finally { setBusy(false); chunksRef.current = []; }
      };
      recorderRef.current = recorder;
      recorder.start(500);
      setRecording(true); setError("Recording privately. Stop when your explanation is complete.");
    } catch {
      setError("Microphone access is unavailable. You can type and save your explanation.");
    }
  }

  return (
    <main className="live-page">
      <header className="live-topbar">
        <Link href="/" className="brand"><span className="brand-mark"/><span className="brand-name">Numa</span></Link>
        <div className="row"><span className="badge green"><ShieldCheck size={13}/> Live private workspace</span><Link className="button compact" href="/">Sample workspace</Link><form action="/auth/signout" method="post"><button className="icon-btn compact" aria-label="Sign out"><LogOut size={17}/></button></form></div>
      </header>
      <div className="live-wrap">
        <section className="live-hero"><div><span className="eyebrow">Authenticated · owner-scoped</span><h1>Build understanding from your own sources.</h1><p className="subtitle">Files are private, metadata is protected by row-level security, and durable jobs never fall back to sample answers.</p></div><div className="live-health"><Database size={20}/><strong>{state ? "Database connected" : "Connecting…"}</strong><span>{state?.user.email}</span></div></section>
        {error && <div className="notice" role="status"><CircleAlert size={18}/><span>{error}</span></div>}
        <div className="live-grid">
          <section className="card live-upload-card">
            <div className="row between"><div><span className="eyebrow">Private source pipeline</span><h2>Start a live session</h2></div><UploadCloud size={28}/></div>
            <form className="live-form" onSubmit={uploadPdf}>
              <div className="goal-row">{(["understand", "presentation", "compare"] as const).map((item) => <button className={`goal-pill ${goal === item ? "active" : ""}`} type="button" key={item} onClick={() => setGoal(item)}>{item}</button>)}</div>
              <label htmlFor="live-question">Your question</label><input id="live-question" className="input" value={question} onChange={(event) => setQuestion(event.target.value)} required minLength={3}/>
              <div className="live-fields"><label>Familiarity<select className="select" value={level} onChange={(event) => setLevel(event.target.value as typeof level)}><option value="beginner">Beginner</option><option value="familiar">Familiar</option><option value="advanced">Advanced</option></select></label><label>Preview lesson duration<input className="input" value="Up to 5 min" readOnly aria-label="Preview lesson duration"/></label></div>
              <label className="dropzone"><FileText size={24}/><strong>{busy ? `Uploading ${progress}%` : "Choose a text-based PDF"}</strong><span>Private · up to 4 MiB and 20 pages · 20,000 extracted characters max</span><input name="pdf" type="file" accept="application/pdf,.pdf" required disabled={busy}/></label>
              <label className="fine provider-consent"><input type="checkbox" name="ai-processing-notice" required/> I understand extracted source text is sent to Cloudflare Workers AI for inference. Cloudflare states that Workers AI content is not used to train or improve services. I will not upload content I lack permission to process.</label>
              <button className="button primary" disabled={busy}>{busy ? "Securing source…" : "Upload and create lesson"}</button>
            </form>
          </section>
          <section className="card">
            <div className="row between"><div><span className="eyebrow">Durable activity</span><h2>Processing ledger</h2></div><button className="icon-btn compact" onClick={() => refresh().catch((reason) => setError(reason.message))} aria-label="Refresh jobs"><RefreshCw size={17}/></button></div>
            <p className="fine">{activeJobs} active · checkpoints and bounded retries persist across restarts.</p>
            <div className="live-list">{state?.jobs.length ? state.jobs.map((job) => <div className="live-row" key={job.id}>{job.state === "succeeded" ? <CheckCircle2 className="green-icon"/> : <Sparkles/>}<div><strong>{statusLabel(job)}</strong><span>{new Date(job.created_at).toLocaleString()}</span></div></div>) : <div className="empty-live">No live jobs yet.</div>}</div>
          </section>
        </div>
        <section className="card"><div className="row between"><div><span className="eyebrow">Private library</span><h2>Your sources</h2></div><span className="badge">{state?.sources.length ?? 0} sources</span></div><div className="source-live-grid">{state?.sources.length ? state.sources.map((source) => { const version = source.source_versions?.[0]; return <article className="source-live" key={source.id}><FileText/><div><strong>{source.title}</strong><span>{version?.status ?? "processing"}{version?.extracted_word_count ? ` · ${version.extracted_word_count} words` : ""}</span></div><button className="icon-btn compact" disabled={busy} onClick={() => removeSource(source.id)} aria-label={`Delete ${source.title}`}><Trash2 size={16}/></button></article>; }) : <div className="empty-live">Upload a PDF to create your first owner-scoped source.</div>}</div></section>
        {!!state?.chapters.length && <section className="card"><div className="row between"><div><span className="eyebrow">Authenticated stream</span><h2>Your generated audio</h2></div><span className="badge green">Private</span></div><div className="live-list">{state.chapters.map((chapter) => <div className="live-audio" key={chapter.id}><div><strong>{chapter.objective}</strong><span>{Math.ceil(chapter.duration_ms / 60000)} min · no permanent public URL</span></div><audio controls preload="metadata" src={`/api/live/audio/${chapter.id}`}/></div>)}</div></section>}
        {!!state?.outcomes.length && <section className="card"><div className="row between"><div><span className="eyebrow">Goal-shaped artifacts</span><h2>Your generated outcomes</h2></div><button className="button compact" onClick={downloadOutcomes}>Download Markdown</button></div><div className="source-live-grid">{state.outcomes.filter((item) => item.type !== "audio").map((outcome) => <article className="source-live" key={outcome.id}><Target/><div><strong>{outcome.type.replaceAll("_", " ")}</strong><span>{outcome.status} · generated from your private snapshot</span></div></article>)}</div></section>}
        <section className="feature-live-grid">{features.map(({ id, icon: Icon, title, detail }) => <article className="card live-feature" key={id}><div className="row between"><Icon/><span className="badge purple">{id}</span></div><h3>{title}</h3><p className="muted">{detail}</p>{id === "F02" && <div className="row"><button className={`switch ${memoryEnabled ? "on" : ""}`} role="switch" aria-checked={memoryEnabled} aria-label="Private learning memory" onClick={() => setConsent(!memoryEnabled)} disabled={busy}/><strong>{memoryEnabled ? "On by consent" : "Off"}</strong></div>}{id === "F03" && <div className="live-teachback"><div className="row wrap"><button className={`button compact ${recording ? "danger" : ""}`} disabled={!newestSession || busy} onClick={toggleRecording}>{recording ? "Stop recording" : "Record explanation"}</button><div className="row"><button className={`switch ${rawAudioEnabled ? "on" : ""}`} role="switch" aria-checked={rawAudioEnabled} aria-label="Retain raw voice recordings" onClick={() => setConsent(!rawAudioEnabled)} disabled={busy}/><span className="fine">Keep raw audio</span></div></div><textarea className="input" rows={3} placeholder={newestSession ? "Record or explain the key idea in your own words…" : "Available after a private session is ready"} value={teachback} onChange={(event) => setTeachback(event.target.value)} disabled={!newestSession}/><button className="button compact" disabled={!newestSession || teachback.trim().length < 20 || busy} onClick={saveTeachback}>Save confirmed text</button></div>}</article>)}</section>
        <footer className="live-footer"><span><ShieldCheck size={15}/> Sample fixtures are never used in this workspace.</span><span>Preview AI runs on a no-payment free allowance. Source text and speech are processed by Cloudflare Workers AI; limits apply.</span></footer>
      </div>
    </main>
  );
}
