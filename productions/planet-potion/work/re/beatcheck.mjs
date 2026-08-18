// beatcheck.mjs — the beat sync, driven by the music's own cues.
//
//   node work/re/beatcheck.mjs [mods/]
//
// EVERY OTHER SUITE PASSES musicSignal = -1. `showcheck` does, `pipeline` does,
// and `capsweep` reaches the engine through the page. -1 matches no trigger, so
// the whole beat-sync path — `localTime`'s mode-0 reset — was never once
// exercised by a check, and 59 nodes across the demo depend on it.
//
// What it drives: part one's OVERLAY is entirely beat-triggered. All ten of its
// drawing nodes are mode 0 with triggers 2 to 11, and it is composited into
// every other part-one scene, so it is the layer the whole part is seen
// through. Part three has 39 more mode-0 nodes spread over nine scenes.
//
// THE BUG THIS EXISTS TO CATCH. The overlay runs on the PART's clock, not on
// each scene's. Stepped on the scene's local tick it restarts at every scene
// boundary and replays its opening full-screen quads, and part one plays under
// a permanent halftone layer — 56,210 primitives instead of 8,162, on screen
// 87% of the time instead of 46%. Both numbers are asserted below, the wrong
// one as a CONTROL: a check that only measured the right clock would pass just
// as happily with the overlay stepped on the wrong one, because nothing about
// 56,210 primitives looks like an error from inside the engine.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEngine } from '../../web/js/engine.js';
import { sinus } from '../../web/js/tables.js';
import { glyphTable, layoutText } from '../../web/js/font.js';
import { parseDBM } from '../../web/js/dbm.js';
import { Sequencer } from '../../web/js/dbmplayer.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(HERE, '..', '..', 'web', 'data');
const MODS = process.argv[2] ?? path.join(HERE, 'mods');

const NEED = ['seg0.bin', 'seg3.bin', 'seg4.bin', 'showorder.json']
  .map((f) => path.join(DATA, f)).concat([path.join(MODS, 'part1_full.dbm')]);
for (const f of NEED) {
  if (!fs.existsSync(f)) {
    console.log(`beatcheck: need ${f} — run work/re/export.py and the synth. Skipping.`);
    process.exit(ABSENT);
  }
}

const seg0 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg0.bin')));
const seg3 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg3.bin')));
const seg4 = new Uint8Array(fs.readFileSync(path.join(DATA, 'seg4.bin')));
const show = JSON.parse(fs.readFileSync(path.join(DATA, 'showorder.json'), 'utf8'));
const glyphs = glyphTable(seg0);
const mk = () => createEngine({
  seg0, seg3, seg4, table: sinus(),
  layoutText: (t) => layoutText(glyphs, t),
});

const cues = new Map();
{
  const seq = new Sequencer(parseDBM(
    new Uint8Array(fs.readFileSync(path.join(MODS, 'part1_full.dbm')))));
  for (const c of seq.run().cues ?? []) cues.set(c.ticks50, c.value);
}

// The schedule, with the slot inherited by continuation entries exactly as the
// page does it — eleven of thirty-nine carry none.
const spans = [];
{
  let slot = null;
  for (const e of show.p1.schedule) {
    if (e.slot) slot = e.slot;
    spans.push({ slot, start: e.startTick, dur: e.durTicks });
  }
}

/** Walk part one, stepping the overlay on `clock`. -> {lit, ticks, prims} */
function walk(sceneClock) {
  const engine = mk();
  engine.rewindScene('p1', engine.overlay.order);
  let lit = 0, ticks = 0, prims = 0;
  for (const sp of spans) {
    const order = engine.orderOfSlot('p1', sp.slot);
    if (order === null || order === engine.overlay.order) continue;
    for (let k = 0; k < sp.dur; k++) {
      const t = sp.start + k;
      const d = engine.frame('p1', engine.overlay.order,
        sceneClock ? k : t, cues.get(t) ?? -1);
      ticks++;
      if (d.length) { lit++; prims += d.length; }
    }
  }
  return { lit, ticks, prims };
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

// --- the triggers are really there, and they are really mode 0
const engine = mk();
const ov = engine.scene('p1', engine.overlay.order);
const triggered = ov.anims
  .map((a, i) => ({ i, mode: (a.flags2 & 0xe0) >> 5, trigger: a.trigger }))
  .filter((n) => n.mode === 0);
let mode0 = 0;
for (const part of ['p1', 'p3']) {
  for (let o = 0; o < engine.counts[part]; o++) {
    const S = engine.scene(part, o);
    S.anims.forEach((a) => { if (((a.flags2 & 0xe0) >> 5) === 0) mode0++; });
  }
}
console.log(`${cues.size} effect-7 cues in part one's music, `
  + `${mode0} beat-triggered nodes across the demo\n`);

ok('every drawing node of part one\'s overlay is beat-triggered',
  triggered.length === ov.nodes.length - 1,
  `${triggered.length} of ${ov.nodes.length - 1}, triggers `
  + `${Math.min(...triggered.map((n) => n.trigger))}-`
  + `${Math.max(...triggered.map((n) => n.trigger))}`);
// TWO OF THE TEN NEVER FIRE, and that is the data rather than a fault: part
// one's music sends effect-7 values 0-6 and 9-11 and never 7 or 8, so the nodes
// carrying those triggers keep whatever state they were built with for the
// whole part. Pinned as a SET so that a change to how cues are read out of the
// module — which is a different subsystem from the audio the replayer is
// verified against — has to be noticed here rather than quietly waking two
// nodes up or putting two more to sleep.
const values = new Set(cues.values());
const unsent = triggered.map((n) => n.trigger).filter((v) => !values.has(v));
ok('the music supplies the triggers the overlay waits on, bar a pinned two',
  unsent.join(',') === '7,8',
  `${values.size} distinct cue values; ${unsent.length} trigger(s) never sent: `
  + `${unsent.join(', ') || 'none'}`);

// --- and the sync actually fires
const right = walk(false);
ok('the overlay flashes rather than sitting on the screen',
  right.lit > 0 && right.lit < right.ticks * 0.6,
  `on ${right.lit} of ${right.ticks} ticks `
  + `(${(100 * right.lit / right.ticks).toFixed(1)}%), ${right.prims} primitives`);

// CONTROL. The same walk on the scene's clock has to come out MATERIALLY
// worse, or the assertion above is not measuring the clock at all.
const wrong = walk(true);
ok('stepped on the scene clock it does not — the control',
  wrong.prims > right.prims * 3,
  `${wrong.prims} primitives on ${wrong.lit} of ${wrong.ticks} ticks `
  + `(${(100 * wrong.lit / wrong.ticks).toFixed(1)}%) — `
  + `${(wrong.prims / right.prims).toFixed(1)}x the right clock`);

// A REGRESSION PIN, not an oracle: the capture cannot count primitives. It is
// here so that a change to the loop modes or to `localTime` has to be noticed
// and re-blessed rather than silently altering how much of part one is
// covered.
const PINNED = { lit: 6686, prims: 8162 };
ok('the overlay covers exactly as much of part one as when last measured',
  right.lit === PINNED.lit && right.prims === PINNED.prims,
  `${right.lit} ticks / ${right.prims} primitives `
  + `(pinned ${PINNED.lit} / ${PINNED.prims})`);

if (failed) process.exit(1);
console.log('\nthe beat sync fires: the overlay is driven by the music\'s own '
  + 'cues, on the part\'s clock');
