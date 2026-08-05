import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildVeoRequest, validateParams, estimateCostUsd, parseShotPrompt, listShots,
  isOperationDone, extractVideoUri, pollOperation, explainVeoError,
} from '../lib/veo.mjs';

const root = path.resolve(import.meta.dirname, '../..');
const fx = n => JSON.parse(fs.readFileSync(path.join(root, 'fixtures', n), 'utf8'));

test('request body matches the documented Veo shape', () => {
  const body = buildVeoRequest({
    prompt: 'A steel bottle on a counter', aspectRatio: '9:16',
    durationSeconds: 8, resolution: '720p',
  });
  assert.deepEqual(body, {
    instances: [{ prompt: 'A steel bottle on a counter' }],
    parameters: { aspectRatio: '9:16', durationSeconds: '8', resolution: '720p' },
  });
  assert.equal(typeof body.parameters.durationSeconds, 'string', 'API expects a string');
});

test('cost matches the published price table', () => {
  assert.equal(estimateCostUsd({ model: 'veo-3.1-lite-generate-preview', resolution: '720p', durationSeconds: 8 }), 0.40);
  assert.equal(estimateCostUsd({ model: 'veo-3.1-fast-generate-preview', resolution: '720p', durationSeconds: 8 }), 0.80);
  assert.equal(estimateCostUsd({ model: 'veo-3.1-generate-preview',      resolution: '720p', durationSeconds: 8 }), 3.20);
});

test('unknown model and unsupported resolution are rejected', () => {
  assert.throws(() => estimateCostUsd({ model: 'veo-9', resolution: '720p', durationSeconds: 8 }), /Unknown VEO_MODEL/);
  assert.throws(() => estimateCostUsd({ model: 'veo-3.1-lite-generate-preview', resolution: '4k', durationSeconds: 8 }), /does not support 4k/);
});

test('parameter validation catches the documented constraints', () => {
  const base = { model: 'veo-3.1-fast-generate-preview', resolution: '720p', durationSeconds: '8', aspectRatio: '9:16' };
  assert.deepEqual(validateParams(base), []);
  assert.match(validateParams({ ...base, durationSeconds: '10' })[0], /must be 4, 6 or 8/);
  assert.match(validateParams({ ...base, resolution: '1080p', durationSeconds: '4' })[0], /requires durationSeconds=8/);
  assert.match(validateParams({ ...base, model: 'veo-3.1-lite-generate-preview', resolution: '4k' }).join(), /Lite does not support 4k/);
  assert.match(validateParams({ ...base, aspectRatio: '1:1' })[0], /9:16 or 16:9/);
});

test('pending operation is not done', () => {
  assert.equal(isOperationDone(fx('veo-operation-pending.json')), false);
  assert.throws(() => extractVideoUri(fx('veo-operation-pending.json')), /not done/);
});

test('completed operation yields the video URI', () => {
  const op = fx('veo-operation-done.json');
  assert.equal(isOperationDone(op), true);
  assert.equal(extractVideoUri(op),
    'https://generativelanguage.googleapis.com/v1beta/files/xyz789:download?alt=media');
});

test('done-but-empty operation is reported as filtered, not crashed on', () => {
  assert.throws(() => extractVideoUri(fx('veo-operation-blocked.json')), /safety or audio filter/);
});

test('poll loop stops as soon as done becomes true', async () => {
  const seq = [fx('veo-operation-pending.json'), fx('veo-operation-pending.json'), fx('veo-operation-done.json')];
  let calls = 0, slept = 0;
  const op = await pollOperation({
    apiKey: 'test', name: 'models/x/operations/y',
    fetchImpl: async () => ({ ok: true, json: async () => seq[calls++] }),
    intervalMs: 1, sleep: async () => { slept++; },
  });
  assert.equal(isOperationDone(op), true);
  assert.equal(calls, 3);
  assert.equal(slept, 2, 'should not sleep after the final poll');
});

test('poll loop times out rather than hanging forever', async () => {
  await assert.rejects(pollOperation({
    apiKey: 'test', name: 'models/x/operations/y',
    fetchImpl: async () => ({ ok: true, json: async () => fx('veo-operation-pending.json') }),
    intervalMs: 1, maxWaitMs: 5, sleep: async () => {},
  }), /Timed out/);
});

test('shot prompt is parsed out of the shipped shot list', () => {
  const md = fs.readFileSync(path.join(root, 'campaigns/001-example/shot-list.md'), 'utf8');
  assert.deepEqual(listShots(md), ['01']);
  const prompt = parseShotPrompt(md, '01');
  assert.match(prompt, /steel water bottle/i);
  assert.match(prompt, /Ambient sound/i, 'every prompt must carry an audio cue');
  assert.ok(!prompt.includes('```'));
});

test('missing shot fails loudly instead of generating the wrong thing', () => {
  const md = fs.readFileSync(path.join(root, 'campaigns/001-example/shot-list.md'), 'utf8');
  assert.throws(() => parseShotPrompt(md, '07'), /Shot 07 not found/);
});

test('billing errors explain the paid-tier gate', () => {
  const msg = explainVeoError(429, { error: { message: 'Your prepayment credits are depleted.' } });
  assert.match(msg, /PAID TIER ONLY/);
  assert.match(msg, /free-trial credits are excluded/);
});
