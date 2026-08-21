// rate_scope.mjs — WHERE IS THE PORT FRAME-RATE DEPENDENT, AND HOW BADLY?
//
//   node web/test/rate_scope.mjs                       # 40 samples, 30 vs 60
//   node web/test/rate_scope.mjs --a=30 --b=120        # any two rates
//   node web/test/rate_scope.mjs --samples=80          # finer grid
//   node web/test/rate_scope.mjs --json=work/verify/rate_scope.json
//
// THE QUESTION. `dt` is derived from elapsed MUSIC ms (scene7 #tickClock), so a
// scene whose state is a proper integral of dt must render IDENTICALLY however
// many ticks that music interval was cut into. Anything that differs is
// accumulating per TICK rather than per unit time, and its appearance therefore
// depends on the viewer's monitor — the live loop ticks per requestAnimationFrame.
//
// Rendering the same position at two step rates and diffing is a DECIDABLE
// check: bit-identical or not. It finds mechanisms nobody thought to grep for,
// which matters because a grep for the one known pattern (#stepSpires' `delay -=
// T`) reported "spires only" and was wrong — every scene is affected.
//
// ⚠ THE POSITIVE CONTROL IS NOT OPTIONAL, and this tool refuses to report
// without it. The failure mode that makes it necessary: `toDataURL` read in a
// DIFFERENT page.evaluate from the render returns a BLANK frame, because the
// drawing buffer is not preserved (sweep.mjs §49). Blank-vs-blank compares as
// "identical", i.e. a broken harness reports exactly the answer an optimist is
// hoping for — and it did, for nine scenes, before the control caught it. So
// every run first diffs two DIFFERENT positions and asserts the result is large.
//
// Both rates are driven through the same fixed-WARM_STEP path the harnesses
// use, so this measures the PORT's sensitivity, not the browser's timing.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const PROD = path.join(WEB, '..');
const ROOT = path.join(PROD, '..', '..');
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const { decodePNG } = await import(path.join(PROD, 'work/js/png.mjs'));
const { positionToSeconds, secondsToPosition, END_POSITION, sceneAt } =
  await import(path.join(WEB, 'js/timeline.js'));

const opt = (n, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${n}=`));
  return h ? h.slice(n.length + 3) : d;
};
const RATE_A = Number(opt('a', 30));
const RATE_B = Number(opt('b', 60));
const SAMPLES = Number(opt('samples', 40));
const JSON_OUT = opt('json', null);

// The grid walks MUSIC TIME rather than raw positions: rows are not uniform in
// seconds, and a per-scene comparison wants even coverage of what is on screen.
const endSec = positionToSeconds(END_POSITION);
const positions = [];
for (let i = 0; i < SAMPLES; i++) {
  const sec = (endSec * (i + 0.5)) / SAMPLES;
  const p = Math.min(END_POSITION, secondsToPosition(sec));
  if (!positions.includes(p)) positions.push(p);
}
const hex = (p) => '0x' + p.toString(16).padStart(4, '0');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png',
  '.xm': 'application/octet-stream', '.bin': 'application/octet-stream',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const data = fs.readFileSync(path.join(PROD, rel));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars'],
});

/** One page per rate, reused for every position: `__sonnetRender` replays the
 *  script from zero on each call (97-99% of its cost), so it is safe to drive
 *  many positions from one boot and a page load per sample is pure waste. */
async function openAt(rate) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(
    `http://127.0.0.1:${PORT}/web/index.html` +
    `?pos=${hex(positions[0])}&quality=original&warm=0&inspect=1&warmstep=${rate}`,
    { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 180000 });
  return { page, errs };
}
/** RENDER AND READ BACK IN ONE EVALUATE. See the header. */
const shoot = (page, pos) => page.evaluate((p) => {
  window.__sonnetRender(p);
  return document.getElementById('screen').toDataURL('image/png');
}, pos).then((d) => decodePNG(Buffer.from(d.split(',')[1], 'base64')));

const rmse = (A, B) => {
  let s = 0, n = 0;
  for (let i = 0; i < A.rgba.length; i += 4) {
    for (let k = 0; k < 3; k++) { const d = A.rgba[i + k] - B.rgba[i + k]; s += d * d; n++; }
  }
  return Math.sqrt(s / n);
};
const meanLuma = (A) => {
  let s = 0;
  for (let i = 0; i < A.rgba.length; i += 4) s += A.rgba[i] + A.rgba[i + 1] + A.rgba[i + 2];
  return s / (A.rgba.length / 4 * 3);
};

const a = await openAt(RATE_A);
const b = await openAt(RATE_B);

// ---- THE CONTROL, before anything is reported.
const cA = await shoot(a.page, positions[Math.floor(positions.length * 0.25)]);
const cB = await shoot(a.page, positions[Math.floor(positions.length * 0.75)]);
const control = rmse(cA, cB);
console.log(`control: two different positions at rate ${RATE_A} differ by ${control.toFixed(2)}` +
            `  (mean luma ${meanLuma(cA).toFixed(1)} / ${meanLuma(cB).toFixed(1)})`);
if (!(control > 1) || meanLuma(cA) < 0.01) {
  console.error('\nCONTROL FAILED — frames are blank or identical.');
  console.error('Every comparison below would read as "no difference" regardless of');
  console.error('the truth, so nothing is reported. Check that the render and the');
  console.error('toDataURL happen in ONE page.evaluate (sweep.mjs §49).');
  await browser.close(); server.close();
  process.exit(2);
}

console.log(`\nrate sensitivity: ${RATE_A} fps vs ${RATE_B} fps, ${positions.length} samples\n`);
console.log('  position  scene                        seconds     RMSE');
const rows = [];
for (const p of positions) {
  const [A, B] = [await shoot(a.page, p), await shoot(b.page, p)];
  const r = rmse(A, B);
  const sc = sceneAt(p);
  rows.push({ pos: hex(p), posNum: p, scene: sc.name, obj: sc.obj,
              seconds: +positionToSeconds(p).toFixed(2), rmse: +r.toFixed(3) });
  console.log(`  ${hex(p)}    ${sc.name.padEnd(28)} ${String(positionToSeconds(p).toFixed(1)).padStart(7)}` +
              `  ${r.toFixed(3).padStart(8)}`);
}

// ---- per scene, worst first. The ranking is the inventory: read code where
//      the number is large, not where a pattern happened to be greppable.
const byScene = new Map();
for (const r of rows) {
  if (!byScene.has(r.scene)) byScene.set(r.scene, []);
  byScene.get(r.scene).push(r.rmse);
}
const summary = [...byScene.entries()].map(([scene, v]) => ({
  scene, samples: v.length,
  max: +Math.max(...v).toFixed(2),
  median: +v.slice().sort((x, y) => x - y)[Math.floor(v.length / 2)].toFixed(2),
})).sort((x, y) => y.max - x.max);

console.log('\nper scene, worst first');
console.log('  scene                        samples     max   median');
for (const s of summary) {
  console.log(`  ${s.scene.padEnd(28)} ${String(s.samples).padStart(7)} ${String(s.max).padStart(7)} ${String(s.median).padStart(8)}`);
}

const floor = Math.min(...rows.map((r) => r.rmse));
console.log(`\nnoise floor (least sensitive sample): ${floor.toFixed(3)}`);
console.log('Float accumulation over a different number of steps cannot give exactly');
console.log('zero, so that value is this instrument\'s zero. Judge everything against it.');
const errs = [...a.errs, ...b.errs];
if (errs.length) console.log(`\npage errors: ${errs.length}\n  ${errs.slice(0, 5).join('\n  ')}`);

if (JSON_OUT) {
  const out = path.join(PROD, JSON_OUT);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    generated: new Date().toISOString(), rateA: RATE_A, rateB: RATE_B,
    control: +control.toFixed(3), noiseFloor: +floor.toFixed(3), summary, samples: rows,
  }, null, 2));
  console.log(`\nwrote ${JSON_OUT}`);
}

await browser.close();
server.close();
