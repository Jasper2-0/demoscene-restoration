// camera.mjs — JS port of the "Sonnet" (threestate, Assembly 2001 64k intro)
// camera splines: resources 36..51.
//
// Reverse-engineered from re/out/sonnet.c + ndisasm of unpacked/sonnet_img.bin
// (VA 0x401000 = offset 0).  See re/gen/MESHGEN_PORT.md.
//
// ---------------------------------------------------------------------------
// WIRE FORMAT (FUN_00405a29 @ 0x405a29)
//   blob[0] = total length, blob[1] = 0, blob[2] = key count
//   then keyCount x 7 x u16, stride 0x0e
//   each u16 is decoded by FUN_00401358 as (float)bits(u16 << 16), i.e. a
//   BFLOAT16: the u16 is the TOP half of an IEEE754 single.
//
//   key = { t, pos.x, pos.y, pos.z, rot.x, rot.y, rot.z }   (7 floats, 0x1c B)
//
// CORRECTION TO MESHGEN_notes §7: the second vec3 in a key is NOT a look-at
// target.  FUN_004058a6 builds a rotation matrix M = Rx(r.x)*Ry(r.y)*Rz(r.z)
// (FUN_00402280 -> FUN_00402381/004023ed/00402459, verified) and computes
//     target = pos + (0,0,256) * M          ([0x4182bc] == 256.0)
// so the key stores EULER ANGLES in radians, not a target point.
//
// ROLL (VA 0x40597f..0x4059d4, disassembled because Ghidra dropped the FPU
// operands): a = (int)(rot.x * 0.15915494309189535 * 65536.0) & 0xffff;
//            roll = (a >= 0x4000 && a <= 0xc000) ? PI_F : 0
//            roll += rot.z
// i.e. when the pitch passes through the "upside down" half turn the camera is
// rolled by pi so that the look-at up vector flips back.  0.159154943... is
// 1/(2*pi); 0x40490fdb is 3.14159274f.
// ---------------------------------------------------------------------------

const F = Math.fround;

export const CAM_DEFAULTS = {
  fovDeg: 90.0,        // camera+0xbc  [0x42b40000]
  near: 1.0,           // camera+0xc0
  far: 1000.0,         // camera+0xc4
  aspect: 1.3333334,   // camera+0xc8  [0x3faaaaab]
  targetDist: 256.0,   // [0x4182bc]
};

const DEG2RAD = 0.017453292519943295;   // double [0x4182e0]
const INV_TWO_PI = 0.15915494309189535; // double [0x4182d8]
const ANGLE_SCALE = 65536.0;            // double [0x4182d0]
const PI_F = 3.14159274101257324;       // float  [0x40490fdb]

// FUN_004082a9: resource index = 0x24 + CAM_RES_BASE[sceneIdx] + i
export const CAM_RES_BASE = [0, 1, 3, 6, 7, 10, 0, 12, 14];

// ---------------------------------------------------------------------------
// FUN_00401358 — bfloat16 decode.
// ---------------------------------------------------------------------------
const _bf = new DataView(new ArrayBuffer(4));
export function bfloat16(u16) {
  _bf.setUint32(0, (u16 << 16) >>> 0, true);
  return _bf.getFloat32(0, true);
}

// ---------------------------------------------------------------------------
// FUN_00405430(x, n) — integer power by repeated multiply (n >= 1).
// ---------------------------------------------------------------------------
function powi(x, n) {
  let r = x;
  for (let i = n - 1; i > 0; i--) r *= x;
  return r;
}

// ---------------------------------------------------------------------------
// FUN_00405778 — cubic Hermite.  s = ds/dt.
//   h00 = 2s^3 - 3s^2 + 1     (p0)
//   h01 = 3s^2 - 2s^3         (p1)
//   h10 = s^3 - 2s^2 + s      (m0)
//   h11 = s^3 - s^2           (m1)
// NOTE the tangents are NOT rescaled by dt; FUN_0040544c passes
// m0 = (P2 - P0) * 0.5 and m1 = (P3 - P1) * 0.5 directly.  Reproduced as-is.
// ---------------------------------------------------------------------------
export function hermite(p0, p1, m0, m1, ds, dt) {
  const s = F(ds / dt);
  const s3 = powi(s, 3), s2 = powi(s, 2);
  const h00 = F(F(F(s3 + s3) - F(s2 * 3.0)) + 1.0);
  const h01 = F(F(s2 * 3.0) + F(s3 * -2.0));
  const h10 = F(F(s3 - F(s2 + s2)) + s);
  const h11 = F(s3 - s2);
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    out[i] = F(F(F(F(p0[i] * h00) + F(p1[i] * h01)) + F(m0[i] * h10)) + F(m1[i] * h11));
  }
  return out;
}

// ---------------------------------------------------------------------------
// FUN_0040544c — key selection + double Hermite.
//
// The original picks four keys by scanning the whole array (no assumption that
// keys are sorted):
//   P1 = key with the largest t satisfying t <= time, seeded with key[0]
//   P0 = key with the largest t strictly less than P1.t, seeded with key[0]
//   P2 = key with the smallest t strictly greater than P1.t, seeded with key[0]
//        (found by first taking the max-t key, then narrowing)
//   P3 = key with the smallest t strictly greater than P2.t, same trick
// If P2.t == P1.t the result is P1 verbatim (no interpolation).
// ---------------------------------------------------------------------------
function selectKeys(keys, time) {
  const k0 = keys[0];
  let P1 = k0, P0 = k0, P2 = k0, P3 = k0;
  for (const k of keys) if (k.t <= time && P1.t < k.t) P1 = k;
  for (const k of keys) if (k.t < P1.t && P0.t <= k.t) P0 = k;
  for (const k of keys) if (P2.t < k.t) P2 = k;                 // max-t key
  for (const k of keys) if (P1.t < k.t && k.t < P2.t) P2 = k;   // narrow down
  for (const k of keys) if (P3.t < k.t) P3 = k;                 // max-t key
  for (const k of keys) if (P2.t < k.t && k.t < P3.t) P3 = k;   // narrow down
  return { P0, P1, P2, P3 };
}

function sub(a, b) { return [F(a[0] - b[0]), F(a[1] - b[1]), F(a[2] - b[2])]; }
function scale(a, s) { return [F(a[0] * s), F(a[1] * s), F(a[2] * s)]; }
function add(a, b) { return [F(a[0] + b[0]), F(a[1] + b[1]), F(a[2] + b[2])]; }

// ---------------------------------------------------------------------------
// Rotation matrices — 4x4 row-major, row-vector convention (D3D).
// FUN_00402280: M = I * Rx(a.x) * Ry(a.y) * Rz(a.z)   (FUN_004024c5 = A*B)
// ---------------------------------------------------------------------------
function matIdentity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function matMul(A, B) {
  const o = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s = F(s + F(A[i * 4 + k] * B[k * 4 + j]));
      o[i * 4 + j] = s;
    }
  }
  return o;
}
export function eulerMatrix(rx, ry, rz) {
  const cx = F(Math.cos(rx)), sx = F(Math.sin(rx));
  const cy = F(Math.cos(ry)), sy = F(Math.sin(ry));
  const cz = F(Math.cos(rz)), sz = F(Math.sin(rz));
  const Rx = matIdentity(); Rx[5] = cx; Rx[6] = sx; Rx[9] = -sx; Rx[10] = cx;
  const Ry = matIdentity(); Ry[0] = cy; Ry[2] = -sy; Ry[8] = sy; Ry[10] = cy;
  const Rz = matIdentity(); Rz[0] = cz; Rz[1] = sz; Rz[4] = -sz; Rz[5] = cz;
  return matMul(matMul(Rx, Ry), Rz);
}
// FUN_00402a6f — row-vector transform with perspective divide.
export function transformVec3(v, m) {
  const w = F(F(F(F(m[7] * v[1]) + F(m[3] * v[0])) + F(m[11] * v[2])) + m[15]);
  return [
    F(F(F(F(v[0] * m[0]) + F(m[4] * v[1])) + F(m[8] * v[2]) + m[12]) / w),
    F(F(F(F(m[5] * v[1]) + F(m[1] * v[0])) + F(m[9] * v[2]) + m[13]) / w),
    F(F(F(F(m[6] * v[1]) + F(m[2] * v[0])) + F(m[10] * v[2]) + m[14]) / w),
  ];
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
export class CameraPath {
  /** @param {Uint8Array} blob a resource block (res 36..51) */
  constructor(blob) {
    this.keyCount = blob[2];
    this.keys = [];
    let p = 3;
    for (let i = 0; i < this.keyCount; i++) {
      const f = [];
      for (let j = 0; j < 7; j++) {
        f.push(bfloat16(blob[p] | (blob[p + 1] << 8)));
        p += 2;
      }
      this.keys.push({ t: f[0], pos: [f[1], f[2], f[3]], rot: [f[4], f[5], f[6]] });
    }
    this.fovDeg = CAM_DEFAULTS.fovDeg;
    this.near = CAM_DEFAULTS.near;
    this.far = CAM_DEFAULTS.far;
    this.aspect = CAM_DEFAULTS.aspect;
  }

  get duration() { return this.keys.length ? Math.max(...this.keys.map(k => k.t)) : 0; }

  /**
   * FUN_0040544c + FUN_004058a6.
   * @param {number} time  camera-local time (the units the key .t values use)
   * @returns {{position:number[], rotation:number[], target:number[], roll:number}}
   */
  evaluate(time) {
    if (time < 0) time = 0;                       // FUN_004058a6 clamp at +0x110
    if (!this.keys.length) {
      return { position: [0, 0, 0], rotation: [0, 0, 0], target: [0, 0, 256], roll: 0 };
    }
    const { P0, P1, P2, P3 } = selectKeys(this.keys, time);
    let position, rotation;
    const dt = F(P2.t - P1.t);
    if (dt === 0) {
      position = P1.pos.slice();
      rotation = P1.rot.slice();
    } else {
      const ds = F(time - P1.t);
      position = hermite(P1.pos, P2.pos,
        scale(sub(P2.pos, P0.pos), 0.5), scale(sub(P3.pos, P1.pos), 0.5), ds, dt);
      rotation = hermite(P1.rot, P2.rot,
        scale(sub(P2.rot, P0.rot), 0.5), scale(sub(P3.rot, P1.rot), 0.5), ds, dt);
    }
    const M = eulerMatrix(rotation[0], rotation[1], rotation[2]);
    const fwd = transformVec3([0, 0, CAM_DEFAULTS.targetDist], M);
    const target = add(position, fwd);

    // Roll flip — see header comment.
    const a = (Math.trunc(F(F(rotation[0] * INV_TWO_PI) * ANGLE_SCALE)) | 0) & 0xffff;
    let roll = (a >= 0x4000 && a <= 0xc000) ? PI_F : 0;
    roll = F(rotation[2] + roll);

    return { position, rotation, target, roll };
  }

  /** FUN_00402072 — LH look-at view matrix (row-major, row-vector). */
  viewMatrix(eye, at, rollRad = 0) {
    const up = [0, 1, 0];
    let f = sub(at, eye);
    let L = Math.hypot(f[0], f[1], f[2]);
    if (L < 1e-6) return matIdentity();
    f = scale(f, 1 / L);
    // up' = up - f * dot(up, f); fall back to +Y then +Z if degenerate.
    let d = F(F(up[0] * f[0]) + F(F(up[1] * f[1]) + F(up[2] * f[2])));
    let u = sub(up, scale(f, d));
    if (Math.hypot(u[0], u[1], u[2]) < 1e-6) {
      u = sub([0, 1, 0], scale(f, f[1]));
      if (Math.hypot(u[0], u[1], u[2]) < 1e-6) u = sub([0, 0, 1], scale(f, f[2]));
    }
    L = Math.hypot(u[0], u[1], u[2]);
    u = scale(u, 1 / L);
    const r = [
      F(F(u[1] * f[2]) - F(u[2] * f[1])),
      F(F(u[2] * f[0]) - F(u[0] * f[2])),
      F(F(u[0] * f[1]) - F(u[1] * f[0])),
    ];
    const m = matIdentity();
    m[0] = r[0]; m[1] = u[0]; m[2] = f[0];
    m[4] = r[1]; m[5] = u[1]; m[6] = f[1];
    m[8] = r[2]; m[9] = u[2]; m[10] = f[2];
    m[12] = -(eye[0] * r[0] + eye[1] * r[1] + eye[2] * r[2]);
    m[13] = -(eye[0] * u[0] + eye[1] * u[1] + eye[2] * u[2]);
    m[14] = -(eye[0] * f[0] + eye[1] * f[1] + eye[2] * f[2]);
    if (rollRad !== 0) {
      // FUN_00405c98(view, -roll) — post-rotate about Z.
      const c = Math.cos(-rollRad), s = Math.sin(-rollRad);
      const Rz = matIdentity(); Rz[0] = c; Rz[1] = s; Rz[4] = -s; Rz[5] = c;
      return matMul(m, Rz);
    }
    return m;
  }

  /** FUN_00405c0c — D3D LH perspective. */
  projectionMatrix() {
    const h = F(F(this.fovDeg * DEG2RAD) * 0.5);
    const cot = F(Math.cos(h) / Math.sin(h));
    const Q = F(this.far / F(this.far - this.near));
    const m = new Array(16).fill(0);
    m[0] = F(cot / this.aspect);
    m[5] = cot;
    m[10] = Q;
    m[11] = 1.0;
    m[14] = F(-(Q * this.near));
    return m;
  }
}

// ---------------------------------------------------------------------------
// Convenience: decode all 16 spline resources, and the per-scene mapping.
// ---------------------------------------------------------------------------
export function decodeCameraPaths(resources) {
  const out = [];
  for (let i = 36; i <= 51; i++) out.push(new CameraPath(resources[i]));
  return out;
}

/** Resource ids used by scene `sceneIdx` given its camera-path count. */
export function cameraResourcesForScene(sceneIdx, camCount) {
  const base = 0x24 + CAM_RES_BASE[sceneIdx];
  const ids = [];
  for (let i = 0; i < camCount; i++) ids.push(base + i);
  return ids;
}
