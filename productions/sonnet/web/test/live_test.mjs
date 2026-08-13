// live_test.mjs — smoke test for the audio-driven runtime.
//
// The single-frame path (?pos=) is exercised by capture.mjs. This one checks the
// thing that path cannot: that live XM playback produces an AUDIBLE music position,
// that the millisecond clock is continuous rather than stepping once per row, and
// that the poem actually advances while the module plays.
//
// Run: node web/test/live_test.mjs

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(HERE, '..', '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

let fails = 0;
const ok = (c, m, e = '') => { console.log((c ? 'PASS' : 'FAIL') + '  ' + m + (e ? `   [${e}]` : '')); if (!c) fails++; };

// '.mjs' was missing, so every generator module (js/texgen.mjs, js/meshgen.mjs,
// js/resources.mjs, audio/*.mjs) was served as application/octet-stream and rejected
// by the strict MIME check for module scripts — the page never booted and the test
// timed out at the click. Pre-existing; it bites harder now that the audio modules
// are in the browser's module graph too.
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png' };
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
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 640 });
const errors = [], missing = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() === 404) missing.push(new URL(r.url()).pathname); });
page.on('console', m => {
  // 404s are reported separately below; scenes.js is a deliberate optional import.
  if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text());
});

await page.goto(`http://127.0.0.1:${port}/web/index.html?debug`, { waitUntil: 'networkidle0' });
await page.click('#overlay');
await page.waitForFunction('window.__sonnetClock && window.__sonnetClock.pos > 0', { timeout: 30000 });

// Sample the clock over ~4 s of playback.
const samples = [];
for (let i = 0; i < 40; i++) {
  samples.push(await page.evaluate(() => ({ ...window.__sonnetClock, wall: performance.now() })));
  await new Promise(r => setTimeout(r, 100));
}
await browser.close();
server.close();

const first = samples[0], last = samples[samples.length - 1];
ok(errors.length === 0, 'no page errors during live playback', errors.slice(0, 3).join(' | ') || 'clean');
const unexpected = missing.filter(u => !/scenes\.js$|favicon/.test(u));
ok(unexpected.length === 0, 'the only missing assets are the optional scene seam',
   unexpected.length ? unexpected.join(' ') : [...new Set(missing)].join(' ') || 'none');
ok(last.pos > first.pos, 'music position advances', `0x${first.pos.toString(16)} -> 0x${last.pos.toString(16)}`);

// songMs must track wall time 1:1 — it is the audio clock, interpolated.
const dMs = last.songMs - first.songMs, dWall = last.wall - first.wall;
ok(Math.abs(dMs / dWall - 1) < 0.05, 'the millisecond clock runs at real time',
   `${(dMs / dWall).toFixed(3)}x over ${(dWall / 1000).toFixed(1)} s`);

// CONTINUITY is the whole point of the tagging scheme: if songMs only moved when the
// row changed, consecutive 100 ms samples would repeat. Count distinct values.
const distinct = new Set(samples.map(s => Math.round(s.songMs))).size;
ok(distinct >= samples.length - 1, 'the clock is continuous, not stepping once per row',
   `${distinct}/${samples.length} distinct`);

// rowFrac must sweep the whole 0..1 range rather than sitting at an endpoint.
const fr = samples.map(s => s.rowFrac);
ok(Math.min(...fr) < 0.25 && Math.max(...fr) > 0.75, 'rowFrac sweeps 0..1',
   `${Math.min(...fr).toFixed(2)}..${Math.max(...fr).toFixed(2)}`);

// The position must track the clock: at 0.163 s per row the rows elapsed over the
// sampled window should match the music time to within a row or two.
const rows = ((last.pos >> 8) * 64 + (last.pos & 0xff)) - ((first.pos >> 8) * 64 + (first.pos & 0xff));
const expected = dMs / 1000 / (6 * 2.5 / 92);
ok(Math.abs(rows - expected) <= 2, 'the audible position and the clock agree',
   `${rows} rows vs ${expected.toFixed(1)} expected`);

// The tag queue must stay bounded — an unbounded one means the consumer never
// catches up, i.e. we are rendering the wrong (render-ahead) position.
ok(last.tags < 64, 'the tag queue stays short (we are consuming the audible tags)',
   String(last.tags));

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
