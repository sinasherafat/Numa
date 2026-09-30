# Resumable checkpoint

Updated 2026-09-30 on `codex/numa-v1`.

- Existing PR: <https://github.com/sinasherafat/Numa/pull/1> (keep Draft).
- Supabase `numa-preview` (`tpstahcszkkzncpitdoa`) is restored and healthy. Migrations `numa_core` through `numa_live_audio` are applied. All 24 Numa tables have RLS; security and performance advisors are clean.
- Two-user transactional RLS test: own row visible `1`, other row visible `0`, cross-owner updates `0`. Wrong Workflow credential is rejected.
- Private Vercel Blob and branch-scoped Preview variables are connected. `NUMA_AI_MODEL` is `openai/gpt-5.4-nano`; STT/TTS selectors are configured.
- Local `typecheck`, `lint`, 13 unit tests, and Webpack production build pass. Turbopack stalled with Workflow; the production script deliberately uses the official `--webpack` fallback.
- Implemented live path: Auth, RLS state, private PDF upload/deletion, idempotent durable Workflow, unpdf extraction, grounded plan, TTS, private audio, transcript spans, outcomes, private audio streaming, consent, typed/recorded explain-back, and STT adapter.
- Genuine blocker: Vercel AI Gateway smoke returns HTTP 403 and requires a valid credit card. No purchase was authorized; no fixture fallback is used.
- Next checkpoint: commit/push, update existing PR, deploy Preview only, wait READY, run hosted browser checks, capture five screenshots, and verify all four SHAs.
