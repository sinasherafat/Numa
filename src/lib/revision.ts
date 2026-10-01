export type ChapterRef = { id: string; played: boolean; current?: boolean };
export type SessionRevision = { id: string; sequence: number; chapters: ChapterRef[] };
export type PlaybackCursor = { revisionId: string; version: number; chapterId: string };
export type AdaptationProposal = {
  id: string;
  baseRevisionId: string;
  expectedCursorVersion: number;
  replacementChapterIds: string[];
};

export class RevisionConflict extends Error {}

export function activateAdaptation(
  current: SessionRevision,
  cursor: PlaybackCursor,
  proposal: AdaptationProposal,
): SessionRevision {
  if (proposal.baseRevisionId !== current.id || cursor.revisionId !== current.id) {
    throw new RevisionConflict("The listening route changed after this proposal was created.");
  }
  if (proposal.expectedCursorVersion !== cursor.version) {
    throw new RevisionConflict("The listening position changed after this proposal was created.");
  }
  const boundary = current.chapters.findIndex((chapter) => chapter.id === cursor.chapterId);
  if (boundary < 0) throw new RevisionConflict("The active chapter does not belong to this revision.");
  const immutablePrefix = current.chapters.slice(0, boundary + 1);
  return {
    id: `${current.id}:adapted:${proposal.id}`,
    sequence: current.sequence + 1,
    chapters: [
      ...immutablePrefix,
      ...proposal.replacementChapterIds.map((id) => ({ id, played: false })),
    ],
  };
}

export type ConceptEvidence = {
  id: string;
  conceptId: string;
  type: "exposure" | "self_report" | "explain_back" | "gap" | "not_assessed";
  rejectedAt?: string;
};

export function personalizationEvidence(
  evidence: ConceptEvidence[],
  consentEnabled: boolean,
  forgottenConceptIds: Set<string>,
) {
  if (!consentEnabled) return [];
  return evidence.filter((item) => !item.rejectedAt && !forgottenConceptIds.has(item.conceptId));
}
