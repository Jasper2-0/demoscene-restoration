import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '../../../work-ptct/js/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js';

import { parseEnvelope, sampleEnvelope } from '../js/envelope.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const screenshotDirectory = process.env.SUNFLOWER_SCREENSHOT_DIR;
if (screenshotDirectory) fs.mkdirSync(screenshotDirectory, { recursive: true });
const circleAlpha = parseEnvelope(fs.readFileSync(
  path.join(repo, 'productions/wonder/work/unpacked/won_der/alpha_circle.env'), 'utf8'));
const exitEnvelope = parseEnvelope(fs.readFileSync(
  path.join(repo, 'productions/wonder/work/unpacked/won_der/koniec_intra.env'), 'utf8'));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
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
    response.writeHead(200, {
      'content-type': mime[path.extname(resolved)] ?? 'application/octet-stream',
    });
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

const variants = [
  'full-current',
  'wonder-environment',
  'primary-only',
  'environment-only',
  'duplicated-uv',
  'gl-sphere-map',
  'wonder-environment-no-class-alpha',
];
const times = [1, 10, 11.681];
const results = [];
let failed = false;
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
  await page.goto(`http://127.0.0.1:${server.address().port}/productions/wonder/web/?t=10&debug&embedded`,
    { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__wonderReady === true');
  const canvas = await page.$('#screen');
  for (const localTime of times) {
    const pulse = sampleEnvelope(circleAlpha, localTime);
    const commonAlpha = (1 - sampleEnvelope(exitEnvelope, localTime - 1) * 0.01)
      * (pulse + 0.2);
    for (const variant of variants) {
      const stats = await page.evaluate(({ currentVariant, time, pulseValue, alpha }) => {
        const renderer = window.__wonderScenes.get('beginning.exp').renderer;
        if (currentVariant === 'full-current') {
          window.__wonderRenderAt(time);
        } else {
          const originalTextures = renderer.materialTextures[1];
          let textures = originalTextures;
          let environmentUnits = new Map([[1, new Set([1])]]);
          let sphereUnits = null;
          let opacityScale = alpha;
          if (currentVariant === 'primary-only') {
            textures = [originalTextures[0], null];
            environmentUnits = new Map([[1, new Set()]]);
          } else if (currentVariant === 'environment-only') {
            textures = [renderer.mgl.whiteTex, originalTextures[1]];
          } else if (currentVariant === 'duplicated-uv') {
            environmentUnits = new Map([[1, new Set()]]);
          } else if (currentVariant === 'gl-sphere-map') {
            environmentUnits = new Map([[1, new Set()]]);
            sphereUnits = new Map([[1, new Set([1])]]);
          } else if (currentVariant === 'wonder-environment-no-class-alpha') {
            opacityScale = 1;
          }
          renderer.render(time * 20, {
            clear: true,
            cameraFrame: time * 15 + (60 / (time + 1)) * pulseValue,
            meshIndices: [1],
            materialTextureOffsets: new Map([[1, [time * 1.4, 0]]]),
            materialColorOverrides: new Map([[1, [1, 1, 1]]]),
            materialOpacityScales: new Map([[1, opacityScale]]),
            materialTextureOverrides: new Map([[1, textures]]),
            materialEnvironmentMapUnits: environmentUnits,
            materialSphereMapUnits: sphereUnits,
            blendFuncOverride: [renderer.mgl.SRC_ALPHA, renderer.mgl.ONE_MINUS_SRC_ALPHA],
            cullFaceOverride: false,
            depthTest: false,
          });
        }
        const gl = renderer.mgl.gl;
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
          gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let lit = 0;
        let bright = 0;
        let channelSum = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          const value = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
          channelSum += value;
          if (value > 4) lit++;
          if (value > 64) bright++;
        }
        return {
          lit,
          bright,
          mean: channelSum / (pixels.length / 4),
          glError: gl.getError(),
        };
      }, { currentVariant: variant, time: localTime, pulseValue: pulse, alpha: commonAlpha });
      const result = { localTime, pulse, commonAlpha, variant, ...stats };
      results.push(result);
      if (screenshotDirectory) {
        await canvas.screenshot({
          path: path.join(screenshotDirectory,
            `productions/wonder/web-opening-${localTime}-${variant}.png`),
        });
      }
      if (stats.glError) failed = true;
    }
  }
  if (errors.length) {
    results.push({ pageErrors: errors });
    failed = true;
  }
  await page.close();
} finally {
  await browser.close();
  server.close();
}

console.log(JSON.stringify(results, null, 2));
if (failed) process.exit(1);
