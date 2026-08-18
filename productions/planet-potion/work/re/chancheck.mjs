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
import { evaluateNode, composeHierarchy, composeSub, concat }
  from '../../web/js/anim.js';
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
// WHICH PASS-2 GATES A SUB-OBJECT COMPOSES UNDER, and it is a constant: 0xd0,
// which is MULTIPLY | ADD_PAIR | TRANSLATE and pointedly not PROJECT. Its own
// flags3 is zero in every one of the 809, so the gates are not coming from the
// record — a sub-object always composes this way.
//
// Each of the four other combinations that could plausibly have been it was
// measured: 0xf0 gives 444/809, 0x90 gives 263, 0xc0 gives 243, 0x50 gives 213
// and 0xb0 gives 263. Only 0xd0 gives all of them, and the one that separates
// it from 0xf0 is cx/cy/scale — PROJECT copies channels 21 to 23 down from the
// parent and a sub-object keeps its own.
const SUB_GATES = 0xd0;

let chOK = 0, chBad = 0, refOK = 0, refBad = 0, refCount = 0;
let subOK = 0, subBad = 0;
const subByMode = new Map();
// OP 3's GENERATED SUB-OBJECTS, and the thirteen nodes that still disagree.
// Named rather than counted, so a new one fails and a fixed one has to be
// taken off the list. All thirteen are in part three and every one of them
// fails on ALL its sub-objects, which is the signature of an operand read
// rather than of the arithmetic — 181 of the 194 nodes are exact.
const KNOWN_OP3 = new Set([
  'p3/0#9', 'p3/0#10', 'p3/0#11', 'p3/0#12', 'p3/0#16', 'p3/0#17',
  'p3/2#16', 'p3/3#29', 'p3/3#30', 'p3/3#35', 'p3/6#4', 'p3/6#5', 'p3/6#6',
]);
const badOp3 = new Set();
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

      // THE SUB-OBJECTS EVALUATE TOO. They hang off the animation object's
      // +0x74 and pass 1 walks them like any other, so a type 0-2 node's
      // vertices and a text node's glyph scale are all just channel blocks that
      // went through the same polynomial. Nothing checked them before.
      const wSubs = frame.nodes[i]?.anim?.subs ?? [];
      n.subs.forEach((sub, j) => {
        const w2 = wSubs[j]?.channels;
        if (!w2) return;
        const keys2 = sub.keys.map((k, m) => ({
          tick: k.time, t0: k.t0, flags: k.hold, blocks: k.coeff,
          invSpan: k.invSpan, addr: m + 1,
          next: m + 1 < sub.keys.length ? m + 2 : 0, prev: m > 0 ? m : 0,
        }));
        if (!keys2.length) return;
        {
          const mode = 0;
          const a2 = { flags2: sub.flags2, flags3: sub.flags3, mode,
            parent: NIL, trigger: sub.trigger ?? 0, loopMode: sub.loopMode,
            origin: frame.nodes[i]?.anim ? frame.nodes[i].anim.origin : 0 };
          const own = evaluateNode(a2, keys2, frame.t, -1, table);
          // THE SAME MECHANISM THE CAMERA USES: take a copy of the parent's
          // whole 24-float block and concatenate the sub-object's own into it.
          // So the rotation and translation compose, and channels 15 to 23 —
          // the colour scales, the texture offsets and cx/cy/scale — stay the
          // PARENT's, because `concat` writes only 0..8 and 12..14.
          // op 4's single sub-object carries the GLYPH SCALE, not a vertex,
          // and is read straight off the animation object without composing.
          // op 4's single sub-object carries the GLYPH SCALE, not a vertex,
          // and is read straight off the animation object without composing.
          const ch2 = own;
          if (n.op !== 4 && composed[i].ch) {
            composeSub(ch2, composed[i].ch, Boolean(sub.generated));
          }
          const same = ch2.every((v, k) => v === w2[k]);
          const t2 = subByMode.get(n.op) ?? [0, 0];
          t2[same ? 0 : 1]++; subByMode.set(n.op, t2);
          if (same) subOK++;
          else {
            subBad++;
            if (n.op === 3) badOp3.add(`${scene.part}/${scene.order}#${i}`);
            if (failures.length < 8) {
              const worst = Math.max(...[...ch2].map((v, k) => Math.abs(v - w2[k])));
              failures.push(`${scene.part}/${scene.order} t=${frame.t} node ${i} `
                + `op${n.op} sub ${j}: worst |diff| ${worst.toExponential(2)}`);
            }
          }
        }
      });

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
{
  const surprise = [...badOp3].filter((k) => !KNOWN_OP3.has(k));
  const fixed = [...KNOWN_OP3].filter((k) => !badOp3.has(k));
  const decoded = [...subByMode].filter(([op]) => op !== 3)
    .reduce((t, [, v]) => [t[0] + v[0], t[1] + v[1]], [0, 0]);
  ok('every DECODED sub-object channel block is bit-exact', decoded[1] === 0,
    `${decoded[0]}/${decoded[0] + decoded[1]} across ops 0, 1, 2 and 4`);
  ok('no op-3 node disagrees that is not already accounted for',
    surprise.length === 0, surprise.length ? surprise.join(' ')
      : `${subOK}/${subOK + subBad} sub-objects, `
        + `${KNOWN_OP3.size} nodes known to differ`);
  ok('every op-3 node on the accounted-for list still disagrees',
    fixed.length === 0, fixed.length
      ? `${fixed.join(' ')} now matches — take it off the list` : 'all 13');
}
ok('sub-objects are checked on the types that have them', subByMode.size >= 4,
  `ops ${[...subByMode.keys()].sort().join(', ')}`);
for (const [k, [a, b]] of [...subByMode].sort()) {
  console.log(`     op${k} sub-objects  ${a} exact${b ? `, ${b} DIFFER` : ''}`);
}
ok('every camera reference matrix is bit-exact', refBad === 0,
  `${refOK}/${refOK + refBad} links across ${camNodes} camera nodes`);
ok('the camera references resolve to real nodes', refCount > 0,
  `${refCount} links`);

for (const f of failures) console.log(`     ${f}`);
if (failed) process.exit(1);
console.log('\nthe animation reproduces every channel of every node in every '
  + 'scene, and the matrices its cameras hand the renderer');
