# Testing notes

Honest record of what has been run against the live Gemini API and what has not.

## Environment

| | |
|---|---|
| Node | 22 |
| Cabinet | v0.5.x |
| Agent provider | `claude_local` (Claude Code CLI) |
| Gemini key | Free tier, AI Studio, project with billing unlinked |

## Verified live ✅

| Check | Result |
|---|---|
| Gemini text API reachable | `gemini-3.5-flash-lite` returns 200 |

```
$ curl -s ".../models/gemini-3.5-flash-lite:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" ...
{"candidates":[{"content":{"parts":[{"text":"Hi! How can I help you today?",
"thoughtSignature":"..."}],"role":"model"},"finishReason":"STOP"}],
"modelVersion":"gemini-3.5-flash-lite"}
```

Note the `thoughtSignature` field — Gemini 3.x returns it alongside the text.
`generate-brief.mjs` reads `candidates[0].content.parts[0].text` explicitly.

## Not verified live ❌

| Check | Why not |
|---|---|
| Veo video generation | Requires paid tier; see below |

<!-- TODO Phase E: paste the exact error response from the Veo call here -->

```
$ curl -s ".../models/veo-3.1-lite-generate-preview:predictLongRunning" ...
<paste actual error>
```

**Reason.** Veo is available to developers on the paid tier of the Gemini API
only — the official pricing table lists "Not available" under Free Tier for every
Veo 3.1 variant. Separately, Google Cloud free-trial and Welcome credits are
explicitly excluded from Gemini API usage for accounts opened after 2 March 2026:

> "Does the Google Cloud Free Trial apply to Gemini API usage? No, starting
> March 2026, Gemini API usage costs are specifically excluded from the $300
> Google Cloud Free Trial program."
> — https://ai.google.dev/gemini-api/docs/billing

Clearing this requires a $10 minimum prepay top-up on the AI Studio billing page.

## Models retired during development

Worth recording, because it is why both model IDs are configurable rather than
hardcoded:

| Model | What happened |
|---|---|
| `gemini-2.5-flash` | 404 — "no longer available to new users" |
| `veo-3.0-generate-001`, `veo-2.0-generate-001` | Shut down 30 June 2026 |

## How the video path was validated instead

1. `--dry-run` emits the exact request payload to `fixtures/last-request.json`
2. Polling and download logic unit-tested against recorded fixtures
3. Request shape and parameters checked against the official Veo docs

To run it for real: top up billing, then
`node scripts/generate-clip.mjs --campaign 001-example --shot 01`.
