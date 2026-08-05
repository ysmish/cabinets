---
title: TikTok Ads
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [marketing, video, tiktok, ads, gemini, veo, cabinet]
order: 1
---
# TikTok Ads

Turn the files you already have about your company into TikTok ads: hooks, scripts,
generated 9:16 video, and a creative testing queue. Bring your own Google Gemini
API key. Nothing publishes anywhere — every ad waits for a human.

> **Keep your TikTok Ads Manager and your editor. Replace the blank page, the
> "can someone write five hooks by Thursday" Slack thread, and the production
> meeting that has to happen before anything can be tested.**

## The team

- **[[.agents/creative-lead]]** — Creative Lead. Reads the company context files,
  writes hooks and briefs, turns an approved hook into a shot list with a
  Veo-ready prompt per shot.
- **[[.agents/growth-analyst]]** — Growth Analyst. Owns the testing queue, keeps
  the angles distinct, and writes the weekly learning note.

## Recurring rhythm

| Cadence | Job | Owner | Output |
|---|---|---|---|
| **Weekly** (Mon 10:00) | [[.jobs/weekly-creative-review]] | Growth Analyst | Learning note in `campaigns/learnings/weekly-<date>.md` |

Ad creation itself runs on demand, not on a schedule — video generation costs
money per call, so it should be something a person asks for.

## How it works

1. **Fill in your company context** — [[brand/index]], [[product/index]],
   [[audience/index]]. These are the "files that already exist about the company";
   everything downstream is grounded in them.
2. **Creative Lead writes hooks** from those files — five angles, twelve words each.
3. **You pick one.** This is the first human gate.
4. **Creative Lead writes the shot list** — one 8-second beat per shot, each with
   a full Veo prompt.
5. **Generate** — `scripts/generate-clip.mjs` calls the Gemini API and writes the
   MP4 into the campaign folder alongside the exact prompt used.
6. **Review in [[video-studio/index|the video studio]]**, then add the winner to
   `testing-queue.csv`.
7. **Weekly**, the Growth Analyst reads the queue and writes what was learned.

## Why this template

- Shows how a cabinet can call an external paid API from an agent workflow, with
  a cost ceiling and a human approval gate, rather than only generating prompts
  for a human to paste elsewhere.
- Demonstrates the company-context pattern: structured markdown that several
  agents read as shared ground truth.
- Pairs with [ad-performance](../ad-performance), which measures paid media.
  This one creates it.

## Before you generate anything

Video generation is **paid tier only** on the Gemini API — there is no free tier
for Veo at any level, and Google Cloud free-trial credits are explicitly excluded
from Gemini API usage as of March 2026. Text generation (hooks, briefs, prompts)
works on the free tier. See the README for the full cost table.
