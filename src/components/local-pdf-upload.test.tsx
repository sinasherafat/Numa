import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalPdfUpload } from "./local-pdf-upload";
import { LocalUploadAdapter, type UploadDocument, type UploadAdapter } from "@/lib/uploads/local";

function Harness({ adapter = new LocalUploadAdapter() }: { adapter?: UploadAdapter }) {
  const [document, setDocument] = useState<UploadDocument | null>(null);
  return <LocalPdfUpload document={document} onDocumentChange={setDocument} adapter={adapter}/>;
}

const result: UploadDocument = {
  name: "my-real-notes.pdf",
  size: 1536,
  pageCount: 3,
  text: "Actual extracted text from my selected PDF.",
  mode: "local-test",
};

afterEach(cleanup);

describe("LocalPdfUpload", () => {
  it("starts empty and does not render the old demo PDF as selected", () => {
    render(<Harness/>);
    expect(screen.getByText(/No document selected/)).toBeInTheDocument();
    expect(screen.queryByText("Learning intervals.pdf")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Choose a PDF file")).toHaveAttribute("accept", "application/pdf,.pdf");
  });

  it("shows the real filename, file size, page count, and extracted text after selection", async () => {
    const adapter: UploadAdapter = { mode: "local-test", inspect: vi.fn().mockResolvedValue(result) };
    render(<Harness adapter={adapter}/>);
    const file = new File(["real bytes"], result.name, { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Choose a PDF file"), { target: { files: [file] } });

    expect(await screen.findByText(result.name)).toBeInTheDocument();
    expect(screen.getByText("1.5 KB · 3 pages · Real file")).toBeInTheDocument();
    expect(screen.getByText(/Local test upload/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/View extracted text/));
    expect(screen.getByText(result.text)).toBeInTheDocument();
    expect(adapter.inspect).toHaveBeenCalledWith(file);
  });

  it("shows an actionable error when the selected file is not a PDF", async () => {
    render(<Harness/>);
    fireEvent.change(screen.getByLabelText("Choose a PDF file"), {
      target: { files: [new File(["text"], "notes.txt", { type: "text/plain" })] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a PDF file");
  });

  it("removes a selected local document", async () => {
    const adapter: UploadAdapter = { mode: "local-test", inspect: vi.fn().mockResolvedValue(result) };
    render(<Harness adapter={adapter}/>);
    fireEvent.change(screen.getByLabelText("Choose a PDF file"), {
      target: { files: [new File(["real bytes"], result.name, { type: "application/pdf" })] },
    });
    expect(await screen.findByText(result.name)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove selected PDF" }));
    await waitFor(() => expect(screen.queryByTestId("local-upload-document")).not.toBeInTheDocument());
    expect(screen.getByText(/No document selected/)).toBeInTheDocument();
  });
});
