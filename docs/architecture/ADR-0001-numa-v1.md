# ADR 0001 Numa v1 web and integration architecture

## Status

Accepted for the review branch on 2026-09-07; amended 2026-09-30 after Preview infrastructure activation. AI Gateway execution remains account-blocked.

## Decision

Use Next.js 16.3.3 App Router, React 19.2.8, strict TypeScript, CSS design tokens, and Vercel Node.js Functions. The version is pinned in the lockfile and supports the current Vercel deployment path. Numa is the product name for this build; this overrides the working name “Audio Learning” without changing the source documents.

The single application shell owns one responsive navigation component. Desktop uses a left rail; mobile renders the same destinations in a bottom bar. All S01–S15 states are represented by routes or focused panels. The five supplied mockups define visual direction: warm light surfaces, near-black type, quiet purple accent, thin borders, outline icons, controlled spacing, and restrained cards.

The frontend has two explicit modes:

1. `sample workspace` uses deterministic, non-private fixtures. Browser storage preserves only demo interactions and is labeled as such. It supplies coherent interactions and a generated two-host sample audio file for visual and usability review.
2. `private source path` requires authenticated ownership, a relational store, private object storage, durable orchestration, and generation/STT/TTS adapters. Missing providers produce structured `PROVIDER_UNAVAILABLE` errors; they never fall back to fixture success.

The live path uses Supabase Auth/Postgres, private Vercel Blob, Vercel Workflow, and Vercel AI Gateway. Jobs use stable input versions, content hashes, exclusive claims, branch-scoped secrets, idempotency keys, checkpoints, bounded retries, cancellation states, and persisted results. Workflow stores extracted physical pages, a source snapshot, an immutable session revision, a private audio object, timed transcript spans, and editable outcomes transactionally through narrow secret-authenticated RPCs.

Session revisions and chapter assets are immutable. `src/lib/revision.ts` preserves all traversed and current chapters when accepting an adaptation, checks the expected revision and cursor version, and rejects stale concurrent acceptance. Cross-session evidence is filtered out when consent is off and rejected or forgotten evidence is excluded immediately.

## Security and privacy

- All application data access is scoped by a verified Supabase subject and ownership RLS, returning a non-disclosing 404 for cross-owner identifiers.
- Upload completion must validate file signature, size, page count, and content hash server-side.
- URL import accepts only public HTTP(S) destinations and must re-check DNS and every redirect in the worker before fetching.
- Raw source text, voice, and evidence must not enter general analytics or error logs.
- Original PDFs, generated audio, and raw recordings use private Blob objects. Authenticated application endpoints stream owned audio; no permanent public artifact URL is emitted. Source deletion cancels eligible jobs and removes dependent records and objects.
- Consent for learning memory and raw-audio retention are separate versioned records.

## Consequences

Database, Auth, Blob, Workflow, generation, STT, and TTS adapters are configured in Preview. Database/RLS and build checks pass, but Gateway calls return `403` with the provider requirement for a valid credit card. The PR stays Draft until real generation/STT/TTS and the dependent hosted F01/F03/F04/F05/F06 journeys pass. Sample success is never substituted. Production migration/deployment remains a post-merge manual gate.
