"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileText, LoaderCircle, Trash2, Upload, XCircle } from "lucide-react";
import { formatFileSize, LocalUploadAdapter, type UploadAdapter, type UploadDocument } from "@/lib/uploads/local";

type UploadStatus = "idle" | "processing" | "ready" | "error";

export function LocalPdfUpload({
  document,
  onDocumentChange,
  adapter = new LocalUploadAdapter(),
}: {
  document: UploadDocument | null;
  onDocumentChange: (document: UploadDocument | null) => void;
  adapter?: UploadAdapter;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>(document ? "ready" : "idle");
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function inspectFile(file?: File) {
    if (!file) {
      setError("No file selected. Choose a PDF to continue.");
      setStatus("error");
      return;
    }
    setError("");
    setStatus("processing");
    try {
      const result = await adapter.inspect(file);
      onDocumentChange(result);
      setStatus("ready");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This PDF could not be processed. Choose another PDF and try again.");
      setStatus("error");
    }
  }

  function clearDocument() {
    onDocumentChange(null);
    setError("");
    setStatus("idle");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="local-upload">
      <div
        className={`upload-zone local-upload-zone ${dragging ? "dragging" : ""} ${status === "processing" ? "processing" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void inspectFile(event.dataTransfer.files[0]);
        }}
        aria-busy={status === "processing"}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Choose a PDF file"
          disabled={status === "processing"}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            void inspectFile(file);
          }}
        />
        {status === "processing" ? <LoaderCircle className="upload-spinner" size={26} aria-hidden="true"/> : <Upload size={26} aria-hidden="true"/>}
        <strong>{status === "processing" ? "Reading your PDF…" : "Drop a PDF or choose a file"}</strong>
        <span>{adapter.mode === "local-test" ? "Local test mode · PDF text is read in this browser" : "Remote upload"}</span>
        <em>{adapter.mode === "local-test" ? "No file is sent to storage, Supabase, Workflow, or an AI provider." : "Your file will be sent using the configured remote upload adapter."}</em>
      </div>

      {!document && status === "idle" && <p className="local-upload-hint">No document selected. Choose a text-based PDF up to 4 MiB and 20 pages.</p>}
      {error && <p className="upload-error" role="alert"><XCircle size={17}/>{error}</p>}

      {document && <>
        <article className="source-file local-source-file" data-testid="local-upload-document">
          <FileText size={24} aria-hidden="true"/>
          <div><strong>{document.name}</strong><span>{formatFileSize(document.size)} · {document.pageCount} {document.pageCount === 1 ? "page" : "pages"} · Real file</span></div>
          <span className="ready"><CheckCircle2 size={15}/> {document.mode === "local-test" ? "Local test upload" : "Remote upload"}</span>
          <button className="icon-btn remove-local-upload" type="button" onClick={clearDocument} aria-label="Remove selected PDF"><Trash2 size={17}/></button>
        </article>
        {status === "ready" && <p className="upload-success" role="status"><CheckCircle2 size={16}/>{adapter.mode === "local-test" ? "PDF read successfully in this browser. No remote upload or AI processing occurred." : "PDF upload completed."}</p>}
        <details className="extracted-text">
          <summary>View extracted text · {document.text.length.toLocaleString()} characters</summary>
          <pre>{document.text.slice(0, 2400)}{document.text.length > 2400 ? "\n\n… Preview truncated; all extracted text remains in this session." : ""}</pre>
        </details>
      </>}
    </div>
  );
}
