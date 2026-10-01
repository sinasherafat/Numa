export const LOCAL_UPLOAD_LIMITS = {
  pdfBytes: 4 * 1024 * 1024,
  pages: 20,
  textCharacters: 20_000,
} as const;

export type ParsedPdf = { pageCount: number; pages: string[] };

export type UploadDocument = {
  name: string;
  size: number;
  pageCount: number;
  text: string;
  mode: "local-test" | "remote";
};

export type LocalPdfDocument = UploadDocument & { mode: "local-test" };

export interface UploadAdapter {
  readonly mode: "local-test" | "remote";
  inspect(file: File): Promise<UploadDocument>;
}

export type PdfParser = (bytes: Uint8Array) => Promise<ParsedPdf>;

async function parsePdf(bytes: Uint8Array): Promise<ParsedPdf> {
  const { getDocumentProxy, extractText } = await import("unpdf");
  const document = await getDocumentProxy(bytes);
  const result = await extractText(document, { mergePages: false });
  return {
    pageCount: result.totalPages,
    pages: Array.isArray(result.text) ? result.text : [result.text],
  };
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  if (typeof file.arrayBuffer === "function") return new Uint8Array(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer
      ? resolve(new Uint8Array(reader.result))
      : reject(new Error("The browser did not return PDF bytes."));
    reader.onerror = () => reject(reader.error ?? new Error("The PDF could not be read."));
    reader.readAsArrayBuffer(file);
  });
}

export class LocalUploadAdapter implements UploadAdapter {
  readonly mode = "local-test" as const;

  constructor(private readonly parse: PdfParser = parsePdf) {}

  async inspect(file: File): Promise<LocalPdfDocument> {
    if (file.type && file.type.toLowerCase() !== "application/pdf") {
      throw new Error("Choose a PDF file. This file is marked as a different file type.");
    }
    if (file.size > LOCAL_UPLOAD_LIMITS.pdfBytes) {
      throw new Error("This PDF is too large. Choose a file that is 4 MiB or smaller.");
    }
    if (file.size === 0) {
      throw new Error("This file is empty. Choose a readable PDF.");
    }

    const bytes = await readFileBytes(file);
    const signature = new TextDecoder().decode(bytes.subarray(0, 5));
    if (signature !== "%PDF-") {
      throw new Error("This file does not look like a PDF. Choose a valid .pdf file.");
    }

    let parsed: ParsedPdf;
    try {
      parsed = await this.parse(bytes);
    } catch {
      throw new Error("We couldn't read this PDF. Check that it opens and isn't password-protected, then try again.");
    }

    if (!Number.isInteger(parsed.pageCount) || parsed.pageCount < 1) {
      throw new Error("This PDF has no readable pages. Choose a non-empty PDF.");
    }
    if (parsed.pageCount > LOCAL_UPLOAD_LIMITS.pages) {
      throw new Error("This PDF has more than 20 pages. Choose a shorter PDF for local testing.");
    }

    const text = parsed.pages.join("\n\n").trim();
    if (!text) {
      throw new Error("No selectable text was found. Choose a text-based PDF; scanned-image PDFs aren't supported in local test mode.");
    }
    if (text.length > LOCAL_UPLOAD_LIMITS.textCharacters) {
      throw new Error("This PDF contains more than 20,000 characters. Choose a shorter text-based PDF for local testing.");
    }

    return {
      name: file.name,
      size: file.size,
      pageCount: parsed.pageCount,
      text,
      mode: "local-test",
    };
  }
}

export function formatFileSize(size: number): string {
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}
