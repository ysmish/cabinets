const BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';

/** Official per-second pricing, audio included. Source: ai.google.dev/gemini-api/docs/pricing */
export const VEO_PRICING = {
  'veo-3.1-lite-generate-preview': { '720p': 0.05, '1080p': 0.08 },
  'veo-3.1-fast-generate-preview': { '720p': 0.10, '1080p': 0.12, '4k': 0.30 },
  'veo-3.1-generate-preview':      { '720p': 0.40, '1080p': 0.40, '4k': 0.60 },
};

export function estimateCostUsd({ model, resolution, durationSeconds }) {
  const table = VEO_PRICING[model];
  if (!table) throw new Error(`Unknown VEO_MODEL "${model}". Known: ${Object.keys(VEO_PRICING).join(', ')}`);
  const rate = table[resolution];
  if (rate === undefined) {
    throw new Error(`${model} does not support ${resolution}. Supported: ${Object.keys(table).join(', ')}`);
  }
  return Math.round(rate * Number(durationSeconds) * 100) / 100;
}

/**
 * Veo constraints, enforced before spending anything.
 * 1080p and 4k force an 8-second duration; Lite has no 4k tier.
 */
export function validateParams({ model, resolution, durationSeconds, aspectRatio }) {
  const errors = [];
  if (!['4', '6', '8'].includes(String(durationSeconds))) {
    errors.push(`durationSeconds must be 4, 6 or 8 (got ${durationSeconds})`);
  }
  if (!['9:16', '16:9'].includes(aspectRatio)) {
    errors.push(`aspectRatio must be 9:16 or 16:9 (got ${aspectRatio})`);
  }
  if (['1080p', '4k'].includes(resolution) && String(durationSeconds) !== '8') {
    errors.push(`${resolution} requires durationSeconds=8`);
  }
  if (model?.includes('lite') && resolution === '4k') {
    errors.push('Veo 3.1 Lite does not support 4k');
  }
  return errors;
}

export function buildVeoRequest({ prompt, aspectRatio, durationSeconds, resolution }) {
  return {
    instances: [{ prompt }],
    parameters: {
      aspectRatio,
      durationSeconds: String(durationSeconds),
      resolution,
    },
  };
}

export function isOperationDone(op) {
  return op?.done === true;
}

/** The generated video URI lives deep in the completed operation. */
export function extractVideoUri(op) {
  if (!isOperationDone(op)) throw new Error('Operation is not done yet.');
  if (op.error) throw new Error(`Operation failed: ${op.error.message ?? JSON.stringify(op.error)}`);
  const uri = op.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
  if (!uri) {
    throw new Error('Operation done but no video URI — likely blocked by a safety or audio filter (not billed).');
  }
  return uri;
}

/**
 * Pull the fenced Veo prompt out of a shot-list.md section.
 * Sections look like:  ## Shot 01 — 8s — 9:16   ...  **Veo prompt:**  ```...```
 */
export function parseShotPrompt(markdown, shot) {
  const n = String(shot).padStart(2, '0');
  const re = new RegExp(`^##\\s+Shot\\s+0*${Number(shot)}\\b`, 'm');
  const start = markdown.search(re);
  if (start === -1) throw new Error(`Shot ${n} not found in shot-list.md`);
  const rest = markdown.slice(start);
  const nextHeading = rest.slice(1).search(/^##\s+/m);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading + 1);
  const fence = section.match(/```(?:\w+)?\s*\n([\s\S]*?)\n```/);
  if (!fence) throw new Error(`Shot ${n} has no fenced Veo prompt block.`);
  const prompt = fence[1].trim();
  if (!prompt) throw new Error(`Shot ${n} prompt block is empty.`);
  return prompt;
}

export function listShots(markdown) {
  return [...markdown.matchAll(/^##\s+Shot\s+(\d+)/gm)].map(m => m[1].padStart(2, '0'));
}

export async function startGeneration({ apiKey, model, body, fetchImpl = fetch }) {
  const res = await fetchImpl(`${BASE}/models/${model}:predictLongRunning`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(explainVeoError(res.status, data));
  if (!data.name) throw new Error(`No operation name returned: ${JSON.stringify(data)}`);
  return data.name;
}

export async function pollOperation({ apiKey, name, fetchImpl = fetch, intervalMs = 10000,
                                      maxWaitMs = 420000, sleep = ms => new Promise(r => setTimeout(r, ms)),
                                      onTick = () => {} }) {
  const deadline = Date.now() + maxWaitMs;
  let op;
  while (Date.now() < deadline) {
    const res = await fetchImpl(`${BASE}/${name}`, { headers: { 'x-goog-api-key': apiKey } });
    op = await res.json();
    if (!res.ok) throw new Error(explainVeoError(res.status, op));
    if (isOperationDone(op)) return op;
    onTick(Math.round((maxWaitMs - (deadline - Date.now())) / 1000));
    await sleep(intervalMs);
  }
  throw new Error(`Timed out after ${maxWaitMs / 1000}s. Documented max latency is ~6 min at peak.`);
}

export function explainVeoError(status, data) {
  const msg = data?.error?.message ?? JSON.stringify(data);
  if (status === 429 || /prepay|quota|billing/i.test(msg)) {
    return `${msg}\n\n  → Veo is PAID TIER ONLY. There is no free tier for video generation, and\n` +
           `    Google Cloud free-trial credits are excluded from Gemini API usage.\n` +
           `    A $10 minimum prepay top-up unlocks it. See README "Costs and prerequisites".`;
  }
  if (status === 403 || /permission|not.*available/i.test(msg)) {
    return `${msg}\n\n  → Your key's project may not have billing enabled, or VEO_MODEL is retired.`;
  }
  return `Veo API ${status}: ${msg}`;
}
