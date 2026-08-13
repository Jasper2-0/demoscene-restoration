// verdict.mjs — compare a sweep run against the blessed baseline and rule.
//
//   node web/test/verdict.mjs work/verify/results_ci.json work/verify/baseline_golden.json
//
// Noise rules (measured, sonnet-restoration 2026-08-05..11):
//   * per-sample moves under 1.5 RMSE are the sweep's documented noise floor
//     (order dependence + ANGLE non-reproducibility); precipitation windows
//     can wobble ±3-4, so single samples only FLAG above 4.0.
//   * per-scene MEDIANS are stable: a move > 1.5 is a real change.
//   * global median moves > 0.5 or a new worst sample > baseline+5 flag too.
// A flagged run is a REGRESSION verdict (exit 1) — unless every flagged move
// is an improvement, which is a NOTE (exit 0): the baseline is stale, rebless.
//
// ⚠ RMSE-vs-capture cannot arbitrate everything: a more-correct port can
// score worse (documented repeatedly).  The verdict is a regression GUARD for
// automation; a human (or the fix loop's frame check) owns the exceptions.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORK = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const [ciPath, basePath] = process.argv.slice(2);
if (!ciPath || !basePath) {
  console.error('usage: verdict.mjs <run.json> <baseline.json>');
  process.exit(2);
}
const load = (p) => JSON.parse(fs.readFileSync(path.resolve(WORK, p)));
let base;
const ci = load(ciPath);
try { base = load(basePath); } catch {
  console.error(`no baseline at ${basePath} — bless one first: ./run-verify.sh --bless`);
  process.exit(2);
}

if (ci.quality !== base.quality) {
  console.error(`quality mismatch: run ${ci.quality} vs baseline ${base.quality}`);
  process.exit(2);
}
console.log(`run:      ${ci.generated}  quality=${ci.quality} warm=${ci.warm} samples=${ci.samples}`);
console.log(`baseline: ${base.generated}  quality=${base.quality} warm=${base.warm} samples=${base.samples}`);

const flags = [];
const better = [];
const note = (arr, s) => arr.push(s);

// global
const dMedian = ci.stats.median - base.stats.median;
if (Math.abs(dMedian) > 0.5) {
  note(dMedian > 0 ? flags : better,
    `global median ${base.stats.median} -> ${ci.stats.median} (${dMedian > 0 ? '+' : ''}${dMedian.toFixed(2)})`);
}
const dWorst = ci.stats.worst.rmse - base.stats.worst.rmse;
if (dWorst > 5) note(flags, `worst sample ${base.stats.worst.rmse} (${base.stats.worst.pos}) -> ` +
  `${ci.stats.worst.rmse} (${ci.stats.worst.pos})`);

// per-scene medians.  ⚠ Key on obj AND band name — obj 1 appears twice
// (title band + credits band), and keying on obj alone compared one band's
// median against the other's, manufacturing a phantom +3.71 "regression"
// (found on this file's first clean full run, 2026-08-11).
const sceneKey = (s) => `${s.obj}|${s.scene}`;
const baseScene = Object.fromEntries(base.perScene.map((s) => [sceneKey(s), s]));
for (const s of ci.perScene) {
  const b = baseScene[sceneKey(s)];
  if (!b) continue;
  const d = s.medianRmse - b.medianRmse;
  if (Math.abs(d) > 1.5) {
    note(d > 0 ? flags : better,
      `obj ${s.obj} (${s.scene}) median ${b.medianRmse} -> ${s.medianRmse} (${d > 0 ? '+' : ''}${d.toFixed(2)})`);
  }
}

// per-sample outliers (ranked, informational unless > 4.0 worse)
const basePos = Object.fromEntries(base.samplesDetail.map((s) => [s.pos, s.rmse]));
const moved = ci.samplesDetail
  .map((s) => ({ pos: s.pos, obj: s.obj, d: s.rmse - (basePos[s.pos] ?? s.rmse), rmse: s.rmse }))
  .filter((m) => Math.abs(m.d) > 4.0)
  .sort((a, b) => b.d - a.d);
for (const m of moved.slice(0, 15)) {
  note(m.d > 0 ? flags : better,
    `sample ${m.pos} (obj ${m.obj}) ${(m.rmse - m.d).toFixed(1)} -> ${m.rmse.toFixed(1)}`);
}

if (flags.length) {
  console.log('\nREGRESSED — ranked:');
  for (const f of flags) console.log('  ✗ ' + f);
}
if (better.length) {
  console.log('\nimproved (rebless when intended):');
  for (const b of better) console.log('  ✓ ' + b);
}
if (!flags.length && !better.length) console.log('\nOK — within noise of the baseline');
process.exit(flags.length ? 1 : 0);
