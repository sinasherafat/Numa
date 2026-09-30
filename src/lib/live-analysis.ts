import { z } from "zod";

const citations = z.array(z.string().uuid()).max(6);

export const comparisonSchema = z.object({
  agreements: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  differences: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  conditions: z.array(z.object({ condition: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  unknowns: z.array(z.object({ question: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
});

export const changesSchema = z.object({
  added: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  removed: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  modified: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
  uncertain: z.array(z.object({ claim: z.string().min(1).max(300), explanation: z.string().min(1).max(500), citationChunkIds: citations })).max(6),
});

export type GroundedChunk = { id: string; versionId: string; sourceId: string; title: string; page: number; text: string };

export function renderBoundedChunks(label: string, chunks: GroundedChunk[], maxCharacters: number) {
  let remaining = Math.max(0, maxCharacters - label.length - 2);
  const included: GroundedChunk[] = [];
  const rendered: string[] = [];
  for (const chunk of chunks) {
    if (remaining <= 0) break;
    const header = `[chunk ${chunk.id}; source ${chunk.versionId}; physical PDF page ${chunk.page}]\n`;
    const allowance = remaining - header.length;
    if (allowance <= 0) break;
    const text = chunk.text.slice(0, allowance);
    if (!text.trim()) continue;
    rendered.push(header + text);
    included.push({ ...chunk, text });
    remaining -= header.length + text.length + 2;
  }
  return { text: `${label}:\n${rendered.join("\n\n")}`, chunks: included };
}

export function citationsAreGrounded(items: Array<{ citationChunkIds: string[] }>, allowed: Set<string>) {
  return items.every((item) => item.citationChunkIds.length > 0 && item.citationChunkIds.every((id) => allowed.has(id)));
}

export function annotateCitations<T extends { citationChunkIds: string[] }>(items: T[], chunks: GroundedChunk[]) {
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  return items.map(({ citationChunkIds, ...item }) => ({
    ...item,
    sources: citationChunkIds.map((id) => {
      const chunk = byId.get(id)!;
      return { chunkId: id, sourceVersionId: chunk.versionId, sourceId: chunk.sourceId, title: chunk.title, physicalPage: chunk.page };
    }),
  }));
}
