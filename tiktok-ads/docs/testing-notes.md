# Testing notes

Honest record of what has been run against the live Gemini API and what has not.

## Environment

| | |
|---|---|
| Node | 22+ (developed on 23.11) |
| Cabinet | v0.4.4 |
| Agent provider | `claude_local` (Claude Code CLI) |
| Gemini key | Free tier, AI Studio, project with billing unlinked |
| Text model | `gemini-3.5-flash-lite` |

## Offline test suite ✅

```bash
npm test          # node --test scripts/test/*.test.mjs
# → 20 passing
```

Twenty tests, no key and no network required. They cover the Veo path that
cannot be exercised live: request shape, the published price table, parameter
constraints, video-URI extraction from the nested operation, the poll loop
stopping exactly when `done` flips, timeout behaviour, the done-but-empty
safety-filter case, and shot-prompt parsing out of `shot-list.md`.

The response shapes are declared at the top of each test file, transcribed from
the documented API — plus one captured verbatim from a live
`gemini-3.5-flash-lite` call, including its `thoughtSignature`.

**Note the limit of this suite.** See "The bug the tests missed" below. Twenty
passing tests are evidence of internal consistency, not of a correct contract
with the API.

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

### 2. Hook generation from company files — run 1

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

**Three defects found in the output — real, not cosmetic:**

1. **Hook 5 collides two proof points.** "Holds water upside down for twelve
   years" merges the leakproof demonstration with the warranty period into a
   claim that does not parse.
2. **Three of five hooks lean on the same evidence** ("twelve years"). The
   angles differ but the underlying claim does not, so a test built from these
   would largely re-measure one proof point. This is precisely the near-duplicate
   failure the Growth Analyst persona is written to catch — the agent design
   anticipated it, the generator prompt did not prevent it.
3. **Hook 1 softly fails the swap test.** "Your bag is wet because your bottle
   leaked" works for any leakproof brand.

All three are prompt-level, not model-level. Fixes went into
`generators/hook-generator.md`: cap each hook at one proof point, require at
least three different proof points across the five.

### 3. Hook generation — run 2, after the prompt fix

```
$ node scripts/generate-brief.mjs --stage hooks --campaign 002-verified
✓ Wrote campaigns/002-verified/hooks.md
```

| # | Angle | Hook | Proof point used |
|---|---|---|---|
| 1 | Problem-first | Your bag is wet again because the lid failed. | leakproof lid |
| 2 | Ritual | Fill it with ice. It will still be there tomorrow. | 26-hour ice retention |
| 3 | Contrarian | You do not need a new water bottle every year. | durability |
| 4 | Objection-handling | Twelve years is a long time to keep one bottle. | 12-year warranty |
| 5 | Demonstration | This has been upside down in a bag for 48 hours. | 48-hour leak test |

**Defect 2 is resolved.** Five hooks now draw on five different proof points,
where run 1 clustered three on "twelve years". The constraint added to the
generator prompt worked. Committed as `campaigns/002-verified/` as evidence the
live pipeline runs.

### 4. Agent path in the Cabinet UI

The template was installed by copying it into the running instance's data
directory, since `npx cabinetai import` resolves against the upstream registry
and this template lives in a fork. A symlink was tried first: the file watcher
followed it (16 pages indexed) but cabinet discovery did not register it, so
copying is the working approach.

Startup confirmed `Discovered 2 cabinet(s). Scheduled 2 jobs and 2 heartbeats.` —
both job YAMLs and both agent heartbeats parse correctly.

The Creative Lead agent was then tasked directly through the UI and wrote hooks
to the specified campaign path. Note this path runs on Claude Code
(`claude_local`), not Gemini — agents handle orchestration, the scripts handle
the Gemini integration.

## The bug the tests missed 🔴

The most useful finding in this project.

**First live Veo call:**

```
$ node scripts/generate-clip.mjs --campaign 001-example --shot 01 --yes
Error: Veo API 400: The value type for `durationSeconds` needs to be a number.
```

The code sent `durationSeconds` as a string. **The offline suite passed 19/19
anyway**, because `veo.test.mjs` asserted:

```js
assert.equal(typeof body.parameters.durationSeconds, 'string', 'API expects a string');
```

The test encoded the same misreading of the docs as the implementation. Both were
wrong in the same direction, so they agreed with each other and the suite stayed
green.

**Takeaway:** fixture-based tests validate internal consistency, not the external
contract. A recorded response shape can only confirm that the code matches what I
*believed* the API returns. Only a live call can confirm what it actually
requires.

**Fix** in `lib/veo.mjs`:

```js
// Must be a NUMBER. The API rejects a string with:
//   "The value type for `durationSeconds` needs to be a number."
durationSeconds: Number(durationSeconds),
```

Plus a regression test asserting numeric coercion when the value arrives from
`.env` as a string — which it always does. Suite is now 20 tests.

**Second live Veo call, after the fix:**

```
$ node scripts/generate-clip.mjs --campaign 001-example --shot 01 --yes
Campaign : 001-example
Shots    : 01
Model    : veo-3.1-lite-generate-preview  720p  8s  9:16
Cost     : $0.40 per clip → $0.40 total
── Shot 01 ──
Error: You exceeded your current quota, please check your plan and billing details.
  → Veo is PAID TIER ONLY. There is no free tier for video generation, and
    Google Cloud free-trial credits are excluded from Gemini API usage.
    A $10 minimum prepay top-up unlocks it. See README "Costs and prerequisites".
```

| Attempt | Response | Meaning |
|---|---|---|
| 1 | `400 — value type needs to be a number` | Request malformed. A real bug. |
| 2, after fix | `429 — quota exceeded` | Request valid. Rejected on entitlement alone. |

The progression from a validation error to a quota error is the evidence that the
request shape is now correct: the API parsed it and got as far as checking
entitlement. Everything upstream of billing works.

## Not completed ❌

**A generated video file.** Veo is available on the paid tier of the Gemini API
only — the official pricing table lists "Not available" under Free Tier for every
Veo 3.1 variant. Separately, Google Cloud free-trial and Welcome credits are
excluded from Gemini API usage for accounts opened after 2 March 2026:

> "Does the Google Cloud Free Trial apply to Gemini API usage? No, starting
> March 2026, Gemini API usage costs are specifically excluded from the $300
> Google Cloud Free Trial program."
> — https://ai.google.dev/gemini-api/docs/billing

Clearing this requires a $10 minimum prepay top-up on the AI Studio billing page,
which buys roughly 25 clips at the Lite tier this template defaults to.

### How the video path was validated instead

**1. Dry run** — assembles and prints the exact request without sending it, and
writes it to `campaigns/<campaign>/last-request.json`:

```
$ node scripts/generate-clip.mjs --campaign 001-example --shot 01 --dry-run
Campaign : 001-example
Shots    : 01
Model    : veo-3.1-lite-generate-preview  720p  8s  9:16
Cost     : $0.40 per clip → $0.40 total

[{"shot":"01","endpoint":"POST /v1beta/models/veo-3.1-lite-generate-preview:predictLongRunning",
  "body":{"instances":[{"prompt":"A single matte steel water bottle..."}],
  "parameters":{"aspectRatio":"9:16","durationSeconds":8,"resolution":"720p"}}}]

✓ Dry run. Nothing sent, nothing billed.
```

**2. Offline tests** — polling, URI extraction, and error handling verified
against recorded operation shapes in `scripts/test/veo.test.mjs`.

**3. Guard rails** — captured in `docs/test-run-2026-08-06.txt`: missing key,
missing prerequisite stage, placeholder company files, invalid parameters
(4k on Lite), and a missing shot all fail with actionable messages rather than
stack traces.

To run it for real: top up billing, then
`node scripts/generate-clip.mjs --campaign 001-example --shot 01`.

## Other incidents during development

| Incident | Resolution |
|---|---|
| `gemini-2.5-flash` returned 404 — "no longer available to new users" | Moved to `gemini-3.5-flash-lite`; made both model IDs configurable |
| `veo-3.0-generate-001`, `veo-2.0-generate-001` shut down 30 June 2026 | Same reason a hardcoded model ID is a defect |
| GCP $300 trial credits rejected by the Gemini API | Researched and documented: excluded since March 2026 |
| `.env.local` not loading, twice | A variable exported as empty in the shell shadowed the file value (`k in process.env` is true for an empty string); and `export KEY=value` lines parsed the name as `export KEY`. Both fixed in `lib/env.mjs` |
| **GitHub push protection blocked a commit** — a real API key had been pasted into `.env.example` | Rotated the key, blanked the value, rewrote the local commit. The "allow secret" bypass was not used |
| `cover.jpg` was a PNG at 1024×541, 156KB | Failed all three parts of the registry spec while still appearing in the manifest, since `build-manifest.mjs` matches on filename. Converted to a real JPEG at 1200×630, 36KB |
