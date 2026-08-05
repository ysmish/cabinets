---
title: Generators
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [generators, prompts]
order: 5
---
# Generators

Reusable prompts the Creative Lead runs at each stage. They are kept as files
rather than buried in the persona so you can edit them without touching the
agent, and so the same prompt can be run by hand.

| Stage | Generator | Reads | Writes |
|---|---|---|---|
| 1 | [[generators/hook-generator]] | `brand/`, `audience/` | `campaigns/NNN/hooks.md` |
| 2 | [[generators/script-generator]] | chosen hook, `product/` | `campaigns/NNN/brief.md` |
| 3 | [[generators/video-prompt-generator]] | brief, `brand/` | `campaigns/NNN/shot-list.md` |

Stages 1–3 are text only and run on the Gemini free tier. Only the generation
step that follows them costs money.

## A note on this pattern

Other templates in this registry — `podcast-factory`, `youtube-channel-factory`,
`book-factory` — use generators that produce a prompt for a human to paste into
an external tool. This cabinet does that for the *text* stages and then goes one
step further: `scripts/generate-clip.mjs` calls the Gemini API directly with your
key. See the README for why, and for what that trade-off costs.
