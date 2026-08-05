#!/usr/bin/env node
/**
 * generate-clip.mjs — generate one 9:16 TikTok clip with Veo via the Gemini API.
 *
 * STATUS: skeleton. Implemented in Phase E.
 *
 * ⚠️  PAID TIER ONLY. Veo has no free tier at any level, and Google Cloud
 *     free-trial credits are excluded from Gemini API usage as of March 2026.
 *     Run with --dry-run first; it costs nothing and prints the exact payload.
 *
 * Usage:
 *   node scripts/generate-clip.mjs --campaign 001-example --shot 01 --dry-run
 *   node scripts/generate-clip.mjs --campaign 001-example --shot 01
 *
 * Implementation notes for Phase E:
 *
 *  1. REQUEST
 *     POST /v1beta/models/${VEO_MODEL}:predictLongRunning
 *     Header: x-goog-api-key
 *     Body: {
 *       instances:  [{ prompt }],
 *       parameters: { aspectRatio: "9:16", durationSeconds: "8", resolution: "720p" }
 *     }
 *     Returns an operation NAME, not a video.
 *
 *  2. POLL
 *     GET /v1beta/{operationName} until .done === true.
 *     Latency is 11 seconds to 6 minutes. Poll every 10s, cap the total wait.
 *
 *  3. DOWNLOAD IMMEDIATELY  ← the trap
 *     URI at response.generateVideoResponse.generatedSamples[0].video.uri
 *     Generated videos are deleted server-side after 2 days. Persisting the URI
 *     instead of the bytes produces a gallery that breaks silently later.
 *     Fetch with the API key header and follow redirects.
 *
 *  4. WRITE
 *     campaigns/<campaign>/clip-<shot>.mp4
 *     campaigns/<campaign>/clip-<shot>.prompt.txt   <- exact prompt used
 *     Generation is non-deterministic; without the prompt the output is not
 *     reviewable or re-runnable.
 *
 *  5. GUARDS
 *     - Refuse to exceed VEO_MAX_CLIPS_PER_RUN
 *     - Print the estimated cost before the call and require confirmation
 *       unless --yes is passed
 *     - --dry-run writes the payload to fixtures/last-request.json and exits
 *     - Fail clearly on 429 / permission errors with a pointer to the README
 *       "Costs and prerequisites" section
 */

console.error('Not implemented yet — Phase E. See the header for the plan.');
process.exit(1);
