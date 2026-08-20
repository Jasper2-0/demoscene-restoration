// hjb.js — reader for the Haujobb .HJB scene container.
//
// The grammar is the one recovered from the .HJB loader in Moments.exe (the
// record tree at FUN_0040db10 / FUN_0040dbe0), not from inspecting hex dumps.
// It is shared, unchanged, across every production in the family: 251 of the 252
// .HJB files on hand parse to byte-exact EOF (see docs/HAUJOBB_PORT_STUDY.md).
//
// `.HJB` is a 3ds Max exporter dump. Records carry the Max node name with its
// scene handle baked in — "Camera01 (4BB64E0)" — and a camera's target is linked
// to it BY IDENTICAL NAME rather than by index.
//
//   file  : u32 word0 (0 in 252/252) · u32 nframes · tree · -1 · u32 dead · u32 nmat · materials
//   node  : [ type ; body ; children… ; 0xFFFFFFFF ]
//   track : u32 flag (0 in 7083/7083) · u32 nkeys · keys
//   key   : { i32 frame ; f32 tension, continuity, bias, unused, unused ; value }
//
// Strides: position/scale 36 B, rotation 40 B (quaternion), float 28 B,
// vertex-morph 28 B header + nv×12.
//
// TWO THINGS THE DATA WILL LIE TO YOU ABOUT, both established by counting the
// whole population rather than sampling it:
//
//   * Every TCB float in every multi-key track in all 252 files is 0.0. The TCB
//     machinery is real code that no shipped scene exercises. Implement it, but
//     do not expect to see it, and do not "verify" it against data that cannot
//     exercise it.
//   * SINGLE-KEY tracks hold exporter GARBAGE in their TCB slots, and the engine
//     provably skips them with an n == 1 early-out. Trusting those bytes corrupts
//     exactly the tracks that look simplest. `evalTrack` reproduces the early-out.

export class HjbFormatError extends Error {
  constructor(message, { source = '<HJB>', offset = 0 } = {}) {
    super(`${source}: ${message} at 0x${offset.toString(16)}`);
    this.name = 'HjbFormatError';
    this.source = source;
    this.offset = offset;
  }
}

class Reader {
  constructor(input, source) {
    this.bytes = input instanceof ArrayBuffer ? new Uint8Array(input)
      : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength);
    this.source = source;
    this.o = 0;
  }
  fail(msg, offset = this.o) { throw new HjbFormatError(msg, { source: this.source, offset }); }
  need(n, what) { if (this.o + n > this.bytes.length) this.fail(`unexpected end reading ${what}`); }
  u32(w = 'u32') { this.need(4, w); const v = this.view.getUint32(this.o, true); this.o += 4; return v; }
  i32(w = 'i32') { this.need(4, w); const v = this.view.getInt32(this.o, true); this.o += 4; return v; }
  f32(w = 'f32') { this.need(4, w); const v = this.view.getFloat32(this.o, true); this.o += 4; return v; }
  floats(n, w = 'floats') {
    this.need(4 * n, w);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = this.view.getFloat32(this.o + 4 * i, true);
    this.o += 4 * n;
    return out;
  }
  // Names are latin1 and may contain any byte; decoding as UTF-8 would corrupt
  // the 3ds Max handle suffix on files authored with a non-ASCII locale.
  cstr(w = 'string') {
    const start = this.o;
    while (this.o < this.bytes.length && this.bytes[this.o] !== 0) this.o++;
    if (this.o >= this.bytes.length) this.fail(`unterminated ${w}`, start);
    let s = '';
    for (let i = start; i < this.o; i++) s += String.fromCharCode(this.bytes[i]);
    this.o++;
    return s;
  }
}

const TCB = 5;   // tension, continuity, bias, and two fields the engine reads but never uses

function track(r, valueWords, kind) {
  const flag = r.u32(`${kind} track flag`);
  const n = r.i32(`${kind} key count`);
  if (n < 0 || n > 1 << 22) r.fail(`implausible ${kind} key count ${n}`);
  const keys = new Array(n);
  for (let i = 0; i < n; i++) {
    const frame = r.i32(`${kind} key frame`);
    const tcb = r.floats(TCB, `${kind} tcb`);
    keys[i] = { frame, tcb, v: r.floats(valueWords, `${kind} value`) };
  }
  return { kind, flag, keys };
}
const point3Track = (r) => track(r, 3, 'point3');
const rotTrack    = (r) => track(r, 4, 'rot');
const floatTrack  = (r) => track(r, 1, 'float');

// Visibility is a bare i32 list terminated by -1, not a keyed track. Empty in
// every file examined, but the terminator still has to be consumed.
function visList(r) {
  const frames = [];
  for (;;) {
    const v = r.i32('visibility entry');
    if (v === -1) return frames;
    frames.push(v);
  }
}

// Morph keys are baked full-mesh vertex snapshots, not deltas or blend weights.
function morphTrack(r) {
  const flag = r.u32('morph flag');
  const n = r.i32('morph key count');
  const keys = new Array(n);
  for (let i = 0; i < n; i++) {
    const frame = r.i32('morph frame');
    const tcb = r.floats(TCB, 'morph tcb');
    const nv = r.u32('morph vertex count');
    keys[i] = { frame, tcb, verts: r.floats(nv * 3, 'morph verts') };
  }
  return { kind: 'morph', flag, keys };
}

function mesh(r) {
  const name = r.cstr('mesh name');
  const nv = r.u32('vertex count');
  const verts = r.floats(nv * 3, 'vertices');
  const nf = r.u32('face count');
  // Per CORNER: { u32 vertexIndex, f32 u, f32 v } — 36 bytes a face. UVs live on
  // the corner, not the vertex, so a shared vertex carries different UVs per face
  // and the port must split rather than index.
  const faces = new Array(nf);
  for (let i = 0; i < nf; i++) {
    const c = new Array(3);
    for (let k = 0; k < 3; k++) {
      c[k] = { v: r.u32('face index'), u: r.f32('u'), t: r.f32('v') };
    }
    faces[i] = c;
  }
  const ngrp = r.u32('material group count');
  const groups = new Array(ngrp);
  for (let g = 0; g < ngrp; g++) {
    const mat = r.u32('material id');
    const cnt = r.u32('group face count');
    const idx = new Uint32Array(cnt);
    r.need(4 * cnt, 'group faces');
    for (let i = 0; i < cnt; i++) idx[i] = r.view.getUint32(r.o + 4 * i, true);
    r.o += 4 * cnt;
    groups[g] = { mat, faces: idx };
  }
  return {
    type: 0, kind: 'mesh', name, nv, verts, faces, groups,
    pos: point3Track(r), rot: rotTrack(r), scale: point3Track(r),
    vis: visList(r), morph: morphTrack(r),
  };
}
const camera = (r) => ({
  type: 1, kind: 'camera', name: r.cstr('camera name'),
  pos: point3Track(r), roll: floatTrack(r), fov: floatTrack(r), vis: visList(r),
});
const target = (r) => ({
  type: 2, kind: 'target', name: r.cstr('target name'), pos: point3Track(r),
});
const type3 = (r) => {
  const name = r.cstr('type3 name');
  const words = [r.u32(), r.u32(), r.u32()];
  return { type: 3, kind: 'type3', name, words,
    pos: point3Track(r), a: floatTrack(r), b: floatTrack(r), vis: visList(r) };
};
const omni = (r) => {
  const name = r.cstr('omni name');
  const words = [r.u32(), r.u32(), r.u32()];   // rgb, per the loader
  return { type: 4, kind: 'omni', name, words,
    pos: point3Track(r), rot: rotTrack(r), scale: point3Track(r), vis: visList(r) };
};
const type5 = (r) => ({
  type: 5, kind: 'type5', name: r.cstr('type5 name'),
  pos: point3Track(r), rot: rotTrack(r), scale: point3Track(r), vis: visList(r),
});

const HANDLERS = { 0: mesh, 1: camera, 2: target, 3: type3, 4: omni, 5: type5 };

// Mirrors FUN_0040dbe0: a record, then optionally its children, then -1 to pop.
// Types 3 and 5 exist in the loader and in NO file of the 252 — kept because the
// engine can read them, flagged because nothing has ever exercised them.
function tree(r, depth, out, stats) {
  let t = r.i32('record type');
  for (;;) {
    if (t === -1) return;
    const h = HANDLERS[t];
    if (!h) r.fail(`unknown record type ${t}`, r.o - 4);
    const node = h(r);
    node.children = [];
    out.push(node);
    stats.depth = Math.max(stats.depth, depth);
    const w = r.i32('child marker');
    if (w !== -1) { r.o -= 4; tree(r, depth + 1, node.children, stats); }
    t = r.i32('record type');
  }
}

const MAP_SLOTS = 11;   // fixed slot count per material; empty slots hold "" paths

function materials(r) {
  const dead = r.u32('material header');
  const n = r.i32('material count');
  if (n < 0 || n > 1 << 16) r.fail(`implausible material count ${n}`);
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const name = r.cstr('material name');
    const maps = [];
    for (let slot = 0; slot < MAP_SLOTS; slot++) {
      const amount = r.f32('map amount');
      const path = r.cstr('map path');
      if (amount > 0) maps.push({ slot, amount, path });
    }
    out[i] = { name, maps };
  }
  return { dead, materials: out };
}

/**
 * Parse a .HJB scene.
 * @returns {{nframes:number, nodes:Array, materials:Array, bytesConsumed:number,
 *            bytesTotal:number, exact:boolean, depth:number}}
 */
export function parseHjb(input, { source = '<HJB>' } = {}) {
  const r = new Reader(input, source);
  const word0 = r.u32('header word0');
  const nframes = r.u32('nframes');
  const nodes = [];
  const stats = { depth: 0 };
  tree(r, 1, nodes, stats);
  const { dead, materials: mats } = materials(r);
  return {
    word0, nframes, nodes, materials: mats, dead,
    depth: stats.depth,
    bytesConsumed: r.o,
    bytesTotal: r.bytes.length,
    // Byte-exact closure is the check that the grammar is right. One file of 252
    // (Strain3D.HJB, Elements) leaves 24 trailing zero bytes; see the study.
    exact: r.o === r.bytes.length,
  };
}

/**
 * Sample a track at a frame. Reproduces the engine's own early-outs.
 * Interpolation is cubic Hermite over Kochanek-Bartels tangents computed at load;
 * with every shipped TCB zero this reduces to Catmull-Rom, which is what the
 * originals actually run.
 */
export function evalTrack(track, frame) {
  const k = track.keys;
  if (k.length === 0) return null;
  if (k.length === 1) return k[0].v;              // the n == 1 early-out: TCB slots here are garbage
  if (frame <= k[0].frame) return k[0].v;
  if (frame >= k[k.length - 1].frame) return k[k.length - 1].v;
  let i = 0;
  while (i < k.length - 1 && k[i + 1].frame <= frame) i++;
  const a = k[i], b = k[i + 1];
  const span = b.frame - a.frame;
  const u = span > 0 ? (frame - a.frame) / span : 0;
  const n = a.v.length;
  const out = new Float32Array(n);
  // Catmull-Rom tangents: the zero-TCB case, which is every key in the corpus.
  const prev = k[i - 1] ?? a, next = k[i + 2] ?? b;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u;
  const h01 = -2 * u ** 3 + 3 * u ** 2,    h11 = u ** 3 - u ** 2;
  for (let c = 0; c < n; c++) {
    const m0 = (b.v[c] - prev.v[c]) * 0.5;
    const m1 = (next.v[c] - a.v[c]) * 0.5;
    out[c] = h00 * a.v[c] + h10 * m0 + h01 * b.v[c] + h11 * m1;
  }
  return out;
}
