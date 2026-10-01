# ADR 0001 Numa v1 web and integration architecture

## Status

Accepted for the review branch on 2026-09-07; amended 2026-09-30 after replacing the payment-gated Preview AI path.

## Decision

Use Next.js 16.3.3 App Router, React 19.2.8, strict TypeScript, CSS design tokens, and Vercel Node.js Functions. The version is pinned in the lockfile and supports the current Vercel deployment path. Numa is the product name for this build; this overrides the working name “Audio Learning” without changing the source documents.

The single application shell owns one responsive navigation component. Desktop uses a left rail; mobile renders the same destinations in a bottom bar. All S01–S15 states are represented by routes or focused panels. The five supplied mockups define visual direction: warm light surfaces, near-black type, quiet purple accent, thin borders, outline icons, controlled spacing, and restrained cards.

The frontend has two explicit modes:

1. `sample workspace` uses deterministic, non-private fixtures. Browser storage preserves only demo interactions and is labeled as such. It supplies coherent interactions and a generated two-host sample audio file for visual and usability review.
2. `private source path` requires authenticated ownership, a relational store, private object storage, durable orchestration, and generation/STT/TTS adapters. Missing providers produce structured `PROVIDER_UNAVAILABLE` errors; they never fall back to fixture success.

The live path uses Supabase Auth/Postgres, private Vercel Blob, Vercel Workflow, and a replaceable server-only `AiProvider` interface. Preview's adapter calls Cloudflare Workers AI's REST API directly: `@cf/openai/gpt-oss-20b` for JSON generation, `@cf/openai/whisper` for speech-to-text, and `@cf/myshell-ai/melotts` for speech synthesis. It uses no AI Gateway or paid-model fallback. Jobs use stable input versions, content hashes, exclusive claims, branch-scoped secrets, idempotency keys, checkpoints, bounded retries, cancellation states, and persisted results. Workflow stores extracted physical pages, a source snapshot, an immutable session revision, a private audio object, timed transcript spans, and editable outcomes transactionally through narrow secret-authenticated RPCs.

The Preview adapter enforces 4 MB PDFs, 20 pages, 20,000 extracted characters, 5-minute target lessons, scripts up to 4,000 characters/550 words, MP3 outputs up to 8 MB and 5 minutes, recordings up to 3 MB, zero provider retries, and at most three durable workflow claims. The Cloudflare Workers Free plan currently documents 10,000 Neurons per UTC day. This is a provider-wide ceiling, not a Numa per-user quota. Keep the Cloudflare account on Workers Free; beyond its free daily allocation inference fails, and this app does not upgrade or route to a paid service.

Session revisions and chapter assets are immutable. `src/lib/revision.ts` preserves all traversed and current chapters when accepting an adaptation, checks the expected revision and cursor version, and rejects stale concurrent acceptance. Cross-session evidence is filtered out when consent is off and rejected or forgotten evidence is excluded immediately.

## Security and privacy

- All application data access is scoped by a verified Supabase subject and ownership RLS, returning a non-disclosing 404 for cross-owner identifiers.
- Upload completion must validate file signature, size, page count, and content hash server-side.
- URL import accepts only public HTTP(S) destinations and must re-check DNS and every redirect in the worker before fetching.
- Raw source text, voice, and evidence must not enter general analytics or error logs.
- Before upload, the user must acknowledge that source text is sent to Cloudflare Workers AI for inference. Cloudflare says Workers AI Customer Content is not used for training or service improvement; model terms and their jurisdiction still apply.
- Original PDFs, generated audio, and raw recordings use private Blob objects. Authenticated application endpoints stream owned audio; no permanent public artifact URL is emitted. Source deletion cancels eligible jobs and removes dependent records and objects.
- Consent for learning memory and raw-audio retention are separate versioned records.

## Consequences

Database, Auth, Blob, and Workflow are configured in Preview. Provider code and deterministic adapter tests exist, but Cloudflare account ID/token are not available to this Codex connection. The PR stays Draft until the owner provisions a Cloudflare Workers AI token without upgrading from Workers Free, configures the two Preview variables, and real generation/STT/TTS plus dependent hosted journeys pass. Sample success is never substituted. Production migration/deployment remains a post-merge manual gate.
