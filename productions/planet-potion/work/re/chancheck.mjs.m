// chancheck.mjs — every node's channel block, in every scene, at every tick.
//
//   node work/re/chancheck.mjs flat/ out/anim_all.json
//
// `animcheck.mjs` checks the animation passes on ONE scene at three times, as a
// fixture. This is the whole of it: all 29 scenes, every sampled tick, every
// node, all 24 channels — computed from the raw scene bytecode through the
// decoder, pass 1's polynomial and matrix builders, and pass 2's hierarchy
// composition, and compared to the arena BIT FOR BIT.
//
// Nothing here reads a channel out of the oracle. The only value taken from the
// dump is `origin`, the scene clock, which is genuinely external to the port.
//
// WHY THIS EXISTS AS A SEPARATE SUITE. Hardcoding `mode: 0` reproduced 1,073 of
// the 1,118 blocks and every one of the 45 it missed was a CAMERA — so a check
// that sampled a scene or reported a percentage would have called the port
// finished while every camera in the intro pointed the wrong way. Which builders
// pass 1 runs is decided by the NODE TYPE and by nothing in the animation
// record: 6 -> mode 2, 7 -> mode 4, everything else -> mode 0.
//
// The second half is the camera's reference list. A type-6 node holds a chain at
// `+0x2c` whose links each carry a copy of the camera's channel block
// concatenated with the referenced node's, and the renderer draws the referenced
// mesh through THAT matrix rather than the mesh's own. Those composed matrices
// are in the arena too, so they are checked the same way.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeScene } from '../../web/js/scene.js';
import { evaluateNode, composeHierarchy, concat } from '../../web/js/anim.js';
import { sinus } from '../../web/js/tables.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const file = process.argv[3] ?? path.join(HERE, 'out', 'anim_all.json');

const SEGMENTS = [
  { base: 0x10030000, name: 'seg3_DATA_10030000.bin' },
  { base: 0x10040000, name: 'seg4_DATA_10040000.bin' },
];

if (!fs.existsSync(file) || !fs.existsSync(path.join(flat, SEGMENTS[0].name))) {
  console.log(`chancheck: need ${file} and ${flat}/seg3 — `
    + './ppcbox.sh python3 animdump.py --all. Skipping.');
  process.exit(ABSENT);
}

const segs = SEGMENTS.map((s) => ({
  ...s, data: new Uint8Array(fs.readFileSync(path.join(flat, s.name))),
}));
const A = JSON.parse(fs.readFileSync(file, 'utf8'));
const table = sinus();
const NIL = 0xffffffff;

let chOK = 0, chBad = 0, refOK = 0, refBad = 0, refCount = 0;
let ticks = 0, camNodes = 0;
const byType = new Map();
const byMode = new Map();
const failures = [];

for (const scene of A.scenes) {
  const addr = parseInt(scene.stream, 16);
  const seg = segs.find((s) => addr >= s.base && addr < s.base + s.data.length);
  if (!seg) continue;
  const decoded = decodeScene(seg.data, addr - seg.base).nodes;

  for (const frame of scene.frames) {
    ticks++;
    // Pass 1, from the DECODED track. Synthetic 1-based keyframe addresses,
    // because the original chains them by address and 0 means "no link".
    const composed = decoded.map((n, i) => {
      const w = frame.nodes[i];
      const keys = n.anim.keys.map((k, j) => ({
        tick: k.time, t0: k.t0, flags: k.hold, blocks: k.coeff,
        invSpan: k.invSpan, addr: j + 1,
        next: j + 1 < n.anim.keys.length ? j + 2 : 0, prev: j > 0 ? j : 0,
      }));
      const anim = {
        flags2: n.anim.flags2, flags3: n.anim.flags3, mode: n.anim.mode,
        parent: n.anim.parent ? 1 : NIL, trigger: n.anim.trigger ?? 0,
        loopMode: n.anim.loopMode, origin: w?.anim ? w.anim.origin : 0,
      };
      const ch = keys.length ? evaluateNode(anim, keys, frame.t, -1, table) : null;
      return {
        addr: i,
        parent: n.anim.parent ? decoded.indexOf(decoded.find(
          (x) => x.anim === n.anim.parent || x.subs.includes(n.anim.parent))) : NIL,
        flags3: (n.anim.flags3 & 0xf0) | (n.anim.parent ? 1 : 0),
        resolved: ch ? 1 : 0, ch,
      };
    });
    composeHierarchy(composed);

    decoded.forEach((n, i) => {
      const want = frame.nodes[i]?.anim?.channels;
      if (!want || !composed[i].ch) return;
      const same = composed[i].ch.every((v, k) => v === want[k]);
      const t = byType.get(n.op) ?? [0, 0]; t[same ? 0 : 1]++; byType.set(n.op, t);
      const m = byMode.get(n.anim.mode) ?? [0, 0]; m[same ? 0 : 1]++;
      byMode.set(n.anim.mode, m);
      if (same) chOK++;
      else {
        chBad++;
        if (failures.length < 8) {
          const worst = Math.max(...composed[i].ch.map((v, k) => Math.abs(v - want[k])));
          failures.push(`${scene.part}/${scene.order} t=${frame.t} node ${i} `
            + `op${n.op} mode ${n.anim.mode}: worst |diff| ${worst.toExponential(2)}`);
        }
      }

      // The camera's reference chain: one byte per link in the stream, resolved
      // ONE-BASED down the `+0x10` chain from the head, exactly as parents are.
      if (n.op !== 6 || !n.cameras?.length) return;
      camNodes++;
      const links = frame.nodes[i]?.cameras ?? [];
      if (links.length !== n.cameras.length) {
        refBad += n.cameras.length;
        failures.push(`${scene.part}/${scene.order} t=${frame.t} node ${i}: `
          + `decoded ${n.cameras.length} references, arena has ${links.length}`);
        return;
      }
      n.cameras.forEach((b, j) => {
        refCount++;
        const ch = Float64Array.from(composed[i].ch);
        concat(ch, composed[b + 1]?.ch ?? new Float64Array(24));
        const w = links[j].channels;
        if ([...ch].every((v, k) => v === w[k])) refOK++;
        else {
          refBad++;
          if (failures.length < 8) {
            failures.push(`${scene.part}/${scene.order} t=${frame.t} node ${i} `
              + `reference ${j} -> node ${b + 1}: composed matrix differs`);
          }
        }
      });
    });
  }
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${A.scenes.length} scenes, ${ticks} sampled ticks, `
  + `${chOK + chBad} node channel blocks\n`);

ok('every node channel block is bit-exact', chBad === 0, `${chOK}/${chOK + chBad}`);
for (const [k, [a, b]] of [...byType].sort()) {
  console.log(`     op${k}  ${a} exact${b ? `, ${b} DIFFER` : ''}`);
}
// The mode split is the point of this suite and stays visible: every camera in
// the intro is the only thing mode 2 covers, and it is 4% of the nodes.
ok('all three builder modes are exercised', byMode.size >= 3,
  [...byMode].sort().map(([m, [a, b]]) => `mode ${m}: ${a + b}`).join(', '));
ok('every camera reference matrix is bit-exact', refBad === 0,
  `${refOK}/${refOK + refBad} links across ${camNodes} camera nodes`);
ok('the camera references resolve to real nodes', refCount > 0,
  `${refCount} links`);

for (const f of failures) console.log(`     ${f}`);
if (failed) process.exit(1);
console.log('\nthe animation reproduces every channel of every node in every '
  + 'scene, and the matrices its cameras hand the renderer');
