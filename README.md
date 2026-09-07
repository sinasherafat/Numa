# Numa

Numa turns selected sources into a source-grounded listening path that helps a learner understand, compare, remember, and explain an idea. This repository contains the v1.0 review implementation described by `ALA-SPEC-1.0`.

## What is live in this branch

The sample workspace is a fully interactive, explicitly labeled demo fixture. It includes all six product pillars, a 45-second two-host synthetic audio chapter, synchronized transcript, source navigation, adaptive future chapters, explain-back feedback, consent-aware learning memory, source comparison, topic changes, goal-shaped outcomes, Markdown export, responsive layouts, and truthful unavailable-provider responses.

Private uploads, authentication, durable jobs, database persistence, private object storage, and model/STT/TTS calls are not simulated. Their typed ports and request contracts are present, but the real path responds with `PROVIDER_UNAVAILABLE` until the required Preview services are configured. This distinction is deliberate; a successful fixture interaction is not presented as live document processing.

## Local setup

Requirements: Node.js 20.9 or newer and pnpm 11.

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
- `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, and `AUTH_SECRET` are required for the private path.
- `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` is required for generation, transcription, and speech adapters.
- Provider selector variables allow those adapters to be replaced.

Migrations are intentionally not run during `next build`. Before enabling the private path, add a versioned relational migration under `migrations/`, run it explicitly against an isolated Preview database, and configure the durable worker runtime. Never point Preview at Production data.

## Review routes

- `/new` — goal and source selection
- `/listen` — adaptive player, transcript, citations, and complete-revision audio download
- `/explain` and `/explain/feedback` — text/voice entry and grounded feedback
- `/understanding` — inspect, edit, and forget learning evidence
- `/compare` — multi-source agreement, different conditions, and unknowns
- `/topics/spaced-practice/changes` — baseline-aware change review
- `/outcome` — editable outline, notes, flashcards, and Markdown export
- `/library` and `/settings` — queue, downloads, consent, and data controls

See `docs/implementation/traceability.md` for requirement status and `docs/architecture/ADR-0001-numa-v1.md` for the architecture decision.
