# Numa release runbook

Production is intentionally not deployed or connected to Preview data by this branch.

## Before merge

1. Keep PR #1 Draft until a real provider request and the real PDF→analysis→script→TTS→private Blob→playback path pass. Preview AI calls Cloudflare Workers AI directly; do not enable Vercel AI Gateway or Workers Paid.
2. An account owner must create a Cloudflare account and Workers AI API token, then set `NUMA_AI_PROVIDER=cloudflare-workers-ai`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` only in Vercel **Preview**. Do not add a payment method, upgrade, or expose the token to browser/client variables. See `preview-ai.md`.
3. Verify Preview-only Supabase, Blob, Workflow secret, public Supabase identifiers, and Cloudflare provider settings. The Supabase `numa.runtime_secrets` row stores only the SHA-256 digest of `NUMA_WORKFLOW_SECRET`; if the Preview secret is rotated, update that digest in the Preview database through an approved secure operator path and verify a non-mutating RPC before starting a Workflow. Never print, commit, or paste the plaintext secret or its environment file.
4. Require typecheck, lint, unit tests, production build, hosted browser journeys, and matching Git/Vercel SHAs. F01/F04/F05 also need live routes and acceptance tests before calling all six pillars live.

## After the human-approved merge

1. Provision a new isolated Supabase production project in the explicitly selected organization; never reuse `numa-preview`.
2. Review and apply `migrations/0001_numa_core.sql` through `0009_numa_live_audio.sql` in filename order. Stop on the first error; do not reset or drop schemas.
3. Create a separate private production Blob store and connect it only to the production Vercel environment.
4. Generate a distinct production Workflow secret, store its digest through a new reviewed migration or controlled SQL action, and set the plaintext only in Vercel Production.
5. Configure production Supabase Auth Site URL and redirect allowlist for the final production domain.
6. Select and provision a production AI provider separately with explicit owner authorization. Do not copy Preview data, Blob tokens, Workflow secrets, provider tokens, or test users.
7. Run bounded database, Auth, Blob, text, STT, and TTS smoke tests; then deploy Production manually and complete the human acceptance checklist.

No migration is coupled to `next build`, so a failed schema operation cannot partially deploy the web application. Production resource creation and deployment remain outside this task and require separate human approval.
