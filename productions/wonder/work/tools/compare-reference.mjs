#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createRequire } from 'node:module';

const toolDirectory = path.dirname(fileURLToPath(import.meta.url));
const productionRoot = path.resolve(toolDirectory, '../..');       // productions/wonder
const repoRoot = path.resolve(toolDirectory, '../../../..');       // monorepo root
// puppeteer-core is hoisted to the repo-root workspace install; resolve it the
// same way the tools/*_mashi.mjs harnesses do.
const require = createRequire(path.join(repoRoot, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const arguments_ = process.argv.slice(2);
const timesOption = arguments_.find((argument) => argument.startsWith('--times='));
const portOffsetsOption = arguments_.find((argument) => argument.startsWith('--port-offsets='));
const onlyOption = arguments_.find((argument) => argument.startsWith('--only='));
const designPartsOption = arguments_.find((argument) => argument.startsWith('--design-parts='));
const designPassesOption = arguments_.find((argument) => argument.startsWith('--design-passes='));
const positionalArguments = arguments_.filter((argument) => !argument.startsWith('--'));
const referenceVideo = positionalArguments[0] ?? process.env.WONDER_REFERENCE_VIDEO;
const outputDirectory = path.resolve(positionalArguments[1]
  ?? process.env.WONDER_COMPARISON_DIR
  ?? '/private/tmp/wonder-reference-comparison');
const indexFile = path.join(productionRoot, 'work/reference/contact-sheets/index.json');

if (!referenceVideo) {
  console.error('usage: node productions/wonder/work/tools/compare-reference.mjs REFERENCE_VIDEO [OUTPUT_DIR] [--times=SECONDS,...] [--port-offsets=SECONDS,...] [--only=EFFECT_IDS] [--design-parts=surface,overlays] [--design-passes=0,1,2]');
  process.exit(2);
}
if (!fs.existsSync(referenceVideo)) {
  console.error(`Wonder reference video does not exist: ${referenceVideo}`);
  process.exit(2);
}

const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const requestedTimes = (timesOption?.slice('--times='.length) ?? process.env.WONDER_COMPARE_TIMES)
  ?.split(',').map(Number).filter(Number.isFinite);
const samples = requestedTimes?.length
  ? requestedTimes.map((showTime) => ({
    showTime,
    captureTime: showTime + index.captureOffset,
    reasons: ['explicit sample'],
  }))
  : index.samples;
const portOffsets = (portOffsetsOption?.slice('--port-offsets='.length)
  ?? String(index.nativeVisualLead ?? 0))
  .split(',').map(Number).filter(Number.isFinite);
if (!portOffsets.length) throw new Error('--port-offsets requires at least one finite offset');

fs.mkdirSync(outputDirectory, { recursive: true });

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `\n${result.stderr}` : '';
    throw new Error(`${command} exited with ${result.status}${detail}`);
  }
  return result;
}

function timeName(seconds) {
  return seconds.toFixed(3).replace('.', '_');
}

function offsetName(seconds) {
  return `${seconds < 0 ? 'm' : 'p'}${Math.abs(seconds).toFixed(4).replace('.', '_')}`;
}

const frameProbe = run('ffprobe', [
  '-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_entries',
  'packet=pts_time', '-of', 'csv=p=0', referenceVideo,
], { capture: true });
const referenceFrameTimes = frameProbe.stdout
  .split(/\r?\n/)
  .map((line) => Number(line.split(',')[0]))
  .filter(Number.isFinite)
  .sort((left, right) => left - right)
  .filter((time, index, times) => index === 0 || time !== times[index - 1]);
if (!referenceFrameTimes.length) throw new Error('reference video exposes no timestamped frames');

// `ffmpeg -ss` returns the first stored frame at or after the requested time.
// Compare the browser at that frame's real presentation time, rather than at
// the fractional request, or a 30-fps reference injects up to 33 ms of false
// apparent lag into the result.
function presentationTimeAtOrAfter(requestedTime) {
  let low = 0;
  let high = referenceFrameTimes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (referenceFrameTimes[middle] + 1e-7 < requestedTime) low = middle + 1;
    else high = middle;
  }
  return referenceFrameTimes[Math.min(low, referenceFrameTimes.length - 1)];
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.xm': 'application/octet-stream',
};
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const filename = path.resolve(productionRoot, `.${pathname}`);
  if (!filename.startsWith(`${productionRoot}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const stat = fs.statSync(filename);
    const resolved = stat.isDirectory() ? path.join(filename, 'index.html') : filename;
    response.writeHead(200, {
      'content-type': mime[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream',
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

const results = [];
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 960, height: 720, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));
  const onlyQuery = onlyOption
    ? `&only=${encodeURIComponent(onlyOption.slice('--only='.length))}`
    : '';
  const designPartsQuery = designPartsOption
    ? `&design-parts=${encodeURIComponent(designPartsOption.slice('--design-parts='.length))}`
    : '';
  const designPassesQuery = designPassesOption
    ? `&design-passes=${encodeURIComponent(designPassesOption.slice('--design-passes='.length))}`
    : '';
  await page.goto(
    `http://127.0.0.1:${server.address().port}/web/?t=0&debug&embedded${onlyQuery}${designPartsQuery}${designPassesQuery}`,
    { waitUntil: 'networkidle0' },
  );
  await page.waitForFunction('window.__wonderReady === true');
  const canvas = await page.$('#screen');

  for (const sample of samples) {
    const name = timeName(sample.showTime);
    const referenceFrame = path.join(outputDirectory, `reference-${name}.png`);
    const referenceFrameTime = presentationTimeAtOrAfter(sample.captureTime);
    const referenceShowTime = referenceFrameTime - index.captureOffset;
    run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y',
      '-ss', String(referenceFrameTime), '-i', referenceVideo, '-frames:v', '1',
      '-vf', 'scale=960:720:force_original_aspect_ratio=decrease:flags=lanczos,pad=960:720:(ow-iw)/2:(oh-ih)/2:black',
      referenceFrame,
    ]);
    for (const portOffset of portOffsets) {
      const suffix = portOffsets.length === 1 ? '' : `-${offsetName(portOffset)}`;
      const portFrame = path.join(outputDirectory, `port-${name}${suffix}.png`);
      const montage = path.join(outputDirectory, `comparison-${name}${suffix}.png`);
      const portTime = referenceShowTime + portOffset;
      await page.evaluate((seconds) => window.__wonderRenderAt(seconds), portTime);
      await canvas.screenshot({ path: portFrame });

      const ssimResult = run('ffmpeg', [
        '-hide_banner', '-i', referenceFrame, '-i', portFrame,
        '-lavfi', 'ssim', '-f', 'null', '-',
      ], { capture: true });
      const match = ssimResult.stderr.match(/SSIM[^\n]*All:([0-9.]+)/);
      const ssim = match ? Number(match[1]) : null;

      run('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y',
        '-i', referenceFrame, '-i', portFrame,
        '-filter_complex',
        "[0:v]split=2[refdiff][refstack];[1:v]split=2[portdiff][portstack];"
          + "[refdiff][portdiff]blend=all_mode=difference,"
          + "lutrgb=r='min(255,val*4)':g='min(255,val*4)':b='min(255,val*4)'[diff];"
          + '[refstack][portstack][diff]hstack=inputs=3[out]',
        '-map', '[out]', '-frames:v', '1', montage,
      ]);

      results.push({
        showTime: sample.showTime,
        captureTime: sample.captureTime,
        referenceFrameTime,
        referenceShowTime,
        portTime,
        portOffset,
        reasons: sample.reasons,
        ssim,
        referenceFrame: path.basename(referenceFrame),
        portFrame: path.basename(portFrame),
        montage: path.basename(montage),
      });
      console.log(`${sample.showTime.toFixed(3)}s ref ${referenceFrameTime.toFixed(3)}s port ${portOffset >= 0 ? '+' : ''}${portOffset.toFixed(4)}s SSIM=${ssim?.toFixed(6) ?? 'unknown'} ${sample.reasons.join(', ')}`);
    }
  }

  if (errors.length) throw new Error(`browser errors:\n${errors.join('\n')}`);
  await page.close();
} finally {
  await browser.close();
  server.close();
}

const ranked = [...results].sort((a, b) => (a.ssim ?? 1) - (b.ssim ?? 1));
const report = {
  generatedAt: new Date().toISOString(),
  referenceVideo: path.resolve(referenceVideo),
  captureOffset: index.captureOffset,
  nativeVisualLead: index.nativeVisualLead ?? 0,
  frameSize: [960, 720],
  samples: results,
  portOffsets,
  worstFirst: ranked.map(({ showTime, portOffset, ssim, reasons }) => ({
    showTime, portOffset, ssim, reasons,
  })),
};
fs.writeFileSync(path.join(outputDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Wrote ${results.length} comparison samples to ${outputDirectory}`);
console.log('Lowest similarities:');
for (const sample of ranked.slice(0, 10)) {
  console.log(`  ${sample.showTime.toFixed(3)}s port ${sample.portOffset >= 0 ? '+' : ''}${sample.portOffset.toFixed(4)}s ${sample.ssim?.toFixed(6) ?? 'unknown'} ${sample.reasons.join(', ')}`);
}
