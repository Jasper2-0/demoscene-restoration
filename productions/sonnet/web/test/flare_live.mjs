// flare_live.mjs — a PER-FRAME trace of the lens flare during REAL playback.
//
//   node web/test/flare_live.mjs                  # the three probe segments
//   node web/test/flare_live.mjs --tag=after      # label a run for A/B
//   node web/test/flare_live.mjs --seconds=8      # longer segments
//   node web/test/flare_live.mjs --quality=remaster
//
// WHY THIS EXISTS, AND WHY sweep.mjs CANNOT REPLACE IT
// ====================================================
// The flare is an INTEGRATOR.  `FUN_004050ed` nudges `cur` toward 0 or `max` by
// `dt * rate` once per rendered frame, so its value at any instant is a function
// of the last ~40 frames of occlusion verdicts.  `sweep.mjs` renders exactly ONE
// frame per sample, after a `warmTo` that steps every object at 60 Hz *without
// rendering* — and `updateOffline` cannot query an image that was never drawn, so
// it assumes "visible" and ramps `cur` to `max`.  The single real frame that
// follows can move `cur` by one step.
//
// Consequence: **the sweep is blind to every change in the occlusion query.**  It
// is not merely insensitive — the quantity under test is destroyed by the warm-up
// before the measurement starts.
//
// This is not hypothetical.  On 2026-08-11 the marker/draw split (which is what
// the binary does — `FUN_00405f8b` visits the flare twice per frame) was landed
// on the strength of "median 26.13 -> 26.13, worst 81.07 -> 80.36, every
// per-scene median unchanged".  In a real browser it made the forest sun vanish
// completely, and Jasper found it in seconds.  The change had turned the query
// from always-visible into always-occluded, and the metric could not see either
// state.  See FLARE.md.
//
// So: play the demo FOR REAL, sample `__sonnetFlare` every animation frame, and
// judge the flare on the shape of its trace rather than on a still.
//
// WHAT A HEALTHY TRACE LOOKS LIKE
// ===============================
// The sun is *supposed to pulse* — Jasper's report is that "the pulses of the sun
// coincide with leaves moving in front of it".  So for a segment whose foreground
// crosses the sun, the failure modes are the two ENDPOINTS, and both have shipped:
//
//   PINNED OPEN    visible on ~every frame, `cur` stuck at `max`
//                  -> the query never fires; the sun blazes through the canopy.
//                     This is the state at the time of writing (see FLARE.md's
//                     measured table: obj 5 and obj 7 fail on >50% of the frames
//                     where the original occludes the sun).
//   PINNED SHUT    visible on ~no frames, `cur` stuck at 0
//                  -> "the sun is gone from the forest scene". The reverted split.
//
// A healthy segment sits strictly between: `cur` sweeps a real range and the
// verdict flips back and forth.  `transitions` counts those flips and is the
// single most diagnostic number here — a pinned trace has 0 of them whichever
// end it is pinned to, which is precisely why a mean or a median cannot tell the
// two catastrophes apart.
//
// The thresholds below are deliberately loose.  This is a REGRESSION GUARD
// against pinning, not a fidelity measurement — the reference video cannot be
// sampled per-frame this way, so nothing here is compared against it.  Judge
// fidelity with sweep.mjs and the eye; judge the integrator's liveness here.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const WORK = path.join(WEB, '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

const argv = process.argv.slice(2);
const opt = (k, d) => {
  const a = argv.find(s => s.startsWith(`--${k}=`));
  return a === undefined ? d : a.slice(k.length + 3);
};
const TAG = opt('tag', '');
const SECONDS = Number(opt('seconds', '6'));
const QUALITY = opt('quality', 'original');
const VERBOSE = argv.includes('--verbose');

// ---------------------------------------------------------------------------
// The probe segments.
//
// `obj` is the scene object that owns the flare, for cross-referencing FLARE.md's
// per-object table.
//
// `expect` IS TAKEN FROM THE REFERENCE, NOT FROM INTUITION.  FLARE.md's measured
// table gives, per object, how much of the reference frame the sun covers (median)
// and how often it is fully off.  Guessing these instead cost a wrong verdict on
// the first run of this file: the forest was labelled 'pulse' because that is what
// Jasper's original report described, and the probe duly reported a FAILURE for a
// segment whose reference sun is off in 36 of 56 samples with a median footprint
// of 0.000 — i.e. staying shut there is CORRECT.
//
//   'pulse'  reference sun is sometimes on and sometimes off  -> must flip
//   'open'   reference median footprint is large              -> pinned open is right
//   'shut'   reference median footprint is ~0                 -> pinned shut is right
//
// The 'open' and 'shut' segments are the control group. Without them, a change
// that simply disabled the flare everywhere would look like a fix.
// ---------------------------------------------------------------------------
const SEGMENTS = [
  // ref median 0.003%, off in 25/40 -> the canopy pulse Jasper described
  { name: 'grove (obj 5, canopy over sun)',   obj: 5, start: 0x0b30, expect: 'pulse' },
  // ref median 0.341%, off in 18/40 -> grass crosses the sun, so it must flip
  { name: 'beach (obj 7, grass over sun)',    obj: 7, start: 0x1400, expect: 'pulse' },
  // ref median 0.000%, off in 36/56.  Two starts because this is the scene the
  // reverted split broke, and 0x1b00 alone leaves the sun off-screen ~70% of the
  // time — too thin a base to call a regression on.  0x1800 still has the sun up,
  // so it is the one that would catch a PINNED SHUT regression.
  { name: 'forest A (obj 8, reverted bug)',   obj: 8, start: 0x1800, expect: 'pulse' },
  { name: 'forest B (obj 8, reverted bug)',   obj: 8, start: 0x1b00, expect: 'shut'  },
  // ref median 23.636% -> open sky, the sun is simply up
  { name: 'cloud sea (obj 6, open sky)',      obj: 6, start: 0x1000, expect: 'open'  },
  // ref median 11.761% -> open sky
  { name: 'spires (obj 3, open sky)',         obj: 3, start: 0x0500, expect: 'open'  },
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png',
               '.xm': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(WORK, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, ''));
  let data;
  try { data = fs.readFileSync(p); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(data);
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars',
    '--autoplay-policy=no-user-gesture-required', '--mute-audio'],
});

/**
 * Play one segment for real and return every frame's flare state.
 *
 * The recorder runs IN THE PAGE on requestAnimationFrame rather than polling over
 * CDP: a `page.evaluate` round trip is milliseconds, so polling would alias badly
 * against a 60 Hz integrator and silently drop the flips we are counting.
 */
async function probe(seg) {
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 640 });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
  });

  const url = `http://127.0.0.1:${port}/web/index.html?debug&quality=${QUALITY}` +
              `&start=0x${seg.start.toString(16)}`;
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.click('#overlay');
  await page.waitForFunction('window.__sonnetClock && window.__sonnetClock.pos > 0',
    { timeout: 60000 });

  // Install the in-page recorder. `__sonnetFlare` is keyed by scene index and
  // rewritten by every render, so one read per animation frame is one sample per
  // rendered frame.
  await page.evaluate(() => {
    window.__flareTrace = [];
    const tick = () => {
      const f = window.__sonnetFlare;
      if (f) {
        for (const k of Object.keys(f)) {
          const s = f[k];
          window.__flareTrace.push({
            t: performance.now(), pos: window.__sonnetClock ? window.__sonnetClock.pos : 0,
            obj: s.obj, cur: s.cur, max: s.max, rate: s.rate,
            visible: !!s.visible, fraction: s.fraction, onScreen: !!s.onScreen,
          });
        }
      }
      window.__flareRAF = requestAnimationFrame(tick);
    };
    tick();
  });

  await new Promise(r => setTimeout(r, SECONDS * 1000));
  const trace = await page.evaluate(() => {
    cancelAnimationFrame(window.__flareRAF);
    return window.__flareTrace;
  });
  await page.close();
  return { trace, errors };
}

// ---------------------------------------------------------------------------
function summarise(seg, trace) {
  // Keep only the object this segment is about; a scene seam can briefly leave
  // the neighbouring object's entry in __sonnetFlare.
  const rows = trace.filter(r => r.obj === seg.obj);
  if (!rows.length) return { seg, rows, empty: true };

  // JUDGE ONLY THE ON-SCREEN FRAMES.  `update()` short-circuits to
  // `visible = false` whenever the 4x4 block falls outside
  // [2, w-2) x [2, h-2) — the original's `FUN_00402907` bounds guard, which
  // returns "occluded" without touching the back buffer.  That is CORRECT
  // behaviour and has nothing to do with whether the occlusion query works, so
  // folding those frames into `visible%` manufactures a fake PINNED SHUT for any
  // segment where the camera simply looks away from the sun.  The first run of
  // this file did exactly that and reported the forest as pinned shut when it
  // was off-screen 70% of the time.
  const on = rows.filter(r => r.onScreen);
  const vis = on.filter(r => r.visible).length;
  let transitions = 0;
  for (let i = 1; i < on.length; i++) if (on[i].visible !== on[i - 1].visible) transitions++;
  const curs = rows.map(r => r.cur);
  const max = rows[0].max || 1;
  const lo = Math.min(...curs), hi = Math.max(...curs);
  return {
    seg, rows, empty: false,
    frames: rows.length,
    onFrames: on.length,
    onScreenPct: 100 * on.length / rows.length,
    visPct: on.length ? 100 * vis / on.length : 0,   // of ON-SCREEN frames
    transitions,
    curLo: lo, curHi: hi, max,
    rate: rows[0].rate,
    span: 100 * (hi - lo) / max,          // how much of the range `cur` actually uses
  };
}

function verdict(s) {
  if (s.empty) return { state: 'NO DATA', ok: false };
  // Too few on-screen frames to say anything.  Not a pass and not a failure —
  // the segment needs a different start position.
  if (s.onFrames < 30) return { state: 'sun off-screen', ok: true, weak: true };

  // Pinning is judged on the VERDICT stream, not on `cur`.  `cur` is a poor
  // witness for two reasons: scenes with `rate = 0` (objects 3, 4, 6) hold it at
  // `max` BY DESIGN however the query answers, and a fast `rate` saturates it
  // between flips so it reads as pinned while the query is working fine.
  const pinnedOpen = s.transitions === 0 && s.visPct > 99;
  const pinnedShut = s.transitions === 0 && s.visPct < 1;
  if (s.seg.expect === 'open') {
    return { state: pinnedShut ? 'PINNED SHUT' : (pinnedOpen ? 'open (correct)' : 'flickering'),
             ok: !pinnedShut };
  }
  if (s.seg.expect === 'shut') {
    return { state: pinnedOpen ? 'PINNED OPEN' : (pinnedShut ? 'shut (correct)' : 'flickering'),
             ok: !pinnedOpen };
  }
  if (pinnedOpen) return { state: 'PINNED OPEN', ok: false };
  if (pinnedShut) return { state: 'PINNED SHUT', ok: false };
  return { state: 'pulsing', ok: true };
}

/**
 * Diff this run against a saved one.
 *
 * This, not the pass/fail above, is the guard that matters.  The thresholds are
 * absolute and loose by necessity — nothing here is compared against the
 * reference video, which cannot be sampled per-frame this way.  What CAN be
 * defended is "the flare still behaves as it did in a build Jasper looked at and
 * called good", and that is a diff.  `--tag=base` is that build.
 */
function compare(now, before) {
  const prev = new Map((before.segments || []).map(s => [s.name, s]));
  const rows = [];
  for (const s of now) {
    const p = prev.get(s.name);
    if (!p) { rows.push({ name: s.name, note: 'NEW (not in baseline)' }); continue; }
    const dVis = s.visPct - p.visPct;
    const dFlip = s.transitions - p.transitions;
    // A segment that was flipping and has stopped is the reverted split's exact
    // signature, in either direction. Flag it hard regardless of visPct drift.
    const wentPinned = p.transitions > 0 && s.transitions === 0;
    rows.push({
      name: s.name, dVis, dFlip, wentPinned,
      note: wentPinned ? 'WENT PINNED' : (Math.abs(dVis) > 20 ? 'moved a lot' : ''),
    });
  }
  return rows;
}

console.log(`flare_live — quality=${QUALITY}, ${SECONDS}s per segment` +
            (TAG ? `, tag=${TAG}` : '') + '\n');
const out = [];
let bad = 0;
for (const seg of SEGMENTS) {
  const { trace, errors } = await probe(seg);
  const s = summarise(seg, trace);
  const v = verdict(s);
  if (!v.ok) bad++;
  out.push({ ...s, seg: undefined, name: seg.name, obj: seg.obj, expect: seg.expect,
             state: v.state, ok: v.ok, errors });

  if (s.empty) {
    console.log(`${v.ok ? 'ok  ' : 'FAIL'}  ${seg.name.padEnd(34)} NO FLARE SAMPLES` +
                (errors.length ? `  [${errors[0]}]` : ''));
    continue;
  }
  console.log(`${v.ok ? (v.weak ? 'weak' : 'ok  ') : 'FAIL'}  ${seg.name.padEnd(34)}` +
    ` ${String(v.state).padEnd(14)}` +
    ` onScreen ${s.onScreenPct.toFixed(0).padStart(3)}%` +
    `  visible ${s.visPct.toFixed(1).padStart(5)}%` +
    `  flips ${String(s.transitions).padStart(3)}` +
    `  cur ${s.curLo.toFixed(0)}..${s.curHi.toFixed(0)}/${s.max} (rate ${s.rate})`);
  if (errors.length) console.log(`        page errors: ${errors.slice(0, 2).join(' | ')}`);
  if (VERBOSE) {
    const step = Math.max(1, Math.floor(s.rows.length / 40));
    console.log('        ' + s.rows.filter((_, i) => i % step === 0)
      .map(r => (r.visible ? '#' : '.')).join(''));
  }
}

const file = path.join(WORK, 'work/verify', `flare_live${TAG ? '_' + TAG : ''}.json`);
fs.writeFileSync(file, JSON.stringify({
  generated: new Date().toISOString(), quality: QUALITY, seconds: SECONDS,
  segments: out.map(o => ({ ...o, rows: undefined })),
  traces: Object.fromEntries(out.map(o => [o.name, (o.rows || []).map(
    r => [Math.round(r.t), r.pos, +r.cur.toFixed(1), r.visible ? 1 : 0, r.fraction])])),
}, null, 1));
console.log(`\nwrote ${path.relative(ROOT, file)}`);

// --------------------------------------------------------------- compare mode
const CMP = opt('compare', null);
let regressed = 0;
if (CMP) {
  const bFile = path.join(WORK, 'work/verify', `flare_live_${CMP}.json`);
  if (!fs.existsSync(bFile)) {
    console.log(`\n--compare=${CMP}: no ${path.relative(ROOT, bFile)} to compare against`);
  } else {
    const before = JSON.parse(fs.readFileSync(bFile, 'utf8'));
    console.log(`\nvs baseline '${CMP}' (${before.generated}):`);
    for (const r of compare(out, before)) {
      if (r.note === 'NEW (not in baseline)') { console.log(`      ${r.name.padEnd(34)} ${r.note}`); continue; }
      if (r.wentPinned) regressed++;
      console.log(`${r.wentPinned ? 'REGR' : '    '}  ${r.name.padEnd(34)}` +
        ` visible ${(r.dVis >= 0 ? '+' : '') + r.dVis.toFixed(1)}%`.padEnd(20) +
        ` flips ${(r.dFlip >= 0 ? '+' : '') + r.dFlip}`.padEnd(12) + (r.note || ''));
    }
  }
}

await browser.close();
server.close();
if (regressed) {
  console.log(`\n${regressed} SEGMENT(S) STOPPED FLIPPING vs '${CMP}' — this is the ` +
              'signature of the 2026-08-11 revert. Do not land.');
} else {
  console.log(bad === 0 ? '\nALL SEGMENTS AS EXPECTED'
                        : `\n${bad} SEGMENT(S) PINNED THE WRONG WAY — see FLARE.md`);
}
process.exit((bad || regressed) ? 1 : 0);
