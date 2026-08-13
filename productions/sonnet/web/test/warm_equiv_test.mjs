// Proves that __sonnetRenderSeq (incremental warm-up) produces the SAME frames as
// __sonnetRender (cold warm-up every time) for an ascending sequence of positions.
//
// The sweep switches to the incremental path for speed — one linear replay instead
// of one per sample. That is only legitimate if the two are equivalent, and the
// claim is not obvious: scene objects accumulate state, and precipitation draws
// from a module-global RNG during render. So measure it rather than assert it.
//
// Run: node web/test/warm_equiv_test.mjs

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');          // productions/sonnet/
const REPO = path.resolve(ROOT, '..', '..');          // demoscene-restoration/
const require = createRequire(path.join(REPO, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// Ascending, spanning several scene handovers so accumulated state really differs.
//
// COVERAGE LESSON (2026-08-05): the first version of this list straddled the
// precipitation windows instead of sitting inside them, passed 9/9, and a wider
// 45-sample sweep then found 4 positions that DID differ — all of them in rain
// (from 0x1b00) or snow (from 0x2000), because `render()` mutates particle state.
// An equivalence test must sample where the state that could differ is LIVE.
const POSITIONS = [
  0x0300, 0x0450, 0x0730, 0x0a30, 0x0f30, 0x1210, 0x1710,
  0x1b10, 0x1c00, 0x1c30, 0x1d00, 0x1e10,          // rain window
  0x2000, 0x2100, 0x2200, 0x2310, 0x2600, 0x2a30,  // snow window
];

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png', '.xm': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(p, (e, b) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(b);
  });
});
await new Promise(r => server.listen(0, r));
const PORT = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--use-angle=metal', '--enable-unsafe-webgpu', '--no-sandbox'],
});

async function run(fnName) {
  const page = await browser.newPage();
  await page.setViewport({ width: 640, height: 480, deviceScaleFactor: 1 });
  // Extra query params so a runtime switch can be A/B'd without editing the
  // port: `node warm_equiv_test.mjs --lighting=legacy`.
  const EXTRA = (process.argv.find((a) => a.startsWith('--lighting=')) || '')
    .replace('--lighting=', '');
  await page.goto(`http://127.0.0.1:${PORT}/web/index.html?pos=0x0000&debug`
                  + (EXTRA ? `&lighting=${EXTRA}` : ''),
                  { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 120000 });
  const ready = await page.evaluate(() => window.__scenesReady);
  if (ready && ready.ok === false) throw new Error('scene build failed: ' + ready.error);
  const out = [];
  for (const pos of POSITIONS) {
    const r = await page.evaluate((fn, p) => {
      const c = document.getElementById('screen');
      window[fn](p);
      return { png: c.toDataURL('image/png'), gl: c.getContext('webgl2').getError() };
    }, fnName, pos);
    out.push(r);
  }
  await page.close();
  return out;
}

console.log(`comparing __sonnetRender (cold each time) vs __sonnetRenderSeq (incremental)`);
console.log(`over ${POSITIONS.length} ascending positions\n`);

const cold = await run('__sonnetRender');
const seq  = await run('__sonnetRenderSeq');

let fails = 0;
POSITIONS.forEach((pos, i) => {
  const hex = '0x' + pos.toString(16).padStart(4, '0');
  const same = cold[i].png === seq[i].png;
  const glOk = cold[i].gl === 0 && seq[i].gl === 0;
  console.log(`${same && glOk ? 'PASS' : 'FAIL'}  ${hex}  ${same ? 'byte-identical' : 'DIFFERS'}` +
              `${glOk ? '' : `  glError cold=${cold[i].gl} seq=${seq[i].gl}`}`);
  if (!same || !glOk) fails++;
});

console.log(`\n${fails === 0 ? 'ALL PASS — incremental warm-up is equivalent'
                             : fails + ' FAILED — incremental warm-up is NOT equivalent, do not use it'}`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
