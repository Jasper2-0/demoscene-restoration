// scene2_stream.mjs — the RNG-stream instrument for scene 2.
//
// re/scenes/SCENE2_TODO.md §1.1: `FUN_00409d45`'s leaf-record tail draws 32
// randoms per leaf INSIDE the tree generator, and the impostor bake path used
// to skip them.  Build order is part of the spec when geometry is procedurally
// seeded (see the methodology note), so the quantity that arbitrates a fix here
// is not a picture — it is the RNG STATE at a named point, plus the values the
// next draws produce.
//
// Reports, for scene 2 (obj 5, 0x0a00):
//   * the stream state immediately after the impostor bake, before the first
//     cluster's yaws  — Codex's predicted value is 0x5f95db36;
//   * that cluster's first three yaws.
//
// Run: node web/test/scene2_stream.mjs
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(HERE, '..', '..');          // productions/sonnet (the production root)
const ROOT = WORK;                                 // ...and that is the SERVER root
const require = createRequire(path.join(WORK, '..', 'ptct/work/js/package.json'));
const puppeteer = require('puppeteer-core');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
               '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm',
               '.bin': 'application/octet-stream', '.xm': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  try {
    const data = fs.readFileSync(p);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--hide-scrollbars', '--window-size=900,760'],
  // Warming to 0x0a28 replays every scene up to the forest, and the shadow
  // bake (default on) is ~200 ms per landscape — well past puppeteer's 180 s
  // default protocol timeout.  Do NOT "fix" this with ?lighting=legacy: the
  // bake draws 2,097,152 randoms from the stream this test measures.
  protocolTimeout: 900000,
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('console', m => console.log('[page]', m.type(), m.text().slice(0,200)));
// The probe array must exist BEFORE the scene builds, so install it on the
// document rather than after load.
await page.evaluateOnNewDocument(() => { globalThis.__scene2Probe = []; globalThis.__shadowProbe = []; });

await page.goto(`http://127.0.0.1:${port}/web/index.html?pos=0x0a28&debug`,
                { waitUntil: 'networkidle0' });
await page.waitForFunction('window.__sonnetReady === true', { timeout: 180000 });
await page.evaluate('window.__sonnetRender(0x0a28)');

const probe = await page.evaluate(() => globalThis.__scene2Probe);
console.log('SHADOW', JSON.stringify(await page.evaluate(() => globalThis.__shadowProbe)));
await browser.close();
server.close();

if (!probe || !probe.some(p => p.sceneIdx === 2)) {
  console.log('NO PROBE DATA — scene 2 did not build its array-C clusters.');
  process.exit(1);
}
for (const b of probe.filter(x => x.bakeSet !== undefined)) {
  console.log(`  bakeTreeSet set ${b.bakeSet}: leafVerts ${b.leafVerts} ` +
              `leafRecords ${b.leafRecords}  stream ${b.before} -> ${b.after}`);
}
// Scenes 4, 5 and 7 build array C too; keep only the forest's.
const s2 = probe.filter(p => p.sceneIdx === 2);
console.log('scene 2 array-C clusters, post-bake stream state and first yaws:\n');
for (const p of s2) {
  console.log(`  cluster ${p.cluster}  didBake ${p.didBake ? 'Y' : 'n'}  ` +
              `preBake ${p.preBakeState}  preYaw ${p.preYawState}  ` +
              `yaws ${p.yaws.map(y => y.toFixed(6)).join(' / ')}`);
}
const c0 = s2.find(p => p.cluster === 0);
const EXPECT_STATE = '0x5f95db36';
const EXPECT_YAWS = [3.203241, 3.663641, 3.928069];
console.log('\nCodex predicted (from the binary):');
console.log(`  cluster 0  preYawState ${EXPECT_STATE}  ` +
            `yaws ${EXPECT_YAWS.map(y => y.toFixed(6)).join(' / ')}`);
const stateOk = c0 && c0.preYawState === EXPECT_STATE;
const yawOk = c0 && c0.yaws.every((y, i) => Math.abs(y - EXPECT_YAWS[i]) < 1e-5);
console.log(`\nstate  ${stateOk ? 'MATCH' : 'MISMATCH'}`);
console.log(`yaws   ${yawOk ? 'MATCH' : 'MISMATCH'}`);
process.exit(stateOk && yawOk ? 0 : 1);
