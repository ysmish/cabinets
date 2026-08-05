import fs from 'node:fs';
import path from 'node:path';

/** Minimal .env loader — no dependencies. Real env vars win over the file. */
export function loadEnv(cabinetRoot) {
  for (const name of ['.env.local', '.env']) {
    const p = path.join(cabinetRoot, name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i === -1) continue;
      const k = t.slice(0, i).trim();
      const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (!(k in process.env)) process.env[k] = v;
    }
  }
  return process.env;
}

export function requireKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is not set.\n' +
      '  cp .env.example .env.local  and add your key from https://aistudio.google.com/apikey'
    );
  }
  return key;
}

/** Walk up from a start dir until we find the .cabinet manifest. */
export function findCabinetRoot(start) {
  let dir = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(dir, '.cabinet'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Not inside a cabinet (no .cabinet found walking up).');
    dir = parent;
  }
}

/** Tiny argv parser: --flag, --key value, --key=value */
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq !== -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) { out[a.slice(2)] = next; i++; }
    else out[a.slice(2)] = true;
  }
  return out;
}
