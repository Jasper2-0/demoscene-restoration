// scenecheck.mjs — the scene-stream decoder, against the node list the
// original built.
//
//   node work/re/scenecheck.mjs flat/ out/arena.json
//
// The JavaScript twin of `scenegram.py`, and the one that matters: the page
// needs this decoder, not the Python one. Both walk the same grammar and both
// are checked against the same oracle, so a divergence between them is caught
// as a divergence from the original rather than going unnoticed.
//
// THE OPCODE SEQUENCE ALONE WOULD BE A WEAK CHECK. A wrong operand width
// desynchronises the walk, and a desynchronised walk usually still produces
// SOME opcode sequence — the old grammar produced one for every stream and it
// was wrong everywhere. So this compares the clip flag, `node+0x0d`, both flag
// bytes and the keyframe count on every node, and asserts the text nodes decode
// to printable strings, which no field comparison can substitute for.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeScene } from '../../web/js/scene.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const file = process.argv[3] ?? path.join(HERE, 'out', 'arena.json');
// anim_all.json carries the keyframe TRACKS the decoder now produces values
// for. Optional: without it the structural assertions still run, and the check
// says which half it managed.
const animFile = process.argv[4] ?? path.join(HERE, 'out', 'anim_all.json');

const SEGMENTS = [
  { base: 0x10030000, name: 'seg3_DATA_10030000.bin' },
  { base: 0x10040000, name: 'seg4_DATA_10040000.bin' },
];

if (!fs.existsSync(file) || !fs.existsSync(path.join(flat, SEGMENTS[0].name))) {
  console.log(`scenecheck: need ${file} and ${flat}/seg3 — `
    + './ppcbox.sh python3 arenadump.py flat/ out/arena.json. Skipping.');
  process.exit(ABSENT);
}

const segs = SEGMENTS.map((s) => ({
  ...s, data: new Uint8Array(fs.readFileSync(path.join(flat, s.name))),
}));
const doc = JSON.parse(fs.readFileSync(file, 'utf8'));

let nodesOK = 0, nodesBad = 0, streamsOK = 0, streamsBad = 0, fields = 0;
let texts = 0, printable = 0;
let kOK = 0, kBad = 0, kFields = 0;
const kByBlock = new Array(15).fill(0);
const seenOps = new Set();
const failures = [];
const samples = [];

for (const scene of doc.scenes) {
  const addr = parseInt(scene.stream, 16);
  const seg = segs.find((s) => addr >= s.base && addr < s.base + s.data.length);
  if (!seg) { streamsBad++; failures.push(`${scene.stream} outside seg3/seg4`); continue; }
  const got = decodeScene(seg.data, addr - seg.base);
  const want = scene.nodes;
  let good = got.nodes.length === want.length && !got.overrun
    && got.badOpcode === undefined;
  if (!good && failures.length < 8) {
    failures.push(`${scene.part}/${scene.order}: ${got.nodes.length} nodes vs `
      + `${want.length}${got.overrun ? ` (${got.overrun})` : ''}`
      + `${got.badOpcode !== undefined ? ` bad opcode ${got.badOpcode}` : ''}`);
  }

  for (let i = 0; i < Math.min(got.nodes.length, want.length); i++) {
    const a = got.nodes[i], b = want[i];
    seenOps.add(a.op);
    if (a.op === 4) {
      texts++;
      if (a.text.length && [...a.text].every((ch) => ch >= ' ' && ch < '\x7f')) {
        printable++;
        if (samples.length < 5) samples.push(a.text);
      }
    }
    const checks = [
      ['type', a.op, b.type],
      ['clip', a.clip ? 1 : 0, b.clip ? 1 : 0],
      ['flags2', a.anim.flags2, b.anim?.flags2],
      ['flags3', a.anim.flags3, b.anim?.flags3],
      ['keys', a.anim.keys.length, (b.track ?? []).length],
    ];
    if (a.op !== 7) checks.push(['at0d', a.at0d, b.at0d]);
    let fine = true;
    for (const [name, x, y] of checks) {
      if (y === undefined || y === null) continue;
      fields++;
      if (x !== y) {
        fine = false;
        if (failures.length < 8) {
          failures.push(`${scene.part}/${scene.order} node ${i} ${name}: ${x} vs ${y}`);
        }
      }
    }
    if (fine) nodesOK++; else { nodesBad++; good = false; }
  }
  if (good) streamsOK++; else streamsBad++;
}

// THE KEYFRAME VALUES, NOT JUST THEIR COUNT. Each of the five gated groups
// writes the FIRST float of one 16-byte block, and comparing those is what
// turns "the walk stays in step" into "the animation data is right" — a
// grammar can consume the correct number of bytes and still interpret them as
// the wrong fields.
if (fs.existsSync(animFile)) {
  const anim = JSON.parse(fs.readFileSync(animFile, 'utf8'));
  for (const scene of anim.scenes) {
    const addr = parseInt(scene.stream, 16);
    const seg = segs.find((s) => addr >= s.base && addr < s.base + s.data.length);
    if (!seg) continue;
    const got = decodeScene(seg.data, addr - seg.base).nodes;
    const want = scene.frames[0].nodes;
    for (let i = 0; i < Math.min(got.length, want.length); i++) {
      const gk = got[i].anim.keys, wk = want[i].track ?? [];
      for (let j = 0; j < Math.min(gk.length, wk.length); j++) {
        if (gk[j].empty) continue;
        if (gk[j].time !== wk[j].tick) { kBad++; continue; }
        for (let b = 0; b < 15; b++) {
          if (gk[j].blocks[b] === null) continue;
          kFields++;
          if (gk[j].blocks[b] === wk[j].blocks[b][0]) kOK++;
          else { kBad++; kByBlock[b]++; }
        }
      }
    }
  }
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${doc.scenes.length} scene streams, `
  + `${nodesOK + nodesBad} nodes, ${fields} field comparisons\n`);

ok('every node matches type, clip, +0x0d, both flag bytes and its keyframe count',
  nodesBad === 0, `${nodesOK}/${nodesOK + nodesBad}`);
ok('every stream decodes to exactly the node list the original built',
  streamsBad === 0, `${streamsOK}/${streamsOK + streamsBad}`);
ok('all eight opcodes are exercised', seenOps.size === 8,
  [...seenOps].sort().join(', '));
// A walk one byte out of step anywhere earlier reads some other byte as a
// length, so readable English here is evidence the field comparisons cannot
// give on their own.
if (kFields) {
  ok('every keyframe value the stream carries is bit-exact', kBad === 0,
    `${kOK}/${kFields} block values`
    + (kBad ? `, worst blocks ${kByBlock.map((v, i) => (v ? i : null))
      .filter((v) => v !== null).join(',')}` : ''));
} else {
  console.log('     keyframe VALUES not checked: no anim_all.json here');
}
ok('every text node decodes to a printable string', printable === texts,
  `${printable}/${texts} — ${samples.map((t) => JSON.stringify(t)).join(', ')}`);

// `parent` is decoded and deliberately not compared: the stream carries an
// encoded reference and a post-pass at 0x100022d0 resolves it to a pointer.
console.log('     parent is decoded as the stream\'s encoded reference and not '
  + 'compared — 0x100022d0 resolves it after the walk');

for (const f of failures) console.log(`     ${f}`);

if (failed) process.exit(1);
console.log('\nthe scene stream decodes without running the program');
