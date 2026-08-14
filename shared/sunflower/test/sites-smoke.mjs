import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const screenshotDirectory = process.env.SUNFLOWER_SCREENSHOT_DIR;
if (screenshotDirectory) fs.mkdirSync(screenshotDirectory, { recursive: true });
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.xm': 'application/octet-stream',
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filename = path.resolve(repo, `.${pathname}`);
  if (!filename.startsWith(`${repo}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const stat = fs.statSync(filename);
    const resolved = stat.isDirectory() ? path.join(filename, 'index.html') : filename;
    response.writeHead(200, { 'content-type': mime[path.extname(resolved)] ?? 'application/octet-stream' });
    response.end(fs.readFileSync(resolved));
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
  for (const [site, ready, time] of [
    ['productions/wonder/web', '__wonderReady', 1],
    ['productions/wonder/web', '__wonderReady', 10],
    ['productions/wonder/web', '__wonderReady', 22],
    ['productions/wonder/web', '__wonderReady', 45],
    ['productions/wonder/web', '__wonderReady', 52.2],
    ['productions/wonder/web', '__wonderReady', 56],
    ['productions/wonder/web', '__wonderReady', 60],
    ['productions/wonder/web', '__wonderReady', 64.326],
    ['productions/wonder/web', '__wonderReady', 69.753],
    ['productions/wonder/web', '__wonderReady', 86.626],
    ['productions/wonder/web', '__wonderReady', 103.5],
    ['productions/wonder/web', '__wonderReady', 121.25],
    ['productions/wonder/web', '__wonderReady', 138.302],
    ['productions/wonder/web', '__wonderReady', 138.5],
    ['productions/wonder/web', '__wonderReady', 148.871],
    ['productions/wonder/web', '__wonderReady', 155.44],
    ['productions/wonder/web', '__wonderReady', 159.44],
    ['productions/wonder/web', '__wonderReady', 164.009],
    ['productions/wonder/web', '__wonderReady', 172],
    ['productions/wonder/web', '__wonderReady', 176],
    ['productions/wonder/web', '__wonderReady', 178.517],
    ['productions/wonder/web', '__wonderReady', 185.035],
    ['productions/energia/web', '__energiaReady', 1],
    ['productions/energia/web', '__energiaReady', 15],
    ['productions/energia/web', '__energiaReady', 44],
    ['productions/energia/web', '__energiaReady', 50],
    ['productions/energia/web', '__energiaReady', 60],
    ['productions/energia/web', '__energiaReady', 63],
    ['productions/energia/web', '__energiaReady', 69],
    ['productions/energia/web', '__energiaReady', 81.999],
    ['productions/energia/web', '__energiaReady', 122],
    ['productions/energia/web', '__energiaReady', 127],
    ['productions/energia/web', '__energiaReady', 131.999],
    ['productions/energia/web', '__energiaReady', 136],
    ['productions/energia/web', '__energiaReady', 144.5],
    ['productions/energia/web', '__energiaReady', 146.5],
    ['productions/energia/web', '__energiaReady', 156],
    ['productions/energia/web', '__energiaReady', 160],
    ['productions/energia/web', '__energiaReady', 170],
    ['productions/energia/web', '__energiaReady', 190],
    ['productions/energia/web', '__energiaReady', 220],
    ['productions/energia/web', '__energiaReady', 233],
    ['productions/energia/web', '__energiaReady', 250],
    ['productions/energia/web', '__energiaReady', 270],
  ]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
    await page.goto(`http://127.0.0.1:${server.address().port}/${site}/?t=${time}&debug`, { waitUntil: 'networkidle0' });
    await page.waitForFunction((name) => window[name] === true, {}, ready);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const booted = await page.evaluate((name) => window[name] === true, ready);
    const frame = await page.evaluate((currentSite) => {
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2');
      const rawTextures = currentSite === 'productions/wonder/web'
        ? window.__wonderRawTextures : window.__energiaRawTextures;
      const timeline = currentSite === 'productions/wonder/web'
        ? window.__wonderTimeline : window.__energiaTimeline;
      return { glError: gl.getError(), rawTextures: rawTextures?.size, clips: timeline?.clips.length };
    }, site);
    const screenshot = await page.screenshot({ encoding: 'base64' });
    if (screenshotDirectory) {
      fs.writeFileSync(path.join(screenshotDirectory, `${site}-${time}.png`),
        Buffer.from(screenshot, 'base64'));
    }
    const nonBlack = await page.evaluate(async (png) => {
      const image = new Image();
      image.src = `data:image/png;base64,${png}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, image.width, Math.max(1, image.height - 60)).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] || pixels[i + 1] || pixels[i + 2]) count++;
      }
      return count;
    }, screenshot);
    console.log(`${site}@${time}: boot=${booted} glError=${frame.glError} nonBlack=${nonBlack} rawTextures=${frame.rawTextures} clips=${frame.clips} pageErrors=${errors.length}`);
    const expectedRaw = site === 'productions/wonder/web' ? 12 : 8;
    const expectedClips = site === 'productions/wonder/web' ? 22 : 21;
    if (!booted || frame.glError || nonBlack < 16 || frame.rawTextures !== expectedRaw
        || frame.clips !== expectedClips || errors.length) failed = true;
    await page.close();
  }

  for (const [site, ready, clockName] of [
    ['productions/wonder/web', '__wonderReady', '__wonderClock'],
    ['productions/energia/web', '__energiaReady', '__energiaClock'],
  ]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
    await page.goto(`http://127.0.0.1:${server.address().port}/${site}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((name) => window[name] === true, {}, ready);
    await page.click('#start');
    await page.waitForFunction((name) => window[name]?.timeSeconds() > 0.05,
      { timeout: 5000 }, clockName);
    const audioTime = await page.evaluate((name) => window[name].timeSeconds(), clockName);
    console.log(`${site} audio: time=${audioTime.toFixed(3)}s pageErrors=${errors.length}`);
    if (!(audioTime > 0.05) || errors.length) failed = true;
    await page.close();
  }

  // Sweep the entire recovered show interval in one-second increments and at
  // every clip start/midpoint/end. This exercises each registered layer while
  // retaining one loaded GL context, so it is deterministic and fast enough
  // for routine regression testing.
  for (const [site, ready, renderName, end] of [
    ['productions/wonder/web', '__wonderReady', '__wonderRenderAt', 186.5],
    ['productions/energia/web', '__energiaReady', '__energiaRenderAt', 290],
  ]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
    await page.goto(`http://127.0.0.1:${server.address().port}/${site}/?t=0&debug`,
      { waitUntil: 'networkidle0' });
    await page.waitForFunction((name) => window[name] === true, {}, ready);
    const sweep = await page.evaluate(({ currentSite, renderer, showEnd }) => {
      const timeline = currentSite === 'productions/wonder/web'
        ? window.__wonderTimeline : window.__energiaTimeline;
      const renderAt = window[renderer];
      const times = new Set([0, showEnd]);
      for (let seconds = 0; seconds <= showEnd; seconds++) times.add(seconds);
      for (const clip of timeline.clips) {
        for (const seconds of [clip.start, (clip.start + clip.end) / 2, clip.end]) {
          if (seconds >= 0 && seconds <= showEnd) times.add(seconds);
        }
      }
      const gl = document.querySelector('canvas').getContext('webgl2');
      const glErrors = [];
      let rendered = 0;
      for (const seconds of [...times].sort((a, b) => a - b)) {
        renderAt(seconds);
        const error = gl.getError();
        if (error !== gl.NO_ERROR) glErrors.push({ seconds, error });
        rendered++;
        // Bound the headless GPU queue; otherwise hundreds of retained-scene
        // draws can make Chrome linger during shutdown even though JS is done.
        if (rendered % 16 === 0) gl.finish();
      }
      gl.finish();
      return { rendered, glErrors };
    }, { currentSite: site, renderer: renderName, showEnd: end });
    console.log(`${site} deterministic sweep: frames=${sweep.rendered} glErrors=${sweep.glErrors.length} pageErrors=${errors.length}`);
    if (!sweep.rendered || sweep.glErrors.length || errors.length) failed = true;
    await page.close();
  }

  // The Sunflower MiniGL was extracted from PTCT and extended additively.
  // Keep a real PTCT debug seek in this suite so work on the shared descendant
  // cannot silently alter or replace PTCT's established browser runtime.
  {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
    await page.goto(`http://127.0.0.1:${server.address().port}/productions/ptct/web/?t=10&debug`,
      { waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__ptctReady === true');
    const frame = await page.evaluate(() => {
      const seek = window.__ptctSeek(10);
      const gl = document.querySelector('canvas').getContext('webgl2');
      return { ...seek, glError: gl.getError() };
    });
    console.log(`PTCT MiniGL regression: ${JSON.stringify(frame)} pageErrors=${errors.length}`);
    if (frame.glError || !Number.isFinite(frame.order) || !Number.isFinite(frame.row)
        || !Number.isFinite(frame.active) || errors.length) failed = true;
    await page.close();
  }

  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/shared/sunflower/test/minigl.html`,
    { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__miniglTest !== undefined');
  const result = await page.evaluate(() => window.__miniglTest);
  console.log(`MiniGL fixed-function test: ${JSON.stringify(result)}`);
  if (!result.pass) failed = true;
  await page.close();
} finally {
  await browser.close();
  server.close();
}

if (failed) process.exit(1);
