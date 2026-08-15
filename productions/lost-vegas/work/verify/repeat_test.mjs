// repeat_test.mjs — does __lvRenderCold(pos) give the same frame however it got
// there, and does its pre-roll actually visit the rows that matter?
//
//   node productions/lost-vegas/work/verify/repeat_test.mjs
//
// The GENERIC determinism assertions (order independence, repeat, isolation,
// state) live in tools/inspect/repeatability.mjs and are not duplicated here:
//
//   node tools/inspect/repeatability.mjs lost-vegas
//
// This covers the three things that are specific to lost-vegas's pre-roll.
//
// 1. PRE-ROLL SUFFICIENCY. renderCold resets and steps from the scene-entry
//    boundary. If reset() is complete, starting the window a whole scene or two
//    earlier must land on a BYTE-IDENTICAL frame — the extra history is
//    absorbed by the reset. Where it does not, reset() is missing something and
//    this test has located it. This is the analogue of sonnet's streamEntry
//    refusal: not "trust the reset", but "prove the entry state is entry-state".
//
// 2. TRIGGER COVERAGE, ASSERTED. eff_e's flash fires on
//    `(pos & 0x1f) in {0x14, 0x16, 0x17}` (eff_e.js:206). The pre-roll this
//    replaces stepped `q += 0x8`, and multiples of 8 give {0, 8, 16, 24} — so
//    those rows were NEVER visited and the flash provably never fired in any
//    pre-rolled frame. Stepping in milliseconds fixes that by construction, but
//    "by construction" is a claim, so this enumerates the positions the loop
//    actually visits and fails on any trigger row it skips. A permanent guard on
//    the exact bug, not on the symptom it happened to produce.
//
// 3. CADENCE SENSITIVITY — REPORTED, NOT ASSERTED. scene F consumes a per-frame
//    delta directly (eff_f.js:429) and scene D's blobS is nonlinear in dt with a
//    per-frame step (eff_d.js:448). The ORIGINAL was framerate-dependent here,
//    so there is no cadence-independent trajectory to recover and asserting
//    independence would assert something FALSE. The honest instrument reports
//    how much the picture moves between 15/30/60/120 fps and asserts only that
//    the DECLARED cadence reproduces itself.
//
// NON-VACUITY. Recorded so a future reader knows these assertions have been seen
// to fail, per the plan's requirement:
//
//   * Assertion 2 fails on the OLD stride by construction and the test says so:
//     running its coverage check against `q += 0x8` reports every one of the
//     0x14/0x16/0x17 rows as skipped. That is asserted below as a control, so
//     the check cannot silently pass by testing nothing.
//   * Assertion 1 was failing before renderCold landed: with a plain
//     __lvRender(pos), tools/inspect/repeatability.mjs reported REPEAT and
//     ISOLATION failures on sceneD; both pass now (db5dd75).
//   * ORDER still fails on sceneD/sceneE, which is a KNOWN and reported limit,
//     not a silent one — see the header note in web/js/main.js.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withDemo } from '../../../../tools/inspect/demo.mjs';
import { grayOf, rmse } from '../../../../tools/inspect/compare.mjs';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// A HASH IS TOO SENSITIVE FOR GPU OUTPUT — the same lesson tools/inspect's noise
// floor exists for. sceneC's renders differ by RMSE 0.33 and r 0.99994, which is
// rasteriser nondeterminism, not carried state; asserting on hashes reports it as
// a failure and hides the real ones among the noise. Compare by magnitude.
const NOISE = 1.0;
const grayCache = new Map();
const gray = (dataUrl) => {
  if (!grayCache.has(dataUrl)) {
    const f = path.join(os.tmpdir(), `lv_${sha(dataUrl)}.png`);
    fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
    grayCache.set(dataUrl, grayOf(f));
    fs.unlinkSync(f);
  }
  return grayCache.get(dataUrl);
};
/** Same picture? Returns the RMSE, or 0 when bit-identical. */
const delta = (a, b) => (sha(a) === sha(b) ? 0 : rmse(gray(a), gray(b)));
let failures = 0;
const check = (ok, msg) => {
  if (ok) console.log(`  ok    ${msg}`);
  else { failures++; console.log(`  FAIL  ${msg}`); }
};

// Samples inside the three integrator scenes plus two controls that should be
// insensitive to all of this. A harness with no cases where the effect must NOT
// fire cannot tell a fix from a feature that stopped firing everywhere.
const SAMPLES = [
  { part: 'sceneD', local: 5.614 },
  { part: 'sceneE', local: 3.7 },
  { part: 'sceneF', local: 6.0 },
  { part: 'sceneB', local: 5.0 },   // control: no integrator
  { part: 'sceneC', local: 5.507 }, // control: cleared by the noise floor
];

await withDemo('lost-vegas', [], async (api) => {
  const shot = (part, local, opts) => api.page.evaluate(async (a) => {
    const b = window.__demo.schedule().find((x) => x.name === a.part);
    if (!b) return null;
    const { secondsToPos } = await import('./js/timeline.js');
    const pos = secondsToPos(b.start + a.local);
    const info = window.__lvRenderCold(pos, a.opts ?? {});
    return { png: document.querySelector('canvas').toDataURL('image/png'), info, pos };
  }, { part, local, opts });

  // ---- 1. PRE-ROLL SUFFICIENCY -------------------------------------------
  console.log('repeat_test lost-vegas');
  let insufficient = 0;
  for (const s of SAMPLES) {
    const base = await shot(s.part, s.local);
    if (!base) continue;
    const { SCENES } = await api.page.evaluate(() => ({ SCENES: null })).then(() => ({ SCENES: null }));
    // One and two scene-boundaries earlier, by position: 0x200 is one scene for
    // most of this ladder, so step back in whole 0x200 blocks and clamp at 0.
    for (const back of [0x200, 0x400]) {
      const from = Math.max(0, (base.info.entry ?? 0) - back);
      const early = await shot(s.part, s.local, { from });
      if (!early) continue;
      const d = delta(early.png, base.png);
      if (d > NOISE) {
        insufficient++;
        console.log(`        ${s.part}@${s.local}  window from 0x${from.toString(16)}`
          + ` differs from entry 0x${(base.info.entry ?? 0).toString(16)}   RMSE ${d.toFixed(3)}`);
        break;
      }
    }
  }
  check(insufficient === 0,
    `PRE-ROLL: ${insufficient}/${SAMPLES.length} samples change when the window starts earlier`);

  // ---- 2. TRIGGER COVERAGE ------------------------------------------------
  // Enumerate the positions the ms-stepped loop actually visits between a
  // scene's entry and a sample inside it, and check every trigger row in that
  // span is among them.
  const cov = await api.page.evaluate(async () => {
    const { secondsToPos, posToSeconds, sceneEntryPos } = await import('./js/timeline.js');
    const TRIG = new Set([0x14, 0x16, 0x17]);
    const walk = (entry, target, stepMs) => {
      const seen = new Set();
      const t0 = (posToSeconds(entry) ?? 0) * 1000, t1 = (posToSeconds(target) ?? 0) * 1000;
      for (let t = t0; t < t1 - 1e-6; t += stepMs) seen.add(secondsToPos(t / 1000));
      seen.add(target);
      return seen;
    };
    const b = window.__demo.schedule().find((x) => x.name === 'sceneE');
    const target = secondsToPos(b.start + 3.7);
    const entry = sceneEntryPos(target);
    // GROUND TRUTH IS THE MUSIC, NOT AN ASSUMED ROW COUNT. Two wrong versions
    // of this preceded: enumerating every integer in the span (most are not
    // positions at all — pos is (order << 8) | row), then assuming row < 0x40
    // (XM pattern lengths vary, so an order can hold fewer rows than that). Both
    // demanded the pre-roll visit positions the song never reaches, and reported
    // a correct loop as missing 21 of 24 and then 3 of 6.
    //
    // A 1 ms walk visits every position the music passes through in this span,
    // by construction. That is the set the pre-roll owes coverage of.
    const wanted = [...walk(entry, target, 1)].filter((q) => TRIG.has(q & 0x1f));
    const ms = walk(entry, target, 1000 / 60);
    const stride = new Set();                       // the OLD pre-roll, as a control
    for (let q = entry; q <= target; q += 0x8) stride.add(q);
    return {
      wanted: wanted.length,
      msMissed: wanted.filter((p) => !ms.has(p)).length,
      strideMissed: wanted.filter((p) => !stride.has(p)).length,
    };
  });
  console.log(`        ${cov.wanted} trigger rows in the span;`
    + ` ms-stepped misses ${cov.msMissed}, the old q += 0x8 stride misses ${cov.strideMissed}`);
  check(cov.msMissed === 0, `TRIGGERS: ms-stepped pre-roll visits every 0x14/0x16/0x17 row`);
  // The control. If this ever passes, the check above is testing nothing.
  check(cov.wanted > 0 && cov.strideMissed === cov.wanted,
    `NON-VACUITY: the old 0x8 stride misses all ${cov.wanted} of them`);

  // ---- 3. CADENCE SENSITIVITY — REPORTED ----------------------------------
  console.log('\n  cadence sensitivity (reported, not asserted — the original was');
  console.log('  framerate-dependent here, so there is no cadence-free answer):');
  for (const s of SAMPLES.slice(0, 3)) {
    const at = {};
    for (const fps of [15, 30, 60, 120]) {
      const r = await shot(s.part, s.local, { fps });
      if (r) at[fps] = sha(r.png);
    }
    const uniq = new Set(Object.values(at)).size;
    console.log(`        ${s.part.padEnd(7)} ${Object.entries(at)
      .map(([f, h]) => `${f}fps ${h.slice(0, 8)}`).join('  ')}   ${uniq}/4 distinct`);
  }
  // Assert only that the DECLARED cadence reproduces itself.
  let unstable = 0;
  for (const s of SAMPLES) {
    const a = await shot(s.part, s.local, { fps: 60 });
    const b = await shot(s.part, s.local, { fps: 60 });
    const d = a && b ? delta(a.png, b.png) : 0;
    if (d > NOISE) { unstable++; console.log(`        ${s.part} 60fps differs from itself   RMSE ${d.toFixed(3)}`); }
  }
  check(unstable === 0, `DECLARED CADENCE: 60 fps reproduces itself on all ${SAMPLES.length} samples`);
});

console.log(failures
  ? `\n${failures} assertion(s) failed.`
  : '\nrenderCold\'s pre-roll is sufficient and covers every trigger row.');
process.exit(failures ? 1 : 0);
