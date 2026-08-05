#!/usr/bin/env node
/**
 * generate-brief.mjs — text stages via the Gemini API. FREE TIER.
 *
 *   node scripts/generate-brief.mjs --stage hooks --campaign 001-example
 *   node scripts/generate-brief.mjs --stage brief --campaign 001-example
 *   node scripts/generate-brief.mjs --stage shots --campaign 001-example
 *
 *   --dry-run   print the assembled prompt and exit without calling the API
 *   --stdout    print the result instead of writing the file
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadEnv, requireKey, findCabinetRoot, parseArgs } from './lib/env.mjs';
import { callGemini } from './lib/gemini.mjs';

const STAGES = {
  hooks: { generator: 'hook-generator.md',         out: 'hooks.md',      needs: [] },
  brief: { generator: 'script-generator.md',       out: 'brief.md',      needs: ['hooks.md'] },
  shots: { generator: 'video-prompt-generator.md', out: 'shot-list.md',  needs: ['brief.md'] },
};

const CONTEXT = ['brand/index.md', 'product/index.md', 'audience/index.md'];
const PLACEHOLDER = /Replace (?:everything below |)with your own/i;

const args = parseArgs(process.argv.slice(2));
const root = findCabinetRoot(process.cwd());
loadEnv(root);

const stage = args.stage;
const campaign = args.campaign;
if (!STAGES[stage] || !campaign) {
  console.error(`Usage: generate-brief.mjs --stage <${Object.keys(STAGES).join('|')}> --campaign <slug> [--dry-run] [--stdout]`);
  process.exit(1);
}

const spec = STAGES[stage];
const campaignDir = path.join(root, 'campaigns', campaign);
fs.mkdirSync(campaignDir, { recursive: true });

// --- company context -------------------------------------------------------
const context = [];
const placeholders = [];
for (const rel of CONTEXT) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) { placeholders.push(`${rel} (missing)`); continue; }
  const body = fs.readFileSync(p, 'utf8');
  if (PLACEHOLDER.test(body)) placeholders.push(rel);
  context.push(`===== ${rel} =====\n${body}`);
}
if (placeholders.length) {
  console.warn(`⚠️  Still placeholder content: ${placeholders.join(', ')}`);
  console.warn('   Output will be generic. Fill these in for grounded ads.\n');
}

// --- prior stage outputs ---------------------------------------------------
for (const need of spec.needs) {
  const p = path.join(campaignDir, need);
  if (!fs.existsSync(p)) {
    console.error(`Missing prerequisite: campaigns/${campaign}/${need}\n` +
                  `Run the earlier stage first.`);
    process.exit(1);
  }
  context.push(`===== campaigns/${campaign}/${need} =====\n${fs.readFileSync(p, 'utf8')}`);
}

// --- generator prompt ------------------------------------------------------
const genPath = path.join(root, 'generators', spec.generator);
const genDoc = fs.readFileSync(genPath, 'utf8');
const fence = genDoc.match(/```\s*\n([\s\S]*?)\n```/);
if (!fence) { console.error(`No fenced prompt block in generators/${spec.generator}`); process.exit(1); }
const instruction = fence[1].replace(/\{campaign\}/g, campaign);

const prompt = [
  'You are working inside a Cabinet knowledge base. Company context follows.',
  '',
  ...context,
  '',
  '===== YOUR TASK =====',
  instruction,
  '',
  'Return ONLY the markdown file contents. No preamble, no code fences.',
].join('\n');

const model = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite';
const outPath = path.join(campaignDir, spec.out);

if (args['dry-run']) {
  console.log(`--- model: ${model}`);
  console.log(`--- would write: campaigns/${campaign}/${spec.out}`);
  console.log(`--- prompt (${prompt.length} chars) ---\n`);
  console.log(prompt);
  process.exit(0);
}

const apiKey = requireKey();
console.log(`Generating ${stage} for ${campaign} with ${model}...`);
const text = await callGemini({ apiKey, model, prompt });

if (args.stdout) { console.log(text); process.exit(0); }

fs.writeFileSync(outPath, text.endsWith('\n') ? text : text + '\n');
console.log(`✓ Wrote campaigns/${campaign}/${spec.out} (${text.length} chars)`);
if (stage === 'hooks') console.log('  Next: pick a hook by hand, then --stage brief');
if (stage === 'shots') console.log('  Next: review, then scripts/generate-clip.mjs --dry-run');
