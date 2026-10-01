import { describe, expect, it, vi } from "vitest";
import { AiProviderError, type AiProvider } from "./provider";
import { streamPodcast, type PodcastInput } from "./podcast";
import { podcastTarget, type ChunkNotes, type DocumentMap, type PodcastOutline, type SpokenScript } from "./podcast-quality";

const input: PodcastInput = {
  fileName: "actual-source.pdf",
  fileSize: 1200,
  pageCount: 12,
  text: `Longer intervals change the observed result. The studies used different practice schedules. Conditions differ across the studies. The source does not examine transfer.\n\n${Array.from({ length: 12 }, (_, index) => `Section ${index + 1}\n\nThe research compares testing intervals and delayed recall. It distinguishes immediate performance from later memory, gives evidence from several practice schedules, and cautions that transfer to new tasks is still uncertain. This passage adds a source-specific detail about how the learning schedule and test timing interact.`).join("\n\n")}`,
  aiProcessingNoticeAccepted: true,
};

const map: DocumentMap = {
  title: "Learning intervals",
  centralThesis: "The source separates short-term performance from later recall and explains why test timing matters.",
  keyIdeas: [
    { id: "I1", point: "Testing intervals affect delayed recall", evidence: ["Longer intervals change the observed result."] },
    { id: "I2", point: "Practice schedule changes immediate performance", evidence: ["The studies used different practice schedules."] },
    { id: "I3", point: "Task conditions limit direct comparison", evidence: ["Conditions differ across the studies."] },
    { id: "I4", point: "Transfer to new tasks remains unresolved", evidence: ["The source does not examine transfer."] },
  ],
  evidenceAndExamples: ["The source compares several testing intervals."],
  definitions: ["Delayed recall is memory assessed after a delay."],
  claims: ["Practice schedule changes observed performance."],
  caveats: ["The evidence does not settle transfer."],
  relationships: ["Test timing changes what performance can show."],
  conclusion: "The timing of tests matters, but task transfer remains an open question.",
  tensionsAndQuestions: ["Do these findings transfer to unfamiliar tasks?"],
  sectionsWorthDiscussing: ["The different recall intervals"],
};
const chunkNotes: ChunkNotes = {
  title: "",
  thesis: "The source compares testing intervals and delayed recall.",
  keyIdeas: [{ point: "Testing intervals affect delayed recall", evidence: ["The passage compares testing intervals."] }],
  evidenceAndExamples: ["The studies use several practice schedules."],
  definitions: [], claims: [], caveats: [], relationships: [], conclusion: "", tensionsAndQuestions: [], sectionsWorthDiscussing: [],
};
const outline: PodcastOutline = {
  hook: "The timing of a test can change what learning looks like.",
  listenerPromise: "We will separate immediate performance from later recall.",
  sections: Array.from({ length: 6 }, (_, index) => ({ purpose: `Explain mapped idea ${index + 1}`, ideaIds: [`I${(index % 4) + 1}`], talkingPoints: ["Connect the source evidence and its limit."], transition: "That raises a useful next question." })),
  closingSynthesis: "Test timing matters, while transfer remains unresolved.",
};

function scriptFixture(wordsPerTurn = 80): SpokenScript {
  const passages = [
    "The first study makes delayed recall the key measure, which is different from the immediate performance someone might show right after practice. That distinction changes what a test score can tell us.",
    "A second part of the evidence compares practice schedules, and it suggests the timing of practice shapes immediate performance in ways that may not predict what remains later.",
    "When the studies use different testing intervals, their results cannot be lined up as if every participant faced the same conditions or the same delay.",
    "The paper is careful about task conditions, so the reported benefit should not be turned into a universal rule for every subject or every learning situation.",
    "One useful connection is that a learner can perform well in the moment while still needing a later check before we know whether recall lasted.",
    "The comparison raises a practical question about when an assessment happens, because the interval between study and test affects what the evidence can show.",
    "There is a real limitation here: the source does not examine transfer to new tasks, so applying these findings elsewhere remains an open question.",
    "Put together, the studies make test timing central to interpretation, but they leave uncertainty about how far the result travels beyond the measured task.",
  ];
  const text = (index: number) => `${passages[index]} For turn ${index + 1}, connect the evidence to its conditions, notice the limitation, and avoid claiming more than the study established. The detail in turn ${index + 1} makes that connection clearer for a listener. The specific explanation for this turn ${index + 1} joins practice schedule, test intervals, delayed recall, and task transfer without making the source broader than it is.`.split(/\s+/u).slice(0, wordsPerTurn).join(" ");
  return { title: "Why timing changes what we learn", turns: Array.from({ length: 8 }, (_, index) => ({ speaker: index % 2 === 0 ? "host_a" as const : "host_b" as const, text: text(index), ideaIds: [`I${(index % 4) + 1}`] })) };
}

function tinyMp3() {
  const bytes = new Uint8Array(10 * 417);
  for (let offset = 0; offset < bytes.length; offset += 417) bytes.set([0xff, 0xfb, 0x90, 0x64], offset);
  return bytes;
}

function providerFor(...scripts: SpokenScript[]) {
  const generated = [chunkNotes, map, outline, ...scripts];
  const generateJson = vi.fn().mockImplementation(async () => {
    const next = generated.shift();
    if (!next) throw new Error("unexpected generation request");
    return next;
  });
  const synthesizeTurn = vi.fn().mockResolvedValue({ bytes: tinyMp3(), durationMs: 261, mediaType: "audio/mpeg" });
  const synthesize = vi.fn().mockResolvedValue({ bytes: tinyMp3(), durationMs: 261, mediaType: "audio/mpeg" });
  return { provider: { id: "cloudflare-workers-ai", generateJson, synthesizeTurn, synthesize } as unknown as AiProvider, generateJson, synthesizeTurn, synthesize };
}

describe("multi-stage source-grounded podcast stream", () => {
  it("maps every semantic chunk, outlines, validates a substantive script, then synthesizes raw two-voice turns", async () => {
    const { provider, generateJson, synthesizeTurn, synthesize } = providerFor(scriptFixture());
    const response = streamPodcast(input, provider);
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(generateJson).toHaveBeenCalledTimes(4);
    expect(generateJson.mock.calls[0][0].prompt).toContain(input.text.slice(0, 100));
    expect(generateJson.mock.calls[1][0].prompt).toContain("passage-notes");
    expect(generateJson.mock.calls[2][0].prompt).toContain("document-map");
    expect(generateJson.mock.calls[1][0].prompt).toContain("ORIGINAL SOURCE TEXT");
    expect(generateJson.mock.calls[1][0].prompt).toContain(input.text.slice(-100));
    expect(generateJson.mock.calls[3][0].prompt).toContain("outline");
    expect(synthesizeTurn).toHaveBeenCalledTimes(8);
    expect(synthesizeTurn.mock.calls[0]).toEqual([scriptFixture().turns[0].text, "angus"]);
    expect(synthesizeTurn.mock.calls[1]).toEqual([scriptFixture().turns[1].text, "asteria"]);
    expect(synthesize).not.toHaveBeenCalled();
    expect(body).toContain('event: ready');
    expect(body).toContain('"provider":"cloudflare-workers-ai"');
    expect(body).toContain('"llmModel":"provider-unspecified"');
    expect(body).toContain('"audioSegments"');
    expect(body).toContain(Buffer.from(tinyMp3()).toString("base64"));
    expect(body.indexOf('event: ready')).toBeGreaterThan(body.indexOf('event: stage\ndata: {"stage":"generating_audio"}'));
    expect(podcastTarget(12).minWords).toBe(600);
  });

  it("retries an unexpectedly short generation once and only sends the compliant rewrite to TTS", async () => {
    const short: SpokenScript = { title: "Pangaan", turns: Array.from({ length: 6 }, () => ({ speaker: "host_a", text: "Pangaan makes invisible economic flows visible through verified outcomes. This is the central point and a generic short description for the topic.", ideaIds: ["I1"] })) };
    const { provider, generateJson, synthesizeTurn } = providerFor(short, scriptFixture());
    const body = await (await streamPodcast(input, provider)).text();
    expect(generateJson).toHaveBeenCalledTimes(5);
    expect(generateJson.mock.calls[4][0].system).toContain("previous draft was below the required quality gate");
    expect(synthesizeTurn).toHaveBeenCalledTimes(8);
    expect(body).toContain('event: ready');
  });

  it("fails closed after one retry when an 12-page script is still too short", async () => {
    const short = { title: "Pangaan", turns: Array.from({ length: 6 }, () => ({ speaker: "host_a" as const, text: "Pangaan makes invisible economic flows visible through verified outcomes. This is a short generic description.", ideaIds: ["I1"] })) };
    const { provider, synthesizeTurn } = providerFor(short, short);
    const body = await (await streamPodcast(input, provider)).text();
    expect(body).toContain("script did not meet this source's length and grounding checks");
    expect(body).not.toContain('event: ready');
    expect(synthesizeTurn).not.toHaveBeenCalled();
  });

  it("emits an error and never a ready event when Aura speech fails", async () => {
    const { provider, synthesizeTurn } = providerFor(scriptFixture());
    synthesizeTurn.mockRejectedValue(new Error("provider unavailable"));
    const body = await (await streamPodcast(input, provider)).text();
    expect(body).toContain("event: error");
    expect(body).not.toContain("event: ready");
    expect(body).toContain("no sample audio was substituted");
  });

  it("identifies malformed map generation without echoing source text or synthesizing", async () => {
    const generateJson = vi.fn().mockRejectedValue(new AiProviderError("AI_OUTPUT_INVALID", undefined, "model_schema_mismatch"));
    const synthesize = vi.fn();
    const body = await (await streamPodcast(input, { id: "cloudflare-workers-ai", generateJson, synthesize } as unknown as AiProvider)).text();
    expect(body).toContain('"stage":"understanding_document"');
    expect(body).toContain('"code":"AI_OUTPUT_INVALID"');
    expect(body).toContain('"diagnostic":"model_schema_mismatch"');
    expect(body).toContain('"sourcePages":12');
    expect(body).toContain('"modelRequests":[]');
    expect(body).not.toContain(input.text);
    expect(synthesize).not.toHaveBeenCalled();
    expect(body).not.toContain('event: ready');
  });

  it("separates a non-verbatim source quote from a provider schema failure", async () => {
    const invalidMap = { ...map, keyIdeas: map.keyIdeas.map((idea, index) => index === 0 ? { ...idea, evidence: ["A quotation that does not occur in this document."] } : idea) };
    const generated = [chunkNotes, invalidMap];
    const generateJson = vi.fn().mockImplementation(async () => generated.shift());
    const synthesizeTurn = vi.fn();
    const body = await (await streamPodcast(input, { id: "cloudflare-workers-ai", generateJson, synthesizeTurn } as unknown as AiProvider)).text();
    expect(body).toContain('"diagnostic":"source_quote_mismatch"');
    expect(body).toContain('"modelRequests":[{"step":"document_map_chunk_1"');
    expect(body).not.toContain(input.text);
    expect(synthesizeTurn).not.toHaveBeenCalled();
    expect(body).not.toContain('event: ready');
  });
});
