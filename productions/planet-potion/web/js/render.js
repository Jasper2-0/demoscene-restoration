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
