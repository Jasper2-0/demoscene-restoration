// Integration verification: boot the port headless, seek to timeline positions,
// screenshot the canvas, and montage side-by-side with the reference capture.
// Usage: node capture.mjs [t1 t2 ...]   (defaults: one shot per scene block)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import canvasPkg from 'canvas';

const { createCanvas, loadImage } = canvasPkg;
const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.join(here, '..', '..', 'web');
const refVideo = path.join(here, '..', 'reference', 'ptct_reference.mkv');
const outDir = path.join(here, 'shots');
fs.mkdirSync(outDir, { recursive: true });

const REF_OFFSET = 4.431;
// default: middle of each major scene block (music seconds)
const DEFAULTS = [5, 30, 47, 62, 78, 93, 110, 122, 138, 150, 165, 178, 188, 198, 215, 226, 235, 245];
// optional --tess=N / --quality=original are passed through to the page URL
// and tag the output filenames (ours_5_tess4.png / cmp_5_tess4.png)
const args = process.argv.slice(2);
let urlExtra = '', tag = '';
for (const a of args) {
  const m = a.match(/^--(tess|quality)=(.+)$/);
  if (m) { urlExtra += `&${m[1]}=${encodeURIComponent(m[2])}`; tag += `_${m[1]}${m[2]}`; }
}
const times = args.filter((a) => !a.startsWith('--')).map(Number).filter((x) => !Number.isNaN(x));
const TIMES = times.length ? times : DEFAULTS;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.m4a': 'audio/mp4', '.as1': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(webRoot, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  try {
    const data = fs.readFileSync(p.endsWith('/') ? p + 'index.html' : p);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=1000,1000'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1000, height: 1000 });
page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto(`http://127.0.0.1:${port}/index.html?debug${urlExtra}`, { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__ptctReady === true', { timeout: 30000 });

for (const t of TIMES) {
  const info = await page.evaluate((tt) => window.__ptctSeek(tt), t);
  await new Promise((r) => setTimeout(r, 60));
  const el = await page.$('#screen');
  const shot = path.join(outDir, `ours_${t}${tag}.png`);
  await el.screenshot({ path: shot });

  const refShot = path.join(outDir, `ref_${t}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-ss', String(t + REF_OFFSET), '-i', refVideo,
    '-frames:v', '1', '-vf', 'scale=640:480', refShot, '-y']);

  // side-by-side montage (ours stretched to 4:3 like the display)
  const ours = await loadImage(shot);
  const ref = await loadImage(refShot);
  const c = createCanvas(1280, 480);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, 1280, 480);
  ctx.drawImage(ours, 0, 0, 640, 480);
  ctx.drawImage(ref, 640, 0, 640, 480);
  ctx.fillStyle = '#0f0'; ctx.font = '14px monospace';
  ctx.fillText(`OURS t=${t}s order=${info.order} row=${info.row} fx=${info.active}`, 8, 16);
  ctx.fillText('REFERENCE', 648, 16);
  fs.writeFileSync(path.join(outDir, `cmp_${t}${tag}.png`), c.toBuffer('image/png'));
  console.log(`t=${t}s (order ${info.order} row ${info.row}, ${info.active} fx) captured`);
}

await browser.close();
server.close();
console.log('done →', outDir);
