# TikTok Ads

A Cabinet template that turns the files you already have about your company into
TikTok ads — hooks, briefs, shot lists, generated 9:16 video, and a creative
testing queue. Bring your own Google Gemini API key.

## Demo

https://github.com/user-attachments/assets/5a372a02-955b-4516-b2a6-9b1de991eb13

https://github.com/user-attachments/assets/87e757df-e156-44f1-8dc0-2069a4b5c4e2

The template was installed by copying it into the running instance's data
directory (`~/.cabinet/app/v0.4.4/data/`), since `npx cabinetai import` resolves
against the upstream `cabinetai/cabinets` registry and this template lives in a
fork.

## Quick start

```bash
git clone https://github.com/ysmish/cabinets.git
cp -R cabinets/tiktok-ads <your-cabinet-data-dir>/
cd <your-cabinet-data-dir>/tiktok-ads
cp .env.example .env.local     # add your Gemini key
npm test                       # 20 offline tests, no key needed
```

If this template is merged upstream, `npx cabinetai import tiktok-ads` becomes
the install path.

## What it does

```
brand/  product/  audience/          your company context (you fill these in)
        │
        ▼  Creative Lead + Gemini            scripts/generate-brief.mjs
   hooks.md          5 angles, 12 words each              FREE
        │  ← human picks one
        ▼
   brief.md          one idea, 8-second beats             FREE
        │
        ▼
   shot-list.md      one Veo prompt per shot              FREE
        │  ← human approves
        ▼  Veo 3.1                            scripts/generate-clip.mjs
   clip-01.mp4       9:16, 8s, native audio               PAID
        │
        ▼
   testing-queue.csv → video-studio → weekly learning note
```

Two agents. One writes, one decides what gets tested. Nothing publishes anywhere.

- **[Creative Lead](.agents/creative-lead/persona.md)** — reads the company
  files, writes hooks and briefs, engineers Veo prompts, runs generation.
- **[Growth Analyst](.agents/growth-analyst/persona.md)** — owns the testing
  queue, keeps angles distinct, writes the weekly learning note.

## Recurring rhythm

| Cadence | Job | Owner | Output |
|---|---|---|---|
| **Wed 10:00** | `weekly-ad-prep` | Creative Lead | Next campaign written — hooks, brief, shot list, queued rows. Text only, no spend. |
| **Mon 10:00** | `weekly-creative-review` | Growth Analyst | Learning note in `campaigns/learnings/weekly-<date>.md` |

Writing is scheduled because it is free. **Generation is on demand**, because
every clip costs money — a human approves the shot list and runs the command.
Monday's note names the angle Wednesday's job writes.

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
scheduled job cannot drain a balance overnight, and `generate-clip.mjs` prints the
cost and asks for confirmation before spending.

On the free tier, prompts and responses may be used to improve Google's products.
Do not run proprietary company documents through a free-tier key.

## Usage

```bash
# text stages — free
node scripts/generate-brief.mjs --stage hooks --campaign 002-ritual
# pick a hook by hand in hooks.md, then:
node scripts/generate-brief.mjs --stage brief --campaign 002-ritual
node scripts/generate-brief.mjs --stage shots --campaign 002-ritual

# see exactly what would be sent and what it would cost — free
node scripts/generate-clip.mjs --campaign 002-ritual --shot 01 --dry-run

# generate — paid
node scripts/generate-clip.mjs --campaign 002-ritual --shot 01
```

Every script takes `--dry-run`. `generate-brief.mjs` warns when the company
context files still contain placeholder text.

## Design decisions

**Why a script and not a prompt generator.** Every other generator in this
registry — `podcast-factory`, `youtube-channel-factory`, `book-factory` —
produces a prompt for a human to paste into an external tool. No template calls
an external API with a key. Three options were considered:

| Option | Verdict |
|---|---|
| Prompt-generator only, human pastes into Flow | Matches precedent, zero cost, but the cabinet never actually produces an ad |
| **Script the agent invokes** ✅ | Agents can generate unattended; key stays in `.env.local`; cost ceiling enforceable in code |
| Browser app calling Gemini with a key in `localStorage` | Precedent exists here for `fetch` + `localStorage`, but a key in browser storage is a poor security story for a template shipped to companies |

Chosen: the script, with `video-studio/` kept as a read-only gallery.

**Why no auto-publishing.** Cabinet's model is that anything touching the outside
world waits for human approval. Generating and staging an ad is the right scope;
posting to TikTok is not — and TikTok Ads API access is a separate approval
process measured in weeks. Two human gates are built in: choosing the hook, and
approving the shot list before generation bills.

**Why model IDs are configurable.** Google retires them on a rolling basis.
During development `gemini-2.5-flash` became unavailable to new users and Veo 3 /
Veo 2 were shut down. Both `GEMINI_TEXT_MODEL` and `VEO_MODEL` live in
`.env.example`.

**Why videos are gitignored but prompts are not.** Every save auto-commits in a
Cabinet KB, so MP4s bloat history quickly. `clip-NN.prompt.txt` stays tracked —
generation is non-deterministic, and an output without its prompt cannot be
reviewed or re-run.

**Relationship to `ad-performance`.** That cabinet measures paid media — spend,
CAC, ROAS, memos. This one creates the creative that gets measured. They are
complementary; neither duplicates the other.

## Known constraints

| Constraint | Consequence |
|---|---|
| 8 seconds max per generation | A 24-second ad is three clips. v1 ships single-clip ads |
| 9:16 supported natively | `aspectRatio: "9:16"` — no cropping needed |
| Audio generated natively | No separate TTS step. Always include an audio cue in the prompt |
| Videos deleted after 2 days | The script downloads bytes immediately; never persists a URI |
| SynthID watermark | Every Veo output is watermarked as AI-generated |
| English only evaluated | Other languages may work but are not evaluated. Prompts are English |
| Regional person-generation limits | Restrictions apply in EU/UK/CH/MENA. The template steers toward product-led shots |
| Latency 11s–6min | Job timeout is 1800, not the registry default of 600 |
| One video per request | Five variants means five calls |

## Testing status

**Text pipeline — verified live** against `gemini-3.5-flash-lite`. Hooks generated
from a real brand file, constraint compliance checked, three prompt-level defects
found and documented.

**Video pipeline — called live twice, blocked on billing.**

| Attempt | Response | Meaning |
|---|---|---|
| 1 | `400 — The value type for durationSeconds needs to be a number` | Request malformed. A real bug. |
| 2, after fix | `429 — You exceeded your current quota` | Request valid. Rejected on entitlement alone. |

The first attempt caught a defect the 19-test offline suite had missed: the test
asserted the same incorrect type as the implementation, both from one misreading
of the docs. Fixture-based tests validate internal consistency, not the external
contract — only a live call could find it. Fixed in `lib/veo.mjs` with a
regression test asserting numeric coercion from string config (now 20 tests).

The second attempt proves everything upstream of billing works. Unblocking
requires the $10 prepay top-up described above.

Full record, including raw responses and the defects found:
[`docs/testing-notes.md`](docs/testing-notes.md).

## Layout

```
.cabinet                    manifest
.agents/creative-lead/      hooks, briefs, shot lists, generation
.agents/growth-analyst/     testing queue, weekly learning
.jobs/                      weekly-ad-prep · weekly-creative-review
brand/ product/ audience/   your company context
campaigns/                  one folder per campaign + clips + prompts
campaigns/learnings/        weekly notes from the Growth Analyst
docs/                       testing notes and captured test runs
generators/                 the prompt for each pipeline stage
scripts/                    generate-brief.mjs (free) · generate-clip.mjs (paid)
scripts/lib/                env, gemini, veo — the testable core
scripts/test/               20 offline tests (response shapes inlined)
video-studio/               embedded review gallery
testing-queue.csv           the creative test queue
```

No runtime dependencies — Node 22+ built-ins only.

MIT.
