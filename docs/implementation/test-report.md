# Numa v1.0 verification report

This report is updated from executed commands; unavailable checks are never recorded as passes.

## Automated checks

### Current state after Cloudflare Preview configuration (2026-10-01)

The signed-in Vercel dashboard lists `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `NUMA_AI_PROVIDER` in Preview scope. The values are masked; this task cannot verify that `NUMA_AI_PROVIDER` is exactly `cloudflare-workers-ai`, nor can it read/use the Cloudflare token through the available Vercel connector. These variables are absent from this machine's `.env.local`. The existing saved Numa/Supabase login was rejected, so private workspace routes are not available for live verification. No live Cloudflare request or private-source workflow was attempted or passed.

The current local `HEAD`, cached remote feature ref, and GitHub PR #1 head are `b851380543150a3f52f63a59f52a6aa9bee57dd8`. Existing automated results below are valid for unchanged application code. The latest Vercel dashboard observation from the prior checkpoint showed Preview **Ready** for this SHA; the Vercel API connector currently returns 404 for that recorded deployment ID, so no newer API-side status is claimed.

### Current local application checks

These commands ran against the current working tree after the Cloudflare adapter changes. Direct local binaries were used because the `pnpm` Corepack wrapper tried to synchronize its modules directory and could not reach the npm registry; no module purge was allowed.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` after production build regenerated Next types |
| ESLint | Passed | `./node_modules/.bin/eslint .` |
| Unit tests | Passed | Vitest: 3 files, 19 tests. Six `provider.test.ts` tests mock HTTP and do not prove provider availability. |
| Next.js production build | Passed with warning | `./node_modules/.bin/next build --webpack`; all 11 Workflow steps built. Existing `unpdf` `import.meta` critical-dependency warning remains. |
| Real provider smoke | Not run | Preview variable names exist, but their values cannot be inspected here and no authenticated live application session is available. No AI success is claimed. |
| Hosted Preview | Sample route render checked; private route blocked | Preview URL: `https://numa-git-codex-numa-v1-sinas-projects-111632f8.vercel.app`. `/new`, `/listen`, `/compare`, `/topics/spaced-practice/changes`, and `/explain/feedback` render explicitly labeled sample data. `/workspace` redirects to `/login`; the available saved sign-in was rejected. These screenshots are visual-reference checks only, not live feature verification. |

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` |
| ESLint | Passed | `./node_modules/.bin/eslint .` |
| Unit tests | Superseded by current result above | Prior checkpoint: 2 files, 13 deterministic contract/revision/consent tests |
| Next.js production build | Passed | Next.js 16.3.3 Webpack production build; 15 static/dynamic routes emitted plus 11 Workflow steps |
| Browser journeys | Latest source passed locally; hosted HTTP passed; hosted interactive session blocked by Vercel SSO login | In-app Chromium passed J01–J06 and source evidence navigation locally; all five references plus login had 0px overflow at 1440/390/320 with no console warning/error |
| Packaged Playwright runner | Environment-blocked | All 9 tests are discovered, but the Playwright Chromium download returns CDN HTTP 403 (`service is not available in your location`); no browser executable exists on the host |
| API contracts | Passed locally | `/api/health` returns only `{status:"ok"}`; unauthenticated private endpoints return 401; no environment inventory or fake session ID is exposed |
| Supabase migrations | Passed | Nine ordered migrations registered; 24 Numa tables report RLS enabled; both transcript/audio triggers enabled |
| Ownership isolation | Passed | Transactional two-user check: own visible 1, other visible 0, cross-owner updates 0; transaction rolled back |
| Database advisors | Passed | Supabase security and performance advisors returned no findings after migrations |
| Workflow credential gate | Repaired and RPC-verified | The current Preview `NUMA_WORKFLOW_SECRET` initially returned 401 / PostgreSQL 42501 `Invalid workflow credential`. The Preview database digest was updated to match that existing secret without exposing it. Repeating a non-mutating claim for a nonexistent UUID passed the credential check and reached the expected PostgreSQL `P0002 Job not found`. No actual source-ingest run exists yet; the jobs table was empty. |
| AI provider smoke | Previous Gateway diagnosis; current smoke pending | The old Gateway calls returned HTTP 403 requiring a credit card. Current code removes Gateway and selects Cloudflare Workers AI, but no real Cloudflare request has been run. No payment was made, and no fixture fallback was attempted. |

## Browser review checklist

The five visual-reference routes are `/new`, `/listen`, `/explain/feedback`, `/compare`, and `/topics/spaced-practice/changes`. Each was captured at 1440px in `artifacts/screenshots/`. The listening screen was also captured at 390px and the new-session screen at 320px. Browser checks found and fixed one 9px overflow caused by the invisible file input; the rerun reported zero overflow. No second sidebar, hidden primary action, unreadable source evidence, console error, framework overlay, or autoplay was observed.

The 2026-09-30 local rerun used the current source in the in-app Chromium browser. `/workspace` redirected an unauthenticated user to `/login`; the five reference routes and `/login` each reported zero horizontal overflow at 1440, 390, and 320 pixels. J01/J06, J02 future-only update, J03 edited text plus explicit memory consent, J04 relationship states, J05 explicit baseline update/restore, and physical-page navigation all passed with no captured console warnings or errors.

## Executed browser evidence

- J01/J06: presentation goal → duration → reviewed plan → sample audio.
- J02: cursor-grounded answer → accepted update → only future chapters changed while the current chapter stayed stable.
- J03: editable text fallback → feedback → memory remained off until the learner enabled it.
- J04: agreement, different conditions, and unresolved transfer question remained distinct.
- J05: baseline moved only after explicit review and could be kept at the prior review.
- Source grounding: a citation opened physical PDF page 4 and the return path preserved the listening route.

Historical hosted-browser evidence for J01–J06 applies only to the checkpoint/deployment documented when it ran. The current hosted session verified sample route rendering, but not authenticated live workspace journeys.

Previous checkpoint HTTP smoke evidence remains historical; it does not establish current provider availability or authenticated access. In this turn, browser inspection confirmed the Preview sample pages and the private route's login boundary. Deployment Protection was not disabled or bypassed.

## Deployment safety

The first Git-triggered deployment of this newly created project was incorrectly auto-promoted by Vercel even though the configured production branch was `main`. It was removed immediately. A subsequent explicit `--target preview` deployment was verified, and the deployment listing contained only the `Preview` target. No production deployment is retained.

## Live provider boundary

The current live AI adapter calls Cloudflare Workers AI directly: gpt-oss-20b for JSON generation, Whisper for STT, and MeloTTS for MP3 synthesis. It uses server-only credentials, strict schemas, bounded inputs/outputs, no provider retries, and never substitutes sample data. Adapter tests are mocked contract tests only. Vercel Preview variable names are present, but no real provider request or PDF→podcast Workflow run has been verified. F01, F04, and F05 also lack live provider-backed routes. Authenticated browser checks require a valid Numa account session; the available saved sign-in was rejected.
