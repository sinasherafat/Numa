import { z } from "zod";
import { PREVIEW_LIMITS } from "@/lib/ai/limits";

const keyPointSchema = z.object({
  point: z.string().trim().min(12).max(300),
  evidence: z.array(z.string().trim().min(8).max(240)).min(1).max(4),
});

export const chunkNotesSchema = z.object({
  title: z.string().trim().max(180),
  thesis: z.string().trim().max(500),
  keyIdeas: z.array(keyPointSchema).max(6),
  evidenceAndExamples: z.array(z.string().trim().max(280)).max(6),
  definitions: z.array(z.string().trim().max(240)).max(6),
  claims: z.array(z.string().trim().max(280)).max(6),
  caveats: z.array(z.string().trim().max(280)).max(6),
  relationships: z.array(z.string().trim().max(280)).max(6),
  conclusion: z.string().trim().max(500),
  tensionsAndQuestions: z.array(z.string().trim().max(280)).max(6),
  sectionsWorthDiscussing: z.array(z.string().trim().max(240)).max(6),
});

export const documentMapSchema = z.object({
  title: z.string().trim().min(3).max(180),
  centralThesis: z.string().trim().min(20).max(500),
  keyIdeas: z.array(z.object({ id: z.string().regex(/^I[1-9]\d?$/), ...keyPointSchema.shape })).min(3).max(10),
  evidenceAndExamples: z.array(z.string().trim().min(8).max(280)).max(12),
  definitions: z.array(z.string().trim().min(4).max(240)).max(10),
  claims: z.array(z.string().trim().min(8).max(280)).max(10),
  caveats: z.array(z.string().trim().min(8).max(280)).max(10),
  relationships: z.array(z.string().trim().min(8).max(280)).max(10),
  conclusion: z.string().trim().min(12).max(500),
  tensionsAndQuestions: z.array(z.string().trim().min(8).max(280)).max(8),
  sectionsWorthDiscussing: z.array(z.string().trim().min(4).max(240)).max(10),
});

export const podcastOutlineSchema = z.object({
  hook: z.string().trim().min(20).max(320),
  listenerPromise: z.string().trim().min(20).max(320),
  sections: z.array(z.object({
    purpose: z.string().trim().min(8).max(180),
    ideaIds: z.array(z.string().regex(/^I[1-9]\d?$/)).min(1).max(4),
    talkingPoints: z.array(z.string().trim().min(8).max(220)).min(1).max(4),
    transition: z.string().trim().min(4).max(180),
  })).min(6).max(10),
  closingSynthesis: z.string().trim().min(20).max(320),
});

export const spokenScriptSchema = z.object({
  title: z.string().trim().min(3).max(90),
  turns: z.array(z.object({
    speaker: z.enum(["host_a", "host_b"]),
    text: z.string().trim().min(24).max(1_000),
    ideaIds: z.array(z.string().regex(/^I[1-9]\d?$/)).min(1).max(4),
  })).min(6).max(PREVIEW_LIMITS.podcastTtsSegments),
});

export type ChunkNotes = z.infer<typeof chunkNotesSchema>;
export type DocumentMap = z.infer<typeof documentMapSchema>;
export type PodcastOutline = z.infer<typeof podcastOutlineSchema>;
export type SpokenScript = z.infer<typeof spokenScriptSchema>;

export type PodcastTarget = { minWords: number; maxWords: number; minutes: string; label: string };

export function podcastTarget(pageCount: number): PodcastTarget {
  if (pageCount <= 3) return { minWords: 220, maxWords: 380, minutes: "2–3", label: "short source" };
  if (pageCount <= 7) return { minWords: 380, maxWords: 600, minutes: "3–5", label: "medium source" };
  if (pageCount <= 15) return { minWords: 600, maxWords: 800, minutes: "5–7", label: "long source" };
  return { minWords: 720, maxWords: 800, minutes: "6–7", label: "very long source (Preview free-allocation cap)" };
}

function splitOversizedParagraph(paragraph: string, maxCharacters: number) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((part) => part.trim()).filter(Boolean) ?? [paragraph];
  const pieces: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (sentence.length > maxCharacters) {
      if (current) pieces.push(current);
      current = "";
      for (let offset = 0; offset < sentence.length; offset += maxCharacters) pieces.push(sentence.slice(offset, offset + maxCharacters));
      continue;
    }
    if (current && current.length + sentence.length + 1 > maxCharacters) {
      pieces.push(current);
      current = sentence;
    } else current = current ? `${current} ${sentence}` : sentence;
  }
  if (current) pieces.push(current);
  return pieces;
}

/** Split at paragraph/sentence boundaries while preserving every source character. */
export function chunkDocument(text: string, maxCharacters: number = PREVIEW_LIMITS.podcastChunkCharacters) {
  const paragraphs = text.split(/\n\s*\n/u).map((part) => part.trim()).filter(Boolean);
  const units = paragraphs.flatMap((part) => part.length <= maxCharacters ? [part] : splitOversizedParagraph(part, maxCharacters));
  const chunks: string[] = [];
  let current = "";
  for (const unit of units) {
    const candidate = current ? `${current}\n\n${unit}` : unit;
    if (candidate.length > maxCharacters && current) {
      chunks.push(current);
      current = unit;
    } else current = candidate;
  }
  if (current) chunks.push(current);
  return chunks;
}

export function flattenTurns(turns: SpokenScript["turns"]) {
  return turns.map((turn) => `${turn.speaker === "host_a" ? "Host A" : "Host B"}: ${turn.text}`).join("\n\n");
}

export function validateSpokenScript(script: SpokenScript, sourceMap: DocumentMap, target: PodcastTarget) {
  const totalCharacters = script.turns.reduce((sum, turn) => sum + turn.text.length, 0);
  const words = script.turns.flatMap((turn) => turn.text.split(/\s+/u).filter(Boolean));
  const knownIdeas = new Set(sourceMap.keyIdeas.map((idea) => idea.id));
  const usedIdeas = new Set(script.turns.flatMap((turn) => turn.ideaIds));
  const allIdsValid = [...usedIdeas].every((id) => knownIdeas.has(id));
  const stopWords = new Set(["about", "after", "again", "among", "because", "before", "being", "could", "different", "first", "from", "important", "might", "other", "should", "their", "there", "these", "those", "through", "under", "using", "which", "while", "would"]);
  const sourceVocabulary = sourceMap.keyIdeas.flatMap((idea) => idea.point.toLowerCase().match(/[\p{L}\p{N}]{5,}/gu) ?? []).filter((word) => !stopWords.has(word));
  const scriptVocabulary = new Set(words.map((word) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")).filter((word) => word.length >= 5 && !stopWords.has(word)));
  const specificTerms = new Set(sourceVocabulary.filter((word) => scriptVocabulary.has(word)));
  const sameScriptLanguage = sourceMap.keyIdeas.some((idea) => /\p{Script=Latin}/u.test(idea.point));
  const sentenceCounts = new Map<string, number>();
  for (const turn of script.turns) {
    for (const sentence of turn.text.split(/[.!?]+/u).map((part) => part.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()).filter((part) => part.length >= 28)) {
      sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
    }
  }
  const repeatedSubstantiveSentence = [...sentenceCounts.values()].some((count) => count > 2);
  const minimumIdeas = Math.min(4, sourceMap.keyIdeas.length);
  const metadataOnly = /podcast episode\s*\d|today we(?:'re| are) going to discuss a document/iu.test(script.title) || script.title.split(/\s+/u).length > 12 ||
    script.turns.every((turn) => /^(?:title|description|summary)\s*:/iu.test(turn.text));

  return {
    valid: words.length >= target.minWords && words.length <= target.maxWords &&
      totalCharacters <= PREVIEW_LIMITS.scriptCharacters && script.turns.length >= 6 &&
      usedIdeas.size >= minimumIdeas && allIdsValid && (!sameScriptLanguage || specificTerms.size >= 3) && !metadataOnly && !repeatedSubstantiveSentence,
    words: words.length,
    characters: totalCharacters,
    turns: script.turns.length,
    coveredIdeas: usedIdeas.size,
    specificTerms: specificTerms.size,
  };
}

export function validateDocumentMapEvidence(sourceMap: DocumentMap, sourceChunks: string[]) {
  const normalize = (value: string) => value
    .normalize("NFKC")
    .replace(/(?<=\p{L})-[\t ]*\r?\n[\t ]*(?=\p{L})/gu, "")
    .replace(/\u00ad/gu, "")
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.join(" ") ?? "";
  const source = normalize(sourceChunks.join("\n"));
  return sourceMap.keyIdeas.every((idea) => idea.evidence.some((quote) => {
    const normalizedQuote = normalize(quote);
    return normalizedQuote.length > 0 && source.includes(normalizedQuote);
  }));
}

/** Attach exact excerpts from the source to model-written ideas using lexical overlap. */
export function groundDocumentMapEvidence(sourceMap: DocumentMap, sourceChunks: string[]) {
  const source = sourceChunks.join("\n")
    .normalize("NFKC")
    .replace(/(?<=\p{L})-[\t ]*\r?\n[\t ]*(?=\p{L})/gu, "")
    .replace(/\u00ad/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  const candidates = source
    .split(/(?<=[.!?])\s+|\s*;\s+/gu)
    .flatMap((sentence) => {
      const words = sentence.match(/\S+/gu) ?? [];
      if (sentence.length <= 200) return [sentence];
      const segments: string[] = [];
      let start = 0;
      while (start < words.length) {
        let end = start;
        let length = 0;
        while (end < words.length && length + words[end].length + (end > start ? 1 : 0) <= 200) {
          length += words[end].length + (end > start ? 1 : 0);
          end += 1;
        }
        if (end === start) break;
        segments.push(words.slice(start, end).join(" "));
        if (end === words.length) break;
        start = Math.max(start + 1, end - 5);
      }
      return segments;
    })
    .map((text) => text.trim())
    .filter((text) => text.length >= 16 && text.length <= 240);
  const stopWords = new Set(["about", "after", "again", "also", "among", "because", "before", "being", "could", "does", "each", "from", "have", "into", "more", "most", "other", "over", "same", "some", "such", "than", "that", "their", "them", "then", "there", "these", "they", "this", "those", "through", "under", "using", "very", "what", "when", "where", "which", "while", "with", "would"]);
  const terms = (text: string) => new Set((text.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? [])
    .map((word) => word.length > 5 && word.endsWith("ies") ? `${word.slice(0, -3)}y` : word.length > 5 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word)
    .filter((word) => !stopWords.has(word)));

  let matchedIdeas = 0;
  const keyIdeas = sourceMap.keyIdeas.map((idea) => {
    const pointTerms = terms(idea.point);
    const locatorTerms = terms(idea.evidence.join(" "));
    const ranked = candidates.map((text) => {
      const candidateTerms = terms(text);
      const pointMatches = [...pointTerms].filter((word) => candidateTerms.has(word)).length;
      const locatorMatches = [...locatorTerms].filter((word) => candidateTerms.has(word)).length;
      return { text, pointMatches, locatorMatches, coverage: pointTerms.size === 0 ? 0 : pointMatches / pointTerms.size };
    }).sort((left, right) => right.coverage - left.coverage || right.pointMatches - left.pointMatches || right.locatorMatches - left.locatorMatches || left.text.length - right.text.length);
    const best = ranked[0];
    const minimumMatches = Math.min(2, pointTerms.size);
    const ideaGrounded = best && best.pointMatches >= minimumMatches && best.coverage >= 0.25;
    const locatorGrounded = best && best.pointMatches >= 1 && best.locatorMatches >= 2;
    if (best && (ideaGrounded || locatorGrounded)) {
      matchedIdeas += 1;
      return { ...idea, evidence: [best.text] };
    }
    return null;
  });

  const groundedIdeas = keyIdeas.filter((idea): idea is NonNullable<typeof idea> => idea !== null);
  return {
    map: groundedIdeas.length >= 3 ? { ...sourceMap, keyIdeas: groundedIdeas } : null,
    matchedIdeas,
    totalIdeas: sourceMap.keyIdeas.length,
  };
}
