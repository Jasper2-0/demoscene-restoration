// pass1check.mjs — `_calc_matrix`'s first pass, against the original's answers.
//
//   node work/re/pass1check.mjs out/anim_all.json
//
// `animcheck.mjs` checks the innermost arithmetic on one scene. This checks the
// whole of pass 1 — the loop-mode walk, all fifteen coefficient blocks, the four
// matrix builders and the concatenation — on every scene, by running
// `anim.js`'s `evaluateNode` and comparing all 24 evaluated channels against
// what the running program left in the arena.
//
// ONLY ROOT NODES ARE ASSERTED ON, and that is what makes the comparison clean:
// the dump is taken after all three passes, and pass 2 rewrites channels on any
// node with a parent. A node whose parent is 0xFFFFFFFF is untouched by pass 2,
// so its channels in the dump ARE pass 1's output. Parented nodes are counted
// and reported so the coverage is visible, not asserted on until pass 2 exists.
//
// THE COMPARISON IS EQUALITY, not a tolerance. Every channel is written through
// a truncating `stfs`, so a correct port reproduces the bits — and the two-ulp
// drift that showed up on one channel during development came from rounding `u`
// to single, which the original does not do because there is no store between
// the subtract and the multiply.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateNode, LOOP } from '../../web/js/anim.js';
import { sinus } from '../../web/js/tables.js';

const ABSENT = 77;
const NIL = 0xffffffff;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(HERE, 'out', 'anim_all.json');

if (!fs.existsSync(file)) {
  console.log(`pass1check: ${file} not here — `
    + './ppcbox.sh python3 animdump.py --all flat/ out/anim_all.json. Skipping.');
  process.exit(ABSENT);
}

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const table = sinus();
const MODE_NAME = Object.fromEntries(Object.entries(LOOP).map(([k, v]) => [v, k]));

let roots = 0, exact = 0, skipped = 0, parented = 0, noTrack = 0;
const agreeSkip = { ok: 0, bad: 0 };
let worst = 0, worstAt = null;
const byMode = new Map();
const failures = [];

for (const scene of doc.scenes ?? [doc]) {
  for (const frame of scene.frames) {
    for (const node of frame.nodes) {
      const anim = node.anim;
      if (!anim) continue;
      if (anim.parent !== NIL) { parented++; continue; }
      if (!node.track.length) { noTrack++; continue; }
      if (anim.resolved) roots++;

      const mode = anim.flags2 & 0xe0;
      const seen = byMode.get(mode) ?? { n: 0, ok: 0, skip: 0 };
      byMode.set(mode, seen);
      if (anim.resolved) seen.n++; else seen.skip++;

      const keys = node.track.map((k) => ({ ...k, addr: parseInt(k.addr, 16) }));
      // A fresh copy: the mode-0 trigger path writes `origin` back, and the
      // dump must not be mutated between frames.
      const got = evaluateNode({ ...anim }, keys, frame.t, -1, table);

      // THE SKIP DECISION IS ITSELF THE ASSERTION for a node the original did
      // not evaluate. `anim+0x00` is 1 when pass 1 ran and 0 when it bailed —
      // and a bailed node keeps LAST FRAME'S channels, so comparing them to a
      // fresh evaluation compares against stale data and means nothing. Agree
      // on the decision; only compare channels when both sides evaluated.
      if (!anim.resolved) {
        if (got) { agreeSkip.bad++; } else { agreeSkip.ok++; }
        skipped++;
        continue;
      }
      if (!got) {
        agreeSkip.bad++;
        if (failures.length < 8) {
          failures.push({ scene: `${scene.part}${scene.order}`, t: frame.t,
            addr: node.addr, mode, bad: 'skipped, original did not', w: 0, ch: [] });
        }
        continue;
      }
      agreeSkip.ok++;

      let bad = 0, w = 0;
      const which = [];
      for (let i = 0; i < 24; i++) {
        const d = Math.abs(got[i] - anim.channels[i]);
        if (got[i] !== anim.channels[i]) { bad++; which.push(i); }
        if (d > w) w = d;
      }
      if (!bad) { exact++; seen.ok++; } else if (failures.length < 8) {
        failures.push({ scene: `${scene.part}${scene.order}`, t: frame.t,
          addr: node.addr, mode, bad, w, ch: which });
      }
      if (w > worst) { worst = w; worstAt = `${scene.part}${scene.order} t=${frame.t} ${node.addr}`; }
    }
  }
}

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

console.log(`${roots} root evaluations across ${(doc.scenes ?? [doc]).length} scenes; `
  + `${parented} parented and ${noTrack} trackless skipped\n`);
for (const [m, v] of [...byMode].sort((a, b) => a[0] - b[0])) {
  console.log(`  ${MODE_NAME[m] ?? m.toString(16).padEnd(4)}  ${v.ok}/${v.n} exact`
    + (v.skip ? `, ${v.skip} skipped by the original` : ''));
}
console.log('');

ok('the skip decision matches the original on every node', agreeSkip.bad === 0,
  `${agreeSkip.ok} agree, ${agreeSkip.bad} differ (${skipped} skipped by the original)`);
ok('and reproduces all 24 channels exactly', exact === roots,
  `${exact}/${roots}${worst ? `, worst |diff| ${worst.toExponential(2)} at ${worstAt}` : ''}`);

// A pass that only ever saw one loop mode would say nothing about the other
// seven, and one scene is one mode.
ok('more than one loop mode is covered', byMode.size > 1,
  [...byMode.keys()].map((m) => MODE_NAME[m] ?? m).join(', '));

for (const f of failures) {
  console.log(`     ${f.scene} t=${f.t} ${f.addr} mode ${MODE_NAME[f.mode]}: `
    + `${f.bad} differ${f.ch?.length ? ` at ch ${f.ch.join(',')}` : ''}`
    + `${f.w ? `, worst ${f.w.toExponential(2)}` : ''}`);
}

if (bad) process.exit(1);
console.log('\npass 1 reproduces the original\'s evaluated channels');
