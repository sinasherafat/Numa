# Numa v1.0 traceability

Status vocabulary: **implemented** means code or UI exists; **verified** means an automated or browser check has passed; **blocked** means an external live path cannot honestly pass with current access. The sample workspace is a fixture, not proof of private-source or model integration.

## Six product pillars

| ID | Requirement | Implementation | Verification | Blocked live portion |
| --- | --- | --- | --- | --- |
| F01 | A contextual question can change only future unplayed chapters after acceptance; reject and failure preserve the original path | `/listen`, ask panel, revision/cursor checks in `src/lib/revision.ts` | Unit tests cover immutable prefix and stale cursor; browser journey covers answer and accepted update | Durable generation and atomic database activation need Preview Workflow/database/providers |
| F02 | Separate exposure, self-report, explain-back, gaps and not-assessed; explicit cross-session consent; inspect/edit/forget | `/understanding`, `/settings`, feedback memory panel, `personalizationEvidence` | Unit tests cover consent-off, rejected and forgotten evidence; browser journey covers explicit toggle | Cross-session private persistence and physical deletion need auth/database/worker |
| F03 | Voice or text explanation, editable transcript, grounded feedback, Cannot assess, targeted review | `/explain`, `/explain/feedback`; microphone permission path and full text alternative | Browser journey covers edited transcript and feedback route | Real STT and model assessment adapters are unconfigured; visible assessment is labeled fixture |
| F04 | Compare 2–5 sources around one question without manufacturing conflict | `/compare`, relationship labels, evidence links and comparison audio UI | Browser journey checks agreement, different conditions and unknowns | Real claim extraction/retrieval and comparison generation need private source pipeline |
| F05 | Compare new sources with an explicit reviewed baseline; preserve dates and no automatic baseline movement | `/topics/spaced-practice/changes`; distinct publication/add/review dates | Browser journey checks explicit mark reviewed and restoring prior baseline | Content hashes, snapshots and durable ChangeSet generation need database/storage/workflow |
| F06 | Goal changes path, practice and editable outputs | `/new`, `/plan`, `/outcome`; presentation outline, notes, flashcards, comparison, Markdown export | Browser journey covers goal-shaped session flow | Real generated outcomes and server-side export need source/generation providers |

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
| B08 | Selected-page metadata in plan and source reader | Implemented in fixture; real validation blocked |
| B09 | Editable notes, flashcards and textual slide outline | Implemented |
| B10 | Library, listening queue, browser-persisted demo cursor state and complete-revision WAV download | Implemented; private persistence blocked |
| B11 | Explain this action and clearer future chapter proposal | Implemented |
| B12 | I know this creates only a self-report presentation state | Implemented; unit model keeps evidence types separate |
| B13 | Finding, limitation, interpretation, example and unknown labels/copy | Implemented in fixture; live grounding blocked |

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

All data-bearing routes render Ready fixture content. Loading, empty, error and disabled contracts are represented through shared `.notice`, disabled controls, API errors and the truthful private-provider state; full live state transitions remain blocked with the private pipeline.

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
- E14/E15 provider failure and deletion during jobs: service ports require durable job ownership and cancellation; live worker blocked.
- E16 ownership: server-side ownership is an architecture requirement; live auth/database integration blocked and not marked verified.
- E17 malicious PDF/private URL: public URL validator unit tests block common local/private ranges; DNS/redirect rebinding must be enforced in the future worker.
- E18 duplicate generation: `Idempotency-Key` is required by API contracts; durable ledger blocked.
- E19 consent withdrawn during generation: personalization filter is immediate; durable job invalidation blocked.
- E20 keyboard/text/mobile: text alternative is complete; browser suite checks mobile and 320px overflow.
- E21 immutable download: fixture download points to one committed complete WAV revision; persistent revision storage blocked.
- E22 invalid PDF: public import returns structured unsupported/provider errors and never fake success; real parser validation blocked.

## Release gate

The branch is suitable for a **Draft PR and Preview product review**. It is not ready to merge as a live private-source product until isolated Preview auth, database, Blob storage, Vercel Workflow, generation/STT/TTS credentials, migrations and provider smoke tests are supplied and the blocked checks above pass. Production remains out of scope.
