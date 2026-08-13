// dist_test.mjs — prove the BUILT SITE boots and renders on its own.
//
//   ./build-sonnet.sh && node productions/sonnet/web/test/dist_test.mjs
//
// Served from `dist/sonnet-webgl` as the document root, with the server
// REFUSING to read outside it. That refusal is the whole point: the working
// tree keeps generators and data one level up (`../../work/js/`, `../unpacked/`),
// so a dist that quietly still resolved those would pass every other check and
// then 404 the moment it was uploaded anywhere.
//
// Checks, in the order they can fail:
//   1. every request the page makes is answered (no 404s at all — the build
//      ships a favicon so even that one is covered);
//   2. no page errors and no console errors;
//   3. the scene graph built (`__scenesReady`), not the text-only fallback
//      main.js falls back to when scenes.js throws;
//   4. a real frame comes out — non-black coverage and `getError() === 0`.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..', '..', '..');
const DIST = path.join(REPO, 'dist/sonnet-webgl');
const require = createRequire(path.join(REPO, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

let fails = 0;
const ok = (c, m, e = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + m + (e ? `   [${e}]` : ''));
  if (!c) fails++;
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('no build at ' + DIST + ' — run ./build-sonnet.sh first');
  process.exit(2);
}

// ⚠ THIS TABLE DELIBERATELY MIMICS A NAIVE REAL HOST, and it has NO `.mjs`
// entry. An earlier version of this test mapped `.mjs` to `text/javascript`,
// which made it *more permissive than the web* and let a broken deploy pass:
// www.jasperschelling.nl serves `.mjs` with no Content-Type at all, browsers
// enforce a JavaScript MIME type for module scripts, and the live site rendered
// its static overlay and did nothing. A harness that is kinder than production
// is worse than no harness. Anything not listed here is served with NO
// Content-Type, exactly as that host does.
const MIME = { '.html': 'text/html', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.ico': 'image/png',
  '.bin': 'application/octet-stream', '.xm': 'application/octet-stream', '.md': 'text/plain' };

const missed = [];
const server = http.createServer((q, s) => {
  const url = decodeURIComponent(q.url.split('?')[0]);
  let p = path.join(DIST, url);
  if (!p.startsWith(DIST)) { missed.push('ESCAPE ' + url); s.writeHead(403); s.end(); return; }
  try { if (fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); } catch { /* below */ }
  try {
    const d = fs.readFileSync(p);
    const type = MIME[path.extname(p)];
    // No fallback type on purpose — see the note on MIME above.
    s.writeHead(200, type ? { 'Content-Type': type } : {});
    s.end(d);
  } catch { missed.push(url); s.writeHead(404); s.end(); }
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
await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });

await page.goto(`http://127.0.0.1:${port}/?pos=0x0d18&debug`, { waitUntil: 'networkidle0' });

// A module that fails MIME checking produces console errors and then simply
// never runs, so `__sonnetReady` hangs. Waiting the full timeout and dying on a
// puppeteer stack trace hides the actual cause, which is already sitting in
// `errors`. Fail fast and print it.
let booted = true;
try {
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 120000 });
} catch {
  booted = false;
}
if (!booted) {
  ok(false, 'the page reached __sonnetReady',
     errors.length ? errors.slice(0, 3).join(' | ') : 'timed out with no console error');
  console.log('\n  The overlay markup is STATIC, so a page that loads no JS still shows');
  console.log('  "click to start" and looks alive. Check the console errors above.');
  await browser.close();
  server.close();
  process.exit(1);
}

const r = await page.evaluate(() => {
  const c = document.getElementById('screen');
  const gl = c.getContext('webgl2');
  // Render and read in the SAME task: the presented buffer is not guaranteed
  // to survive to a later one, and reading a stale/cleared buffer reports a
  // working build as black.
  window.__sonnetRender(0x0d18);
  const px = new Uint8Array(c.width * c.height * 4);
  gl.readPixels(0, 0, c.width, c.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let nonBlack = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 24) nonBlack++;
  return {
    w: c.width, h: c.height, glError: gl.getError(),
    nonBlackPct: +(100 * nonBlack / (px.length / 4)).toFixed(1),
    scenes: !!globalThis.__scenesReady,
  };
});
await browser.close();
server.close();

// Checked before the render assertions because it explains them when it fails.
const shipped = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else shipped.push(path.relative(DIST, p));
  }
})(DIST);
const mjs = shipped.filter((f) => f.endsWith('.mjs'));
ok(mjs.length === 0, 'no .mjs shipped (hosts without that MIME entry break modules)',
   mjs.length ? mjs.join(', ') : `${shipped.length} files, all web-safe extensions`);

ok(missed.length === 0, 'every request the built site makes is answered',
   missed.length ? missed.slice(0, 5).join(', ') : 'no 404s');
ok(errors.length === 0, 'no page or console errors',
   errors.length ? errors.slice(0, 2).join(' | ') : 'clean');
ok(r.scenes, 'the scene graph built (not the text-only fallback)');
ok(r.glError === 0, 'gl.getError() === 0', String(r.glError));
ok(r.nonBlackPct > 20, 'a real frame rendered', `${r.nonBlackPct}% non-black at ${r.w}x${r.h}`);

console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
