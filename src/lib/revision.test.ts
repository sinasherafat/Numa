import { describe, expect, it } from "vitest";
import { RevisionConflict, activateAdaptation, personalizationEvidence } from "./revision";

const revision = {
  id: "rev-1",
  sequence: 1,
  chapters: [
    { id: "chapter-1", played: true },
    { id: "chapter-2", played: false, current: true },
    { id: "chapter-3", played: false },
  ],
};

describe("adaptive revision safety", () => {
  it("preserves played and current chapters and replaces only the future", () => {
    const next = activateAdaptation(
      revision,
      { revisionId: "rev-1", version: 4, chapterId: "chapter-2" },
      { id: "adapt-1", baseRevisionId: "rev-1", expectedCursorVersion: 4, replacementChapterIds: ["chapter-3-clearer", "chapter-4"] },
    );
    expect(next.sequence).toBe(2);
    expect(next.chapters.map((c) => c.id)).toEqual(["chapter-1", "chapter-2", "chapter-3-clearer", "chapter-4"]);
    expect(next.chapters[0]).toBe(revision.chapters[0]);
    expect(next.chapters[1]).toBe(revision.chapters[1]);
  });

  it("rejects stale concurrent acceptance", () => {
    expect(() => activateAdaptation(
      revision,
      { revisionId: "rev-1", version: 5, chapterId: "chapter-2" },
      { id: "adapt-1", baseRevisionId: "rev-1", expectedCursorVersion: 4, replacementChapterIds: ["chapter-3-clearer"] },
    )).toThrow(RevisionConflict);
  });
});

describe("cross-session consent boundary", () => {
  const evidence = [
    { id: "e1", conceptId: "spacing", type: "exposure" as const },
    { id: "e2", conceptId: "transfer", type: "gap" as const },
    { id: "e3", conceptId: "timing", type: "self_report" as const, rejectedAt: "2026-09-07" },
  ];

  it("returns no cross-session evidence while consent is off", () => {
    expect(personalizationEvidence(evidence, false, new Set())).toEqual([]);
  });

  it("excludes rejected and forgotten evidence", () => {
    expect(personalizationEvidence(evidence, true, new Set(["transfer"]))).toEqual([evidence[0]]);
  });
});
