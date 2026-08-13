// coverage_mashi.mjs — WHICH CODE NEVER RUNS?
//
//   node tools/coverage_mashi.mjs [--positions=0x0400,0x1200] [--json]
//
// The size build's cut-list should be measured, not guessed.  This drives the
// UNTOUCHED readable build (productions/sonnet/web) through every scene under
// V8's precise coverage, then reports, per source file, the byte ranges that
// were never executed — ranked by size.  Those ranges are the candidates for
// deletion in web-mashi.
//
// Two honest caveats, both of which make this a CANDIDATE list and not a
// verdict:
//   * it samples the demo at a grid of music positions through the single-frame
//     path, so anything that only runs in live playback (the audio clock, the
//     XM player's effect handlers, the click/resize handlers) shows as dead
//     when it is not.  `--live` adds a real playback pass to cover exactly
//     that;
//   * a range that is dead across this run may still be reachable on another
//     GPU, another quality setting, or a browser the sweep does not use.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const WORK = path.join(ROOT, 'productions/sonnet');
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const LIVE = argv.includes('--live');
// Smallest dead region worth listing.  The default hides exactly the kind of
// branch-level dead code that dominates a mature module like the D3D8 shim.
const MINREGION = Number(arg('minregion', 400));
const ONLY = arg('only', '');

// One position per scene plus the transitions either side of each cut: enough
// to touch every scene builder, every material path and every timeline object.
const POSITIONS = arg('positions', [
  '0x0210', '0x0300', '0x0400', '0x0500', '0x0600', '0x0700', '0x0800', '0x0900',
  '0x0a00', '0x0b00', '0x0c00', '0x0f00', '0x1000', '0x1100', '0x1200', '0x1300',
  '0x1500', '0x1700', '0x1900', '0x1b00', '0x1e00', '0x2000', '0x2200', '0x2300',
  '0x2500', '0x2800', '0x2b00',
].join(',')).split(',');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream',
               '.xm': 'application/octet-stream', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const p = path.join(WORK, decodeURIComponent(req.url.split('?')[0]));
  let body;
  try { body = fs.readFileSync(p); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  res.end(body);
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
  protocolTimeout: 900000,
});
const page = await browser.newPage();
// Precise coverage slows V8 enough that the default 30 s navigation timeout
// expires during the boot's texture generation.
page.setDefaultNavigationTimeout(600000);
page.setDefaultTimeout(600000);
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const cdp = await page.createCDPSession();
await cdp.send('Profiler.enable');
await cdp.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

console.log(`driving ${POSITIONS.length} positions through the readable build...`);
await page.goto(`http://127.0.0.1:${port}/web/index.html?pos=${POSITIONS[0]}`,
  { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__sonnetReady === true', { timeout: 300000 });
for (const p of POSITIONS) {
  await page.evaluate((x) => window.__sonnetRender(x), p);
}

let liveResult = [];
if (LIVE) {
  // Live playback exercises what the single-frame path cannot: the audio clock,
  // the XM player's effect handling, the resize/fit path and the event loop.
  console.log('adding a live playback pass...');
  const p2 = await browser.newPage();
  p2.setDefaultNavigationTimeout(600000);
  p2.setDefaultTimeout(600000);
  // ⚠ A SECOND PAGE IS A SECOND ISOLATE, so its coverage is NOT in the first
  // session's report.  Collecting only the first made every live-playback path
  // — the whole XM effect engine — look dead; acting on that would have deleted
  // the player.  Start coverage here too and merge both reports below.
  const cdp2 = await p2.createCDPSession();
  await cdp2.send('Profiler.enable');
  await cdp2.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });
  await p2.goto(`http://127.0.0.1:${port}/web/index.html`, { waitUntil: 'domcontentloaded' });
  await p2.waitForSelector('#overlay');
  await p2.click('#overlay');
  await p2.waitForFunction('window.__sonnetClock && window.__sonnetClock.pos > 0', { timeout: 300000 });
  await new Promise((r) => setTimeout(r, 20000));
  liveResult = (await cdp2.send('Profiler.takePreciseCoverage')).result;
  await p2.close();
}

const { result: posResult } = await cdp.send('Profiler.takePreciseCoverage');
const result = [...posResult, ...liveResult];
await browser.close();
server.close();

// ---- never-called FUNCTIONS ----------------------------------------------
// `callCount: true` gives a per-function count, which answers a sharper question
// than dead byte ranges: which whole functions can be DELETED.  A function is
// reported only if every report agrees it never ran.
const fnCalls = new Map();   // "file::name@offset" -> {count, size, file, name, line}
for (const script of result) {
  if (!script.url.includes(`127.0.0.1:${port}`)) continue;
  const rel = script.url.split(`:${port}/`)[1]?.split('?')[0];
  if (!rel || !/\.(js|mjs)$/.test(rel)) continue;
  const src = fs.readFileSync(path.join(WORK, rel), 'utf8');
  for (const fn of script.functions) {
    if (!fn.functionName) continue;
    const r = fn.ranges[0];
    const key = `${rel}::${fn.functionName}@${r.startOffset}`;
    const prev = fnCalls.get(key);
    const count = r.count | 0;
    if (prev) prev.count += count;
    else fnCalls.set(key, { count, size: r.endOffset - r.startOffset, file: rel,
                            name: fn.functionName,
                            line: src.slice(0, r.startOffset).split('\n').length });
  }
}
const never = [...fnCalls.values()].filter((f) => f.count === 0 && f.size > 60)
  .sort((a, b) => b.size - a.size);
console.log('\nNEVER-CALLED FUNCTIONS (raw source bytes, comments included):\n');
const byFile = new Map();
for (const f of never) byFile.set(f.file, (byFile.get(f.file) || 0) + f.size);
for (const [file, tot] of [...byFile.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${String(tot).padStart(6)}  ${file}`);
  for (const f of never.filter((x) => x.file === file).slice(0, 14)) {
    console.log(`          ${String(f.size).padStart(5)}  ${f.name}  :${f.line}`);
  }
}

// ---- fold the ranges ------------------------------------------------------
// V8 reports, per script, a tree of ranges with a count.  A range with count 0
// is code that never ran; nested covered ranges carve holes in it, so walk the
// list and keep only what is still uncovered at the deepest level.
const files = new Map();
for (const script of result) {
  if (!script.url.includes(`127.0.0.1:${port}`)) continue;
  const rel = script.url.split(`:${port}/`)[1]?.split('?')[0];
  if (!rel || !/\.(js|mjs)$/.test(rel)) continue;
  const src = fs.readFileSync(path.join(WORK, rel), 'utf8');
  const dead = new Uint8Array(src.length);      // 1 = never executed
  for (const fn of script.functions) {
    for (const r of fn.ranges) {
      const v = r.count === 0 ? 1 : 0;
      for (let i = r.startOffset; i < Math.min(r.endOffset, dead.length); i++) dead[i] = v;
    }
  }
  const prev = files.get(rel);
  if (prev) { for (let i = 0; i < dead.length; i++) prev.dead[i] &= dead[i]; }
  else files.set(rel, { dead, src });
}

// ---- report ---------------------------------------------------------------
// Comments are not code and the size build strips them anyway, so counting raw
// dead bytes would flatter every heavily-documented file in this repo.  Report
// dead NON-COMMENT bytes, which is what deleting the range would actually save.
const stripped = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const rows = [];
for (const [rel, { dead, src }] of files) {
  const runs = [];
  let start = -1;
  for (let i = 0; i <= dead.length; i++) {
    if (i < dead.length && dead[i]) { if (start < 0) start = i; }
    else if (start >= 0) { runs.push([start, i]); start = -1; }
  }
  let deadCode = 0;
  const big = [];
  for (const [a, b] of runs) {
    const n = stripped(src.slice(a, b)).replace(/\s+/g, ' ').trim().length;
    deadCode += n;
    if (n > MINREGION) {
      big.push({ line: src.slice(0, a).split('\n').length, bytes: n,
                 head: src.slice(a, b).replace(/\s+/g, ' ').trim().slice(0, 72) });
    }
  }
  const total = stripped(src).replace(/\s+/g, ' ').trim().length;
  rows.push({ rel, deadCode, total, pct: 100 * deadCode / Math.max(1, total), big });
}
rows.sort((a, b) => b.deadCode - a.deadCode);

if (argv.includes('--json')) {
  fs.writeFileSync(path.join(ROOT, 'dist/coverage.json'), JSON.stringify(rows, null, 1));
  console.log('wrote dist/coverage.json');
}
console.log('\nNEVER EXECUTED, by file (comment-stripped bytes):\n');
console.log('   dead     of    %   file');
let sum = 0;
for (const r of rows) {
  if (r.deadCode < 200) continue;
  sum += r.deadCode;
  console.log(`  ${String(r.deadCode).padStart(6)} ${String(r.total).padStart(6)} ${r.pct.toFixed(0).padStart(4)}%   ${r.rel}`);
}
console.log(`  ${String(sum).padStart(6)}                total dead code`);
console.log('\nlargest individual dead regions:\n');
const allBig = rows.flatMap((r) => r.big.map((b) => ({ ...b, rel: r.rel })));
allBig.sort((a, b) => b.bytes - a.bytes);
for (const b of allBig.filter((b) => !ONLY || b.rel.includes(ONLY)).slice(0, 60)) {
  console.log(`  ${String(b.bytes).padStart(5)}  ${b.rel}:${b.line}\n         ${b.head}`);
}
