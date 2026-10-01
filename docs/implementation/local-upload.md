# Local-first PDF upload

The `/new` session begins without a selected source. `UploadAdapter` is the boundary used by the upload UI; the current `LocalUploadAdapter` reads a real PDF `File` in the browser with the existing `unpdf` dependency, validates its signature and bounds, then returns the actual page count and extracted text. The selected metadata and text live in the root React state while navigating the current Numa session. Removing the file clears that state.

“v1.0 human testing currently uses a real client-side PDF upload/parser. Remote persistence, durable Workflow execution, AI generation, STT and TTS remain separate infrastructure adapters and are not falsely represented as live.”

The local adapter does not send the file or its text to Blob, Supabase, Workflow, or an AI provider. Plan and listening stages beyond parsing remain clearly labeled illustrative previews. Remote persistence, durable Workflow execution, AI generation, STT and TTS remain separate infrastructure adapters and are not falsely represented as live.

Limits for this Preview testing mode are 4 MiB, 20 pages, and 20,000 extracted text characters. Scanned-image PDFs without selectable text are not supported; the uploader explains this when parsing finds no text.
