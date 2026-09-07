export type Goal = "understand" | "presentation" | "compare";

export type TranscriptLine = {
  id: string;
  speaker: "A" | "B";
  start: number;
  end: number;
  text: string;
  source: string;
};

export const demoSources = [
  { id: "study-a", title: "Study A · Learning intervals", short: "Study A", pages: 12, added: "September 2", published: "August 4" },
  { id: "study-b", title: "Study B · Recall over time", short: "Study B", pages: 9, added: "September 2", published: "July 21" },
  { id: "study-c", title: "Study C · Transfer conditions", short: "Study C", pages: 14, added: "September 6", published: "August 18" },
] as const;

export const demoTranscript: TranscriptLine[] = [
  { id: "t1", speaker: "A", start: 0, end: 7, text: "The studies compare different learning schedules, but their main outcome is later recall rather than immediate performance.", source: "Study A · p. 3" },
  { id: "t2", speaker: "B", start: 7, end: 14, text: "So the timing of the test matters too? A strong result today does not necessarily mean the learning will last.", source: "Study B · p. 6" },
  { id: "t3", speaker: "A", start: 14, end: 22, text: "Exactly. We should separate short-term performance from later recall, and name the interval used by each study.", source: "Study A · p. 4" },
  { id: "t4", speaker: "B", start: 22, end: 30, text: "Here is a seminar example: rapid rereading can feel fluent now, while spaced retrieval may reveal what remains after a delay.", source: "Example · grounded in A p. 4" },
  { id: "t5", speaker: "A", start: 30, end: 38, text: "Both sources report a benefit for later recall, although the tasks and test intervals are not identical.", source: "Study B · p. 6" },
  { id: "t6", speaker: "B", start: 38, end: 46, text: "That difference limits a direct comparison. Neither source tests whether the benefit transfers to an unfamiliar task.", source: "Study B · p. 7" },
];

export const chapters = [
  { n: "01", title: "What spacing changes", duration: "02:42", status: "played" },
  { n: "02", title: "Why the interval matters", duration: "03:24", status: "current" },
  { n: "03", title: "What the evidence can tell us", duration: "02:18", status: "next" },
  { n: "04", title: "Limits and open questions", duration: "03:05", status: "next" },
] as const;

export const navItems = [
  { href: "/", label: "Home", key: "home" },
  { href: "/library", label: "Library", key: "library" },
  { href: "/topics/spaced-practice/changes", label: "Topics", key: "topics" },
  { href: "/understanding", label: "My Understanding", key: "understanding" },
] as const;

export const routeTitles: Record<string, string> = {
  "/": "Home",
  "/new": "New session",
  "/sources": "Sources",
  "/plan": "Review plan",
  "/listen": "Spaced practice & recall",
  "/listen/ask": "Explain this",
  "/sources/study-a/page/4": "Source evidence",
  "/explain": "Explain it back",
  "/explain/feedback": "Your explanation",
  "/compare": "Compare sources",
  "/topics/spaced-practice/changes": "What changed",
  "/understanding": "My Understanding",
  "/outcome": "Session outcome",
  "/library": "Library",
  "/settings": "Settings",
};

export const goalCopy: Record<Goal, { label: string; description: string; plan: string[] }> = {
  understand: {
    label: "Understand",
    description: "Learn and build your understanding",
    plan: ["The central question", "Core concepts", "Evidence and limits", "Explain the idea back"],
  },
  presentation: {
    label: "Prepare a presentation",
    description: "Turn sources into a clear talk",
    plan: ["The central question", "Methods and findings", "Limits of the evidence", "Practice your explanation"],
  },
  compare: {
    label: "Compare evidence",
    description: "See different perspectives",
    plan: ["Frame one question", "Map comparable claims", "Explain differences", "Name what stays unknown"],
  },
};
