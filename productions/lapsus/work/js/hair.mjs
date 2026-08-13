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
    const d = [0, 1, 2].map(() => rand() * (1 / 32767) - 0.5);
    const len = Math.hypot(...d) || 1;
    const dir = d.map((x) => x / len);
    const nodes = [];
    for (let n = 0; n < h.nodesPerHair; n++) {
      const k = n + 1;
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
    let P = root, T = [0, 0, 0];
    for (const nd of st.nodes) {
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

/** Simulate from rest to `time`, stepping at `dt` (the original free-ran). */
export function simulate(strands, root, gravity, time, dt = 1 / 60) {
  const steps = Math.max(0, Math.round(time / dt));
  for (let i = 0; i < steps; i++) stepHair(strands, root, gravity, dt);
  return strands;
}

/** Flatten to GL_LINES positions: root->node0, node0->node1, ... */
export function toLines(strands, root) {
  const out = [];
  for (const st of strands) {
    let prev = root;
    for (const nd of st.nodes) { out.push(...prev, ...nd.pos); prev = nd.pos; }
  }
  return new Float32Array(out);
}
