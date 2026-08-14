// frame.mjs — render one Lapsus frame and put it beside the reference capture.
//
//   node productions/lapsus/work/verify/frame.mjs [scene] [localTime]
//   node productions/lapsus/work/verify/frame.mjs hulluolli 4.8
//
// The first harness built on tools/harness rather than a bespoke server.
// Capture time is derived from prod.json, not typed in: phase-1 parts sit at
// captureTime = trackOffset(mp3#1) + partStart + localTime, and the schedule
// comes from re/ENGINE.md. That way a timing claim here is always traceable
// to the recovered schedule and the measured audio alignment.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { withPage, shootCanvas, assertClean, fromRepo } from '../../../../tools/harness/index.mjs';

// phase-1 schedule (re/ENGINE.md §5): part -> { start, dur }
const PHASE1 = {
  startpart1: { start: 0, dur: 1 },     empt: { start: 1, dur: 13 },
  flu2: { start: 14, dur: 9 },          pene: { start: 23, dur: 8 },
  krediili: { start: 31, dur: 16 },     silli: { start: 47, dur: 8 },
  syrjakyla: { start: 55, dur: 9.531 }, paleksi: { start: 64.531, dur: 9.531 },
  pehko: { start: 74.062, dur: 9.531 }, hulluolli: { start: 83.593, dur: 9.531 },
};
const PHASE2 = {
  kuubiotekniikka: { start: 0, dur: 13.8 }, diskojea: { start: 13.8, dur: 8.5 },
  kartonki: { start: 22.3, dur: 7.4 },      hairball: { start: 29.7, dur: 7 },
  higherbiing: { start: 36.7, dur: 14 },    viherio: { start: 50.7, dur: 10.46 },
  morko: { start: 61.16, dur: 3.54 },       turska: { start: 64.7, dur: 7.5 },
  rad_out: { start: 72.2, dur: 14 },        kaivoalieni: { start: 86.2, dur: 13.5 },
  made: { start: 99.7, dur: 5.5 },          hedi: { start: 105.2, dur: 3 },
};

const scene = (process.argv[2] ?? 'hulluolli').toLowerCase();
const local = parseFloat(process.argv[3] ?? '4.8');
// Any further `k=v` arguments are appended to the renderer's query string, so
// diagnostics like ?fb=0 (render a feedback part as a single frame) or
// ?hairdt= can be driven from here without a second harness.
const extra = process.argv.slice(4).filter((a) => a.includes('='));
const suffix = extra.length ? '&' + extra.join('&') : '';
const tag = extra.length ? '_' + extra.join('_').replace(/[^\w.-]/g, '') : '';

const prod = JSON.parse(fs.readFileSync(fromRepo('productions/lapsus/prod.json'), 'utf8'));
const cap = prod.captures[0];
const offsets = cap.trackOffsetsMs;
const inP1 = scene in PHASE1;
const entry = PHASE1[scene] ?? PHASE2[scene];
if (!entry) { console.error(`unknown part "${scene}"`); process.exit(2); }
const trackMs = inP1 ? offsets['data/mjuusik/1.mp3'] : offsets['data/mjuusik/2.mp3'];
const captureTime = trackMs / 1000 + entry.start + local;

const outDir = fromRepo('productions/lapsus/work/verify/frames');
fs.mkdirSync(outDir, { recursive: true });
const ours = path.join(outDir, `${scene}_t${local}${tag}_ours.png`);
const ref = path.join(outDir, `${scene}_t${local}${tag}_ref.png`);
const sbs = path.join(outDir, `${scene}_t${local}${tag}_sbs.png`);

console.log(`${scene}  local t=${local}s  (phase ${inP1 ? 1 : 2} t=${(entry.start + local).toFixed(2)}s)`);
console.log(`capture time = ${captureTime.toFixed(2)}s`);

await withPage(
  { root: 'productions/lapsus', path: '/web/index.html',
    query: `?scene=${scene}&t=${local}${suffix}`, width: 640, height: 480,
    viewport: { width: 640, height: 480 } },
  async ({ page, server, errors, failedRequests }) => {
    await page.waitForFunction('window.__lapsusReady === true', { timeout: 30000 });
    const info = await page.evaluate(() => window.__lapsusInfo ?? null);
    const err = await page.evaluate(() => window.__lapsusError ?? null);
    if (err) throw new Error('renderer: ' + err);
    // Part_Empt genuinely has no .lws — it is pure 2D and its content is its
    // own stamping routine — so that one 404 is expected, not a fault. Named
    // explicitly rather than by loosening the check.
    assertClean({ errors, failedRequests }, server,
      { ignore: [/\/favicon\.ico$/, /\/empt\.lws$/] });
    console.log('  ' + JSON.stringify(info));
    if (info.glError !== 0) throw new Error(`gl.getError = 0x${info.glError.toString(16)}`);
    fs.writeFileSync(ours, await shootCanvas(page, { canvasSelector: '#c', warmupFrames: 2 }));
  });

// reference frame at the derived capture time, scaled to match ours
execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(captureTime),
  '-i', fromRepo(cap.path), '-frames:v', '1', '-vf', 'scale=640:480', ref]);
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', ours, '-i', ref,
  '-filter_complex', '[0:v][1:v]hstack=inputs=2', sbs]);

console.log(`  ours ${path.relative(fromRepo('.'), ours)}`);
console.log(`  ref  ${path.relative(fromRepo('.'), ref)}`);
console.log(`  sbs  ${path.relative(fromRepo('.'), sbs)}`);
