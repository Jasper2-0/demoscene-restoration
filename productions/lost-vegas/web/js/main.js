// Lost Vegas — web restoration. Boot + frame loop.
//
// Structure mirrors the original (see work/re/engine/FRAME_LOOP.md):
//   WinMain -> DDraw/D3D7 init -> build font/logo texture -> start music
//            -> master loop (a ladder of `while (musicPos < T)` blocks)
// The whole timeline is sequenced by SONG POSITION, not wall clock, so playing
// the module live keeps the visuals locked to the music by construction.
//
// Debug: ?debug or ?pos=0x600 renders a single frame at a music position
// (no audio). ?t=SECONDS does the same by time.

import { MiniD3D7, D3DTEX_MIPMAP } from './minid3d7.js';
import { Kernel } from './kernel.js';
import { sceneAt, normalizePos, POS_MAX } from './timeline.js';
import { buildRegistry } from './effects/registry.js';
import { XmPlayer } from './xm.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || params.has('pos') || params.has('t');

const TEXTURES = ['dr_256_grid_panels', 'dr_64_grid_small', 'dr_64_envmap', 'dr_64_finale'];

// The remastered replacements for the textures the effect modules build on the
// CPU at init() time (assets/remaster/README.md). Loaded here because init() is
// synchronous; they travel to the effects as raw <img> in the same `textures`
// object the DR textures use, and each effect uploads its own with the FLAGS
// its generator used — the flags decide the surface semantics, so they are not
// interchangeable. Every one is optional: a missing file leaves the slot
// undefined and the effect falls back to its generator.
const PROC_TEXTURES = ['proc_credits_design', 'proc_f_logo1', 'proc_f_logo2',
  'proc_d_logo', 'proc_grid16', 'proc_radial_k100', 'proc_radial_k110'];
// 8x4 atlas of 32 tiles, 256 each, banner order, each tile already rotated 180
// degrees (the original writes its glyph buffer backwards). Sliced into 32
// ImageBitmaps here because the finale binds one texture per glyph.
const GLYPH_ATLAS = 'proc_finale_glyphs';
const GLYPH_COLS = 8, GLYPH_ROWS = 4;

// Remaster layer, strictly additive. ?quality=original gives the authentic
// build: the 64/256-px decoded textures, the original tessellation, and
// threestate's own (uneven) font baselines. Anything else gets the remaster,
// which falls back per-asset if a remastered file is absent.
const AUTHENTIC = params.get('quality') === 'original';
const TESS = AUTHENTIC ? 1 : parseInt(params.get('tess') || '4', 10);

async function loadAssets() {
  const loadImg = (src) => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
  });
  const opt = (p) => p.catch(() => null);
  // Slice the glyph atlas into its 32 tiles. Unpremultiplied + no colour-space
  // conversion so the tiles reach GL exactly as baked (grey = RGB = A, and
  // createTextureFromImage does not ask GL to premultiply).
  const sliceAtlas = async (img) => {
    if (!img) return null;
    const tw = img.width / GLYPH_COLS, th = img.height / GLYPH_ROWS;
    return Promise.all(Array.from({ length: GLYPH_COLS * GLYPH_ROWS }, (_, i) =>
      createImageBitmap(img, (i % GLYPH_COLS) * tw, ((i / GLYPH_COLS) | 0) * th, tw, th,
        { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })));
  };
  const [xmBuf, fontImg, fontMetrics, kernFix, ...texImgs] = await Promise.all([
    // ?audio=original (8-bit 1x, authentic) | 16bit (16-bit 1x, keeps the
    // player's imaging "grit") | remaster (16-bit 2x, smoother — default)
    fetch(`assets/${AUTHENTIC || params.get('audio') === 'original' ? 'vegas'
      : params.get('audio') === '16bit' ? 'vegas_16bit_1x' : 'vegas_remaster'}.xm`)
      .then((r) => r.ok ? r.arrayBuffer() : fetch('assets/vegas.xm').then(x=>x.arrayBuffer())),
    loadImg('assets/font.png'),
    fetch('assets/font_metrics.json').then((r) => r.json()),
    AUTHENTIC ? Promise.resolve(null)
              : opt(fetch('assets/font_kern_remaster.json').then((r) => r.ok ? r.json() : null)),
    ...TEXTURES.map((n) => AUTHENTIC ? loadImg(`assets/${n}.png`)
      : opt(loadImg(`assets/remaster/${n}.png`)).then((hi) => hi || loadImg(`assets/${n}.png`))),
    // Additive only: there is no 1x file to fall back TO, the fallback is the
    // effect's own generator, so a null here is the authentic path.
    ...PROC_TEXTURES.map((n) => AUTHENTIC ? Promise.resolve(null)
      : opt(loadImg(`assets/remaster/${n}.png`))),
    AUTHENTIC ? Promise.resolve(null)
      : opt(loadImg(`assets/remaster/${GLYPH_ATLAS}.png`).then(sliceAtlas)),
  ]);
  // corrected baselines are just a kern override the text engine already accepts
  if (kernFix) fontMetrics.kern = kernFix.kern || kernFix;
  const procImgs = texImgs.splice(TEXTURES.length);   // leaves texImgs = the DR four
  return { xmBuf, fontImg, fontMetrics, texImgs, procImgs, tess: TESS, authentic: AUTHENTIC };
}

let d3dRef = null;
function fit() {
  // The original ran a fixed 640x480. Display is always 4:3 (no distortion);
  // in the remaster the FRAMEBUFFER follows the window at device resolution,
  // while the engine keeps drawing in logical 640x480 coordinates.
  const w = Math.min(window.innerWidth, (window.innerHeight * 4) / 3);
  const h = (w * 3) / 4;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const scale = AUTHENTIC ? 1
    : Math.max(1, Math.min(4, (w * (window.devicePixelRatio || 1)) / 640));
  const bw = Math.round(640 * scale), bh = Math.round(480 * scale);
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw; canvas.height = bh;
    if (d3dRef) d3dRef.setRenderScale(scale);
  }
}
window.addEventListener('resize', fit);
fit();

const assets = await loadAssets();

function boot() {
  const d3d = new MiniD3D7(canvas);
  d3dRef = d3d;
  d3d.setRenderScale(canvas.width / 640);
  const K = new Kernel(d3d);
  // font atlas + metrics from the baked 2-bit alpha sheet
  K.setFont(K.createTextureFromImage
    ? K.createTextureFromImage(assets.fontImg, 2)
    : d3d.createTextureFromImage(assets.fontImg), assets.fontMetrics);
  // Mips only on the remaster path. A 4x texture minified with plain LINEAR
  // shimmers wherever the surface is small on screen; the shim's default
  // MIPFILTER is already D3DTFP_POINT, so the flag alone selects
  // LINEAR_MIPMAP_NEAREST. ?quality=original keeps the original's single level.
  // (The effects OR the same flag in themselves — they only ever reach that
  // path when a remastered image is present, which never happens under
  // ?quality=original.)
  const MIP = AUTHENTIC ? 0 : D3DTEX_MIPMAP;
  const textures = {};
  TEXTURES.forEach((n, i) => {
    textures[n] = d3d.createTextureFromImage(assets.texImgs[i], MIP);
  });
  // raw images/bitmaps — each effect uploads its own with its generator's flags
  PROC_TEXTURES.forEach((n, i) => { textures[n] = assets.procImgs[i] || null; });
  textures[GLYPH_ATLAS] = assets.procImgs[PROC_TEXTURES.length] || null;
  K.tess = assets.tess || 1;          // geometry supersampling for the remaster
  const registry = buildRegistry(K, d3d, textures);
  for (const s of registry.values()) if (s.init) s.init();
  return { d3d, K, registry };
}

function renderAt(ctx, pos, extra = {}) {
  const scene = sceneAt(pos);
  ctx.d3d.presentAndBeginNextFrame
    ? ctx.d3d.presentAndBeginNextFrame()
    : (ctx.d3d.EndScene(), ctx.d3d.Flip(), ctx.d3d.Clear(), ctx.d3d.BeginScene());
  if (!scene) return null;
  const eff = ctx.registry.get(scene.id);
  if (eff && eff.render) eff.render(pos, extra);
  return scene;
}

if (DEBUG) {
  overlay.remove();
  const ctx = boot();
  // ms defaults to a plausible wall clock for the given music position rather
  // than 0 — several scenes drive motion from timeGetTime (see FRAME_LOOP.md),
  // and pinning it to 0 freezes them. Callers may pass an explicit ms.
  const MS_PER_POS = 176700 / 0x1a20; // reference runtime / final threshold
  window.__lvRender = (pos, ms, rowFrac = 0) => {
    const p = Math.min(POS_MAX, pos | 0);
    const t = ms === undefined ? p * MS_PER_POS : ms;
    const s = renderAt(ctx, p, { ms: t, songMs: t, rowFrac });
    return { pos: p, scene: s ? s.id : null, ms: t, rowFrac };
  };
  const posParam = params.get('pos');
  const start = posParam
    ? (posParam.startsWith('0x') ? parseInt(posParam, 16) : parseInt(posParam, 10))
    : 0;
  window.__lvReady = true;
  window.__lvRender(start);
} else {
  overlay.textContent = 'click to start';
  overlay.addEventListener('click', async () => {
    overlay.remove();
    const ctx = boot();

    // live XM playback via WebAudio — the player's position drives everything
    const ac = new AudioContext();
    const player = new XmPlayer(new Uint8Array(assets.xmBuf), ac.sampleRate);
    // Render the module in small chunks and TAG each with the position it will
    // sound at — the same trick the original player used (it tagged every mixed
    // block with its (order,row) and mapped back through the block ring). This
    // gives the *audible* position rather than the render-ahead one, and it is
    // robust to pattern breaks, which a rows-elapsed calculation is not.
    const CHUNK = 1024;    // 21 ms tag granularity; smaller chunks starve the
                          // ScriptProcessor callback (16x the per-call overhead)
    const tags = [];            // { t, pos } — t = AudioContext time it sounds at
    const node = ac.createScriptProcessor(4096, 0, 2);
    node.onaudioprocess = (e) => {
      const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
      const n = e.outputBuffer.length;
      // playbackTime is when this buffer reaches the output, in the same clock
      // as ac.currentTime — so tags land on the same timeline we read below.
      const base = (typeof e.playbackTime === 'number' && e.playbackTime > 0)
        ? e.playbackTime : ac.currentTime;
      for (let off = 0; off < n; off += CHUNK) {
        const len = Math.min(CHUNK, n - off);
        const raw = (((player.position & 0xff) << 8) | (player.row & 0xff)) & 0xffff;
        const pos = normalizePos(raw);
        if (!tags.length || tags[tags.length - 1].pos !== pos) {
          tags.push({ t: base + off / ac.sampleRate, pos });
        }
        player.render(L.subarray(off, off + len), R.subarray(off, off + len), len);
      }
    };
    node.connect(ac.destination);
    await ac.resume();

    // One clock for everything, taken from the AUDIO context.
    //
    // Reading player.position/row directly is wrong twice over: they describe
    // what has been rendered INTO the buffer (~85 ms ahead of what you hear),
    // and they only change once per row, so any motion derived from them
    // advances in 120 ms steps — visible staggering.
    //
    // So: triggers come from the buffer tags above (audible position, correct
    // across pattern breaks), and motion comes from the continuous clock below.
    // Deriving the row from elapsed time instead does NOT work — the song has
    // pattern breaks, so rows-elapsed drifts out of sync within seconds.
    //
    // ac.currentTime only advances once per render quantum (128 frames ≈ 2.7 ms),
    // so use it as the authority and interpolate with wall time in between —
    // that gives motion a continuous clock. Monotonic: the interpolation resets
    // exactly when the audio clock steps.
    const startT = ac.currentTime;
    const SR = ac.sampleRate;
    const ROW_SECONDS = 0.120;   // speed 6 @ 125 BPM
    let lastAc = -1, lastAcWall = 0, curPos = 0, curPosT = null;
    const frame = () => {
      const acNow = ac.currentTime, wall = performance.now();
      if (acNow !== lastAc) { lastAc = acNow; lastAcWall = wall; }
      const songMs = Math.max(0, (acNow - startT) * 1000 + (wall - lastAcWall));

      // audible position: newest tag whose audio has already reached the output
      let i = 0;
      while (i + 1 < tags.length && tags[i + 1].t <= acNow) i++;
      if (tags.length && tags[i].t <= acNow) {
        curPos = tags[i].pos; curPosT = tags[i].t; if (i > 0) tags.splice(0, i);
      }
      const pos = curPos;
      // Fraction elapsed through the current row, from the audio clock. Scenes
      // that derive motion from the row index need this or they step at 8 Hz.
      // Span it against the NEXT tag when one is queued (tags are produced
      // ahead of playback) rather than a nominal row length — the real interval
      // is ~122.7 ms, so dividing by 120 saturates and freezes the last ~2% of
      // every row, a visible hitch 8x/second in slow fades.
      const nextT = (tags.length > 1 && tags[1].t > curPosT) ? tags[1].t : null;
      const span = nextT !== null ? (nextT - curPosT) : ROW_SECONDS;
      const rowFrac = curPosT === null ? 0
        : Math.min(1, Math.max(0, (acNow - curPosT) / span));

      window.__lvClock = { songMs, pos, rowFrac, acTime: acNow - startT, tags: tags.length };
      const scene = renderAt(ctx, pos, { ms: songMs, songMs, rowFrac });
      if (!scene) { node.disconnect(); ac.close(); return; } // past the finale
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, { once: true });
}
