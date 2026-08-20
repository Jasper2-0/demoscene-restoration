// showcheck.mjs — the whole show, stepped through the engine.
//
//   node work/re/showcheck.mjs
//
// `pipeline.mjs` compares 140 frames against the recording and says nothing
// about the other 21,775. This walks the SCHEDULE instead — every entry of both
// parts, every few ticks — and asserts the things a comparison cannot: that
// each entry resolves to a scene, that stepping never throws, and that no scene
// spends its whole span drawing nothing.
//
// It exists because the page's loop is the one part of the port with no oracle.
// The engine is checked frame by frame; what turns frames into a show is the
// schedule, and the schedule had a hole in it that no per-frame check could
// see: ELEVEN OF THE THIRTY-NINE ENTRIES CARRY NO SLOT. Nine are `new_camera`,
// which changes which camera renders and nothing else, and two are `dalej`,
// which simply carries on. Reading `slot` alone leaves those spans with no
// scene — a fifth of part one's back half frozen — and every frame-level suite
// passes throughout.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../../web/js/engine.js';
import { sinus } from '../../web/js/tables.js';
import { glyphTable, layoutText } from '../../web/js/font.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(HERE, '..', '..', 'web', 'data');
const NEED = ['seg0.bin', 'seg3.bin', 'seg4.bin', 'showorder.json']
  .map((f) => path.join(DATA, f));
for (const f of NEED) {
  if (!fs.existsSync(f)) {
    console.log(`showcheck: need ${f} — run work/re/export.py. Skipping.`);
    process.exit(ABSENT);
  }
}

const seg0 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg0.bin')));
const seg3 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg3.bin')));
const seg4 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg4.bin')));
const show = JSON.parse(fs.readFileSync(path.join(DATA, 'showorder.json'), 'utf8'));
const glyphs = glyphTable(seg0);
const mkEngine = () => createEngine({
  seg0, seg3, seg4, table: sinus(),
  layoutText: (t) => layoutText(glyphs, t),
});
const engine = mkEngine();

// Every 25 ticks — half a second of a 50 Hz show. Fine enough that a scene
// which only draws briefly is still seen, coarse enough to finish.
const STEP = Number(process.env.SHOWSTEP ?? 25);

// AND HOW LONG A TICK TAKES. "Real-time 50 Hz playback" is a claim with a
// number in it — 20 ms — and it had never been measured. This times a hundred
// CONSECUTIVE ticks of every scene, because the animation is stateful and a
// single frame in isolation is not what the show asks for.
//
// It is the CPU half only: the engine's arithmetic, not the GL calls the shim
// makes with the result. Generous on purpose — the point is that a change which
// makes a scene ten times slower fails here, not that this is a benchmark.
let worstMs = 0, worstScene = '';

let frames = 0, totalDraws = 0, threw = 0, noScene = 0, maxDraws = 0;
const deadSlots = [];
const failures = [];
const perPart = [];

for (const part of ['p1', 'p3']) {
  // The same continuation rule the page uses: a slotless entry inherits the
  // previous slot AND the tick the scene started on, so its clock runs on.
  let slot = null, sceneStart = 0;
  const sched = (show[part]?.schedule ?? []).map((e) => {
    if (e.slot) { slot = e.slot; sceneStart = e.startTick ?? 0; }
    return { ...e, slot, sceneStart };
  });
  let partFrames = 0, partDraws = 0;
  const bySlot = new Map();

  for (const e of sched) {
    const order = slot === null ? null : engine.orderOfSlot(part, e.slot);
    if (e.slot === null || order === null) {
      noScene++;
      failures.push(`${part} entry ${e.index} (${e.driver}) has no scene`);
      continue;
    }
    const base = (e.startTick ?? 0) - e.sceneStart;
    {
      const N = 100;
      for (let i = 0; i < 5; i++) engine.frame(part, order, base + i, -1, e.camera ?? 0);
      const t0 = process.hrtime.bigint();
      for (let i = 0; i < N; i++) {
        engine.frame(part, order, base + i, -1, e.camera ?? 0);
        if (part === 'p1' && order !== engine.overlay.order) {
          engine.frame(engine.overlay.part, engine.overlay.order, base + i, -1);
        }
      }
      const ms = Number(process.hrtime.bigint() - t0) / 1e6 / N;
      if (ms > worstMs) { worstMs = ms; worstScene = `${part}/${e.slot}`; }
    }
    for (let t = base; t < base + (e.durTicks ?? 0); t += STEP) {
      frames++; partFrames++;
      let n = 0;
      try {
        n = engine.frame(part, order, t, -1, e.camera ?? 0).length;
        // Part one draws the overlay into every scene but the overlay itself.
        if (part === 'p1' && order !== engine.overlay.order) {
          n += engine.frame(engine.overlay.part, engine.overlay.order, t, -1).length;
        }
      } catch (err) {
        threw++;
        if (failures.length < 8) {
          failures.push(`${part} ${e.slot} t=${t}: ${err.message}`);
        }
      }
      totalDraws += n; partDraws += n;
      if (n > maxDraws) maxDraws = n;
      bySlot.set(e.slot, Math.max(bySlot.get(e.slot) ?? 0, n));
    }
  }
  for (const [s, n] of bySlot) if (n === 0) deadSlots.push(`${part}/${s}`);
  perPart.push(`${part}: ${partFrames} frames, ${partDraws} draws`);
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${frames} frames stepped every ${STEP} ticks — ${perPart.join(', ')}\n`);

ok('every schedule entry resolves to a scene', noScene === 0,
  noScene ? `${noScene} without one` : `${show.p1.schedule.length
    + show.p3.schedule.length} entries, 11 of them continuations`);
ok('stepping the whole show never throws', threw === 0,
  threw ? `${threw} threw` : `${frames} frames`);
ok('no scene spends its entire span drawing nothing', deadSlots.length === 0,
  deadSlots.length ? deadSlots.join(' ') : 'all slots draw');
// A floor, not a target: the point is that the engine is producing a show
// rather than a handful of primitives, and that a regression to near-zero
// fails here even though every frame-level suite still passes.
ok('and it draws a show, not a handful of primitives', totalDraws > 200000,
  `${totalDraws} draws, busiest frame ${maxDraws}`);

// --- THE REPLAYED SCENES, AND WHETHER THEIR CAMERAS MOVE ------------------
//
// Part one plays 0x25da, 0x25d6 and 0x25de four times over: a `synchro` entry
// and then three `new_camera` ones, about 228 ticks each. Every camera node's
// track is 300 ticks long and CLAMPS at the end, so on one continuous scene
// clock camera 0 moves, camera 1 clamps part way and cameras 2 and 3 never
// move at all. `_play_scene_new_camera` restarts the clock — engine.restartScene
// — and that is what makes each camera play its own move.
//
// Measured as screen motion per tick, with the un-restarted clock as a CONTROL,
// because "the camera does not move" is not something the frame-level suites
// can see: every vertex is still bit-exact against the recording, and the
// recording samples each scene inside ONE of the four segments.
{
  const spans = [];
  let slot = null, sceneStart = 0;
  for (const e of show.p1.schedule) {
    if (e.slot) { slot = e.slot; sceneStart = e.startTick ?? 0; }
    spans.push({ slot, driver: e.driver, cam: e.camera ?? 0,
      start: e.startTick ?? 0, dur: e.durTicks ?? 0, sceneStart });
  }
  const REPLAYED = ['0x25da', '0x25d6', '0x25de'];

  /** Mean screen motion per tick, per camera segment. */
  const motion = (restart) => {
    // A FRESH ENGINE PER MEASUREMENT. `rewindScene` puts the origins and track
    // cursors back, but the two passes differ precisely in what they do to the
    // origins, and running them against one engine made the control report one
    // frozen segment instead of six — measuring the leftovers of the pass
    // before rather than the clock under test.
    const engine = mkEngine();
    const out = [];
    for (const target of REPLAYED) {
      const order = engine.orderOfSlot('p1', target);
      if (order === null) continue;
      engine.rewindScene('p1', order);
      const segs = spans.filter((x) => x.slot === target);
      const ss = segs[0].sceneStart;
      const acc = new Map();
      let prev = null;
      for (const sp of segs) {
        for (let t = sp.start; t < sp.start + sp.dur; t++) {
          const local = t - ss;
          if (restart && sp.driver === 'new_camera' && local === sp.start - ss) {
            engine.restartScene('p1', order, local);
          }
          const d = engine.frame('p1', order, local, -1, sp.cam);
          const cur = d.length
            ? d.slice(0, 20).flatMap((q) => [q.v[0].x, q.v[0].y]) : [];
          if (prev && prev.length === cur.length && cur.length) {
            let m = 0;
            for (let i = 0; i < cur.length; i++) m += Math.abs(cur[i] - prev[i]);
            const e = acc.get(sp.cam) ?? { s: 0, n: 0 };
            e.s += m / cur.length; e.n++; acc.set(sp.cam, e);
          }
          prev = cur;
        }
      }
      for (const [cam, e] of acc) {
        out.push({ slot: target, cam, px: e.n ? e.s / e.n : 0 });
      }
    }
    return out;
  };

  const live = motion(true);
  const stalled = live.filter((r) => r.px < 0.5);
  ok('every camera of every replayed scene moves', stalled.length === 0,
    `${live.length} segments across ${REPLAYED.length} scenes, slowest `
    + `${Math.min(...live.map((r) => r.px)).toFixed(2)} px/tick`
    + (stalled.length
      ? ` — stalled: ${stalled.map((r) => `${r.slot}/cam${r.cam}`).join(' ')}`
      : ''));

  // CONTROL, AS A RATIO RATHER THAN A THRESHOLD. Without the restart the later
  // cameras are past the end of their tracks and their own contribution is
  // frozen, but the scenes carry animated mesh nodes too and those keep moving,
  // so the measured figure does not fall to zero — it falls to about an eighth.
  // Asserting "frozen" here would be asserting something untrue and would fail
  // for the wrong reason; asserting the RATIO is what actually distinguishes
  // the two clocks.
  const held = motion(false);
  if (process.env.CAMDEBUG) {
    for (const r of held) console.log(`     [control] ${r.slot} cam${r.cam} ${r.px.toFixed(3)} px/tick`);
    for (const r of live) console.log(`     [live]    ${r.slot} cam${r.cam} ${r.px.toFixed(3)} px/tick`);
  }
  const later = (rows) => {
    const r = rows.filter((x) => x.cam >= 2);
    return r.reduce((t, x) => t + x.px, 0) / (r.length || 1);
  };
  const ratio = later(live) / (later(held) || 1e-9);
  ok('and they barely move without the clock restart — the control', ratio >= 3,
    `cameras 2 and 3 average ${later(live).toFixed(2)} px/tick restarted `
    + `against ${later(held).toFixed(2)} held — ${ratio.toFixed(1)}x`);
}

ok('a tick fits in the 50 Hz budget', worstMs < 20,
  `worst ${worstMs.toFixed(2)} ms of 20.00, at ${worstScene} — the engine's `
  + 'arithmetic, not the GL calls');

for (const f of failures) console.log(`     ${f}`);
if (failed) process.exit(1);
console.log('\nthe schedule runs end to end through the engine');
