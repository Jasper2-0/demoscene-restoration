// main.js — Sonnet (threestate, Assembly 2001 64k) — the runtime.
//
//   live XM playback  ->  AUDIBLE music position  ->  timeline tick  ->  render
//
// The original's main loop (ENGINE.md) is exactly that: read `(order << 8) | row`
// from the MiniFMOD player, run every event whose timestamp has passed, then draw
// sixteen layer passes. Nothing here is on a wall clock.
//
// Query parameters
//   ?pos=0xNNN         render ONE frame at that music position, no audio
//   ?debug             stats overlay
//   ?quality=original  640x480, 1x textures, the 1x font atlas   (default: remaster)
//   ?texscale=1|2|4    texture generation scale on the remaster path (default 2).
//                      Every texgen program is RE-EVALUATED at that resolution —
//                      see re/REMASTER_WIRING.md. Ignored under ?quality=original.
//   ?bg=RRGGBB         paint the backbuffer (verification aid; the demo clears black)
//   ?skip=0,3          omit timeline objects by index (verification aid)
//   ?audio=party       the authentic stereo-panning bug as it played at the party
//                      (default: the fixed module)
//   ?assets=baked      download baked/tex/11.png and extracted/sonnet.xm instead of
//                      generating them. The fallback path and the regression corpus
//                      — see js/assets.js.  (default: generate)
//   ?preload=0|1       force the loading screen off / on. It is on for playback and
//                      off for the single-frame capture path.
//
// Exposed for headless capture: window.__sonnetReady, window.__sonnetRender(pos, ms),
// window.__sonnetClock, window.__sonnetTimings.

import { MiniD3D8 } from './minid3d8.js';
import { Timeline, seek, positionToSeconds, secondsToPosition, END_POSITION }
  from './timeline.js';
import { TextEngine } from './text.js';
import { Compositor } from './compositor.js';
import { XmPlayer } from './xm.js';
import { Preloader } from './preloader.js';
import { buildAtlas, buildModule, warmTextures, allTextureIds } from './assets.js';
// Only for the verification harness's RNG snapshot/restore (see __sonnetRenderSeq).
import * as MG from '../../work/js/meshgen.mjs';

const params = new URLSearchParams(location.search);
const AUTHENTIC = params.get('quality') === 'original';
const DEBUG = params.has('debug');
const POS_PARAM = params.get('pos');
const PARTY = params.get('audio') === 'party';
const ASSET_MODE = params.get('assets') === 'baked' ? 'baked' : 'generated';
// The D3D-correct inverse-transpose normal transform + FUN_0040e923's shadow
// bake. They are ONE change — each alone measures as a regression, together
// 0x0738 goes 26.54 -> 17.31 (re/scenes/REVIEW_FIXES.md 2f/2g).
//
// DEFAULT since 2026-08-10, after a three-round Safari debugging saga worth
// recording because the lesson is not about lighting at all.
//
// Enabling this made `boot()` slow enough (the 16-pass shadow bake, ~2.7 s on
// V8 and several times that on JavaScriptCore) to cross Safari's transient
// activation deadline, which detonated a LATENT ordering bug: the AudioContext
// was constructed after `await boot(...)`, outside the click gesture. It was
// only ever correct by accident, and the bake merely removed the margin that
// had been hiding it. Symptom: black screen and no audio, because the video
// clock is tagged off audio. See the long comment at the AudioContext.
//
// Reverting the bake would have "fixed" that while leaving the real defect
// armed for the next slow thing added to boot. It is fixed at the source now.
//
// Worth it: RMSE 26.54 -> 17.32 at 0x0738. `?lighting=legacy` is the escape
// hatch, kept so the two normal-transform paths stay A/B-able.
const LIGHTING_MODE = params.get('lighting') === 'legacy' ? 'legacy' : 'fixed';
// Generate textures lazily, in the original's stream order, instead of warming
// them up front. `?prewarm=1` restores the old behaviour for A/B measurement.
// (kept: `?prewarm=0` skips the pre-warm entirely, generating lazily instead)
const SKIP_PREWARM = params.get('prewarm') === '0';
// The precalc disk cache — see web/js/warmstore.js for the equivalence
// argument.  `?warm=` 0 = cold (the blessed-baseline mode) | 1 = load, loud on
// miss | record = cold boot that records for test/bake_warmstore.mjs | default
// = auto (load if a fresh store exists, otherwise cold with a console.info).
const WARM_MODE = (() => {
  const w = params.get('warm');
  if (w === '0') return 'off';
  if (w === 'record') return 'record';
  if (w === '1') return 'load-loud';
  // auto only on local hosts: the store is a dev/harness artifact and a
  // deployed page should not probe for a manifest it will never have.
  const h = location.hostname;
  return (h === '127.0.0.1' || h === 'localhost' || h === '') ? 'auto' : 'off';
})();

export const SETTLE_MS = 1000 * (6 * 2.5 / 92) / 2;   // half a row

// Data roots, derived from THIS MODULE's URL rather than the page's.
//
// `main.js` always sits at <root>/web/js/main.js, so `../../work/` is the work
// root and `../assets/` is its own asset dir — true wherever index.html lives.
// It used to be the literal '../', i.e. relative to `location.href`, which
// silently required the page to be at web/index.html; that assumption is
// what a deploy with index.html at the site root breaks. Absolute hrefs are fine
// at every consumer (`fetch`, `new URL(x, location.href)`, the `root` option).
const ROOT = new URL('../../work/', import.meta.url).href;
const ASSETS = new URL('../assets/', import.meta.url).href;

// --------------------------------------------------------------------- texture scale
// The remaster's whole point (re/REMASTER.md §3, re/REMASTER_WIRING.md).  ONE number,
// read here and pushed into scene7.js's `setTexScale` before anything is generated:
//
//   ?quality=original   ->  1   byte-identical, the regression guard
//   default             ->  2   every texgen program re-EVALUATED at 2x
//   ?texscale=1|2|4         override either way (4x is supported and measured; it is
//                           not the default — see the timings in REMASTER_WIRING §6)
//
// It is a texture scale, not an upscale: the generators are run again at the finer
// grid, which is the honest kind of remaster.  `scale === 1` inside runTexgen forces
// the literal 3x3 convolution kernel and the native noise path, so the authentic
// path is the original code, not a special case of the remaster one.
// The font atlas gets its own scale, separate from TEX_SCALE, because the demo IS a
// poem: type is the content, it is drawn large and scaled per item, and it is the one
// asset whose "true" higher-resolution form genuinely exists (the real Times New Roman
// outlines) rather than being a finer sampling of a generator.
//
// It is free of the usual remaster caveats. The consumer SCANS the atlas for glyph
// extents (FUN_00406c98, text.js §column scan) instead of trusting stored metrics, so
// a supersampled atlas lays out identically — and `K.U_TO_PX = 2048` stays at the
// ORIGINAL 2048 because it is a unit (u fraction -> screen px), not a resolution.
//
// Cost is real: 2048x512 at scale S is S^2 * 4 MB of texture. 4x = 67 MB.
const ATLAS_SCALE = (() => {
  if (AUTHENTIC) return 1;              // the regression guard wins, always
  const q = params.get('fontscale');
  const n = q === null ? 2 : parseInt(q, 10);   // 4 is available via ?fontscale=4
  return [1, 2, 4, 8].includes(n) ? n : 2;
})();
const TEX_SCALE = (() => {
  // ?quality=original is the regression guard for the entire remaster, so it wins
  // over ?texscale unconditionally. There is no query string that makes the
  // authentic path generate anything other than the original's own texels.
  if (AUTHENTIC) return 1;
  const q = params.get('texscale');
  if (q !== null) {
    const v = Number(q);
    if (v === 1 || v === 2 || v === 4) return v;
    console.warn(`main: ?texscale=${q} is not 1, 2 or 4 — ignoring`);
  }
  // ADAPT TO THE PANEL, do not pick a constant.
  //
  // 2x used to be the default because 4x "costs 3x the load for a difference I
  // can't see at 640x480" — which is true, and is also the wrong place to judge a
  // remaster. The render scale is no longer capped at 1280x960 (see fit()), so on
  // a large or HiDPI display the extra texels are now genuinely resolvable, and a
  // 64k intro whose every asset is a GENERATOR has no reason to leave them on the
  // table. Small windows still pay only the 2x cost.
  // Judge by the pixels the demo will actually be rendered at, and stay off 4x on
  // very large canvases: 4x textures (223 MB) plus a multi-megapixel backbuffer is
  // where the renderer process was observed dying during the remaster wiring. 4x
  // buys most on a big display and costs most there too — the useful band is the
  // middle.
  return 2;        // ?texscale=4 opts in; see REGRESSION note above
})();

// The loading screen belongs to playback. The single-frame capture path renders one
// warmed frame with no audio and no user gesture, so it boots straight through;
// `?preload=1` turns it on there anyway when you want to look at it.
const PRELOAD = params.has('preload')
  ? params.get('preload') !== '0'
  : POS_PARAM === null;

// --------------------------------------------------------------------------- timings
// Every phase of the boot, so the "is generating at load fast enough" question is
// answered with numbers instead of an impression. See re/PERFORMANCE.md §0.
const timings = { phases: [], textures: null, total: 0 };
window.__sonnetTimings = timings;
const phase = async (name, fn) => {
  const t0 = performance.now();
  const r = await fn();
  timings.phases.push({ name, ms: performance.now() - t0 });
  return r;
};

// --------------------------------------------------------------- scene jumping
// The demo is 7:41 long, so waiting out the timeline to inspect one scene is not a
// workflow.  Keys are bound HERE, at load, rather than inside the click-to-start
// handler: otherwise nothing responds until the overlay has been clicked and the
// silence is indistinguishable from a broken build.
export const SCENES = [
  ['1', 0x0000, 'title / poem'],   ['2', 0x0400, 'spires'],
  ['3', 0x0700, 'lakes'],          ['4', 0x0a00, 'trees / butterflies'],
  ['5', 0x0f00, 'cloud sea'],      ['6', 0x1200, 'beach / sunset'],
  ['7', 0x1700, 'autumn forest'],  ['8', 0x1e00, 'winter'],
  ['9', 0x2300, 'finale'],         ['0', 0x2b00, 'credits'],
];
let liveJump = null;                       // set once playback starts
let livePos = () => 0;

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const hit = SCENES.find(x => x[0] === e.key);
  const step = { '[': -0x100, ']': 0x100, ',': -8, '.': 8 }[e.key];
  if (!hit && step === undefined) return;
  e.preventDefault();
  if (!liveJump) {
    console.warn('sonnet: scene jump needs playback running — click the screen to ' +
                 'start, then press 1-9/0. (Or use ?start=beach to boot into one.)');
    return;
  }
  if (hit) liveJump(hit[1], hit[2]);
  else liveJump(livePos() + step);
});

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const stats = document.getElementById('stats');

// --------------------------------------------------------------------------- fit
let d3dRef = null;
// ?render=N pins the render scale (1 = 640x480, 6 = 3840x2880). Default: fill the
// display's real pixels.
const RENDER_CAP = (() => {
  const q = params.get('render');
  if (q === null) return null;
  const n = Number(q);
  return Number.isFinite(n) && n >= 1 && n <= 8 ? n : null;
})();

function fit() {
  const w = window.innerWidth, h = window.innerHeight;
  // The demo is 640x480 — 4:3. Letterbox, never stretch.
  const s = Math.min(w / 640, h / 480);
  canvas.style.width = Math.round(640 * s) + 'px';
  canvas.style.height = Math.round(480 * s) + 'px';
  if (!AUTHENTIC) {
    // RENDER AT THE DISPLAY'S REAL PIXELS.
    //
    // This used to be `Math.min(2, ...)`, i.e. 1280x960 maximum. On a 4K panel the
    // demo was therefore rendered at 1280x960 and upscaled by the browser to ~2880
    // — which no amount of texture resolution can undo, and which is exactly the
    // "bilinear mush" the project owner kept seeing. The whole point of restoring a
    // PROCEDURAL production is that every asset is a generator: there is no baked
    // artwork imposing a ceiling, so the remaster should fill whatever panel it is
    // shown on.
    //
    // `devicePixelRatio` is no longer clamped either — on a 2x HiDPI display the
    // canvas backing store now matches the physical pixels the demo occupies.
    const dpr = window.devicePixelRatio || 1;
    const want = RENDER_CAP ?? (s * dpr);
    // Cap on what the GPU will actually allocate rather than an arbitrary number...
    const maxDim = d3dRef ? d3dRef.maxTextureSize ?? 8192 : 8192;
    // ...AND on a total pixel budget. Lifting the old 2x clamp was right, but with
    // no ceiling a 5K panel at dpr 2 asks for 5120x3840 = 19.7 Mpx, on top of the
    // 4x texture set (223 MB) and the 4x font atlas (67 MB) — a credible way to
    // exhaust GPU memory and hang right after precalc. 8.3 Mpx is a little over 4K
    // and is plenty to resolve the generators' detail; ?render=N overrides it.
    const PIXEL_BUDGET = 8.3e6;
    const budgetScale = Math.sqrt(PIXEL_BUDGET / (640 * 480));
    // DEFAULT IS THE OLD 2x CLAMP. Lifting it is right in principle and it broke a
    // working demo on real hardware (black after precalc, no audio) — so the higher
    // resolution is now OPT-IN via ?render=N until the failure is understood.
    const ceiling = RENDER_CAP ?? 2;
    const scale = Math.max(1, Math.min(want, maxDim / 640, budgetScale, ceiling, 8));
    // Quantise to eighths: enough granularity to fill a panel exactly, few enough
    // distinct values that a resize drag does not reallocate every frame.
    const q = Math.round(scale * 8) / 8;
    const cw = Math.round(640 * q), ch = Math.round(480 * q);
    if (canvas.width !== cw) {
      canvas.width = cw; canvas.height = ch;
      if (d3dRef) d3dRef.setRenderScale(q);
      if (DEBUG) console.info(`render ${cw}x${ch} (scale ${q.toFixed(2)}, dpr ${dpr})`);
    }
  }
}
if (AUTHENTIC) { canvas.width = 640; canvas.height = 480; }
window.addEventListener('resize', fit);

// --------------------------------------------------------------------------- assets
// Two small JSON files, and that is the whole download for the demo's content: the
// timeline script and the poem. Textures, meshes, the font atlas and every audio
// sample are built on the machine by js/assets.js.
async function loadAssets() {
  // The one download the generators still need is the unpacked image that carries
  // the four audio streams. Start it now, while the page is waiting for the click
  // that an AudioContext requires, so the audio phase is pure CPU by the time the
  // preloader reaches it. Failure is not fatal here — buildModule() will retry and
  // report properly.
  if (ASSET_MODE !== 'baked' && POS_PARAM === null) {
    import('./node_compat.js')
      .then(m => m.preloadFile(new URL(ROOT + 'unpacked/sonnet_img.bin', location.href).href))
      .catch(() => {});
  }
  const [timelineData, poem] = await Promise.all([
    fetch(ASSETS + 'timeline.json').then(r => r.json()),
    fetch(ROOT + 're/text/poem.json').then(r => r.json()),
  ]);
  return { timelineData, poem };
}

// ------------------------------------------------------------------- progress model
// The preloader's cloud has to be honest (re/PRELOADER.md §1), so it advances only
// when a real step COMPLETES, never on a timer. The per-phase weights below exist
// purely so that it advances at a roughly even RATE, and they are MEASURED, not
// guessed: headless Chrome / ANGLE-Metal, from window.__sonnetTimings —
//
//   ?quality=original   atlas 24  textures 755  scenes 149  audio 79   (1008 ms)
//   remaster 1x         atlas 70  textures 755  scenes 149  audio 79
//   remaster 2x         atlas 70  textures 2800 scenes 260  audio 79   (3209 ms)
//   remaster 4x         atlas 70  textures 10700 scenes 700 audio 79  (11549 ms)
//
// The remaster path costs more in `atlas` only because it renders the font strip at
// 2x. See the table in re/PRELOADER.md §3 and re/REMASTER_WIRING.md §6.
//
// The TEXTURE phase's share grows with the texture scale — it is 72% of the load at
// 1x but 87% at 2x and 93% at 4x — so the weights follow it. Leaving them at the 1x
// split would make the bar sprint to 77% and then sit there for two seconds, which
// is exactly the dishonest progress bar re/PRELOADER.md §1 forbids.
// A progress bar that stalls near the end is worse than none: it asserts
// "finished", so the user concludes the NEXT stage broke. That is exactly what
// happened on 2026-08-10 — `?lighting=fixed` was reported as "does the precalc
// and then doesn't start" when in fact the shadow bake was still running behind
// a bar sitting at ~89%.
//
// Cause: these weights were calibrated when the scene phase really was ~13% of
// the load. The bake makes it 9x more expensive and nothing re-derived them, so
// one phase held 7.2% of the bar and 56% of the wall clock.
//
// So weight by MEASURED cost. Milliseconds below are from window.__sonnetTimings
// on V8 (2026-08-10, TEX_SCALE 2):
//
//               atlas   textures   scenes    total
//     legacy     72 ms    2159 ms    337 ms   2569 ms
//     +bake      76 ms    2333 ms   3011 ms   5419 ms
//
// Only the RATIOS matter, and they hold across engines — JavaScriptCore is
// several times slower in absolute terms but not differentially so.
const WEIGHTS = (() => {
  // Texture cost scales with pixel count; anchored at the measured TEX_SCALE 2.
  const texMs = 2330 * (TEX_SCALE / 2) * (TEX_SCALE / 2);
  // 0.34 s of mesh/terrain generation, plus the 16-pass shadow bake per terrain
  // scene when it is enabled.
  const sceneMs = 340 + (LIGHTING_MODE === 'fixed' ? 2670 : 0);
  const atlasMs = 75;
  const audioMs = 900;
  const total = atlasMs + texMs + sceneMs + audioMs;
  return { atlas: atlasMs / total, textures: texMs / total,
           scenes: sceneMs / total, audio: audioMs / total };
})();

/** A monotone [0,1] accumulator over the weighted phases. */
function makeProgress(pre) {
  let base = 0;
  return {
    async step(weight, sub = 1) {
      const f = base + weight * Math.min(1, sub);
      if (pre) await pre.tick(f);
      if (sub >= 1) base += weight;
    },
    async done() { if (pre) await pre.tick(1); },
  };
}

// --------------------------------------------------------------------------- boot
async function boot(assets, { wantAudio = false } = {}) {
  // ANISOTROPY — remaster only.  Sonnet never sets D3DTSS_MAXANISOTROPY, so plain
  // trilinear IS the authentic behaviour and ?quality=original keeps it. But the
  // remaster's brief is to shine on a modern panel, and trilinear averages a tiled
  // detail map to its mean within a few metres of the camera; 16x keeps that grain
  // resolved several times further out (measured at 0x1828, re/scenes/
  // TERRAIN_DETAIL.md). ?aniso=N overrides either way.
  const anisoParam = Number(params.get('aniso'));
  const ANISO = Number.isFinite(anisoParam) && anisoParam >= 1 ? anisoParam : 1;
  const d3d = new MiniD3D8(canvas, { anisotropy: ANISO });
  d3dRef = d3d;
  fit();
  d3d.setRenderScale(canvas.width / 640);
  d3d.applyDefaultState();
  // Verification aid only: the poem is black text, so with objects 2..10 absent it
  // would be black on black. ?bg=RRGGBB paints the backbuffer so the layout can be
  // compared against the reference. The demo itself never sets a clear colour.
  const bg = params.get('bg');
  const bgColor = bg ? ((0xff000000 | parseInt(bg, 16)) >>> 0) : 0;
  d3d.BeginScene();

  // FUN_004010dc. The first tick paints the cloud with no text on it, exactly as
  // the original's early call sites do: it guards on `DAT_00478920 != 0` and the
  // text object does not exist until the atlas does.
  const pre = PRELOAD ? new Preloader(d3d) : null;
  const progress = makeProgress(pre);
  // Start the warm-store fetch now so it overlaps the atlas phase; it is awaited
  // (and applied) after scene7 is imported below.  Config uses the RESOLVED
  // values, so the record run and the load run agree by construction.
  const warmConfig = { quality: AUTHENTIC ? 'original' : 'remaster',
                       texscale: TEX_SCALE, lighting: LIGHTING_MODE };
  const warmPromise = (WARM_MODE === 'auto' || WARM_MODE === 'load-loud')
    ? import('./warmstore.js')
        .then((ws) => ws.loadWarmStore({ root: ROOT, config: warmConfig,
                                         loud: WARM_MODE === 'load-loud' }))
        .catch((e) => { console.warn('warmstore: load failed —', e); return null; })
    : null;
  // Kept after boot so the loading screen can be inspected without racing the boot
  // it belongs to: `__sonnetPreloader.progress = 100*(1-f); .draw()` repaints it at
  // any fraction, inside one task, which is the only way to screenshot a canvas
  // created with preserveDrawingBuffer:false.
  window.__sonnetPreloader = pre;
  if (pre) await pre.tick(0);

  const built = await phase('atlas', () =>
    buildAtlas(d3d, { root: ROOT, mode: ASSET_MODE, scale: ATLAS_SCALE }));
  const atlas = built.atlas;
  timings.atlasSource = built.source;
  if (built.note) timings.atlasNote = built.note;

  // The eleven objects, index-addressed exactly as the original's array.
  //   0  global compositor        (compositor.js)
  //   1  text engine              (text.js)
  //   2  camera        \
  //   3..10  eight scenes  } scenes.js, built separately — see below
  // ?skip=0,3 omits objects by index. Verification only: the compositor's black
  // overlay hides the flat ?bg= field the text comparison needs.
  const skip = new Set((params.get('skip') || '').split(',').filter(Boolean).map(Number));
  const objects = new Array(11).fill(null);
  if (!skip.has(0)) objects[0] = new Compositor(d3d);
  objects[1] = new TextEngine(d3d, assets.poem, atlas);
  objects[1].reset();
  objects[0]?.reset();

  // From here the loading screen can quote the poem at you, exactly as the original
  // does once its text object exists.
  if (pre) pre.text = objects[1];
  await progress.step(WEIGHTS.atlas);

  // Seam for the camera and the eight effect scenes. If js/scenes.js is present it
  // must default-export `buildScenes(d3d, { atlas })` returning an array whose
  // indices 2..10 are the objects; anything missing stays null and timeline.js
  // silently skips it, so the poem runs on its own.
  try {
    const mod = await import('./scenes.js');

    // PRECALC, the original's way: run every texture program up front, one tick of
    // the progress screen each. `texgenImage` memoises into FUN_00416036's cache, so
    // the scene builds below find everything ready — this is what that cache is for,
    // and it is why the original has a loading screen at all.
    //
    // The obvious remaster shortcut is to skip this and let each scene pull only the
    // programs it uses. MEASURED, it buys nothing: 834 ms either way, because the
    // eight scenes between them touch essentially all 27 programs (re/PRELOADER.md
    // §3). What the pre-warm does buy is 27 honest progress steps instead of 5, so
    // it is done on both paths.
    const s7 = await import('./scene7.js');
    // THE remaster switch. Must happen before the first texgenImage() call, because
    // that is what populates FUN_00416036's cache; setTexScale() invalidates the
    // cache if it is called later, but nothing should rely on that.
    s7.setTexScale(TEX_SCALE);
    timings.texScale = TEX_SCALE;
    // `?lighting=fixed` turns on FUN_0040e923's shadow bake AND the D3D-correct
    // inverse-transpose normal transform together — they are one change (each
    // alone measures as a regression; see re/scenes/REVIEW_FIXES.md 2f/2g).
    // ON by default since 2026-08-10; `?lighting=legacy` is the escape. The
    // bake is ~200 ms per landscape of blocking main-thread work (more on
    // Safari's JSC), which is why it lives in the progress loop and why the
    // progress weights are measured rather than guessed.
    s7.setAuthentic(AUTHENTIC);      // ?quality=original keeps the original's bugs
    s7.setLightingMode(LIGHTING_MODE);
    if (d3dRef) d3dRef.setNormalTransform(LIGHTING_MODE === 'fixed' ? 'inverse' : 'world');
    timings.lighting = LIGHTING_MODE;

    // ---- warm store (web/js/warmstore.js)
    // Load: install every texture entry now (pendingStream rides along, so the
    // stream replay still happens at each program's first REAL use), and give
    // scene7 the shadow provider — its entry-state check is what keeps a stored
    // bake honest.  Record: give scene7 the observers; bake_warmstore.mjs pulls
    // `window.__warmstore.exportStore()` once the boot is done.
    timings.warm = 'cold';
    if (WARM_MODE === 'record') {
      const ws = await import('./warmstore.js');
      const rec = ws.beginRecord(warmConfig);
      s7.setWarmHooks(rec);
      window.__warmstore = rec;
      timings.warm = 'record';
    } else if (warmPromise) {
      const store = await warmPromise;
      if (store) {
        for (const t of store.textures) s7.putTexgenImage(t.id, t.entry, t.scale);
        s7.setWarmHooks({ shadowProvider: store.shadowProvider });
        timings.warm = 'loaded';
      }
    }
    // ⚠ DO NOT PRE-WARM THE TEXTURES.
    //
    // `FUN_00416036` generates a program on FIRST USE and caches it, and its
    // programs draw from the SAME global RNG stream as every mesh generator
    // (js/rng.mjs).  So in the original, each texture's draws — and, for the
    // programs that carry an op33 `srand`, its RESEED — land in the stream at
    // the exact point the scene build first asks for that texture, interleaved
    // with the geometry.  Warming them all up front moves every one of those
    // draws before the first scene builds, which changes what every downstream
    // procedural generator produces.  That is the same class of bug as the
    // impostor bake order (re/scenes/TREE_IMPOSTOR.md).
    //
    // The loading screen still gets honest progress: the scene builds below are
    // inside the same preload phase and now include their own texture work.
    // Pre-warm WITH the stream saved and restored around it, recording each
    // program's post-state so the first real use replays it — see scene7.js
    // `setPrewarming`. This keeps the fast load and the ~28 honest progress
    // steps (which are what animate the loading screen's lattice) while leaving
    // the shared RNG stream exactly where the original leaves it.
    await phase('textures', async () => {
      const streamBefore = MG.randState();
      s7.setPrewarming(true);
      try {
        timings.textures = await warmTextures(s7.texgenImage, s7.texturePlan(allTextureIds()),
          (id, done, total) => progress.step(WEIGHTS.textures, done / total));
      } finally {
        s7.setPrewarming(false);
        MG.srand(streamBefore);
      }
    });

    const t0 = performance.now();
    const built = await (mod.buildScenes || mod.default)(d3d, { atlas, params },
      // repaint between scene builds so a long generator (the shadow bake) shows
      // progress instead of freezing the tab — see scenes.js
      // sub < 1 repaints WITHOUT advancing the base (see `step`), so the single
      // full-weight step below stays the one that advances it.
      (n, total) => progress.step(WEIGHTS.scenes, Math.min(0.999, n / total)));
    timings.phases.push({ name: 'scenes', ms: performance.now() - t0 });
    if (Array.isArray(built)) for (let i = 2; i <= 10; i++)
      if (built[i] && !skip.has(i)) objects[i] = built[i];
    await progress.step(WEIGHTS.scenes);
  } catch (e) {
    // SILENT-FAILURE FIX (found by the sweep agent, 2026-08-05): a scene build that
    // THROWS used to leave objects 3..10 null and render a text-only frame — which
    // still scores plausibly against the reference, so verification runs looked
    // merely "a bit worse" instead of broken. It bit twice, via an intermittent
    // texgen parse failure. Missing scenes.js is legitimate; a scenes.js that
    // exists and throws is a bug and must be loud.
    const missing = /Cannot find module|Failed to fetch|404/i.test(e.message);
    if (missing) {
      if (DEBUG) console.info('scenes.js not present yet — text-only render');
    } else {
      console.error('scenes.js FAILED TO BUILD — rendering text only. ' +
                    'This is a bug, not a configuration:', e);
      window.__sonnetSceneError = String(e && e.stack || e);
    }
  }
  // Verification harnesses await this before capturing, so a boot failure is
  // observable instead of silently producing a plausible-looking wrong frame.
  window.__scenesReady = { ok: !window.__sonnetSceneError,
                           built: objects.filter((o, i) => i >= 2 && o).length,
                           error: window.__sonnetSceneError || null };
  // For harnesses that inspect built state directly (the warm-vs-live
  // equivalence guard hashes each Landscape's shadow map, for one).
  window.__sonnetObjects = objects;

  // The module: rebuilt from the intro's own four embedded streams, or downloaded
  // on ?assets=baked. Last, because it is the only phase whose result the first
  // frame does not need — and because the audio port's own reconstruction is
  // byte-identical to extracted/sonnet.xm, so this is a pure download saving.
  let xm = null;
  if (wantAudio) {
    const m = await phase('audio', () =>
      buildModule({ root: ROOT, mode: ASSET_MODE, party: PARTY }));
    xm = m.xm;
    timings.audioSource = m.source;
    await progress.step(WEIGHTS.audio);
  }

  await progress.done();
  if (pre) {
    pre.finish();
    // The preloader borrowed poem item 0 and the title-bar arrays; put the text
    // engine back exactly as the timeline expects to find it.
    objects[1].reset();
  }
  timings.total = timings.phases.reduce((a, p) => a + p.ms, 0);
  if (DEBUG) console.log('boot', JSON.stringify(timings));

  const timeline = new Timeline(assets.timelineData, objects);
  timeline.init();

  return { d3d, timeline, objects, atlas, bgColor, xm };
}

/** The per-object layer preamble: FUN_0040184c + Clear(D3DCLEAR_ZBUFFER). */
function makeContext(app, pos, ms, rowFrac) {
  return {
    d3d: app.d3d,
    position: pos,
    ms,
    songMs: ms,
    rowFrac,
    beginLayer() {
      app.d3d.resetLayerState();
      app.d3d.Clear(0, null, 2 /* D3DCLEAR_ZBUFFER */, app.bgColor, 1.0, 0);
    },
  };
}

function renderAt(app, pos, ms, rowFrac = 0) {
  const ctx = makeContext(app, pos, ms, rowFrac);
  app.timeline.dispatchUpTo(pos);
  // resetLayerState() zeroes d3d.clearColor (FUN_0040184c does exactly that), so the
  // verification background has to be re-asserted every frame rather than once.
  app.d3d.clearColor = app.bgColor;
  app.d3d.presentAndRestoreBackbuffer(app.bgColor);
  app.timeline.render(ctx);
  return ctx;
}

/**
 * Warm up to `pos` by replaying the script from the start and stepping every
 * object's state machine with no device calls. Scene objects accumulate state from
 * events — text fades, bar flashes, the compositor's colour lerp all integrate over
 * time — so a cold jump renders a screen of alpha-zero text. 60 simulated frames a
 * second over the demo's 461 s is ~28 000 iterations of pure arithmetic; it costs
 * a few tens of milliseconds.
 */
// ?warmstep=F (fps) — PROBE ONLY, default 60 unchanged.  Several of the
// original's accumulators are FRAME-COUNT dependent (the spire growth's
// double integration, SPIRE_REOPEN.md), so the warm-up's simulated frame rate
// is a model of the CAPTURE MACHINE, not of the port.  This knob exists to
// FIT that machine's rate against the reference; baselines and verdicts must
// never be produced with it set (the sweep records it when used).
const WARM_FPS = (() => {
  const v = Number(params.get('warmstep'));
  return Number.isFinite(v) && v >= 5 && v <= 240 ? v : 60;
})();
const WARM_STEP = 1000 / WARM_FPS;

// How far the current warm-up has been stepped, so an ASCENDING sequence of
// captures can continue rather than replaying from zero each time. `null` = cold.
let warmState = null;

/**
 * Step the demo from `fromMs` (exclusive of already-done steps) to `pos`.
 * The step grid is anchored at 0 and fixed, so warming 0→A and then A→B visits
 * exactly the same set of timestamps as warming 0→B in one go — incremental
 * warm-up is bit-identical to a cold one, not an approximation.
 */
function warmStep(app, pos, startMs, stopBeforeMs) {
  const endMs = positionToSeconds(pos) * 1000 + SETTLE_MS;
  const limit = stopBeforeMs === undefined ? endMs : Math.min(endMs, stopBeforeMs);
  for (let ms = startMs; ms <= limit; ms += WARM_STEP) {
    const p = Math.min(pos, secondsToPosition(ms / 1000));
    app.timeline.dispatchUpTo(p);
    const ctx = { d3d: app.d3d, position: p, ms, songMs: ms, rowFrac: 0 };
    for (const o of app.objects) if (o && o.tick) o.tick(ctx, false);
  }
  // Only fast-forward the event cursor when this warm-up really did reach
  // `pos`.  When it stops short (the flare burst replays the tail as real
  // frames), dispatching to `pos` here would fire every event of the skipped
  // span EARLY — the burst frames would render with text fades and camera
  // cuts already triggered.  Measured: text-only frames regressed 13 -> 29
  // RMSE until this was made conditional.
  if (limit >= endMs) app.timeline.dispatchUpTo(pos);
  return endMs;
}

// The RNG state right after boot, i.e. once every generator has run. A COLD
// warm must start from it: rendering consumes the shared stream (precipitation
// respawn, lens-droplet emission), so without this each cold render replays
// from wherever the previous one happened to leave the stream and produces a
// different rain field. Measured at 0x1c00: two consecutive cold renders gave
// `dropHead` 94 then 101 and different particle X/Z. `reset()` cannot fix it —
// it restores each object's own state, not the global stream they all draw on.
let RNG_AT_BOOT = null;

function warmTo(app, pos, stopBeforeMs) {
  if (RNG_AT_BOOT === null) RNG_AT_BOOT = MG.randState();
  MG.srand(RNG_AT_BOOT);
  seek(app.timeline, 0);                       // reset + init, cursor at the start
  for (const o of app.objects) if (o && o.reset) o.reset();
  app.timeline.reset();
  app.timeline.init();

  // Settle half a row past the boundary. Several script events land on the first row
  // of a pattern, and a frame taken exactly there would show alpha 0 for a line the
  // reference already has half-faded in.
  const endMs = warmStep(app, pos, 0, stopBeforeMs);
  warmState = { pos, endMs, lastSteppedMs: Math.floor(endMs / WARM_STEP) * WARM_STEP };
  return endMs;
}

// --------------------------------------------------------------- flare burst
// ?flareburst=N — render the last N frames FOR REAL before a capture.
//
// The warm-up ticks without device calls, so the lens flare's occlusion query
// cannot run: `updateOffline` documents its own assumption that the sun is
// VISIBLE whenever it is on screen.  The flare is an INTEGRATOR (`cur +=
// dt*rate` per rendered frame, ~40 frames of memory), so a warm-then-capture
// arrives with `cur` pinned at max and a single rendered frame can only decay
// it one step — the sun blazes in frames where the original's query had shut
// it.  Measured on the beach at 0x1400-0x1420: query says `visible:false,
// fraction:0` while `cur` is 791-798 of 800, and we are +30..46 luminance over
// the reference (re/scenes/FLARE.md tail; this was a KNOWN, undone fix).
//
// Rendering the tail of the warm-up for real lets the query run and the
// integrator settle honestly.  It costs N live frames (0.08-3.9 ms each), not
// N warm-ups, because the warm loop simply stops N steps early.
// DEFAULT 48 (0.8 s at the warm step, comfortably past the integrator's ~40
// frame memory).  Affects the CAPTURE path only — live playback renders every
// frame for real anyway.  `?flareburst=0` restores the old warm-only capture.
// Measured over the full 354-sample sweep: 5 beach samples -27..-29 each, 2
// autumn -13..-15, against 3 beach +6 and 2 autumn +2 where the now-honest
// query closes a sun the reference shows (a real difference the pinned-open
// flare had been hiding); net -155 RMSE, mean 27.29 -> 26.91.
const FLARE_BURST = (() => {
  // ⚠ `Number(null)` is 0, not NaN — reading an ABSENT param through Number()
  // and range-checking it silently yields 0 and defeats the default.  That is
  // exactly what happened here: the default read as 0, the burst never ran,
  // and a baseline was blessed without it.  Test for the param's presence.
  const raw = params.get('flareburst');
  if (raw === null) return 48;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 && v <= 240 ? Math.round(v) : 48;
})();

function warmToBurst(app, pos, burst) {
  if (!burst) return { endMs: warmTo(app, pos), burst: 0 };
  const endMs = positionToSeconds(pos) * 1000 + SETTLE_MS;
  // Warm with the tick loop stopping `burst` steps short, then replay those
  // steps as real renders so the last one lands exactly on `endMs`.
  warmTo(app, pos, endMs - burst * WARM_STEP);
  // Render the burst frames up to but NOT including `endMs` — the caller
  // renders that one.  Rendering it here too would draw the captured frame
  // TWICE, and a second draw is not free: alpha-blended content composites
  // over itself (the original's own loading screen relies on exactly that,
  // re/PRELOADER.md).  Measured when this was off by one: text-only frames,
  // which have no flare at all, regressed 7.2 -> 20.0 RMSE.
  for (let k = burst; k >= 2; k--) {
    const ms = endMs - (k - 1) * WARM_STEP;
    const p = Math.min(pos, secondsToPosition(ms / 1000));
    renderAt(app, p, ms);
    app.d3d.Present();
  }
  warmState = null;                    // the burst leaves no reusable warm state
  return { endMs, burst };
}

/**
 * Warm to `pos`, CONTINUING from the previous warm-up when the request is
 * forward of it. A dense ascending sweep (354 samples) otherwise replays the
 * whole script per sample — ~4.7 M object ticks in total where one linear pass
 * is ~27 k. Rewinds and cold starts fall back to a full `warmTo`.
 */
function warmToIncremental(app, pos) {
  if (!warmState || pos < warmState.pos) return warmTo(app, pos);
  if (pos === warmState.pos) return warmState.endMs;
  const endMs = warmStep(app, pos, warmState.lastSteppedMs + WARM_STEP);
  warmState = { pos, endMs, lastSteppedMs: Math.floor(endMs / WARM_STEP) * WARM_STEP };
  return endMs;
}

// --------------------------------------------------------------------------- run
// A BLACK SCREEN MUST NEVER BE THE ONLY SYMPTOM.
//
// Today the demo went black after precalc with no audio and no working keys, and
// there was nothing on screen to say why — the boot had thrown somewhere inside a
// promise and everything downstream simply never ran. Any failure from here on
// paints itself onto the page. WebGL context loss gets the same treatment: it is
// the most likely way an over-ambitious render scale or texture set kills a real
// GPU, and it is silent by default.
function fatal(what, err) {
  console.error('sonnet:', what, err);
  const d = document.createElement('div');
  d.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;' +
    'justify-content:center;padding:6vw;background:#12141a;color:#e2725b;z-index:999;' +
    'font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;' +
    'text-align:left;overflow:auto';
  d.textContent =
    `sonnet failed to start\n\n${what}\n\n${(err && (err.stack || err.message)) || err}\n\n` +
    `Try:  ?quality=original      the authentic path, none of the remaster wiring\n` +
    `      ?render=1              render at 640x480\n` +
    `      ?texscale=1            no texture upscaling\n` +
    `      ?assets=baked          download assets instead of generating them`;
  document.body.appendChild(d);
}
addEventListener('error', (e) => fatal('uncaught error', e.error || e.message));
addEventListener('unhandledrejection', (e) => fatal('unhandled rejection', e.reason));
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  fatal('the WebGL context was LOST — almost always GPU memory. Lower ?render / ?texscale.', 
        new Error('webglcontextlost'));
});

const assets = await loadAssets().catch(e => { fatal('loading assets', e); throw e; });

if (POS_PARAM !== null) {
  // -------- single-frame debug / capture path, no audio
  overlay.remove();
  const app = await boot(assets);
  const parsePos = (pos) => Math.min(END_POSITION, typeof pos === 'string'
    ? (pos.startsWith('0x') ? parseInt(pos, 16) : parseInt(pos, 10)) : (pos | 0));

  const renderWarmed = (p, ms, warmed) => {
    const t = ms === undefined ? warmed : ms;
    renderAt(app, p, t);
    app.d3d.Present();
    return { pos: p, ms: t, quads: app.objects[1].stats.quads };
  };

  // Always warms from cold. Deterministic and self-contained; use for one-off
  // captures and whenever a sample must not depend on what was rendered before.
  window.__sonnetRender = (pos, ms) => {
    const p = parsePos(pos);
    return renderWarmed(p, ms, warmToBurst(app, p, FLARE_BURST).endMs);
  };

  // Continues the previous warm-up when `pos` is forward of it (falls back to a
  // cold warm on a rewind). Turns a dense sweep from one full replay PER SAMPLE
  // into one replay in total.
  //
  // The step grid is fixed and anchored at 0, so the WARM-UP is bit-identical
  // either way. The catch, found by warm_equiv_test.mjs rather than assumed:
  // RENDERING also consumes the shared meshgen RNG (precipitation respawns and
  // friends), exactly as the original does — so a capture perturbs the stream
  // that later captures inherit, and one position in nine came out different.
  // Snapshot the stream around the capture's render so a sample cannot affect
  // its successors. This changes only the harness; the port's own behaviour and
  // its fidelity to the original are untouched.
  // ...and the RNG was only HALF the leak, which warm_equiv_test kept failing on
  // (2026-08-10). `#stepPrecip` runs INSIDE render(): it integrates every
  // particle's position and draws 3 randoms per respawn. Restoring the stream
  // leaves the mutated PARTICLE BUFFER behind, so the next incremental sample
  // starts from a rain field a frame further on than a cold warm would give it.
  // That is why the residual failures were exactly the six samples inside the
  // rain and snow windows — scenes 5 and 7 are the only two with `buildPrecip`.
  // Snapshot the particle state alongside the stream.
  const precipState = () => (app.objects || [])
    .filter((o) => o && o.precip && o.precip.mesh)
    .map((o) => ({ o, T: o.precip.T, verts: o.precip.mesh.verts.slice() }));
  const restorePrecip = (snap) => {
    for (const s of snap) { s.o.precip.T = s.T; s.o.precip.mesh.verts.set(s.verts); }
  };

  window.__sonnetRenderSeq = (pos, ms) => {
    const p = parsePos(pos);
    const warmed = warmToIncremental(app, p);
    const rngBefore = MG.randState();
    const precipBefore = precipState();
    const out = renderWarmed(p, ms, warmed);
    MG.srand(rngBefore);
    restorePrecip(precipBefore);
    return out;
  };
  const start = POS_PARAM.startsWith('0x') ? parseInt(POS_PARAM, 16) : parseInt(POS_PARAM, 10);
  const r = window.__sonnetRender(start);
  window.__sonnetClock = { pos: r.pos, songMs: r.ms, rowFrac: 0, static: true };
  window.__sonnetReady = true;
} else {
  overlay.textContent = 'click to start';
  overlay.addEventListener('click', async () => {
    overlay.remove();
    // The click is the gesture an AudioContext needs, and it is also where the
    // original's loading screen belongs: everything after this point is precalc,
    // watched by the progress cloud in preloader.js.
    // ⚠ THE AUDIOCONTEXT IS CREATED HERE, BEFORE ANY `await`, AND MUST STAY HERE.
    //
    // It used to be constructed after `await boot(...)` below. That await lasts
    // seconds, and by the time it resolves the click's TRANSIENT ACTIVATION has
    // expired -- so the context is born suspended and the `ac.resume()` further
    // down is rejected for want of a user gesture.
    //
    // The failure is vicious because it is silent and indirect: the video clock
    // is tagged off audio (see BUFFER TAGGING below), so frames pick "the newest
    // tag that has already been heard". A suspended context never advances
    // `currentTime`, no tag is ever heard, and the intro renders position 0
    // forever. Reported on Safari 2026-08-10 as "after the precalc it goes
    // black, no audio" -- i.e. a black screen, which looks nothing like an audio
    // bug and sent the diagnosis chasing the renderer and the preloader.
    //
    // It only showed with `?lighting=fixed` because the shadow bake pushes boot
    // past the activation deadline; Chrome's activation is stickier and hid it
    // entirely. Any future work that slows boot down would re-trigger it, so the
    // ordering -- not the boot duration -- is the fix.
    const ac = new AudioContext();
    ac.resume();                       // inside the gesture; do NOT await here

    const app = await boot(assets, { wantAudio: true });
    const player = new XmPlayer(app.xm, ac.sampleRate);

    // ---- BUFFER TAGGING.
    //
    // player.position / player.row describe what has been rendered INTO the audio
    // buffer, which is ~85 ms ahead of what is audible, and they jump in bursts at
    // callback boundaries. Re-anchoring a clock on each change produced a visible
    // ~8 Hz stagger on the sibling restoration. So: render the module in small
    // slices and tag each with the AudioContext time it will actually sound at.
    // Each video frame then picks the newest tag that has already been heard.
    //
    // Deriving the row from elapsed time instead does NOT work: the song has
    // pattern breaks and rows-elapsed desyncs within seconds.
    const CHUNK = 1024;
    const tags = [];
    const node = ac.createScriptProcessor(4096, 0, 2);
    node.onaudioprocess = (e) => {
      const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
      const n = e.outputBuffer.length;
      const base = (typeof e.playbackTime === 'number' && e.playbackTime > 0)
        ? e.playbackTime : ac.currentTime;
      for (let off = 0; off < n; off += CHUNK) {
        const len = Math.min(CHUNK, n - off);
        const pos = (((player.position & 0xff) << 8) | (player.row & 0xff)) & 0xffff;
        if (!tags.length || tags[tags.length - 1].pos !== pos)
          tags.push({ t: base + off / ac.sampleRate, pos });
        player.render(L.subarray(off, off + len), R.subarray(off, off + len), len);
      }
    };
    node.connect(ac.destination);
    await ac.resume();

    // ---- the clock. ac.currentTime only steps once per 128-frame quantum, so use
    // it as the authority and interpolate with wall time between steps; that gives
    // animation a CONTINUOUS millisecond clock instead of one that ticks at 375 Hz.
    const startT = ac.currentTime;
    const ROW_SECONDS = 6 * 2.5 / 92;
    let lastAc = -1, lastAcWall = 0, curPos = 0, curPosT = null, frames = 0, fpsT = 0, fps = 0;

    const frame = () => {
      const acNow = ac.currentTime, wall = performance.now();
      if (acNow !== lastAc) { lastAc = acNow; lastAcWall = wall; }
      const songMs = Math.max(0, (acNow - startT) * 1000 + (wall - lastAcWall));

      let i = 0;
      while (i + 1 < tags.length && tags[i + 1].t <= acNow) i++;
      if (tags.length && tags[i].t <= acNow) {
        curPos = tags[i].pos; curPosT = tags[i].t; if (i > 0) tags.splice(0, i);
      }
      // rowFrac: how far through the current row we are. Span it against the NEXT
      // queued tag rather than a nominal row length, so the last few per cent of
      // every row does not saturate and hitch eight times a second.
      const nextT = (tags.length > 1 && tags[1].t > curPosT) ? tags[1].t : null;
      const span = nextT !== null ? (nextT - curPosT) : ROW_SECONDS;
      const rowFrac = curPosT === null ? 0
        : Math.min(1, Math.max(0, (acNow - curPosT) / span));

      window.__sonnetClock = {
        songMs, pos: curPos, rowFrac, acTime: acNow - startT, tags: tags.length, fps,
      };
      renderAt(app, curPos, songMs, rowFrac);

      frames++;
      if (DEBUG && wall - fpsT > 500) {
        fps = Math.round(frames * 1000 / (wall - fpsT)); frames = 0; fpsT = wall;
        stats.textContent =
          `pos 0x${curPos.toString(16).padStart(4, '0')}  ` +
          `${(songMs / 1000).toFixed(1)}s  rowFrac ${rowFrac.toFixed(2)}  ` +
          `${fps} fps  quads ${app.objects[1].stats.quads}`;
      }

      if (curPos >= END_POSITION) { node.disconnect(); ac.close(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    // ?start=0xNNNN | ?start=beach — boot straight into a scene rather than
    // watching 7:41 of timeline to reach it.
    // ---------------------------------------------------------------- SCENE JUMP
    // The demo is 7:41 and precalc is not free, so waiting out the timeline to look
    // at one scene is not a workflow. Jump the LIVE playback instead: move the
    // player's order/row, clear the tag queue, and re-warm the scene objects.
    //
    // Warming is the slow part and it is NOT optional — scene objects integrate
    // state out of the events they receive (the terrain ramp, particle ages, text
    // fades), and several of them accumulate PER FRAME rather than per unit time,
    // so a coarser catch-up step would render a different picture rather than the
    // same one sooner (re/scenes/SPIRE_REOPEN.md). We eat the cost and show it.
    let jumping = false;
    async function jumpTo(pos, label) {
      if (jumping) return;
      jumping = true;
      pos = Math.max(0, Math.min(END_POSITION, pos | 0));
      const hex = '0x' + pos.toString(16).padStart(4, '0');
      const note = document.createElement('div');
      note.style.cssText = 'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);' +
        'font:14px ui-monospace,monospace;color:#7fd7a7;background:#000c;padding:10px 16px;' +
        'border:1px solid #2b3040;border-radius:4px;z-index:99;white-space:pre;';
      note.textContent = `warming to ${hex}${label ? '  —  ' + label : ''}…`;
      document.body.appendChild(note);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

      const t0 = performance.now();
      // Move the module. `position` is the order-table index, `row` the row in it.
      player.position = (pos >> 8) & 0xff;
      player.row = pos & 0xff;
      // Re-warm the scene graph so accumulated state matches the new position.
      warmTo(app, pos);
      // Drop stale tags and re-anchor, or the clock would drag us back.
      tags.length = 0;
      tags.push({ t: ac.currentTime, pos });
      curPos = pos; curPosT = ac.currentTime;
      const ms = Math.round(performance.now() - t0);

      note.textContent = `${hex}${label ? '  —  ' + label : ''}   warmed in ${ms} ms`;
      setTimeout(() => note.remove(), 900);
      jumping = false;
      return ms;
    }
    window.__sonnetJump = jumpTo;
    // Hand the key handler (registered at load, below) a live target and a way to
    // read the current position for relative steps.
    liveJump = jumpTo;
    livePos = () => curPos;

    const startParam = params.get('start');
    if (startParam) {
      const byName = SCENES.find(x => x[2].toLowerCase().includes(startParam.toLowerCase()));
      const pos = byName ? byName[1]
        : (startParam.startsWith('0x') ? parseInt(startParam, 16) : parseInt(startParam, 10));
      if (Number.isFinite(pos)) jumpTo(pos, byName ? byName[2] : null);
    }

    if (DEBUG) {
      console.info('scene jump: 1-9,0 = scenes, [ ] = ±1 order, , . = ±8 rows, ' +
                   'or window.__sonnetJump(0x1200)');
    }
  }, { once: true });
}
