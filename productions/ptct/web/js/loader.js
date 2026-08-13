// The original loading screen, reconstructed from FUN_00406c40 / FUN_00406d80
// (constants read from the binary), driven by real download progress.
//
// Geometry: 25 slabs — cube(half 100) with y squashed (z>0 ? x0.1 : x0.25)
// and shifted z-600 — each rotated i*14.4deg about X: a segmented ring of
// radius 600 that fills like a clock as p goes 0..1. Flat color 0x1f1f1f,
// fov 130, camera (300, 0, camZ-600) -> (0, 0, camZ), roll 90, where
// camZ = max(0, (p-1)*300). After load, the original holds a minimum
// 10000-tick (2.5 s) beat with p = 1 + ticks*0.0005 — the camera flies
// forward past the completed ring. Reproduced verbatim.
import { Mat4 } from './mathlib.js';

const FOV = 130, ROLL = 90;

function buildSlab() {
  const h = 100;
  const corners = [];
  for (let i = 0; i < 8; i++) {
    let x = (i & 1) ? h : -h, y = (i & 2) ? h : -h, z = (i & 4) ? h : -h;
    y *= z > 0 ? 0.1 : 0.25;
    z -= 600;
    corners.push([x, y, z]);
  }
  const quads = [[0,1,3,2],[4,6,7,5],[0,2,6,4],[1,5,7,3],[2,3,7,6],[0,4,5,1]];
  const pos = [], idx = [];
  for (const q of quads) {
    const b = pos.length / 3;
    for (const c of q) pos.push(...corners[c]);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx),
           uv: new Float32Array((pos.length / 3) * 2) };
}

function perspective(out, fovDeg, near, far) {
  const f = near * Math.tan((fovDeg * Math.PI) / 360);
  out.identity();
  out.frustum(-f, f, -f, f, near, far);
  return out;
}

function lookAt(out, ex, ey, ez, tx, ty, tz) {
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const zl = Math.hypot(zx, zy, zz) || 1; zx /= zl; zy /= zl; zz /= zl;
  // up = (0,1,0)
  let xx = 1 * zz - 0 * zy, xy = 0 * zx - 0 * zz, xz = 0 * zy - 1 * zx;
  const xl = Math.hypot(xx, xy, xz) || 1; xx /= xl; xy /= xl; xz /= xl;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m = out.m;
  m[0] = xx; m[4] = xy; m[8] = xz;
  m[1] = yx; m[5] = yy; m[9] = yz;
  m[2] = zx; m[6] = zy; m[10] = zz;
  m[3] = 0; m[7] = 0; m[11] = 0;
  m[12] = -(xx * ex + xy * ey + xz * ez);
  m[13] = -(yx * ex + yy * ey + yz * ez);
  m[14] = -(zx * ex + zy * ey + zz * ez);
  m[15] = 1;
  return out;
}

export class LoadingScreen {
  constructor(mgl, canvas) {
    this.mgl = mgl;
    this.canvas = canvas;
    this.slab = buildSlab();
    this.proj = perspective(new Mat4(), FOV, 2, 32768);
    this.view = new Mat4();
    this.model = new Mat4();
  }

  render(p) {
    const { mgl, canvas } = this;
    const gl = mgl.gl;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const bar = Math.floor(canvas.height / 12);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, bar, canvas.width, canvas.height - 2 * bar);

    const camZ = Math.max(0, (p - 1) * 300);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadMatrix(this.proj);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.rotate(-ROLL, 0, 0, 1);
    mgl.multMatrix(lookAt(this.view, 300, 0, camZ - 600, 0, 0, camZ));

    mgl.enableTexture(false);
    mgl.enableBlend(false);
    mgl.enableDepthTest(true);
    mgl.enableCullFace(false);
    mgl.enableFog(false);
    mgl.enableLighting(false);

    const shown = Math.trunc(p * 25);
    const c = 0x1f / 256;
    mgl.color4(c, c, c, 1);
    for (let i = 0; i < 25; i++) {
      if (i > shown) continue;
      mgl.pushMatrix();
      mgl.rotate(i * 14.4, 1, 0, 0);
      mgl.drawElements(this.slab.pos, this.slab.uv, this.slab.idx);
      mgl.popMatrix();
    }
    gl.disable(gl.SCISSOR_TEST);
  }
}

// -- progress-tracked asset fetching ----------------------------------------

async function headSize(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok ? parseInt(r.headers.get('content-length') || '0', 10) : 0;
  } catch { return 0; }
}

async function fetchTracked(url, tally) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  if (!r.body) { const b = await r.arrayBuffer(); tally(b.byteLength); return b; }
  const reader = r.body.getReader();
  const parts = [];
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value); n += value.length; tally(value.length);
  }
  const out = new Uint8Array(n);
  let o = 0;
  for (const c of parts) { out.set(c, o); o += c.length; }
  return out.buffer;
}

const imageFromBuffer = (buf) => new Promise((res, rej) => {
  const url = URL.createObjectURL(new Blob([buf], { type: 'image/png' }));
  const img = new Image();
  img.onload = () => res(img);
  img.onerror = rej;
  img.src = url;
});

// Loads everything the runtime needs, reporting fractional progress by bytes.
export async function loadAssetsTracked(texNames, wantHi, onProgress) {
  const texUrls = texNames.map((n) => `assets/textures/${n}.png`);
  const hiUrls = wantHi ? texNames.map((n) => `assets/textures4x/${n}.png`) : [];
  const fixed = ['assets/script.as1', 'assets/sync_map.json', 'assets/world_of_noise.m4a'];
  const all = [...fixed, ...texUrls, ...hiUrls];

  const sizes = await Promise.all(all.map(headSize));
  const total = sizes.reduce((a, b) => a + b, 0) || 1;
  let loaded = 0;
  const tally = (n) => { loaded += n; onProgress(Math.min(1, loaded / total)); };
  const opt = (p) => p.catch(() => null); // 4x set is optional per file

  const [scriptBuf, syncBuf, audioBuf, ...texBufs] = await Promise.all([
    fetchTracked(fixed[0], tally),
    fetchTracked(fixed[1], tally),
    fetchTracked(fixed[2], tally),
    ...texUrls.map((u) => fetchTracked(u, tally)),
    ...hiUrls.map((u) => opt(fetchTracked(u, tally))),
  ]);

  const baseBufs = texBufs.slice(0, texNames.length);
  const hiBufs = texBufs.slice(texNames.length);
  const images = await Promise.all(baseBufs.map(imageFromBuffer));
  let imagesHi = null;
  if (wantHi) {
    imagesHi = await Promise.all(hiBufs.map((b) => (b ? imageFromBuffer(b).catch(() => null) : null)));
    if (imagesHi.every((x) => x === null)) imagesHi = null;
  }
  const syncJson = JSON.parse(new TextDecoder().decode(syncBuf));
  const audio = new Audio(URL.createObjectURL(new Blob([audioBuf], { type: 'audio/mp4' })));
  return { scriptBuf, syncJson, images, imagesHi, audio };
}
