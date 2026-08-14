// hair.mjs — the dm2000 hair system (RENDER.md §11).
//
// `data/hairs/<name>.txt` is plain ASCII key/value, parsed by
// HairMesh::HairMesh @0x423480 with `stream >> token` and exact string
// compares. There is NO comment syntax — unknown tokens are silently dropped,
// so a "commented-out" line in these files is simply ignored data, not a
// parse error.
//
// Two things make this reproducible rather than approximate:
//   * every strand shares ONE root — the object's world origin. The animated
//     `Hair_<name>` nulls drive the hair purely by parenting; there are no
//     per-strand anchors.
//   * the engine's PRNG is MSVC rand() and `srand` is NEVER called, so the
//     seed is the CRT's initial 1 and the strand directions are identical on
//     every run. That makes the shape deterministic — but it also means the
//     stream is SHARED, so anything else drawing a rand() before the hair is
//     built shifts every direction (METHOD.md's warning about build order).

/** MSVC rand(): seed = seed*0x343FD + 0x269EC3; return (seed >> 16) & 0x7FFF */
export function msvcRand(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 0x343FD) + 0x269EC3) >>> 0; return (s >>> 16) & 0x7fff; };
}

export function parseHair(text) {
  const tok = text.split(/\s+/).filter(Boolean);
  const h = {
    rootStiffness: 0, tipStiffness: 0, hairCount: 0, nodesPerHair: 0,
    hairLength: 1, gravity: [0, 0, 0], additive: 1,
    diffuseColor: [255, 255, 255], specularColor: [255, 255, 255],
    specularExponent: 8, unknown: [],
  };
  const num = (i) => Number(tok[i]);
  for (let i = 0; i < tok.length; i++) {
    switch (tok[i]) {
      case 'RootStiffness': h.rootStiffness = num(++i); break;
      case 'TipStiffness': h.tipStiffness = num(++i); break;
      case 'HairCount': h.hairCount = num(++i) | 0; break;
      case 'NodesPerHair': h.nodesPerHair = num(++i) | 0; break;
      case 'HairLength': h.hairLength = num(++i); break;
      case 'Gravity': h.gravity = [num(++i), num(++i), num(++i)]; break;
      case 'Additive': h.additive = num(++i) | 0; break;
      case 'DiffuseColor': h.diffuseColor = [num(++i), num(++i), num(++i)]; break;
      case 'SpecularColor': h.specularColor = [num(++i), num(++i), num(++i)]; break;
      case 'SpecularExponent': h.specularExponent = num(++i); break;
      default: if (!/^[-0-9.]/.test(tok[i])) h.unknown.push(tok[i]);
    }
  }
  return h;
}

/**
 * Build the strands. Directions are `rand()/32767 - 0.5` per axis then
 * normalised — a cube-biased distribution, not a uniform sphere, which is
 * part of the look and must not be "corrected" to a proper sphere sample.
 * Nodes start laid out straight along the direction.
 */
export function buildStrands(h, rand = msvcRand()) {
  const segLen = h.hairLength / Math.max(1, h.nodesPerHair);
  const strands = [];
  for (let s = 0; s < h.hairCount; s++) {
    // The three draws land in REVERSE order: 0x42393f-0x423ba1 computes r1,
    // r2, r3 in that sequence and stores dir = (r3*inv, r2*inv, r1*inv), so
    // the FIRST value drawn becomes Z and the third becomes X. Consuming the
    // stream in order and assigning x,y,z in order gives a different strand
    // for the same seed — statistically the same cloud, but not the same
    // hair, and this demo's hair is deterministic by design.
    const r1 = rand() * (1 / 32767) - 0.5;
    const r2 = rand() * (1 / 32767) - 0.5;
    const r3 = rand() * (1 / 32767) - 0.5;
    const d = [r3, r2, r1];
    const len = Math.hypot(...d) || 1;
    const dir = d.map((x) => x / len);
    // node[0] IS the root anchor at the object origin and is never
    // integrated; nodes 1..N-1 lie along `dir`.
    const nodes = [];
    for (let n = 0; n < h.nodesPerHair; n++) {
      const k = n;
      nodes.push({
        pos: [dir[0] * segLen * k, dir[1] * segLen * k, dir[2] * segLen * k],
        segLen,
        // stiffness lerps Root -> Tip across the strand
        stiff: h.rootStiffness + (h.tipStiffness - h.rootStiffness) *
          (h.nodesPerHair > 1 ? n / (h.nodesPerHair - 1) : 0),
      });
    }
    strands.push({ dir, nodes });
  }
  return strands;
}

/**
 * One integration step (FUN_0042d220). Note gravity is a DISPLACEMENT RATE,
 * not an acceleration, and the carried tangent is left UN-normalised — both
 * are load-bearing, and both make the result dt-dependent, so a port must
 * step at the same rate the original ran at rather than integrate analytically.
 *
 *   pos_i = P + normalize((pos_i + dt*g - P) + T*(dt*stiff_i)) * segLen_i
 *   T = pos_i - P      (un-normalised)
 *   P = pos_i
 */
export function stepHair(strands, root, gravity, dt) {
  for (const st of strands) {
    // P starts at the root and T starts at the strand DIRECTION, not zero.
    // Starting T at zero kills the stiffness term on the first segment, the
    // strand loses its directional memory, and after a few hundred steps
    // gravity drags every strand to the same equilibrium — 500 strands
    // collapse into a single vertical line. node[0] is the anchor and is
    // skipped, per FUN_0042d220's `for i = 1 .. N-1`.
    let P = root, T = st.dir.slice();
    for (let i = 1; i < st.nodes.length; i++) {
      const nd = st.nodes[i];
      const a = [
        nd.pos[0] + dt * gravity[0] - P[0] + T[0] * (dt * nd.stiff),
        nd.pos[1] + dt * gravity[1] - P[1] + T[1] * (dt * nd.stiff),
        nd.pos[2] + dt * gravity[2] - P[2] + T[2] * (dt * nd.stiff),
      ];
      const l = Math.hypot(a[0], a[1], a[2]) || 1;
      const np = [P[0] + a[0] / l * nd.segLen, P[1] + a[1] / l * nd.segLen, P[2] + a[2] / l * nd.segLen];
      T = [np[0] - P[0], np[1] - P[1], np[2] - P[2]];
      P = np;
      nd.pos = np;
    }
  }
}

/**
 * Simulate from rest to `time`, stepping at `dt` (the original free-ran).
 *
 * `frame` is either a fixed root position or, correctly, a function
 * `t -> world matrix of the hair null at time t`. THE ROOT HAS TO MOVE. Every
 * shipped hair null is animated, and `HairMesh::update` re-derives the world
 * matrix each frame (FUN_00424100, hair+0xbc == 0 -> FUN_0040f9f0) before
 * stepping, so P is wherever the null is NOW. Dragging that anchor through
 * space is the entire source of the motion — it is what hair dynamics ARE.
 *
 * Holding the root fixed does not merely lose the animation, it changes the
 * answer completely, and in a way that hides itself: the integrator's fixed
 * point is "segment parallel to (gravity + T*stiffness)", a condition with no
 * dt in it. A stationary tuft therefore converges to a dt-INDEPENDENT
 * equilibrium within a couple of hundred steps and then stops moving, so the
 * simulation quietly stops being a simulation and RENDER.md §11.1's "same dt
 * => same image, different dt => visibly different hair" reads as false. That
 * contradiction is what exposed the bug: a dt sweep produced identical frames
 * to four decimal places, which is not a property the real integrator has.
 */
export function simulate(strands, frame, gravity, time, dt = 1 / 60, onStep = null) {
  const matAt = typeof frame === 'function' ? frame : null;
  const fixed = matAt ? null : frame;
  const steps = Math.max(0, Math.round(time / dt));
  for (let i = 0; i < steps; i++) {
    const t = Math.min(time, (i + 1) * dt);
    let root = fixed;
    if (matAt) {
      const M = matAt(t);
      root = [M[12], M[13], M[14]];
      // Rdir = M3x3 . strand.dir (0x42d276-0x42d33c) — the strand directions
      // rotate with the null, so a spinning null whips the hair around.
      for (const st of strands) {
        const d = st.baseDir ?? (st.baseDir = st.dir.slice());
        st.dir = [
          M[0] * d[0] + M[4] * d[1] + M[8] * d[2],
          M[1] * d[0] + M[5] * d[1] + M[9] * d[2],
          M[2] * d[0] + M[6] * d[1] + M[10] * d[2],
        ];
      }
    }
    stepHair(strands, root, gravity, dt);
    // Anything anchored to the hair has to advance INSIDE this loop, on the
    // same clock. Part_Pehko's particle systems are the case that matters:
    // its per-frame body writes each system's position from the live node and
    // then updates the system, all within one frame, so they cannot be run as
    // a second pass over the final pose.
    if (onStep) onStep(t, strands, root, dt);
  }
  return strands;
}

/**
 * Per-vertex SHADING normals (RENDER.md §11.1, 0x42d40a and 0x42d6f0).
 *
 *   n = normalize( (Lp - V) - T̂ · dot(T̂, Lp - V) )
 *
 * i.e. the component of "vertex to light" perpendicular to the strand
 * tangent, where the tangent is the strand direction at the root and the
 * previous segment elsewhere. This is a lighting construction, not geometry:
 * a line has no surface normal, and this particular choice is what makes
 * fixed-function GL_LINES look like lit hair. It depends on the light
 * position, so it is recomputed every frame — it cannot be baked with the
 * strand.
 */
export function shadeNormals(strands, root, lightPos) {
  const perp = (toLight, tan) => {
    const tl = Math.hypot(...tan) || 1;
    const t = [tan[0] / tl, tan[1] / tl, tan[2] / tl];
    const d = t[0] * toLight[0] + t[1] * toLight[1] + t[2] * toLight[2];
    const n = [toLight[0] - t[0] * d, toLight[1] - t[1] * d, toLight[2] - t[2] * d];
    const l = Math.hypot(...n) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const toL = (p) => [lightPos[0] - p[0], lightPos[1] - p[1], lightPos[2] - p[2]];
  for (const st of strands) {
    // node[0] sits at the root and its tangent is the strand direction.
    st.nodes[0].nrm = perp(toL(root), st.dir);
    let P = root;
    for (let i = 1; i < st.nodes.length; i++) {
      const D = st.nodes[i].pos;
      st.nodes[i].nrm = perp(toL(D), [D[0] - P[0], D[1] - P[1], D[2] - P[2]]);
      P = D;
    }
  }
  return strands;
}

/**
 * Expand to triangles for WIDE lines. The engine draws GL_LINES after
 * `glLineWidth(3.0f)` (0x424173), and WebGL2 clamps line width to 1 on every
 * implementation — so drawing gl.LINES here renders a third of the original's
 * coverage. On krediili and hairball, which are nothing but hair (1000 and
 * 1020 strands) blended (ONE, ONE), that is most of the image.
 *
 * Each segment becomes two triangles, widened in SCREEN SPACE by the vertex
 * shader. The widening axis follows GL's own wide-line rule rather than the
 * usual perpendicular-to-segment quad: a non-antialiased wide line is
 * rasterised as a rectangle offset along y when the segment is x-major and
 * along x when it is y-major. (GL_LINE_SMOOTH, 0x0b20, never appears in the
 * binary, so the aliased rule is the right one.)
 *
 * Layout per vertex, 10 floats: pos(3) normal(3) otherEnd(3) side(1).
 */
export function toLineVerts(strands, root) {
  const segs = strands.reduce((a, st) => a + Math.max(0, st.nodes.length - 1), 0);
  const out = new Float32Array(segs * 6 * 10);
  let o = 0;
  const put = (p, n, q, side) => {
    out[o++] = p[0]; out[o++] = p[1]; out[o++] = p[2];
    out[o++] = n[0]; out[o++] = n[1]; out[o++] = n[2];
    out[o++] = q[0]; out[o++] = q[1]; out[o++] = q[2];
    out[o++] = side;
  };
  const Z = [0, 0, 1];
  for (const st of strands) {
    let prev = root, prevN = st.nodes[0].nrm ?? Z;   // node[0] IS the root
    for (let i = 1; i < st.nodes.length; i++) {
      const cur = st.nodes[i].pos, curN = st.nodes[i].nrm ?? Z;
      put(prev, prevN, cur, -1); put(prev, prevN, cur, +1); put(cur, curN, prev, -1);
      put(cur, curN, prev, -1);  put(prev, prevN, cur, +1); put(cur, curN, prev, +1);
      prev = cur; prevN = curN;
    }
  }
  return out;
}
