// repeat_test.mjs — does __ptctSeek(t) give the same frame however you got there?
//
//   node productions/ptct/work/verify/repeat_test.mjs
//
// ptct replays the timeline from 0 on every seek, so `ev.dead` and the layer
// clocks are correctly reset. The EFFECT OBJECTS are not: they are built once in
// boot() and shared across every seek, so anything they latch survives. Two did:
//
//   eff3c_pleaseit  flash[] held the last RENDERED frame's ticks, because
//                   trigger() was called without a clock and had to reconstruct
//                   "now" from render(). The replay fires triggers WITHOUT
//                   rendering, so the value came from the previous seek's final
//                   frame. flash[] also survives a seek entirely — a slot is
//                   cleared only when its age expires.
//   eff12_titleboard  t0 latched on the FIRST RENDER EVER, so seeking to 520s
//                   and then 490s gave a negative dt.
//
// That breaks the repeatability the inspector contract requires
// (tools/inspect/ADAPTER.md): a sweep renders many samples in one page load, so
// sample N would silently decide what sample N+1 looks like.
//
// NON-VACUITY, AND A LESSON PAID FOR. The first version of this test asserted on
// PIXELS only, and it passed on the pre-fix tree as well as the fixed one — i.e.
// it proved nothing. Two reasons, both worth knowing:
//
//   * eff12's t0 latched once per PAGE LOAD, so three orderings inside one page
//     all shared it. Only a FRESH PAGE could see the difference.
//   * eff3c's stale flash slots are usually VISUALLY INERT: the age reads as
//     expired, so they change no pixels while still being wrong state.
//
// So this asserts on window.__ptctProbe() — the effects' per-playthrough state —
// as well as on frames, and renders from a FRESH PAGE to compare against the
// warm run.
//
// MEASURED NON-VACUITY, 2026-08-15. Reinstating only eff3c's old latch
// (flash[p] = the last RENDERED frame's ticks, and a reset() that does not clear
// flash) while KEEPING probe():
//
//   STATE      FAIL  8/25 samples reach a different effect state
//   ISOLATION  FAIL  3/3 fresh-page seeks differ from the warm run
//   ORDER      ok    <- and this is the point
//   REPEAT     ok    <-
//
// ORDER and REPEAT pass in BOTH trees because a stale flash slot is usually
// visually inert: its age reads as expired, so it changes no pixels while still
// being wrong state. A pixel-only version of this test passed before and after
// the fix and proved nothing.
//
// To re-check non-vacuity, do the same hybrid — revert the BEHAVIOUR but keep
// probe(). A plain `git stash` will not do it: main.js carries __ptctProbe, so
// stashing removes the instrument along with the fix and STATE compares null to
// null. That mistake is how the first non-vacuity check came back green.
import crypto from 'node:crypto';
import { withPage } from '../../../../tools/harness/index.mjs';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

// Sample set. The two known latches live at eff12's arm (~08:00) and inside
// eff3c's flash window (24:00-26:00), so those are probed explicitly rather than
// left to a grid that could straddle them. The rest is a spread across the show.
const HOTSPOTS = [478, 484, 490, 496, 502, 1444, 1452, 1460, 1468, 1476, 1484, 1492];
const SPREAD = [12, 60, 120, 200, 300, 400, 560, 640, 720, 900, 1100, 1300, 1560];
const SAMPLES = [...new Set([...HOTSPOTS, ...SPREAD])].sort((a, b) => a - b);

const shot = async (page, t) => {
  const o = await page.evaluate((x) => {
    window.__ptctSeek(x);
    return { png: document.querySelector('canvas').toDataURL('image/png'),
             probe: JSON.stringify(window.__ptctProbe?.() ?? null) };
  }, t);
  return { hash: sha(o.png), probe: o.probe };
};

let failures = 0;
const check = (ok, msg) => { if (ok) console.log(`  ok    ${msg}`); else { failures++; console.log(`  FAIL  ${msg}`); } };

await withPage({ root: 'productions/ptct', path: '/web/index.html', query: '?debug&t=0',
  width: 640, height: 480, viewport: { width: 640, height: 480 } }, async ({ page }) => {
  await page.waitForFunction('window.__ptctReady === true', { timeout: 120000 });
  console.log(`repeat_test: ${SAMPLES.length} samples`);

  const asc = new Map();
  for (const t of SAMPLES) asc.set(t, await shot(page, t));
  const desc = new Map();
  for (const t of [...SAMPLES].reverse()) desc.set(t, await shot(page, t));
  let seed = 4242;
  const shuffled = [...SAMPLES].sort(() => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff) - 0.5);
  const shuf = new Map();
  for (const t of shuffled) shuf.set(t, await shot(page, t));

  // 1. ORDER INDEPENDENCE
  const bad = SAMPLES.filter((t) => asc.get(t).hash !== desc.get(t).hash || asc.get(t).hash !== shuf.get(t).hash);
  bad.slice(0, 6).forEach((t) => console.log(`        t=${t}s  asc ${asc.get(t).hash}  desc ${desc.get(t).hash}`));
  // STATE, which sees what pixels cannot.
  const stateBad = SAMPLES.filter((t) => asc.get(t).probe !== desc.get(t).probe || asc.get(t).probe !== shuf.get(t).probe);
  stateBad.slice(0, 4).forEach((t) => console.log(`        t=${t}s state asc ${asc.get(t).probe.slice(0, 90)}`
    + `\n              state desc ${desc.get(t).probe.slice(0, 90)}`));
  check(stateBad.length === 0, `STATE: ${stateBad.length}/${SAMPLES.length} samples reach a different effect state`);
  check(bad.length === 0, `ORDER: ${bad.length}/${SAMPLES.length} samples depend on seek order`);

  // 2. REPEAT
  let rep = 0;
  for (const t of SAMPLES.slice(0, 8)) { const a = await shot(page, t), b = await shot(page, t);
    if (a.hash !== b.hash || a.probe !== b.probe) rep++; }
  check(rep === 0, `REPEAT: ${rep} sample(s) change when seeked twice in a row`);

  // 3. reset() COMPLETENESS — a seek after a FAR-FUTURE seek must equal a seek
  //    reached only by replay from 0. This is what catches state that reset()
  //    misses, and it is the ptct analogue of sonnet's streamEntry refusal.
  let leak = 0;
  for (const t of HOTSPOTS.slice(0, 6)) {
    await shot(page, 1560);
    const after = await shot(page, t);
    if (after.hash !== asc.get(t).hash || after.probe !== asc.get(t).probe) {
      leak++; console.log(`        t=${t}s differs after a far-future seek`);
    }
  }
  check(leak === 0, `RESET: ${leak}/6 hotspots carry state across a far-future seek`);
  return asc;
}).then(async (asc) => {
  // 4. ISOLATION — a FRESH PAGE rendering one sample must match the warm run.
  //    This is the only assertion that can see state latched once per page load,
  //    which is exactly what eff12's t0 was.
  let iso = 0;
  for (const t of [490, 1460, 720]) {
    await withPage({ root: 'productions/ptct', path: '/web/index.html', query: '?debug&t=0',
      width: 640, height: 480, viewport: { width: 640, height: 480 } }, async ({ page }) => {
      await page.waitForFunction('window.__ptctReady === true', { timeout: 120000 });
      const fresh = await shot(page, t);
      if (fresh.hash !== asc.get(t).hash || fresh.probe !== asc.get(t).probe) {
        iso++; console.log(`        t=${t}s fresh-page differs from the warm run`);
      }
    });
  }
  check(iso === 0, `ISOLATION: ${iso}/3 samples differ from a fresh-page seek`);

  console.log(failures
    ? `\n${failures} assertion(s) failed — __ptctSeek is NOT repeatable.`
    : '\n__ptctSeek is repeatable: a frame does not depend on how it was reached.');
  process.exit(failures ? 1 : 0);
});
