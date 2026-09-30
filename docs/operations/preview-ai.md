# Preview AI provider and safety limits

## Provider decision

Preview uses Cloudflare Workers AI directly. The adapter lives in `src/lib/ai/provider.ts`; business logic depends on the `AiProvider` interface, not a provider SDK or Vercel AI Gateway.

| Capability | Workers AI model | Request / output |
| --- | --- | --- |
| Grounded plan, assessment JSON | `@cf/openai/gpt-oss-20b` | Structured messages, JSON mode, server-validated Zod schema |
| Speech-to-text | `@cf/openai/whisper` | Base64 audio input, returned transcript |
| Text-to-speech | `@cf/myshell-ai/melotts` | English text input, MP3 response |

Cloudflare's official pricing page describes a 10,000-Neuron daily free allocation for Workers Free, reset at 00:00 UTC. On Workers Free, exhausting it fails further inference; the application does not use an AI Gateway credit balance, automatically upgrade, fall back to a paid model, or retry provider calls. Keep this Preview account on Workers Free. The free allocation is shared at the provider/account level and is not a per-user quota.

Cloudflare's Workers AI data-use documentation states that customer content is not made available to other Cloudflare customers and is not used to train models or improve Cloudflare or third-party services. Cloudflare still processes text/audio to provide inference, and third-party model terms apply. The upload form discloses that source text is sent to Cloudflare and requires acknowledgement. Do not upload material without permission to process it.

## Server environment

Set these variables in the Vercel **Preview** environment only:

- `NUMA_AI_PROVIDER=cloudflare-workers-ai`
- `CLOUDFLARE_ACCOUNT_ID` — account identifier, not a secret.
- `CLOUDFLARE_API_TOKEN` — server-only credential with the Workers AI permissions required by Cloudflare's REST API.

Never use a `NEXT_PUBLIC_` prefix for the token. Do not put the value in Git, logs, a prompt, or chat. Local development uses the same variables in an ignored `.env.local`. Production configuration is outside this Preview task.

Cloudflare's REST setup flow is: Cloudflare Dashboard → Workers AI → Use REST API → Create a Workers AI API Token, then copy the account ID. Use Cloudflare's provided token template; if creating a custom token, grant only Workers AI Read/Edit as required by the API. Do not enable Workers Paid or add a payment method. The signed-in Vercel dashboard showed these three variable names in Preview scope, but masks their values and the available Vercel API connection does not expose them. Their names are absent from this local `.env.local`; no token value is requested, copied, or logged. Consequently, the exact provider selector value and actual credentials cannot be verified or used for a real smoke request from this task. No real provider request is claimed.

## Enforced Preview limits

| Resource | Maximum |
| --- | ---: |
| PDF bytes | 4 MiB |
| Physical pages | 20 |
| Extracted source text | 20,000 characters |
| Lesson target | 5 minutes |
| Generated script | 4,000 characters and 550 words |
| Synthesized MP3 | 8 MiB and 5 minutes (duration is checked from MP3 frames) |
| Explanation recording | 3 MiB |
| Automatic provider retries | 0 |
| Durable source-job claims | 3 total (database-enforced) |

Limits fail closed with explicit error codes. A model/schema failure never substitutes a fixture. Source ingestion makes at most one generation call and, if validation succeeds, one speech call for each job attempt. The only retryable paths are non-provider infrastructure steps; total job attempts remain capped by the existing `numa.jobs` constraint.

## Verification categories

- Adapter unit tests use deterministic mocked HTTP responses and prove request formatting, schema validation, binary TTS handling, limits, and safe error classification. They do **not** prove provider availability.
- Provider smoke tests use tiny real requests and must be reported separately.
- Preview acceptance requires a real text PDF to pass private upload → extraction → generated grounded JSON → real MP3 synthesis → private Blob persistence → authenticated playback. STT, assessment, comparison, changes, goals, consent, persistence, retry/idempotency, and deletion each need separate live evidence.

Current status: source code is configured for direct Workers AI, and the three Preview variable names are present in Vercel. The exact `NUMA_AI_PROVIDER` value and token validity remain unverified; no real Cloudflare request has run. Do not report the live AI path as ready until smoke and end-to-end checks pass.
