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
