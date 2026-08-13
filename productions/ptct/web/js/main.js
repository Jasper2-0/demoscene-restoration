// Please the Cookie Thing — web restoration. Boot + frame loop.
// Faithful structure: main loop = timeline tick + render active effects by
// layer + frame flip (see work/re/engine/FUNCTION_MAP.md for the original).
//
// Debug/verification mode: open with ?debug — no audio; drive time via
// window.__ptctSeek(tSeconds) (renders exactly one frame), or ?t=SECONDS to
// boot paused at that time. Timeline state is rebuilt from 0 on every seek so
// layer clocks and one-shot triggers behave as if played through.

import { MiniGL } from './minigl.js';
import { parseScript, Timeline } from './timeline.js';
import { SyncMap } from './sync.js';
import { Renderer } from './scene.js';
import { buildRegistry } from './effects/registry.js';
import { LoadingScreen, loadAssetsTracked } from './loader.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug') || params.has('t');

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
    const timeline = new Timeline(parseScript(assets.scriptBuf), ctx.registry);
    for (const [rt, o, r] of ctx.sync.rows) {
      if (rt >= t) break;
      timeline.tick(rt * 4000, o, r);
    }
    return renderAt(ctx, timeline, t);
  };
  const t0 = parseFloat(params.get('t') || '0');
  window.__ptctReady = true;
  window.__ptctSeek(t0);
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
