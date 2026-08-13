// meshgen_test.mjs — test suite for meshgen.mjs / scene_desc.mjs / camera.mjs.
// Run: node js/meshgen_test.mjs
//
// These are real assertions against values read out of the binary or derived
// analytically, not snapshots of this port's own output — except where noted
// ("regression guard").

import {
  Mesh, VERTEX_FLOATS, VERTEX_STRIDE, V_NX, V_COL, K,
  QUAD_CW, QUAD_CCW, QUAD_RIBBON, QUAD_ALT,
  buildGrid, tessellate, bilinearSample, worldToMap,
  upsampleHeightmap, downsampleHeightmap, buildTerrain, buildWaterPlane,
  shorelineAlpha, applyShorelineColours, TERRAIN_EXTENTS, stitchRing, rand, srand,
  buildRevolution, buildTree, scatter, rand01, modulateARGB, TREE,
  buildTerrainTessellated, resampleHeights, transferGridNormals,
  buildBillboards, buildPrecipitation, buildLensDroplets, buildRibbon, updateRibbon,
  buildBird, buildFlock, buildCloudSky, buildCloudNoiseQuads, buildCloudBlitQuad, quadUV,
  mat4Identity, mat4Mul, mat4Euler, mat4Transform,
} from './meshgen.mjs';
import { RESOURCES } from './resources.mjs';
import {
  decodeAllScenes, decodeSceneDescriptor, DESC_RES_MAP, ACTIVE_SCENES,
  FLAG_BITS, LEAF_COLOUR_GREEN, LEAF_COLOUR_AUTUMN,
} from './scene_desc.mjs';
import { CameraPath, bfloat16, hermite, decodeCameraPaths, cameraResourcesForScene } from './camera.mjs';

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail = '') {
  if (cond) { pass++; } else { fail++; failures.push(name + (detail ? '  — ' + detail : '')); }
}
function eq(name, a, b, detail = '') { ok(name, Object.is(a, b) || a === b, detail || `${a} !== ${b}`); }
function near(name, a, b, tol = 1e-5) { ok(name, Math.abs(a - b) <= tol, `${a} vs ${b}`); }
function bytesEqual(a, b) {
  const A = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
  const B = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
  return true;
}
function section(s) { console.log('\n--- ' + s + ' ---'); }

// ===========================================================================
section('vertex layout / container');
// ===========================================================================
eq('stride is 44 bytes (FVF 0x252)', VERTEX_STRIDE, 44);
eq('11 floats per vertex', VERTEX_FLOATS, 11);
{
  const m = new Mesh(3, 1);
  ok('allocVerts sets diffuse to 0xFFFFFFFF (FUN_00404380)',
    m.getColor(0) === 0xffffffff && m.getColor(2) === 0xffffffff);
  ok('allocVerts leaves normals zero (VirtualAlloc zero-fill)',
    m.verts[V_NX] === 0 && m.verts[V_NX + 1] === 0 && m.verts[V_NX + 2] === 0);
  eq('index array is 3 u16 per triangle', m.indices.length, 3);
  eq('face-normal array is 3 floats per triangle', m.faceNormals.length, 3);
}
{ // quad index templates, byte-for-byte from the image
  eq('QUAD_RIBBON [0x418ed4]', QUAD_RIBBON.join(','), '0,1,2,3,2,1');
  eq('QUAD_CW     [0x418edc]', QUAD_CW.join(','), '0,1,2,2,3,0');
  eq('QUAD_CCW    [0x418ee4]', QUAD_CCW.join(','), '0,3,2,2,1,0');
  eq('QUAD_ALT    [0x418eec]', QUAD_ALT.join(','), '0,2,3,3,1,0');
}
eq('normal averaging scale is -1.0f [0x4170cc]', K.NEG_ONE_F, -1.0);

// ===========================================================================
section('FUN_004045f1 — normal generator');
// ===========================================================================
{
  // One flat CCW triangle in the XZ plane using the grid's winding.
  // grid tri A = (c+b0, c+b1, c+1+b1); for a unit cell that is
  // (0,0,0) -> (0,0,1) -> (1,0,1).  cross(e1,e2) = +Y for this order.
  const m = new Mesh(3, 1);
  m.setPos(0, 0, 0, 0); m.setPos(1, 0, 0, 1); m.setPos(2, 1, 0, 1);
  m.setTri(0, 0, 1, 2);
  m.computeNormals();
  const n = m.getNormal(0);
  ok('flat XZ triangle -> vertex normal +Y', n[0] === 0 && n[1] === 1 && n[2] === 0, JSON.stringify(n));
  const fn = Array.from(m.faceNormals);
  ok('face normal is the NEGATED vertex normal (-Y)', fn[0] === 0 && fn[1] === -1 && fn[2] === 0, JSON.stringify(fn));
  eq('incident count is unweighted 1.0', m.ncount[0], 1);
}
{
  // A 90-degree crease: two unit quads meeting at a right angle.  The shared
  // edge vertices must get |n| = |(+Y + +X)/2| = sqrt(2)/2 ~ 0.7071, NOT 1.
  // This is the property that darkens creases.
  const m = new Mesh(6, 2);
  m.setPos(0, 0, 0, 0); m.setPos(1, 0, 0, 1); m.setPos(2, 1, 0, 1);   // +Y face
  m.setPos(3, 0, 0, 0); m.setPos(4, 0, 1, 0); m.setPos(5, 0, 1, 1);   // a +X face
  m.setTri(0, 0, 1, 2);
  m.setTri(1, 0, 4, 5);   // shares vertex 0, lies in the YZ plane
  m.computeNormals();
  const n0 = m.getNormal(0);
  const len = Math.hypot(n0[0], n0[1], n0[2]);
  ok('shared vertex normal is NOT renormalised (|n| < 1)', len < 0.999, 'len=' + len);
  eq('shared vertex incident count', m.ncount[0], 2);
}
{
  // Unweighted: a vertex shared by two coplanar triangles of very different
  // area still gets |n| == 1 exactly, because each contributes a UNIT normal.
  const m = new Mesh(4, 2);
  m.setPos(0, 0, 0, 0); m.setPos(1, 0, 0, 1); m.setPos(2, 1, 0, 1); m.setPos(3, 1000, 0, 0);
  m.setTri(0, 0, 1, 2);
  m.setTri(1, 0, 2, 3);
  m.computeNormals();
  const n = m.getNormal(0);
  near('unweighted average: coplanar big+small -> |n| == 1', Math.hypot(n[0], n[1], n[2]), 1, 1e-6);
}
{
  // No degenerate guard: a zero-area triangle poisons all three vertices.
  const m = new Mesh(3, 1);
  m.setPos(0, 0, 0, 0); m.setPos(1, 1, 0, 0); m.setPos(2, 2, 0, 0);   // collinear
  m.setTri(0, 0, 1, 2);
  m.computeNormals();
  ok('degenerate triangle produces NaN (no guard, as in the original)',
    Number.isNaN(m.getNormal(0)[0]) || !Number.isFinite(m.getNormal(0)[0]));
}
{
  // A vertex touched by no triangle: s = -1/0 = -Inf, 0 * -Inf = NaN.
  const m = new Mesh(4, 1);
  m.setPos(0, 0, 0, 0); m.setPos(1, 0, 0, 1); m.setPos(2, 1, 0, 1); m.setPos(3, 5, 5, 5);
  m.setTri(0, 0, 1, 2);
  m.computeNormals();
  ok('orphan vertex normal is NaN', Number.isNaN(m.getNormal(3)[0]));
}

// ===========================================================================
section('FUN_00404875 — parametric grid');
// ===========================================================================
{
  const W = 5, H = 4, extX = 10, extZ = 20;
  const m = new Mesh();
  buildGrid(m, { W, H, extX, extZ, flatY: 3, u0Tile: 2, v0Tile: 4, u1Tile: 16, v1Tile: 16 });
  eq('vertex count = W*H', m.vertexCount, W * H);
  eq('triangle count = (2W-2)(H-1)', m.triCount, (2 * W - 2) * (H - 1));
  // fu = c/W, NOT c/(W-1)
  const p0 = m.getPos(0), pLast = m.getPos(W - 1);
  near('x at column 0 is -extX', p0[0], -extX);
  near('x at last column is (W-1)/W * 2*extX - extX (the /W quirk)',
    pLast[0], (W - 1) / W * 2 * extX - extX);
  ok('grid does NOT reach +extX (the /W quirk)', pLast[0] < extX - 1e-3, 'x=' + pLast[0]);
  const pz = m.getPos((H - 1) * W);
  near('z at last row is (H-1)/H * 2*extZ - extZ', pz[2], (H - 1) / H * 2 * extZ - extZ);
  near('flat Y is param_2', p0[1], 3);
  // uv0 = (u0Tile*fu, v0Tile*fv), uv1 = (u1Tile*fu, v1Tile*fv)
  const o = (W - 1) * VERTEX_FLOATS;
  near('uv0.u = u0Tile * c/W', m.verts[o + 7], 2 * (W - 1) / W);
  near('uv1.u = u1Tile * c/W', m.verts[o + 9], 16 * (W - 1) / W);
  near('uv0.v = v0Tile * r/H (row 0)', m.verts[8], 0);
  eq('diffuse defaults to 0xFFFFFFFF', m.getColor(0), 0xffffffff);
  // Winding: flat grid -> vertex normals +Y, face normals -Y.
  const n = m.getNormal(W + 1);          // an interior vertex
  ok('flat grid interior normal is +Y', n[1] > 0.99, JSON.stringify(n));
  ok('flat grid face normal is -Y', m.faceNormals[1] < -0.99);
  // Index template
  eq('tri A index 0', m.indices[0], 0);
  eq('tri A index 1', m.indices[1], W);
  eq('tri A index 2', m.indices[2], W + 1);
  eq('tri B index 0', m.indices[3], W + 1);
  eq('tri B index 1', m.indices[4], 1);
  eq('tri B index 2', m.indices[5], 0);
}
{
  // Height array path: y = h * (1/255) * heightScale, with h read UNSIGNED.
  const W = 2, H = 2;
  const ha = new Int32Array([0, 255, 128, -1]);
  const m = new Mesh();
  buildGrid(m, { W, H, extX: 1, extZ: 1, heightScale: 256, heightArray: ha });
  near('height 0   -> y 0', m.getPos(0)[1], 0);
  near('height 255 -> y 256', m.getPos(1)[1], 256, 1e-3);
  near('height 128 -> y 128.5', m.getPos(2)[1], 128 / 255 * 256, 1e-2);
  ok('negative int32 height is read UNSIGNED (fild qword, zero-extended)',
    m.getPos(3)[1] > 1e6, 'y=' + m.getPos(3)[1]);
}

// ===========================================================================
section('terrain');
// ===========================================================================
eq('terrain local extents (128,256,128)', TERRAIN_EXTENTS.join(','), '128,256,128');
{
  const hm = new Int32Array(128 * 128);
  for (let i = 0; i < hm.length; i++) hm[i] = (i * 7) & 0xff;
  const up = upsampleHeightmap(hm);
  eq('upsample is 256x256', up.length, 256 * 256);
  eq('upsample corner preserves the source texel', up[0], hm[0]);
  const N = 64;
  const dn = downsampleHeightmap(up, N);
  eq('downsample is N*N', dn.length, N * N);
  const t = buildTerrain(hm, N, [4, 1.5, 4]);
  eq('terrain mesh vertex count = N*N', t.mesh.vertexCount, N * N);
  eq('terrain mesh tri count = (2N-2)(N-1)', t.mesh.triCount, (2 * N - 2) * (N - 1));
  eq('terrain mesh scale = scaleVec', t.mesh.scale.join(','), '4,1.5,4');
  const o = (N + 1) * VERTEX_FLOATS;
  near('terrain uv1 tiling is 16 [0x418f0c]', t.mesh.verts[o + 9], 16 * 1 / N, 1e-4);
  near('terrain uv0 tiling is 1', t.mesh.verts[o + 7], 1 / N, 1e-4);
  // World extent = +-128 * scale.xz, world height = 256 * scale.y
  let maxY = 0;
  for (let i = 0; i < t.mesh.vertexCount; i++) maxY = Math.max(maxY, t.mesh.getPos(i)[1]);
  ok('local terrain height <= 256', maxY <= 256.001, 'maxY=' + maxY);
}
{
  const a = new Int32Array([0, 100, 200, 300]);   // 2x2
  near('bilinear at (0,0)', bilinearSample(a, 2, 0, 0), 0);
  near('bilinear at (1,0) reads arr[1] exactly (u == 0, no neighbour needed)',
    bilinearSample(a, 2, 1, 0), 100);
  near('bilinear past the last column fades toward 0 (unclamped sampler)',
    bilinearSample(a, 2, 1.5, 0), 50, 1e-2);
  near('bilinear at (0.5,0)', bilinearSample(a, 2, 0.5, 0), 50, 1e-2);
  near('bilinear at (0,0.5)', bilinearSample(a, 2, 0, 0.5), 100, 1e-2);
}
{
  const s = [4, 1.5, 4];
  const [mx, mz] = worldToMap(s, 0, 0);
  near('worldToMap centre -> 128', mx, 128);
  near('worldToMap centre -> 128 (z)', mz, 128);
  const [ox] = worldToMap(s, 128 * 4 + 1, 0);
  eq('worldToMap out of range -> 0', ox, 0);
}

// ===========================================================================
section('water plane + shoreline alpha');
// ===========================================================================
{
  const coarse = buildWaterPlane(false, [3, 0.5, 3]);
  eq('coarse water is 4x4', coarse.vertexCount, 16);
  near('coarse water half-extent 300 [0x418e78]', coarse.getPos(0)[0], -300);
  near('coarse water uv0 tiling 8 [0x418e7c]', coarse.verts[VERTEX_FLOATS + 7], 8 * 1 / 4);
  const hi = buildWaterPlane(true, [3, 0.5, 3]);
  eq('hi-res water is 32x32', hi.vertexCount, 1024);
  eq('hi-res water tri count', hi.triCount, (2 * 32 - 2) * 31);
  near('hi-res water half-extent 600 [0x418e88]', hi.getPos(0)[0], -600);
  near('hi-res water uv0 tiling 5 [0x418e54]', hi.verts[VERTEX_FLOATS + 7], 5 * 1 / 32);
}
{
  // d = hypot(x,z)*0.5 ; if d > 48 then d *= 4 ; a = min(255, (int)d)
  eq('alpha at origin', shorelineAlpha(0, 0), 0);
  eq('alpha just below the 48.0 knee', shorelineAlpha(96, 0), 48);           // d = 48 exactly
  eq('alpha just above the knee jumps x4', shorelineAlpha(96.1, 0), 192);
  eq('alpha saturates at 255', shorelineAlpha(10000, 0), 255);
  ok('the knee is a hard discontinuity',
    shorelineAlpha(96.1, 0) - shorelineAlpha(96, 0) > 100);
}
{
  const terrain = new Mesh();
  buildGrid(terrain, { W: 4, H: 4, extX: 200, extZ: 200, flatY: 0.5 });
  const water = buildWaterPlane(false, [1, 1, 1]);
  applyShorelineColours(terrain, water, 1.0);
  const c = terrain.getColor(0);
  eq('submerged terrain RGB is white', c & 0x00ffffff, 0x00ffffff);
  const a = (c >>> 24) & 255;
  const d = shorelineAlpha(terrain.getPos(0)[0], terrain.getPos(0)[2]);
  eq('submerged terrain alpha = 255 - a', a, (255 - (d < 0x40 ? 0 : d)) & 255);
  eq('water RGB is 0x3f3f3f', water.getColor(5) & 0x00ffffff, 0x003f3f3f);
}
{
  // The `v.y <= waterLevel` threshold is per-vertex and hard.
  const terrain = new Mesh();
  buildGrid(terrain, { W: 4, H: 4, extX: 200, extZ: 200, flatY: 5 });
  const water = buildWaterPlane(false, [1, 1, 1]);
  applyShorelineColours(terrain, water, 1.0);
  eq('terrain above water keeps its default colour', terrain.getColor(0), 0xffffffff);
}

// ===========================================================================
section('tessellation (remaster)');
// ===========================================================================
{
  const src = new Mesh();
  buildGrid(src, { W: 6, H: 5, extX: 10, extZ: 10, u0Tile: 3, v0Tile: 3, u1Tile: 16, v1Tile: 16 });
  const t1 = tessellate(src, 1);
  ok('REGRESSION GUARD: tess=1 vertex buffer is byte-identical', bytesEqual(src.verts, t1.verts));
  ok('REGRESSION GUARD: tess=1 index buffer is byte-identical', bytesEqual(src.indices, t1.indices));
  eq('tess=1 vertex count unchanged', t1.vertexCount, src.vertexCount);
  eq('tess=1 triangle count unchanged', t1.triCount, src.triCount);

  for (const n of [2, 3, 4]) {
    const t = tessellate(src, n);
    eq(`tess=${n} triangle count = ${n}^2 x source`, t.triCount, src.triCount * n * n);
    // Original vertices survive bit-for-bit at their original indices.
    let same = true;
    for (let i = 0; i < src.vertexCount * VERTEX_FLOATS; i++) {
      if (!Object.is(src.verts[i], t.verts[i])) { same = false; break; }
    }
    ok(`tess=${n} preserves the original vertices bit-for-bit`, same);
    // Normals are interpolated, never recomputed: no new vertex may have a
    // normal longer than the longest original one.
    let maxSrc = 0, maxOut = 0;
    for (let i = 0; i < src.vertexCount; i++) {
      const nn = src.getNormal(i); maxSrc = Math.max(maxSrc, Math.hypot(nn[0], nn[1], nn[2]));
    }
    for (let i = src.vertexCount; i < t.vertexCount; i++) {
      const nn = t.getNormal(i); maxOut = Math.max(maxOut, Math.hypot(nn[0], nn[1], nn[2]));
    }
    ok(`tess=${n} interpolated normals do not exceed the source |n|`,
      maxOut <= maxSrc + 1e-6, `${maxOut} > ${maxSrc}`);
  }
}
{
  // Watertight: the tessellated mesh must not gain boundary edges relative to
  // the source (no cracks between neighbouring source triangles).
  const src = new Mesh();
  buildGrid(src, { W: 5, H: 5, extX: 10, extZ: 10 });
  const countBoundary = (m) => {
    const e = new Map();
    for (let t = 0; t < m.triCount; t++) {
      const i = m.indices;
      const tri = [i[t * 3], i[t * 3 + 1], i[t * 3 + 2]];
      for (let k = 0; k < 3; k++) {
        const a = tri[k], b = tri[(k + 1) % 3];
        const key = Math.min(a, b) + ':' + Math.max(a, b);
        e.set(key, (e.get(key) || 0) + 1);
      }
    }
    let n = 0; for (const v of e.values()) if (v === 1) n++;
    return n;
  };
  const b1 = countBoundary(src);
  eq('tess=3 boundary edge count scales by exactly 3 (no cracks)',
    countBoundary(tessellate(src, 3)), b1 * 3);
}
{
  // Double-sided leaf quads: two opposite windings over the same 4 vertices
  // must survive tessellation without being welded or re-wound.
  const m = new Mesh(4, 4);
  m.setPos(0, 0, 0, 0); m.setPos(1, 1, 0, 0); m.setPos(2, 1, 1, 0); m.setPos(3, 0, 1, 0);
  for (let k = 0; k < 6; k++) m.indices[k] = QUAD_CW[k];
  for (let k = 0; k < 6; k++) m.indices[6 + k] = QUAD_CCW[k];
  m.setNormal(0, 0, 0, 1); m.setNormal(1, 0, 0, 1); m.setNormal(2, 0, 0, 1); m.setNormal(3, 0, 0, 1);
  const t = tessellate(m, 2);
  eq('double-wound quad keeps all triangles', t.triCount, 4 * 4);
  // Signed area in XY must have both signs present, in the same proportion.
  let pos = 0, neg = 0;
  for (let i = 0; i < t.triCount; i++) {
    const a = t.getPos(t.indices[i * 3]), b = t.getPos(t.indices[i * 3 + 1]), c = t.getPos(t.indices[i * 3 + 2]);
    const s = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (s > 0) pos++; else if (s < 0) neg++;
  }
  eq('both windings survive (front faces)', pos, 8);
  eq('both windings survive (back faces)', neg, 8);
}
{
  // Seam duplication must survive: two vertices at the same position but with
  // different UVs must NOT be welded.
  const m = new Mesh(4, 2);
  m.setPos(0, 0, 0, 0); m.setPos(1, 1, 0, 0); m.setPos(2, 1, 1, 0); m.setPos(3, 0, 0, 0);
  m.setUV0(0, 0, 0); m.setUV0(3, 1, 0);   // same position, different u — a seam
  m.setTri(0, 0, 1, 2); m.setTri(1, 3, 2, 1);
  const t = tessellate(m, 2);
  const seen = new Set();
  for (let i = 0; i < t.vertexCount; i++) {
    const p = t.getPos(i);
    if (p[0] === 0 && p[1] === 0 && p[2] === 0) seen.add(t.verts[i * VERTEX_FLOATS + 7]);
  }
  eq('UV seam vertices are not welded', seen.size, 2);
}

// ===========================================================================
section('FUN_0040bc63 — surface of revolution');
// ===========================================================================
{
  // Scene 0's only array-A record: radius 3.2, heightRatio 160, 16 rings, 8 segments.
  const m = buildRevolution(3.2, 160, 16, 8);
  eq('verts = rings * segments', m.vertexCount, 16 * 8);
  eq('tris = 2 * segments * (rings-1)', m.triCount, 2 * 8 * 15);
  let ymax = 0, rmax = 0, rtop = 0;
  for (let i = 0; i < m.vertexCount; i++) {
    const p = m.getPos(i);
    ymax = Math.max(ymax, p[1]);
    rmax = Math.max(rmax, Math.hypot(p[0], p[2]));
    if (i >= 15 * 8) rtop = Math.max(rtop, Math.hypot(p[0], p[2]));
  }
  near('total height = radius*heightRatio*(rings-1)/rings', ymax, 3.2 * 160 * 15 / 16, 1e-3);
  near('max radius = 1.001 * radius [0x418f44]', rmax, 1.001 * 3.2, 1e-3);
  near('top ring radius is ~0.001*radius (near-degenerate tip)', rtop, 0.001 * 3.2, 1e-3);
  ok('no UVs are written (corrects MESHGEN_notes 9.8)',
    m.verts[7] === 0 && m.verts[8] === 0 && m.verts[9] === 0 && m.verts[10] === 0);
  eq('vertex colour stays 0xFFFFFFFF', m.getColor(5), 0xffffffff);
  let bad = 0;
  for (let i = 0; i < m.vertexCount; i++) if (!Number.isFinite(m.getNormal(i)[0])) bad++;
  eq('the tip is thin but not exactly degenerate — no NaN normals', bad, 0);
}
{
  // FUN_004078b6 scatter, seed 1.
  const p = scatter(80, [106, 40, 24], [150, 0, 150], { seed: 1 });
  eq('scatter yields `count` points', p.length, 80);
  ok('scatter forces centre.y to 0', p.every(q => q[1] === 0));
  ok('scatter stays inside centre +- extent',
    p.every(q => Math.abs(q[0] - 106) <= 150.001 && Math.abs(q[2] - 24) <= 150.001));
  srand(1);
  const p2 = scatter(80, [106, 40, 24], [150, 0, 150], { seed: 1 });
  eq('scatter is deterministic for a given seed', JSON.stringify(p), JSON.stringify(p2));
}

// ===========================================================================
section('FUN_00409d45 / FUN_0040a186 — L-system tree');
// ===========================================================================
{
  srand(1);
  // Scene 5's only array-E record.
  const t = buildTree({ branchRadius: 10, levelTaper: 0.8, bend: [0.175, 0.2, 0], leafSize: 1.0 });
  eq('node count = (4^5-1)/3 (depth 0..4, 4 children each)', t.nodes, 341);
  eq('branch verts = 341 * 24', t.branches.vertexCount, 341 * 24);
  eq('branch tris  = 341 * 32', t.branches.triCount, 341 * 32);
  eq('leaf verts are a multiple of 8', t.leaves.vertexCount % 8, 0);
  eq('leaf tris = leaf verts / 2 (4 tris per 8-vertex leaf)', t.leaves.triCount, t.leaves.vertexCount / 2);
  const leaves = t.leaves.vertexCount / 8;
  // 340 non-root nodes x 2 rings x 16 tries x p(4000/32768)
  const expect = 340 * 2 * 16 * (4000 / 32768);
  ok('leaf count matches the 4000/32768 emission probability',
    Math.abs(leaves - expect) < expect * 0.15, `${leaves} vs ~${expect.toFixed(0)}`);
  // Double-sided leaves: front verts and back verts get opposite normals.
  const n0 = t.leaves.getNormal(0), n4 = t.leaves.getNormal(4);
  near('leaf front/back normals are exactly opposed (x)', n0[0] + n4[0], 0, 1e-5);
  near('leaf front/back normals are exactly opposed (y)', n0[1] + n4[1], 0, 1e-5);
  near('leaf front/back normals are exactly opposed (z)', n0[2] + n4[2], 0, 1e-5);
  near('leaf |n| == 1 (two coplanar tris per vertex)',
    Math.hypot(n0[0], n0[1], n0[2]), 1, 1e-5);
  // Branch ring UVs: u = j/7 over 8 columns -> a hard seam, v = ring index.
  near('branch ring u at column 0', t.branches.verts[7], 0);
  near('branch ring u at column 7 is 1.0 (u = j * 1/7)', t.branches.verts[7 * VERTEX_FLOATS + 7], 1.0, 1e-6);
  near('branch ring v at ring 0', t.branches.verts[8], 0);
  near('branch ring v at ring 1', t.branches.verts[8 * VERTEX_FLOATS + 8], 1.0, 1e-6);
  // The ring seam is numerically degenerate: column 7 lands on column 0.
  const p0 = t.branches.getPos(0), p7 = t.branches.getPos(7);
  ok('branch ring column 7 coincides with column 0 (seam)',
    Math.hypot(p0[0] - p7[0], p0[1] - p7[1], p0[2] - p7[2]) < 1e-4);
  let nanCols = new Array(8).fill(0), nan = 0;
  for (let i = 0; i < t.branches.vertexCount; i++) {
    if (!Number.isFinite(t.branches.getNormal(i)[0])) { nan++; nanCols[i % 8]++; }
  }
  ok('branch NaN normals occur ONLY on the seam columns 0 and 7',
    nanCols.slice(1, 7).every(v => v === 0) && nan > 0,
    JSON.stringify(nanCols));
  ok('leaf mesh has no NaN normals',
    Array.from({ length: t.leaves.vertexCount }, (_, i) => t.leaves.getNormal(i)[0]).every(Number.isFinite));
  // Root sits at the origin (DAT_00478938 is BSS and never written).
  const root = t.branches.getPos(0);
  near('root ring 0 is at y = 0', root[1], 0, 1e-4);
  near('root ring 0 radius = branchRadius', Math.hypot(root[0], root[2]), 10, 1e-3);
}
{
  // (src*tint)>>8 per ARGB channel: 0xff->254, 0x32->49, 0x00->0
  eq('leaf tint modulate on white', modulateARGB(0xffffffff, 0xffff0032), 0xfefe0031);
  eq('leaf tint modulate: black stays black', modulateARGB(0, 0xffff0032), 0);
  eq('leaf tint modulate is identity-ish for 0xffffffff tint',
    modulateARGB(0x80402010, 0xffffffff), 0x7f3f1f0f);
}
{
  // Matrix conventions (row-vector, Rx*Ry*Rz).
  const I = mat4Identity();
  eq('identity * identity == identity', mat4Mul(I, I).join(','), I.join(','));
  const Ry = mat4Euler(0, Math.PI / 2, 0);
  const v = mat4Transform([1, 0, 0], Ry);
  near('RotY(90deg) maps +X to -Z', v[2], -1, 1e-6);
  near('RotY(90deg) keeps |v|', Math.hypot(v[0], v[1], v[2]), 1, 1e-6);
}

{
  // Resampled terrain tessellation — the pinned-lattice remaster.
  const hm = new Int32Array(128 * 128);
  for (let i = 0; i < hm.length; i++) hm[i] = ((i * 37) ^ (i >> 5)) & 0xff;
  const N = 64, scaleVec = [4, 1.5, 4];
  const base = buildTerrain(hm, N, scaleVec);
  const t1 = buildTerrainTessellated(hm, N, scaleVec, 1);
  ok('REGRESSION GUARD: terrain tess=1 vertex buffer is byte-identical',
    bytesEqual(base.mesh.verts, t1.mesh.verts));
  ok('REGRESSION GUARD: terrain tess=1 index buffer is byte-identical',
    bytesEqual(base.mesh.indices, t1.mesh.indices));
  for (const tess of [2, 4]) {
    const f = buildTerrainTessellated(hm, N, scaleVec, tess);
    const Nf = N * tess;
    eq(`terrain tess=${tess} grid is N*tess`, f.mesh.vertexCount, Nf * Nf);
    let pos = true, nrm = true, uv = true;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c, j = r * tess * Nf + c * tess;
      const a = base.mesh.getPos(i), b = f.mesh.getPos(j);
      if (!(Object.is(a[0], b[0]) && Object.is(a[1], b[1]) && Object.is(a[2], b[2]))) pos = false;
      const na = base.mesh.getNormal(i), nb = f.mesh.getNormal(j);
      if (!(Object.is(na[0], nb[0]) && Object.is(na[1], nb[1]) && Object.is(na[2], nb[2]))) nrm = false;
      for (const k of [7, 8, 9, 10])
        if (!Object.is(base.mesh.verts[i * 11 + k], f.mesh.verts[j * 11 + k])) uv = false;
    }
    ok(`tess=${tess}: original vertex POSITIONS are bit-identical (pinned lattice)`, pos);
    ok(`tess=${tess}: original vertex NORMALS are bit-identical (|n| preserved)`, nrm);
    ok(`tess=${tess}: original vertex UVs are bit-identical`, uv);
    ok(`tess=${tess}: new vertices actually add relief`,
      (() => {
        for (let r = 0; r < Nf; r++) for (let c = 0; c < Nf; c++) {
          if (r % tess === 0 && c % tess === 0) continue;
          if (f.mesh.getPos(r * Nf + c)[1] !== 0) return true;
        }
        return false;
      })());
  }
  // >65535 vertices must widen the index buffer instead of wrapping.
  const big = buildTerrainTessellated(hm, 128, scaleVec, 4);
  eq('a 512x512 terrain uses 32-bit indices', big.mesh.indexFormat, 0x66);
  eq('the original 128x128 terrain uses D3DFMT_INDEX16', base.mesh.indexFormat, 0x65);
  let maxIdx = 0;
  for (let i = 0; i < big.mesh.indices.length; i++) maxIdx = Math.max(maxIdx, big.mesh.indices[i]);
  eq('largest index addresses the last vertex (no u16 wrap)', maxIdx, big.mesh.vertexCount - 1);
}

// ===========================================================================
section('quad / particle generators');
// ===========================================================================
{
  const pos = [[0, 0, 0], [10, 0, 10]];
  const b0 = buildBillboards({ type: 0, positions: pos, size: 100, yaw: [0, 0] });
  eq('billboard type 0: 4 verts per instance', b0.vertexCount, 2 * 4);
  eq('billboard type 0: 2 tris per instance', b0.triCount, 2 * 2);
  near('type 0 quad top y = 2*size', b0.getPos(0)[1], 200);
  near('type 0 quad half width = size', b0.getPos(0)[0], -100);
  near('type 0 bottom uv.v = 0.9', b0.verts[2 * VERTEX_FLOATS + 8], 0.9);
  const b1 = buildBillboards({ type: 1, positions: pos, size: 4, yaw: [0, 0] });
  eq('billboard type 1: 8 verts per instance', b1.vertexCount, 2 * 8);
  eq('billboard type 1: 4 tris per instance', b1.triCount, 2 * 4);
  near('type 1 canopy top y = 3.5*size', b1.getPos(0)[1], 14);
  near('type 1 trunk half width = 0.1*size', b1.getPos(4)[0], -0.4, 1e-5);
  ok('billboards DO get normals (FUN_004045f1 is called)',
    b0.getNormal(0).some(v => v !== 0));
}
{
  const r = buildPrecipitation({ count: 768, type: 1, seed: 1 });
  eq('rain: 4 verts per particle', r.mesh.vertexCount, 768 * 4);
  eq('rain: 2 tris per particle', r.mesh.triCount, 768 * 2);
  eq('rain spawn box', r.box.join(','), '50,256,50');
  eq('rain quad half height', r.quadHalfHeight, 5.0);
  eq('rain quad scale', r.quadScale.join(','), '1,2,1');
  ok('rain velocity is straight down', r.particles.every(p => p.vel[0] === 0 && p.vel[2] === 0));
  ok('rain spawns above the box floor and below y=0', r.particles.every(p => p.pos[1] <= 0 && p.pos[1] >= -256));
  ok('generator writes UVs only, positions stay 0 (rebuilt per frame)',
    r.mesh.getPos(0).every(v => v === 0));
  eq('quad UV set', [r.mesh.verts[7], r.mesh.verts[8],
    r.mesh.verts[VERTEX_FLOATS * 2 + 7], r.mesh.verts[VERTEX_FLOATS * 2 + 8]].join(','), '0,0,1,1');
  ok('precipitation normals stay (0,0,0) — FUN_004045f1 is NOT called',
    r.mesh.getNormal(0).every(v => v === 0));
  const s = buildPrecipitation({ count: 4096, type: 0, seed: 1 });
  eq('snow spawn box', s.box.join(','), '60,128,60');
  eq('snow quad half height', s.quadHalfHeight, 1.0);
  ok('snow velocity drifts sideways', s.particles.some(p => p.vel[0] !== 0));
  eq('lens droplets: 256 quads', buildLensDroplets().triCount, 512);
  eq('lens droplet colour', buildLensDroplets().getColor(0), 0x7fffffff);
}
{
  srand(1);
  const { mesh, state } = buildRibbon(3);
  eq('ribbon: 32 verts', mesh.vertexCount, 0x20);
  eq('ribbon: 30 tris', mesh.triCount, 0x1e);
  near('ribbon u step is 1/15 [0x418fcc]', mesh.verts[2 * VERTEX_FLOATS + 7], 0.0666667, 1e-6);
  eq('ribbon v alternates 0/1', mesh.verts[8] + ':' + mesh.verts[VERTEX_FLOATS + 8], '0:1');
  eq('ribbon RGB is 0x6f6f6f', mesh.getColor(0) & 0x00ffffff, 0x006f6f6f);
  eq('ribbon alpha is 0 at the first station', (mesh.getColor(0) >>> 24) & 255, 0);
  // THE BUILD-TIME FRAME IS FULLY FADED OUT.  `buildRibbon` seeds phase in
  // [2, 4) and 0x40f5f3's envelope gives (2 - phase) <= 0 there, clamped to 0 —
  // so every station starts invisible and the wrap staggers phase into [0, 2).
  eq('ribbon starts fully faded (phase seeded in [2,4))',
    (mesh.getColor(16) >>> 24) & 255, 0);
  ok('ribbon phase wrapped into [0,2)', state.phase >= 0 && state.phase < 2);
  // The envelope itself, VA 0x40f5f3-0x40f642: alpha = ftol(ramp * fade) with
  // fade = phase below 1 and (2 - phase) above it, so the middle station's 255
  // ramp reads back as the fade directly.
  const fadeAt = (p) => {
    const m = new Mesh(); m.allocVerts(0x20); m.allocIndices(0x1e);
    updateRibbon(m, { ...state, phase: p, phaseRate: 0, speed: 100 }, 0);
    return (m.getColor(16) >>> 24) & 255;
  };
  eq('fade ramps UP below phase 1  (0.25 -> ftol(255*0.25))', fadeAt(0.25), 63);
  eq('fade peaks at phase 1', fadeAt(1.0), 255);
  eq('fade ramps DOWN above phase 1 (1.75 -> ftol(255*0.25))', fadeAt(1.75), 63);
  eq('fade is 0 as the strip reaches the centre', fadeAt(2.0), 0);
  ok('ribbon width is 72 units',
    Math.abs(Math.hypot(...mesh.getPos(0).map((v, i) => v - mesh.getPos(1)[i])) - 72) < 1e-3);
}
{
  srand(1);
  const b = buildBird(0);
  eq('bird: 6 verts', b.vertexCount, 6);
  eq('bird: 4 tris', b.triCount, 4);
  eq('bird indices are literal 0,2,1 2,3,1 0,1,4 1,5,4',
    Array.from(b.indices).join(','), '0,2,1,2,3,1,0,1,4,1,5,4');
  // CONTRACT CHANGED 2026-08-11: `buildBird` draws no RNG and takes the colour.
  // `FUN_0040f803` draws the three colour `rand()`s for EVERY species (it just
  // discards the result unless species == 0) and draws them AFTER the position,
  // so owning them here put both the count and the order wrong. buildFlock owns
  // all eight per-bird draws now; see the note on buildBird.
  eq('bird takes its colour from the caller', buildBird(0, 0xff123456).getColor(0), 0xff123456);
  eq('bird defaults to white', b.getColor(0), 0xffffffff);
  const b1 = buildBird(1);
  eq('species 1 is pure white', b1.getColor(0), 0xffffffff);
  near('species 1 wingspan is 3x', b1.getPos(2)[0], -9);
  ok('bird normals stay (0,0,0) — FUN_004045f1 is NOT called',
    b.getNormal(0).every(v => v === 0));
  srand(1);
  const flock = buildFlock({ count: 8, centre: [0, 80, 0], A: 100, amp: 0.4, species: 0 });
  eq('flock size', flock.birds.length, 8);
  ok('flock spreads over centre +- 2A',
    flock.birds.every(x => Math.abs(x.mesh.pos[0]) <= 200.001 && Math.abs(x.mesh.pos[2]) <= 200.001));
  ok('flock keeps centre.y', flock.birds.every(x => x.mesh.pos[1] === 80));
}
{
  const layers = buildCloudSky({ N: 3, size: 250, colour: 0x00ffffff, opt10: 1, opt11: false });
  eq('cloud layers: N quads', layers.triCount, 3 * 2);
  near('cloud layer half extent is 1500 [0x418fb8]', layers.getPos(0)[0], -1500);
  near('cloud layer 0 y = size + 15*(count-0)', layers.getPos(0)[1], 250 + 15 * 3);
  const dome = buildCloudSky({ N: 3, size: 200, colour: 0x00ffffff, opt10: 0, opt11: false });
  eq('cloud dome is a 16x16 grid', dome.vertexCount, 256);
  near('cloud dome half extent is 150 [0x418e9c]', dome.getPos(0)[0], -150);
  ok('cloud dome is curved (y varies)',
    new Set(Array.from({ length: 16 }, (_, i) => dome.getPos(i * 17)[1].toFixed(3))).size > 3);
  srand(1);
  const cn = buildCloudNoiseQuads(3);
  eq('cloud noise quads', cn.mesh.triCount, 6);
  eq('cloud noise params per quad', cn.params.length, 3);
  eq('cloud blit quad', buildCloudBlitQuad().triCount, 2);
}

// ===========================================================================
section('scene descriptors (res 28..35)');
// ===========================================================================
{
  const all = decodeAllScenes(RESOURCES);
  eq('eight scenes decoded', Object.keys(all).length, 8);
  for (const s of ACTIVE_SCENES) {
    ok(`scene ${s}: header + arrays consume the resource exactly`, all[s]._packedOk,
      `${all[s]._bytesConsumed}/${all[s]._bytesTotal}`);
  }
  // Values cross-checked against the byte dump of all eight descriptors.
  eq('scene 0 camera count', all[0].cameraPathCount, 1);
  eq('scene 0 array A count', all[0].countA, 1);
  eq('scene 0 array A records', all[0].arrays.A.length, 1);
  ok('scene 0 terrain is hidden (flag bit 16 clear)', !all[0].flag.terrainVisible);
  eq('scene 0 flags', all[0].flags, 0x00000002);
  eq('scene 1 flags', all[1].flags, 0x01030200);
  eq('scene 2 flags', all[2].flags, 0x0001c030);
  eq('scene 3 flags', all[3].flags, 0x00004e00);
  eq('scene 4 flags', all[4].flags, 0x00016015);
  eq('scene 5 flags', all[5].flags, 0x008502d8);
  eq('scene 7 flags', all[7].flags, 0x000d0050);
  eq('scene 8 flags', all[8].flags, 0x00010300);
  eq('scene 2 array counts C', all[2].arrays.C.length, 4);
  eq('scene 2 array counts D', all[2].arrays.D.length, 1);
  eq('scene 2 array counts F', all[2].arrays.F.length, 1);
  eq('scene 2 array counts G', all[2].arrays.G.length, 1);
  // Array G (birds) values cross-check against the reference video.
  eq('scene 2 flock: 256 species-0 (butterflies) at (0,80,0)',
    all[2].arrays.G[0].instanceCount + ':' + all[2].arrays.G[0].species + ':' + all[2].arrays.G[0].centre.join(','),
    '256:0:0,80,0');
  eq('scene 3 flock: 4 species-1 birds at y=300', all[3].arrays.G[0].instanceCount + ':' + all[3].arrays.G[0].species, '4:1');
  eq('scene 4 flock: 64 species-1 birds', all[4].arrays.G[0].instanceCount + ':' + all[4].arrays.G[0].species, '64:1');
  // Array C/D sizes.
  eq('scene 2 billboard cluster 0: 10 instances, size 2*50', 
    all[2].arrays.C[0].instanceCount + ':' + all[2].arrays.C[0].size, '10:100');
  eq('scene 2 ground cover: 256 type-1 billboards, size 0.4*4',
    all[2].arrays.D[0].instanceCount + ':' + all[2].arrays.D[0].size.toFixed(2), '256:1.60');
  near('scene 3 terrain scale.y is 0.001 (the flat cloud-sea shot)', all[3].terrainScale[1], 0.001, 1e-6);
  eq('scene 4 has the hi-res water plane (bit 13)', all[4].flag.hiResWater, true);
  eq('scene 4 water grid', all[4].water.grid, 32);
  eq('scene 1 water grid is coarse', all[1].water.grid, 4);
  eq('scene 5 uses autumn leaves (bit 23)', all[5].flag.autumnLeaves, true);
  eq('scene 5 leaf colour', all[5].leafColour, LEAF_COLOUR_AUTUMN);
  eq('scene 2 leaf colour', all[2].leafColour, LEAF_COLOUR_GREEN);
  eq('scene 5 rain: 768 particles, type 1', all[5].precipCount + ':' + all[5].precipType, '768:1');
  eq('scene 7 snow: 4096 particles, type 0', all[7].precipCount + ':' + all[7].precipType, '4096:0');
  eq('scene 5 rain spawn box', all[5].precip.box.join(','), '50,256,50');
  eq('scene 7 snow spawn box', all[7].precip.box.join(','), '60,128,60');
  eq('scene 7 terrain grid N = 128', all[7].terrainGridN, 128);
  eq('scene 8 terrain grid N = 128', all[8].terrainGridN, 128);
  eq('scene 0 terrain grid N = 64', all[0].terrainGridN, 64);
  eq('scene 0 heightmap texprog', all[0].heightmapTexProg, 23);
  eq('scene 8 heightmap texprog', all[8].heightmapTexProg, 26);
  eq('scene 8 ground layers A/B both 27', all[8].groundTexProgA + ':' + all[8].groundTexProgB, '27:27');
  near('scene 1 water level is 1.0', all[1].waterLevel, 1.0);
  near('scene 1 sun Y patched to 374.0 (FUN_004082a9)', all[1].sunPosition[1], 374.0);
  // fog: colour at 0x22, start at 0x26, end at 0x2a; end doubles as the far plane
  near('scene 7 fog start (dense snow)', all[7].fogStart, 50);
  near('scene 7 fog end', all[7].fogEnd, 300);
  near('scene 3 fog end (huge cloud-sea scale)', all[3].fogEnd, 3000);
  // every flag bit must map to a distinct mask
  const masks = new Set(Object.values(FLAG_BITS).map(f => f.mask));
  eq('flag masks are distinct', masks.size, Object.keys(FLAG_BITS).length);
  // no scene sets a bit we have not named
  let known = 0; for (const f of Object.values(FLAG_BITS)) known |= f.mask;
  for (const s of ACTIVE_SCENES) {
    ok(`scene ${s} sets no unnamed flag bit`, (all[s].flags & ~known) === 0,
      'unknown=0x' + (all[s].flags & ~known).toString(16));
  }
  // array-A parameters for scene 0 (the only user of array A)
  const A = all[0].arrays.A[0];
  eq('array A: 16 rings x 8 segments (literals at the call site)', A.rings + 'x' + A.segments, '16x8');
  ok('array A instance count is plausible', A.instanceCount > 0 && A.instanceCount < 4096,
    String(A.instanceCount));
  // array E (trees) only in scene 5
  eq('trees only in scene 5', ACTIVE_SCENES.filter(s => all[s].arrays.E.length).join(','), '5');
  const E = all[5].arrays.E[0];
  ok('tree scale is finite and positive', Number.isFinite(E.scale) && E.scale > 0, String(E.scale));
  eq('scene 5 tree position', E.position.join(','), '-120,10,50');
  eq('scene 5 tree branch radius', E.branchRadius, 10);
  near('scene 5 tree level taper = 204/255', E.levelTaper, 0.8, 1e-6);
  near('scene 5 tree mesh scale', E.scale, 0.75, 1e-6);
  const A0 = all[0].arrays.A[0];
  eq('scene 0 spire cluster instance count', A0.instanceCount, 80);
  eq('scene 0 spire scatter centre', A0.boxCentre.join(','), '106,40,24');
  eq('scene 0 spire scatter extent', A0.boxExtent.join(','), '150,0,150');
  near('scene 0 spire radius', A0.radius, 3.2, 1e-5);
  near('scene 0 spire height ratio', A0.heightRatio, 160, 1e-5);
}

// ===========================================================================
section('camera splines (res 36..51)');
// ===========================================================================
{
  eq('bfloat16 1.0', bfloat16(0x3f80), 1.0);
  eq('bfloat16 -2.0', bfloat16(0xc000), -2.0);
  eq('bfloat16 0', bfloat16(0), 0);
  eq('bfloat16 256.0', bfloat16(0x4380), 256.0);
}
{
  // Hermite basis at the interval ends.
  const p0 = [1, 2, 3], p1 = [4, 5, 6], m0 = [9, 9, 9], m1 = [-9, -9, -9];
  eq('hermite(s=0) == p0', hermite(p0, p1, m0, m1, 0, 1).join(','), '1,2,3');
  eq('hermite(s=1) == p1', hermite(p0, p1, m0, m1, 1, 1).join(','), '4,5,6');
}
{
  const paths = decodeCameraPaths(RESOURCES);
  eq('16 camera paths', paths.length, 16);
  let totalKeys = 0, ok3 = true;
  for (let i = 0; i < 16; i++) {
    const p = paths[i];
    const blob = RESOURCES[36 + i];
    totalKeys += p.keyCount;
    // wire format: blob[0] = total length, blob[2] = key count, 14 bytes/key
    if (blob[0] !== blob.length) ok3 = false;
    ok(`res ${36 + i}: 3 + 14*keyCount == resource length`,
      3 + 14 * p.keyCount === blob.length, `${3 + 14 * p.keyCount} vs ${blob.length}`);
    // t values are monotonically increasing and start at 0
    ok(`res ${36 + i}: first key t == 0`, p.keys[0].t === 0, String(p.keys[0].t));
    let mono = true;
    for (let k = 1; k < p.keys.length; k++) if (!(p.keys[k].t > p.keys[k - 1].t)) mono = false;
    ok(`res ${36 + i}: key times increase`, mono);
    // roll (the third rotation component) is 0 in every key of every path
    ok(`res ${36 + i}: rot.z == 0 in all keys`, p.keys.every(k => k.rot[2] === 0));
  }
  ok('blob[0] is the total resource length', ok3);
  eq('total camera keys across all 16 paths', totalKeys, 49);

  // evaluate() at a key time must return that key's position exactly.
  const p = paths[0];
  const e0 = p.evaluate(p.keys[0].t);
  ok('evaluate at key 0 returns key 0 position',
    e0.position.every((v, i) => Math.abs(v - p.keys[0].pos[i]) < 1e-4), JSON.stringify(e0.position));
  const e1 = p.evaluate(p.keys[1].t);
  ok('evaluate at key 1 returns key 1 position',
    e1.position.every((v, i) => Math.abs(v - p.keys[1].pos[i]) < 1e-4), JSON.stringify(e1.position));
  // continuity: no jumps between adjacent samples
  let maxJump = 0, prev = null;
  for (let t = 0; t <= p.duration; t += 0.5) {
    const q = p.evaluate(t).position;
    if (prev) maxJump = Math.max(maxJump, Math.hypot(q[0] - prev[0], q[1] - prev[1], q[2] - prev[2]));
    prev = q;
  }
  ok('camera path is continuous (no jumps > 20 units per 0.5 tick)', maxJump < 20, 'maxJump=' + maxJump);
  // target is always 256 units ahead of the position
  for (const t of [0, 10, 50, 100]) {
    const q = p.evaluate(t);
    const d = Math.hypot(q.target[0] - q.position[0], q.target[1] - q.position[1], q.target[2] - q.position[2]);
    near(`target is 256 units ahead at t=${t}`, d, 256, 0.05);
  }
  // roll flip: res 36 key 0 has rot.x = -2.625 rad, inside the flipped half turn
  const r0 = paths[0].evaluate(0).roll;
  ok('roll flips to pi where the pitch passes the half turn', Math.abs(r0 - Math.PI) < 1e-4, String(r0));
  // projection matrix sanity
  const P = paths[0].projectionMatrix();
  near('projection m34 == 1 (LH)', P[11], 1);
  near('projection m33 == far/(far-near)', P[10], 1000 / 999, 1e-4);
  near('projection m43 == -near*far/(far-near)', P[14], -1 * 1000 / 999, 1e-4);
  near('projection m11 == cot(45deg)/aspect', P[0], 1 / 1.3333334, 1e-4);
}
{
  // Per-scene camera resource mapping (FUN_004082a9's map2).
  const all = decodeAllScenes(RESOURCES);
  eq('scene 0 uses res 36', cameraResourcesForScene(0, all[0].cameraPathCount).join(','), '36');
  eq('scene 2 uses res 39,40,41', cameraResourcesForScene(2, all[2].cameraPathCount).join(','), '39,40,41');
  eq('scene 3 uses res 42', cameraResourcesForScene(3, all[3].cameraPathCount).join(','), '42');
  eq('scene 4 uses res 43,44,45', cameraResourcesForScene(4, all[4].cameraPathCount).join(','), '43,44,45');
  eq('scene 5 uses res 46,47', cameraResourcesForScene(5, all[5].cameraPathCount).join(','), '46,47');
  eq('scene 7 uses res 48,49', cameraResourcesForScene(7, all[7].cameraPathCount).join(','), '48,49');
  eq('scene 8 uses res 50,51', cameraResourcesForScene(8, all[8].cameraPathCount).join(','), '50,51');
  // Every one of the 16 spline resources is claimed by exactly one scene.
  const claimed = [];
  for (const s of ACTIVE_SCENES) claimed.push(...cameraResourcesForScene(s, all[s].cameraPathCount));
  eq('all 16 spline resources are claimed exactly once',
    [...new Set(claimed)].length + ':' + claimed.length, '16:16');
}

// ===========================================================================
section('helpers');
// ===========================================================================
{
  // MSVC rand()
  srand(1);
  eq('MSVC rand() first value for seed 1', rand(), 41);
  eq('MSVC rand() second value', rand(), 18467);
}
{
  // FUN_00409ccd wrapping ring stitch
  const m = new Mesh(16, 16);
  stitchRing(m, 0, 0, 7, 8, 0);   // last column of an 8-wide ring wraps to 0
  eq('ring stitch wraps at ringWidth', m.indices[1], 0);
  eq('ring stitch next ring index', m.indices[2], 8);
}

// ===========================================================================
console.log('\n' + '='.repeat(60));
console.log(`PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('\nFailures:'); for (const f of failures) console.log('  ✗ ' + f); }
console.log('='.repeat(60));
process.exit(fail ? 1 : 0);
