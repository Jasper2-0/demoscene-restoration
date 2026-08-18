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
  // `fmul f11, f14, f4` then `fmadd f11, f12, f26, f11`: the SIGN product is
  // rounded and the DEPTH product is the fused one. Writing it the other way
  // round — fusing the sign and rounding the depth — is a different number, and
  // since the sign is only ever +1 or -1 its product is exact either way, so the
  // whole difference lands on the depth term, which is the one that decides
  // where the cut goes.
  const dist = (v) => fma(v.p[2], k, v.p[axis] * s);
  // THE WALK STARTS ON THE EDGE (v0, v1), NOT (vlast, v0). `0x10006750` points
  // the `cur` cursor at the array's second entry and `0x1000686c` wraps it back
  // to the first only on the LAST edge, so the output begins at v0. Starting
  // from the closing edge instead gives the same polygon ROTATED by one vertex
  // — identical geometry, a different vertex list — and it fails on primitives
  // that were never cut at all, because a pass-through triangle comes out as
  // v2, v0, v1.
  let prev = poly[0];
  let dPrev = dist(prev);
  // Whether this plane actually changed anything, so `cut` can mean CUT. The
  // walk emits a wholly-inside polygon as v0..vn in the order it arrived, so
  // handing the input array straight back is the same polygon and lets the
  // caller tell "was clipped" from "had clipping enabled" -- which the identity
  // test alone could not, because this function used to allocate either way and
  // so reported every clip-enabled primitive as cut.
  let changed = false;
  for (let i = 1; i <= poly.length; i++) {
    const cur = poly[i === poly.length ? 0 : i];
    const dCur = dist(cur);
    // `ble` on the PREVIOUS distance: strictly greater than zero is inside, so
    // a vertex exactly on the plane counts as outside and is dropped.
    if (dPrev > 0) out.push(prev); else changed = true;
    if ((dPrev > 0) !== (dCur > 0)) {
      changed = true;
      const t = dCur / (dCur - dPrev);
      // Every one of the eight goes out through `stfs`, so it TRUNCATES. The
      // pass-through vertices are already single and lose nothing; the cut ones
      // are computed in double and rounded on the way to the buffer.
      const mix = (a, b) => f32(fma(t, a - b, b));
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
  return changed ? out : poly;
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
    // Whether the clipper actually CHANGED anything, as distinct from having
    // been asked to run. A primitive wholly inside comes back as the same array.
    cut: poly !== source,
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
/**
 * Type 5 draws itself ONLY IF the built-already byte is clear. `0x100061a0`
 * tests `node+0x0f` and returns; the camera's reference loop calls
 * `bl 0x100061ac`, which is the SAME routine one instruction further on. One
 * flag and one alternate entry point are the whole mechanism: a referenced mesh
 * never draws on its own account and always draws through the camera that
 * references it, with that camera's composed matrix instead of its own.
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
      // SHADING MODE 4 DOES NOT USE THE FACE'S TEXTURE COORDINATES AT ALL, it
      // environment-maps. Both per-face routines end on the same dispatch --
      // `beq cr3` at 0x10005fdc and `bne cr3` at 0x10006140 -- and modes 0 to 3
      // copy the face's three uv pairs onto its three vertices, while mode 4
      // falls into 0x10006144 and computes one per vertex from the TRANSFORMED
      // NORMAL:
      //
      //     u = normal.x * face[+0x1c] + face[+0x14]
      //     v = normal.y * face[+0x20] + face[+0x18]
      //
      // so the first two "uv pairs" are really an offset and a scale. Both are
      // fused, and both go out through `stfs`.
      //
      // It is half the mesh geometry in the demo -- 14,016 faces of 28,338 --
      // and until this was found those faces took the offset and the scale as
      // literal texture coordinates, which is why the 3D objects looked like
      // they had no proper mapping. Nothing in the geometry oracle could see
      // it: `geo.json` records the face's uv fields, which ARE right, and the
      // per-vertex values only exist during a frame.
      const env = face.shading === 4;
      const shaded = vs.map((v) => {
        const k = face.shading === 3 ? Math.abs(v.gouraud ?? 1) : 1;
        return {
          p: v.p,
          a: Math.min(face.alpha * v.scaled[0], 1.0),
          rgb: [Math.min(fr * v.scaled[1] * k, 1.0),
            Math.min(fg * v.scaled[2] * k, 1.0),
            Math.min(fb * v.scaled[3] * k, 1.0)],
          uv: env && v.normal && face.uv
            ? [f32(fma(v.normal[0], face.uv[1][0], face.uv[0][0])),
              f32(fma(v.normal[1], face.uv[1][1], face.uv[0][1]))]
            : v.uv,
        };
      });
      const d = drawPrimitive(shaded,
        { ...node, texture: face.textureIndex }, face.prim ?? 'trifan');
      // Which shading mode produced it — for attribution in the checks only;
      // nothing in the draw path reads it.
      if (d) { d.shading = face.shading; out.push(d); }
    }
  }
  // SPRITES ARE DRAWN WITH THE DEPTH BUFFER OFF. `0x100062bc` opens the sprite
  // path by setting BOTH z states to W3D_DISABLE, draws the whole chain, and
  // restores them to the node's own state at 0x1000642c — so a point sprite
  // neither tests nor writes depth however the mesh around it was drawn.
  //
  // It matters where the sprites sit ON the geometry they belong to: part
  // three's 0x278e hangs a billboard on every vertex of a torus, and with the
  // depth test left on those quads are coplanar with the faces underneath them
  // and fight. Off, they simply land on top, in submission order, which is what
  // the original does and why it does not fight either.
  for (const d of spriteDraws(node)) { d.sprite = true; d.z = 2; out.push(d); }
  return out;
}

/**
 * The point sprites, `0x100062bc`. NOT an alternative to the triangles: the
 * object loop's exit and the no-objects test land on the SAME instruction, so
 * every mesh runs this after its faces, and a mesh with no faces at all runs
 * only this. Part one's program 12 is 81 points and nothing else.
 *
 * One screen-aligned quad per point, built in EYE space from the published
 * vertex and a half-size the geometry carried, so the four corners share the
 * point's depth and the quad stays square on screen at any distance.
 *
 * THE ALPHA CARRIES A RIM TERM. `1 - nz` off the transformed normal, clamped
 * below at zero on both sides of the subtraction, multiplied into the vertex's
 * own scaled alpha and then the sprite's. A point facing the camera fades out
 * and one edge-on is opaque.
 */
function spriteDraws(node) {
  const out = [];
  const { cx, cy, scale } = node;
  for (const sp of node.sprites ?? []) {
    const v = sp.v;
    const [x, y, z] = v.p;
    if (!(z > 0)) continue;                    // `ble` — behind the eye
    // The trivial ACCEPT: the centre and the four corners, projected. If not
    // one of the five lands on the screen the point is skipped without being
    // clipped. `0x10005e78`, five calls.
    const k = f32(scale) * fres(z);
    const on = (px, py) => {
      const sx = fma(px, k, cx), sy = fma(py, k, cy);
      return sx > 0 && sy > 0 && sx < W && sy < H;
    };
    const s = sp.size;
    if (!(on(x, y) || on(x - s, y - s) || on(x + s, y - s)
      || on(x + s, y + s) || on(x - s, y + s))) continue;

    // `fsel f20, f20, f20, f31` is `>= 0 ? value : 0`, and it runs on the
    // normal AND on one minus it, so a normal outside [0, 1] cannot make the
    // alpha negative from either end.
    const lo = (t) => (t >= 0 ? t : 0);
    const hi = (t) => (t - 1 >= 0 ? 1 : t);
    let a = v.scaled[0] * lo(1 - lo(v.nz));
    const r = hi(v.scaled[1] * sp.rgba[1]);
    const g = hi(v.scaled[2] * sp.rgba[2]);
    const b = hi(v.scaled[3] * sp.rgba[3]);
    a = hi(a * sp.rgba[0]);

    const corners = [[x - s, y - s], [x + s, y - s],
      [x + s, y + s], [x - s, y + s]];
    const poly = corners.map((c, i) => ({
      p: [f32(c[0]), f32(c[1]), f32(z)], a, rgb: [r, g, b], uv: sp.uv[i],
    }));
    const d = drawPrimitive(poly, { ...node, texture: sp.textureIndex },
      'trifan');
    if (d) out.push(d);
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
export function showScene(nodes, activeCamera = 0) {
  const draws = [];
  let state = 2;
  // Each draw remembers which node emitted it. Nothing in the original does
  // this; it is here so a residual can be attributed rather than averaged.
  let src = -1;
  let srcKind = '?';
  const push = (list) => {
    for (const d of list) {
      d.src = src; d.srcKind = srcKind;
      // A draw that already named its own depth state keeps it — the sprite
      // path sets both z states to DISABLE around itself regardless of the
      // node's, so this must not stamp the node's back over it.
      // THE Z-BUFFER STATE THIS DRAW IS MADE UNDER. The original does not put
      // it on the draw: it calls W3D_SetState when the byte changes and the
      // hardware keeps it until the next change. Carrying it per draw is the
      // same thing said in a form the shim can apply, and it survives the
      // draws being concatenated or reordered, which a running state does not.
      if (d.z === undefined) d.z = state;
      draws.push(d);
    }
  };
  for (const node of nodes) {
    src++;
    if (!node.drawGate) continue;
    // `+0x0d` IS THE Z-BUFFER, and it is per node. `_show_scene` opens with
    // both z states DISABLED (0x10005d54 sets the action to 2 and calls the
    // pair at 0x100069d4), then for every node it draws compares +0x0d against
    // the state it last set and calls the pair again only when they differ —
    // 0x10005d90..0x10005d98, where `bnel` is the conditional call and setZ's
    // own `mr r20, r25` is what makes r20 the running state.
    //
    // Seven of part one's eighteen scenes turn it on: 0x25d6, 0x25da, 0x25de,
    // 0x25e2, 0x25e6, 0x25ea and 0x25ee — its whole second half, the 3D ones.
    // The page had it hardcoded off, so those scenes drew in submission order
    // with no depth at all.
    if (node.at0d !== state) state = node.at0d;
    if (node.type === 7) continue;                    // the root draws nothing
    // THE CAMERA IS A DRAW HANDLER, not just a source of cx/cy/scale.
    // `0x1000644c` walks its reference chain at `+0x2c`, and for each link
    // COPIES the referenced node's vertex and object lists into its own
    // `+0x20/+0x24/+0x28`, transforms them by the link's composed matrix, and
    // enters the mesh renderer past its gate. Everything else about the draw —
    // cx, cy, scale, texture, clip — stays the camera's own.
    srcKind = `type${node.type}`;
    if (node.type === 6) {
      // `0x10006468` compares the camera's ordinal against the show's active
      // camera and returns if they differ. Three scenes carry four cameras
      // each and render one of them at a time.
      if ((node.ordinal ?? 0) !== activeCamera) continue;
      srcKind = 'camref';
      for (const ref of node.refs ?? []) push(meshDraws(ref));
      continue;
    }
    if (node.type === 5) { push(meshDraws(node)); continue; }
    if (node.type === 4) {
      for (const g of node.glyphs ?? []) {
        if (!g || g.space || !g.quad) continue;
        const d = drawPrimitive(g.quad.map(toVertex), node, 'trifan');
        if (d) push([d]);
      }
      continue;
    }
    // A type 0 to 3 node's vertices are its sub-objects' channel blocks, ready
    // to use — no record to unpack, because the animation wrote them.
    const source = node.plain ?? (node.vertices ?? []).map(toVertex);
    const d = drawPrimitive(source, node, primitiveOf(node));
    if (d) push([d]);
  }
  return draws;
}

/**
 * The draws in the shape the Warp3D shim takes: ten floats a vertex, flat.
 *
 * `project` returns a vertex per object because everything upstream compares
 * fields by name; the shim wants exactly what draws.json holds, which is one
 * Float32Array per primitive. Converting here rather than there keeps the shim
 * unable to tell a computed frame from a recorded one — which is the whole
 * point of having verified it against the recording first.
 */
export function flattenDraws(draws) {
  return draws.map((d) => {
    const v = new Float32Array(d.v.length * 10);
    d.v.forEach((q, i) => {
      v.set([q.x, q.y, q.z, q.w, q.u, q.v, q.r, q.g, q.b, q.a], i * 10);
    });
    return { prim: d.prim, texture: d.texture, z: d.z, v };
  });
}

/** A stored vertex record's nine floats, as the clipper and emitter want them. */
function toVertex(v) {
  return { p: [v[0], v[1], v[2]], a: v[3], rgb: [v[4], v[5], v[6]],
    uv: [v[7], v[8]] };
}
