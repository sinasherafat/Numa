import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CloudflareWorkersAiProvider, measureMp3DurationMs, PREVIEW_LIMITS } from "./provider";

const responseSchema = z.object({ answer: z.string() });

function tinyMp3(frames = 10) {
  const frameBytes = 417;
  const bytes = new Uint8Array(frames * frameBytes);
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * frameBytes;
    bytes.set([0xff, 0xfb, 0x90, 0x64], start); // MPEG-1 Layer III, 128 kbps, 44.1 kHz
  }
  return bytes;
}

describe("Cloudflare Workers AI provider adapter", () => {
  beforeEach(() => {
    process.env.CLOUDFLARE_ACCOUNT_ID = "test-account";
    process.env.CLOUDFLARE_API_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.NUMA_AI_PROVIDER;
  });

  it("sends one bounded JSON-mode generation request and validates its schema", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, result: { response: '{"answer":"grounded"}' } }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new CloudflareWorkersAiProvider().generateJson({ system: "Be exact", prompt: "Small source", schema: responseSchema })).resolves.toEqual({ answer: "grounded" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/@cf/meta/llama-3.1-8b-instruct");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.max_tokens).toBeLessThanOrEqual(4096);
  });

  it("validates structured JSON objects returned directly by Workers AI JSON mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: { response: { answer: "grounded" } },
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(new CloudflareWorkersAiProvider().generateJson({ system: "Be exact", prompt: "Small source", schema: responseSchema }))
      .resolves.toEqual({ answer: "grounded" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed or schema-invalid generation without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, result: { response: '{"wrong":true}' } }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new CloudflareWorkersAiProvider().generateJson({ system: "", prompt: "", schema: responseSchema })).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID", diagnostic: "model_schema_mismatch" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("classifies the Cloudflare daily free-allocation limit distinctly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, errors: [{ code: 3036, message: "daily free allocation exhausted" }] }), { status: 429, headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new CloudflareWorkersAiProvider().generateJson({ system: "", prompt: "", schema: responseSchema })).rejects.toMatchObject({ code: "AI_DAILY_LIMIT_REACHED", status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("transcribes audio with Whisper using a server-side request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, result: { text: "A tiny real transcript.", language: "english" } }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new CloudflareWorkersAiProvider().transcribe(new Uint8Array([1, 2, 3]))).resolves.toEqual({ text: "A tiny real transcript.", language: "english" });
    expect(String(fetchMock.mock.calls[0][0])).toContain("/@cf/openai/whisper");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ audio: "AQID" });
  });

  it("measures synthesized MP3 duration and enforces Preview script/audio caps", async () => {
    const mp3 = tinyMp3();
    expect(measureMp3DurationMs(mp3)).toBeGreaterThan(0);
    const fetchMock = vi.fn().mockResolvedValue(new Response(mp3, { headers: { "content-type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    const audio = await new CloudflareWorkersAiProvider().synthesize("Host A: This is a short spoken test.");
    expect(audio.bytes).toEqual(mp3);
    expect(audio.mediaType).toBe("audio/mpeg");
    expect(audio.durationMs).toBe(measureMp3DurationMs(mp3));
    expect(String(fetchMock.mock.calls[0][0])).toContain("/@cf/myshell-ai/melotts");
    await expect(new CloudflareWorkersAiProvider().synthesize("word ".repeat(PREVIEW_LIMITS.scriptWords + 1))).rejects.toMatchObject({ code: "AI_OUTPUT_INVALID" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the documented audio/mpeg type for MeloTTS JSON-wrapped base64 MP3 output", async () => {
    const mp3 = tinyMp3();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      success: true,
      result: { audio: Buffer.from(mp3).toString("base64") },
    }), { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const audio = await new CloudflareWorkersAiProvider().synthesize("Host A: A short spoken test.");

    expect(audio.bytes).toEqual(mp3);
    expect(audio.mediaType).toBe("audio/mpeg");
  });

  it("fails closed when credentials are absent", async () => {
    delete process.env.CLOUDFLARE_API_TOKEN;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(new CloudflareWorkersAiProvider().generateJson({ system: "", prompt: "", schema: responseSchema })).rejects.toMatchObject({ code: "AI_PROVIDER_NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
