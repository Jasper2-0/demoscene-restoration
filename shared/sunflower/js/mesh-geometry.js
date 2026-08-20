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
export function buildMeshGeometry(mesh, { wonderNormals = false } = {}) {
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
  for (let face = 0; face < faceCount; face++) {
    const smoothing = mesh.faceFlags[face];
    for (let corner = 0; corner < 3; corner++) {
      const expanded = face * 3 + corner;
      const vertex = mesh.indices[expanded];
      positions[expanded * 3] = mesh.positions[vertex * 3];
      positions[expanded * 3 + 1] = mesh.positions[vertex * 3 + 1];
      positions[expanded * 3 + 2] = mesh.positions[vertex * 3 + 2];
      indices[expanded] = expanded;

      if (mesh.texcoordIndices.length) {
        const textureVertex = mesh.texcoordIndices[expanded];
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
  return { positions, texcoords, normals, nativeNormals, indices };
}

/**
 * EXPERIMENTAL PLACEHOLDER — an empirical model of Wonder's per-vertex facing
 * flag. **Off by default and not part of any authentic build.**
 *
 * `wONDEr.exe` rejects triangles at 0x004076cf: a triangle is submitted iff any
 * of its three vertices carries a non-zero byte at `vertex+0x4c`. That flag is a
 * boolean written once at load, and reading it out of the running engine shows it
 * is ~96% predicted by `dot(vertexNormal, D) > t`. The code that WRITES it has not
 * been found, so this is a FIT, not the recovered rule — see
 * `productions/wonder/work/re/EFFECT_STATUS.md` for the measurements, the three
 * model forms tested, and why the remaining 4% matters.
 *
 * METHOD.md permits an empirical fit "only as an explicitly marked placeholder,
 * and it is dangerous precisely when it looks convincing". This exists to TEST the
 * hypothesis: if the model is right the sweep score should move markedly, and if it
 * barely moves the model is wrong. The score is evidence here, not a goal, and this
 * must not be enabled in a build that claims to be authentic.
 */
export const WONDER_FACING_FIT = Object.freeze({
  direction: Object.freeze([-0.50391, -0.80190, +0.32099]),
  threshold: 0.07377,
  accuracy: 0.9604,
});

/** Per-vertex flags under the fitted model. Returns a Uint8Array, 1 = keep. */
export function wonderFacingFlags(mesh, fit = WONDER_FACING_FIT) {
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
  const flags = wonderFacingFlags(mesh, fit);
  const kept = [];
  for (let face = 0; face < mesh.faceCount; face++) {
    const a = mesh.indices[face * 3], b = mesh.indices[face * 3 + 1], c = mesh.indices[face * 3 + 2];
    if (flags[a] || flags[b] || flags[c]) kept.push(face);
  }
  return kept;
}
