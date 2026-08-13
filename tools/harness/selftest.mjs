// selftest.mjs — proves the harness works before anything is migrated onto it.
//
//   node tools/harness/selftest.mjs
//
// Drives a real restoration (lost vegas: self-contained, boots fast, sets
// window.__lvReady) plus unit checks for the two behaviours the hand-rolled
// harnesses did not have: case-exact serving and the traversal guard.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { serve, withPage, warmUp, shootCanvas, assertClean, fromRepo, findChrome } from './index.mjs';

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`  ok   ${name}`); }
  catch (e) { failures++; console.error(`  FAIL ${name}\n       ${e.message.split('\n')[0]}`); }
};

console.log('server');
await check('serves a file and records the request', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  const r = await fetch(s.url + '/index.html');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  assert.ok(s.requests.includes('/index.html'));
  await s.close();
});

await check('404s a missing file and records it', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  assert.equal((await fetch(s.url + '/nope.png')).status, 404);
  assert.ok(s.missing.includes('/nope.png'));
  await s.close();
});

await check('rejects wrong-case paths that macOS would happily serve', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  const r = await fetch(s.url + '/INDEX.html');
  assert.equal(r.status, 404, 'wrong case must not resolve');
  assert.equal(s.caseErrors.length, 1, 'the mismatch must be recorded, not just refused');
  await s.close();
});

await check('case-exact can be turned off deliberately', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'), { caseExact: false });
  assert.equal((await fetch(s.url + '/INDEX.html')).status, 200);
  await s.close();
});

await check('blocks traversal outside the root', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  const r = await fetch(s.url + '/../../../METHOD.md');
  assert.ok(r.status === 403 || r.status === 404, `got ${r.status}`);
  await s.close();
});

await check('serves index.html for a directory request', async () => {
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  assert.equal((await fetch(s.url + '/')).status, 200);
  await s.close();
});

console.log('browser + measure');
await check('finds Chrome without a hardcoded path', () => {
  assert.ok(fs.existsSync(findChrome()));
});

await check('boots a real restoration, clean, and photographs it', async () => {
  await withPage({ root: 'productions/lost-vegas/web', path: '/index.html', query: '?pos=0x400' },
    async ({ page, server, errors, failedRequests }) => {
      await warmUp(page, { readyExpr: 'window.__lvReady === true', warmupFrames: 6 });
      assertClean({ errors, failedRequests }, server);
      const png = await shootCanvas(page, { readyExpr: 'window.__lvReady === true' });
      assert.ok(png.length > 5000, `screenshot suspiciously small (${png.length} B)`);
      assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
      const out = path.join(process.env.TMPDIR ?? '/tmp', 'harness-selftest.png');
      fs.writeFileSync(out, png);
      console.log(`       wrote ${out} (${(png.length / 1024).toFixed(0)} KB)`);
    });
});

await check('tears down even when the body throws', async () => {
  await assert.rejects(
    withPage({ root: 'productions/lost-vegas/web' }, async () => { throw new Error('boom'); }),
    /boom/);
  // if the socket or Chrome leaked, the next serve on a fresh port still works
  const s = await serve(fromRepo('productions/lost-vegas/web'));
  await s.close();
});

await check('assertClean reports every problem at once', () => {
  assert.throws(
    () => assertClean({ errors: ['a', 'b'], failedRequests: ['c'] }, { caseErrors: ['d'], missing: [] }),
    (e) => e.message.includes('(4)') && e.message.includes('case mismatch'));
});

console.log(failures ? `\n${failures} failure(s)` : '\nall harness self-tests passed');
process.exit(failures ? 1 : 0);
