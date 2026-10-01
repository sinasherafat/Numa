import { describe, expect, it, vi } from "vitest";
import { AiProviderError, type AiProvider } from "./provider";
import { streamPodcast, type PodcastInput } from "./podcast";

const input: PodcastInput = {
  fileName: "actual-source.pdf",
  fileSize: 1200,
  pageCount: 1,
  text: "Actual extracted text from a selected PDF source, including a finding and an important limitation.",
  aiProcessingNoticeAccepted: true,
};

function tinyMp3() {
  const bytes = new Uint8Array(10 * 417);
  for (let offset = 0; offset < bytes.length; offset += 417) bytes.set([0xff, 0xfb, 0x90, 0x64], offset);
  return bytes;
}

describe("direct PDF-to-podcast stream", () => {
  it("uses the supplied document for live generation and does not emit ready until TTS returns audio", async () => {
    const script = `Host A: ${"The selected source reports a measured finding and notes an important limitation. ".repeat(4)} Host B: We should not generalize beyond the evidence.`;
    const generateJson = vi.fn().mockResolvedValue({ title: "Source-grounded audio", script });
    const synthesize = vi.fn().mockResolvedValue({ bytes: tinyMp3(), durationMs: 261, mediaType: "audio/mpeg" });
    const provider = { id: "cloudflare-workers-ai", generateJson, synthesize } as unknown as AiProvider;
    const response = streamPodcast(input, provider);
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(generateJson).toHaveBeenCalledWith(expect.objectContaining({ prompt: expect.stringContaining(input.text) }));
    expect(synthesize).toHaveBeenCalledWith(script);
    expect(body).toContain('event: ready');
    expect(body).toContain('"provider":"cloudflare-workers-ai"');
    expect(body).toContain(Buffer.from(tinyMp3()).toString("base64"));
    expect(body.indexOf('event: ready')).toBeGreaterThan(body.indexOf('event: stage\ndata: {"stage":"generating_audio"}'));
  });

  it("emits an error and never a ready event when TTS fails", async () => {
    const generateJson = vi.fn().mockResolvedValue({ title: "Source-grounded audio", script: "Host A: " + "A grounded detail. ".repeat(20) });
    const synthesize = vi.fn().mockRejectedValue(new Error("provider unavailable"));
    const response = streamPodcast(input, { id: "cloudflare-workers-ai", generateJson, synthesize } as unknown as AiProvider);
    const body = await response.text();
    expect(body).toContain("event: error");
    expect(body).not.toContain("event: ready");
    expect(body).toContain("no sample audio was substituted");
    expect(body).toContain('"stage":"generating_audio"');
  });

  it("identifies a malformed real-provider script without echoing source content", async () => {
    const generateJson = vi.fn().mockRejectedValue(new AiProviderError("AI_OUTPUT_INVALID", undefined, "model_schema_mismatch"));
    const synthesize = vi.fn();
    const response = streamPodcast(input, { id: "cloudflare-workers-ai", generateJson, synthesize } as unknown as AiProvider);
    const body = await response.text();
    expect(body).toContain('"stage":"creating_script"');
    expect(body).toContain("script that did not meet the required format");
    expect(body).not.toContain(input.text);
    expect(synthesize).not.toHaveBeenCalled();
    expect(body).not.toContain('event: ready');
  });
});
