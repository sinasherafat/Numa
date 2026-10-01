# Numa v1.0 verification report

This report is updated from executed commands; unavailable checks are never recorded as passes.

## Latest 12-page hosted quality attempt (2026-10-01)

On Preview commit `7150d5c6682d1d077ef928aee6f89ea027297999`, the real 241.3 KB Pangaan PDF was parsed in-browser as 12 pages / 13,465 extracted characters. After explicit consent, the request entered Cloudflare's document-understanding stage and failed closed with a structure/grounding error. No outline, script, Aura call, audio player, or playback resulted. The deployed SSE failure event omitted its safe internal diagnostic; Vercel runtime log access returned 403. The current worktree adds sanitized stage/code/diagnostic and non-content metrics to the error event and browser console. A retry against that diagnostic build is required before the failure can be attributed or fixed. The source was real; this was not a fixture result.

## Direct PDF → podcast MVP (2026-10-01)

Added a Preview-only, same-origin route which bypasses the existing Workflow, receives only the browser-extracted text after explicit consent, invokes the server-only Cloudflare LLM and MeloTTS adapter, then returns generated audio directly to an HTML audio player. There is no fixture fallback. The PDF remains local; the generated MP3 is an object URL in browser memory and is not persisted to Blob or Supabase. Request, PDF, script and audio caps are enforced. The two-attempt throttle is best-effort per server instance (not a global quota).

First hosted attempt (2026-10-01): `/new` started empty. The original 2-page `Audio-Learning-Product-Decisions-v0.1.pdf` (68.6 KiB, 3,599 extracted characters) was selected and parsed in-browser. After the notice named that file and Cloudflare Workers AI, consent was checked and Generate Podcast submitted. The Preview returned generic `AI_OUTPUT_INVALID`; the failed stage was not recorded, and no ready event, audio player, or playback was produced. No success is claimed. Code review against Cloudflare's official MeloTTS model schema found a confirmed separate adapter bug: its JSON response wraps MP3 bytes as `result.audio` base64 while the adapter was validating the envelope's `application/json` content type as though it described the audio. The fix assigns `audio/mpeg` after decoding and records only a safe stage/category on failures. This fix and stage diagnostics are on `7d6a64d`; Vercel reports the deployment Ready, but the hosted route is protected by Vercel Authentication. An unauthenticated API POST returned HTTP 401 before reaching the route, and a second browser submission has not been completed. No model or TTS result is claimed after the fix.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | Passed | `./node_modules/.bin/tsc --noEmit` after the TTS response correction |
| ESLint | Passed | `./node_modules/.bin/eslint .` (no warnings/errors) |
| Vitest | Passed | 8 files / 40 tests; includes Cloudflare's JSON-wrapped MeloTTS envelope contract. Provider tests are mocks, not live proof. |
| Production build | Passed with existing warning | `./node_modules/.bin/next build --webpack`; direct `/api/podcast/generate` route emitted. Existing `@vercel/queue` expression dependency warning remains. |
| `git diff --check` | Passed | Worktree diff before commit |
| Hosted Preview / real Cloudflare provider | First attempt failed closed; retest pending | The real PDF parsed and its extracted text was consented/sent. The provider flow returned generic `AI_OUTPUT_INVALID`; no audio or playback was produced. Corrected code is deployed on `7d6a64d`, but a second authenticated request has not reached the function. |
| Preview deployment SHA | `7d6a64d79ad7adee6e138ea883b74108f0e679e4` | GitHub Vercel status succeeded and the Vercel bot reports Ready for this commit. Direct unauthenticated requests receive Vercel Authentication HTTP 401. |

The `pnpm` wrapper first tried to synchronize its modules directory while the npm registry was unreachable and aborted without purging it; checks were run with the already-installed local binaries. One initial parallel TypeScript check overlapped Next's `.next/types` generation and reported missing generated types; it was rerun after the build and passed.

## Local-first real PDF upload update (2026-10-01)

`/new` no longer preloads the illustrative `Learning intervals.pdf`. It starts empty and uses the replaceable `UploadAdapter` interface with `LocalUploadAdapter`; the browser reads and parses the selected PDF using the repository's existing `unpdf`/PDF.js dependency. The actual filename, byte size, page count and extracted text remain in root React state during in-app navigation. The file and its text are not sent to a server or storage provider. Plan/audio/AI stages beyond local parsing remain explicitly illustrative.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` after the local upload implementation |
| ESLint | Passed | `./node_modules/.bin/eslint .` after the local upload implementation |
| Vitest | Passed | 6 files / 34 tests, including a generated one-page PDF parsed by PDF.js, upload metadata/text/error/removal UI, and existing suites |
| Production build | Passed with existing warning | `./node_modules/.bin/next build --webpack`; all Workflow steps built. The existing Vercel Queue expression dependency warning remains. |
| `git diff --check` | Passed | Current implementation diff |
| Hosted Preview file selection | Partially verified | The current branch Preview `/new` loaded in an isolated browser and first showed an empty state. The native chooser supplied a different recent local PDF than the generated temporary test file; the browser-side parser returned real page count and extracted-text metadata. The selected document stayed in browser memory and was cleared by reloading. No hosted PDF→AI/Workflow result is claimed. |

`docs/implementation/local-upload.md` records the temporary boundary. The native file chooser did not select the generated `/private/tmp` test PDF on this pass, so the exact generated artifact was not verified in the hosted browser. The document selected by the chooser was parsed only in the browser; its extracted contents were not inspected, and reloading cleared the session state. The change does not fix or bypass the separate Supabase Workflow credential mismatch and makes no AI/STT/TTS success claims.

## Automated checks

### Historical integration checkpoint before the direct podcast MVP (2026-10-01)

The signed-in Vercel dashboard lists `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `NUMA_AI_PROVIDER` in Preview scope; values are masked and were not read. A real authenticated PDF upload reached the private upload callback and Blob verification, but its job-create RPC failed with PostgreSQL `42501 Invalid workflow credential`. The database contains a SHA-256 workflow verifier row, but its digest does not match the current Preview `NUMA_WORKFLOW_SECRET`. No job, Cloudflare operation, or PDF→podcast result was produced. This is a credential synchronization failure, not evidence of a Cloudflare provider failure.

TypeScript, ESLint, Vitest, and the production build were last run on implementation commit `656a304256e6c333654915c544ba7316e5181fd0`. The current head `c1b702a8a2e818497603965b682416e5273b6b2c` is a docs-only refresh. Vercel deployment `24JW8NdeRJdxGRhJQSBs24X8GU2P` is **Ready**, target **Preview**, and sourced from that current SHA at `https://numa-awqyyfuf2-sinas-projects-111632f8.vercel.app`. GitHub PR #1 head and Vercel source match; both GitHub checks pass.

### Current local application checks

These commands ran against the current working tree after the Cloudflare adapter changes. Direct local binaries were used because the `pnpm` Corepack wrapper tried to synchronize its modules directory and could not reach the npm registry; no module purge was allowed.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` on commit `656a304` |
| ESLint | Passed | `./node_modules/.bin/eslint .` on commit `656a304` |
| Unit tests | Passed | Vitest: 4 files, 23 tests. Provider contract tests mock HTTP and do not prove provider availability. |
| Next.js production build | Passed with warning | `./node_modules/.bin/next build --webpack`; all 11 Workflow steps built. Existing `unpdf` `import.meta` critical-dependency warning remains. |
| Diff whitespace check | Passed | `git diff --check` |
| Preview PDF limit copy | Passed | Hosted `/new` and private upload copy now state the actual enforced 4 MiB cap; the prior inaccurate 20 MB demo label was corrected. |
| Real provider smoke | Blocked before provider | Upload did not create a source job; Workflow secret validation failed in Supabase. No AI success is claimed. |
| Hosted Preview | Five sample routes checked; live upload blocked before provider | Current deployment `24JW8NdeRJdxGRhJQSBs24X8GU2P` for SHA `c1b702a8a2e818497603965b682416e5273b6b2c` is **Ready**. `/new`, `/listen`, `/compare`, `/topics/spaced-practice/changes`, and `/explain/feedback` load in Safari and clearly label illustrative data. A signed-in private upload reached private Blob verification, then Supabase job creation failed with `42501 Invalid workflow credential`; no provider request occurred. |

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` |
| ESLint | Passed | `./node_modules/.bin/eslint .` |
| Unit tests | Superseded by current result above | Prior checkpoint: 2 files, 13 deterministic contract/revision/consent tests |
| Next.js production build | Passed | Next.js 16.3.3 Webpack production build; 15 static/dynamic routes emitted plus 11 Workflow steps |
| Browser journeys | Latest source passed locally; hosted HTTP passed; hosted interactive session blocked by Vercel SSO login | In-app Chromium passed J01–J06 and source evidence navigation locally; all five references plus login had 0px overflow at 1440/390/320 with no console warning/error |
| Packaged Playwright runner | Environment-blocked | All 9 tests are discovered, but the Playwright Chromium download returns CDN HTTP 403 (`service is not available in your location`); no browser executable exists on the host |
| API contracts | Passed locally | `/api/health` returns only `{status:"ok"}`; unauthenticated private endpoints return 401; no environment inventory or fake session ID is exposed |
| Supabase migrations | Passed | Migrations through `0010_numa_live_analysis.sql` are applied; 24 Numa tables report RLS enabled; both transcript/audio triggers enabled |
| Ownership isolation | Passed | Transactional two-user check: own visible 1, other visible 0, cross-owner updates 0; transaction rolled back |
| Database advisors | Passed | Supabase security and performance advisors returned no findings after migrations |
| Workflow credential gate | Blocked | The latest authenticated upload failed at `workflow_create_source_job` with PostgreSQL 42501 `Invalid workflow credential`; the Preview `NUMA_WORKFLOW_SECRET` does not match the SHA-256 verifier in `numa.runtime_secrets`. No job or provider request was created. An account owner must synchronize the Preview secret and verifier without sharing the secret in chat. |
| AI provider smoke | Previous Gateway diagnosis; current smoke pending | The old Gateway calls returned HTTP 403 requiring a credit card. Current code removes Gateway and selects Cloudflare Workers AI, but no real Cloudflare request has been run. No payment was made, and no fixture fallback was attempted. |

## Browser review checklist

The five visual-reference routes are `/new`, `/listen`, `/explain/feedback`, `/compare`, and `/topics/spaced-practice/changes`. Existing repository screenshots include 1440px references; listening was also captured at 390px and new-session at 320px. During this resumed checkpoint, all five routes were reopened on the current READY Preview in Safari at desktop size, and each visibly labels its content as illustrative. The earlier local browser checks found and fixed one 9px overflow caused by the invisible file input; their rerun reported zero overflow at 1440/390/320. This resumed checkpoint did not rerun mobile viewport measurements.

The 2026-09-30 local rerun used the current source in the in-app Chromium browser. `/workspace` redirected an unauthenticated user to `/login`; the five reference routes and `/login` each reported zero horizontal overflow at 1440, 390, and 320 pixels. J01/J06, J02 future-only update, J03 edited text plus explicit memory consent, J04 relationship states, J05 explicit baseline update/restore, and physical-page navigation all passed with no captured console warnings or errors.

## Executed browser evidence

- J01/J06: presentation goal → duration → reviewed plan → sample audio.
- J02: cursor-grounded answer → accepted update → only future chapters changed while the current chapter stayed stable.
- J03: editable text fallback → feedback → memory remained off until the learner enabled it.
- J04: agreement, different conditions, and unresolved transfer question remained distinct.
- J05: baseline moved only after explicit review and could be kept at the prior review.
- Source grounding: a citation opened physical PDF page 4 and the return path preserved the listening route.

Historical hosted-browser evidence for J01–J06 applies only to the checkpoint/deployment documented when it ran. On application SHA `e5333086152e2a63c4537f519089ab8755d7ddfb`, the hosted session verified sample route rendering and the private login boundary, but not authenticated live workspace journeys.

Previous checkpoint HTTP smoke evidence remains historical; it does not establish current provider availability or authenticated access. The application-code Preview deployment's dashboard record matched the feature branch and commit SHA; hosted browser inspection confirmed the five sample pages and private route's login boundary. Deployment Protection was not disabled or bypassed.

## Podcast quality diagnosis and rework (2026-10-01)

The user's 12-page Pangaan listening test was reported as about 18 seconds and essentially a title plus generic description. The prior code did not capture request or response metrics, so the exact extracted character count, provider token counts, result length, and script word count for that completed human run are **not recoverable from the saved server logs**. Do not infer them from duration.

The deployed single-pass route at that checkpoint used `@cf/meta/llama-3.1-8b-instruct`, `maxTokens: 1100`, and one user prompt containing the complete extracted text (bounded by the 20,000-character route input limit; it did not chunk or intentionally truncate). Its system prompt requested a “natural two-host conversation” of only 280–500 spoken words, while the user prompt explicitly requested a “short educational podcast.” The output schema accepted any script from 200 to 4,000 characters; the only post-parse word check rejected outputs over 550 words. There was no minimum-length, source-specificity, outline, or source-map quality check. Consequently, a very short title/description could pass and reach TTS. The then-current PR body recorded a separate 2-page, 3,599-character PDF test yielding 14 seconds of MeloTTS audio; that is not the user's reported 12-page test.

The current worktree replaces that path with semantic source chunks → chunk notes and verbatim evidence → synthesized document map → adaptive outline → English spoken dialogue. An 8–15 page source targets 600–800 words and 5–7 minutes. A quality failure can trigger one script retry; a second short/ungrounded result fails closed before speech. Every map idea must retain an exact quotation found in the extracted text. The script covers at least four valid idea IDs, and TTS receives the text of each turn only. Aura-1 generates each turn with alternating Angus/Asteria speakers; the browser plays those real MP3 segments sequentially with progress and seeking. The server records page count, source characters/chunks, per-stage input/output characters and provider token usage when returned, outline count, script words/characters, target, TTS characters/segment count, and measured audio duration/bytes without logging document content.

For an 8–15 page source, direct Preview speech is bounded to 5,000 characters (about 6,819 Aura-1 Neurons at Cloudflare's published rate), with a 16-segment / 8 MiB / seven-minute cap. There are at most five 4,500-character chunks, 800 spoken words, 20,000 extracted source characters, and one script-only retry. Cloudflare Workers Free has an account-wide 10,000-Neuron daily ceiling; if other account activity consumes the remainder, requests fail closed. No paid plan, card, AI Gateway, fallback, or fixture path is used.

The local checks are TypeScript, ESLint, Vitest 54/54, production build, and `git diff --check`; build retains the existing non-fatal `@vercel/queue` critical-dependency warning. A real 12-page Pangaan PDF (241.3 KB) was selected and extracted in the Preview browser to 13,465 characters. After explicit consent, generation entered Cloudflare's document-understanding stage, then failed closed with the UI message that returned content did not meet structure/grounding checks. No outline, script, TTS, audio player, or playback resulted. The old implementation did not expose the internal diagnostic in the SSE response, and Vercel runtime logs returned 403 for this project connection. The current change adds only sanitized stage/code/diagnostic and character/token metrics to the failure event and browser console; it never emits source/provider text. A retry against this diagnostic build is still required to identify and fix the exact validation failure. No live quality success claim is made.

## Deployment safety

The first Git-triggered deployment of this newly created project was incorrectly auto-promoted by Vercel even though the configured production branch was `main`. It was removed immediately. A subsequent explicit `--target preview` deployment was verified, and the deployment listing contained only the `Preview` target. No production deployment is retained.

## Live provider boundary

The current live AI adapter calls Cloudflare Workers AI directly: gpt-oss-20b for JSON generation, Whisper for STT, and MeloTTS for MP3 synthesis. It uses server-only credentials, strict schemas, bounded inputs/outputs, no provider retries, and never substitutes sample data. Adapter tests are mocked contract tests only. F04/F05 routes are implemented and unit-tested for structured citation validation, but no real provider request or authenticated hosted call has been verified. F01 still lacks a live adaptation route. The end-to-end PDF→podcast workflow is blocked because Preview `NUMA_WORKFLOW_SECRET` and the database verifier digest differ; the authenticated PDF callback failed at `workflow_create_source_job` with PostgreSQL `42501 Invalid workflow credential` before creating a job.
