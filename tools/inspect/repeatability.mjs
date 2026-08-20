// repeatability.mjs — does render() actually give the same frame twice?
//
//   node tools/inspect/repeatability.mjs lapsus
//   node tools/inspect/repeatability.mjs wonder --max=24 --step=4
//   node tools/inspect/repeatability.mjs ptct --query=quality=original
//
// ADAPTER.md REQUIRES `render()` to be repeatable, and until now nothing checked
// it. That requirement is not pedantry — the sweep renders 100+ samples in one
// page load, so if sample N perturbs sample N+1 then every score after the first
// is of a frame that no viewer will ever see, and the failure is invisible
// because the numbers still look like numbers.
//
// This matters most for the ports not yet adopted. ptct's effect registry is
// built once and never reset between seeks, so two effects latch the previous
// frame's tick count; lost-vegas's scenes D/E/F integrate frame deltas and reset
// only on rewind. Both would produce a plausible sweep and a meaningless one.
//
// It is also worth running against the ports that ARE adopted. lapsus's
// GL_SHININESS bug was exactly this shape — the one-instant path seeded the
// persistent exponent cold while the sweep seeded it warm from whatever rendered
// before, so the two harnesses disagreed and neither matched the engine.
//
// FOUR ASSERTIONS, in increasing strength:
//   1. ORDER INDEPENDENCE  ascending, descending and shuffled give the same
//                          frame for the same sample.
//   2. REPEAT              rendering one sample twice in a row is idempotent.
//   3. ISOLATION           a fresh page rendering ONE sample matches that
//                          sample's frame from the interleaved run. This is the
//                          cold side, and it is the assertion a warm harness
//                          cannot make about itself.
//   4. STATE               state() agrees across orderings. A pixel assertion
//                          says "different"; this says WHICH FIELD.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withDemo } from './demo.mjs';
import { defaultPlan } from './plan.mjs';
import { grayOf, rmse, corr } from './compare.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => (args.find((a) => a.startsWith(`--${n}=`)) ?? `--${n}=${d}`).slice(n.length + 3);
const prodName = args.find((a) => !a.startsWith('--'));
const STEP = Number(flag('step', 2));
const MAX = Number(flag('max', 40));
const QUERY = flag('query', '');
// Noise floor in RMSE over 0-255 luma. 1.0 separates the two measured cases by
// a factor of 3 on both sides (sceneC 0.330 noise, sceneD 3.53+ real).
const NOISE = Number(flag('noise', 1.0));
if (!prodName) {
  console.error('usage: node tools/inspect/repeatability.mjs <production> [--step=2] [--max=40] [--query=k=v]');
  process.exit(2);
}
const extra = QUERY ? QUERY.replace(/^[?&]/, '').split('&') : [];

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const key = (s) => `${s.part}@${s.local}`;

/** Render one sample and hash the canvas, reading back in the same evaluate. */
const shot = async (page, s) => {
  const out = await page.evaluate(async (a) => {
    const info = await window.__demo.render(a);
    return { png: document.querySelector('canvas').toDataURL('image/png'),
             state: window.__demo.state?.() ?? info ?? null };
  }, { part: s.part, local: s.local });
  return { hash: sha(out.png), state: out.state, png: out.png };
};

/**
 * A HASH IS INFINITELY SENSITIVE, and that made this test lie in both directions.
 *
 * lost-vegas's sceneC failed REPEAT and ISOLATION on hashes, which read exactly
 * like sceneD's documented frame-delta integrator — so the finding was written up
 * as "the audit missed a scene". Measuring the MAGNITUDE says otherwise:
 *
 *   sceneC   RMSE 0.330 and CONSTANT (1v2, 1v3, 1v4 all 0.330), r 0.999943
 *   sceneD   RMSE 3.53 -> 5.05 -> 6.05, r 0.9954 -> 0.9907 -> 0.9866
 *
 * An integrator ACCUMULATES; sceneD's divergence grows with every render. A
 * constant sub-LSB difference does not accumulate and is rasteriser/GPU
 * nondeterminism — the same picture, a few pixels apart. sceneC carries no state,
 * and reading each scene for `+=` had been right about it all along.
 *
 * So: hash decides BIT-EXACT, magnitude decides WHETHER IT MATTERS. Anything
 * under the noise floor is reported and not failed.
 *
 * THE TOLERANCE IS NOT A LICENCE TO GO PIXEL-ONLY. ptct's stale flash slots were
 * VISUALLY INERT — wrong state that changed no pixels at all — so a tolerant
 * pixel test would have passed them at RMSE 0.0. That is exactly why STATE is a
 * separate assertion, and why loosening this one is safe only alongside it.
 */
const grayCache = new Map();
const grayOfDataUrl = (dataUrl) => {
  if (!grayCache.has(dataUrl)) {
    const f = path.join(os.tmpdir(), `rep_${sha(dataUrl)}.png`);
    fs.writeFileSync(f, Buffer.from(dataUrl.split(',')[1], 'base64'));
    grayCache.set(dataUrl, grayOf(f));
    fs.unlinkSync(f);
  }
  return grayCache.get(dataUrl);
};

/** Compare two shots: bit-exact, below the noise floor, or a real difference. */
const compareShots = (a, b) => {
  if (a.hash === b.hash) return { same: true, noise: false, rmse: 0, r: 1 };
  const [ga, gb] = [grayOfDataUrl(a.png), grayOfDataUrl(b.png)];
  const e = rmse(ga, gb), r = corr(ga, gb);
  return { same: false, noise: e <= NOISE, rmse: e, r };
};

let failures = 0;
const fail = (msg) => { failures++; console.log(`  FAIL  ${msg}`); };

await withDemo(prodName, extra, async (api) => {
  let plan = defaultPlan(api.schedule, STEP);
  // Subsample evenly rather than truncating: three orderings over every sample
  // is expensive, and a head slice would only ever exercise the opening.
  if (plan.length > MAX) {
    const stride = plan.length / MAX;
    plan = Array.from({ length: MAX }, (_, i) => plan[Math.floor(i * stride)]);
  }
  console.log(`repeatability ${prodName}: ${plan.length} samples${extra.length ? `  ${extra.join(' ')}` : ''}`);

  const asc = [...plan];
  const desc = [...plan].reverse();
  // Deterministic shuffle so a failure is reproducible.
  let seed = 12345;
  const shuffled = [...plan].sort(() => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) - 0.5);

  const runs = {};
  for (const [name, order] of [['ascending', asc], ['descending', desc], ['shuffled', shuffled]]) {
    const m = new Map();
    for (const s of order) m.set(key(s), await shot(api.page, s));
    runs[name] = m;
    console.log(`  rendered ${name} (${m.size})`);
  }

  // 1. ORDER INDEPENDENCE
  let differing = 0, noiseOnly = 0;
  for (const s of plan) {
    const k = key(s);
    const [a, b, c] = [runs.ascending.get(k), runs.descending.get(k), runs.shuffled.get(k)];
    const d = [compareShots(a, b), compareShots(a, c)].sort((x, y) => y.rmse - x.rmse)[0];
    if (d.same) continue;
    if (d.noise) { noiseOnly++; continue; }
    differing++;
    if (differing <= 5) {
      console.log(`        ${k}  asc ${a.hash}  desc ${b.hash}  shuf ${c.hash}`
        + `   RMSE ${d.rmse.toFixed(3)}  r ${d.r.toFixed(6)}`);
    }
  }
  if (noiseOnly) console.log(`  note  ${noiseOnly}/${plan.length} sample(s) differ only below the`
    + ` RMSE ${NOISE} noise floor — same picture, a few pixels apart`);
  differing ? fail(`ORDER: ${differing}/${plan.length} samples depend on render order`)
            : console.log(`  ok    ORDER: all ${plan.length} samples reproduce across three orderings`);

  // 4. STATE — reported next to order because it explains it
  let stateDiff = 0;
  for (const s of plan) {
    const k = key(s);
    const [a, b] = [runs.ascending.get(k), runs.descending.get(k)];
    const sa = JSON.stringify(a.state), sb = JSON.stringify(b.state);
    if (sa !== sb) {
      stateDiff++;
      if (stateDiff <= 3) {
        const A = a.state ?? {}, B = b.state ?? {};
        const fields = [...new Set([...Object.keys(A), ...Object.keys(B)])]
          .filter((f) => JSON.stringify(A[f]) !== JSON.stringify(B[f]));
        console.log(`        ${k}  differs in: ${fields.join(', ') || '(unkeyed)'}`);
      }
    }
  }
  stateDiff ? fail(`STATE: ${stateDiff}/${plan.length} samples report a different state()`)
            : console.log('  ok    STATE: state() agrees across orderings');

  // 2. REPEAT
  let repeatDiff = 0, repeatNoise = 0;
  for (const s of plan.slice(0, Math.min(8, plan.length))) {
    const a = await shot(api.page, s), b = await shot(api.page, s);
    const d = compareShots(a, b);
    if (d.same) continue;
    if (d.noise) { repeatNoise++; continue; }
    repeatDiff++;
    console.log(`        ${key(s)} back-to-back differs   RMSE ${d.rmse.toFixed(3)}  r ${d.r.toFixed(6)}`);
  }
  if (repeatNoise) console.log(`  note  ${repeatNoise} sample(s) differ below the noise floor only`);
  repeatDiff ? fail(`REPEAT: ${repeatDiff} sample(s) change when rendered twice in a row`)
             : console.log('  ok    REPEAT: back-to-back renders reproduce');

  return { plan, asc: runs.ascending };
}).then(async ({ plan, asc }) => {
  // 3. ISOLATION — the cold side, and it needs its own page load per sample, so
  // keep it to a few. A warm harness cannot make this assertion about itself.
  const probes = plan.filter((_, i) => i % Math.ceil(plan.length / 4) === 0).slice(0, 4);
  let isoDiff = 0, isoNoise = 0;
  for (const s of probes) {
    await withDemo(prodName, extra, async (api) => {
      const fresh = await shot(api.page, s);
      const warm = asc.get(key(s));
      const d = compareShots(fresh, warm);
      if (d.same) return;
      if (d.noise) { isoNoise++; return; }
      isoDiff++;
      console.log(`        ${key(s)}  fresh ${fresh.hash}  in-run ${warm.hash}`
        + `   RMSE ${d.rmse.toFixed(3)}  r ${d.r.toFixed(6)}`);
    });
  }
  if (isoNoise) console.log(`  note  ${isoNoise} sample(s) differ below the noise floor only`);
  isoDiff ? fail(`ISOLATION: ${isoDiff}/${probes.length} samples differ from a fresh-page render`)
          : console.log(`  ok    ISOLATION: ${probes.length} fresh-page renders match the interleaved run`);

  console.log(failures
    ? `\n${failures} assertion(s) failed — render() is NOT repeatable, so sweep scores after the\n` +
      'first sample are of frames that depend on how they were reached.'
    : '\nrender() is repeatable: sweep scores are of the frames a viewer would see.');
  process.exit(failures ? 1 : 0);
});
