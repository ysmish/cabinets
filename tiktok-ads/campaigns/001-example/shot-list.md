---
title: 001 Example — Shot List
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [campaign, shot-list, veo]
order: 3
---
# Shot List — 001 Example

One section per shot. Veo generates a maximum of 8 seconds per call, so each
shot must work as a self-contained visual. A 24-second ad is three shots and
three generations.

---

## Shot 01 — 8s — 9:16

**Beat:** the hook lands over a single unbroken image.

**On-screen text:** Your last four bottles are in a landfill

**Veo prompt:**

```
A single matte steel water bottle standing on a bare kitchen counter in cold
early morning light. Slow push in, eye level, shallow depth of field. The
background is an out-of-focus domestic kitchen, muted palette of steel and
off-white. Realistic, unglamorous, documentary style — not a commercial.
Ambient sound: a quiet room, distant traffic, no music.
```

**Parameters:** `aspectRatio: 9:16` · `durationSeconds: 8` · `resolution: 720p`
· model from `VEO_MODEL`

**Generate:**

```bash
node scripts/generate-clip.mjs \
  --campaign 001-example \
  --shot 01 \
  --prompt-file campaigns/001-example/shot-list.md
```

---

> **Prompt structure.** Veo responds to subject, action, style, camera movement,
> composition, and ambiance. Audio is generated natively, so an explicit audio
> cue is worth including in every prompt — omitting it wastes a channel rather
> than producing silence.
