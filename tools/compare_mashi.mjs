// compare_mashi.mjs — has the FORK diverged from the original?
//
//   node tools/compare_mashi.mjs [--positions=0x0400,0x1200]
//
// The size build is a fork (productions/sonnet/web-mashi), so the risk that
// matters is not "does it run" but "does it still render the same demo".  This
// renders the same music positions from
//
//   * the UNTOUCHED readable build, productions/sonnet/web, and
//   * the fork's `--harness` pack, dist/sonnet-mashi-test/index.html
//
// and compares them pixel-for-pixel.  Requires the harness pack:
//   node tools/build_mashi.mjs --harness
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const WORK = path.join(ROOT, 'productions/sonnet');
const PACK = path.join(ROOT, 'dist/sonnet-mashi-test');
const require = createRequire(path.join(ROOT, 'productions/ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');
const { createCanvas, loadImage } = require('canvas');

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=').slice(1).join('=');
const POSITIONS = arg('positions', [
  '0x0300', '0x0500', '0x0700', '0x0900', '0x0a00', '0x0c00', '0x1000',
  '0x120a', '0x1428', '0x1630', '0x1800', '0x1c00', '0x2000', '0x2228',
  '0x2500', '0x2818', '0x2b00',
].join(',')).split(',');

if (!fs.existsSync(path.join(PACK, 'index.html'))) {
  console.error('no dist/sonnet-mashi-test — run: node tools/build_mashi.mjs --harness');
  process.exit(1);
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png', '.bin': 'application/octet-stream',
               '.xm': 'application/octet-stream' };
const serve = (rootDir) => {
  const s = http.createServer((req, res) => {
    const p = path.join(rootDir, decodeURIComponent(req.url.split('?')[0]));
    let body;
    try { body = fs.readFileSync(p); } catch { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  });
  return s;
};
const sOrig = serve(WORK), sPack = serve(PACK);
await new Promise((r) => sOrig.listen(0, r));
await new Promise((r) => sPack.listen(0, r));

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
  protocolTimeout: 900000,
});

async function shots(url, label) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(600000);
  page.setDefaultTimeout(600000);
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.__sonnetReady === true', { timeout: 600000 });
  const out = {};
  for (const p of POSITIONS) {
    out[p] = await page.evaluate((pos) => {
      window.__sonnetRender(pos);
      return document.getElementById('screen').toDataURL('image/png');
    }, p);
  }
  await page.close();
  if (errs.length) console.log(`[${label}] page errors:`, [...new Set(errs)].slice(0, 3));
  return out;
}

const A = await shots(`http://127.0.0.1:${sOrig.address().port}/web/index.html?pos=${POSITIONS[0]}`, 'original');
const B = await shots(`http://127.0.0.1:${sPack.address().port}/index.html?pos=${POSITIONS[0]}`, 'fork');
await browser.close();
sOrig.close(); sPack.close();

const px = async (dataUrl) => {
  const img = await loadImage(Buffer.from(dataUrl.split(',')[1], 'base64'));
  const c = createCanvas(img.width, img.height), g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { d: g.getImageData(0, 0, img.width, img.height).data, w: img.width, h: img.height };
};

console.log('\n  position     RMSE   maxΔ   verdict');
let worst = 0, bad = 0;
for (const p of POSITIONS) {
  const a = await px(A[p]), b = await px(B[p]);
  if (a.w !== b.w || a.h !== b.h) { console.log(`  ${p}   size mismatch`); bad++; continue; }
  let sq = 0, mx = 0, n = 0;
  for (let i = 0; i < a.d.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const dd = a.d[i + k] - b.d[i + k];
      sq += dd * dd; n++; if (Math.abs(dd) > mx) mx = Math.abs(dd);
    }
  }
  const rmse = Math.sqrt(sq / n);
  if (rmse > worst) worst = rmse;
  // ANGLE is deterministic for the same command stream on the same machine, so
  // anything above a hair is a real divergence, not noise.
  const ok = rmse < 0.5;
  if (!ok) bad++;
  console.log(`  ${p}   ${rmse.toFixed(3).padStart(6)}  ${String(mx).padStart(4)}   ${ok ? 'identical' : 'DIVERGED'}`);
}
console.log(`\nworst RMSE ${worst.toFixed(3)} across ${POSITIONS.length} positions`);
console.log(bad ? `\nFAILED — ${bad} position(s) diverged` : '\nPASS — the fork renders the same demo as the original');
process.exit(bad ? 1 : 0);
