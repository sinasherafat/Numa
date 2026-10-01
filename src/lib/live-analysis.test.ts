import { describe, expect, it } from "vitest";
import { annotateCitations, changesSchema, citationsAreGrounded, comparisonSchema, renderBoundedChunks, type GroundedChunk } from "./live-analysis";

const chunk: GroundedChunk = {
  id: "e6ed05ef-887e-45ed-9925-21f17d371037",
  versionId: "a4fb4b7a-b7ec-4960-85dc-6ba498546613",
  sourceId: "cc1886fc-1903-4b37-9df8-63f8cc940148",
  title: "Test PDF",
  page: 2,
  text: "A claim from the real source.",
};

describe("live analysis validation", () => {
  it("accepts a structured multi-source comparison and grounds every cited chunk", () => {
    const result = comparisonSchema.parse({
      agreements: [{ claim: "Both report delayed recall.", explanation: "Each source tests retention after a delay.", citationChunkIds: [chunk.id] }],
      differences: [], conditions: [], unknowns: [],
    });
    expect(citationsAreGrounded(result.agreements, new Set([chunk.id]))).toBe(true);
    expect(annotateCitations(result.agreements, [chunk])[0].sources[0]).toMatchObject({ title: "Test PDF", physicalPage: 2 });
  });

  it("rejects ungrounded claims instead of rendering them as verified", () => {
    expect(citationsAreGrounded([{ citationChunkIds: ["e90a43a0-530a-49ad-b1d2-257942db0514"] }], new Set([chunk.id]))).toBe(false);
    expect(citationsAreGrounded([{ citationChunkIds: [] }], new Set([chunk.id]))).toBe(false);
  });

  it("keeps added, removed, modified, and uncertain changes distinct", () => {
    const result = changesSchema.parse({ added: [], removed: [], modified: [], uncertain: [] });
    expect(Object.keys(result)).toEqual(["added", "removed", "modified", "uncertain"]);
  });

  it("bounds evidence text and only returns citation IDs actually included in the prompt", () => {
    const second = { ...chunk, id: "4e1644ab-8ea9-438a-95ba-5ccbc90a8808", text: "B".repeat(300) };
    const rendered = renderBoundedChunks("EVIDENCE", [chunk, second], 170);
    expect(rendered.text.length).toBeLessThanOrEqual(170);
    expect(rendered.chunks.length).toBe(1);
    expect(citationsAreGrounded([{ citationChunkIds: [second.id] }], new Set(rendered.chunks.map(({ id }) => id)))).toBe(false);
  });
});
