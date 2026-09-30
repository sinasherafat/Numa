# Numa release runbook

Production is intentionally not deployed or connected to Preview data by this branch.

## Before merge

1. Keep PR #1 Draft while the AI Gateway provider check is blocked.
2. Verify Preview-only Supabase, Blob, Workflow secret, public Supabase identifiers, and model selectors.
3. Require typecheck, lint, unit tests, production build, hosted browser journeys, and matching Git/Vercel SHAs.

## After the human-approved merge

1. Provision a new isolated Supabase production project in the explicitly selected organization; never reuse `numa-preview`.
2. Review and apply `migrations/0001_numa_core.sql` through `0009_numa_live_audio.sql` in filename order. Stop on the first error; do not reset or drop schemas.
3. Create a separate private production Blob store and connect it only to the production Vercel environment.
4. Generate a distinct production Workflow secret, store its digest through a new reviewed migration or controlled SQL action, and set the plaintext only in Vercel Production.
5. Configure production Supabase Auth Site URL and redirect allowlist for the final production domain.
6. Add production public Supabase identifiers and the three validated Gateway model selectors. Do not copy Preview data, Blob tokens, Workflow secrets, or test users.
7. Run bounded database, Auth, Blob, text, STT, and TTS smoke tests; then deploy Production manually and complete the human acceptance checklist.

No migration is coupled to `next build`, so a failed schema operation cannot partially deploy the web application. Production resource creation remains gated on explicit organization/capacity selection and working AI billing access.
