# TikTok Ads

A Cabinet template that turns the files you already have about your company into
TikTok ads — hooks, briefs, shot lists, generated 9:16 video, and a creative
testing queue. Bring your own Google Gemini API key.

```bash
npx cabinetai import tiktok-ads
cd tiktok-ads
cp .env.example .env.local     # add your Gemini key
```

## What it does

```
brand/  product/  audience/          your company context (you fill these in)
        │
        ▼  Creative Lead + Gemini
   hooks.md          5 angles, 12 words each        free
        │  ← human picks one
        ▼
   brief.md          one idea, 8-second beats       free
        │
        ▼
   shot-list.md      one Veo prompt per shot        free
        │  ← human approves
        ▼  scripts/generate-clip.mjs
   clip-01.mp4       9:16, 8s, native audio         PAID
        │
        ▼
   testing-queue.csv → weekly learning note
```

Two agents: **Creative Lead** writes, **Growth Analyst** decides what gets tested
and what was learned. One weekly job. Nothing publishes anywhere.

## Costs and prerequisites

**Read this before you generate anything.**

Text generation runs on the Gemini **free tier**. Video generation does not.

| | |
|---|---|
| Veo free tier | **None.** Every Veo model lists "Not available" under Free Tier |
| Google Cloud $300 trial credits | **Do not apply.** Gemini API is explicitly excluded from the Free Trial program as of March 2026 |
| Minimum to unlock | **$10** prepay top-up on the AI Studio billing page |

Per 8-second clip, 720p, audio included:

| Model | $/sec | Per clip | $10 buys |
|---|---|---|---|
| `veo-3.1-lite-generate-preview` ← default | $0.05 | **$0.40** | ~25 clips |
| `veo-3.1-fast-generate-preview` | $0.10 | $0.80 | ~12 clips |
| `veo-3.1-generate-preview` | $0.40 | $3.20 | ~3 clips |

**The template defaults to Lite deliberately.** Draft cheap, escalate to Fast
only once a direction is approved. `VEO_MAX_CLIPS_PER_RUN` caps a single run so a
scheduled job cannot drain a balance overnight.

Also note: on the free tier, prompts and responses may be used to improve Google's
products. Do not run proprietary company documents through a free-tier key.

## Design decisions

**Why a script and not a prompt generator.** Every other generator in this
registry — `podcast-factory`, `youtube-channel-factory`, `book-factory` — produces
a prompt for a human to paste into an external tool. No template calls an external
API with a key. Three options were considered:

| Option | Verdict |
|---|---|
| Prompt-generator only, human pastes into Flow | Matches precedent, zero cost, but the cabinet never actually produces an ad |
| **Script the agent invokes** ✅ | Agents can generate unattended; key stays in `.env.local`; cost ceiling enforceable in code |
| Browser app calling Gemini with a key in `localStorage` | Precedent exists in this registry for `fetch` + `localStorage`, but a key in browser storage is a poor security story for a template shipped to companies |

Chosen: the script, with the browser app kept as a read-only gallery.

**Why no auto-publishing.** Cabinet's model is that anything touching the outside
world waits for human approval. Generating and staging an ad is the right scope;
posting to TikTok is not — and TikTok Ads API access is a separate approval
process measured in weeks. Two human gates are built in: choosing the hook, and
approving the shot list before generation bills.

**Why model IDs are configurable.** Google retires them on a rolling basis. During
development `gemini-2.5-flash` became unavailable to new users and Veo 3 / Veo 2
were shut down. Both `GEMINI_TEXT_MODEL` and `VEO_MODEL` live in `.env.example`.

**Relationship to `ad-performance`.** That cabinet measures paid media — spend,
CAC, ROAS, memos. This one creates the creative that gets measured. They are
complementary; neither duplicates the other.

## Known constraints

| Constraint | Consequence |
|---|---|
| 8 seconds max per generation | A 24-second ad is three clips. v1 ships single-clip ads |
| 9:16 supported | `aspectRatio: "9:16"` — native, no cropping needed |
| Audio generated natively | No separate TTS step. Always include an audio cue in the prompt |
| Videos deleted after 2 days | The script downloads bytes immediately; never persists a URI |
| SynthID watermark | Every Veo output is watermarked as AI-generated |
| English only evaluated | Other languages may work but are not evaluated. Prompts are English |
| Regional person-generation limits | Restrictions apply in EU/UK/CH/MENA. The template steers toward product-led shots |
| Latency 11s–6min | Job timeout set to 1800, not the registry default of 600 |
| One video per request | Five variants means five calls |

## Testing status

The text pipeline is verified live against `gemini-3.5-flash-lite`. The Veo path
is implemented against the documented API and validated with `--dry-run` plus
fixture-based tests, but has **not** been executed live — it is gated behind the
$10 billing minimum described above. Full record in
[`docs/testing-notes.md`](docs/testing-notes.md).

## Layout

```
.cabinet                    manifest
.agents/creative-lead/      hooks, briefs, shot lists
.agents/growth-analyst/     testing queue, weekly learning
.jobs/                      weekly-creative-review
brand/ product/ audience/   your company context
campaigns/                  one folder per campaign + clips + prompts
generators/                 the prompt for each pipeline stage
scripts/                    generate-brief.mjs (free) · generate-clip.mjs (paid)
video-studio/               embedded gallery app
fixtures/                   recorded API shapes for offline tests
testing-queue.csv           the creative test queue
```

MIT.
