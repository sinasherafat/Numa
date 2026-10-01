export const PREVIEW_LIMITS = {
  pdfBytes: 4 * 1024 * 1024,
  pdfPages: 20,
  extractedCharacters: 20_000,
  podcastChunkCharacters: 4_500,
  podcastChunkCount: 5,
  scriptCharacters: 5_000,
  scriptWords: 800,
  podcastTtsCharacters: 5_000,
  podcastTtsSegments: 16,
  audioBytes: 8 * 1024 * 1024,
  audioMinutes: 7,
  workflowAttempts: 3,
} as const;
