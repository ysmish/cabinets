import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractText, stripFences, buildTextRequest, explainError } from '../lib/gemini.mjs';

/**
 * Captured verbatim from a live gemini-3.5-flash-lite call on 2026-08-05.
 * The thoughtSignature is real — Gemini 3.x returns it inside the same part as
 * the text, and code that treats parts[0] as a string leaks it into output.
 */
const TEXT_RESPONSE = {
  candidates: [
    {
      content: {
        parts: [
          {
            text: '| # | Angle | Hook |\n|---|---|---|\n| 1 | Problem-first | Your last four bottles are in a landfill |',
            thoughtSignature: 'EjQKMgERTTIP36yXkkLZHwFT57iXvwZius0jZSKxA2u6d6o27ToweYAIi8vNGGF9THd7lW/p',
          },
        ],
        role: 'model',
      },
      finishReason: 'STOP',
      index: 0,
    },
  ],
  usageMetadata: { promptTokenCount: 812, candidatesTokenCount: 44, totalTokenCount: 856 },
  modelVersion: 'gemini-3.5-flash-lite',
};

/** Prompt rejected before generation — no candidates at all. */
const BLOCKED_RESPONSE = {
  promptFeedback: { blockReason: 'SAFETY' },
  modelVersion: 'gemini-3.5-flash-lite',
};

test('extracts text from a real Gemini 3.x response carrying a thoughtSignature', () => {
  const text = extractText(TEXT_RESPONSE);
  assert.match(text, /Problem-first/);
  assert.ok(!text.includes('thoughtSignature'), 'signature must not leak into output');
});

test('joins multiple parts instead of assuming parts[0]', () => {
  const text = extractText({
    candidates: [{ content: { parts: [{ text: 'one ' }, { thoughtSignature: 'x' }, { text: 'two' }] }, finishReason: 'STOP' }],
  });
  assert.equal(text, 'one two');
});

test('safety block is reported clearly', () => {
  assert.throws(() => extractText(BLOCKED_RESPONSE), /SAFETY/);
});

test('empty candidate text throws with the finish reason', () => {
  assert.throws(
    () => extractText({ candidates: [{ content: { parts: [] }, finishReason: 'MAX_TOKENS' }] }),
    /MAX_TOKENS/,
  );
});

test('markdown fences are stripped', () => {
  assert.equal(stripFences('```markdown\n# Hooks\n```'), '# Hooks');
  assert.equal(stripFences('# Hooks'), '# Hooks');
});

test('request shape matches the documented API', () => {
  assert.deepEqual(buildTextRequest('hi'), { contents: [{ parts: [{ text: 'hi' }] }] });
});

test('retired model error points at the fix', () => {
  const msg = explainError(404, { error: { message: 'This model is no longer available to new users.' } });
  assert.match(msg, /GEMINI_TEXT_MODEL/);
});
