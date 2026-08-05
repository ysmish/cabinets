---
title: Video Prompt Generator
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [generator, veo, prompts]
order: 3
---
# Video Prompt Generator

> Stage 3. Free — text only. **The output of this stage is what costs money to run.**

Turns the brief into a shot list where every shot carries a complete Veo prompt.

## What Veo needs in a prompt

| Element | Required | Note |
|---|---|---|
| Subject | Yes | The thing on screen |
| Action | Yes | What it does across 8 seconds |
| Style | Yes | Film style keywords; steers the whole look |
| Camera | Recommended | Push in, dolly, eye level, top-down |
| Composition | Recommended | Wide, close-up, macro |
| Ambiance | Recommended | Light and colour |
| Audio cue | Yes | Audio is generated natively — omitting it wastes a channel |

Dialogue goes in quotes. Sound effects are described explicitly. Ambient noise is
described as a soundscape.

## Prompt

```
You are the Creative Lead. Read campaigns/{campaign}/brief.md and the "Visual
identity" section of brand/index.md.

Write the shot list. One section per shot, each exactly one 8-second beat.

For every shot output:
  - Beat: what happens, one line
  - On-screen text: the overlay, or "none"
  - Veo prompt: a single paragraph containing subject, action, style, camera
    movement, composition, ambiance, and an explicit audio cue
  - Parameters: aspectRatio 9:16, durationSeconds 8, resolution 720p

Rules:
  - Every shot must stand alone. Veo has no memory between generations, so a
    shot that only makes sense as a continuation will not work.
  - Inherit the visual identity from brand/index.md across all shots. Do not
    redesign the look per shot.
  - Write prompts in English. Other languages are not evaluated by the model.
  - Avoid depicting identifiable people. Regional restrictions apply to person
    generation, and product-led shots are more reliable for ads regardless.

Write to campaigns/{campaign}/shot-list.md. Output nothing else.
```

## Run it

```bash
node scripts/generate-brief.mjs --stage shots --campaign 001-example
```

Then, and only then, generate video — one clip first, reviewed by a human, before
any batch.
