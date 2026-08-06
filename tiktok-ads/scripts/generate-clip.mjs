#!/usr/bin/env node
/**
 * generate-clip.mjs — generate one 9:16 TikTok clip with Veo. PAID TIER ONLY.
 *
 *   node scripts/generate-clip.mjs --campaign 001-example --shot 01 --dry-run
 *   node scripts/generate-clip.mjs --campaign 001-example --shot 01
 *   node scripts/generate-clip.mjs --campaign 001-example --all --yes
 *
 * --dry-run  build and print the exact request, write it to the campaign folder,
 *            and exit. Costs nothing. Run this first, always.
 * --yes      skip the cost confirmation prompt (for scripted runs)
 * --all      every shot in the shot list, up to VEO_MAX_CLIPS_PER_RUN
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { loadEnv, requireKey, findCabinetRoot, parseArgs } from './lib/env.mjs';
import {
  buildVeoRequest, validateParams, estimateCostUsd, parseShotPrompt, listShots,
  startGeneration, pollOperation, extractVideoUri,
} from './lib/veo.mjs';

const args = parseArgs(process.argv.slice(2));
const root = findCabinetRoot(process.cwd());
loadEnv(root);

const campaign = args.campaign;
if (!campaign || (!args.shot && !args.all)) {
  console.error('Usage: generate-clip.mjs --campaign <slug> (--shot NN | --all) [--dry-run] [--yes]');
  process.exit(1);
}

const cfg = {
  model:           process.env.VEO_MODEL || 'veo-3.1-lite-generate-preview',
  resolution:      process.env.VEO_RESOLUTION || '720p',
  durationSeconds: process.env.VEO_DURATION_SECONDS || '8',
  aspectRatio:     '9:16',
  maxClips:        Number(process.env.VEO_MAX_CLIPS_PER_RUN || 3),
};

const problems = validateParams(cfg);
if (problems.length) {
  console.error('Invalid Veo parameters:\n' + problems.map(p => `  - ${p}`).join('\n'));
  process.exit(1);
}

const campaignDir = path.join(root, 'campaigns', campaign);
const shotListPath = path.join(campaignDir, 'shot-list.md');
if (!fs.existsSync(shotListPath)) {
  console.error(`No shot list at campaigns/${campaign}/shot-list.md\n` +
                `Run: node scripts/generate-brief.mjs --stage shots --campaign ${campaign}`);
  process.exit(1);
}
const shotList = fs.readFileSync(shotListPath, 'utf8');

let shots = args.all ? listShots(shotList) : [String(args.shot).padStart(2, '0')];
if (shots.length === 0) { console.error('No "## Shot NN" sections found.'); process.exit(1); }
if (shots.length > cfg.maxClips) {
  console.warn(`⚠️  ${shots.length} shots requested, VEO_MAX_CLIPS_PER_RUN=${cfg.maxClips}. Truncating.`);
  shots = shots.slice(0, cfg.maxClips);
}

const perClip = estimateCostUsd(cfg);
const total = Math.round(perClip * shots.length * 100) / 100;

console.log(`Campaign : ${campaign}`);
console.log(`Shots    : ${shots.join(', ')}`);
console.log(`Model    : ${cfg.model}  ${cfg.resolution}  ${cfg.durationSeconds}s  ${cfg.aspectRatio}`);
console.log(`Cost     : $${perClip.toFixed(2)} per clip → $${total.toFixed(2)} total\n`);

// --- dry run ---------------------------------------------------------------
if (args['dry-run']) {
  const preview = shots.map(shot => ({
    shot,
    endpoint: `POST /v1beta/models/${cfg.model}:predictLongRunning`,
    body: buildVeoRequest({ ...cfg, prompt: parseShotPrompt(shotList, shot) }),
  }));
  const out = path.join(campaignDir, 'last-request.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({ estimatedCostUsd: total, requests: preview }, null, 2) + '\n');
  console.log(JSON.stringify(preview, null, 2));
  console.log(`\n✓ Dry run. Nothing sent, nothing billed. Written to campaigns/${campaign}/last-request.json`);
  process.exit(0);
}

// --- confirm ---------------------------------------------------------------
if (!args.yes) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`This will bill approximately $${total.toFixed(2)}. Continue? [y/N] `);
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) { console.log('Aborted.'); process.exit(0); }
}

const apiKey = requireKey();

for (const shot of shots) {
  const prompt = parseShotPrompt(shotList, shot);
  console.log(`\n── Shot ${shot} ──`);
  console.log(prompt.slice(0, 120).replace(/\s+/g, ' ') + (prompt.length > 120 ? '…' : ''));

  const name = await startGeneration({
    apiKey, model: cfg.model, body: buildVeoRequest({ ...cfg, prompt }),
  });
  console.log(`operation: ${name}`);

  const op = await pollOperation({
    apiKey, name,
    onTick: s => process.stdout.write(`\r  waiting ${s}s…   `),
  });
  process.stdout.write('\r');

  const uri = extractVideoUri(op);

  // Videos are deleted server-side after 2 days — download the bytes now, never
  // persist the URI as the artifact.
  const res = await fetch(uri, { headers: { 'x-goog-api-key': apiKey }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const mp4 = path.join(campaignDir, `clip-${shot}.mp4`);
  fs.writeFileSync(mp4, Buffer.from(await res.arrayBuffer()));

  // Generation is non-deterministic; an output without its prompt is not reviewable.
  fs.writeFileSync(path.join(campaignDir, `clip-${shot}.prompt.txt`),
    [`model: ${cfg.model}`, `resolution: ${cfg.resolution}`,
     `duration: ${cfg.durationSeconds}s`, `aspect: ${cfg.aspectRatio}`,
     `generated: ${new Date().toISOString()}`, `cost_usd: ${perClip.toFixed(2)}`,
     '', prompt, ''].join('\n'));

  const kb = Math.round(fs.statSync(mp4).size / 1024);
  console.log(`✓ campaigns/${campaign}/clip-${shot}.mp4  (${kb} KB)`);
}

console.log(`\nDone. Billed approximately $${total.toFixed(2)}.`);
console.log(`Add these clips to testing-queue.csv, then review in video-studio/.`);
