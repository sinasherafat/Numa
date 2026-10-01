"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, Mic2, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import type { UploadDocument } from "@/lib/uploads/local";

type PodcastStage = "preparing_document" | "creating_script" | "generating_audio";
type PodcastReady = { title: string; script: string; durationMs: number; mediaType: string; audioBase64: string; provider: string };

const stageLabels: Record<PodcastStage, string> = {
  preparing_document: "Preparing extracted PDF text",
  creating_script: "Creating a source-grounded script with Cloudflare Workers AI",
  generating_audio: "Generating real speech audio with MeloTTS",
};

function decodeAudio(base64: string, mediaType: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mediaType });
}

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PodcastGenerator({ document }: { document: UploadDocument }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<PodcastStage | null>(null);
  const [result, setResult] = useState<PodcastReady | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  async function generate() {
    if (!consent || busy) return;
    setBusy(true);
    setError("");
    setStage("preparing_document");
    setResult(null);
    setAudioUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    try {
      const response = await fetch("/api/podcast/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: document.name,
          fileSize: document.size,
          pageCount: document.pageCount,
          text: document.text,
          aiProcessingNoticeAccepted: true,
        }),
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? "Live podcast generation could not start. No sample audio was substituted.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedAudio = false;
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const event = frame.match(/^event: ([^\n]+)$/m)?.[1];
          const data = frame.match(/^data: (.+)$/m)?.[1];
          if (!event || !data) continue;
          const payload = JSON.parse(data) as Record<string, unknown>;
          if (event === "stage" && typeof payload.stage === "string" && payload.stage in stageLabels) {
            setStage(payload.stage as PodcastStage);
          } else if (event === "error") {
            throw new Error(typeof payload.message === "string" ? payload.message : "Live podcast generation failed. No sample audio was substituted.");
          } else if (event === "ready") {
            if (typeof payload.title !== "string" || typeof payload.script !== "string" || typeof payload.audioBase64 !== "string" || typeof payload.mediaType !== "string" || !Number.isFinite(payload.durationMs)) {
              throw new Error("The provider response was incomplete. No podcast was created.");
            }
            const podcast = payload as unknown as PodcastReady;
            const url = URL.createObjectURL(decodeAudio(podcast.audioBase64, podcast.mediaType));
            setResult(podcast);
            setAudioUrl(url);
            receivedAudio = true;
          }
        }
        if (done) break;
      }
      if (!receivedAudio) throw new Error("The live provider did not return a playable audio file. No podcast was created.");
    } catch (reason) {
      setResult(null);
      setError(reason instanceof Error ? reason.message : "Live podcast generation failed. No sample audio was substituted.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="card podcast-generator" aria-labelledby="podcast-title">
    <div className="row between"><div><span className="eyebrow">Core product loop · Preview</span><h2 id="podcast-title">Generate a real podcast</h2></div><span className="badge purple"><Mic2 size={13}/> Cloudflare AI</span></div>
    <p className="muted">The PDF is parsed in this browser. Only its extracted text is sent to Cloudflare when you choose to generate.</p>
    <label className="podcast-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} disabled={busy}/><span>I agree to send the extracted text of <strong>{document.name}</strong> to Cloudflare Workers AI to create a podcast. The PDF itself is not uploaded or stored by this flow.</span></label>
    <div className="podcast-limits"><ShieldCheck size={16}/><span>Preview guardrails: one PDF up to 4 MiB / 20 pages / 20,000 characters; best-effort two attempts per client per server instance each 10 minutes; script under 550 words; direct-play audio under 3 MiB.</span></div>
    <button className="button primary" type="button" onClick={() => void generate()} disabled={!consent || busy}>
      {busy ? <LoaderCircle className="upload-spinner" size={16}/> : <Sparkles size={16}/>} {busy ? "Generating with the live provider…" : "Generate Podcast"}
    </button>
    {busy && <p className="podcast-progress" role="status"><LoaderCircle className="upload-spinner" size={16}/>{stage ? stageLabels[stage] : "Connecting to Cloudflare…"}</p>}
    {error && <p className="upload-error" role="alert"><XCircle size={17}/>{error}</p>}
    {result && audioUrl && <div className="podcast-result" role="status">
      <div className="row"><CheckCircle2 size={18} className="success"/><div><strong>Live podcast ready · {formatDuration(result.durationMs)}</strong><span>{result.provider} · real generated script and MeloTTS audio</span></div></div>
      <h3>{result.title}</h3>
      <audio controls preload="metadata" src={audioUrl} aria-label="Generated podcast audio"/>
      <details><summary>Read the generated script</summary><pre>{result.script}</pre></details>
      <p className="fine">Audio is held in this browser session only. It is not persisted to Blob or Supabase by this minimal core loop.</p>
    </div>}
  </section>;
}
