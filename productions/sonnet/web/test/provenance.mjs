// Provenance audit — see re/CONVENTIONS.md.
//
// Lists every constant-table entry whose comment carries NO evidence of where
// the value came from: no binary address (`[0x418ea4]`, `VA 0x40c721`,
// `sonnet.c:9169`, `0x44bb8000`) and no PINNED/INFERRED/GUESS tag.
//
// It is a REMINDER, NOT A GATE. It cannot tell an honest citation from a
// decorative one; it only tells you which values nobody has vouched for.
//
//   node web/test/provenance.mjs           # untagged entries
//   node web/test/provenance.mjs --all     # every entry with its tag
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILES = [
  '../js/scene7.js', '../js/text.js', '../js/compositor.js', '../js/flare.js',
  '../../work/js/meshgen.mjs', '../../work/js/texgen.mjs', '../../work/js/scene_desc.mjs',
  '../../work/js/camera.mjs',
];

// A citation = a hex address, a decompile line ref, a VA, or an explicit tag.
const CITED = /\[0x[0-9a-f]{4,6}\]|VA\s*0x[0-9a-f]{6}|sonnet\.c:\d+|0x[0-9a-f]{8}|FUN_[0-9a-f]{8}|ndisasm/i;
const TAGGED = /\b(PINNED|INFERRED|GUESS)\b/;

// Only lines that DEFINE a constant: `NAME: <number>,` or `const NAME = <number>`.
const DEF = /^\s*(?:(?:export\s+)?const\s+)?([A-Z][A-Z0-9_]{2,}|[A-Za-z_][A-Za-z0-9_]*)\s*[:=]\s*(-?(?:0x[0-9a-fA-F]+|\d+\.?\d*(?:e-?\d+)?))\s*[,;]?\s*(\/\/.*)?$/;

const all = process.argv.includes('--all');
let total = 0, untagged = 0;
const report = [];

for (const rel of FILES) {
  const file = path.join(here, rel);
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = DEF.exec(lines[i]);
    if (!m) continue;
    const [, name, value, comment] = m;
    // skip trivia: 0, 1, -1, and array indices
    if (['0', '1', '-1', '2'].includes(value)) continue;
    total++;
    // look at the line's own comment plus the two lines above (block comments)
    const ctx = [lines[i - 2], lines[i - 1], lines[i]].filter(Boolean).join('\n');
    const cited = CITED.test(ctx), tag = TAGGED.exec(ctx);
    if (!cited && !tag) {
      untagged++;
      report.push({ file: rel.replace(/^\.\.\//, ''), line: i + 1, name, value });
    } else if (all) {
      report.push({ file: rel.replace(/^\.\.\//, ''), line: i + 1, name, value,
                    tag: tag ? tag[1] : (cited ? 'cited' : '') });
    }
  }
}

for (const r of report) {
  console.log(`${(r.file + ':' + r.line).padEnd(34)} ${r.name.padEnd(24)} ${String(r.value).padEnd(14)} ${r.tag || 'NO PROVENANCE'}`);
}
console.log(`\n${untagged} of ${total} constants carry no address citation and no PINNED/INFERRED/GUESS tag.`);
console.log('Reminder, not a gate — see re/CONVENTIONS.md.');
