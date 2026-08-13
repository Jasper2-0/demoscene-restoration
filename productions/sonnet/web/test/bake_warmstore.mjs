// bake_warmstore.mjs — record a warm store (the precalc disk cache).
//
// Boots the real page COLD with `?warm=record`, which makes scene7's warm hooks
// collect every CPU-generated artifact (texture images + their stream-exit
// states, shadow bakes + their stream entry/exit states) during a genuine boot —
// so the recorded stream positions are the real ones by construction, not a
// Node-side re-enactment of the build order.  Then writes:
//
//   baked/warm/<quality>-ts<N>-<lighting>/manifest.json
//   baked/warm/<quality>-ts<N>-<lighting>/blob.bin
//
// The manifest's `sources` section records a sha256 for every module the boot
// can execute (the modulegraph); warmstore.js re-hashes them before loading, so
// an edited generator invalidates the store without a rebake step.
//
//   node web/test/bake_warmstore.mjs                 # both standard configs
//   node web/test/bake_warmstore.mjs --query='quality=original'
//   node web/test/bake_warmstore.mjs --query='texscale=4'
//
// `--query` is the exact query string the target boots will use (minus `warm`);
// the page resolves it to a config name itself, so the baked dir always matches
// what a boot with those params will look for.

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..');
const WORK = path.join(WEB, '..');
const ROOT = path.join(WORK, '..', '..');   // the repo root
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

const args = process.argv.slice(2);
const queryArg = args.find((a) => a.startsWith('--query='))?.slice(8);
// The two configs the harnesses boot by default: sweep.mjs uses
// quality=original, capture.mjs and interactive dev use the remaster defaults.
const QUERIES = queryArg !== undefined ? [queryArg] : ['quality=original', ''];

// ------------------------------------------------------------------ static server
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.xm': 'application/octet-stream',
  '.bin': 'application/octet-stream',
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(WORK, rel);
  try {
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const PORT = server.address().port;

// ------------------------------------------------- source hashes (the modulegraph)
const moduleList = execFileSync(process.execPath,
  [path.join(HERE, 'modulegraph.mjs')], { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);
const sources = {};
for (const rel of moduleList) {
  sources[rel] = crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(WORK, rel))).digest('hex');
}
console.log(`hashed ${moduleList.length} modules for the freshness manifest`);

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
});

let failed = 0;
for (const query of QUERIES) {
  const t0 = Date.now();
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 760, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('[page]', m.text()); });

  const url = `http://127.0.0.1:${PORT}/web/index.html?pos=0x0200&warm=record`
    + (query ? '&' + query : '');
  console.log(`\nrecording ${query || '(remaster defaults)'} …`);
  await page.goto(url, { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 180000 });

  const meta = await page.evaluate(() => {
    const scenes = window.__scenesReady;
    if (!scenes || !scenes.ok) return { error: 'scenes failed: ' + (scenes && scenes.error) };
    if (!window.__warmstore) return { error: 'no recorder — was ?warm=record dropped?' };
    window.__warmExport = window.__warmstore.exportStore();
    return {
      manifest: window.__warmExport.manifest,
      nChunks: window.__warmExport.chunks.length,
      warm: window.__sonnetTimings.warm,
    };
  });
  if (meta.error) { console.error('FAIL  ' + meta.error); failed++; await page.close(); continue; }
  if (meta.warm !== 'record') { console.error(`FAIL  timings.warm=${meta.warm}`); failed++; await page.close(); continue; }

  const parts = [];
  for (let i = 0; i < meta.nChunks; i++) {
    const b64 = await page.evaluate((n) => window.__warmExport.chunks[n], i);
    parts.push(Buffer.from(b64, 'base64'));
  }
  const blob = Buffer.concat(parts);
  await page.close();

  const manifest = { ...meta.manifest, sources };
  const dirName = `${manifest.config.quality}-ts${manifest.config.texscale}-${manifest.config.lighting}`;
  const dir = path.join(WORK, 'work/baked/warm', dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  fs.writeFileSync(path.join(dir, 'blob.bin'), blob);
  console.log(`OK    baked/warm/${dirName}: ${manifest.textures.length} textures, ` +
    `${manifest.shadows.length} shadow bakes, ${(blob.length / 1048576).toFixed(1)} MB ` +
    `(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}

await browser.close();
server.close();
process.exit(failed ? 1 : 0);
