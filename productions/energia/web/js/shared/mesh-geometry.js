/**
 * Reproduce the one normal Wonder stores on each shared EXP vertex.
 *
 * FUN_00406e20 first stores every unit face normal as a float, then adds it
 * into all three incident vertices with a float store after each addition.
 * EXP smoothing flags do not participate in this path.
 */
export function buildWonderVertexNormals(mesh) {
  const sums = new Float32Array(mesh.vertexCount * 3);
  for (let face = 0; face < mesh.faceCount; face++) {
    const ia = mesh.indices[face * 3];
    const ib = mesh.indices[face * 3 + 1];
    const ic = mesh.indices[face * 3 + 2];
    const a = ia * 3, b = ib * 3, c = ic * 3;
    const abx = mesh.positions[b] - mesh.positions[a];
    const aby = mesh.positions[b + 1] - mesh.positions[a + 1];
    const abz = mesh.positions[b + 2] - mesh.positions[a + 2];
    const acx = mesh.positions[c] - mesh.positions[a];
    const acy = mesh.positions[c + 1] - mesh.positions[a + 1];
    const acz = mesh.positions[c + 2] - mesh.positions[a + 2];
    // FUN_00406e20 forms (C-A) x (B-A), the reverse of the conventional
    // triangle normal used by buildMeshGeometry below. The sign is observable
    // in Wonder's environment UVs and in the shite vertex modifier.
    let nx = acy * abz - acz * aby;
    let ny = acz * abx - acx * abz;
    let nz = acx * aby - acy * abx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx = Math.fround(nx / length);
    ny = Math.fround(ny / length);
    nz = Math.fround(nz / length);
    for (const vertex of [ia, ib, ic]) {
      const offset = vertex * 3;
      sums[offset] = Math.fround(sums[offset] + nx);
      sums[offset + 1] = Math.fround(sums[offset + 1] + ny);
      sums[offset + 2] = Math.fround(sums[offset + 2] + nz);
    }
  }

  const normals = new Float32Array(sums.length);
  for (let vertex = 0; vertex < mesh.vertexCount; vertex++) {
    const offset = vertex * 3;
    const length = Math.hypot(sums[offset], sums[offset + 1], sums[offset + 2]);
    if (!length) continue;
    normals[offset] = Math.fround(sums[offset] / length);
    normals[offset + 1] = Math.fround(sums[offset + 1] / length);
    normals[offset + 2] = Math.fround(sums[offset + 2] / length);
  }
  return normals;
}

function expandWonderVertexNormals(mesh, vertexNormals) {
  const expandedNormals = new Float32Array(mesh.faceCount * 9);
  for (let expanded = 0; expanded < mesh.faceCount * 3; expanded++) {
    const vertex = mesh.indices[expanded];
    expandedNormals[expanded * 3] = vertexNormals[vertex * 3];
    expandedNormals[expanded * 3 + 1] = vertexNormals[vertex * 3 + 1];
    expandedNormals[expanded * 3 + 2] = vertexNormals[vertex * 3 + 2];
  }
  return expandedNormals;
}

/** Convert EXP's independently-indexed position/UV faces to WebGL geometry. */
export function buildMeshGeometry(mesh, { wonderNormals = false, facingCull = null } = {}) {
  const keep = facingCull ? new Set(wonderSurvivingFaces(mesh, facingCull)) : null;
  const faceCount = mesh.faceCount;
  const faceNormals = new Array(faceCount);
  const incident = Array.from({ length: mesh.vertexCount }, () => []);
  for (let face = 0; face < faceCount; face++) {
    const ia = mesh.indices[face * 3];
    const ib = mesh.indices[face * 3 + 1];
    const ic = mesh.indices[face * 3 + 2];
    const a = ia * 3, b = ib * 3, c = ic * 3;
    const abx = mesh.positions[b] - mesh.positions[a];
    const aby = mesh.positions[b + 1] - mesh.positions[a + 1];
    const abz = mesh.positions[b + 2] - mesh.positions[a + 2];
    const acx = mesh.positions[c] - mesh.positions[a];
    const acy = mesh.positions[c + 1] - mesh.positions[a + 1];
    const acz = mesh.positions[c + 2] - mesh.positions[a + 2];
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length; ny /= length; nz /= length;
    faceNormals[face] = [nx, ny, nz];
    incident[ia].push(face); incident[ib].push(face); incident[ic].push(face);
  }

  const positions = new Float32Array(faceCount * 9);
  const texcoords = new Float32Array(faceCount * 6);
  const normals = new Float32Array(faceCount * 9);
  const indices = new Uint32Array(faceCount * 3);
  let emitted = 0;
  for (let face = 0; face < faceCount; face++) {
    if (keep && !keep.has(face)) continue;
    const smoothing = mesh.faceFlags[face];
    const outFace = emitted++;
    for (let corner = 0; corner < 3; corner++) {
      const source = face * 3 + corner;
      const expanded = outFace * 3 + corner;
      const vertex = mesh.indices[source];
      positions[expanded * 3] = mesh.positions[vertex * 3];
      positions[expanded * 3 + 1] = mesh.positions[vertex * 3 + 1];
      positions[expanded * 3 + 2] = mesh.positions[vertex * 3 + 2];
      indices[expanded] = expanded;

      if (mesh.texcoordIndices.length) {
        const textureVertex = mesh.texcoordIndices[source];
        texcoords[expanded * 2] = mesh.texcoords[textureVertex * 2];
        // Wonder's loader calls FUN_00406db0 with 1.0 - the exported V at
        // 0x4064af. The later draw callback passes this stored value straight
        // to glTexCoord2fv, so preserve the loader conversion here.
        texcoords[expanded * 2 + 1] = 1 - mesh.texcoords[textureVertex * 2 + 1];
      }

      let nx = 0, ny = 0, nz = 0;
      if (smoothing === 0) {
        [nx, ny, nz] = faceNormals[face];
      } else {
        for (const adjacent of incident[vertex]) {
          if ((smoothing & mesh.faceFlags[adjacent]) === 0) continue;
          nx += faceNormals[adjacent][0];
          ny += faceNormals[adjacent][1];
          nz += faceNormals[adjacent][2];
        }
        const length = Math.hypot(nx, ny, nz) || 1;
        nx /= length; ny /= length; nz /= length;
      }
      normals[expanded * 3] = nx;
      normals[expanded * 3 + 1] = ny;
      normals[expanded * 3 + 2] = nz;
    }
  }
  const nativeNormals = wonderNormals
    ? expandWonderVertexNormals(mesh, buildWonderVertexNormals(mesh))
    : null;
  if (keep && emitted < faceCount) {
    return {
      positions: positions.subarray(0, emitted * 9),
      texcoords: texcoords.subarray(0, emitted * 6),
      normals: normals.subarray(0, emitted * 9),
      nativeNormals: nativeNormals ? nativeNormals.subarray(0, emitted * 9) : nativeNormals,
      indices: indices.subarray(0, emitted * 3),
    };
  }
  return { positions, texcoords, normals, nativeNormals, indices };
}


/**
 * Wonder's per-vertex camera-facing test — the real rule, not the fit.
 *
 * `FUN_004070d0` walks the vertex array (stride 0x74, count at object +0xd4) once
 * per frame and writes one byte per vertex:
 *
 *     vertex[+0x4c] = dot(P - Clocal, Nengine) < 0 ? 1 : 0
 *
 * P is vertex+0x30, Nengine the smooth normal at vertex+0x3c, and Clocal the camera
 * in the object's local space. The x87 is at 0x00407332-0x0040735e; both stores are
 * `[ECX+0x18]` against a pointer pre-biased by `LEA ECX,[EDX+0x34]`, which is why
 * searching for a literal `+0x4c` store found nothing for so long. The consumer
 * `FUN_00407650` at 0x004076c5 submits a triangle iff
 * `material[+0x94] != 0 || (v0|v1|v2)[+0x4c]` — ANY corner facing is enough.
 *
 * PROVEN, not fitted. The stub dumped +0x3c and +0x4c per vertex out of the running
 * executable; solving for the single point C that satisfies the inequality
 * reproduces **100.00%** of the flags on three separate instances, where the best
 * fixed-DIRECTION model plateaued at 96.04%. That plateau was the far-field
 * approximation of a point, and the residual 4% was the parallax.
 *
 * TWO SIGN CORRECTIONS, both measured rather than chosen:
 *  - `buildWonderVertexNormals` returns the engine's normals NEGATED. Measured
 *    dot(Nengine, Nport) = -1.0000 on 100% of vertices in all three arrays. So with
 *    port normals the comparison is `> 0`, which is what this function applies.
 *  - Clocal needs its Z negated relative to inverse(objectMatrix) * cameraWorld;
 *    see the call site.
 * Getting only one of the two right is worse than getting neither, which is exactly
 * what happened twice before they were measured.
 */
export function wonderFacingFlags(mesh, portNormals, cameraLocal, output = null) {
  const count = mesh.vertexCount;
  const flags = output && output.length >= count ? output : new Uint8Array(count);
  const [cx, cy, cz] = cameraLocal;
  for (let v = 0; v < count; v++) {
    const p = v * 3;
    const dot = (mesh.positions[p] - cx) * portNormals[p]
      + (mesh.positions[p + 1] - cy) * portNormals[p + 1]
      + (mesh.positions[p + 2] - cz) * portNormals[p + 2];
    flags[v] = dot > 0 ? 1 : 0;
  }
  return flags;
}

/**
 * Surviving expanded indices for one frame, in submission order.
 *
 * `buildMeshGeometry` gives face f its own three vertices at expanded slots 3f,
 * 3f+1, 3f+2, but the flag lives on the SHARED vertex `mesh.indices` points at,
 * which is what the executable ORs. Both indexings are needed and confusing them
 * culls the wrong triangles while keeping the count plausible.
 */
export function wonderFacingIndices(mesh, flags, output = null) {
  const faceCount = mesh.faceCount;
  const indices = output && output.length >= faceCount * 3
    ? output : new Uint32Array(faceCount * 3);
  let n = 0;
  for (let face = 0; face < faceCount; face++) {
    const e = face * 3;
    if (!(flags[mesh.indices[e]] | flags[mesh.indices[e + 1]] | flags[mesh.indices[e + 2]])) continue;
    indices[n++] = e; indices[n++] = e + 1; indices[n++] = e + 2;
  }
  return indices.subarray(0, n);
}

/**
 * SUPERSEDED, kept as the shipping default until the per-frame rule below is
 * finished. wonderFacingFlags() is the real criterion and is proven at 100%
 * against the engine's own flags, where this fit plateaus at 96.04% — but the
 * port cannot yet compute the per-frame Clocal to the same accuracy, so this
 * still renders woah3 better. See EFFECT_STATUS.md.
 */
export const WONDER_FACING_FIT = Object.freeze({
  direction: Object.freeze([-0.50391, -0.80190, +0.32099]),
  threshold: 0.07377,
  accuracy: 0.9604,
});

/** Per-vertex flags under the fitted model. Returns a Uint8Array, 1 = keep. */
export function wonderFittedFacingFlags(mesh, fit = WONDER_FACING_FIT) {
  const normals = buildWonderVertexNormals(mesh);
  const [dx, dy, dz] = fit.direction;
  const flags = new Uint8Array(mesh.vertexCount);
  for (let v = 0; v < mesh.vertexCount; v++) {
    const d = normals[v * 3] * dx + normals[v * 3 + 1] * dy + normals[v * 3 + 2] * dz;
    flags[v] = d > fit.threshold ? 1 : 0;
  }
  return flags;
}

/**
 * The triangles the gate would submit: those with at least one flagged vertex.
 * Returns the surviving face indices, so a caller can compare counts against the
 * original's recorded draw stream without rebuilding any buffers.
 */
export function wonderSurvivingFaces(mesh, fit = WONDER_FACING_FIT) {
  const flags = wonderFittedFacingFlags(mesh, fit);
  const kept = [];
  for (let face = 0; face < mesh.faceCount; face++) {
    const a = mesh.indices[face * 3], b = mesh.indices[face * 3 + 1], c = mesh.indices[face * 3 + 2];
    if (flags[a] || flags[b] || flags[c]) kept.push(face);
  }
  return kept;
}

/**
 * Surviving expanded indices, computed from the CURRENT geometry buffers.
 *
 * The per-unique-vertex form above reads `mesh.positions` and normals captured
 * when the renderer was built. That is wrong for any mesh a runtime modifier
 * rewrites: Wonder's 0x40e490 modifier "restores its saved source vertices,
 * applies its current object-frame phases, then regenerates the mesh normals"
 * for shite1.exp's first four meshes, so the facing test there was reading
 * geometry the engine had already replaced. Measured: the port culled Sphere02 to
 * 615 vertices where the executable submits 519, with the modelview matching the
 * executable exactly (-104.2785, 16.6955, -2770.874), which ruled out the camera.
 *
 * buildMeshGeometry gives every face its own three vertices, so a face's corners
 * are the expanded slots 3f, 3f+1, 3f+2 and the OR across them is the same test
 * the executable applies across the three shared vertices it indexes.
 */
export function wonderFacingIndicesFromGeometry(geometry, cameraLocal, output = null) {
  const pos = geometry.positions;
  const nrm = geometry.nativeNormals ?? geometry.normals;
  const faceCount = Math.floor(pos.length / 9);
  const indices = output && output.length >= faceCount * 3
    ? output : new Uint32Array(faceCount * 3);
  const [cx, cy, cz] = cameraLocal;
  let n = 0;
  for (let face = 0; face < faceCount; face++) {
    let keep = 0;
    for (let corner = 0; corner < 3 && !keep; corner++) {
      const e = (face * 3 + corner) * 3;
      const d = (pos[e] - cx) * nrm[e] + (pos[e + 1] - cy) * nrm[e + 1] + (pos[e + 2] - cz) * nrm[e + 2];
      if (d > 0) keep = 1;
    }
    if (!keep) continue;
    const e = face * 3;
    indices[n++] = e; indices[n++] = e + 1; indices[n++] = e + 2;
  }
  return indices.subarray(0, n);
}
