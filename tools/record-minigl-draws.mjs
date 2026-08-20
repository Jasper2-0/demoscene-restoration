#!/usr/bin/env node
// record-minigl-draws.mjs — capture a minigl-based port's draw stream, in the
// same shape tools/winebox/parse-gl-trace.mjs produces for the ORIGINAL.
//
//   node tools/record-minigl-draws.mjs <production> --time 12.5 [--out port.jsonl]
//   node tools/record-minigl-draws.mjs wonder --order 20 [--out port.jsonl]
//
// WHY NOT RECORD WebGL. The obvious move is to wrap the WebGL2 context and log
// what it receives. That does not work here, because the two sides do not agree
// at that level and are not supposed to: the original submits immediate-mode
// primitives (glBegin / glVertex3fv / glEnd) while minigl batches them into
// buffers and issues drawElements. Comparing there would report a difference on
// every frame and mean nothing.
//
// The level where the two DO agree is the fixed-function API itself — what
// primitive, how many vertices, which texture, under what matrix. The original's
// side of that is what Wine logs; this side of it is what MiniGL's methods
// receive. So this wraps MiniGL.prototype, not the GL context.
//
// NOTHING IN THE PORT IS MODIFIED. ES modules are cached per URL, so importing
// the page's own minigl.js from the page context yields the SAME module object
// the app is using, and patching its prototype affects the live instance. The
// adapter's render() is documented as safe to call repeatedly, so recording is
// just: patch, render, read back.
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withPage } from './harness/index.mjs';

const argv = process.argv.slice(2);
const production = argv.find((a) => !a.startsWith('--'));
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : argv[i + 1] ?? true;
};
if (!production) {
  console.error('usage: record-minigl-draws.mjs <production> (--time S | --order N) [--out f.jsonl]');
  process.exit(2);
}

const ROOTS = {
  wonder: { root: 'productions/wonder/web', minigl: './js/shared/minigl.js' },
  energia: { root: 'productions/energia/web', minigl: './js/shared/minigl.js' },
};
const cfg = ROOTS[production];
if (!cfg) { console.error(`unknown production ${production}; known: ${Object.keys(ROOTS).join(', ')}`); process.exit(2); }

let status = 0;
// withPage owns the server and the browser, per tools/harness/README.md — this
// tool should not stand up its own, which is exactly the duplication the shared
// harness exists to end.
await withPage({ root: cfg.root, query: '?inspect=1' }, async ({ page, errors }) => {
  await page.waitForFunction('window.__demoReady === true || !!window.__demo', { timeout: 60000 });

  // Install the recorder on the shared prototype.
  const installed = await page.evaluate(async (miniglUrl) => {
    const mod = await import(miniglUrl);
    const P = mod.MiniGL?.prototype;
    if (!P) return { ok: false, why: 'no MiniGL export' };
    if (P.__recInstalled) return { ok: true, already: true };
    const rec = (window.__rec = { ops: [], prim: null, tex: 0, unit: 0, on: false });
    // minigl's own primitive constants (QUADS 1, TRIANGLES 2, LINES 3, POINTS 4).
    // Emit GL's NAMES so a record lines up with the original's side, which comes
    // from Wine and is named. Comparing 2 against "TRIANGLES" would fail for a
    // reason that has nothing to do with either renderer.
    const MODE = { 1: 'QUADS', 2: 'TRIANGLES', 3: 'LINES', 4: 'POINTS' };
    // WebGLTexture has no identity of its own; stringifying gives
    // "[object WebGLTexture]" for every one of them. Number them in creation
    // order, which is also how the original's GL names come out, so the two
    // sides agree on which texture is "3" for the same reason.
    let nextTexId = 1;
    const texId = (t) => {
      if (t == null) return 0;
      if (typeof t === 'number') return t;
      if (!t.__recId) { try { t.__recId = nextTexId++; } catch { return 0; } }
      return t.__recId;
    };

    const wrap = (name, fn) => { const orig = P[name]; if (orig) P[name] = fn(orig); };
    wrap('begin', (o) => function (mode) { if (rec.on) rec.prim = { mode, n: 0, tex: rec.tex, unit: rec.unit }; return o.apply(this, arguments); });
    wrap('end', (o) => function () {
      if (rec.on && rec.prim) { rec.ops.push(`prim ${MODE[rec.prim.mode] ?? rec.prim.mode}:${rec.prim.n}:t${rec.prim.tex}`); rec.prim = null; }
      return o.apply(this, arguments);
    });
    for (const v of ['vertex3', 'vertex3v']) wrap(v, (o) => function () { if (rec.on && rec.prim) rec.prim.n++; return o.apply(this, arguments); });
    wrap('bindTexture', (o) => function (t) { if (rec.on) { rec.tex = texId(t); rec.ops.push(`bind ${rec.tex}@${rec.unit}`); } return o.apply(this, arguments); });
    wrap('activeTexture', (o) => function (u) { if (rec.on) rec.unit = u; return o.apply(this, arguments); });
    wrap('rotate', (o) => function (a, x, y, z) { if (rec.on) rec.ops.push(`rot ${+a.toFixed(3)} ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    wrap('translate', (o) => function (x, y, z) { if (rec.on) rec.ops.push(`tr ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    wrap('scale', (o) => function (x, y, z) { if (rec.on) rec.ops.push(`sc ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    // drawMesh/drawElements are the batched paths; count them as one primitive
    // each so a port that batches is not reported as drawing nothing.
    wrap('drawMesh', (o) => function (mesh, o2) { if (rec.on) rec.ops.push(`mesh ${o2?.count ?? mesh?.count ?? '?'}:t${rec.tex}`); return o.apply(this, arguments); });
    wrap('drawElements', (o) => function (pos, uvs, idx) { if (rec.on) rec.ops.push(`elems ${idx?.length ?? '?'}:t${rec.tex}`); return o.apply(this, arguments); });
    P.__recInstalled = true;
    return { ok: true };
  }, cfg.minigl);
  if (!installed.ok) throw new Error(`recorder not installed: ${installed.why}`);

  // Resolve the requested instant. --order goes through the adapter's own
  // positionAt mapping rather than a table copied into this tool.
  const time = opt('time');
  const order = opt('order');
  const showTime = await page.evaluate(({ time, order }) => {
    if (time != null) return Number(time);
    const d = window.__demo;
    if (!d?.positionAt) return null;
    // Walk show time until positionAt reports the requested order. Coarse then
    // fine, because the mapping is a step function and only the boundary matters.
    const want = `order ${order}`;
    let lo = 0, hi = 600;
    for (let t = 0; t <= hi; t += 0.5) if (d.positionAt(t) === want) { lo = t; break; }
    return lo;
  }, { time, order });
  if (showTime == null) throw new Error('could not resolve a show time (no --time and no positionAt)');

  const sweep = opt('orders');
  if (sweep && sweep !== true) {
    const list = String(sweep).split(',').map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x));
    const rows = [];
    for (const ord of list) {
      const t = await page.evaluate((o) => {
        const d = window.__demo, want = `order ${o}`;
        for (let x = 0; x <= 600; x += 0.1) if (d.positionAt(x) === want) return +x.toFixed(1);
        return null;
      }, ord);
      if (t == null) { rows.push({ order: ord, error: 'order not reachable' }); continue; }
      const f = await page.evaluate(async (tt) => {
        const d = window.__demo, parts = d.schedule();
        const part = parts.find((p) => tt >= p.start && tt < p.start + p.dur) ?? parts[0];
        window.__rec.ops.length = 0; window.__rec.on = true;
        await d.render({ part: part.name, local: tt - part.start });
        window.__rec.on = false;
        return { part: part.name, local: tt - part.start, ops: window.__rec.ops.slice() };
      }, t);
      f.order = ord; f.showTime = t;
      f.digest = createHash('sha256').update(f.ops.join('|')).digest('hex').slice(0, 12);
      rows.push(f);
    }
    const outf = opt('out');
    if (outf) { writeFileSync(outf, rows.map((r) => JSON.stringify(r)).join('\n') + '\n'); }
    console.log(`${'order'.padStart(6)}${'time'.padStart(8)}${'draws'.padStart(7)}${'verts'.padStart(8)}  digest`);
    for (const r of rows) {
      if (r.error) { console.log(`${String(r.order).padStart(6)}   ${r.error}`); status = 1; continue; }
      const d = r.ops.filter((o) => /^(prim|mesh|elems)/.test(o));
      // Three op shapes carry a count and they are not punctuated alike:
      //   prim TRIANGLES:2160:t1   (two colons)
      //   elems 1536:t1            (one)
      //   mesh 480:t3              (one)
      // A regex needing two colons scored the two BATCHED paths as zero, which
      // read as "the port draws nothing here" when it draws the most there.
      const v = d.reduce((n, x) => n + (+(x.match(/^prim \w+:(\d+):|^(?:mesh|elems) (\d+)/)?.slice(1).find(Boolean) || 0)), 0);
      console.log(`${String(r.order).padStart(6)}${(r.showTime + 's').padStart(8)}${String(d.length).padStart(7)}${String(v).padStart(8)}  ${r.digest}`);
      if (!d.length) status = 1;
    }
    if (outf) console.log(`wrote ${outf}`);
    if (errors.length) { console.error(`page errors: ${errors.length}`); status = 1; }
    return;
  }

  const frame = await page.evaluate(async (t) => {
    const d = window.__demo;
    const parts = d.schedule();
    const part = parts.find((p) => t >= p.start && t < p.start + p.dur) ?? parts[0];
    window.__rec.ops.length = 0;
    window.__rec.on = true;
    const info = await d.render({ part: part.name, local: t - part.start });
    window.__rec.on = false;
    return { part: part.name, local: t - part.start, ops: window.__rec.ops.slice(), info };
  }, showTime);

  frame.showTime = showTime;
  frame.digest = createHash('sha256').update(frame.ops.join('|')).digest('hex').slice(0, 12);
  const prims = frame.ops.filter((o) => o.startsWith('prim') || o.startsWith('mesh') || o.startsWith('elems'));
  console.log(`${production} @ ${showTime}s (part ${frame.part}, local ${frame.local.toFixed(3)})`);
  console.log(`  ops ${frame.ops.length}, draws ${prims.length}, digest ${frame.digest}`);
  console.log(`  first: ${frame.ops.slice(0, 6).join(' | ') || '(none)'}`);
  if (errors.length) { console.error(`  page errors: ${errors.length}`); for (const e of errors.slice(0, 3)) console.error('   ' + e); status = 1; }
  if (!prims.length) { console.error('FAIL: the port drew nothing — the recorder or the seek is wrong, not the port'); status = 1; }

  const out = opt('out');
  if (out) { writeFileSync(out, JSON.stringify(frame) + '\n'); console.log(`  wrote ${out}`); }
}).catch((e) => { console.error(`FAIL: ${e.message}`); status = 1; });
process.exit(status);
