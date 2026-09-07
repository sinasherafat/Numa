# Numa v1.0 verification report

This report is updated from executed commands; unavailable checks are never recorded as passes.

## Automated checks

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript strict typecheck | Passed | `./node_modules/.bin/tsc --noEmit` |
| ESLint | Passed | `./node_modules/.bin/eslint .` |
| Unit tests | Passed | Vitest: 2 files, 13 deterministic contract/revision/consent tests |
| Next.js production build | Passed | Next.js 16.3.3 optimized build; UI and API routes emitted |
| Browser journeys | Passed locally and on the hosted Vercel Preview | J01–J06, source evidence navigation, 1440/390/320 layouts, no console errors or framework overlays |
| Packaged Playwright runner | Environment-blocked | All 9 tests are discovered, but the Playwright Chromium download returns CDN HTTP 403 (`service is not available in your location`); no browser executable exists on the host |
| API contracts | Passed | `/api/health` → 200 demo/provider state; private import → truthful 503; missing idempotency → 400 |

## Browser review checklist

The five visual-reference routes are `/new`, `/listen`, `/explain/feedback`, `/compare`, and `/topics/spaced-practice/changes`. Each was captured at 1440px in `artifacts/screenshots/`. The listening screen was also captured at 390px and the new-session screen at 320px. Browser checks found and fixed one 9px overflow caused by the invisible file input; the rerun reported zero overflow. No second sidebar, hidden primary action, unreadable source evidence, console error, framework overlay, or autoplay was observed.

## Executed browser evidence

- J01/J06: presentation goal → duration → reviewed plan → sample audio.
- J02: cursor-grounded answer → accepted update → only future chapters changed while the current chapter stayed stable.
- J03: editable text fallback → feedback → memory remained off until the learner enabled it.
- J04: agreement, different conditions, and unresolved transfer question remained distinct.
- J05: baseline moved only after explicit review and could be kept at the prior review.
- Source grounding: a citation opened physical PDF page 4 and the return path preserved the listening route.

The hosted rerun repeated J01–J06, the future-only chapter update, explicit memory consent, baseline review, comparison relationships, and physical-page source navigation against a Vercel deployment reported as `READY` with target `preview`. The hosted browser produced no console errors. The canonical Preview is protected by the owner's Vercel SSO policy; authenticated browser access and `vercel curl` both succeeded.

## Deployment safety

The first Git-triggered deployment of this newly created project was incorrectly auto-promoted by Vercel even though the configured production branch was `main`. It was removed immediately. A subsequent explicit `--target preview` deployment was verified, and the deployment listing contained only the `Preview` target. No production deployment is retained.

## Live provider boundary

`/api/health` reports individual provider presence without values. `/api/sessions` and `/api/sources/import-url` require idempotency and respond with `PROVIDER_UNAVAILABLE` while private infrastructure is absent. These failures are expected and are not counted as passed real-product operations.
