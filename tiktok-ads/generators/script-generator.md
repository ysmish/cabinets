---
title: Script Generator
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [generator, script, brief]
order: 2
---
# Script Generator

> Stage 2. Free — text only.

Expands the chosen hook into a brief: the single idea, the beats, and the
failure condition.

## Prompt

```
You are the Creative Lead. Read the chosen hook in campaigns/{campaign}/hooks.md,
plus brand/index.md, product/index.md, and audience/index.md.

Write the brief for this ad.

Requirements:
  - ONE idea. If the brief contains two claims, cut one.
  - Structure the ad as 8-second beats. Veo generates 8 seconds per call, so
    state explicitly how many clips this ad requires.
  - Prefer features marked "Visual: Yes" in product/index.md. Features that need
    explaining belong in a text overlay, not in the footage.
  - State the CTA and where it appears.
  - End with "What would make this a failure" — the specific way this ad could
    come out generic.

Output the brief as a markdown table of fields followed by those sections.
Write to campaigns/{campaign}/brief.md. Output nothing else.
```

## Run it

```bash
node scripts/generate-brief.mjs --stage brief --campaign 001-example
```
