# Resumable checkpoint

Updated 2026-10-01 on the existing `codex/numa-v1` branch at `656a304256e6c333654915c544ba7316e5181fd0`; the worktree was clean after the implementation push.

## Repository and PR

- Existing PR #1: <https://github.com/sinasherafat/Numa/pull/1>, open and Draft; no duplicate PR created.
- Current local `HEAD`, cached `origin/codex/numa-v1`, and GitHub PR head report `656a304256e6c333654915c544ba7316e5181fd0`; base is `main` at `f8126eca9896bbe7d54349e25ccbd1390d6fc48b`. A direct `git ls-remote` refresh was blocked by host DNS, but the pushed GitHub PR head and Vercel source confirm the commit.
- PR #1 is open and Draft; no duplicate PR was created.
- GitHub's Vercel check for `656a304256e6c333654915c544ba7316e5181fd0` is **success**. The signed-in Vercel dashboard lists deployment `54QX7nJh7Y1F3MeC7ZvgEmrYS7gv` as **Ready**, target **Preview**, branch `codex/numa-v1`, source SHA `656a304256e6c333654915c544ba7316e5181fd0`, unique URL `https://numa-5j11bb45v-sinas-projects-111632f8.vercel.app`. No Production deployment was created.
- The Vercel Environment Variables page showed `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `NUMA_AI_PROVIDER` entries scoped to Preview. Values were not revealed, so the exact `NUMA_AI_PROVIDER` value was not independently confirmed. The same Cloudflare names also appear under Production scope; no changes were made to that configuration.
- Five visual-reference pages were captured from the latest Preview in the in-app browser: `/new`, `/listen`, `/compare`, `/topics/spaced-practice/changes`, and `/explain/feedback`. Each clearly labels sample/illustrative data. The authenticated private upload flow was exercised; Blob callback verification passed, but source-job creation was rejected by the Workflow credential verifier. No deployment-protection bypass/share URL was used.

## Infrastructure evidence from the prior checkpoint

- Supabase Preview project `tpstahcszkkzncpitdoa`; migrations through `0009_numa_live_audio`, all 24 application tables RLS-enabled, security/performance advisors clean.
- Two-user RLS test: own row visible `1`, other row `0`, cross-owner updates `0`.
- The latest hosted upload verified the private Blob callback, then Supabase `workflow_create_source_job` failed with `42501 Invalid workflow credential`. The `numa.runtime_secrets` workflow digest row exists (64-character SHA-256); it does not match the current branch Preview `NUMA_WORKFLOW_SECRET`. No new job was created.
- Private Vercel Blob, Supabase Auth, and Vercel Workflow are connected. No production deployment is in scope.

## Current AI refactor

- Replaced direct Vercel AI Gateway SDK dependencies/calls in the live source-ingest and STT routes with a server-only `AiProvider` adapter.
- Preview adapter is direct Cloudflare Workers AI REST: `@cf/openai/gpt-oss-20b` JSON, `@cf/openai/whisper` transcription, and `@cf/myshell-ai/melotts` MP3 speech. It is replaceable behind `AiProvider` and makes no paid-provider fallback.
- Limits are enforced: 4 MiB PDFs, 20 pages, 20,000 extracted characters, five-minute lessons, 4,000 script characters/550 words, 8 MiB/five-minute MP3, 3 MiB recordings, zero automatic model retries, and three workflow claims.
- Cloudflare account ID/token variable names are configured as Vercel Preview variables; values are masked and absent from local `.env.local`. No real Cloudflare LLM/STT/TTS request has executed. A valid Numa/Supabase session was available for the upload attempt, but the Workflow secret/database digest mismatch stopped processing before any AI call. No AI Gateway, payment, paid plan, or model fallback was used.
- **Implementation gaps:** F01 has no live adaptation proposal/acceptance route. F04/F05 now have authenticated Cloudflare-backed routes, source-topic validation, bounded prompt evidence, UUID-grounded physical-page citations, and persisted comparison/change results, but provider and hosted journey are blocked until the Workflow credential is synchronized. F02/F03/F06 have server code but are not live-verified with Cloudflare or a real PDF/audio.

## Verification of commit 656a304 (2026-10-01)

- `./node_modules/.bin/tsc --noEmit`: passed on current worktree.
- `./node_modules/.bin/eslint .`: passed on current worktree.
- `./node_modules/.bin/vitest run`: 4 files / 23 tests passed; AI adapter tests use deterministic mocked responses only.
- `./node_modules/.bin/next build --webpack`: passed; existing `unpdf` `import.meta` warning remains.
- `git diff --check`: passed.
- `pnpm` wrapper commands attempted an automatic modules-directory sync, but npm registry access failed and non-interactive purge was refused. The installed local binaries above were used; no dependency directory was removed.
- The latest hosted Preview loaded all five reference routes in a real browser; screenshots were captured during this task. All five pages show explicitly labeled sample fixtures. Hosted screenshots verify appearance, not live feature behavior.
- Private PDF upload completed private Blob callback verification, then failed at `workflow_create_source_job` with PostgreSQL `42501 Invalid workflow credential`. The real PDF→LLM→TTS→private Blob→playback workflow and actual STT remain untested.

## Remaining gates

1. Account owner must synchronize the Preview branch-scoped `NUMA_WORKFLOW_SECRET` for `codex/numa-v1` with the SHA-256 verifier stored as `numa.runtime_secrets.name='workflow'`. Do not share the secret in chat; then retry the existing tiny PDF upload.
2. Implement and test live F01 adaptation proposal/acceptance; F04/F05 route code exists but awaits live provider validation.
3. After credential repair, run Cloudflare LLM/STT/TTS smokes, real PDF→script→TTS→private Blob→playback, assessment, consent/forget, persistence, Workflow retry/idempotency, and authenticated Preview checks.
4. Keep PR #1 Draft until live acceptance gates pass. Do not merge, enable auto-merge, bypass deployment protection, or deploy Production.
