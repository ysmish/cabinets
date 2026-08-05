# Fixtures

Recorded API response shapes, used to unit-test `generate-clip.mjs` offline.

The polling and download logic can be verified without a paid key by replaying
`veo-operation-done.json` — which matters because the live call is gated behind
billing. See `docs/testing-notes.md` for what has and has not been run live.

| File | What it is |
|---|---|
| `veo-operation-pending.json` | Operation response with `done: false` |
| `veo-operation-done.json` | Completed operation, including the sample video URI |
| `last-request.json` | Written by `--dry-run`; the exact payload that would be sent |
