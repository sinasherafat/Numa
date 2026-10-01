import { describe, expect, it } from "vitest";
import { interactionInput, isPublicHttpUrl, sessionInput } from "./domain";

describe("source URL boundary", () => {
  it.each(["http://localhost/paper.pdf", "http://127.0.0.1/a", "http://10.0.0.3/a", "file:///tmp/a.pdf", "ftp://example.com/a"])(
    "blocks private or unsupported URL %s",
    (url) => expect(isPublicHttpUrl(url)).toBe(false),
  );

  it("allows a public HTTPS PDF URL", () => {
    expect(isPublicHttpUrl("https://example.org/research/paper.pdf")).toBe(true);
  });
});

describe("session contracts", () => {
  it("accepts the bounded v1 session shape", () => {
    expect(sessionInput.safeParse({ goal: "presentation", level: "familiar", duration: 10, language: "en", sourceVersionIds: ["sv-1"] }).success).toBe(true);
  });

  it("rejects more than five sources", () => {
    expect(sessionInput.safeParse({ goal: "compare", level: "familiar", duration: 10, language: "en", sourceVersionIds: ["1", "2", "3", "4", "5", "6"] }).success).toBe(false);
  });

  it("requires explicit version and cursor inputs for interactions", () => {
    expect(interactionInput.safeParse({ type: "ask", text: "Why?" }).success).toBe(false);
  });
});
