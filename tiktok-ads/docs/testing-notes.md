# Testing notes

Honest record of what has been run against the live Gemini API and what has not.

## Environment

| | |
|---|---|
| Node | 22+ (developed on 23.11) |
| Cabinet | v0.5.x |
| Agent provider | `claude_local` (Claude Code CLI) |
| Gemini key | Free tier, AI Studio, project with billing unlinked |
| Text model | `gemini-3.5-flash-lite` |

## Offline test suite ✅

```bash
npm test          # node --test scripts/test/*.test.mjs
# → 19 passing
```

Nineteen tests, no key and no network required. They cover the Veo path that
cannot be exercised live: request shape, the published price table, parameter
constraints, video-URI extraction from the nested operation, the poll loop
stopping exactly when `done` flips, timeout behaviour, the done-but-empty
safety-filter case, and shot-prompt parsing out of `shot-list.md`.

Fixtures in `fixtures/` are recorded response shapes taken from the documented
API, including a real `gemini-3.5-flash-lite` response carrying a
`thoughtSignature`.

## Verified live ✅

### 1. Text API reachable

```
$ curl -s ".../models/gemini-3.5-flash-lite:generateContent" \
    -H "x-goog-api-key: $GEMINI_API_KEY" -H "Content-Type: application/json" \
    -d '{"contents":[{"parts":[{"text":"say hi"}]}]}'
{"candidates":[{"content":{"parts":[{"text":"Hi! How can I help you today?",
"thoughtSignature":"EjQKMgERTTIP36yXkkLZ..."}],"role":"model"},
"finishReason":"STOP"}],"modelVersion":"gemini-3.5-flash-lite"}
```

Note the `thoughtSignature` sitting inside the same part as the text. Gemini 3.x
returns it routinely, and code that treats `parts[0]` as a string will leak it
into output. `lib/gemini.mjs` joins only the parts that actually carry `text`,
and `gemini.test.mjs` asserts the signature never appears in the result.

### 2. Hook generation from company files

```
$ node scripts/generate-brief.mjs --stage hooks --campaign 001-example
⚠️  Still placeholder content: product/index.md, audience/index.md
Generating hooks for 001-example with gemini-3.5-flash-lite...
✓ Wrote campaigns/001-example/hooks.md (569 chars)
```

Input was a filled-in `brand/index.md` for a fictional reusable-bottle brand with
explicit voice rules and a "Never mention" blocklist. Output:

| # | Angle | Hook |
|---|---|---|
| 1 | Problem-first | Your bag is wet again because your bottle leaked. |
| 2 | Ritual | Twelve years of the same morning desk setup. |
| 3 | Contrarian | Most water bottles are disposable items disguised as investments. |
| 4 | Objection-handling | Twelve years is a long time to warranty steel. |
| 5 | Demonstration | This bottle holds water upside down for twelve years. |

**Constraint compliance — checked, all passing:**

| Check | Method | Result |
|---|---|---|
| No exclamation marks | `grep -c '!'` | 0 ✅ |
| No discounts / competitors / sustainability guilt | `grep -Ei 'discount\|sale\|save\|planet\|guilt'` | no matches ✅ |
| Every hook ≤ 12 words | word count per row | max 10 ✅ |
| Five distinct angles | manual read | 5 distinct ✅ |
| Claims trace to "Proof points" | manual read | 12-year warranty is a stated proof point ✅ |
| "Chosen" column left blank | manual read | blank, recommendation given separately ✅ |

**Defects found in the output — real, not cosmetic:**

1. **Hook 5 collides two proof points.** "Holds water upside down for twelve
   years" merges the leakproof demonstration with the warranty period into a
   claim that does not parse. Fix: constrain each hook to at most one proof
   point.
2. **Three of five hooks lean on the same evidence** ("twelve years"). The
   angles differ but the underlying claim does not, so a test built from these
   would largely re-measure one proof point. This is precisely the near-duplicate
   failure the Growth Analyst persona is written to catch — the agent design
   anticipated it, the generator prompt did not prevent it. Fix: require at
   least three different proof points across the five hooks.
3. **Hook 1 softly fails the swap test.** "Your bag is wet because your bottle
   leaked" works for any leakproof brand.

Both fixes belong in `generators/hook-generator.md`, not in the model choice.

## Not verified live ❌

| Check | Why not |
|---|---|
| Veo video generation | Paid tier only — see below |

```
$ node scripts/generate-clip.mjs --campaign 001-example --shot 01 --yes
<!-- TODO: paste the actual error response here -->
```

**Reason.** Veo is available to developers on the paid tier of the Gemini API
only — the official pricing table lists "Not available" under Free Tier for every
Veo 3.1 variant. Separately, Google Cloud free-trial and Welcome credits are
explicitly excluded from Gemini API usage for accounts opened after 2 March 2026:

> "Does the Google Cloud Free Trial apply to Gemini API usage? No, starting
> March 2026, Gemini API usage costs are specifically excluded from the $300
> Google Cloud Free Trial program."
> — https://ai.google.dev/gemini-api/docs/billing

Clearing this requires a $10 minimum prepay top-up on the AI Studio billing page,
which buys roughly 25 clips at the Lite tier this template defaults to.

### How the video path was validated instead

1. **Dry run.** `--dry-run` assembles and prints the exact request without
   sending it, and writes it to `fixtures/last-request.json`:

```
$ node scripts/generate-clip.mjs --campaign 001-example --shot 01 --dry-run
Campaign : 001-example
Shots    : 01
Model    : veo-3.1-lite-generate-preview  720p  8s  9:16
Cost     : $0.40 per clip → $0.40 total

[{"shot":"01","endpoint":"POST /v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning",
  "body":{"instances":[{"prompt":"A single matte steel water bottle..."}],
  "parameters":{"aspectRatio":"9:16","durationSeconds":"8","resolution":"720p"}}}]

✓ Dry run. Nothing sent, nothing billed.
```

2. **Fixture tests.** Polling, URI extraction, and error handling verified
   against recorded operation responses. See `npm test`.
3. **Doc conformance.** Request shape, parameter names, and value types checked
   against https://ai.google.dev/gemini-api/docs/veo.

To run it for real: top up billing, then
`node scripts/generate-clip.mjs --campaign 001-example --shot 01`.

## Models retired during development

Why both model IDs are configurable rather than hardcoded:

| Model | What happened |
|---|---|
| `gemini-2.5-flash` | 404 — "no longer available to new users" |
| `veo-3.0-generate-001`, `veo-2.0-generate-001` | Shut down 30 June 2026 |

A template that hardcodes a model ID is silently broken for whoever installs it
six months later.

## Environment loading

`.env.local` parsing had two failure modes worth recording, both now handled in
`lib/env.mjs`: a variable exported as empty in the shell shadowed the file value
(`k in process.env` is true for an empty string), and `export KEY=value` lines
parsed the name as `export KEY`.
