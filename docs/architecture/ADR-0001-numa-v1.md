# ADR 0001 Numa v1 web and integration architecture

## Status

Accepted for the review branch on 2026-09-07. Real provider activation remains blocked by missing Preview resources and credentials.

## Decision

Use Next.js 16.3.3 App Router, React 19.2.8, strict TypeScript, CSS design tokens, and Vercel Node.js Functions. The version is pinned in the lockfile and supports the current Vercel deployment path. Numa is the product name for this build; this overrides the working name “Audio Learning” without changing the source documents.

The single application shell owns one responsive navigation component. Desktop uses a left rail; mobile renders the same destinations in a bottom bar. All S01–S15 states are represented by routes or focused panels. The five supplied mockups define visual direction: warm light surfaces, near-black type, quiet purple accent, thin borders, outline icons, controlled spacing, and restrained cards.

The frontend has two explicit modes:

1. `sample workspace` uses deterministic, non-private fixtures. Browser storage preserves only demo interactions and is labeled as such. It supplies coherent interactions and a generated two-host sample audio file for visual and usability review.
2. `private source path` requires authenticated ownership, a relational store, private object storage, durable orchestration, and generation/STT/TTS adapters. Missing providers produce structured `PROVIDER_UNAVAILABLE` errors; they never fall back to fixture success.

The service boundary in `src/lib/services.ts` defines durable jobs, private object storage, and replaceable generation adapters. Jobs use stable input versions and idempotency keys. The target runtime is Vercel Workflow because the product requires checkpoints, bounded retry, cancellation, and crash-safe execution. It must be connected to an isolated Preview database and storage namespace before private source acceptance checks are claimable.

Session revisions and chapter assets are immutable. `src/lib/revision.ts` preserves all traversed and current chapters when accepting an adaptation, checks the expected revision and cursor version, and rejects stale concurrent acceptance. Cross-session evidence is filtered out when consent is off and rejected or forgotten evidence is excluded immediately.

## Security and privacy

- All future data access must be scoped by server-side owner identity, returning a non-disclosing 404 for cross-owner identifiers.
- Upload completion must validate file signature, size, page count, and content hash server-side.
- URL import accepts only public HTTP(S) destinations and must re-check DNS and every redirect in the worker before fetching.
- Raw source text, voice, and evidence must not enter general analytics or error logs.
- Signed object URLs are short lived. Source deletion invalidates derived citations, memory evidence, baselines, outcomes, and late-running jobs.
- Consent for learning memory and raw-audio retention are separate versioned records.

## Consequences

The Preview is useful for product and visual review without pretending that unavailable private infrastructure exists. The PR must stay Draft until database, storage, auth, Workflow, and model/STT/TTS adapters are configured and E01/E14–E19 are re-run against the hosted private path. No Production migration or deployment is part of this decision.
