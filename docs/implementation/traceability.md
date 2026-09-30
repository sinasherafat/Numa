# Numa v1.0 traceability

Status vocabulary: **implemented** means code or UI exists; **verified** means an automated or browser check has passed; **blocked** means an external live path cannot honestly pass with current access. The sample workspace is a fixture, not proof of private-source or model integration.

## Six product pillars

| ID | Requirement | Implementation | Verification | Blocked live portion |
| --- | --- | --- | --- | --- |
| F01 | A contextual question can change only future unplayed chapters after acceptance; reject and failure preserve the original path | Sample `/listen`; immutable revision algorithm; live private PDF→Workflow→audio/transcript/player infrastructure | Unit tests cover immutable prefix and stale cursor; sample browser journey covers accepted update | Live adaptation generation/acceptance remains blocked by Gateway 403 and is not presented as working |
| F02 | Separate exposure, self-report, explain-back, gaps and not-assessed; explicit cross-session consent; inspect/edit/forget | Sample `/understanding`; live owner-scoped evidence schema/state API and versioned learning-memory consent | Consent unit tests; live two-user RLS test; consent API/build verified | Live AI-created assessment evidence and complete edit/forget browser journey depend on Gateway output |
| F03 | Voice or text explanation, editable transcript, grounded feedback, Cannot assess, targeted review | Sample `/explain`; live MediaRecorder, private raw-audio policy, real Gateway STT adapter, editable transcript, persisted confirmed text | Type/build checks; honest typed persistence path implemented | STT and grounded assessment smoke blocked by Gateway 403; UI keeps text fallback and labels assessment blocked |
| F04 | Compare 2–5 sources around one question without manufacturing conflict | Sample `/compare`; live schema supports 1–5 version snapshots and comparison jobs/outcomes | Sample browser journey checks agreement, different conditions and unknowns | Actual uploaded-source claim comparison is blocked by Gateway and not shown as live success |
| F05 | Compare new sources with an explicit reviewed baseline; preserve dates and no automatic baseline movement | Sample changes route; live content hashes, source versions, review checkpoints and change-set schema | Duplicate hashes/idempotency constrained; sample browser explicit-baseline journey | Live change-set generation and hosted confirmation remain blocked by Gateway output |
| F06 | Goal changes path, practice and editable outputs | Sample goal journey; live goal/level/duration feed Workflow; persisted notes, flashcards, slide outline, audio, Markdown download | Schema, Workflow compiler and production build verified | Real generated outcomes cannot be smoke-tested until Gateway access succeeds |

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
| S02 New session | `/new` goal, question, level and duration controls |
| S03 Sources | `/sources` shares staged source UI with upload, ready and truthful demo note |
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

Sample routes render explicitly labeled fixture content. `/login` and `/workspace` are separate live routes with real empty/loading/error/job/consent/private-source states; they never import fixture data. A Gateway-denied job remains a persisted failed live job with `AI_CREDITS_REQUIRED`, not a successful lesson.

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
- E14/E15 provider failure and deletion during jobs: durable job states, bounded retries, cancellation requests, Blob-first deletion, and honest Gateway error classification are implemented; interrupted hosted recovery still needs a successful provider run.
- E16 ownership: all 24 application tables have RLS; transactional two-user verification returned own `1`, other `0`, cross-owner update `0`.
- E17 malicious PDF/private URL: public URL validator unit tests block common local/private ranges; DNS/redirect rebinding must be enforced in the future worker.
- E18 duplicate generation: upload callback uses a durable unique idempotency ledger plus content-hash deduplication and an exclusive Workflow claim.
- E19 consent withdrawn during generation: personalization filter is immediate; durable job invalidation blocked.
- E20 keyboard/text/mobile: text alternative is complete; browser suite checks mobile and 320px overflow.
- E21 immutable download: fixture uses a committed WAV; live generated chapters are immutable Blob objects streamed by authenticated chapter ID.
- E22 invalid PDF: browser, callback, and Workflow validate size/type/signature; Workflow also enforces 1–200 physical pages and non-empty text.

## Release gate

The branch remains suitable only for a **Draft PR and Preview product review**. Preview Auth, database, Blob, Workflow, migrations, ownership, and live adapters are present. It is not merge-ready as a fully live product because Vercel AI Gateway rejects text/STT/TTS execution with HTTP 403 until the account has a valid credit card; dependent live F01/F03/F04/F05/F06 acceptance checks therefore remain blocked. No Production deployment is in scope before human approval.
