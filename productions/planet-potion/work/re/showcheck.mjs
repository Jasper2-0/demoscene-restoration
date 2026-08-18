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
const engine = createEngine({
  seg0, seg3, seg4, table: sinus(),
  layoutText: (t) => layoutText(glyphs, t),
});

// Every 25 ticks — half a second of a 50 Hz show. Fine enough that a scene
// which only draws briefly is still seen, coarse enough to finish.
const STEP = Number(process.env.SHOWSTEP ?? 25);

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

for (const f of failures) console.log(`     ${f}`);
if (failed) process.exit(1);
console.log('\nthe schedule runs end to end through the engine');
