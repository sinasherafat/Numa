import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadDocument } from "@/lib/uploads/local";
import { PodcastGenerator } from "./podcast-generator";

const document: UploadDocument = { name: "real-notes.pdf", size: 1200, pageCount: 1, text: "Actual extracted source text, with evidence and limitations.", mode: "local-test" };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("PodcastGenerator", () => {
  it("requires explicit consent and only reports ready after the real audio event arrives", async () => {
    const url = "blob:real-podcast";
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response([
      'event: stage\ndata: {"stage":"understanding_document"}\n\n',
      'event: stage\ndata: {"stage":"creating_outline"}\n\n',
      'event: stage\ndata: {"stage":"writing_script"}\n\n',
      'event: stage\ndata: {"stage":"generating_audio"}\n\n',
      `event: ready\ndata: {"title":"Grounded learning","script":"Host A: A real source-grounded script.","durationMs":42000,"mediaType":"audio/mpeg","audioSegments":[{"speaker":"host_a","durationMs":42000,"mediaType":"audio/mpeg","audioBase64":"AQID"}],"provider":"cloudflare-workers-ai","llmModel":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","ttsModel":"@cf/deepgram/aura-1","speakers":{"host_a":"angus","host_b":"asteria"}}\n\n`,
    ].join(""), { headers: { "Content-Type": "text/event-stream" } })));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue(url), revokeObjectURL: vi.fn() });

    render(<PodcastGenerator document={document}/>);
    const button = screen.getByRole("button", { name: "Generate Podcast" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);

    expect(await screen.findByText("Live podcast ready · 0:42")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Podcast progress" })).toBeInTheDocument();
    expect(screen.getByText(/@cf\/meta\/llama-3.3-70b-instruct-fp8-fast/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/podcast/generate", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.text).toBe(document.text);
    expect(body.aiProcessingNoticeAccepted).toBe(true);
  });

  it("never shows a success player when the provider returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('event: error\ndata: {"message":"Cloudflare free allocation exhausted. No podcast was created.","stage":"understanding_document","code":"AI_OUTPUT_INVALID","diagnostic":"source_quote_mismatch","sourcePages":1,"sourceCharacters":61,"sourceChunks":1,"scriptQuality":{"valid":false,"words":180,"characters":1000,"turns":6,"coveredIdeas":2,"specificTerms":3},"modelRequests":[{"step":"document_map_chunk_1","model":"@cf/meta/llama-3.3-70b-instruct-fp8-fast","inputCharacters":600,"outputCharacters":210,"promptTokens":90,"completionTokens":40,"totalTokens":130}]}\n\n', { headers: { "Content-Type": "text/event-stream" } })));
    render(<PodcastGenerator document={document}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Generate Podcast" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("free allocation exhausted");
    expect(screen.queryByLabelText("Generated podcast audio")).not.toBeInTheDocument();
    expect(screen.queryByText(/Live podcast ready/)).not.toBeInTheDocument();
    expect(screen.getByText(/safe generation diagnostics/i)).toBeInTheDocument();
    expect(screen.getByText(/source_quote_mismatch/)).toBeInTheDocument();
    expect(screen.getByText(/"words": 180/)).toBeInTheDocument();
    expect(screen.queryByText(document.text)).not.toBeInTheDocument();
  });

  it("continues to the next real speech segment after a user starts playback", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const createObjectURL = vi.fn().mockReturnValueOnce("blob:host-a").mockReturnValueOnce("blob:host-b");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      `event: ready\ndata: ${JSON.stringify({ title: "Two voices", script: "Host A: First thought.\n\nHost B: Useful reply.", durationMs: 2000, audioSegments: [
        { speaker: "host_a", durationMs: 1000, mediaType: "audio/mpeg", audioBase64: "AQID" },
        { speaker: "host_b", durationMs: 1000, mediaType: "audio/mpeg", audioBase64: "BAUG" },
      ], provider: "cloudflare-workers-ai", llmModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast", ttsModel: "@cf/deepgram/aura-1", speakers: { host_a: "angus", host_b: "asteria" } })}\n\n`,
      { headers: { "Content-Type": "text/event-stream" } },
    )));

    render(<PodcastGenerator document={document}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Generate Podcast" }));
    expect(await screen.findByText("Live podcast ready · 0:02")).toBeInTheDocument();
    const audio = screen.getByLabelText("Generated podcast audio") as HTMLAudioElement;
    expect(audio).toHaveAttribute("src", "blob:host-a");
    fireEvent.click(screen.getByRole("button", { name: "Play podcast" }));
    await act(async () => { await Promise.resolve(); });
    expect(play).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    fireEvent.ended(audio);
    await act(async () => { await vi.advanceTimersByTimeAsync(250); });
    expect(audio).toHaveAttribute("src", "blob:host-b");
    expect(play).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
