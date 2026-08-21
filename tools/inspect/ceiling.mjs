// ceiling.mjs — how much of a part's score is actually reachable?
//
// MODE:       REPORT
// OBSERVABLE: correlation between a reference frame and its OWN next frame — a
//             property of the CAPTURE and the content, not of the port.
// UNITS:      r, same metric as the sweep (compare.mjs), so the two are comparable.
//
//   node tools/inspect/ceiling.mjs wonder [tag]
//
// A sweep score of 0.80 means nothing on its own. The comparison cannot resolve a
// difference finer than the capture's own temporal step, so the honest question is
// not "what does this part score" but "how close is it to the best score anything
// could get here".
//
// The ceiling used is the correlation between a reference frame and its OWN NEXT
// frame. If two consecutive frames of the real thing only correlate at 0.57 — which
// happens, on fast content — then a port scoring 0.94 there is already past the
// point where the metric can tell it apart from the original, and further work on
// that part buys nothing measurable.
//
// This matters because the two readings look identical in a sweep and demand
// opposite decisions. Wonder's `effect_40b040` scores 0.936 against a ceiling of
// 0.567: saturated, leave it. `effect_40ec40` scores 0.802 against a ceiling of
// 1.000: two tenths of real, reachable error. Ranking by raw score puts the second
// ABOVE the first and sends you to the wrong one.
//
// The ceiling is a property of the CAPTURE and the content, not of the port, so it
// does not move when the port is fixed — it can be measured once and reused.
import fs from 'node:fs';
import { grayOf, corr } from './compare.mjs';
import { captureOf, refFrame } from './demo.mjs';
import { fromRepo } from '../harness/index.mjs';

const [prod, tag = ''] = process.argv.slice(2);
if (!prod) {
  console.error('usage: node tools/inspect/ceiling.mjs <production> [tag]');
  process.exit(2);
}
const dir = fromRepo('productions', prod, 'work/verify/inspect');
const runPath = `${dir}/run${tag ? `-${tag}` : ''}.json`;
if (!fs.existsSync(runPath)) { console.error(`no such run: ${runPath}`); process.exit(2); }

const cap = captureOf(prod);
const fps = Number(cap.captureFps) || 60;
const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN; };

const byPart = new Map();
for (const s of run.samples) {
  if (!byPart.has(s.part)) byPart.set(s.part, []);
  byPart.get(s.part).push(s);
}

const rows = [];
for (const [part, samples] of byPart) {
  const ceils = [];
  // Sample a few instants per part rather than all of them: the ceiling varies
  // with content, and the median of four is enough to separate "saturated" from
  // "reachable" without decoding hundreds of extra frames.
  const step = Math.max(1, Math.floor(samples.length / 4));
  for (let i = 0; i < samples.length; i += step) {
    const t = samples[i].captureTime;
    try {
      const a = grayOf(refFrame(prod, cap.file, +t.toFixed(3)));
      const b = grayOf(refFrame(prod, cap.file, +(t + 1 / fps).toFixed(3)));
      ceils.push(corr(a, b));
    } catch { /* past the end of the capture */ }
  }
  if (!ceils.length) continue;
  const r = med(samples.map((s) => s.r));
  const ceiling = med(ceils);
  rows.push({ part, n: samples.length, r, ceiling, headroom: r - ceiling });
}

rows.sort((a, b) => a.headroom - b.headroom);
console.log(`${prod}  run ${tag || '(untagged)'}  capture ${fps}fps\n`);
console.log('part                 n   score  ceiling  headroom');
for (const x of rows) {
  const flag = x.headroom >= -0.02 ? '  saturated' : x.headroom < -0.15 ? '  <= work here' : '';
  console.log(`${x.part.padEnd(18)} ${String(x.n).padStart(3)}   ${x.r.toFixed(3)}   ${x.ceiling.toFixed(3)}   `
    + `${(x.headroom >= 0 ? '+' : '') + x.headroom.toFixed(3)}${flag}`);
}
const saturated = rows.filter((x) => x.headroom >= -0.02).length;
console.log(`\n  median ceiling ${med(rows.map((x) => x.ceiling)).toFixed(4)}`
  + `   median score ${med(rows.map((x) => x.r)).toFixed(4)}`
  + `   ${saturated}/${rows.length} parts saturated`);
console.log('  total reachable gain if every part hit its ceiling: '
  + `${rows.reduce((t, x) => t + Math.max(0, -x.headroom), 0).toFixed(2)} summed over parts`);
