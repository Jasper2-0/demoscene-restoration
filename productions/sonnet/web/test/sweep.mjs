// sweep.mjs — the whole-timeline verification sweep.
//
// Individual scenes have been spot-checked at a handful of positions each. This
// measures the port AS A WHOLE: it walks the entire runtime at a fixed row
// interval, renders our frame, pulls the matching reference frame, scores them,
// and writes a contact sheet plus a machine-readable results.json so that
// re-running it later detects regressions.
//
//   node web/test/sweep.mjs                    # the default 8-row sweep
//   node web/test/sweep.mjs --step=32          # coarser / faster
//   node web/test/sweep.mjs --positions=0x1630,0x1a00
//   node web/test/sweep.mjs --profile          # the cost breakdown only
//   node web/test/sweep.mjs --quality=remaster # default is `original`
//   node web/test/sweep.mjs --lighting=fixed   # shadow bake + D3D normals
//
// Output goes to work/verify/ :
//   results.json       every sample, every metric, plus the run's provenance
//   sheet_NN.png       contact sheets, ours ABOVE the original
//   worst.png          the twelve worst samples at readable size
//   timeline.png       RMSE against music position, with the scene boundaries
//   pair_0xNNNN.png    full-size ours/reference pairs for the worst samples
//
// ⚠ `pair_*.png` IS WRITTEN FOR THE WORST 6 SAMPLES ONLY, SO MOST OF THEM ARE
//   STALE. The directory accumulates pairs from every run ever made, and a
//   position that used to be in the worst 6 keeps its OLD image — with its old
//   RMSE burned into the header, which makes it look current. On 2026-08-11
//   this cost a wrong diagnosis: `pair_0x0c00.png` was six days old and showed a
//   long-fixed canopy defect at RMSE 69, while the build in front of me scored
//   22.8 there. **Before reading any `pair_*.png`, check its mtime against the
//   run you care about, or re-render that exact position with
//   `--positions=0x0c00 --tag=something`, which always writes a fresh pair.**
//   `frames/ours{TAG}_*.png` IS written for every sample every run and is safe;
//   `frames/ref_*.png` is cached across runs but the reference video never
//   changes, so it is also safe.
//
// THINGS THIS HARNESS GETS RIGHT AND THAT COST THE SIBLING PROJECT TIME
//
//  1. WARM UP BEFORE EVERY CAPTURE. Scene objects integrate state out of the
//     events they receive, so cold-jumping to a position leaves fades, camera
//     times and particle ages at zero. main.js's `__sonnetRender` already does
//     this (it calls `warmTo`, which replays the script through timeline.js's
//     `seek` and steps every object at 60 Hz), so this file must simply not
//     bypass it. Never call renderAt directly.
//
//  2. THE CANVAS IS `preserveDrawingBuffer: false`. Screenshotting the element
//     in a later task is a RACE: the drawing buffer may already have been
//     cleared by compositing, and you get a black or stale frame with no error.
//     Observed here, intermittently, producing RMSE 136 where the truth was 26.
//     So render AND read the pixels back in ONE page.evaluate, via toDataURL.
//     (test/capture.mjs still uses the racy `setTimeout(40)` + element
//     screenshot form — see verify/SWEEP.md.)
//
//  3. The reference video LEADS music position 0 by 2.43 s, and main.js settles
//     half a row past the event boundary. Both are applied below.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const WORK = path.join(WEB, '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const { createCanvas, loadImage } = require('canvas');

const { positionToSeconds, END_POSITION, SCENE_BANDS, sceneAt } = await import(path.join(WEB, 'js/timeline.js'));

const REF = path.join(WORK, 'work/reference/sonnet_ref.mkv');
const OUT = path.join(WORK, 'work/verify');
const FRAMES = path.join(OUT, 'frames');
fs.mkdirSync(FRAMES, { recursive: true });

/** Measured and corroborated 16x: video time = music seconds + this. */
export const REF_OFFSET = 2.43;
/** main.js's SETTLE_MS, in seconds. Must stay in step with it. */
const SETTLE = (6 * 2.5 / 92) / 2;
const W = 640, H = 480;

// --------------------------------------------------------------------- args
const argv = process.argv.slice(2);
const opt = (k, d) => {
  const a = argv.find(s => s.startsWith(`--${k}=`));
  return a === undefined ? d : a.slice(k.length + 3);
};
const STEP_ROWS = parseInt(opt('step', '8'), 10);
const QUALITY = opt('quality', 'original');
const PROFILE_ONLY = argv.includes('--profile');
const NO_FLARE = argv.includes('--no-flare');
const KEEP = argv.includes('--keep-frames');
/** Suffix for every output name, so an A/B run (e.g. --no-flare) does not
 *  overwrite the reference run's results.json and sheets. */
const TAG = opt('tag', '') ? '_' + opt('tag', '') : '';

/** Music positions are (order << 8) | row with row in 0..63 — walk ROWS. */
const LAST_ROW = (END_POSITION >> 8) * 64 + (END_POSITION & 0xff);
const rowToPos = (r) => ((Math.floor(r / 64) & 0xff) << 8) | (r % 64);
let POSITIONS;
const askedPositions = opt('positions', null);
if (askedPositions) {
  POSITIONS = askedPositions.split(',').map(s => s.trim())
    .map(s => s.startsWith('0x') ? parseInt(s, 16) : parseInt(s, 10));
} else {
  POSITIONS = [];
  for (let r = 0; r <= LAST_ROW; r += STEP_ROWS) POSITIONS.push(rowToPos(r));
}
const hexOf = (p) => '0x' + p.toString(16).padStart(4, '0');

// Scene attribution comes from the PAGE now (js/timeline.js), so the sweep and
// the inspector adapter cannot disagree about where a scene starts.
const SCENES = SCENE_BANDS;

// --------------------------------------------------------------- static server
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.xm': 'application/octet-stream',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const data = fs.readFileSync(path.join(WORK, rel));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

// ------------------------------------------------- reference frames, in parallel
/**
 * One accurate seek per sample. `-ss` before `-i` is ffmpeg's fast-but-accurate
 * seek; the frame chosen is the first at or after the timestamp, and the video is
 * 30 fps, so the worst-case timing error is 33 ms — an order of magnitude below
 * the 2.43 s offset's own uncertainty.
 */
function extractRefAt(t, out) {
  if (fs.existsSync(out)) return Promise.resolve(out);
  return new Promise((res, rej) => {
    execFile('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', REF,
      '-frames:v', '1', '-vf', `scale=${W}:${H}`, out, '-y'],
    (e) => e ? rej(e) : res(out));
  });
}

function extractRef(pos) {
  const t = positionToSeconds(pos) + REF_OFFSET + SETTLE;
  return extractRefAt(t, path.join(FRAMES, `ref_${hexOf(pos)}.png`));
}

// --------------------------------------------------------------- refDrift
// The capture's VIDEO drifts locally against the audio it was aligned by
// (proven at scene 1's end: text reveal + camera + water all match best at
// the same -3 rows; FIXLOOP_LOG #3).  For samples with meaningful error,
// also score our frame against reference frames at +-row TIME offsets and
// report where in the video this moment actually lives.  The BASE metric is
// untouched — history stays comparable; refDrift/driftRmse are extra columns
// that let a reader separate port error from capture drift.  Positive
// refDrift = the video shows this music position LATE (dropped frames).
//
// Known asymmetry: near a luminance ramp (a fade), the shifted ref frames
// change brightness as well as geometry, so driftRmse UNDERSTATES the
// recovery there (0x0930: ours-side bowl recovers 21 RMSE, ref-side only 3.4
// because +rows walks into the fade).  Read refDrift's SIGN and presence as
// the signal; the magnitude of the recovery is a lower bound.
// Window widened 2026-08-12 (was -2..+4): scene 2's investigation showed a
// candidate ~1 s (≈6 row) offset, which the original window could not have
// seen.  It was refuted there, but the lesson stands — a search window must
// cover the phenomenon you are willing to conclude does not exist.
const DRIFT_DELTAS = [-4, -3, -2, -1, 1, 2, 3, 4, 5, 6];
const ROW_S = positionToSeconds(8) / 8;
async function refDrift(pos, oursPix, baseRmse) {
  let best = { d: 0, rmse: baseRmse };
  for (const d of DRIFT_DELTAS) {
    const t = positionToSeconds(pos) + REF_OFFSET + SETTLE + d * ROW_S;
    if (t < 0) continue;
    const out = path.join(FRAMES, `refd_${hexOf(pos)}_${d}.png`);
    try {
      await extractRefAt(t, out);
      const { rmse } = comparePixels(oursPix, await pix(out));
      if (rmse < best.rmse) best = { d, rmse };
    } catch { /* extraction failure: skip this delta */ }
  }
  return best;
}

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    for (;;) {
      const k = i++;
      if (k >= items.length) return;
      out[k] = await fn(items[k], k);
    }
  }));
  return out;
}

if (!PROFILE_ONLY) {
  process.stdout.write(`extracting ${POSITIONS.length} reference frames … `);
  await pool(POSITIONS, 8, extractRef);
  console.log('done');
}

// ------------------------------------------------------------------- the browser
// A full 354-sample sweep has always been able to die partway with a
// puppeteer `TargetCloseError` / `detached Frame` after a few hundred cold
// warm-ups (cumulative renderer memory — documented as "budget for one
// retry").  That was a human-retry problem; the pipeline runs unattended, so
// the browser is now RELAUNCHABLE and a crashed sample is retried on a fresh
// renderer.  It is not a correctness compromise: every sample is still a cold
// warm-up from a freshly booted page, which is exactly what a relaunch gives.
const LAUNCH = {
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
  // The default 180 s protocol deadline is measured per CDP call, and a capture
  // with the flare burst is one call that warms the whole script AND renders 48
  // real frames. Give it room rather than let a slow sample read as a crash.
  protocolTimeout: 600000,
};
let browser = await puppeteer.launch(LAUNCH);
let page;
const pageErrors = [];
async function newPage() {
  page = await browser.newPage();
  await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 1 });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push('[console] ' + m.text()); });
}
await newPage();
/** True for the transient renderer deaths, not for real page bugs. */
// Includes puppeteer's TIMEOUT flavour of ProtocolError ("… timed out"),
// which the first version missed: the flare burst makes every capture call do
// 48 extra real renders, so a slow late-scene sample can exceed the protocol
// deadline and surface as a ProtocolError whose message says "timed out"
// rather than "Target closed".
const isBrowserCrash = (e) => {
  const m = String((e && e.message) || e);
  return /detached Frame|Target closed|Session closed|Protocol error|Connection closed|timed out|ProtocolError/i.test(m)
    || (e && e.constructor && e.constructor.name === 'ProtocolError');
};
let relaunches = 0;
async function relaunchBrowser() {
  relaunches++;
  console.log(`\n  ! renderer died — relaunching browser (${relaunches})`);
  try { await browser.close(); } catch { /* already gone */ }
  browser = await puppeteer.launch(LAUNCH);
  await newPage();
}

/**
 * Boot, then ASSERT the scenes actually built. main.js swallows a scenes.js
 * failure in a try/catch and renders text-only, which scores a plausible-looking
 * RMSE instead of failing — a whole sweep can be silently worthless. Observed
 * intermittently (a texgen parse error during the concurrent build), so retry.
 */
// Extra query params applied to EVERY boot, so an A/B of a runtime switch is a
// flag on the sweep rather than an edit to the port.
const LIGHTING_ARG = (process.argv.find((a) => a.startsWith('--lighting=')) || '')
  .replace('--lighting=', '');
// pass the value THROUGH — hard-coding only the 'fixed' case silently ignored
// `--lighting=legacy` once 'fixed' became the default, so an A/B compared the
// default against itself.
// --warmstep=F — the capture-machine frame-rate probe (see main.js WARM_FPS).
// Pass-through like --lighting; never for baselines.
const WARMSTEP_ARG = (process.argv.find((a) => a.startsWith('--warmstep=')) || '')
  .replace('--warmstep=', '');
// --flareburst=N — render the last N frames for real before each capture so
// the flare's occlusion integrator is in its true state (main.js FLARE_BURST).
const FLAREBURST_ARG = (process.argv.find((a) => a.startsWith('--flareburst=')) || '')
  .replace('--flareburst=', '');
const EXTRA_PARAMS = (LIGHTING_ARG ? `&lighting=${LIGHTING_ARG}` : '')
  + (WARMSTEP_ARG ? `&warmstep=${WARMSTEP_ARG}` : '')
  + (FLAREBURST_ARG ? `&flareburst=${FLAREBURST_ARG}` : '');

// The warm store (js/warmstore.js) makes the three boots ~15x cheaper and is
// equivalence-guarded by generate_test.mjs. `--cold` forces every boot to
// generate live — REQUIRED for a blessed baseline (run-verify.sh --bless), and
// the summary records which mode produced the numbers.
const COLD = argv.includes('--cold');
if (!COLD) {
  try {
    const { ensureWarmStore } = await import('./warmstore_node.mjs');
    await ensureWarmStore(`quality=${QUALITY}${EXTRA_PARAMS}`);
  } catch (e) {
    console.log(`  warmstore unavailable (${e.message}) — boots will run cold`);
  }
}

async function boot(extra = '') {
  extra += EXTRA_PARAMS + (COLD ? '&warm=0' : '');
  for (let attempt = 1; attempt <= 4; attempt++) {
    pageErrors.length = 0;
    await page.goto(`http://127.0.0.1:${PORT}/web/index.html` +
      `?pos=0x1630&quality=${QUALITY}${NO_FLARE ? '&flare=0' : ''}${extra}`,
    { waitUntil: 'networkidle0' });
    try {
      await page.waitForFunction('window.__sonnetReady === true', { timeout: 120000 });
      const ok = await page.evaluate(async () => {
        const c = document.getElementById('screen');
        const gl = c.getContext('webgl2');
        let scenes = false, buildError = null;
        try {
          if (globalThis.__scenesReady) { await globalThis.__scenesReady; scenes = true; }
        } catch (e) { buildError = String((e && e.message) || e); }
        return {
          scenes, buildError, glError: gl.getError(), w: c.width,
          flare: globalThis.__sonnetFlare ? Object.keys(globalThis.__sonnetFlare).length : 0,
          warm: globalThis.__sonnetTimings ? globalThis.__sonnetTimings.warm : undefined,
        };
      });
      if (ok.scenes && ok.glError === 0) return ok;
      console.log(`  boot attempt ${attempt}: scenes=${ok.scenes} glError=${ok.glError}` +
        (ok.buildError ? ` — ${ok.buildError}` : '') +
        (pageErrors.length ? ` — ${pageErrors[0]}` : ''));
    } catch (e) {
      console.log(`  boot attempt ${attempt} timed out` +
        (pageErrors.length ? ` — ${pageErrors[0]}` : ''));
    }
  }
  throw new Error('sweep: the page never booted with the scenes built:\n  ' +
    pageErrors.slice(0, 4).join('\n  '));
}
const bootInfo = await boot();

/**
 * Render and read back IN ONE TASK — see the header, point 2. Also returns
 * gl.getError() and a cheap frame checksum from the same task, so a silently
 * broken frame cannot masquerade as a good measurement (or, in the profile, as a
 * speedup).
 */
// INCREMENTAL WARM-UP IS OFF BY DEFAULT — it is NOT equivalent. Keep it that way.
//
// The idea: POSITIONS is ascending, so each sample could CONTINUE the previous
// warm-up instead of replaying from zero, taking the sweep from one full replay per
// sample to one in total (measured 1.63x faster at --step=64, and the ratio grows
// with sample count).
//
// Why it is off: `render()` is NOT side-effect-free. Precipitation respawns mutate
// particle state during rendering, so in incremental mode a capture perturbs the
// warm-up its successors inherit. Snapshotting the shared meshgen RNG around each
// capture (see main.js `__sonnetRenderSeq`) removes one source of this but not all
// of it. Measured over a 45-sample sweep: **4 positions differ, all inside the rain
// (from 0x1b00) and snow (from 0x2000) windows** — 0x1c00 by 5.6 RMSE, 0x2200 by
// 1.7, 0x2100 by 1.1, 0x1d00 by 0.2 — while median and worst were unchanged, which
// is exactly how a subtly wrong baseline hides.
//
// warm_equiv_test.mjs passed 9/9 and still missed this, because its sample
// positions straddled the precipitation windows rather than sitting inside them.
// The lesson is about the test, not the feature: an equivalence test must sample
// where the state that could differ is actually LIVE.
//
// --seq opts in for quick iteration where a couple of RMSE points do not matter.
// Never use it to produce a baseline or to judge a regression.
const SEQ = process.argv.includes('--seq');

async function shoot(pos) {
  return page.evaluate((p, seq) => {
    const c = document.getElementById('screen');
    const gl = c.getContext('webgl2');
    const t0 = performance.now();
    const info = seq && window.__sonnetRenderSeq
      ? window.__sonnetRenderSeq(p) : window.__sonnetRender(p);
    const renderMs = performance.now() - t0;
    return {
      info, renderMs,
      glError: gl.getError(),
      png: c.toDataURL('image/png'),
      flare: globalThis.__sonnetFlare ? JSON.parse(JSON.stringify(globalThis.__sonnetFlare)) : null,
    };
  }, pos, SEQ);
}

// ============================================================================
// The sweep
// ============================================================================
const results = [];
if (!PROFILE_ONLY) {
  const t0 = Date.now();
  for (let i = 0; i < POSITIONS.length; i++) {
    const pos = POSITIONS[i];
    const hex = hexOf(pos);
    let shot;
    for (let attempt = 1; ; attempt++) {
      try { shot = await shoot(pos); break; } catch (e) {
        if (!isBrowserCrash(e) || attempt > 3) throw e;
        // The RECOVERY must be protected too — a relaunch or re-boot that
        // itself dies would otherwise escape the retry it exists to serve.
        try { await relaunchBrowser(); await boot(); }
        catch (e2) { if (attempt >= 3) throw e; }
      }
    }
    const oursPng = path.join(FRAMES, `ours${TAG}_${hex}.png`);
    fs.writeFileSync(oursPng, Buffer.from(shot.png.split(',')[1], 'base64'));
    const refPng = path.join(FRAMES, `ref_${hex}.png`);

    const [A, B] = await Promise.all([pix(oursPng), pix(refPng)]);
    const sc = sceneAt(pos);
    const r = {
      pos: hex, posNum: pos, seconds: +positionToSeconds(pos).toFixed(3),
      refT: +(positionToSeconds(pos) + REF_OFFSET + SETTLE).toFixed(3),
      obj: sc.obj, scene: sc.name,
      ...comparePixels(A, B),
      ...compareLowFreq(A, B),
      darkIoU: maskIoU(A, B, d => d < 24),
      meanLumOurs: +meanLum(A).toFixed(2), meanLumRef: +meanLum(B).toFixed(2),
      glError: shot.glError, renderMs: +shot.renderMs.toFixed(1),
      quads: shot.info?.quads ?? null,
    };
    // Text regimes: the poem is the whole picture there, so a mask IoU says more
    // than RMSE. Expensive, so only where it means something.
    if (pos < 0x0400 || pos >= 0x2b00) r.inkIoU = +inkIoU(A, B).toFixed(3);
    const f = shot.flare && shot.flare[String(objToSceneIdx(sc.obj))];
    if (f) r.flare = {
      cur: f.cur, max: f.max, onScreen: f.onScreen, visible: f.visible,
      fraction: f.fraction, screen: [Math.round(f.screenX), Math.round(f.screenY)],
      queryMs: +(f.queryMs ?? 0).toFixed(2),
    };
    if (shot.glError !== 0) console.log(`  !! glError ${shot.glError} at ${hex}`);
    // refDrift only where the error is big enough for drift to matter; the
    // shifted ref frames are cached, so this is cheap after the first run.
    if (r.rmse > 20) {
      const d = await refDrift(pos, A, r.rmse);
      if (d.d !== 0) { r.refDrift = d.d; r.driftRmse = +d.rmse.toFixed(2); }
    }
    results.push(r);

    if ((i + 1) % 20 === 0 || i === POSITIONS.length - 1) {
      const pct = ((i + 1) / POSITIONS.length * 100).toFixed(0);
      const eta = ((Date.now() - t0) / (i + 1) * (POSITIONS.length - i - 1) / 1000).toFixed(0);
      process.stdout.write(`\r  ${i + 1}/${POSITIONS.length} (${pct}%)  eta ${eta}s   `);
    }
  }
  console.log();
}

// ============================================================================
// The cost breakdown (the coordinator's question: is the readback a rounding
// error, or worth an async path?)
//
// Discipline, from restoration-methodology:
//   * gl.finish() immediately before the clock starts AND before it stops, after
//     warm-up iterations, or you time previously-queued work.
//   * A BLOCKING GL CALL IS CHARGED TO JS TIME. A performance.now() bracket
//     around readPixels reports "CPU-bound"; that is not allocation churn, it is
//     the stall. Reported as such, not as CPU work.
//   * Assert the frame content and gl.getError() in the SAME task as the timing.
// ============================================================================
const TW = 128, TH = 96, LABEL = 13, CELL_H = TH * 2 + LABEL + 4, COLS = 10, ROWS = 12;
const PROFILE_POSITIONS = [
  { pos: 0x1630, what: 'flare-heavy — scene 4 sunset, the 800-unit sun disc' },
  { pos: 0x1a00, what: 'dense geometry — scene 5 autumn forest' },
  { pos: 0x0300, what: 'text only — the title card, objects 2..10 all disabled' },
];
const profile = [];
// The profile and flare-cost phases are DIAGNOSTICS, not the sweep's data.
// They run last, on a renderer that has already served hundreds of cold
// warm-ups, and they are where the transient crash now tends to land — so a
// death here must not throw away 354 valid samples.  Failures are recorded
// and the run continues; `profileError`/`flareCostError` show up in
// results.json rather than as a red pipeline.
let profileError = null;
try {
for (const P of PROFILE_POSITIONS) {
  const m = await page.evaluate(async (pos) => {
    const c = document.getElementById('screen');
    const gl = c.getContext('webgl2');
    const N = 7, WARM = 3;
    globalThis.__sonnetFlare = {};        // stale entries from earlier positions lie
    for (let i = 0; i < WARM; i++) window.__sonnetRender(pos);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < N; i++) window.__sonnetRender(pos);
    gl.finish();
    const total = (performance.now() - t0) / N;

    // The readback in isolation, on a frame that is already complete. This is
    // the floor: a 4x4 gl.readPixels with the pipeline already drained.
    const buf = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 20; i++) gl.readPixels(0, 0, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.finish();
    const t1 = performance.now();
    for (let i = 0; i < 200; i++) gl.readPixels(0, 0, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    gl.finish();
    const drained = (performance.now() - t1) / 200;

    // The same call issued MID-FRAME, i.e. what the flare actually pays: it has
    // to wait for everything already queued. Measured in situ by the flare's own
    // instrumentation rather than re-created here.
    const fl = globalThis.__sonnetFlare || {};
    const k = Object.keys(fl);
    const inFrame = k.length ? fl[k[0]].queryMs : null;
    const inFrameMean = k.length && fl[k[0]].queryCalls
      ? fl[k[0]].queryTotalMs / fl[k[0]].queryCalls : null;

    // Content + error assertions in the SAME task as the timing: a write past a
    // buffer's end fails silently and looks like a spectacular speedup.
    const px = new Uint8Array(4 * 4 * 4);
    gl.readPixels(320, 240, 4, 4, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0; for (let i = 0; i < px.length; i++) sum += px[i];
    return { total, drained, inFrame, inFrameMean, glError: gl.getError(), centreSum: sum };
  }, P.pos);
  // Attribution, not a total: a performance.now() bracket around a blocking GL
  // call reports "CPU-bound" and sends you hunting for allocation churn that does
  // not exist. So use the real sampler and look at SELF time; gl.readPixels shows
  // up as its own native frame, which is the only honest way to see the stall.
  const self = await sampleSelfTime(P.pos, 7);
  profile.push({ pos: hexOf(P.pos), what: P.what, ...m, selfTime: self.top, sampledMs: self.totalMs,
    readPixelsSelfMs: self.readPixelsMs, warmSelfMs: self.warmMs,
    warmInclusiveMs: self.warmInclusiveMs, renderInclusiveMs: self.renderInclusiveMs });
  console.log(`profile ${hexOf(P.pos)}  __sonnetRender ${m.total.toFixed(1)} ms/call  ` +
    `readPixels(4x4, drained) ${(m.drained * 1000).toFixed(1)} us  ` +
    `in-frame flare query ${m.inFrame === null ? 'n/a' : m.inFrame.toFixed(2) + ' ms'}  ` +
    `glError ${m.glError}  centreSum ${m.centreSum}`);
  console.log(`          sampler: warmTo(inclusive) ${self.warmInclusiveMs} ms  ` +
    `renderAt(inclusive) ${self.renderInclusiveMs} ms  <- THIS is the live frame cost`);
  console.log(`          readPixels self ${self.readPixelsMs.toFixed(2)} ms of ` +
    `${self.totalMs.toFixed(1)} ms sampled ` +
    `(${(100 * self.readPixelsMs / Math.max(self.renderInclusiveMs, 1e-6)).toFixed(1)}% of a live frame)`);
  console.log('          top self time: ' + self.top.slice(0, 5)
    .map(t => `${t.fn} ${t.ms.toFixed(1)}ms`).join(', '));
}
} catch (e) {
  profileError = String((e && e.message) || e).split('\n')[0];
  console.log(`  ! profile phase failed (${profileError}) — samples are unaffected`);
  if (isBrowserCrash(e)) { await relaunchBrowser(); await boot(); }
}

/**
 * CDP CPU profile over N `__sonnetRender` calls, aggregated by SELF time.
 * `warmTo` dominates the headline number because the single-frame capture path
 * replays the whole script before every frame; live playback never pays it, so
 * the two must be reported separately or the numbers are meaningless.
 */
async function sampleSelfTime(pos, n) {
  const client = await page.target().createCDPSession();
  await client.send('Profiler.enable');
  await client.send('Profiler.setSamplingInterval', { interval: 100 });   // microseconds
  await client.send('Profiler.start');
  await page.evaluate((p, k) => {
    const gl = document.getElementById('screen').getContext('webgl2');
    for (let i = 0; i < k; i++) window.__sonnetRender(p);
    gl.finish();
  }, pos, n);
  const { profile: prof } = await client.send('Profiler.stop');
  await client.send('Profiler.disable');
  await client.detach();

  const byId = new Map(prof.nodes.map(nd => [nd.id, nd]));
  const dt = [];
  for (let i = 1; i < prof.timeDeltas.length; i++) dt.push(prof.timeDeltas[i]);
  const selfUs = new Map();
  for (let i = 0; i < prof.samples.length; i++) {
    const id = prof.samples[i];
    const us = (prof.timeDeltas[i] || 0);
    const nd = byId.get(id);
    if (!nd) continue;
    const cf = nd.callFrame;
    const key = `${cf.functionName || '(anonymous)'}|${(cf.url || '').split('/').pop()}:${cf.lineNumber + 1}`;
    selfUs.set(key, (selfUs.get(key) || 0) + us);
  }
  let total = 0;
  for (const v of selfUs.values()) total += v;
  const top = [...selfUs].sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([k, v]) => ({ fn: k.split('|')[0], where: k.split('|')[1], ms: +(v / 1000 / n).toFixed(3) }));
  const sum = (re) => {
    let s = 0;
    for (const [k, v] of selfUs) if (re.test(k)) s += v;
    return s / 1000 / n;
  };

  // INCLUSIVE time per subtree.  This is what separates "what a live frame
  // costs" from "what the single-frame capture path costs": `warmTo` replays the
  // entire script and steps every object at 60 Hz before EVERY captured frame —
  // tens of thousands of ticks — which live playback never pays.  Quoting the
  // wall time of `__sonnetRender` as a frame time would be wrong by 30x.
  const selfById = new Map();
  for (let i = 0; i < prof.samples.length; i++)
    selfById.set(prof.samples[i], (selfById.get(prof.samples[i]) || 0) + (prof.timeDeltas[i] || 0));
  const inclusive = (id) => {
    let s = 0;
    const stack = [id];
    while (stack.length) {
      const k = stack.pop();
      s += selfById.get(k) || 0;
      const nd = byId.get(k);
      if (nd && nd.children) for (const ch of nd.children) stack.push(ch);
    }
    return s;
  };
  const inclusiveOf = (name, file) => {
    let s = 0;
    for (const nd of prof.nodes) {
      const cf = nd.callFrame;
      if (cf.functionName === name && (!file || (cf.url || '').endsWith(file))) s += inclusive(nd.id);
    }
    return s / 1000 / n;
  };

  return {
    top, totalMs: total / 1000 / n,
    readPixelsMs: sum(/^readPixels\||readbackRect/),
    warmMs: sum(/^warmTo\||^tick\||^seek\||^dispatchUpTo\|/),
    warmInclusiveMs: +inclusiveOf('warmTo', 'main.js').toFixed(2),
    renderInclusiveMs: +inclusiveOf('renderAt', 'main.js').toFixed(2),
  };
}

// The flare's marginal cost, measured the only way that cannot lie: the same
// position, the same page, with and without the whole feature.
let flareCost = null;
let flareCostError = null;
if (!NO_FLARE) {
  try {
    const withFlare = await timeRender(0x1630);
    await boot('&flare=0');
    const withoutFlare = await timeRender(0x1630);
    await boot();
    flareCost = {
      pos: '0x1630',
      withFlareMs: +withFlare.toFixed(2),
      withoutFlareMs: +withoutFlare.toFixed(2),
      deltaMs: +(withFlare - withoutFlare).toFixed(2),
    };
    console.log(`flare marginal cost at 0x1630: ${flareCost.withFlareMs} ms vs ` +
      `${flareCost.withoutFlareMs} ms  ->  ${flareCost.deltaMs} ms/frame`);
  } catch (e) {
    flareCostError = String((e && e.message) || e).split('\n')[0];
    console.log(`  ! flare-cost phase failed (${flareCostError}) — samples are unaffected`);
  }
}

async function timeRender(pos) {
  return page.evaluate((p) => {
    const gl = document.getElementById('screen').getContext('webgl2');
    for (let i = 0; i < 3; i++) window.__sonnetRender(p);
    gl.finish();
    const t0 = performance.now();
    for (let i = 0; i < 7; i++) window.__sonnetRender(p);
    gl.finish();
    return (performance.now() - t0) / 7;
  }, pos);
}

await browser.close();
server.close();

// ============================================================================
// Outputs
// ============================================================================
const stats = summarise(results);
const payload = {
  generated: new Date().toISOString(),
  quality: QUALITY, stepRows: STEP_ROWS, samples: results.length,
  refOffsetSeconds: REF_OFFSET, settleSeconds: SETTLE,
  reference: path.relative(WORK, REF), canvasWidth: bootInfo.w,
  noFlare: NO_FLARE,
  // provenance: 'cold' = every artifact generated live (the blessed-baseline
  // mode); 'loaded' = booted from the warm store (equivalence-guarded by
  // generate_test.mjs). State the mode beside any number quoted from this file.
  warm: bootInfo.warm,
  // >0 means the renderer died mid-run and samples after it came from a fresh
  // browser. Not a correctness problem (every sample is a cold boot anyway),
  // but worth seeing in the record.
  browserRelaunches: relaunches,
  profileError, flareCostError,
  // samples whose error is substantially capture-drift (video showing this
  // music position at a +-row offset) rather than port error — see refDrift.
  driftSummary: (() => {
    const ds = results.filter((r) => r.refDrift !== undefined && r.rmse - r.driftRmse > 5);
    return {
      flagged: ds.length,
      samples: ds.map((r) => ({ pos: r.pos, obj: r.obj, refDrift: r.refDrift,
        rmse: r.rmse, driftRmse: r.driftRmse })),
    };
  })(),
  stats, profile, flareCost,
  perScene: perScene(results),
  worst: [...results].sort((a, b) => b.rmse - a.rmse).slice(0, 30)
    .map(r => ({ pos: r.pos, obj: r.obj, scene: r.scene, rmse: r.rmse, psnr: r.psnr,
      lowRmse: r.lowRmse })),
  samplesDetail: results,
};
if (!PROFILE_ONLY) {
  fs.writeFileSync(path.join(OUT, `results${TAG}.json`), JSON.stringify(payload, null, 1));
  await contactSheets(results);
  await worstSheet(results);
  timelinePlot(results, path.join(OUT, `timeline${TAG}.png`));
  console.log(`\nRMSE  best ${stats.best.rmse} (${stats.best.pos})  median ${stats.median}  ` +
    `mean ${stats.mean}  worst ${stats.worst.rmse} (${stats.worst.pos})`);
  console.log(`PSNR  median ${stats.medianPsnr} dB`);
  const dsum = payload.driftSummary;
  if (dsum.flagged) {
    console.log(`refDrift: ${dsum.flagged} sample(s) substantially capture-drift — ` +
      dsum.samples.slice(0, 6).map((s) =>
        `${s.pos} ${s.refDrift > 0 ? '+' : ''}${s.refDrift}r (${s.rmse}→${s.driftRmse})`).join('  ') +
      (dsum.flagged > 6 ? ' …' : ''));
  }
  console.log(`wrote ${path.relative(ROOT, OUT)}/results${TAG}.json + sheets`);
  if (!KEEP) { /* frames kept: they are the evidence and re-runs reuse them */ }
} else {
  fs.writeFileSync(path.join(OUT, `profile${TAG}.json`), JSON.stringify({ profile, flareCost }, null, 1));
}

// ============================================================================
// helpers
// ============================================================================
function objToSceneIdx(obj) {
  return { 7: 4, 8: 5, 9: 7, 10: 8 }[obj] ?? -1;
}

async function pix(file) {
  const im = await loadImage(file);
  const c = createCanvas(W, H);
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0, W, H);
  return g.getImageData(0, 0, W, H).data;
}

function comparePixels(a, b) {
  let se = 0;
  const n = W * H;
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) { const d = a[i * 4 + k] - b[i * 4 + k]; se += d * d; }
  const rmse = Math.sqrt(se / (n * 3));
  return { rmse: +rmse.toFixed(2), psnr: +(20 * Math.log10(255 / Math.max(rmse, 1e-6))).toFixed(2) };
}

/**
 * The same RMSE after an 8x8 box downsample. High rmse with LOW lowRmse means the
 * composition, colour and lighting are right and the difference is high-frequency
 * detail — missing impostors, foliage, particles. High lowRmse means something
 * structural is wrong: a camera, a fade, a whole missing pass.
 */
function compareLowFreq(a, b) {
  const bw = W >> 3, bh = H >> 3;
  const A = new Float64Array(bw * bh * 3), B = new Float64Array(bw * bh * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = ((y >> 3) * bw + (x >> 3)) * 3, i = (y * W + x) * 4;
    for (let k = 0; k < 3; k++) { A[o + k] += a[i + k]; B[o + k] += b[i + k]; }
  }
  let se = 0;
  for (let i = 0; i < A.length; i++) { const d = (A[i] - B[i]) / 64; se += d * d; }
  const lo = Math.sqrt(se / A.length);
  return { lowRmse: +lo.toFixed(2) };
}

function meanLum(d) {
  let s = 0;
  for (let i = 0; i < W * H; i++)
    s += 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  return s / (W * H);
}

/** IoU of two boolean masks defined on luminance. The border (object 2) is a
 *  ragged black frame, so the dark mask tracks it directly. */
function maskIoU(a, b, pred) {
  let inter = 0, uni = 0;
  for (let i = 0; i < W * H; i++) {
    const la = 0.299 * a[i * 4] + 0.587 * a[i * 4 + 1] + 0.114 * a[i * 4 + 2];
    const lb = 0.299 * b[i * 4] + 0.587 * b[i * 4 + 1] + 0.114 * b[i * 4 + 2];
    const A = pred(la), B = pred(lb);
    if (A && B) inter++;
    if (A || B) uni++;
  }
  return uni ? +(inter / uni).toFixed(3) : 1;
}

/** capture.mjs's ink mask: locally extreme luminance either way. */
function inkMask(d) {
  const m = new Uint8Array(W * H);
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++)
    lum[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  const R = 8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let mx = 0, mn = 255;
      for (let k = -R; k <= R; k++) {
        const xx = x + k; if (xx < 0 || xx >= W) continue;
        const v = lum[y * W + xx];
        if (v > mx) mx = v;
        if (v < mn) mn = v;
      }
      const v = lum[y * W + x];
      if ((mx > 30 && v < mx - 28) || (mn < 225 && v > mn + 28)) m[y * W + x] = 1;
    }
  }
  return m;
}
function inkIoU(a, b) {
  const ma = inkMask(a), mb = inkMask(b);
  let inter = 0, uni = 0;
  for (let i = 0; i < W * H; i++) {
    if (ma[i] && mb[i]) inter++;
    if (ma[i] || mb[i]) uni++;
  }
  return uni ? inter / uni : 1;
}

function summarise(rs) {
  if (!rs.length) return {};
  const sorted = [...rs].sort((a, b) => a.rmse - b.rmse);
  const mid = sorted[Math.floor(sorted.length / 2)];
  const q = (f) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * f))].rmse;
  return {
    best: { pos: sorted[0].pos, rmse: sorted[0].rmse, psnr: sorted[0].psnr },
    worst: { pos: sorted[sorted.length - 1].pos, rmse: sorted[sorted.length - 1].rmse },
    median: mid.rmse, medianPsnr: mid.psnr,
    mean: +(rs.reduce((s, r) => s + r.rmse, 0) / rs.length).toFixed(2),
    p10: q(0.10), p25: q(0.25), p75: q(0.75), p90: q(0.90),
    under10: rs.filter(r => r.rmse < 10).length,
    under20: rs.filter(r => r.rmse < 20).length,
    under40: rs.filter(r => r.rmse < 40).length,
    over60: rs.filter(r => r.rmse >= 60).length,
  };
}

function perScene(rs) {
  const by = new Map();
  for (const r of rs) {
    const k = `${r.obj}|${r.scene}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k).push(r);
  }
  return [...by].map(([k, v]) => {
    const s = [...v].sort((a, b) => a.rmse - b.rmse);
    return {
      obj: +k.split('|')[0], scene: k.split('|')[1], n: v.length,
      medianRmse: s[Math.floor(s.length / 2)].rmse,
      medianLowRmse: [...v].sort((a, b) => a.lowRmse - b.lowRmse)[Math.floor(v.length / 2)].lowRmse,
      bestRmse: s[0].rmse, worstRmse: s[s.length - 1].rmse, worstPos: s[s.length - 1].pos,
    };
  }).sort((a, b) => b.medianRmse - a.medianRmse);
}

// -------------------------------------------------------------------- pictures
async function contactSheets(rs) {
  const per = COLS * ROWS;
  for (let s = 0; s * per < rs.length; s++) {
    const chunk = rs.slice(s * per, s * per + per);
    const rows = Math.ceil(chunk.length / COLS);
    const c = createCanvas(COLS * (TW + 4) + 4, rows * CELL_H + 28);
    const g = c.getContext('2d');
    g.fillStyle = '#0d0f12'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#7fa7d7'; g.font = 'bold 13px monospace';
    g.fillText(`Sonnet — whole-timeline sweep  (sheet ${s + 1})   ` +
      `TOP = ours, BOTTOM = reference   quality=${QUALITY}`, 6, 17);
    for (let i = 0; i < chunk.length; i++) {
      const r = chunk[i];
      const x = 4 + (i % COLS) * (TW + 4);
      const y = 26 + Math.floor(i / COLS) * CELL_H;
      const [A, B] = await Promise.all([
        loadImage(path.join(FRAMES, `ours${TAG}_${r.pos}.png`)),
        loadImage(path.join(FRAMES, `ref_${r.pos}.png`)),
      ]);
      g.drawImage(A, x, y + LABEL, TW, TH);
      g.drawImage(B, x, y + LABEL + TH, TW, TH);
      g.fillStyle = r.rmse > 60 ? '#e06c5a' : r.rmse > 30 ? '#d7a55f' : '#6fbf73';
      g.font = '10px monospace';
      g.fillText(`${r.pos} ${r.rmse.toFixed(0)}`, x + 1, y + 10);
      g.strokeStyle = '#243040'; g.lineWidth = 1;
      g.strokeRect(x - 0.5, y + LABEL - 0.5, TW + 1, TH * 2 + 1);
    }
    fs.writeFileSync(path.join(OUT, `sheet${TAG}_${String(s + 1).padStart(2, '0')}.png`),
      c.toBuffer('image/png'));
  }
}

async function worstSheet(rs) {
  const worst = [...rs].sort((a, b) => b.rmse - a.rmse).slice(0, 12);
  const tw = 320, th = 240, cols = 3;
  const rows = Math.ceil(worst.length / cols);
  const c = createCanvas(cols * (tw + 6) + 6, rows * (th * 2 + 22) + 30);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0f12'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e06c5a'; g.font = 'bold 14px monospace';
  g.fillText('The twelve worst samples — TOP ours, BOTTOM reference', 8, 19);
  for (let i = 0; i < worst.length; i++) {
    const r = worst[i];
    const x = 6 + (i % cols) * (tw + 6);
    const y = 28 + Math.floor(i / cols) * (th * 2 + 22);
    const [A, B] = await Promise.all([
      loadImage(path.join(FRAMES, `ours${TAG}_${r.pos}.png`)),
      loadImage(path.join(FRAMES, `ref_${r.pos}.png`)),
    ]);
    g.drawImage(A, x, y + 14, tw, th);
    g.drawImage(B, x, y + 14 + th, tw, th);
    g.fillStyle = '#d7a55f'; g.font = '11px monospace';
    g.fillText(`${r.pos} obj${r.obj} rmse ${r.rmse.toFixed(1)} low ${r.lowRmse.toFixed(1)}`, x + 2, y + 11);
  }
  fs.writeFileSync(path.join(OUT, `worst${TAG}.png`), c.toBuffer('image/png'));

  // full-size pairs for the top six
  for (const r of worst.slice(0, 6)) {
    const [A, B] = await Promise.all([
      loadImage(path.join(FRAMES, `ours${TAG}_${r.pos}.png`)),
      loadImage(path.join(FRAMES, `ref_${r.pos}.png`)),
    ]);
    const cc = createCanvas(1280, 500);
    const gg = cc.getContext('2d');
    gg.fillStyle = '#111'; gg.fillRect(0, 0, 1280, 500);
    gg.drawImage(A, 0, 20, 640, 480); gg.drawImage(B, 640, 20, 640, 480);
    gg.fillStyle = '#7fa7d7'; gg.font = '13px monospace';
    gg.fillText(`OURS ${r.pos}  obj ${r.obj}  ${r.scene}  rmse ${r.rmse}  lowRmse ${r.lowRmse}`, 8, 14);
    gg.fillText(`REFERENCE t=${r.refT.toFixed(2)}s`, 648, 14);
    fs.writeFileSync(path.join(OUT, `pair${TAG}_${r.pos}.png`), cc.toBuffer('image/png'));
  }
}

function timelinePlot(rs, file) {
  const PW = 1400, PH = 420, ML = 52, MB = 46, MT = 28, MR = 12;
  const c = createCanvas(PW, PH);
  const g = c.getContext('2d');
  g.fillStyle = '#0d0f12'; g.fillRect(0, 0, PW, PH);
  const maxR = Math.max(60, ...rs.map(r => r.rmse));
  const X = (p) => ML + ((p >> 8) * 64 + (p & 0xff)) / LAST_ROW * (PW - ML - MR);
  const Y = (v) => PH - MB - (v / maxR) * (PH - MB - MT);
  g.strokeStyle = '#243040'; g.fillStyle = '#5b6b7d'; g.font = '11px monospace';
  for (let v = 0; v <= maxR; v += 20) {
    g.beginPath(); g.moveTo(ML, Y(v)); g.lineTo(PW - MR, Y(v)); g.stroke();
    g.fillText(String(v), 8, Y(v) + 4);
  }
  for (const s of SCENES) {
    const x0 = X(s.from), x1 = X(Math.min(s.to, END_POSITION));
    g.fillStyle = 'rgba(127,167,215,0.06)'; g.fillRect(x0, MT, x1 - x0, PH - MB - MT);
    g.strokeStyle = '#2c3a4c'; g.beginPath(); g.moveTo(x0, MT); g.lineTo(x0, PH - MB); g.stroke();
    g.save(); g.translate(x0 + 4, PH - MB + 12); g.rotate(0.34);
    g.fillStyle = '#7fa7d7'; g.font = '10px monospace';
    g.fillText(`obj${s.obj} ${s.name}`, 0, 0); g.restore();
  }
  g.strokeStyle = '#e0894a'; g.lineWidth = 1.4; g.beginPath();
  rs.forEach((r, i) => (i ? g.lineTo(X(r.posNum), Y(r.rmse)) : g.moveTo(X(r.posNum), Y(r.rmse))));
  g.stroke();
  g.strokeStyle = '#6fbf73'; g.lineWidth = 1; g.beginPath();
  rs.forEach((r, i) => (i ? g.lineTo(X(r.posNum), Y(r.lowRmse)) : g.moveTo(X(r.posNum), Y(r.lowRmse))));
  g.stroke();
  g.fillStyle = '#e0e6ee'; g.font = 'bold 13px monospace';
  g.fillText('RMSE (orange) and 8x8-downsampled RMSE (green) against music position', ML, 18);
  fs.writeFileSync(file, c.toBuffer('image/png'));
}
