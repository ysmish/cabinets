const BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Extract text from a generateContent response.
 *
 * Gemini 3.x returns a `thoughtSignature` alongside the text inside the same
 * part, and may return several parts. Reaching for `parts[0]` as if it were a
 * string is the standard way to break this — so join every part that actually
 * carries text and ignore the rest.
 */
export function extractText(data) {
  const cand = data?.candidates?.[0];
  if (!cand) {
    const reason = data?.promptFeedback?.blockReason;
    throw new Error(reason ? `Blocked by safety filter: ${reason}` : 'No candidates in response.');
  }
  const parts = cand.content?.parts ?? [];
  const text = parts.map(p => (typeof p?.text === 'string' ? p.text : '')).join('').trim();
  if (!text) throw new Error(`Empty text (finishReason=${cand.finishReason ?? 'unknown'}).`);
  return text;
}

/** Strip ```markdown fences the model sometimes wraps output in. */
export function stripFences(text) {
  const m = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```\s*$/);
  return m ? m[1].trim() : text.trim();
}

export function buildTextRequest(prompt) {
  return { contents: [{ parts: [{ text: prompt }] }] };
}

export async function callGemini({ apiKey, model, prompt, fetchImpl = fetch }) {
  const res = await fetchImpl(`${BASE}/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildTextRequest(prompt)),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(explainError(res.status, data));
  return stripFences(extractText(data));
}

export function explainError(status, data) {
  const msg = data?.error?.message ?? JSON.stringify(data);
  if (status === 429 && /prepay/i.test(msg)) {
    return `${msg}\n\n  → Prepay balance is $0. See README "Costs and prerequisites".`;
  }
  if (status === 404 && /no longer available/i.test(msg)) {
    return `${msg}\n\n  → That model ID was retired. Update GEMINI_TEXT_MODEL in .env.local.\n` +
           `     List available models:\n` +
           `     curl -s "${BASE}/models" -H "x-goog-api-key: $GEMINI_API_KEY" | grep '"name"'`;
  }
  return `Gemini API ${status}: ${msg}`;
}
