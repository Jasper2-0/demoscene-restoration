// Headless runner for test/minid3d8_test.html.
// Serves web/ over http, loads the page in headless Chrome (ANGLE/Metal
// like the real target), waits for window.__done and prints every result.
//
//   node --experimental-default-type=module run_minid3d8_test.mjs
//   (puppeteer-core resolves via ../../../ptct/work/js — hoisted to the repo root)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(here, '..');
const require = createRequire(path.join(here, '..', '..', '..', 'ptct', 'work', 'js', 'noop.js'));
const puppeteer = require('puppeteer-core');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.css': 'text/css',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(webRoot, rel);
  try {
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,800'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 800 });
page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(`http://127.0.0.1:${port}/test/minid3d8_test.html`, { waitUntil: 'load' });
try {
  await page.waitForFunction('window.__done === true', { timeout: 30000 });
} catch {
  console.log('TIMEOUT: the page never finished.');
}
const results = await page.evaluate(() => window.__results || []);
let pass = 0;
for (const r of results) {
  if (r.pass) pass++;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '   [' + r.detail + ']' : ''}`);
}
console.log(`\n${pass}/${results.length} passed`);

await browser.close();
server.close();
process.exit(pass === results.length && results.length > 0 ? 0 : 1);
