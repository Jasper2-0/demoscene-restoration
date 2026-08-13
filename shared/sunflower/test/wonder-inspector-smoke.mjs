import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import puppeteer from '../../../work-ptct/js/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.env': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.tga': 'application/octet-stream',
  '.raw': 'application/octet-stream',
  '.xm': 'application/octet-stream',
  '.exp': 'application/octet-stream',
};

let hotReloadRevision = 0;
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filename = path.resolve(repo, `.${pathname}`);
  if (!filename.startsWith(`${repo}${path.sep}`)) return response.writeHead(403).end();
  try {
    const stat = fs.statSync(filename);
    const resolved = stat.isDirectory() ? path.join(filename, 'index.html') : filename;
    response.writeHead(200, { 'content-type': mime[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream' });
    const source = fs.readFileSync(resolved);
    response.end(pathname === '/productions/wonder/web/js/effects/dark-horizon.js'
      ? Buffer.concat([source, Buffer.from(`\n// hot-reload smoke revision ${hotReloadRevision}\n`)])
      : source);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal'],
});

let failed = false;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/productions/wonder/web/timeline.html?t=60`, {
    waitUntil: 'networkidle0',
  });
  await page.waitForFunction(() =>
    document.querySelectorAll('.effect-lane').length === 22
    && document.querySelectorAll('.element-card').length > 0
    && document.querySelector('#preview')?.contentWindow?.__wonderReady === true
    && document.querySelector('#hot-reload-status')?.textContent.includes('watching'),
  { timeout: 30000 });

  const initialPreviewSrc = await page.$eval('#preview', (iframe) => iframe.src);
  hotReloadRevision++;
  await page.waitForFunction((previousSrc) => {
    const iframe = document.querySelector('#preview');
    return iframe.src !== previousSrc
      && iframe.contentWindow?.__wonderReady === true
      && document.querySelector('#reload-preview')?.disabled === false
      && document.querySelector('#hot-reload-status')?.textContent.includes('watching');
  }, { timeout: 30000 }, initialPreviewSrc);

  const before = await page.evaluate(() => ({
    readout: document.querySelector('#order-readout').textContent,
    lanes: document.querySelectorAll('.effect-lane').length,
    activeBars: document.querySelectorAll('.clip-bar.active').length,
    cards: document.querySelectorAll('.element-card').length,
    assetLinks: document.querySelectorAll('.element-card .asset-chip').length,
    materialGroups: document.querySelectorAll('.element-card .material-maps').length,
    previewReady: document.querySelector('#preview').contentWindow.__wonderReady,
    previewErrors: document.querySelector('#preview').contentWindow
      .document.querySelector('#status').textContent,
    hotReloadStatus: document.querySelector('#hot-reload-status').textContent,
    hotReloadTime: Number(new URL(document.querySelector('#preview').src).searchParams.get('t')),
  }));
  await page.click('#next-order');
  const after = await page.$eval('#time', (input) => Number(input.value));
  await page.screenshot({ path: '/private/tmp/wonder-timeline-smoke.png', fullPage: true });
  console.log(JSON.stringify({ before, after, pageErrors: errors }, null, 2));
  if (before.lanes !== 22 || before.activeBars !== 3 || before.cards !== 3
      || before.assetLinks < 3 || before.materialGroups < 2 || !before.previewReady
      || Math.abs(before.hotReloadTime - 60) > 0.001
      || Math.abs(after - 61.18) > 0.001 || errors.length) failed = true;
  await page.close();
} finally {
  await browser.close();
  server.close();
}

if (failed) process.exit(1);
