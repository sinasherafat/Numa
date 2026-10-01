import { describe, expect, it } from "vitest";
import { chunkDocument, flattenTurns, podcastTarget, validateDocumentMapEvidence, validateSpokenScript, type DocumentMap, type SpokenScript } from "@/lib/ai/podcast-quality";

function mapFixture(): DocumentMap {
  return {
    title: "Learning intervals",
    centralThesis: "The source separates short-term performance from later recall.",
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
    conclusion: "The timing of tests matters, but task transfer remains open.",
    tensionsAndQuestions: ["Do these findings transfer to unfamiliar tasks?"],
    sectionsWorthDiscussing: ["The different recall intervals"],
  };
}

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
  return {
    title: "Why timing changes what we learn",
    turns: Array.from({ length: 8 }, (_, index) => ({
      speaker: index % 2 === 0 ? "host_a" as const : "host_b" as const,
      text: text(index),
      ideaIds: [`I${(index % 4) + 1}`],
    })),
  };
}

describe("podcast quality constraints", () => {
  it("splits long documents at semantic boundaries without dropping non-whitespace text", () => {
    const source = ["First section. One idea.", "Second section. Another idea.", "Third section. Final evidence."].join("\n\n");
    const chunks = chunkDocument(source, 32);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join(" ").replace(/\s+/gu, " ")).toBe(source.replace(/\s+/gu, " "));
    expect(chunks.every((chunk) => chunk.length <= 32)).toBe(true);
  });

  it("chooses page-adaptive targets and keeps a 12-page source at a 5–7 minute target", () => {
    expect(podcastTarget(2)).toMatchObject({ minWords: 220, minutes: "2–3" });
    expect(podcastTarget(6)).toMatchObject({ minWords: 380, minutes: "3–5" });
    expect(podcastTarget(12)).toMatchObject({ minWords: 600, minutes: "5–7" });
    expect(podcastTarget(18)).toMatchObject({ minWords: 720, minutes: "6–7" });
  });

  it("rejects the tiny title-and-description script that passed the previous 200-character schema", () => {
    const tiny: SpokenScript = { title: "Pangaan Podcast", turns: [{ speaker: "host_a", text: "Pangaan makes hidden economic flows visible through verified outcomes. This is why the subject matters to a wider audience today.", ideaIds: ["I1"] }, { speaker: "host_b", text: "The description is short and generic. The paper says little more in this quick version.", ideaIds: ["I2"] }, ...Array.from({ length: 4 }, () => ({ speaker: "host_a" as const, text: "That is the main takeaway from this document and it is worth remembering clearly.", ideaIds: ["I1"] }))] };
    const result = validateSpokenScript(tiny, mapFixture(), podcastTarget(12));
    expect(result.valid).toBe(false);
    expect(result.words).toBeLessThan(600);
  });

  it("accepts a substantive source-mapped dialogue and strips speaker labels from synthesis text", () => {
    const script = scriptFixture();
    expect(validateSpokenScript(script, mapFixture(), podcastTarget(12)).valid).toBe(true);
    const spoken = flattenTurns(script.turns);
    expect(spoken).toContain("Host A:");
    expect(script.turns[0].text).not.toMatch(/^Host A:/u);
  });

  it("allows a faithful English conversation grounded in a non-Latin source", () => {
    const persianMap = mapFixture();
    persianMap.keyIdeas = persianMap.keyIdeas.map((idea, index) => ({ ...idea, point: ["فاصله آزمون بر یادآوری تأخیری اثر دارد", "برنامه تمرین عملکرد فوری را تغییر می‌دهد", "شرایط تکلیف مقایسه مستقیم را محدود می‌کند", "انتقال به تکالیف تازه حل‌نشده است"][index] }));
    expect(validateSpokenScript(scriptFixture(), persianMap, podcastTarget(12)).valid).toBe(true);
  });

  it("requires at least one exact source quotation for every mapped idea", () => {
    const source = mapFixture();
    expect(validateDocumentMapEvidence(source, ["Longer intervals change the observed result.", "The source does not examine transfer."])).toBe(false);
    expect(validateDocumentMapEvidence(source, source.keyIdeas.flatMap((idea) => idea.evidence))).toBe(true);
  });

  it("matches source quotations across PDF line-wrap hyphenation and punctuation differences", () => {
    const source = mapFixture();
    source.keyIdeas = [source.keyIdeas[0]];
    source.keyIdeas[0].evidence = ["The research compares evidence."];
    expect(validateDocumentMapEvidence(source, ["The research com-\npares evidence!"])).toBe(true);
  });

  it("rejects a long dialogue that claims unknown grounding IDs", () => {
    const script = scriptFixture();
    script.turns[0].ideaIds = ["I9"];
    expect(validateSpokenScript(script, mapFixture(), podcastTarget(12)).valid).toBe(false);
  });

  it("rejects repeated substantive sentences even when the dialogue is long enough", () => {
    const repeated = scriptFixture();
    repeated.turns = Array.from({ length: 8 }, (_, index) => ({ ...repeated.turns[0], speaker: index % 2 === 0 ? "host_a" as const : "host_b" as const, ideaIds: [`I${(index % 4) + 1}`] }));
    expect(validateSpokenScript(repeated, mapFixture(), podcastTarget(12)).valid).toBe(false);
  });
});
