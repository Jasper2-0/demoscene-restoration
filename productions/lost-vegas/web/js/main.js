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
import { sceneAt, normalizePos, POS_MAX, posToSeconds, SCENES, secondsToPos,
         sceneEntryPos, ROW_SECONDS } from './timeline.js';
import { buildRegistry } from './effects/registry.js';
import { XmPlayer } from './xm.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const params = new URLSearchParams(location.search);
// ?inspect=1 installs the production-agnostic tooling adapter (window.__demo,
// tools/inspect/ADAPTER.md). It joins the existing debug path, which builds no
// audio graph and no click gate — what a caller-driven mode needs.
const INSPECT = params.has('inspect');
const DEBUG = params.has('debug') || params.has('pos') || params.has('t') || INSPECT;

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
  window.__lvRender = (pos, ms, rowFrac = 0) => {
    const p = Math.min(POS_MAX, pos | 0);
    // posToSeconds is the MEASURED mapping (timeline.js). The old
    // `p * MS_PER_POS` averaged over POSITION units, but pos is sparse — 64 of
    // every 256 values occur — so it was out by ~4.5x per row, and `ms` is
    // exactly what scenes D/E/F integrate.
    const t = ms === undefined ? (posToSeconds(p) ?? 0) * 1000 : ms;
    const s = renderAt(ctx, p, { ms: t, songMs: t, rowFrac });
    return { pos: p, scene: s ? s.id : null, ms: t, rowFrac };
  };

  /**
   * COLD RENDER: reset this scene, then walk to `pos` in MILLISECONDS at a fixed
   * simulated cadence, one render per simulated frame.
   *
   * Three scenes integrate frame deltas, so `__lvRender(pos)` alone gives a
   * frame that depends on whatever ran before it — which makes a sweep score
   * unattributable after its first sample. This makes the history a declared,
   * reproducible one instead of an accidental one.
   *
   * WHY MILLISECONDS AND NOT POSITION STRIDE. The old pre-roll stepped
   * `q += 0x8`. Scene E's flash triggers on `(pos & 0x1f) in {0x14,0x16,0x17}`
   * and multiples of 8 give {0,8,16,24}, so the trigger rows were never visited
   * and the flash provably never fired in a pre-rolled frame. Stepping time and
   * DERIVING the position from it visits every row the music visits, which fixes
   * that by construction rather than by widening a stride until it works.
   *
   * CADENCE IS A DECLARED MODELLING ASSUMPTION, NOT A DERIVED FACT. Scene F
   * consumes a per-frame delta directly and scene D's blobS is nonlinear in dt
   * with a per-frame step, so their trajectories genuinely depend on frame rate
   * — the ORIGINAL was framerate-dependent here. There is no cadence-independent
   * answer to recover, so the honest move is to fix one, state it, and MEASURE
   * the sensitivity (work/verify/repeat_test.mjs reports it rather than
   * asserting it away).
   */
  const COLD_FPS = 60;
  window.__lvRenderCold = (pos, opts = {}) => {
    const fps = opts.fps ?? COLD_FPS;
    const p = Math.min(POS_MAX, pos | 0);
    const scene = sceneAt(p);
    if (!scene) return { pos: p, scene: null, ms: 0, frames: 0, fps };

    const entry = sceneEntryPos(p);
    const t0 = (posToSeconds(entry) ?? 0) * 1000;
    const t1 = (posToSeconds(p) ?? 0) * 1000;

    // RESET EVERY SCENE, NOT JUST THIS ONE — because they are not independent.
    // eff_d draws the scene-E overlay itself (`if (pos >= 0xb38) drawMoire(...)`)
    // and its resetTimers comments eT0 as FUN_00409d8d's _DAT_00510200, i.e.
    // eff_e's t0: in the original these scenes SHARE globals. Resetting only the
    // scene at `pos` therefore leaves its partner holding whatever the previous
    // sample left, which is exactly what ORDER kept reporting — and the tell was
    // that D and E disagreed with DIFFERENT pairs of orderings, which a
    // first-pass or warm-up effect cannot produce.
    //
    // Safe because reset() is defined as "the state at FIRST ENTRY", which is
    // idempotent and is the state a cold render is entitled to assume.
    for (const e of ctx.registry.values()) if (e.reset) e.reset(t0);
    // REFUTED BY MEASUREMENT, 2026-08-15: also resetting the DEVICE to its boot
    // state here (a minid3d7 resetState() restoring this.rs/this.tss from a
    // construction-time snapshot) made ORDER go from 2/12 failing to 5/12, and
    // broke `finale`, which had been clean. Scenes legitimately inherit device
    // state that earlier scenes set, so restoring boot state models something
    // the demo never does. This is plan risk R2 — a reset that clears too much
    // is caught only by the numbers getting worse, never by the tests below.

    // Step time, derive position. rowFrac comes from the measured row start, so
    // scenes that need sub-row motion get a continuous clock here too rather
    // than stepping at 8 Hz.
    const stepMs = 1000 / fps;
    let frames = 0;
    for (let t = t0; t < t1 - 1e-6; t += stepMs) {
      const q = secondsToPos(t / 1000);
      const rowStart = (posToSeconds(q) ?? 0) * 1000;
      const rf = Math.min(1, Math.max(0, (t - rowStart) / (ROW_SECONDS * 1000)));
      renderAt(ctx, q, { ms: t, songMs: t, rowFrac: rf });
      frames++;
    }
    // Land exactly on the requested instant, so the returned frame is the one
    // asked for and not the last step before it.
    const s = renderAt(ctx, p, { ms: t1, songMs: t1, rowFrac: 0 });
    return { pos: p, scene: s ? s.id : null, ms: t1, frames, fps, entry };
  };
  const posParam = params.get('pos');
  const start = posParam
    ? (posParam.startsWith('0x') ? parseInt(posParam, 16) : parseInt(posParam, 10))
    : 0;
  // ---- INSPECTOR ADAPTER (tools/inspect/ADAPTER.md).
  //
  // lost-vegas's parts are the scene ladder in timeline.js: EXCLUSIVE, unlike the
  // layered Sunflower ports, so one scene owns the screen and state().active is a
  // single name. The ladder stores only `until` (an exclusive upper bound on
  // musicPos), so a scene's start is the previous entry's `until` and the first
  // starts at 0.
  //
  // Its native coordinate is MUSIC POSITION, converted with the measured
  // posToSeconds — the same shape as sonnet and ptct.
  //
  // KNOWN LIMITATION, and the reason no score here is a fidelity claim yet:
  // render() is NOT repeatable. Scenes D, E and F integrate frame deltas and
  // reset only on a REWIND, so a frame depends on how it was reached. The plan's
  // remaining Phase 4 work (reset(ms) on the registry, a renderCold that steps in
  // MILLISECONDS from the scene-entry boundary, and an equivalence test) fixes
  // that. Run tools/inspect/repeatability.mjs before trusting a sweep.
  //
  // THE AUDIT IS RIGHT, and confirming that cost an instrument fix (#36).
  // repeatability.mjs first failed sceneC too, which reads exactly like a missed
  // integrator. It is not one: the difference is RMSE 0.330 and CONSTANT across
  // renders (r 0.999943), where sceneD's grows 3.53 -> 5.05 -> 6.05. Integrators
  // ACCUMULATE; a constant sub-LSB difference is rasteriser nondeterminism. The
  // fault was the test asserting on a SHA of the PNG, which cannot tell a few
  // stray pixels from a demo that has lost its state. With a noise floor it now
  // names D and E and clears C — matching the audit that read each scene for
  // accumulation. ISOLATION passes; only ORDER and REPEAT fail, on D/E.
  const BANDS = [];
  {
    let from = 0;
    for (const sc of SCENES) {
      const startS = posToSeconds(from) ?? 0;
      const endS = posToSeconds(Math.min(POS_MAX, sc.until)) ?? startS;
      BANDS.push({ name: sc.id, from, until: sc.until, start: startS,
                   dur: Math.max(0.1, endS - startS) });
      from = sc.until;
    }
  }
  let CAP_OFFSET = 0;
  try {
    const pj = await (await fetch(new URL('../../prod.json', import.meta.url))).json();
    CAP_OFFSET = (pj.captures?.[0]?.alignmentOffsetMs ?? 0) / 1000;
  } catch { /* no manifest reachable: schedule works, scores will not align */ }

  let lastState = null;
  window.__demo = {
    id: 'lost-vegas',
    schedule: () => BANDS.map((b) => ({
      name: b.name, phase: 1, start: b.start, dur: b.dur,
      captureStart: b.start + CAP_OFFSET,
    })),
    // plan() intentionally omitted — tools/inspect/plan.mjs owns the grid.
    async render({ part, local }) {
      const b = BANDS.find((x) => x.name === part);
      if (!b) return null;
      // renderCold, not __lvRender: three scenes integrate frame deltas, so a
      // plain seek returns a frame that depends on whatever the harness rendered
      // before it. Cold makes the history declared and reproducible, which is
      // what the contract's repeatability requirement actually asks for.
      const info = window.__lvRenderCold(secondsToPos(b.start + local));
      lastState = { ...info, part, local, active: [info.scene ?? part],
                    posHex: '0x' + info.pos.toString(16).padStart(4, '0') };
      return lastState;
    },
    state: () => lastState,
    assets: () => null,
    /** Musical coordinate — order/row, like sonnet and ptct. */
    positionAt(showTime) {
      const p = secondsToPos(Math.max(0, showTime - CAP_OFFSET));
      const raw = p > 0x3ff ? p - 0x200 : p;
      return `order ${raw >> 8} row ${raw & 0xff}`;
    },
  };
  // PRIME EVERY SCENE ONCE BEFORE DECLARING READY.
  //
  // With renderCold in place, REPEAT and ISOLATION passed but ORDER still failed
  // on D and E — and the tell was that DESCENDING and SHUFFLED agreed with each
  // other while only ASCENDING differed. Order dependence cannot do that; a
  // first-pass effect can. Whatever a scene builds lazily on its first ever
  // render (GL resources, cached geometry) is built during the ascending run and
  // reused by the two after it, so the first pass measures a different thing.
  //
  // This is the same shape as lapsus's GL_SHININESS seeding: the fix is not to
  // hunt each lazy allocation but to REPLAY until the state converges, so every
  // measured render starts from the same place by construction rather than by
  // luck. One render per scene is enough because the effect is first-use, not
  // accumulating.
  for (const b of BANDS) {
    try { window.__lvRenderCold(secondsToPos(b.start + b.dur / 2)); } catch { /* keep priming */ }
  }
  window.__demoReady = true;

  window.__lvReady = true;
  // In inspect mode the tooling drives every frame.
  if (!INSPECT) window.__lvRender(start);
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
