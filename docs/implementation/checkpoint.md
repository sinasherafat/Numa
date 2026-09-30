# Resumable checkpoint

Updated 2026-10-01 on the existing `codex/numa-v1` branch.

## Repository and PR

- Existing PR #1: <https://github.com/sinasherafat/Numa/pull/1>, open and Draft; no duplicate PR created.
- At inspection, local `HEAD` and the cached `origin/codex/numa-v1` ref were `00b82ab51e451389761435a9c10729d1e7ca8934`. GitHub PR API independently reported the same head SHA and base `main` at `f8126eca9896bbe7d54349e25ccbd1390d6fc48b`.
- No changes were committed or pushed during this checkpoint. The Cloudflare provider refactor and documentation changes remain in the working tree.
- GitHub's `gh` CLI could not reach `api.github.com`; the GitHub connector can read PR #1. Vercel's deployment-list API returned 403 permission denied and the local Vercel CLI is unavailable, so current Vercel status/SHA could not be refreshed. The last recorded Preview is `https://numa-smo4lz6tg-sinas-projects-111632f8.vercel.app`, deployment `dpl_AHo9RgrCQiK3W5AnYjfkiwpxvBSP`, READY at the prior SHA `00b82ab51e451389761435a9c10729d1e7ca8934`.

## Infrastructure evidence from the prior checkpoint

- Supabase Preview project `tpstahcszkkzncpitdoa`; migrations through `0009_numa_live_audio`, all 24 application tables RLS-enabled, security/performance advisors clean.
- Two-user RLS test: own row visible `1`, other row `0`, cross-owner updates `0`.
- Workflow verifier/database digest mismatch was corrected. The safe RPC then passed credential validation and reached expected `P0002 Job not found`; there is still no completed source-ingest job.
- Private Vercel Blob, Supabase Auth, and Vercel Workflow are connected. No production deployment is in scope.

## Current AI refactor

- Replaced direct Vercel AI Gateway SDK dependencies/calls in the live source-ingest and STT routes with a server-only `AiProvider` adapter.
- Preview adapter is direct Cloudflare Workers AI REST: `@cf/openai/gpt-oss-20b` JSON, `@cf/openai/whisper` transcription, and `@cf/myshell-ai/melotts` MP3 speech. It is replaceable behind `AiProvider` and makes no paid-provider fallback.
- Limits are enforced: 4 MiB PDFs, 20 pages, 20,000 extracted characters, five-minute lessons, 4,000 script characters/550 words, 8 MiB/five-minute MP3, 3 MiB recordings, zero automatic model retries, and three workflow claims.
- No Cloudflare account ID/token is available in this Codex or Vercel connection. No real Cloudflare LLM/STT/TTS request has executed. The Cloudflare credentials must be created by the account owner and configured server-side in Vercel Preview only; no card or paid plan is required or authorized.
- **Implementation gaps:** F01 has no live adaptation proposal/acceptance route; F04 has no live multi-source comparison endpoint; F05 has no live baseline-change analysis endpoint. They remain fixture/sample-only, as the live workspace says. F02/F03/F06 have server code but are not live-verified with Cloudflare or a real PDF/audio.

## Verification of current working tree

- `./node_modules/.bin/tsc --noEmit`: passed.
- `./node_modules/.bin/eslint .`: passed.
- `./node_modules/.bin/vitest run`: 3 files / 19 tests passed; the six AI adapter tests use deterministic mocked responses only.
- `./node_modules/.bin/next build --webpack`: passed; existing `unpdf` `import.meta` warning remains.
- `pnpm` wrapper commands attempted an automatic modules-directory sync, but npm registry access failed and non-interactive purge was refused. The installed local binaries above were used; no dependency directory was removed.
- The current working tree has not been pushed/deployed. Earlier hosted route/browser evidence and five screenshots describe the previous deployed sample routes, not the current code.

## Remaining gates

1. Account owner: create a free Cloudflare account, create the Workers AI REST API token, and put `NUMA_AI_PROVIDER=cloudflare-workers-ai`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` in Vercel's **Preview** scope only. Do not share the secret in chat, add a card, or enable Workers Paid.
2. Implement and test real F01/F04/F05 routes and user journeys.
3. Run real provider smokes, a real PDF→generated script→TTS→private Blob→playback workflow, STT, assessment, consent/forget, persistence, Workflow retries/idempotency, and authenticated Preview browser checks.
4. Push the same existing branch, update PR #1 while keeping Draft, deploy only Preview, and confirm local/remote/PR/Vercel SHAs match. Never merge, enable auto-merge, or deploy Production.
