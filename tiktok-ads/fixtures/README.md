# Fixtures

Recorded API response shapes. They exist so the Veo code path can be verified
without a paid key — the live call is gated behind a $10 billing minimum, so
correctness is proven offline instead. See `docs/testing-notes.md`.

Run the suite:

```bash
npm test          # or: node --test scripts/test/*.test.mjs
```

| File | What it is | Proves |
|---|---|---|
| `veo-operation-pending.json` | `done: false` | Poll loop keeps waiting |
| `veo-operation-done.json` | Completed, with sample video URI | URI extraction from the nested path |
| `veo-operation-blocked.json` | Done but `generatedSamples: []` | Safety/audio filter handled, not crashed on (not billed) |
| `gemini-text-response.json` | Real 3.5-flash-lite response with `thoughtSignature` | Text extraction ignores the signature |
| `gemini-blocked-response.json` | `promptFeedback.blockReason` | Safety block surfaces clearly |
| `last-request.json` | Written by `--dry-run` | The exact payload that would be sent |
