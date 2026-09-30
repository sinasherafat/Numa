# Numa v1.0 verification report

This report is updated from executed commands; unavailable checks are never recorded as passes.

## Automated checks

### Current uncommitted provider-refactor checkpoint (2026-10-01)

These commands ran against the current working tree after the Cloudflare adapter changes. Direct local binaries were used because the `pnpm` Corepack wrapper tried to synchronize its modules directory and could not reach the npm registry; no module purge was allowed.

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` after production build regenerated Next types |
| ESLint | Passed | `./node_modules/.bin/eslint .` |
| Unit tests | Passed | Vitest: 3 files, 19 tests. Six `provider.test.ts` tests mock HTTP and do not prove provider availability. |
| Next.js production build | Passed with warning | `./node_modules/.bin/next build --webpack`; all 11 Workflow steps built. Existing `unpdf` `import.meta` critical-dependency warning remains. |
| Real provider smoke | Not run | Cloudflare account ID/token are not available to this task. No AI success is claimed. |
| Hosted Preview for current working tree | Not deployed | Current adapter/docs changes are uncommitted and do not match the earlier Preview SHA. |

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

The hosted rerun repeated J01–J06, the future-only chapter update, explicit memory consent, baseline review, comparison relationships, and physical-page source navigation against a Vercel deployment reported as `READY` with target `preview`. The hosted browser produced no console errors. The canonical Preview is protected by the owner's Vercel SSO policy; authenticated browser access and `vercel curl` both succeeded.

For the current infrastructure commit, Vercel reported the new deployment `READY` and its Git metadata matched the branch head. Authenticated `vercel curl` returned 200 for `/api/health`, `/new`, `/listen`, `/explain/feedback`, `/compare`, `/topics/spaced-practice/changes`, and `/login`; `/workspace` returned the expected unauthenticated 307 redirect. The health body was minimal and all six HTML responses contained their expected page markers. Runtime error logs were empty. A fresh graphical hosted session stopped at Vercel→GitHub login, and a standalone Chromium download returned regional CDN HTTP 403. Deployment Protection was not disabled or bypassed in a browser, so the five checked-in reference screenshots are prior Preview captures of the unchanged sample routes, not falsely labeled current hosted recaptures.

## Deployment safety

The first Git-triggered deployment of this newly created project was incorrectly auto-promoted by Vercel even though the configured production branch was `main`. It was removed immediately. A subsequent explicit `--target preview` deployment was verified, and the deployment listing contained only the `Preview` target. No production deployment is retained.

## Live provider boundary

The current live AI adapter calls Cloudflare Workers AI directly: gpt-oss-20b for JSON generation, Whisper for STT, and MeloTTS for MP3 synthesis. It uses server-only credentials, strict schemas, bounded inputs/outputs, no provider retries, and never substitutes sample data. Adapter tests are mocked contract tests only. A real PDF→podcast Workflow run still requires an owner-created Cloudflare Workers AI API token and account ID in Vercel Preview. F01, F04, and F05 also lack live provider-backed routes. The earlier hosted-browser and screenshot results apply to the prior committed Preview, not this working tree; refresh them only after a new commit is deployed READY and authenticated browser access is available.
