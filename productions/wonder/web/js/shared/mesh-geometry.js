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
