# Numa

Numa turns selected sources into a source-grounded listening path that helps a learner understand, compare, remember, and explain an idea. This repository contains the v1.0 review implementation described by `ALA-SPEC-1.0`.

## What is live in this branch

The sample workspace is a fully interactive, explicitly labeled demo fixture. It includes all six product pillars, a 45-second two-host synthetic audio chapter, synchronized transcript, source navigation, adaptive future chapters, explain-back feedback, consent-aware learning memory, source comparison, topic changes, goal-shaped outcomes, Markdown export, responsive layouts, and truthful unavailable-provider responses.

`/workspace` is a separate authenticated live path backed by an isolated Supabase Preview project, ownership RLS, a private Vercel Blob store, and Vercel Workflow. It implements private PDF upload and deletion, durable/idempotent ingestion, physical-page extraction, persisted jobs, goal-shaped plans/outcomes, private audio streaming, timed transcript persistence, learning-memory and raw-audio consent, recorded or typed explain-back entry, and server-verified sessions. It never falls back to the sample workspace.

The live AI provider layer uses the Cloudflare Workers AI REST API directly for source-grounded JSON generation, Whisper speech-to-text, and MeloTTS. It does not use Vercel AI Gateway. The documented Workers Free allocation is 10,000 Neurons per UTC day; when the free allocation is exhausted, calls fail rather than automatically billing. Do not upgrade to Workers Paid for this Preview. Cloudflare says Workers AI Customer Content is not used for model training or service improvement. Source text is sent to Cloudflare for inference only after the upload disclosure is acknowledged.

The Preview provider still needs two server-only values in the Vercel **Preview** environment: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. This Codex environment has no connected Cloudflare account or token, so no real provider request has yet been executed. Until those are available, no live AI output is claimed and the PR stays Draft. See `docs/operations/preview-ai.md` for exact setup and enforced limits.

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
- `NUMA_AI_PROVIDER=cloudflare-workers-ai` selects the provider adapter.
- `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are server-only Cloudflare Workers AI credentials. Scope the token only to Workers AI; never expose it to the browser or commit it.
- Vercel OIDC remains available for Vercel infrastructure but is not used to call the AI provider.

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
