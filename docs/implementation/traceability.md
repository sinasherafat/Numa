# Numa v1.0 traceability

Status vocabulary: **implemented** means code or UI exists; **verified** means an automated or browser check has passed; **blocked** means an external live path cannot honestly pass with current access. The sample workspace is a fixture, not proof of private-source or model integration. Preview AI uses the server-only Cloudflare Workers AI adapter; no current code path calls Vercel AI Gateway. The MVP core-loop route below bypasses Workflow and does not alter it; legacy authenticated upload/Workflow endpoints retain their separate `42501 Invalid workflow credential` issue. A real 2-page project PDF was parsed and consented on hosted Preview at `f958f90`, but the first attempt returned the generic `AI_OUTPUT_INVALID` and no playable output; the failed stage was not recorded. Code review found and fixed a separate confirmed MeloTTS issue: the documented JSON `result.audio` base64 output was being assigned the envelope's `application/json` type instead of `audio/mpeg`. Stage-safe failure diagnostics and the fix are on `7d6a64d`; its Preview reports Ready, but a second authenticated hosted request remains pending.

## Six product pillars

| ID | Requirement | Implementation | Verification | Blocked live portion |
| --- | --- | --- | --- | --- |
| F01 | A contextual question can change only future unplayed chapters after acceptance; reject and failure preserve the original path | Sample `/listen`; immutable revision algorithm and live ingest/player infrastructure. No live adaptation proposal/acceptance route exists. | Unit tests cover immutable-prefix algorithm and stale cursor; sample browser journey covers accepted update | Live adaptation is not implemented and must not be represented as live |
| F02 | Separate exposure, self-report, explain-back, gaps and not-assessed; explicit cross-session consent; inspect/edit/forget | Sample `/understanding`; live owner-scoped evidence schema/state API, consent, and source-grounded assessment persistence code | Consent unit tests; live two-user RLS test; consent API/build previously verified | Assessment persistence exists, but provider execution and authenticated live forget journey remain unverified; current Numa login was rejected |
| F03 | Voice or text explanation, editable transcript, grounded feedback, Cannot assess, targeted review | Sample `/explain`; live MediaRecorder, private raw-audio policy, Cloudflare Whisper adapter, editable transcript, confirmed-text persistence, grounded assessment route | Deterministic adapter tests and typed persistence; the current hosted route is a fixture | Real STT/assessment are unverified; Preview values are masked and authenticated Numa access is unavailable |
| F04 | Compare 2–5 sources around one question without manufacturing conflict | Authenticated `/api/live/comparisons` uses Cloudflare JSON generation, owner-scoped ready versions, same-topic validation, bounded extracted evidence, chunk UUID validation, physical-page citations, snapshot/outcome persistence, and a live workspace form. | Helper/schema tests pass; route has not been run against the provider or an authenticated hosted session | Live provider execution and browser verification are blocked at the Workflow credential boundary; sample `/compare` remains illustrative |
| F05 | Compare new sources with an explicit reviewed baseline; preserve dates and no automatic baseline movement | Authenticated baseline and `/api/live/changes` routes preserve explicit immutable checkpoints, owner/topic-scoped versions, bounded evidence, cited classifications and persisted change sets. | Helper/schema tests pass; route has not been run against the provider or an authenticated hosted session | Live provider execution and browser verification are blocked at the Workflow credential boundary; sample changes screen remains illustrative |
| F06 | Goal changes path, practice and editable outputs | `/new` starts empty, parses real PDFs in-browser, and offers a consent-gated direct server route: Cloudflare `@cf/openai/gpt-oss-20b` script → Cloudflare `@cf/myshell-ai/melotts` audio → browser audio player. The legacy plan and other downstream feature screens remain illustrative; this MVP audio is session-only and not persisted to Blob/DB. | Local parser/UI tests plus direct-stream service and player-contract tests pass. Hosted real PDF parsing and consent passed once; the first live attempt failed closed with stage unknown. The documented MeloTTS JSON-envelope media type bug is fixed and deployed on `7d6a64d`, but has not yet been retested with real inference. | Real hosted script/audio/playback acceptance remains pending; a non-browser POST is stopped by Vercel Authentication (HTTP 401), and this browser run was interrupted before a second submission. Best-effort per-instance throttling is not a global quota |

## Preserved base capabilities

| ID | Route or component | Status |
| --- | --- | --- |
| B01 | Player pause, Ask/Explain this, return to same audio position | Implemented and browser-verified locally and on the hosted Preview |
| B02 | English-only offered now; strings and `lang` are isolated for later i18n | Implemented |
| B03 | Two synthetic host roles in transcript and generated demo audio | Implemented; fixture audio is downloadable |
| B04 | Evidence chips and `/sources/study-a/page/4` source reader | Implemented |
| B05 | Two sources in comparison and session fixture | Implemented |
| B06 | Audience-shaped seminar example labeled `Example` | Implemented |
| B07 | Explain-back feedback and targeted review action | Implemented |
| B08 | Selected-page metadata in plan and source reader | Fixture implemented; live physical-page extraction and transcript citation persistence implemented, generation smoke blocked |
| B09 | Editable notes, flashcards and textual slide outline | Implemented |
| B10 | Library, listening queue, browser-persisted demo cursor state and complete-revision WAV download | Fixture implemented; live sessions/jobs/audio/outcomes persist and audio streams only through an authenticated owner check |
| B11 | Explain this action and clearer future chapter proposal | Implemented |
| B12 | I know this creates only a self-report presentation state | Implemented; unit model keeps evidence types separate |
| B13 | Finding, limitation, interpretation, example and unknown labels/copy | Implemented in fixture; live structured grounded plan schema exists, provider smoke blocked |

## Screen and state coverage

| ID | Implementation |
| --- | --- |
| S01 Home | `/` with continue, review and recent learning states |
| S02 New session | `/new` starts empty, supports real PDF file selection/drop, local parsing, metadata, text preview, errors, and remove |
| S03 Sources | `/sources` shares the local upload adapter UI; there is no preloaded demo file |
| S04 Plan | `/plan` with sources, chapters, goal, memory and create-audio review |
| S05 Player | `/listen` with audio, transcript, controls, actions and future chapters |
| S06 Ask Explain | `/listen/ask` and responsive side panel |
| S07 Source reader | `/sources/study-a/page/4` with physical-page locator and evidence highlight |
| S08 Explain it back | `/explain` voice permission path, text alternative and transcript editor |
| S09 Feedback | `/explain/feedback` findings, citations, gaps and Cannot-assess explanation |
| S10 Compare | `/compare` desktop table and mobile claim cards |
| S11 Topic Changes | `/topics/spaced-practice/changes` with baseline and dated new source |
| S12 My Understanding | `/understanding` with consent, filters, evidence, edit and forget |
| S13 Outcome | `/outcome` with editable notes, outline, flashcards, practice and Markdown export |
| S14 Library | `/library` sessions, queue and download context |
| S15 Settings | `/settings` memory, raw recording, download and deletion controls |

Sample routes render explicitly labeled fixture content. `/login` and `/workspace` are separate live routes with real empty/loading/error/job/consent/private-source states; they never import fixture data. A provider-denied/misconfigured live job stays failed and never becomes a successful fixture lesson.

## Journeys

| ID | Browser coverage (mirrored by the checked-in Playwright suite) |
| --- | --- |
| J01 First experience | Browser run and `e2e/journeys.spec.ts` create a presentation session, review the plan and open audio |
| J02 Confusion while listening | Browser run opens Explain this, reads the grounded answer and accepts future-only adaptation |
| J03 Explain without coercion | Browser run edits text, submits and explicitly toggles memory |
| J04 Multi-source comparison | Browser run checks agreement, condition difference and unknown |
| J05 Review changes | Browser run checks explicit baseline update and retention of the prior baseline |
| J06 Presentation preparation | J01 plus `/outcome` outline, practice, notes and export UI |

## Risk and acceptance evidence

- E04 concurrent adaptation: deterministic unit test rejects stale cursor version.
- E05 completion is not mastery: player completion never creates explain-back evidence.
- E06 memory off: unit test returns no cross-session personalization evidence.
- E08 corrected transcript: local and hosted browser assessment flows submit the edited text state.
- E09/E10 insufficient evidence and non-comparable conditions: API vocabulary and comparison fixture use explicit states; live model gate blocked.
- E11/E12 duplicate and baseline change: UI baseline only moves on explicit action; live content hashing blocked.
- E14/E15 provider failure and deletion during jobs: durable job states, bounded retries, cancellation requests, Blob-first deletion, and honest provider error classification are implemented; interrupted hosted recovery still needs a successful provider run.
- E16 ownership: all 24 application tables have RLS; transactional two-user verification returned own `1`, other `0`, cross-owner update `0`.
- E17 malicious PDF/private URL: public URL validator unit tests block common local/private ranges; DNS/redirect rebinding must be enforced in the future worker.
- E18 duplicate generation: upload callback uses a durable unique idempotency ledger plus content-hash deduplication and an exclusive Workflow claim.
- E19 consent withdrawn during generation: personalization filter is immediate; durable job invalidation blocked.
- E20 keyboard/text/mobile: text alternative is complete; browser suite checks mobile and 320px overflow.
- E21 immutable download: fixture uses a committed WAV; live generated chapters are immutable Blob objects streamed by authenticated chapter ID.
- E22 invalid PDF: browser, callback, and Workflow validate size/type/signature; Workflow also enforces 1–200 physical pages and non-empty text.

## Release gate

The MVP acceptance gate is **not yet passed**. The direct Preview-only route accepts bounded extracted text after explicit consent, calls the existing server-only Cloudflare adapter for script and speech, and streams no “ready” event unless it has real TTS bytes. The `NUMA_WORKFLOW_SECRET` mismatch remains in the legacy Workflow endpoints and is intentionally out of scope for this core-loop milestone. Unit/build checks are recorded in the current test report; the hosted real-provider PDF→playback test and post-push Preview SHA are pending. F01–F05 are preserved, but their downstream live flows are not acceptance gates for this milestone; existing screens remain clearly illustrative. No Production deployment is in scope.

## Core-loop milestone (2026-10-01)

`/new` now has the real direct path: local PDF parsing → explicit text-transfer consent → `/api/podcast/generate` → Cloudflare LLM → Cloudflare MeloTTS → temporary in-browser audio player. Limits are enforced for PDF bytes/pages/extracted characters, request-body bytes, generated script words, returned audio bytes/duration, and a best-effort per-server-instance attempt throttle. The PDF and generated audio are not persisted; legacy Workflow, Blob and database paths remain untouched. This is intentionally a narrow human-validation MVP, not a live claim for the downstream F01–F06 platform. Hosted provider execution and playback must still pass before calling the core loop complete.

## Podcast quality gate rework (2026-10-01)

The user later reported that a real 12-page Pangaan source produced only about 18 seconds of title-plus-generic-description audio. Exact metrics for that run were never logged. Inspection of the prior implementation confirms why it was accepted: one full-text LLM call explicitly asked for a short 280–500 word podcast, allowed a script as short as 200 characters, had no document map/outline, and had no minimum-word or source-specificity check.

The current unshipped worktree implements semantic chunk mapping (all source text, no blind truncation), exact quote validation against the source, map synthesis, a page-adaptive outline, an 8–15-page 600–800-word English dialogue target, four-idea coverage, one bounded script retry, and fail-closed script quality checks before TTS. Cloudflare Llama 3.3 70B handles JSON stages; Aura-1 synthesizes each Host A/B turn using two explicit speakers; audio segments are automatically sequenced and are seekable through one progress control. Preview requests are bounded to five source chunks, 5,000 total spoken characters, 16 speech turns, 8 MiB/seven minutes, and a per-instance attempt throttle. Diagnostic logs omit source text and include per-request character/token measures when Cloudflare returns usage.

Automated verification is green locally (TypeScript, ESLint, Vitest 53/53, production build, diff check). The user's matching 12-page Pangaan candidate has 13,443 extracted characters; no hosted run against this new implementation has occurred yet. F01–F05 and the durable Blob/Supabase/Workflow behaviors remain distinct, mostly illustrative or independently unverified paths; this core-loop change does not make those live. No core-loop quality acceptance claim is made until the same source completes Preview generation and is heard at the beginning, middle and end.
