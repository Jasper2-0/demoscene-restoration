// pass2check.mjs — passes 1 and 2 together, over every node of every scene.
//
//   node work/re/pass2check.mjs out/anim_all.json
//
// `pass1check.mjs` asserts on ROOT nodes only, because pass 2 rewrites the
// channels of anything with a parent and the dump is taken after all three
// passes. This runs both passes and so can assert on the other 180 — the ones
// pass1check has to skip.
//
// It subsumes pass1check rather than replacing it: keeping the narrower check
// separate means a pass-2 regression cannot be mistaken for a pass-1 one, which
// is the whole reason to have staged them.
//
// WHAT THE COVERAGE ACTUALLY IS. PORT_SPEC §3b says sampling five part-one
// streams found three gate combinations — `0x10`, `0x70` and `0xf0`. All 29
// scenes have eight: 0x10, 0x30, 0x40, 0x50, 0x70, 0x80, 0xd0 and 0xf0. So four
// of the five gated operations are exercised, including the `0x10` add of the
// translation triple that §3b calls undecidable from the shipped data — 18
// nodes carry it alone and 60 more combine it.
//
// The fifth, `0x20` WITHOUT `0x10`, still has no example: every one of the 29
// scenes' `0x20` nodes also sets `0x10`. It is implemented from the
// instructions and marked, not guessed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateNode, composeHierarchy } from '../../web/js/anim.js';
import { sinus } from '../../web/js/tables.js';

const ABSENT = 77;
const NIL = 0xffffffff;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(HERE, 'out', 'anim_all.json');

if (!fs.existsSync(file)) {
  console.log(`pass2check: ${file} not here — `
    + './ppcbox.sh python3 animdump.py --all flat/ out/anim_all.json. Skipping.');
  process.exit(ABSENT);
}

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const table = sinus();

let compared = 0, exact = 0, roots = 0, children = 0, stuckTotal = 0;
let resolvedAgree = 0, resolvedDiffer = 0, maxSweeps = 0;
const byGate = new Map();
const failures = [];
const resolvedNotes = [];
const byAddrHas = (es, a) => es.some((x) => x.addr === a);

for (const scene of doc.scenes ?? [doc]) {
  for (const frame of scene.frames) {
    // Pass 1 for every node with an animation object, then pass 2 over the lot.
    const entries = [];
    for (const node of frame.nodes) {
      const anim = node.anim;
      if (!anim) continue;
      const keys = node.track.map((k) => ({ ...k, addr: parseInt(k.addr, 16) }));
      const ch = keys.length
        ? evaluateNode({ ...anim }, keys, frame.t, -1, table) : null;
      entries.push({
        addr: parseInt(anim.addr, 16),
        parent: anim.parent,
        // Pass 1 sets the dirty bit only when the node HAS a parent
        // (`cmpwi r3, -1; beq`), so a root is resolved from the start and the
        // iteration only ever waits on real chains.
        flags3: (anim.flags3 & 0xf0) | (anim.parent !== NIL ? 1 : 0),
        resolved: ch ? 1 : 0,
        ch,
        want: anim,
      });
    }
    const { sweeps, stuck } = composeHierarchy(entries);
    maxSweeps = Math.max(maxSweeps, sweeps);
    stuckTotal += stuck;

    for (const e of entries) {
      const isRoot = e.parent === NIL;
      if (isRoot) roots++; else children++;

      if (e.resolved === e.want.resolved) resolvedAgree++;
      else {
        resolvedDiffer++;
        if (resolvedNotes.length < 10) {
          resolvedNotes.push(`${scene.part}/${scene.order} t=${frame.t} `
            + `${e.want.addr} parent ${e.parent.toString(16)} `
            + `got ${e.resolved} want ${e.want.resolved}`
            + `${byAddrHas(entries, e.parent) ? '' : '  [parent not in dump]'}`);
        }
      }

      // Only meaningful where BOTH sides evaluated: a node that resolved to 0
      // keeps the previous frame's channels in the arena.
      if (e.resolved !== 1 || e.want.resolved !== 1 || !e.ch) continue;
      compared++;

      const gate = e.want.flags3 & 0xf0;
      const key = isRoot ? 'root' : `0x${gate.toString(16)}`;
      const seen = byGate.get(key) ?? { n: 0, ok: 0 };
      seen.n++;
      byGate.set(key, seen);

      let bad = 0, worst = 0;
      const which = [];
      for (let i = 0; i < 24; i++) {
        if (e.ch[i] !== e.want.channels[i]) { bad++; which.push(i); }
        worst = Math.max(worst, Math.abs(e.ch[i] - e.want.channels[i]));
      }
      if (!bad) { exact++; seen.ok++; } else if (failures.length < 8) {
        failures.push({ scene: `${scene.part}/${scene.order}`, t: frame.t,
          addr: e.want.addr, gate: key, bad, which, worst });
      }
    }
  }
}

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

console.log(`${roots} root and ${children} parented nodes; `
  + `${compared} comparable, at most ${maxSweeps} sweeps to converge\n`);
for (const [g, v] of [...byGate].sort()) {
  console.log(`  ${g.padEnd(6)} ${v.ok}/${v.n} exact`);
}
console.log('');

ok('every node agrees on whether it resolved', resolvedDiffer === 0,
  `${resolvedAgree} agree, ${resolvedDiffer} differ`);
for (const n of resolvedNotes) console.log(`     ${n}`);
ok('the hierarchy converges', maxSweeps < 64, `${maxSweeps} sweeps`);
// Sub-objects hang off anim+0x74 and animdump does not export them, so a
// handful of parents are genuinely absent from the dump. Reported rather than
// asserted to zero, because it is a limit of the export and not of the pass.
console.log(`     ${stuckTotal} nodes had no parent in the dump `
  + '(sub-objects on +0x74 are not exported)');
ok('both passes reproduce all 24 channels exactly', exact === compared,
  `${exact}/${compared}`);
ok('parented nodes are actually covered', (byGate.size > 1),
  [...byGate.keys()].filter((k) => k !== 'root').join(' '));

for (const f of failures) {
  console.log(`     ${f.scene} t=${f.t} ${f.addr} gate ${f.gate}: `
    + `${f.bad} differ at ch ${f.which.join(',')}, worst ${f.worst.toExponential(2)}`);
}

if (bad) process.exit(1);
console.log('\npasses 1 and 2 reproduce the original\'s channels on every node');
