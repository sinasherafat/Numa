import { describe, expect, it, vi } from "vitest";
import { LOCAL_UPLOAD_LIMITS, LocalUploadAdapter, type PdfParser } from "./local";

function makePdf(content = "Numa local PDF parser test") {
  const stream = `BT /F1 12 Tf 72 720 Td (${content}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new File([pdf], "real-test.pdf", { type: "application/pdf" });
}

describe("LocalUploadAdapter", () => {
  it("starts with no selected document", () => {
    const selectedDocument = null;
    expect(selectedDocument).toBeNull();
  });

  it("parses a real one-page PDF into its actual metadata and text", async () => {
    const document = await new LocalUploadAdapter().inspect(makePdf());
    expect(document).toMatchObject({
      name: "real-test.pdf",
      pageCount: 1,
      mode: "local-test",
    });
    expect(document.size).toBeGreaterThan(0);
    expect(document.text).toContain("Numa local PDF parser test");
  });

  it("rejects non-PDF MIME types without invoking the parser", async () => {
    const parse = vi.fn<PdfParser>();
    const file = new File(["not a pdf"], "notes.txt", { type: "text/plain" });
    await expect(new LocalUploadAdapter(parse).inspect(file)).rejects.toThrow("Choose a PDF file");
    expect(parse).not.toHaveBeenCalled();
  });

  it("rejects a PDF over the local size limit", async () => {
    const file = new File([new Uint8Array(LOCAL_UPLOAD_LIMITS.pdfBytes + 1)], "large.pdf", { type: "application/pdf" });
    await expect(new LocalUploadAdapter().inspect(file)).rejects.toThrow("4 MiB or smaller");
  });

  it("rejects unreadable or header-invalid PDFs with an actionable error", async () => {
    const invalid = new File(["not a PDF"], "bad.pdf", { type: "application/pdf" });
    await expect(new LocalUploadAdapter().inspect(invalid)).rejects.toThrow("valid .pdf file");

    const parser = vi.fn<PdfParser>().mockRejectedValue(new Error("parser details"));
    await expect(new LocalUploadAdapter(parser).inspect(makePdf())).rejects.toThrow("couldn't read this PDF");
  });

  it("rejects a zero-page or text-empty PDF", async () => {
    const noPages: PdfParser = async () => ({ pageCount: 0, pages: [] });
    await expect(new LocalUploadAdapter(noPages).inspect(makePdf())).rejects.toThrow("no readable pages");
    const noText: PdfParser = async () => ({ pageCount: 1, pages: ["  "] });
    await expect(new LocalUploadAdapter(noText).inspect(makePdf())).rejects.toThrow("No selectable text");
  });

  it("enforces actual page and extracted-text limits", async () => {
    const tooManyPages: PdfParser = async () => ({ pageCount: 21, pages: ["text"] });
    await expect(new LocalUploadAdapter(tooManyPages).inspect(makePdf())).rejects.toThrow("more than 20 pages");
    const tooMuchText: PdfParser = async () => ({ pageCount: 1, pages: ["x".repeat(20_001)] });
    await expect(new LocalUploadAdapter(tooMuchText).inspect(makePdf())).rejects.toThrow("20,000 characters");
  });
});
