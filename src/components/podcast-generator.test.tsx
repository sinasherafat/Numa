import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UploadDocument } from "@/lib/uploads/local";
import { PodcastGenerator } from "./podcast-generator";

const document: UploadDocument = { name: "real-notes.pdf", size: 1200, pageCount: 1, text: "Actual extracted source text, with evidence and limitations.", mode: "local-test" };

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("PodcastGenerator", () => {
  it("requires explicit consent and only reports ready after the real audio event arrives", async () => {
    const url = "blob:real-podcast";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response([
      'event: stage\ndata: {"stage":"creating_script"}\n\n',
      'event: script\ndata: {"title":"Grounded learning","script":"Host A: A real source-grounded script."}\n\n',
      'event: stage\ndata: {"stage":"generating_audio"}\n\n',
      `event: ready\ndata: {"title":"Grounded learning","script":"Host A: A real source-grounded script.","durationMs":42000,"mediaType":"audio/mpeg","audioBase64":"AQID","provider":"cloudflare-workers-ai"}\n\n`,
    ].join(""), { headers: { "Content-Type": "text/event-stream" } })));
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn().mockReturnValue(url), revokeObjectURL: vi.fn() });

    render(<PodcastGenerator document={document}/>);
    const button = screen.getByRole("button", { name: "Generate Podcast" });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(button);

    expect(await screen.findByText("Live podcast ready · 0:42")).toBeInTheDocument();
    expect(screen.getByLabelText("Generated podcast audio")).toHaveAttribute("src", url);
    expect(fetch).toHaveBeenCalledWith("/api/podcast/generate", expect.objectContaining({ method: "POST" }));
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
    expect(body.text).toBe(document.text);
    expect(body.aiProcessingNoticeAccepted).toBe(true);
  });

  it("never shows a success player when the provider returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('event: error\ndata: {"message":"Cloudflare free allocation exhausted. No podcast was created."}\n\n', { headers: { "Content-Type": "text/event-stream" } })));
    render(<PodcastGenerator document={document}/>);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Generate Podcast" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("free allocation exhausted");
    expect(screen.queryByLabelText("Generated podcast audio")).not.toBeInTheDocument();
    expect(screen.queryByText(/Live podcast ready/)).not.toBeInTheDocument();
  });
});
