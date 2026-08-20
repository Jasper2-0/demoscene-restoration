#!/usr/bin/env node
// extract-lists.mjs — recover the geometry the original compiled into display lists.
//
//   node extract-lists.mjs <gl.log> [--out lists.json] [--list N] [--summary]
//
// The Haujobb engines build their geometry ONCE at load, into GL display lists,
// and then draw by replaying them. The Wine +opengl trace records that
// compilation in full — glGenLists, glNewList(GL_COMPILE), the vertices, glEndList
// — so the trace contains the exact geometry the original submitted, per list, in
// allocation order.
//
// TWO DRAW PATHS, and only one puts positions in the trace. A couple of lists are
// built in immediate mode (glVertex3f), so their vertices are recorded outright.
// The rest bind VERTEX ARRAYS and draw with glArrayElement, and Wine logs only the
// array POINTER — the positions live in memory the trace cannot see. What those
// lists do record is better suited to checking a reader anyway: the ordered
// glArrayElement INDEX stream, which is exactly the face-corner index list, and the
// per-corner UVs, plus the texture bound and the state set around them.
//
// That makes this a geometry oracle for the .HJB and .OB3 readers: a reimplementation
// that produces the same vertices, in the same order, with the same UVs, is right
// for a reason you can point at. Allocation order is what ties a list id to the
// scene object that owns it, exactly as METHOD.md's recorder note describes —
// identity falls out of the order calls were made in, with no tag to decode.
//
// Exit: 0 lists found · 1 malformed · 77 no list compilation in the trace (absent)
import { readFileSync, writeFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const path = argv.find((a) => !a.startsWith('--'));
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]) ?? true;
};
if (!path) {
  console.error('usage: extract-lists.mjs <gl.log> [--out lists.json] [--list N] [--summary]');
  process.exit(2);
}

const LINE = /^([0-9a-f]+):trace:opengl:(\w+)(?:\s+(.*))?$/;
const MODE = { 0: 'POINTS', 1: 'LINES', 2: 'LINE_LOOP', 3: 'LINE_STRIP', 4: 'TRIANGLES',
               5: 'TRIANGLE_STRIP', 6: 'TRIANGLE_FAN', 7: 'QUADS', 8: 'QUAD_STRIP', 9: 'POLYGON' };

function args(rest) {
  const out = {};
  if (!rest) return out;
  for (const part of rest.split(', ')) {
    const m = part.match(/^(\w+)\s+(.*)$/);
    if (m) { const v = Number(m[2]); out[m[1]] = Number.isNaN(v) ? m[2] : v; }
  }
  return out;
}

const lists = [];
let cur = null, prim = null, uv = null, nrm = null, unit = 33984;
let unbalanced = 0;

for (const line of readFileSync(path, 'latin1').split('\n')) {
  const m = line.match(LINE);
  if (!m) continue;
  const fn = m[2], a = args(m[3]);
  switch (fn) {
    case 'glNewList':
      if (cur) unbalanced++;
      cur = { id: a.list, mode: a.mode, prims: [], binds: [], state: [] };
      break;
    case 'glEndList':
      if (!cur) { unbalanced++; break; }
      if (prim) { unbalanced++; cur.prims.push(prim); prim = null; }
      lists.push(cur); cur = null;
      break;
    case 'glBegin':
      if (!cur) break;                       // immediate-mode drawing, not compilation
      prim = { mode: MODE[a.mode] ?? a.mode, verts: [], corners: [] };
      break;
    case 'glEnd':
      if (cur && prim) { cur.prims.push(prim); prim = null; }
      break;
    // Texcoord and normal are CURRENT STATE: they are set before the vertex they
    // apply to, and persist. Latch them and attach at the glVertex, which is what
    // the fixed-function pipeline does.
    case 'glTexCoord2f': uv = [a.s, a.t]; break;
    case 'glMultiTexCoord2fARB': uv = [a.s, a.t]; unit = a.target; break;
    case 'glNormal3f': nrm = [a.nx, a.ny, a.nz]; break;
    case 'glVertex3f':
      if (prim) prim.verts.push({ p: [a.x, a.y, a.z], uv, n: nrm });
      break;
    // The array path: the index IS the recoverable datum. glNormal3fv logs only a
    // pointer, so normals are unavailable here and deliberately not faked.
    case 'glArrayElement':
      if (prim) prim.corners.push({ i: a.i, uv, unit });
      break;
    case 'glBindTexture':
      if (cur) cur.binds.push({ texture: a.texture, unit });
      break;
    case 'glActiveTextureARB': unit = a.texture; break;
    case 'glEnable': if (cur && !prim) cur.state.push(`+${a.cap}`); break;
    case 'glDisable': if (cur && !prim) cur.state.push(`-${a.cap}`); break;
    case 'glPolygonMode': if (cur) cur.state.push(`poly ${a.face}:${a.mode}`); break;
  }
}

if (!lists.length) {
  console.error(`${path}: no glNewList in the trace — nothing compiled (absent)`);
  process.exit(77);
}

for (const l of lists) {
  l.nverts = l.prims.reduce((n, p) => n + p.verts.length, 0);
  l.ncorners = l.prims.reduce((n, p) => n + p.corners.length, 0);
  l.path = l.nverts ? 'immediate' : (l.ncorners ? 'array' : 'empty');
  // Integral positions and /256 UVs are the .OB3 fixed-point signature; .HJB
  // carries float positions and float UVs. Reported, not assumed: the mapping
  // from a list to its source file is settled by comparing against the readers.
  const all = l.prims.flatMap((p) => p.verts);
  const cuv = l.prims.flatMap((p) => p.corners).map((c) => c.uv).filter(Boolean);
  l.uvIs256corners = cuv.length > 0 && cuv.every((c) =>
    c.every((x) => Math.abs(x * 256 - Math.round(x * 256)) < 1e-3));
  l.maxIndex = Math.max(-1, ...l.prims.flatMap((p) => p.corners).map((c) => c.i));
  l.integralPos = all.length > 0 && all.every((v) => v.p.every((c) => Number.isInteger(c)));
  l.uvIs256 = all.length > 0 && all.every((v) => v.uv === null ||
    v.uv.every((c) => Math.abs(c * 256 - Math.round(c * 256)) < 1e-3));
  l.hasNormals = all.some((v) => v.n !== null);
}

const out = opt('out');
if (out) { writeFileSync(out, JSON.stringify(lists, null, 1)); console.log(`wrote ${out}`); }

const one = opt('list');
if (one !== null && one !== true) {
  const l = lists.find((x) => x.id === Number(one));
  if (!l) { console.error(`no list ${one}`); process.exit(1); }
  console.log(JSON.stringify(l, null, 1));
}

if (opt('summary') || (!out && one === null)) {
  console.log(`${path}\n  ${lists.length} display lists compiled\n`);
  console.log(`${'id'.padStart(4)}${'path'.padStart(11)}${'verts'.padStart(7)}${'corners'.padStart(9)}${'maxIdx'.padStart(8)}${'tex'.padStart(6)}  uv/256`);
  for (const l of lists) {
    const tex = l.binds.map((b) => b.texture).join(',') || '-';
    const u = l.path === 'array' ? (l.uvIs256corners ? 'yes' : 'no')
            : l.path === 'immediate' ? (l.uvIs256 ? 'yes' : 'no') : '-';
    console.log(`${String(l.id).padStart(4)}${l.path.padStart(11)}${String(l.nverts).padStart(7)}` +
                `${String(l.ncorners).padStart(9)}${String(l.maxIndex).padStart(8)}${tex.padStart(6)}  ${u}`);
  }
  console.log(`\n  ${lists.filter((l) => l.path === 'immediate').length} immediate, ` +
              `${lists.filter((l) => l.path === 'array').length} array, ` +
              `${lists.filter((l) => l.path === 'empty').length} empty`);
  console.log(`  vertices ${lists.reduce((n, l) => n + l.nverts, 0)}, ` +
              `corners ${lists.reduce((n, l) => n + l.ncorners, 0)}`);
}

if (unbalanced) {
  console.error(`FAIL: ${unbalanced} unbalanced glNewList/glEndList or glBegin/glEnd`);
  process.exit(1);
}
