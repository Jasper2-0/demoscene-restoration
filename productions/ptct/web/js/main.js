// Please the Cookie Thing — web restoration. Boot + frame loop.
// Faithful structure: main loop = timeline tick + render active effects by
// layer + frame flip (see work/re/engine/FUNCTION_MAP.md for the original).
//
// Debug/verification mode: open with ?debug — no audio; drive time via
// window.__ptctSeek(tSeconds) (renders exactly one frame), or ?t=SECONDS to
// boot paused at that time. Timeline state is rebuilt from 0 on every seek so
// layer clocks and one-shot triggers behave as if played through.

import { MiniGL } from './minigl.js';
import { parseScript, Timeline, OP_SHOW, OP_SHOW2 } from './timeline.js';
import { SyncMap } from './sync.js';
import { Renderer } from './scene.js';
import { buildRegistry } from './effects/registry.js';
import { LoadingScreen, loadAssetsTracked } from './loader.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const params = new URLSearchParams(location.search);
// ?inspect=1 installs the production-agnostic tooling adapter (window.__demo,
// tools/inspect/ADAPTER.md). It joins the existing debug path, which already
// loads no audio, builds no click gate and runs no rAF loop.
const INSPECT = params.has('inspect');
const DEBUG = params.has('debug') || params.has('t') || INSPECT;

async function loadAssets() {
  const [scriptBuf, syncJson] = await Promise.all([
    fetch('assets/script.as1').then((r) => r.arrayBuffer()),
    fetch('assets/sync_map.json').then((r) => r.json()),
  ]);
  const texNames = ['31', '13', 'gizmozone2', 'snq_steen2', '28', '18', '29',
    'cr_ile', 'cr_rob', 'cr_inopia', 'cr_oyise', 'cr_snq', 'cr_cs', 'lucht', 'ptct'];
  const loadImg = (src) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
  const images = await Promise.all(texNames.map((n) => loadImg(`assets/textures/${n}.png`)));
  // optional 4x supersampled remaster set (?quality=original disables);
  // missing files fall back to the bit-exact 1x bake per texture
  let imagesHi = null;
  if (params.get('quality') !== 'original') {
    imagesHi = await Promise.all(texNames.map((n) =>
      loadImg(`assets/textures4x/${n}.png`).catch(() => null)));
    if (imagesHi.every((x) => x === null)) imagesHi = null;
  }
  const audio = DEBUG ? null : new Audio('assets/world_of_noise.m4a');
  if (audio) audio.preload = 'auto';
  // tess: geometry supersampling multiplier for analytic surfaces
  // (?quality=original => 1; effects decide where it can apply safely)
  const tess = params.get('quality') === 'original' ? 1
    : parseInt(params.get('tess') || '4', 10);
  return { scriptBuf, syncJson, texNames, images, imagesHi, audio, tess };
}

// Presentation: the engine renders a 4:3 frame whose top/bottom 1/12ths are
// scissored black — the picture was always a 16:10 band inside a 4:3 screen.
// wide (default): crop those baked bars via the overflow container so the
//   band itself fills a 16:10 area (nearly filling today's 16:9 displays).
// ?aspect=classic: the whole 4:3 frame, bars and all, like a 2000 monitor.
const frame = document.getElementById('frame');
const CLASSIC = params.get('aspect') === 'classic';
function fit() {
  if (CLASSIC) {
    const w = Math.min(window.innerWidth, (window.innerHeight * 4) / 3);
    frame.style.width = `${w}px`;
    frame.style.height = `${(w * 3) / 4}px`;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${(w * 3) / 4}px`;
    canvas.style.top = '0';
  } else {
    // visible band aspect = (4/3) / (5/6) = 1.6
    const w = Math.min(window.innerWidth, window.innerHeight * 1.6);
    const h = w / 1.6;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    // canvas 4:3 display = w x 0.75w; band = 5/6 of that = h; crop 1/12 top
    canvas.style.width = `${w}px`;
    canvas.style.height = `${w * 0.75}px`;
    canvas.style.top = `${-w * 0.75 / 12}px`;
  }
}
window.addEventListener('resize', fit);
fit();

const texNames = ['31', '13', 'gizmozone2', 'snq_steen2', '28', '18', '29',
  'cr_ile', 'cr_rob', 'cr_inopia', 'cr_oyise', 'cr_snq', 'cr_cs', 'lucht', 'ptct'];

// One GL context for the whole lifetime: loading screen first, then Renderer.
const mgl = DEBUG ? null : new MiniGL(canvas);

async function loadWithScreen() {
  // reconstructed original loading screen (ring of 25 slabs), driven by
  // real download progress, then the original's 2.5 s fly-out beat
  overlay.remove();
  const screen = new LoadingScreen(mgl, canvas);
  let p = 0, done = false;
  const anim = () => { screen.render(p); if (!done) requestAnimationFrame(anim); };
  requestAnimationFrame(anim);

  const wantHi = params.get('quality') !== 'original';
  const a = await loadAssetsTracked(texNames, wantHi, (frac) => { p = frac; });
  a.texNames = texNames;
  a.tess = params.get('quality') === 'original' ? 1
    : parseInt(params.get('tess') || '4', 10);

  // fly-out: p = 1 + ticks*0.0005 for 10000 ticks (FUN_00403620 wait loop)
  const t0 = performance.now();
  await new Promise((resolve) => {
    const fly = () => {
      const ticks = (performance.now() - t0) * 4;
      p = 1 + ticks * 0.0005;
      if (ticks >= 10000) { done = true; resolve(); } else requestAnimationFrame(fly);
    };
    requestAnimationFrame(fly);
  });
  return a;
}

const assets = DEBUG ? await loadAssets() : await loadWithScreen();

function boot() {
  const bootMgl = mgl || new MiniGL(canvas);
  const R = new Renderer(bootMgl, assets);
  const registry = buildRegistry(R);
  const sync = new SyncMap(assets.syncJson);
  // init all effects up front (original inits during the loading screen)
  for (const eff of registry.values()) if (eff.init) eff.init();
  return { R, registry, sync };
}

function renderAt(ctx, timeline, t) {
  const { order, row } = ctx.sync.pos(t);
  const ticks = t * 4000; // 1 tick = 0.25 ms
  const list = timeline.tick(ticks, order, row);
  ctx.R.beginFrame();
  for (const d of list) d.effect.render(d.elapsed, { order, row, ticks });
  ctx.R.endFrame();
  return { order, row, active: list.length };
}

if (DEBUG) {
  overlay.remove();
  const ctx = boot();
  // Seek = replay the timeline from 0 at row granularity so layer-clock
  // survival and TRIG/TRESET one-shots are in the played-through state.
  window.__ptctSeek = (t) => {
    // CLEAR PER-PLAYTHROUGH EFFECT STATE FIRST. Re-parsing the script resets
    // ev.dead and the layer clocks, but the effect OBJECTS are built once in
    // boot() and shared across every seek, so anything they latch survives —
    // eff3c's flash[] is cleared only when a slot's age expires, so a slot set
    // by one seek's replay leaks into the next.
    //
    // Deliberately NOT rebuilding the registry: rand31's seed is module-global
    // (js/scene.js) and consumed at init in a fixed cross-effect order, and
    // eff3c.init starts an async image load, so a rebuild per seek would
    // re-consume the stream and re-upload textures on every sample. reset() is
    // the right seam — it clears playthrough state and nothing generated.
    for (const eff of ctx.registry.values()) eff.reset?.();
    const timeline = new Timeline(parseScript(assets.scriptBuf), ctx.registry);
    for (const [rt, o, r] of ctx.sync.rows) {
      if (rt >= t) break;
      timeline.tick(rt * 4000, o, r);
    }
    return renderAt(ctx, timeline, t);
  };
  const t0 = parseFloat(params.get('t') || '0');
  // Per-playthrough state of every effect that exposes it. The determinism test
  // asserts on THIS as well as on pixels, because a latch can be real and
  // invisible: eff3c's stale flash slots read as expired and change nothing on
  // screen, so a pixel-only test was vacuous.
  window.__ptctProbe = () => {
    const out = {};
    for (const [id, eff] of ctx.registry) { const p = eff.probe?.(); if (p) out[id] = p; }
    return out;
  };
  // ---- INSPECTOR ADAPTER (tools/inspect/ADAPTER.md).
  //
  // ptct's parts are the script's SHOW spans, and they are LAYERED — several
  // effects are on screen at once — so a per-part score means "the whole frame
  // while this effect was shown", and state() reports the layer it sat on.
  //
  // Spans are in MUSIC POSITION (order, row) and the schedule is in seconds, so
  // SyncMap.secondsAt bridges them. Same shape as sonnet's positionToSeconds:
  // a third production whose native coordinate is musical rather than temporal.
  const SHOWS = parseScript(assets.scriptBuf)
    .filter((ev) => ev.opcode === OP_SHOW || ev.opcode === OP_SHOW2)
    .map((ev) => {
      const start = ctx.sync.secondsAt(ev.startOrder, ev.startRow);
      return { id: ev.effectId, layer: ev.layer, start,
               dur: Math.max(0.1, ctx.sync.secondsAt(ev.b4, ev.b5) - start) };
    })
    .sort((a, b) => a.start - b.start);
  // Names are effect ids in hex, matching the source filenames (eff0a, eff12,
  // ...) so a finding points straight at a module. An id shown more than once
  // gets an index rather than a duplicate name.
  {
    const seen = new Map();
    for (const sh of SHOWS) {
      const base = 'eff' + sh.id.toString(16).padStart(2, '0');
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      sh.name = n > 1 ? `${base}_${n}` : base;
    }
  }
  // Comparison offset from prod.json rather than a constant, so a re-measured
  // alignment needs no code change.
  let CAP_OFFSET = 0;
  try {
    const pj = await (await fetch(new URL('../../prod.json', import.meta.url))).json();
    CAP_OFFSET = (pj.captures?.[0]?.alignmentOffsetMs ?? 0) / 1000;
  } catch { /* no manifest reachable: schedule works, scores will not align */ }

  let lastState = null;
  window.__demo = {
    id: 'ptct',
    schedule: () => SHOWS.map((sh) => ({
      name: sh.name, phase: 1, start: sh.start, dur: sh.dur,
      captureStart: sh.start + CAP_OFFSET,
    })),
    // plan() intentionally omitted — tools/inspect/plan.mjs owns the grid.
    async render({ part, local }) {
      const sh = SHOWS.find((x) => x.name === part);
      if (!sh) return null;
      const info = window.__ptctSeek(sh.start + local);
      lastState = { ...info, part, local, layer: sh.layer,
                    effectId: '0x' + sh.id.toString(16) };
      return lastState;
    },
    state: () => lastState,
    assets: () => null,
    /** Musical coordinate — ptct thinks in order/row, like sonnet. */
    positionAt(showTime) {
      const p = ctx.sync.pos(Math.max(0, showTime - CAP_OFFSET));
      return `order ${p.order} row ${p.row}`;
    },
  };
  window.__demoReady = true;

  // KNOWN LIMITATION, do not read sweep scores for ptct as fidelity yet. The
  // contract assumes the canvas IS the frame. ptct's is not: it sizes to the
  // viewport (960x960 square under the harness) and letterboxes the image
  // inside it, so downscaling to the comparison's 640x480 squeezes our content
  // against a full-frame reference. A first sweep scored median r 0.1405 while
  // the frames plainly show the same scene at the same moment — the geometry,
  // not the port. ?aspect=classic reaches the page but does not resolve it.
  //
  // Fixing it means either giving the page a 4:3 viewport whose canvas matches
  // the capture, or teaching the comparison layer to crop to the drawn band.
  // The second is the more general answer and belongs in tools/inspect.
  window.__ptctReady = true;
  // In inspect mode the tooling drives every frame; do not render one up front.
  if (!INSPECT) window.__ptctSeek(t0);
} else {
  // the preloader removed the original overlay; re-create the click gate
  // (browser autoplay policy needs a gesture before audio can start)
  const gate = document.createElement('div');
  gate.id = 'overlay';
  gate.style.background = 'transparent';
  gate.textContent = 'click to please the cookie thing';
  document.body.appendChild(gate);
  const overlay = gate;
  // Sync lead: the original's position tag led the audible audio by one row
  // (~112 ms; row counter post-increments before block tagging — see
  // work/re/engine/SYNC.md), plus mix pre-roll and the browser/device audio
  // output latency. Default 0.4485 s was locked against the 10:00 transition
  // waveform with calibrate.html; tune live with ArrowUp/ArrowDown (25 ms
  // steps) or override with ?lead=SECONDS for other output devices.
  let lead = parseFloat(params.get('lead') ?? '0.4485');
  if (!Number.isFinite(lead)) lead = 0.2;
  console.log(`[ptct] sync lead active: ${(lead * 1000).toFixed(1)} ms` +
    (params.has('lead') ? ' (from ?lead=)' : ' (default)'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') lead += 0.025;
    else if (e.key === 'ArrowDown') lead -= 0.025;
    else return;
    console.log(`sync lead: ${(lead * 1000).toFixed(0)} ms`);
  });

  overlay.addEventListener('click', async () => {
    overlay.remove();
    const ctx = boot();
    const timeline = new Timeline(parseScript(assets.scriptBuf), ctx.registry);
    await assets.audio.play();

    let wrapped = false;
    const frame = () => {
      const t = assets.audio.currentTime + lead;
      const { order } = ctx.sync.pos(t);
      // original exit: once order>=0x20 seen, order<10 => quit
      if (order >= 0x20) wrapped = true;
      if ((wrapped && order < 10) || assets.audio.ended || timeline.quit) {
        ctx.R.blackout();
        return;
      }
      renderAt(ctx, timeline, t);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, { once: true });
}
