// pass3check.mjs — `_calc_matrix`'s publish pass, against the original.
//
//   node work/re/pass3check.mjs out/anim_all.json
//
// Runs all three passes and checks what the third one WRITES OUT, which is a
// different surface from what the first two compute: the render node's gate
// byte and projection triple, and — the part that actually feeds the renderer —
// every mesh vertex's transformed position, colour and normal.
//
// THE VERTEX CHECK IS THE POINT. Passes 1 and 2 are verified against 24 floats
// per node; pass 3 turns those into thousands of transformed vertices, and the
// matrix could be right while the transform that applies it is not. The dump
// carries both sides of every vertex field — source at +0x24/+0x30/+0x50 and
// destination at +0x00/+0x40/+0x5c — so each one is checkable on its own.
//
// TWO THINGS ARE REPORTED RATHER THAN ASSERTED, and both are honest gaps:
//
//   * TYPE 4, TEXT, IS NOT PORTED. `0x1000570c` is 137 instructions of glyph
//     quad layout whose consumer does not exist yet. `publishNode` returns
//     'text-unported' and those nodes are counted here, so the gap has a number
//     rather than being invisible;
//   * a node with `node+0x0f` set was built on an earlier frame and pass 3
//     skips it, so its vertices are whatever that earlier frame left. Those are
//     counted, not compared;
//   * TYPE 6, THE CAMERA, is implemented and runs, but its output goes into the
//     sub-structures chained off `node+0x2c` and animdump does not export
//     those. So it is exercised without being judged, which is worth a line of
//     its own rather than being folded into a pass/fail.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateNode, composeHierarchy, publishNode } from '../../web/js/anim.js';
import { sinus } from '../../web/js/tables.js';

const ABSENT = 77;
const NIL = 0xffffffff;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? path.join(HERE, 'out', 'anim_all.json');

if (!fs.existsSync(file)) {
  console.log(`pass3check: ${file} not here — `
    + './ppcbox.sh python3 animdump.py --all flat/ out/anim_all.json. Skipping.');
  process.exit(ABSENT);
}

const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
const table = sinus();

let gateOK = 0, gateBad = 0;
let projOK = 0, projBad = 0, projSkipped = 0;
let vOK = 0, vBad = 0, oOK = 0, oBad = 0;
let builtSkipped = 0, textNodes = 0, meshNodes = 0;
let vNonFinite = 0, oNonFinite = 0;
const failures = [];
const kinds = new Map();

for (const scene of doc.scenes ?? [doc]) {
  for (const frame of scene.frames) {
    const entries = [];
    for (const node of frame.nodes) {
      const anim = node.anim;
      if (!anim) continue;
      const keys = node.track.map((k) => ({ ...k, addr: parseInt(k.addr, 16) }));
      const ch = keys.length
        ? evaluateNode({ ...anim }, keys, frame.t, -1, table) : null;
      entries.push({
        addr: parseInt(anim.addr, 16),
        parent: anim.parent,
        flags3: (anim.flags3 & 0xf0) | (anim.parent !== NIL ? 1 : 0),
        resolved: ch ? 1 : 0,
        ch,
        node,
      });
    }
    composeHierarchy(entries);

    for (const e of entries) {
      const src = e.node;
      // Fresh mutable copies of the vertex sources; publishNode writes the
      // transformed fields onto them and we compare against the dump's.
      const vertices = (src.vertices ?? []).map((v) => ({
        x: v.p[0], y: v.p[1], z: v.p[2],
        c0: v.rgba[0], c1: v.rgba[1], c2: v.rgba[2], c3: v.rgba[3],
        nx: v.n[0], ny: v.n[1], nz: v.n[2], want: v,
      }));
      const objects = (src.objects ?? []).map((o) => ({
        nx: o.n[0], ny: o.n[1], nz: o.n[2], want: o,
      }));
      const out = { type: src.type, built: src.built, vertices, objects, cameras: [] };
      const kind = publishNode(out, e.ch ?? new Float64Array(24), e.resolved);
      kinds.set(kind.split(':')[0], (kinds.get(kind.split(':')[0]) ?? 0) + 1);
      if (src.type === 4) textNodes++;
      if (src.type === 5) meshNodes++;

      // The gate byte is copied onto the render node unconditionally.
      if (out.drawGate === src.drawGate) gateOK++;
      else gateBad++;

      if (e.resolved !== 1) { projSkipped++; continue; }

      // cx/cy/scale, against what the EMITTER used — but only where the node
      // drew, since that is where the dump has them.
      if (src.drew) {
        if (out.cx === src.cx && out.cy === src.cy && out.scale === src.scale) projOK++;
        else {
          projBad++;
          if (failures.length < 6) {
            failures.push(`${scene.part}/${scene.order} t=${frame.t} ${src.addr} `
              + `cx/cy/scale ${out.cx},${out.cy},${out.scale} `
              + `vs ${src.cx},${src.cy},${src.scale}`);
          }
        }
      }

      if (kind === 'built-already') { builtSkipped += vertices.length; continue; }

      for (const v of vertices) {
        const w = v.want;
        // NON-FINITE FIELDS ARE NOT COMPARABLE. Some vertices carry NaN or an
        // infinity in the original — degenerate geometry the demo never shows —
        // and animdump writes those as null because JSON has no spelling for
        // them. So the bits are gone from the dump on both sides, and a
        // comparison would be testing the sanitiser. Counted instead.
        const fields = [
          [v.ox, w.out_p[0]], [v.oy, w.out_p[1]], [v.oz, w.out_p[2]],
          [v.o0, w.out_rgba[0]], [v.o1, w.out_rgba[1]],
          [v.o2, w.out_rgba[2]], [v.o3, w.out_rgba[3]],
          [v.onx, w.out_n[0]], [v.ony, w.out_n[1]], [v.onz, w.out_n[2]],
        ];
        if (fields.some(([, b]) => b === null)) { vNonFinite++; continue; }
        const same = fields.every(([a, b]) => a === b);
        if (same) vOK++;
        else {
          vBad++;
          if (failures.length < 6) {
            failures.push(`${scene.part}/${scene.order} t=${frame.t} vertex ${w.addr}: `
              + `p got ${[v.ox, v.oy, v.oz]} want ${w.out_p}; `
              + `n got ${[v.onx, v.ony, v.onz]} want ${w.out_n}`);
          }
        }
      }
      for (const o of objects) {
        const w = o.want;
        if (w.out_n.some((c) => c === null)) { oNonFinite++; continue; }
        if (o.onx === w.out_n[0] && o.ony === w.out_n[1] && o.onz === w.out_n[2]) oOK++;
        else oBad++;
      }
    }
  }
}

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

console.log(`node tails: ${[...kinds].map(([k, v]) => `${k} ${v}`).join(', ')}\n`);

ok('the gate byte reaches the render node', gateBad === 0,
  `${gateOK} agree, ${gateBad} differ`);
ok('cx, cy and scale match what the emitter used', projBad === 0,
  `${projOK} nodes${projSkipped ? `, ${projSkipped} unresolved` : ''}`);
ok('every mesh vertex transforms exactly', vBad === 0,
  `${vOK}/${vOK + vBad} across ${meshNodes} mesh nodes`
  + `${builtSkipped ? `, ${builtSkipped} on already-built nodes skipped` : ''}`);
ok('every object normal transforms exactly', oBad === 0, `${oOK}/${oOK + oBad}`);
console.log(`     ${vNonFinite} vertices and ${oNonFinite} objects carry non-finite `
  + 'fields in the original and are not comparable');
ok('the vertex check has real coverage', vOK > 1000, `${vOK} vertices`);

console.log(`     type 4 (text) is not ported: ${textNodes} node-frames skipped`);
// The camera tail RUNS but nothing here can judge it: its output goes into the
// sub-structures on node+0x2c, which animdump does not export. Said out loud so
// "pass 3 is verified" is not read as covering all four tails.
console.log(`     type 6 (camera) ran on ${kinds.get('camera') ?? 0} node-frames `
  + 'and is UNVERIFIED — its output lands in the sub-structures at node+0x2c, '
  + 'which are not dumped');
for (const f of failures) console.log(`     ${f}`);

if (bad) process.exit(1);
console.log('\npass 3 publishes what the original publishes');
