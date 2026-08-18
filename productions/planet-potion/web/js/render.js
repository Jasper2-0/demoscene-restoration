// render.js — the emitter. `_show_scene`'s last step, `0x100066b0`.
//
// Every primitive the intro draws goes through this loop. It takes the clipped
// vertices in EYE space and writes the 0x40-byte W3D_Vertex records Warp3D
// receives, which is exactly what `web/data/draws.json` recorded.
//
//     f1 = fres(z)                     rz, a single-precision ESTIMATE
//     f2 = f27 * f1                    scale * rz
//     x  = fmadd(x, f2, f29)           x * scale * rz + cx
//     y  = fmadd(y, f2, f28)           y * scale * rz + cy
//     w  = f1
//     z  = (double)(rz + rz + rz + rz)
//
// THE DEPTH IS FOUR TIMES THE RECIPROCAL, in a field W3D_Vertex keeps as eight
// bytes at +0x08 while w takes four at +0x10 — `stfd` against `stfs`. A
// neighbouring routine computes `4.04 * rz` for a screen-bounds cull; that one
// is not this one, and taking it for the projection puts every depth out by one
// per cent.
//
// `fres` IS AN ESTIMATE, NOT A DIVIDE. On a 604e it is accurate to about twelve
// bits; under the harness that produced draws.json it rounds a full-precision
// reciprocal to single. §6 measures what that costs against a real machine —
// median 0.39 px, p95 1.25 px — so a port matched against the recorded stream
// inherits qemu's precision, not the hardware's, and only a capture can close
// the difference.
import { f32, fma } from './fp.js';

const fres = (x) => Math.fround(1 / x);

/** The W3D_Vertex field offsets, for anyone reading the shim beside this. */
export const VERTEX = {
  x: 0x00, y: 0x04, z: 0x08, w: 0x10, u: 0x14, v: 0x18,
  r: 0x20, g: 0x24, b: 0x28, a: 0x2c, stride: 0x40,
};

/**
 * Project one clipped vertex.
 *
 * @param v  eye-space vertex: {p:[x,y,z], uv:[u,v], rgb:[r,g,b]}
 * @param cx,cy,scale  the node's projection triple, as pass 3 published it
 * @param alpha  the PER-PRIMITIVE alpha, taken from the first source vertex
 */
export function project(v, cx, cy, scale, alpha) {
  const rz = fres(v.p[2]);
  const k = scale * rz;
  return {
    x: f32(fma(v.p[0], k, cx)),
    y: f32(fma(v.p[1], k, cy)),
    // `stfd`, so the field is a W3D_Double — but the VALUE is a float32
    // multiplied by four, which only moves the exponent, so it is exactly
    // representable either way and rounding it to single changes nothing. That
    // was worth checking rather than asserting: a mutation to `f32(...)` here
    // does not fail emitcheck, and a comment claiming it would was wrong. What
    // the check does catch is `fres` replaced by a divide, and the 4.04 factor
    // borrowed from the neighbouring cull test.
    z: rz + rz + rz + rz,
    w: rz,
    u: v.uv[0], v: v.uv[1],
    r: v.rgb[0], g: v.rgb[1], b: v.rgb[2], a: alpha,
  };
}

/** One primitive: `count` vertices through `project`. */
export function emit(vertices, cx, cy, scale, alpha) {
  return vertices.map((v) => project(v, cx, cy, scale, alpha));
}


// ---------------------------------------------------------------------------
// The clipper, `0x10006738` and `0x10006870`. Sutherland-Hodgman in EYE space
// against four planes, ping-ponging between the two vertex arrays
// `_init_scene_show` allocated — 99 usable slots each, which is the real bound
// on how many vertices a primitive can grow to.
//
// The plane function is `component * s + z * k`, and both passes run the same
// code with different (s, k):
//
//     left    x * ( 1) + z * (cx / scale)
//     top     y * ( 1) + z * (cy / scale)
//     right   x * (-1) + z * ((W - cx) / scale)
//     bottom  y * (-1) + z * ((H - cy) / scale)
//
// EIGHT FIELDS INTERPOLATE, NOT NINE. x, y, z, the three colours and the two
// texture coordinates — `0x1000692c` does exactly eight `fsub`/`fmadd` pairs.
// The alpha at +0x0c is left alone because it is per-PRIMITIVE, taken from the
// first source vertex, and interpolating it would make a clipped triangle fade
// across its own cut edge.
//
// THE PARAMETER IS `d_cur / (d_cur - d_prev)` AND IT LERPS FROM `cur`, not from
// `prev`: `out = cur + t * (prev - cur)`. Writing the more natural
// `prev + t' * (cur - prev)` needs the other t, and the two agree only in exact
// arithmetic — through a `fdiv` and a fused `fmadd` they do not.

const W = 640.0;
const H = 480.0;

/** One Sutherland-Hodgman pass. `axis` is 0 for x or 1 for y. */
function clipPlane(poly, axis, s, k) {
  if (!poly.length) return poly;
  const out = [];
  const dist = (v) => fma(v.p[axis], s, v.p[2] * k);
  let prev = poly[poly.length - 1];
  let dPrev = dist(prev);
  for (const cur of poly) {
    const dCur = dist(cur);
    // `ble` on the PREVIOUS distance: strictly greater than zero is inside, so
    // a vertex exactly on the plane counts as outside and is dropped.
    if (dPrev > 0) out.push(prev);
    if ((dPrev > 0) !== (dCur > 0)) {
      const t = dCur / (dCur - dPrev);
      const mix = (a, b) => fma(t, a - b, b);
      out.push({
        p: [mix(prev.p[0], cur.p[0]), mix(prev.p[1], cur.p[1]),
          mix(prev.p[2], cur.p[2])],
        rgb: [mix(prev.rgb[0], cur.rgb[0]), mix(prev.rgb[1], cur.rgb[1]),
          mix(prev.rgb[2], cur.rgb[2])],
        uv: [mix(prev.uv[0], cur.uv[0]), mix(prev.uv[1], cur.uv[1])],
      });
    }
    prev = cur;
    dPrev = dCur;
  }
  return out;
}

/**
 * Clip one primitive against all four planes.
 *
 * A fan left with fewer than three vertices, or a strip with fewer than two, is
 * dropped entirely rather than emitted degenerate.
 */
export function clip(poly, cx, cy, scale, prim) {
  let p = poly;
  p = clipPlane(p, 0, 1, cx / scale);
  p = clipPlane(p, 1, 1, cy / scale);
  p = clipPlane(p, 0, -1, (W - cx) / scale);
  p = clipPlane(p, 1, -1, (H - cy) / scale);
  const floor = prim === 'linestrip' ? 2 : 3;
  return p.length >= floor ? p : [];
}

/** The four plane distances of an eye-space point, for checking. */
export function planeDistances(v, cx, cy, scale) {
  return [
    fma(v[0], 1, v[2] * (cx / scale)),
    fma(v[1], 1, v[2] * (cy / scale)),
    fma(v[0], -1, v[2] * ((W - cx) / scale)),
    fma(v[1], -1, v[2] * ((H - cy) / scale)),
  ];
}

// ---------------------------------------------------------------------------
// The node walk, `_show_scene` at `0x10005d28`, and the shared draw routine at
// `0x10006630` that every primitive in the intro passes through.
//
// THE HANDLERS ARE THIN. Six of the eight table entries at `r2+0x2a22` do
// nothing but choose a draw vector, a render-state block, a vertex array and a
// minimum vertex count, then jump to the shared routine:
//
//     type 0        DrawLineStrip, node+0x20, min 2
//     type 1, 2     DrawTriFan,    node+0x20, min 3     — the same entry
//     type 3        whichever `node+0x68` selects
//     type 4        DrawTriFan, once per glyph, at glyph+0x14
//     type 5        the mesh, which walks objects and faces first
//     type 6        the camera, which draws nothing
//
// THE VERTEX ARRAY IS COUNT-THEN-POINTERS. `r19` points at the count and the
// pointers follow, read with a pre-incrementing `lwzu` — so for types 0 to 3
// the count is at node+0x20 and the first pointer at node+0x24, and for a glyph
// the count is at +0x14 and the first vertex at +0x18. That is the same +0x18
// the text tail writes, which is how the two halves meet.

/**
 * `0x10006630` — one primitive, from the gate to the emitter.
 *
 * THE ALPHA GATE IS THE FIRST THING AND IT USES THE UNCLIPPED FIRST VERTEX.
 * `lfs f24, 0xc(r12)` then `blelr` — a primitive whose leading vertex has alpha
 * at or below zero is not drawn at all. That single value is then written to
 * EVERY output vertex, which is why alpha is the one field the clipper does not
 * interpolate, and why every draw in the recorded stream carries one alpha
 * across all its vertices.
 */
export function drawPrimitive(source, node, prim) {
  if (!source.length) return null;
  const alpha = source[0].a;
  if (!(alpha > 0)) return null;
  const { cx, cy, scale } = node;
  const poly = node.clip ? clip(source, cx, cy, scale, prim) : source;
  if (!poly.length) return null;
  return { prim, texture: node.texture, cx, cy, scale, clip: !!node.clip,
    v: emit(poly, cx, cy, scale, alpha) };
}

/** Which vector each node type draws with, and its minimum vertex count. */
export function primitiveOf(node) {
  if (node.type === 0) return 'linestrip';
  if (node.type === 3) return node.at68 ? 'trifan' : 'linestrip';
  return 'trifan';
}

/**
 * Type 5 — the mesh, `0x100061a0`. The workhorse: most of the intro's 45,327
 * primitives come from here.
 *
 * Objects hang off `node+0x24` chained on `+0x60`, and each object IS its own
 * first face, with the rest chained on `+0x5c`. THE FACE RECORD IS ALSO THE
 * VERTEX ARRAY — `addi r19, r17, 0` hands the face itself to the shared draw
 * routine, so the count sits at face+0x00 and the pointers at +0x04, and the
 * texture and draw vector come from the same record at +0x54 and +0x58.
 *
 * THE CULL IS A SIGNED VOLUME, NOT A FACING TEST. It takes the first three
 * vertices, forms `-(A x B)` and dots it with C, which is the determinant of
 * the three POSITIONS rather than of two edge vectors — so it depends on where
 * the triangle is, not only on which way it points. `1` keeps a positive
 * result and `2` keeps a negative one; `0` skips the test.
 */
function meshDraws(node) {
  if (node.built === 1) return [];
  const out = [];
  for (const object of node.objects ?? []) {
    for (const face of object.faces ?? []) {
      const vs = face.vertices ?? [];
      if (face.cull && vs.length >= 3) {
        const [A, B, C] = [vs[0].p, vs[1].p, vs[2].p];
        const nx = fma(A[2], B[1], -(A[1] * B[2]));
        const ny = fma(A[0], B[2], -(A[2] * B[0]));
        const nz = fma(A[1], B[0], -(A[0] * B[1]));
        const d = fma(nz, C[2], fma(ny, C[1], nx * C[0]));
        if (face.cull === 2 ? d >= 0 : d <= 0) continue;
      }
      // Shading writes the emitted colour on every vertex. `k` folds into the
      // face colour for mode 2 and is per-vertex for mode 3; modes 0 and 4
      // leave it at one. The clamp is ONE-SIDED — nothing catches a negative,
      // which is how the alpha gate downstream ever sees one.
      let [fr, fg, fb] = face.rgb;
      if (face.shading === 2) {
        const k = Math.abs(face.intensity);
        fr *= k; fg *= k; fb *= k;
      }
      const shaded = vs.map((v) => {
        const k = face.shading === 3 ? Math.abs(v.gouraud ?? 1) : 1;
        return {
          p: v.p,
          a: Math.min(face.alpha * v.scaled[0], 1.0),
          rgb: [Math.min(fr * v.scaled[1] * k, 1.0),
            Math.min(fg * v.scaled[2] * k, 1.0),
            Math.min(fb * v.scaled[3] * k, 1.0)],
          uv: v.uv,
        };
      });
      const d = drawPrimitive(shaded,
        { ...node, texture: face.textureIndex }, face.prim ?? 'trifan');
      if (d) out.push(d);
    }
  }
  return out;
}

/**
 * `_show_scene`. Walk the list on `+0x10` and dispatch on `+0x08`.
 *
 * PUBLISHES NOTHING UNLESS `+0x0c` IS SET — the same gate byte pass 3 writes,
 * so a node whose track has not started is skipped here rather than drawn with
 * stale numbers. `+0x0d` against the running state triggers a render-state
 * change before the handler, which is where shading mode is selected.
 *
 * THE MESH HANDLER IS NOT HERE. `0x100061a0` walks the object and face chains,
 * applies the cull and the four shading modes, and only then reaches
 * `drawPrimitive`; it is a separate piece with its own oracle in arena.json.
 */
export function showScene(nodes) {
  const draws = [];
  let state = 2;
  for (const node of nodes) {
    if (!node.drawGate) continue;
    if (node.at0d !== state) state = node.at0d;      // render-state change
    if (node.type === 6 || node.type === 7) continue; // camera and root draw nothing
    if (node.type === 5) { draws.push(...meshDraws(node)); continue; }
    if (node.type === 4) {
      for (const g of node.glyphs ?? []) {
        if (!g || g.space || !g.quad) continue;
        const d = drawPrimitive(g.quad.map(toVertex), node, 'trifan');
        if (d) draws.push(d);
      }
      continue;
    }
    const d = drawPrimitive((node.vertices ?? []).map(toVertex), node,
      primitiveOf(node));
    if (d) draws.push(d);
  }
  return draws;
}

/** A stored vertex record's nine floats, as the clipper and emitter want them. */
function toVertex(v) {
  return { p: [v[0], v[1], v[2]], a: v[3], rgb: [v[4], v[5], v[6]],
    uv: [v[7], v[8]] };
}
