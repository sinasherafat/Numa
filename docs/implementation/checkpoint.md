# Resumable checkpoint

Updated 2026-10-01 on the existing `codex/numa-v1` branch.

## Repository and PR

- Existing PR #1: <https://github.com/sinasherafat/Numa/pull/1>, open and Draft; no duplicate PR created.
- At inspection, local `HEAD`, cached `origin/codex/numa-v1`, and GitHub PR head all reported `e5333086152e2a63c4537f519089ab8755d7ddfb`; base is `main` at `f8126eca9896bbe7d54349e25ccbd1390d6fc48b`.
- PR #1 is open and Draft; no duplicate PR was created.
- GitHub's Vercel check for `e5333086152e2a63c4537f519089ab8755d7ddfb` is **success**. The signed-in Vercel dashboard lists deployment `eiUEbgPv7Bj9coXxZts94uVDeSFU` as **Ready**, target **Preview**, branch `codex/numa-v1`, source SHA `e5333086152e2a63c4537f519089ab8755d7ddfb`, unique URL `https://numa-gw4zvvzsi-sinas-projects-111632f8.vercel.app`, with the branch alias `https://numa-git-codex-numa-v1-sinas-projects-111632f8.vercel.app`. No Production deployment was created.
- The Vercel Environment Variables page showed `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `NUMA_AI_PROVIDER` entries scoped to Preview. Values were not revealed, so the exact `NUMA_AI_PROVIDER` value was not independently confirmed. The same Cloudflare names also appear under Production scope; no changes were made to that configuration.
- Five visual-reference pages were captured from this final Preview at 1440×900: `/new`, `/listen`, `/compare`, `/topics/spaced-practice/changes`, and `/explain/feedback`. Each clearly labels sample/illustrative data. `/new` was also checked at 390×844 with no horizontal overflow. The private `/workspace` route redirects to `/login`; Safari's saved credential for `sinasherafat@gmail.com` was rejected as invalid, so no authenticated private flow was run. No deployment-protection bypass/share URL was used.

## Infrastructure evidence from the prior checkpoint

- Supabase Preview project `tpstahcszkkzncpitdoa`; migrations through `0009_numa_live_audio`, all 24 application tables RLS-enabled, security/performance advisors clean.
- Two-user RLS test: own row visible `1`, other row `0`, cross-owner updates `0`.
- Workflow verifier/database digest mismatch was corrected. The safe RPC then passed credential validation and reached expected `P0002 Job not found`; there is still no completed source-ingest job.
- Private Vercel Blob, Supabase Auth, and Vercel Workflow are connected. No production deployment is in scope.

## Current AI refactor

- Replaced direct Vercel AI Gateway SDK dependencies/calls in the live source-ingest and STT routes with a server-only `AiProvider` adapter.
- Preview adapter is direct Cloudflare Workers AI REST: `@cf/openai/gpt-oss-20b` JSON, `@cf/openai/whisper` transcription, and `@cf/myshell-ai/melotts` MP3 speech. It is replaceable behind `AiProvider` and makes no paid-provider fallback.
- Limits are enforced: 4 MiB PDFs, 20 pages, 20,000 extracted characters, five-minute lessons, 4,000 script characters/550 words, 8 MiB/five-minute MP3, 3 MiB recordings, zero automatic model retries, and three workflow claims.
- Cloudflare account ID/token are configured as Vercel Preview variables, but are absent from local `.env.local` and unavailable through the Vercel API connector. No real Cloudflare LLM/STT/TTS request has executed. A valid Numa/Supabase sign-in is also required to exercise the live application; the available saved credential was rejected. No AI Gateway, payment, paid plan, or model fallback was used.
- **Implementation gaps:** F01 has no live adaptation proposal/acceptance route; F04 has no live multi-source comparison endpoint; F05 has no live baseline-change analysis endpoint. They remain fixture/sample-only, as the live workspace says. F02/F03/F06 have server code but are not live-verified with Cloudflare or a real PDF/audio.

## Verification of current working tree (2026-10-01)

- `./node_modules/.bin/tsc --noEmit`: passed.
- `./node_modules/.bin/eslint .`: passed.
- `./node_modules/.bin/vitest run`: 3 files / 19 tests passed; the six AI adapter tests use deterministic mocked responses only.
- `./node_modules/.bin/next build --webpack`: passed; existing `unpdf` `import.meta` warning remains.
- `pnpm` wrapper commands attempted an automatic modules-directory sync, but npm registry access failed and non-interactive purge was refused. The installed local binaries above were used; no dependency directory was removed.
- The final hosted Preview loaded all five reference routes in a real browser; five 1440×900 screenshots were captured. They verify rendering only; all five screens show sample fixtures. `/new` at 390×844 had `scrollWidth=390`, and browser console warnings/errors were empty.
- The live private workspace redirects to Supabase login, and the saved sign-in attempt was rejected as invalid. The private PDF→LLM→TTS→Blob workflow and actual STT remain untested.

## Remaining gates

1. Sign into the Numa Preview with a valid account (the available saved credential was rejected) and keep the authenticated browser session available; do not send a password or token in chat.
2. The Vercel Environment Variables page classifies `NUMA_AI_PROVIDER` as a Secret and provides no reveal control; its exact Preview value is therefore unverified. The account owner can confirm/reset that non-secret selector to `cloudflare-workers-ai` if the real request reports an unknown provider. Do not reveal or send the Cloudflare API token.
3. Implement and test real F01/F04/F05 routes and user journeys.
4. Run real provider smokes, a real PDF→generated script→TTS→private Blob→playback workflow, STT, assessment, consent/forget, persistence, Workflow retries/idempotency, and authenticated Preview browser checks.
5. Keep PR #1 Draft until every live acceptance gate passes. Do not merge, enable auto-merge, bypass deployment protection, or deploy Production.
