export const PREVIEW_LIMITS = {
  pdfBytes: 4 * 1024 * 1024,
  pdfPages: 20,
  extractedCharacters: 20_000,
  scriptCharacters: 4_000,
  scriptWords: 550,
  audioBytes: 8 * 1024 * 1024,
  audioMinutes: 5,
  workflowAttempts: 3,
} as const;
