#!/usr/bin/env node
// parse-gl-trace.mjs — turn a Wine +opengl log into a per-frame draw stream.
//
//   node parse-gl-trace.mjs <gl.log> [--out frames.jsonl] [--min-frames N]
//                           [--summary] [--frame N]
//
// The log is the original program's own call stream, in call order. This turns
// it into the thing a reimplementation can be diffed against: one record per
// frame, each holding the primitives the engine actually submitted, the texture
// bound to each, and the matrix operations around them.
//
// ORDERING IS THE CHECK. METHOD.md: "output appended to a cursor comes out in
// call order, so the Nth call is the Nth result." Primitives are therefore kept
// as an ordered list and digested in order — never bucketed by type and counted,
// which is the weak test that cannot distinguish two producers sharing a value.
//
// Exit codes: 0 parsed and consistent · 1 malformed or below --min-frames
//             77 no trace lines at all (absent, not empty)
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const argv = process.argv.slice(2);
const path = argv.find((a) => !a.startsWith('--'));
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]) ?? true;
};
if (!path) { console.error('usage: parse-gl-trace.mjs <gl.log> [--out f.jsonl] [--min-frames N] [--summary] [--frame N]'); process.exit(2); }

// Wine line shape:  0024:trace:opengl:glRotatef angle 0.000000, x 0.000000, ...
const LINE = /^([0-9a-f]+):trace:opengl:(\w+)(?:\s+(.*))?$/;

// GL enums this engine actually uses. Named rather than numeric because a draw
// stream full of 3553 and 5121 is not reviewable, and review is the point.
const ENUM = {
  0: 'POINTS', 1: 'LINES', 2: 'LINE_LOOP', 3: 'LINE_STRIP', 4: 'TRIANGLES',
  5: 'TRIANGLE_STRIP', 6: 'TRIANGLE_FAN', 7: 'QUADS', 8: 'QUAD_STRIP', 9: 'POLYGON',
  3553: 'TEXTURE_2D', 6408: 'RGBA', 5121: 'UNSIGNED_BYTE',
  33984: 'TEXTURE0', 33985: 'TEXTURE1', 33986: 'TEXTURE2',
};
const name = (v) => ENUM[v] ?? v;

function parseArgs(rest) {
  if (!rest) return {};
  const out = {};
  for (const part of rest.split(', ')) {
    const m = part.match(/^(\w+)\s+(.*)$/);
    if (!m) continue;
    const v = Number(m[2]);
    out[m[1]] = Number.isNaN(v) ? m[2] : v;
  }
  return out;
}

const raw = readFileSync(path, 'latin1').split('\n');
const calls = [];
for (const line of raw) {
  const m = line.match(LINE);
  if (!m) continue;                       // ALSA noise, fixme:, wgl returning ...
  calls.push({ tid: m[1], fn: m[2], a: parseArgs(m[3]) });
}
if (calls.length === 0) {
  console.error(`${path}: no trace:opengl lines — was WINEDEBUG=+opengl set? (absent)`);
  process.exit(77);
}

// --- segment into frames on glClear, and build each frame's draw stream.
const frames = [];
let cur = null;
let prim = null;                          // open glBegin block
let boundTex = 0, activeUnit = 'TEXTURE0';
let unbalanced = 0;

// A frame's content is its ORDERED op stream. The first version of this tool
// digested only glBegin/glEnd primitives and reported "2 distinct frames" across
// a 160-second demo -- because this engine compiles its geometry into DISPLAY
// LISTS once at load and then draws by replaying them. 1117 of 1118 frames
// contained no glBegin at all, so the digest was blind to the entire show.
// Whatever the engine varies per frame is what the oracle has to capture: here
// that is the matrix stack, the texture bound, and which lists are called.
const startFrame = () => ({
  index: frames.length, calls: 0, ops: [], prims: [], binds: [], uploads: [],
  matrix: 0, lists: 0, enables: [],
});
const r3 = (v) => (typeof v === 'number' ? Math.round(v * 1000) / 1000 : v);

for (const c of calls) {
  if (c.fn === 'glClear') {
    if (cur) frames.push(cur);
    cur = startFrame();
  }
  if (!cur) cur = startFrame();           // calls before the first clear = setup
  cur.calls++;

  switch (c.fn) {
    case 'glBegin':
      if (prim) unbalanced++;
      prim = { mode: name(c.a.mode), verts: 0, tex: boundTex, unit: activeUnit };
      break;
    case 'glEnd':
      if (!prim) { unbalanced++; break; }
      cur.prims.push(prim);
      cur.ops.push(`prim ${prim.mode}:${prim.verts}:t${prim.tex}`);
      prim = null;
      break;
    case 'glVertex3f': case 'glVertex3fv': case 'glVertex2f': case 'glArrayElement':
      if (prim) prim.verts++;
      break;
    case 'glBindTexture':
      boundTex = c.a.texture;
      cur.binds.push({ target: name(c.a.target), texture: c.a.texture });
      cur.ops.push(`bind ${c.a.texture}@${activeUnit}`);
      break;
    case 'glActiveTextureARB':
      // Wine names this argument `texture`, not `target` (glMultiTexCoord2fARB
      // uses `target`, which is what made the first version emit `@undefined`).
      activeUnit = name(c.a.texture ?? c.a.target); break;
    case 'glTexImage2D':
      // pixels is a host pointer and varies run to run — deliberately dropped.
      cur.uploads.push({ level: c.a.level, w: c.a.width, h: c.a.height,
                         format: name(c.a.format), type: name(c.a.type) });
      break;
    case 'glCallList':
      cur.lists++;
      cur.ops.push(`list ${c.a.list}`);
      break;
    case 'glRotatef':
      cur.matrix++;
      cur.ops.push(`rot ${r3(c.a.angle)} ${r3(c.a.x)},${r3(c.a.y)},${r3(c.a.z)}`); break;
    case 'glTranslatef':
      cur.matrix++; cur.ops.push(`tr ${r3(c.a.x)},${r3(c.a.y)},${r3(c.a.z)}`); break;
    case 'glScalef':
      cur.matrix++; cur.ops.push(`sc ${r3(c.a.x)},${r3(c.a.y)},${r3(c.a.z)}`); break;
    case 'glMultMatrixf': case 'glLoadIdentity': case 'glPushMatrix': case 'glPopMatrix':
      cur.matrix++; break;
    case 'glEnable': case 'glDisable':
      cur.enables.push(`${c.fn === 'glEnable' ? '+' : '-'}${name(c.a.cap)}`); break;
  }
}
if (cur) frames.push(cur);

// A frame's identity is its ORDERED op stream, not a histogram of it.
for (const f of frames) {
  const canon = f.ops.join('|');
  f.verts = f.prims.reduce((n, p) => n + p.verts, 0);
  f.digest = createHash('sha256').update(canon).digest('hex').slice(0, 12);
}

const minFrames = Number(opt('min-frames', 0));
const out = opt('out');
if (out) {
  writeFileSync(out, frames.map((f) => JSON.stringify(f)).join('\n') + '\n');
  console.log(`wrote ${out} (${frames.length} frames)`);
}

const one = opt('frame');
if (one !== null && one !== true) {
  const f = frames[Number(one)];
  if (!f) { console.error(`no frame ${one} (have ${frames.length})`); process.exit(1); }
  console.log(JSON.stringify(f, null, 2));
}

if (opt('summary') || (!out && one === null)) {
  const drawn = frames.filter((f) => f.ops.length);
  const uniq = new Set(frames.map((f) => f.digest));
  console.log(`${path}`);
  console.log(`  gl calls        ${calls.length}`);
  console.log(`  frames          ${frames.length}  (${drawn.length} with draw ops)`);
  console.log(`  distinct frames ${uniq.size}`);
  console.log(`  draw ops        ${frames.reduce((n, f) => n + f.ops.length, 0)}`);
  console.log(`  display lists   ${frames.reduce((n, f) => n + f.lists, 0)}`);
  console.log(`  primitives      ${frames.reduce((n, f) => n + f.prims.length, 0)}`);
  console.log(`  vertices        ${frames.reduce((n, f) => n + f.verts, 0)}`);
  console.log(`  texture uploads ${frames.reduce((n, f) => n + f.uploads.length, 0)}`);
  const mean = drawn.length ? (frames.reduce((n, f) => n + f.calls, 0) / frames.length) : 0;
  console.log(`  calls/frame     ${mean.toFixed(1)}`);
}

// An oracle that returns the same answer for every frame is not an oracle. This
// asserts the property the tool exists to provide, so it cannot quietly vanish
// the way the display-list blindness above did.
const distinct = new Set(frames.map((f) => f.digest)).size;
// --frozen: a run with the clock pinned by the BASS stub is SUPPOSED to repeat
// itself, so the few-distinct-digests check would be a false alarm there. It is
// opt-out rather than automatic: an accidentally-frozen run must still fail.
if (!opt('frozen') && frames.length >= 10 && distinct < 3) {
  console.error(`FAIL: ${frames.length} frames but only ${distinct} distinct digest(s) — ` +
                `the parser is not capturing whatever this engine varies per frame`);
  process.exit(1);
}
if (unbalanced) {
  console.error(`FAIL: ${unbalanced} unbalanced glBegin/glEnd — the trace is truncated or misparsed`);
  process.exit(1);
}
if (frames.length < minFrames) {
  console.error(`FAIL: ${frames.length} frames, expected at least ${minFrames}`);
  process.exit(1);
}
