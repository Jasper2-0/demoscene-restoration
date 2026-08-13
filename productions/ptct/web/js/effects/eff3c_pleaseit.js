// 0x3C "p l e a s e   i t" text flashes (armed 00:00 -> 26:00, layer 99;
// TRIGs at 24:00 -> 25:63, params 0x00..0x13).
// Ported from: init FUN_00402330 (renderfuncs.c 282), render FUN_00402490
// (renderfuncs.c 372), trigger FUN_004021f0 (ptct.c 576), blur FUN_00401f90
// (ptct.c 500).
// Init details from the decompile: 256 slots; per slot x THEN y from the
// engine LCG rand31 (FUN_004119a0): 0.25 + (rand31() & 0xff)/512 — 512 calls
// total. Only the first 40 slots (4x10 string table) get a texture; the rest
// keep tex 0 and never draw. All 40 strings are identical, so one texture is
// shared here (API.md).
// The original rasterized "   p l e a s e   i t" with Arial 32 into a 256x32
// buffer, then ran blurGrayscale (FUN_00401f90: horizontally wrapped 3-tap
// sum >> 2, result replicated to all 4 channels, max 191). The shipped
// please_it.png is the UNblurred raster (binary 0/255) — we apply the exact
// blur once at init before creating the texture.
// Render: additive; per flashed slot: age = (now - flashTime)*2;
// e = 1 - age*0.000125 (<=0 clears the slot); b = 0.5 - 0.5*cos(e*2pi);
// s = 800/(age+8); quad at (x-2s, y-0.35s) size (4s, 0.7s), grey b.

import { rand31 } from '../scene.js';

// FUN_00401f90 — blurGrayscale(w x h RGBA). Reads one channel (byte +2 of the
// original's little-endian ARGB int = R; our RGBA byte +0 = R — the strip is
// greyscale so all channels agree), sums 3 horizontal taps with wraparound,
// >> 2, writes the value to all 4 channels.
// `stride` scales the tap spacing so the blur keeps the ORIGINAL's spatial
// footprint when the strip is baked supersampled (stride = strip width / 256).
export function blurGrayscale(data, w, h, stride = 1) {
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -1; k <= 1; k++) {
        let xx = x + k * stride;
        if (xx < 0) xx += w;
        if (xx >= w) xx -= w;
        sum += data[(row + xx) * 4];
      }
      const v = sum >> 2;
      const o = (row + x) * 4;
      out[o] = v; out[o + 1] = v; out[o + 2] = v; out[o + 3] = v;
    }
  }
  return out;
}

export function makeEffect(R) {
  const xs = new Float32Array(256);   // this+0x004
  const ys = new Float32Array(256);   // this+0x404
  const flash = new Float64Array(256); // this+0x804 (0 = inactive)
  const NTEX = 40;                    // slots with a nonzero texture id
  let tex = null;
  let lastNow = 0; // trigger() has no pos argument; render tracks pos.ticks

  return {
    init() {
      // rand31 in exact original order: x then y, 256 slots
      for (let i = 0; i < 256; i++) {
        xs[i] = (rand31() & 0xff) * 0.001953125 + 0.25;
        ys[i] = (rand31() & 0xff) * 0.001953125 + 0.25;
        flash[i] = 0;
      }
      // load the pre-baked strip, blur it once, make the shared texture
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height; // 256x32 (xSS if supersampled)
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const px = ctx.getImageData(0, 0, img.width, img.height).data;
        const stride = Math.max(1, Math.round(img.width / 256));
        tex = R.makeTextureFromRGBA(blurGrayscale(px, img.width, img.height, stride),
          img.width, img.height);
      };
      img.onerror = (e) => console.error('eff3C: please_it.png failed', e);
      img.src = 'assets/text/please_it.png';
    },

    // FUN_00402490 — every frame while armed
    render(t, pos) {
      lastNow = pos.ticks;
      if (!tex) return;
      const mgl = R.mgl, gl = R.gl;
      mgl.enableBlend(true);
      gl.blendFunc(gl.ONE, gl.ONE);
      mgl.enableTexture(true);
      mgl.bindTexture(tex);
      for (let i = 0; i < 256; i++) {
        if (flash[i] === 0 || i >= NTEX) continue;
        const age = (pos.ticks - flash[i]) * 2;
        if (age <= 0) continue;
        const e = 1.0 - age * 0.000125;
        if (e <= 0) { flash[i] = 0; continue; }
        const b = 0.5 - Math.cos(e * 6.2831855) * 0.5;
        mgl.color4(b, b, b, 1);
        const s = 800.0 / (age + 8);
        R.orthoQuad(xs[i] - (s + s), ys[i] - s * 0.35, s * 4.0, s * 0.7);
      }
      // depth state untouched, as in the original (see eff1D note)
      mgl.color4(1, 1, 1, 1);
      mgl.enableBlend(false);
      mgl.enableTexture(false);
    },

    // FUN_004021f0 — latch the flash time (original: getTicks(); per API.md
    // we latch pos.ticks, tracked from the last render call)
    trigger(param) {
      const p = param & 0xffff;
      if (p < 256) flash[p] = lastNow;
    },
  };
}
