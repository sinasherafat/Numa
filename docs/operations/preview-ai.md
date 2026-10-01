# Preview AI provider and safety limits

## Provider decision

Preview uses Cloudflare Workers AI directly. The adapter lives in `src/lib/ai/provider.ts`; business logic depends on the `AiProvider` interface, not a provider SDK or Vercel AI Gateway.

| Capability | Workers AI model | Request / output |
| --- | --- | --- |
| Podcast document map, outline, dialogue, grounded JSON | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Chunked/whole-source stages, JSON Schema mode, server-validated Zod schema, returned token usage when supplied by the API |
| Speech-to-text | `@cf/openai/whisper` | Base64 audio input, returned transcript |
| Two-speaker podcast text-to-speech | `@cf/deepgram/aura-1` | One actual speech request per dialogue turn; explicit `angus` / `asteria` speakers; raw MP3 segments are played in order |
| Durable source-ingest speech | `@cf/myshell-ai/melotts` | Existing workflow-only MP3 path; it does not claim two distinct voices |

Cloudflare's official pricing page describes a 10,000-Neuron daily free allocation for Workers Free, reset at 00:00 UTC. On Workers Free, exhausting it fails further inference; the application does not use an AI Gateway credit balance, automatically upgrade, fall back to a paid model, or retry provider calls. Keep this Preview account on Workers Free. The free allocation is shared at the provider/account level and is not a per-user quota.

The Preview podcast loop bounds extracted text to 20,000 characters, semantic chunks to five at 4,500 characters each, speech to 800 words and 5,000 spoken characters, segments to 16, audio to 8 MiB / seven minutes, and an unexpectedly short script to one additional generation attempt. Aura-1's documented rate is 1,363.64 Neurons per 1,000 characters, so 5,000 characters consume at most about 6,819 Neurons for podcast speech. This leaves at most about 3,181 Neurons of the daily allocation for the bounded LLM stages before accounting for other account-wide use; actual inference can stop earlier if the account has used quota elsewhere. The free-plan hard limit fails closed without a paid fallback.

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
| Podcast semantic chunks | 5, each ≤4,500 characters; all extracted text must be covered |
| 8–15 page podcast target | 600–800 spoken words; 5–7 minutes |
| 16–20 page podcast target | 720–800 spoken words; 6–7 minutes, capped to fit the Preview free allocation |
| Podcast speech | 5,000 total spoken characters; 16 turns maximum |
| Direct podcast audio | 8 MiB and 7 minutes (duration is checked from MP3 frames) |
| Per-client podcast attempts | 2 per 10 minutes per function instance (best-effort throttle, not an account quota) |
| Explanation recording | 3 MiB |
| Automatic provider retries | 0 |
| Durable source-job claims | 3 total (database-enforced) |

Limits fail closed with explicit error codes. A model/schema/quality failure never substitutes a fixture or proceeds to TTS. The direct podcast route maps every semantic source chunk, synthesizes the map, creates an outline, generates a dialogue, and permits one script-quality retry; each source chunk and LLM request records exact input/output character counts and Cloudflare token usage when returned, without logging source content. Podcast TTS receives only the spoken turn text—never speaker labels or stage directions. Existing source ingestion and Workflow retries remain separate paths.

## Verification categories

- Adapter unit tests use deterministic mocked HTTP responses and prove request formatting, schema validation, binary TTS handling, limits, and safe error classification. They do **not** prove provider availability.
- Provider smoke tests use tiny real requests and must be reported separately.
- Preview acceptance requires a real text PDF to pass private upload → extraction → generated grounded JSON → real MP3 synthesis → private Blob persistence → authenticated playback. STT, assessment, comparison, changes, goals, consent, persistence, retry/idempotency, and deletion each need separate live evidence.

Current status: the new quality pipeline has automated contract/quality tests, but the multi-stage generation and Aura voices have not yet been exercised against the hosted provider. The prior Ready Preview and PR result used an earlier single-pass prompt and MeloTTS; they do not verify this new code or the reported 12-page/Pangaan listening quality. The Vercel environment variable names were previously visible only as masked Preview entries; values are not read or copied. Do not report the new pipeline as accepted until the real 12-page source has passed model generation, audio playback, and human listening review.
