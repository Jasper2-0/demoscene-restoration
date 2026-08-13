// stream_trace_test.mjs — the port's LIVE build-time RNG trace vs the pins.
//
// Boots the real page with `globalThis.__bakeProbe = []` installed before any
// module runs; scene7's bake paths stamp the shared-LCG state at every
// generator boundary ("set0 pre-buildTree 0x…", "set0 pre-passes 0x…", …).
// The stamped states are asserted against re/oracle/fixtures/stream_pins.json
// — including the states the EMULATED ORIGINAL reproduced (status
// "emulator"), which makes this the end-to-end check that the port's build
// runs at the original's stream positions.  An LCG state has no near-misses:
// one wrong draw anywhere upstream moves every stamp after it.
//
//   node web/test/stream_trace_test.mjs [--cold]
//
// Runs on BOTH quality paths — the bake states are quality-invariant by
// design (the exit-state fix), and asserting that here keeps it so.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(HERE, '..', '..');
const require = createRequire(path.join(WORK, '..', 'ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const COLD = process.argv.includes('--cold');

const PINS = JSON.parse(fs.readFileSync(
  path.join(WORK, 'work/re/oracle/fixtures/stream_pins.json')));
const pinState = {};
for (const p of PINS.pins) pinState[p.state.toLowerCase()] = p;

let fails = 0;
const ok = (c, msg, extra = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + msg + (extra ? `   [${extra}]` : ''));
  if (!c) fails++;
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const data = fs.readFileSync(path.join(WORK, rel));
    res.writeHead(200, { 'Content-Type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
});

// The boundary stamps every boot must reproduce.  States are the pinned ones;
// 'emulator' status means the ORIGINAL, executing, produced the same value.
const EXPECT = [
  ['set0 pre-buildTree', '0xb9583054'],
  ['set0 post-buildTree', '0xdedf2c8d'],   // emulator-reproduced (incl. leaf tail)
  ['set0 pre-passes', '0xa661ec3b'],       // emulator-reproduced (incl. texgen 0+1)
];

async function traceBoot(quality) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.evaluateOnNewDocument(() => { globalThis.__bakeProbe = []; });
  await page.goto(`http://127.0.0.1:${PORT}/web/index.html?pos=0x0200` +
    (quality ? `&quality=${quality}` : '') + (COLD ? '&warm=0' : ''),
  { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 180000 });
  const probe = await page.evaluate(() => globalThis.__bakeProbe);
  await page.close();
  return probe;
}

for (const quality of ['original', null]) {
  const label = quality || 'remaster';
  const probe = await traceBoot(quality);
  ok(probe.length > 0, `${label}: bake probe recorded ${probe.length} stamps`);
  const stamped = {};
  for (const s of probe) {
    const m = s.match(/^(.*) (0x[0-9a-f]+)$/);
    if (m) stamped[m[1]] = m[2];
  }
  for (const [tag, want] of EXPECT) {
    const got = stamped[tag];
    const pin = pinState[want];
    ok(got === want,
       `${label}: "${tag}" == ${want}` +
       (pin && pin.status === 'emulator' ? ' (emulator-verified)' : ''),
       got || 'NOT STAMPED');
  }
  // The set-2 dandelion chain: geometry draws and record draws, counted from
  // the stamps themselves (values move with upstream content by design —
  // COUNTS are the invariant here).
  const lcgDist = (from, to, cap = 100000) => {
    let s = parseInt(from, 16) >>> 0;
    const t = parseInt(to, 16) >>> 0;
    for (let i = 0; i < cap; i++) {
      s = (Math.imul(s, 214013) + 2531011) >>> 0;
      if (s === t) return i + 1;
    }
    return -1;
  };
  if (stamped['set2 pre-buildDandelion'] && stamped['set2 post-geometry']) {
    ok(lcgDist(stamped['set2 pre-buildDandelion'], stamped['set2 post-geometry']) === 4352,
       `${label}: set2 dandelion geometry = 4352 draws`);
  } else ok(false, `${label}: set2 dandelion stamps present`);
  if (stamped['set2 post-texgens'] && stamped['set2 post-records']) {
    ok(lcgDist(stamped['set2 post-texgens'], stamped['set2 post-records']) === 512,
       `${label}: set2 dandelion records = 512 draws after the texgen reseed`);
  } else ok(false, `${label}: set2 record stamps present`);
}

await browser.close();
server.close();
console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
