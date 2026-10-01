"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Mic2, Pause, Play, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import type { UploadDocument } from "@/lib/uploads/local";

type PodcastStage = "preparing_document" | "understanding_document" | "creating_outline" | "writing_script" | "generating_audio";
type PodcastReady = { title: string; script: string; durationMs: number; mediaType: string; audioSegments: Array<{ speaker: string; durationMs: number; audioBase64: string; mediaType: string }>; provider: string; llmModel: string; ttsModel: string; speakers: { host_a: string; host_b: string } };
type PlayableSegment = { speaker: string; durationMs: number; url: string };

const stageLabels: Record<PodcastStage, string> = {
  preparing_document: "Preparing extracted PDF text",
  understanding_document: "Understanding the full document with Cloudflare Workers AI",
  creating_outline: "Building a source-grounded podcast outline",
  writing_script: "Writing and validating the complete dialogue",
  generating_audio: "Generating two-speaker audio with Deepgram Aura-1",
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

function formatSeconds(seconds: number) {
  return formatDuration(seconds * 1000);
}

export function PodcastGenerator({ document }: { document: UploadDocument }) {
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<PodcastStage | null>(null);
  const [result, setResult] = useState<PodcastReady | null>(null);
  const [segments, setSegments] = useState<PlayableSegment[]>([]);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekAfterLoad = useRef<number | null>(null);
  const playOnNextSegment = useRef(false);

  useEffect(() => () => { for (const segment of segments) URL.revokeObjectURL(segment.url); }, [segments]);
  useEffect(() => {
    const audio = audioRef.current;
    const source = segments[segmentIndex];
    if (!audio || !source) return;
    audio.src = source.url;
    audio.load();
    if (playOnNextSegment.current) {
      playOnNextSegment.current = false;
      void audio.play().catch(() => setPlaying(false));
    }
  }, [segments, segmentIndex]);

  const totalDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  const currentSegmentOffset = segments.slice(0, segmentIndex).reduce((sum, segment) => sum + segment.durationMs, 0) / 1000;

  function updateElapsed() {
    setElapsedSeconds(currentSegmentOffset + (audioRef.current?.currentTime ?? 0));
  }

  function seekPodcast(seconds: number) {
    const bounded = Math.max(0, Math.min(seconds, totalDurationMs / 1000));
    let cursor = 0;
    const nextIndex = segments.findIndex((segment) => {
      cursor += segment.durationMs / 1000;
      return bounded < cursor;
    });
    const targetIndex = nextIndex < 0 ? Math.max(0, segments.length - 1) : nextIndex;
    const offset = segments.slice(0, targetIndex).reduce((sum, segment) => sum + segment.durationMs, 0) / 1000;
    const withinSegment = Math.max(0, bounded - offset);
    if (targetIndex === segmentIndex && audioRef.current) audioRef.current.currentTime = withinSegment;
    else {
      playOnNextSegment.current = playing;
      seekAfterLoad.current = withinSegment;
      setSegmentIndex(targetIndex);
    }
  }

  async function generate() {
    if (!consent || busy) return;
    setBusy(true);
    setError("");
    setStage("preparing_document");
    setResult(null);
    setPlaying(false);
    setSegments((previous) => { for (const segment of previous) URL.revokeObjectURL(segment.url); return []; });
    setSegmentIndex(0);
    setElapsedSeconds(0);
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
            if (typeof payload.title !== "string" || typeof payload.script !== "string" || !Array.isArray(payload.audioSegments) || payload.audioSegments.length === 0 || !Number.isFinite(payload.durationMs)) {
              throw new Error("The provider response was incomplete. No podcast was created.");
            }
            const podcast = payload as unknown as PodcastReady;
            const playable = podcast.audioSegments.map((segment) => ({
              speaker: segment.speaker,
              durationMs: segment.durationMs,
              url: URL.createObjectURL(decodeAudio(segment.audioBase64, segment.mediaType)),
            }));
            setResult(podcast);
            setSegments(playable);
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
    <div className="podcast-limits"><ShieldCheck size={16}/><span>Preview guardrails: one PDF up to 4 MiB / 20 pages / 20,000 characters; 800 words and 5,000 speech characters maximum; 16 speech turns; under 8 MiB and 7 minutes; best-effort two attempts per client per server instance each 10 minutes. Cloudflare&apos;s free daily quota still applies.</span></div>
    <button className="button primary" type="button" onClick={() => void generate()} disabled={!consent || busy}>
      {busy ? <LoaderCircle className="upload-spinner" size={16}/> : <Sparkles size={16}/>} {busy ? "Generating with the live provider…" : "Generate Podcast"}
    </button>
    {busy && <p className="podcast-progress" role="status"><LoaderCircle className="upload-spinner" size={16}/>{stage ? stageLabels[stage] : "Connecting to Cloudflare…"}</p>}
    {error && <p className="upload-error" role="alert"><XCircle size={17}/>{error}</p>}
    {result && segments.length > 0 && <div className="podcast-result" role="status">
      <div className="row"><CheckCircle2 size={18} className="success"/><div><strong>Live podcast ready · {formatDuration(totalDurationMs)}</strong><span>{result.llmModel} · {result.ttsModel} · Host A ({result.speakers.host_a}) and Host B ({result.speakers.host_b})</span></div></div>
      <h3>{result.title}</h3>
      <audio ref={audioRef} preload="metadata" aria-label="Generated podcast audio" onTimeUpdate={updateElapsed} onLoadedMetadata={() => {
        if (seekAfterLoad.current !== null && audioRef.current) { audioRef.current.currentTime = seekAfterLoad.current; seekAfterLoad.current = null; }
        updateElapsed();
      }} onPlay={() => setPlaying(true)} onEnded={() => {
        if (segmentIndex + 1 < segments.length) { playOnNextSegment.current = true; window.setTimeout(() => setSegmentIndex((index) => index + 1), 250); }
        else { setPlaying(false); setElapsedSeconds(totalDurationMs / 1000); }
      }}/>
      <div className="podcast-player-controls" aria-label="Podcast playback controls">
        <button className="button secondary" type="button" onClick={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (playing) { audio.pause(); setPlaying(false); }
          else { void audio.play().then(() => setPlaying(true)).catch(() => setError("Audio playback could not start in this browser.")); }
        }} aria-label={playing ? "Pause podcast" : "Play podcast"}>{playing ? <Pause size={16}/> : <Play size={16}/>} {playing ? "Pause" : "Play"}</button>
        <span>{formatSeconds(Math.min(elapsedSeconds, totalDurationMs / 1000))}</span>
        <input type="range" min="0" max={Math.max(1, Math.floor(totalDurationMs / 1000))} value={Math.min(Math.floor(elapsedSeconds), Math.floor(totalDurationMs / 1000))} onChange={(event) => seekPodcast(Number(event.target.value))} aria-label="Podcast progress"/>
        <span>{formatDuration(totalDurationMs)}</span>
      </div>
      <details><summary>Read the generated script</summary><pre>{result.script}</pre></details>
      <p className="fine">Audio is held in this browser session only. Turns play in order with a short pause. This core-loop path does not persist them to Blob or Supabase.</p>
    </div>}
  </section>;
}
