import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractText, stripFences, buildTextRequest, explainError } from '../lib/gemini.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const fx = n => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', n), 'utf8'));

test('extracts text from a real Gemini 3.x response carrying a thoughtSignature', () => {
  const text = extractText(fx('gemini-text-response.json'));
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
  assert.throws(() => extractText(fx('gemini-blocked-response.json')), /SAFETY/);
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
