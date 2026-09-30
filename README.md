# Numa

Numa turns selected sources into a source-grounded listening path that helps a learner understand, compare, remember, and explain an idea. This repository contains the v1.0 review implementation described by `ALA-SPEC-1.0`.

## What is live in this branch

The sample workspace is a fully interactive, explicitly labeled demo fixture. It includes all six product pillars, a 45-second two-host synthetic audio chapter, synchronized transcript, source navigation, adaptive future chapters, explain-back feedback, consent-aware learning memory, source comparison, topic changes, goal-shaped outcomes, Markdown export, responsive layouts, and truthful unavailable-provider responses.

`/workspace` is a separate authenticated live path backed by an isolated Supabase Preview project, ownership RLS, a private Vercel Blob store, and Vercel Workflow. It implements private PDF upload and deletion, durable/idempotent ingestion, physical-page extraction, persisted jobs, goal-shaped plans/outcomes, private audio streaming, timed transcript persistence, learning-memory and raw-audio consent, recorded or typed explain-back entry, and server-verified sessions. It never falls back to the sample workspace.

The live AI calls are implemented for grounded generation, STT, and TTS through Vercel AI Gateway. Provider smoke tests currently return `403` because the account requires a valid credit card for Gateway access. The PR therefore remains Draft: uploaded files and job failures remain real and persisted, but generated live lessons cannot be claimed as successful until that external account gate is resolved.

## Local setup

Requirements: Node.js 22 or newer and pnpm 11.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The health contract is at `/api/health`.

## Verification

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

For hosted verification, set `PLAYWRIGHT_BASE_URL` to the immutable Vercel Preview URL before running the e2e suite.

## Preview environment

Copy only the variable names from `.env.example` into the Vercel Preview environment. Do not commit values.

- `NUMA_DEMO_MODE` and `NEXT_PUBLIC_NUMA_DEMO_MODE` keep the sample workspace visibly labeled.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` identify the isolated Supabase project. They are public identifiers; authorization is still enforced with Supabase Auth and RLS.
- `BLOB_READ_WRITE_TOKEN` comes from the connected private Blob store and stays server-side.
- `NUMA_WORKFLOW_SECRET` authenticates the narrow Workflow RPC surface; only its SHA-256 digest is stored in Postgres.
- `NUMA_AI_MODEL`, `NUMA_STT_MODEL`, and `NUMA_TTS_MODEL` select Gateway models. Vercel injects OIDC in deployed Preview functions.

Migrations are intentionally not run during `next build`. The nine checked-in migrations are applied explicitly to the isolated `numa-preview` database. Never point Preview at Production data. See `docs/operations/release.md` for the ordered post-merge release path.

## Review routes

- `/new` — goal and source selection
- `/listen` — adaptive player, transcript, citations, and complete-revision audio download
- `/explain` and `/explain/feedback` — text/voice entry and grounded feedback
- `/understanding` — inspect, edit, and forget learning evidence
- `/compare` — multi-source agreement, different conditions, and unknowns
- `/topics/spaced-practice/changes` — baseline-aware change review
- `/outcome` — editable outline, notes, flashcards, and Markdown export
- `/library` and `/settings` — queue, downloads, consent, and data controls
- `/login` and `/workspace` — real Supabase Auth and owner-scoped private processing

See `docs/implementation/traceability.md` for requirement status and `docs/architecture/ADR-0001-numa-v1.md` for the architecture decision.
