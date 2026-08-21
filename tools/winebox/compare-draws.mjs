// compare-draws.mjs — per-MESH agreement between the original and the port.
//
// MODE:       REPORT
// OBSERVABLE: vertex count per draw group, paired by SUBMISSION ORDER.
// UNITS:      counts are vertices, not triangles.
// PAIRING:    order, never count. A vertex count is not an identity — with three
//             clips live, two different effects both submitted 4719 vertices, and
//             pairing on that cost three wrong fixes and a -0.14 regression.
//
//   node tools/winebox/compare-draws.mjs <original gl.log> <port.jsonl>
//
// WHY THIS EXISTS, AND WHY r CANNOT DO IT.
//
// Pixel correlation is measured on the COMPOSITED frame. In a production whose
// effects overlap — which is what characterises the Sunflower demos — that makes
// it useless for attribution: at Wonder's capture 45.73 three clips are live and
// all three score r 0.29, because they are three names for one picture. Fixing
// one of them cannot show up as a gain while another still has a defect, so a
// correct change and a useless change look identical.
//
// Layer isolation does not rescue it. Rendering one clip alone produces something
// with no counterpart to compare against: the reference frame is composited, so
// isolating Wonder's effect_40f2f0 gives mean luma 6.9 against a reference of
// 43.9, and its r says more about what is missing than about what is wrong.
//
// The DRAW STREAM has neither problem. Each mesh submits its own vertices, the
// original's submission is recorded per frame, and the comparison is per mesh
// whatever else is on screen. So a mesh either agrees with the executable or it
// does not, independently of every other layer in the frame.
//
// MATCHING BY SIZE AND TRANSFORM. The original's texture ids are GL names assigned
// in upload order and the port's are its own; they do not correspond. Vertex counts
// do: a mesh that submits 2592 vertices submits 2592 in both.
//
// But vertex count alone is NOT injective across layers, and assuming it is produces
// confident wrong answers. At Wonder's capture 60.19 three clips are live and both
// sides have a 4719-vertex draw belonging to DIFFERENT effects; pairing them implied
// a change that cost 0.14 on two parts before the measurement caught it.
//
// So a draw is keyed by its size AND the modelview transform in force when it was
// issued — the translation and rotation the object was placed with, which both sides
// record (glTranslatef/glRotatef in the trace, `tr`/`rot` in the port recorder). Two
// draws of the same size at the same place are the same draw; two at different
// places are not.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const [logPath, portPath] = process.argv.slice(2);
if (!logPath || !portPath) {
  console.error('usage: node tools/winebox/compare-draws.mjs <gl.log> <port.jsonl>');
  process.exit(2);
}

/**
 * Draws as {n, xform}, where xform is the translate/rotate in force when the draw
 * was issued. Both sides emit these as ops in submission order, so replaying the
 * op list and remembering the most recent ones gives each draw its placement.
 */
function withTransforms(ops, drawRe) {
  const out = [];
  let tr = '', rot = [];
  for (const op of ops) {
    if (op.startsWith('tr ')) { tr = op.slice(3); rot = []; continue; }
    if (op.startsWith('rot ')) { rot.push(op.slice(4)); continue; }
    const m = drawRe.exec(op);
    if (!m || !(+m[1] > 0)) continue;
    // Prefer the MODELVIEW when the recorder carries one (`mv=`): meshes placed by
    // multMatrix emit no tr/rot at all, so those draws would otherwise have an
    // empty transform and pair on size alone. The translation row is enough to
    // separate draws of equal size, and it is what apitrace gives for the
    // executable via glLoadMatrixf.
    const mv = /mv=([-\d.,e]+)/.exec(op);
    const xform = mv ? mv[1].split(',').slice(12, 15).join(',') : `${tr}|${rot.join(';')}`;
    out.push({ n: +m[1], xform });
  }
  return out;
}

/** The original's draw groups, taken from the LAST stable frame. */
function originalGroups(log) {
  const tmp = `${process.env.TMPDIR ?? '/tmp'}/cmp-frames.jsonl`;
  execFileSync('node', [fileURLToPath(new URL('parse-gl-trace.mjs', import.meta.url)), log, '--out', tmp],
    { stdio: 'pipe' });
  const frames = fs.readFileSync(tmp, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  // The held instant is the SETTLED tail, not the whole run: the first frames are
  // startup, before the clock hold takes effect. Take the last frame whose op
  // count repeats, so a partially-drawn final frame cannot be picked.
  let chosen = frames[frames.length - 1];
  for (let i = frames.length - 2; i >= 1; i--) {
    if (frames[i].ops.length === frames[i - 1].ops.length) { chosen = frames[i]; break; }
  }
  return { frame: chosen.index, sizes: withTransforms(chosen.ops, /^prim \w+:(\d+):/) };
}

/** The port's draw groups, from tools/record-minigl-draws.mjs output. */
function portGroups(file) {
  const rec = JSON.parse(fs.readFileSync(file, 'utf8').trim().split('\n')[0]);
  return { part: rec.part, local: rec.local,
    sizes: withTransforms(rec.ops, /^(?:elems|prim \w+:)\s*(\d+):/) };
}

const O = originalGroups(logPath);
const P = portGroups(portPath);

// Greedy nearest-size matching. Exact matches are consumed first so a mesh that
// agrees exactly can never be paired against one that merely happens to be close.
const remaining = [...P.sizes];
const rows = [];
// Exact size AND identical transform first — an unambiguous pair can never be
// consumed by a merely-close one. Then exact size. Only then nearest size.
for (const pass of [2, 1, 0]) {
  for (const o of [...O.sizes].sort((a, b) => b.n - a.n)) {
    if (o.__done) continue;
    let bestI = -1, bestD = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = Math.abs(remaining[i].n - o.n);
      if (pass === 2 && !(d === 0 && remaining[i].xform === o.xform)) continue;
      if (pass === 1 && d !== 0) continue;
      if (d < bestD) { bestD = d; bestI = i; }
    }
    if (bestI < 0) continue;
    o.__done = true;
    rows.push({ original: o.n, port: remaining[bestI].n, how: pass, xf: remaining[bestI].xform === o.xform });
    remaining.splice(bestI, 1);
  }
}
for (const o of O.sizes) if (!o.__done) rows.push({ original: o.n, port: null });

const sum = (a) => a.reduce((t, x) => t + x.n, 0);
console.log(`original: ${logPath}  (frame ${O.frame}, ${O.sizes.length} groups, ${sum(O.sizes)} vertices)`);
console.log(`port:     ${P.part} local ${P.local}  (${P.sizes.length} groups, ${sum(P.sizes)} vertices)\n`);
console.log('  original     port      delta   pair   verdict');
let exact = 0;
for (const r of rows.sort((a, b) => b.original - a.original)) {
  if (r.port === null) { console.log(`  ${String(r.original).padStart(8)}   (none)        —    —     MISSING in port`); continue; }
  const d = r.port - r.original;
  if (d === 0) exact++;
  const pct = r.original ? (100 * d / r.original) : 0;
  // How the pair was made matters as much as the delta: a size-only pair across
  // several live layers may not be the same draw at all.
  const how = r.how === 2 ? 'SIZE+XF' : r.how === 1 ? 'size' : 'near';
  console.log(`  ${String(r.original).padStart(8)}  ${String(r.port).padStart(7)}  ${(d >= 0 ? '+' : '') + String(d).padStart(6)}  ${how.padEnd(7)}${
    d === 0 ? 'exact' : `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%  ${d > 0 ? 'port draws MORE' : 'port draws FEWER'}`}`);
}
for (const extra of remaining) console.log(`  (none)    ${String(extra.n).padStart(7)}       —    —     EXTRA in port`);
const confident = rows.filter((r) => r.how === 2).length;
console.log(`\n  ${exact}/${rows.length} groups match exactly`);
console.log(`  ${confident}/${rows.length} pairs confirmed by TRANSFORM as well as size`
  + (confident < rows.length ? ' — treat the rest as unproven pairings' : ''));
