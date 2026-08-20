// catchupcheck.mjs — does a cheap catch-up leave the scene where a full one does?
//
//   node work/re/catchupcheck.mjs
//
// `engine.advance` exists so that a dropped frame costs the animation and not
// the geometry: the page has to step every tick or the loop origins and
// keyframe cursors fall behind, but the vertices a skipped tick produces are
// thrown away the moment they are returned. The saving is only legitimate if
// the two paths leave IDENTICAL state, and "identical" here has to mean the
// draws, not a spot check on a couple of channels — a scene's animation reaches
// the picture through matrices, hierarchy composition and per-vertex channel
// blocks, and a difference in any of them is a difference in what is drawn.
//
// So: walk a span of ticks two ways.
//
//   A  every tick through `frame`, the way an unloaded machine runs it
//   B  every tick but the last through `advance`, then the last through `frame`
//
// and compare A's last frame with B's, primitive by primitive and float by
// float. They have to be bit-identical, because the arithmetic is the same
// arithmetic — this is not a tolerance check.
//
// It also checks the OTHER direction, which is the one that would make the
// optimisation pointless: that stepping matters at all. Walking the same span
// while skipping ticks entirely must NOT reproduce the frame, or the catch-up
// loop is dead code and the spiral it causes was never worth having.
import { createEngine } from '../../web/js/engine.js';
import { sinus } from '../../web/js/tables.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '../../web/data');
const read = (f) => new Uint8Array(fs.readFileSync(path.join(DATA, f)));
const schedule = JSON.parse(fs.readFileSync(path.join(DATA, 'showorder.json')));

let failures = 0;
const say = (ok, what, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

const build = () => createEngine({
  seg0: read('seg0.bin'), seg3: read('seg3.bin'), seg4: read('seg4.bin'),
  table: sinus(),
});

/** Every number a frame produces, flattened, so nothing hides in a nested field. */
function flatten(draws) {
  const out = [];
  const walk = (v) => {
    if (v == null) { out.push(NaN); return; }
    if (typeof v === 'number') { out.push(v); return; }
    if (typeof v === 'boolean') { out.push(v ? 1 : 0); return; }
    if (typeof v === 'string') { out.push(v.length); return; }
    if (Array.isArray(v) || ArrayBuffer.isView(v)) { for (const x of v) walk(x); return; }
    if (typeof v === 'object') { for (const k of Object.keys(v).sort()) walk(v[k]); }
  };
  walk(draws);
  return out;
}

const differ = (a, b) => {
  if (a.length !== b.length) return `length ${a.length} vs ${b.length}`;
  for (let i = 0; i < a.length; i++) {
    if (Object.is(a[i], b[i])) continue;
    if (Number.isNaN(a[i]) && Number.isNaN(b[i])) continue;
    return `first difference at ${i}: ${a[i]} vs ${b[i]}`;
  }
  return null;
};

// One entry per scene that introduces a slot, plus the spans the show replays
// under a second camera — those carry the accumulated state furthest.
const CASES = [];
for (const part of ['p1', 'p3']) {
  let slot = null;
  for (const e of schedule[part].schedule) {
    if (e.slot) slot = e.slot;
    if (!slot || (e.durTicks ?? 0) < 60) continue;
    CASES.push({ part, slot, start: e.startTick ?? 0, span: Math.min(120, e.durTicks) });
  }
}

console.log(`${CASES.length} spans, walked two ways each\n`);

let checked = 0;
for (const c of CASES) {
  const eA = build(), eB = build();
  const orderA = eA.orderOfSlot(c.part, c.slot);
  const orderB = eB.orderOfSlot(c.part, c.slot);
  if (orderA == null || orderB == null) continue;

  // A cue every 16 ticks, CYCLING 2..11. The value matters: `_calc_matrix`
  // compares it against each node's trigger byte, and the drawing nodes use
  // 2 to 11 — a constant 1 would match nothing and leave the very state this
  // check exists to exercise untouched.
  const cue = (t) => (t % 16 === 0 ? 2 + ((t / 16) % 10) : -1);

  let last = null;
  for (let t = 0; t <= c.span; t++) last = eA.frame(c.part, orderA, t, cue(t), 0);
  const A = flatten(last);

  for (let t = 0; t < c.span; t++) eB.advance(c.part, orderB, t, cue(t));
  const B = flatten(eB.frame(c.part, orderB, c.span, cue(c.span), 0));

  const d = differ(A, B);
  say(d === null, `${c.part} ${c.slot} — advance leaves the same frame as step`,
    d ?? `${A.length} numbers over ${c.span} ticks`);
  checked++;
}

// THE CONTROL, and it is not a formality. If skipping the intervening ticks
// reproduced the frame anyway, the catch-up loop would be dead work and the
// spiral it causes would be pure cost.
//
// It is measured per scene rather than asserted once, because the answer is
// per scene: a node whose channels are a pure function of the tick does not
// care how it got there, and a node with a looping mode or a beat trigger very
// much does. What has to be true is that SOME scenes care — otherwise the
// cheap catch-up should be no catch-up at all.
{
  let stateful = 0, stateless = 0;
  const cue = (t) => (t % 16 === 0 ? 2 + ((t / 16) % 10) : -1);
  for (const c of CASES) {
    const eA = build(), eC = build();
    const oA = eA.orderOfSlot(c.part, c.slot), oC = eC.orderOfSlot(c.part, c.slot);
    if (oA == null || oC == null) continue;
    let last = null;
    for (let t = 0; t <= c.span; t++) last = eA.frame(c.part, oA, t, cue(t), 0);
    const A = flatten(last);
    const C = flatten(eC.frame(c.part, oC, c.span, cue(c.span), 0));
    if (differ(A, C) === null) stateless++; else stateful++;
  }
  say(stateful > 0, 'the control: stepping every tick changes the picture',
    `${stateful} of ${stateful + stateless} spans depend on being stepped, `
    + `${stateless} are a pure function of the tick`);
}

console.log(`\n${checked} spans compared`);
console.log(failures
  ? `${failures} FAILED — advance is not equivalent to step`
  : 'a cheap catch-up is exactly as good as an expensive one');
process.exit(failures ? 1 : 0);
