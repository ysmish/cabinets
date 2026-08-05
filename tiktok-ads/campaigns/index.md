---
title: Campaigns
created: '2026-08-05T00:00:00Z'
modified: '2026-08-05T00:00:00Z'
tags: [campaigns, ads]
order: 4
---
# Campaigns

One folder per campaign, numbered. Each contains the brief, the hooks, the shot
list, and the generated clips with the exact prompt used for each.

```
campaigns/
  001-example/          <- worked example, safe to delete
    brief.md
    hooks.md
    shot-list.md
    clip-NN.mp4
    clip-NN.prompt.txt
  learnings/            <- weekly notes from the Growth Analyst
```

Generation is non-deterministic — the same prompt produces different video every
time. That is why `clip-NN.prompt.txt` sits next to every clip: without it, an
output cannot be reviewed or re-run.
