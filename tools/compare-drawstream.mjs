#!/usr/bin/env node
// compare-drawstream.mjs — diff two draw streams, draw for draw.
//
// MODE:       REPORT — prints the per-draw comparison. Exits 1 only when the two
//             streams cannot be compared at all (missing, empty, partial, or a
//             different API), never because they disagree. A disagreement is the
//             finding; refusing to compare is a failure.
// OBSERVABLE: primitive type, vertex count and stride per draw, then vertex-data
//             digest, then the state in force — paired by SUBMISSION ORDER.
// UNITS:      counts are vertices, never triangles. `stride` is bytes.
//
//   node tools/compare-drawstream.mjs <a.jsonl> <b.jsonl> [--limit N] [--state]
//
// Reads tools/DRAWSTREAM.md envelopes and nothing else, so it does not care which
// machine produced either side — a browser wrapping MiniD3D8, or an x86 emulator
// running the original.
//
// PAIRING IS BY ORDER, NEVER BY COUNT. From tools/winebox/compare-draws.mjs: with
// three clips live, two different effects both submitted 4719 vertices, and
// pairing on that cost three wrong fixes and a -0.14 regression. A vertex count
// is not an identity. The Nth draw is the Nth draw, and where the two sides stop
// lining up, THAT is the answer — so the first divergence is reported loudly
// rather than being averaged into a similarity score.
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
// Positional args are what is left after each option AND ITS VALUE is removed.
// Filtering on a leading `--` alone counts the value of `--limit 12` as a third
// file, which reports a usage error for a command line that is correct.
const VALUE_OPTS = new Set(['limit']);
const files = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) { if (VALUE_OPTS.has(a.slice(2))) i++; continue; }
  files.push(a);
}
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]) ?? true;
};
if (files.length !== 2) {
  console.error('usage: compare-drawstream.mjs <a.jsonl> <b.jsonl> [--limit N] [--state]');
  process.exit(2);
}
const LIMIT = Number(opt('limit', 20));
const SHOW_STATE = argv.includes('--state');

const load = (f) => {
  const line = readFileSync(f, 'utf8').split('\n').find((l) => l.trim());
  if (!line) throw new Error(`${f} is empty`);
  return JSON.parse(line);
};
const [A, B] = files.map(load);

// REFUSE A MISMATCHED API rather than paper over it (DRAWSTREAM.md). Mapping one
// API's state onto another's is a translation, and a translation's bugs arrive
// looking exactly like findings about the port.
if (A.api?.name !== B.api?.name || A.api?.version !== B.api?.version) {
  console.error(`refusing to compare ${JSON.stringify(A.api)} against ${JSON.stringify(B.api)}`);
  console.error('these are different APIs; a diff between them would be a diff of the');
  console.error('translation, not of the demo.');
  process.exit(1);
}
for (const [f, r] of [[files[0], A], [files[1], B]]) {
  if (r.partial) {
    console.error(`${f} is a PARTIAL frame (${r.partial.drawsBefore} draws, stopped: ` +
                  `${r.partial.error}). A truncated frame is not a short frame, so it`);
    console.error('is not comparable. Fix the recorder before reading anything into this.');
    process.exit(1);
  }
  if (!r.draws?.length) { console.error(`${f} has no draws`); process.exit(1); }
}

const label = (r, f) => `${r.side ?? '?'} (${f.split('/').pop()})`;
console.log(`A = ${label(A, files[0])}   ${A.draws.length} draws, ` +
            `${A.draws.reduce((n, d) => n + d.vertexCount, 0)} vertices`);
console.log(`B = ${label(B, files[1])}   ${B.draws.length} draws, ` +
            `${B.draws.reduce((n, d) => n + d.vertexCount, 0)} vertices`);
console.log(`A at ${JSON.stringify(A.at)}`);
console.log(`B at ${JSON.stringify(B.at)}`);
console.log();

// The shape of a draw, WITHOUT identity that cannot line up across recorders.
// Texture ids are creation-order on both sides and their pools differ, so they
// are reported but never used to decide agreement — a difference there would be
// an artefact of numbering rather than of the demo.
const shape = (d) => `${d.prim}:${d.vertexCount}:${d.stride}`;

let firstDiff = -1;
const rows = [];
const n = Math.max(A.draws.length, B.draws.length);
for (let i = 0; i < n; i++) {
  const a = A.draws[i], b = B.draws[i];
  const sa = a ? shape(a) : '(none)', sb = b ? shape(b) : '(none)';
  const same = sa === sb;
  if (!same && firstDiff < 0) firstDiff = i;
  const vsame = a?.vertsDigest && b?.vertsDigest ? a.vertsDigest === b.vertsDigest : null;
  rows.push({ i, sa, sb, same, vsame,
              ta: a ? JSON.stringify(a.textures) : '-',
              tb: b ? JSON.stringify(b.textures) : '-' });
}

const agree = rows.filter((r) => r.same).length;
const vboth = rows.filter((r) => r.vsame !== null);
const vagree = vboth.filter((r) => r.vsame).length;

console.log(`shape agreement (prim:vertexCount:stride): ${agree}/${n}`);
if (vboth.length) {
  console.log(`vertex-data agreement: ${vagree}/${vboth.length}` +
              (vagree === vboth.length ? '' : '   (--verts on both sides to compare bytes)'));
}
console.log(firstDiff < 0
  ? '\nno shape divergence — every draw pairs'
  : `\nFIRST SHAPE DIVERGENCE AT DRAW ${firstDiff}. Everything before it pairs, which is\n` +
    'what makes this an address rather than a score: the frame is identical up to\n' +
    'here and the demo takes a different turn at this draw.');
console.log();

const show = firstDiff < 0 ? rows.slice(0, LIMIT)
  : rows.slice(Math.max(0, firstDiff - 3), Math.max(0, firstDiff - 3) + LIMIT);
console.log('  draw  A shape              B shape              verts  A tex / B tex');
for (const r of show) {
  const mark = r.same ? (r.vsame === false ? ' ~' : '  ') : ' *';
  const v = r.vsame === null ? ' - ' : r.vsame ? ' = ' : ' X ';
  console.log(`${mark}${String(r.i).padStart(5)}  ${r.sa.padEnd(20)} ${r.sb.padEnd(20)} ` +
              `${v}   ${r.ta} / ${r.tb}`);
}
console.log('\n  * shape differs   ~ same shape, different vertex bytes   = bytes equal');

if (SHOW_STATE && firstDiff >= 0) {
  const a = A.draws[firstDiff], b = B.draws[firstDiff];
  console.log(`\nstate at draw ${firstDiff}:`);
  for (const k of ['state', 'tss', 'xform']) {
    console.log(`  ${k}:`);
    console.log(`    A ${JSON.stringify(a?.[k])?.slice(0, 300)}`);
    console.log(`    B ${JSON.stringify(b?.[k])?.slice(0, 300)}`);
  }
}
