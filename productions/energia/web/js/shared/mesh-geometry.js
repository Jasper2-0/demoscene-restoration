/** Convert EXP's independently-indexed position/UV faces to WebGL geometry. */
export function buildMeshGeometry(mesh) {
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
        // Wonder's EXP callback passes both stored floats straight to
        // glTexCoord2fv. Its JPEG decoder and an HTML image uploaded with
        // UNPACK_FLIP_Y_WEBGL disabled also have the same top-down row order,
        // so reversing V here would diverge from the native upload/UV pair.
        texcoords[expanded * 2 + 1] = mesh.texcoords[textureVertex * 2 + 1];
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
  return { positions, texcoords, normals, indices };
}
