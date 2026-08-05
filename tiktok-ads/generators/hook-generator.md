---
title: Hook Generator
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [generator, hooks]
order: 1
---
# Hook Generator

> Stage 1. Free — text only.

The first two seconds decide whether the ad is watched. Everything else is
downstream of the hook, so this is the stage worth iterating on.

## Prompt

```
You are the Creative Lead. Read brand/index.md and audience/index.md in full
before writing.

Write 5 TikTok ad hooks for {product}.

Hard rules:
  - Maximum 12 words each. Not approximately — maximum.
  - Five DIFFERENT angles, not five phrasings of one idea. Use: problem-first,
    ritual/habit, contrarian, objection-handling, demonstration.
  - Obey every constraint in the "Voice" and "Never mention" sections of
    brand/index.md literally.
  - Every claim must be traceable to "Proof points". Invent nothing.
  - Each hook must fail the swap test: if it still works with a competitor's
    product substituted, it is too generic. Rewrite it.

  - Each hook may reference at most one proof point. Across the five, use at
    least three different proof points.

Output a markdown table with columns: #, Angle, Hook, Chosen (leave blank).
Then one sentence recommending which to test first and why.
Write the result to campaigns/{campaign}/hooks.md. Output nothing else.
```

## Run it

```bash
node scripts/generate-brief.mjs --stage hooks --campaign 001-example
```

A human marks the chosen hook before stage 2. This is deliberate — it is the
cheapest gate in the pipeline and it is placed before anything bills.
