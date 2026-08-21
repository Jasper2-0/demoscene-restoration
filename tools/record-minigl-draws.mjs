#!/usr/bin/env node
// record-minigl-draws.mjs — capture a minigl-based port's draw stream, in the
// same shape tools/winebox/parse-gl-trace.mjs produces for the ORIGINAL.
//
//   node tools/record-minigl-draws.mjs <production> --time 12.5 [--out port.jsonl]
//   node tools/record-minigl-draws.mjs wonder --time 54.87 --only effect_40ec40
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
import { writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withPage, fromRepo } from './harness/index.mjs';

const argv = process.argv.slice(2);
const production = argv.find((a) => !a.startsWith('--'));
// A comma-separated whitelist passed to render({ only }), not to the URL.
const onlyArg = (() => { const i = argv.indexOf('--only'); return i < 0 ? null : argv[i + 1]; })();
const onlyList = onlyArg ? onlyArg.split(',').map((x) => x.trim()).filter(Boolean) : null;
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : argv[i + 1] ?? true;
};
if (!production) {
  console.error('usage: record-minigl-draws.mjs <production> (--time S | --order N) [--out f.jsonl]');
  process.exit(2);
}

// Derived, not tabulated. A shared tool must not carry a list of the productions it
// happens to have been used on — that is how `oracle-at.sh` came to look general while
// only working for Wonder. Every port that vendors the shared runtime puts MiniGL at
// the same place, so the layout IS the contract; anything that does not follow it says
// so here rather than being silently absent from a table.
const cfg = { root: `productions/${production}/web`, minigl: './js/shared/minigl.js' };
for (const [what, rel] of [['production', ''], ['MiniGL module', 'js/shared/minigl.js'],
                           ['page', 'index.html']]) {
  const probe = rel ? fromRepo(cfg.root, rel) : fromRepo(cfg.root);
  if (!existsSync(probe)) {
    console.error(`no ${what} at ${cfg.root}${rel ? `/${rel}` : ''}`);
    console.error(`known productions: ${readdirSync(fromRepo('productions')).sort().join(', ')}`);
    process.exit(2);
  }
}

let status = 0;
// withPage owns the server and the browser, per tools/harness/README.md — this
// tool should not stand up its own, which is exactly the duplication the shared
// harness exists to end.
// --query appends to the page URL, so an experimental flag in the port (e.g.
// ?cull=facing) can be recorded against the SAME original trace as the default.
const extraQuery = opt('query', '');
await withPage({ root: cfg.root, query: `?inspect=1${extraQuery ? `&${extraQuery}` : ''}` }, async ({ page, errors }) => {
  await page.waitForFunction('window.__demoReady === true || !!window.__demo', { timeout: 60000 });

  // Install the recorder on the shared prototype.
  const installed = await page.evaluate(async (miniglUrl) => {
    const mod = await import(miniglUrl);
    const P = mod.MiniGL?.prototype;
    if (!P) return { ok: false, why: 'no MiniGL export' };
    if (P.__recInstalled) return { ok: true, already: true };
    const rec = (window.__rec = { ops: [], prim: null, tex: 0, unit: 0, on: false,
      blend: false, bf: '?', depth: false, dmask: '?' });
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

    // A CANONICAL PIPELINE SNAPSHOT per draw. The op strings above stay as they
    // are (compare-draws reads them); this is the parallel record that can be
    // diffed field-by-field against the executable's, so a divergence names
    // itself instead of being guessed at. The fixed-function pipeline is a closed
    // set: transform, vertex attributes, per-unit texture state, and the raster
    // gates. Everything below is one of those.
    rec.states = [];
    const m16 = (mat) => (mat?.m ? [...mat.m].map((v) => Math.round(v * 1e4) / 1e4) : null);
    // EFFECTIVE UV, not raw. Wonder scrolls a texture by baking the offset into
    // its texcoords; the port does the same thing with a texture-matrix
    // translation. Comparing the matrix alone reports a difference on every such
    // draw and means nothing — the sampled texel is identical. So apply the unit's
    // matrix here and compare where the draw actually READS.
    const uvExtent = (uvs, mat) => {
      if (!uvs || !uvs.length) return null;
      const m = mat?.m;
      let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      for (let i = 0; i + 1 < uvs.length; i += 2) {
        let u = uvs[i], v = uvs[i + 1];
        if (m) { const uu = u * m[0] + v * m[4] + m[12]; v = u * m[1] + v * m[5] + m[13]; u = uu; }
        if (u < u0) u0 = u; if (u > u1) u1 = u;
        if (v < v0) v0 = v; if (v > v1) v1 = v;
      }
      return [u0, u1, v0, v1].map((x) => Math.round(x * 1e5) / 1e5);
    };
    const snapshot = (self, extra) => {
      const units = (self.textureUnits ?? []).map((u) => ({
        tex: texId(u.boundTex),
        size: u.boundTex ? [u.boundTex.__w ?? 0, u.boundTex.__h ?? 0] : [0, 0],
        enabled: !!u.enabled,
        sphereMap: !!u.sphereMap,
        env: u.env?.mode ?? null,
        envRgb: u.env?.rgb ? `${u.env.rgb.operation}(${(u.env.rgb.sources ?? []).join('|')})` : null,
        matrix: m16(u.matrix),
      }));
      rec.states.push({
        ...extra,
        uv: rec.uv ?? null,
        color: rec.col ?? null,
        blend: rec.blend, blendFunc: rec.bf,
        depthTest: rec.depth, depthMask: rec.dmask,
        cull: rec.cull ?? null, cullFace: rec.cullFace ?? null,
        lighting: rec.lighting ?? null,
        modelview: m16(self.matrices?.[self.MODELVIEW]),
        projection: m16(self.matrices?.[self.PROJECTION]),
        units,
      });
    };

    // TEXTURE IDENTITY BY SIZE, not by bind order. The "n-th distinct texture seen
    // this frame" scheme is order-sensitive and produced 23 of the 24 differences
    // this tool still reports. glretrace gives GL_TEXTURE_WIDTH/HEIGHT for the
    // bound texture on the executable's side, so stamping the same here gives both
    // sides a key that does not depend on the order anything happened in.
    const stampSize = (tex, w, h) => { try { if (tex) { tex.__w = w; tex.__h = h; } } catch { /* frozen */ } };

    const wrap = (name, fn) => { const orig = P[name]; if (orig) P[name] = fn(orig); };
    wrap('createTextureFromImage', (o) => function (image, ...rest) {
      const t = o.call(this, image, ...rest);
      stampSize(t, image?.width ?? image?.naturalWidth ?? 0, image?.height ?? image?.naturalHeight ?? 0);
      return t;
    });
    wrap('createTextureFromData', (o) => function (data, w, h, ...rest) {
      const t = o.call(this, data, w, h, ...rest);
      stampSize(t, w, h);
      return t;
    });
    wrap('enableCullFace', (o) => function (on) { if (rec.on) rec.cull = !!on; return o.apply(this, arguments); });
    wrap('enableLighting', (o) => function (on) { if (rec.on) rec.lighting = !!on; return o.apply(this, arguments); });
    wrap('begin', (o) => function (mode) { if (rec.on) rec.prim = { mode, n: 0, tex: rec.tex, unit: rec.unit, col: rec.col }; return o.apply(this, arguments); });
    wrap('end', (o) => function () {
      if (rec.on && rec.prim) {
        const cols = rec.prim.cols || (rec.prim.col ? [rec.prim.col.join(',')] : []);
        const c = cols.length === 0 ? ''
          : cols.length === 1 ? ` c${cols[0]}`
          : ` c${cols.length}x[${cols[0]} .. ${cols[cols.length - 1]}]`;
        rec.ops.push(`prim ${MODE[rec.prim.mode] ?? rec.prim.mode}:${rec.prim.n}:t${rec.prim.tex}${c}`
          + ` [blend=${rec.blend} ${rec.bf} depth=${rec.depth} dmask=${rec.dmask}]`);
        snapshot(this, { kind: 'prim', mode: MODE[rec.prim.mode] ?? rec.prim.mode, n: rec.prim.n });
        rec.prim = null;
      }
      return o.apply(this, arguments);
    });
    for (const v of ['vertex3', 'vertex3v']) wrap(v, (o) => function () { if (rec.on && rec.prim) rec.prim.n++; return o.apply(this, arguments); });
    // GL STATE. `compare-draws.mjs` pairs draws by vertex count and says nothing
    // about the state they were issued under, which is where Wonder's remaining
    // differences live — an identical primitive under a different blend function
    // is a different picture. Recording it here lets the two sides be joined.
    const BF = { 0: 'ZERO', 1: 'ONE', 768: 'SRC_COLOR', 769: 'ONE_MINUS_SRC_COLOR',
      770: 'SRC_ALPHA', 771: 'ONE_MINUS_SRC_ALPHA', 774: 'DST_COLOR' };
    wrap('enableBlend', (o) => function (e) { if (rec.on) rec.blend = !!e; return o.apply(this, arguments); });
    wrap('blendFunc', (o) => function (a, b) {
      if (rec.on) rec.bf = `${BF[a] ?? a},${BF[b] ?? b}`;
      return o.apply(this, arguments);
    });
    wrap('enableDepthTest', (o) => function (e) { if (rec.on) rec.depth = !!e; return o.apply(this, arguments); });
    wrap('depthMask', (o) => function (e) { if (rec.on) rec.dmask = String(!!e); return o.apply(this, arguments); });
    wrap('bindTexture', (o) => function (t) { if (rec.on) { rec.tex = texId(t); rec.ops.push(`bind ${rec.tex}@${rec.unit}`); } return o.apply(this, arguments); });
    wrap('activeTexture', (o) => function (u) { if (rec.on) rec.unit = u; return o.apply(this, arguments); });
    // Colour is the SHADING RESULT on the original's side: its per-triangle
    // handler issues glColor4f(I,I,I,a) where I is the summed per-vertex lighting
    // byte. So recording minigl's colour makes the two sides comparable on
    // shading, which is what the geometry-exact parts need.
    wrap('color4', (o) => function (r, g, b, a) {
      if (rec.on) {
        rec.col = [r, g, b, a].map((v) => Math.round(v * 1000) / 1000);
        // Colour may change PER VERTEX inside a primitive — minigl's immediate
        // path allows it and Wonder's surface renderer uses it. Latching only at
        // begin() reports the first colour of a batch as if it were the whole
        // batch, which reads as "the port lost a per-instance ramp" when the ramp
        // is there and simply spans one draw instead of many.
        if (rec.prim) {
          rec.prim.cols = rec.prim.cols || [];
          const k = rec.col.join(',');
          if (rec.prim.cols[rec.prim.cols.length - 1] !== k) rec.prim.cols.push(k);
        }
      }
      return o.apply(this, arguments);
    });
    wrap('rotate', (o) => function (a, x, y, z) { if (rec.on) rec.ops.push(`rot ${+a.toFixed(3)} ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    wrap('translate', (o) => function (x, y, z) { if (rec.on) rec.ops.push(`tr ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    wrap('scale', (o) => function (x, y, z) { if (rec.on) rec.ops.push(`sc ${+x.toFixed(3)},${+y.toFixed(3)},${+z.toFixed(3)}`); return o.apply(this, arguments); });
    // drawMesh/drawElements are the batched paths; count them as one primitive
    // each so a port that batches is not reported as drawing nothing.
    const colSuffix = () => (rec.col ? ` c${rec.col.join(',')}` : '');
    wrap('drawMesh', (o) => function (mesh, o2) { if (rec.on) rec.ops.push(`mesh ${o2?.count ?? mesh?.count ?? '?'}:t${rec.tex}${colSuffix()}`); return o.apply(this, arguments); });
    wrap('drawElements', (o) => function (pos, uvs, idx) {
      if (rec.on) {
        rec.uv = uvExtent(uvs, this.textureUnits?.[0]?.matrix);
        // The MODELVIEW in force, rounded. apitrace gives the executable's
        // glLoadMatrixf values, so this is the last observable that can be
        // compared directly; Wine's +opengl channel logs only the pointer.
        const mv = this.cur?.m ? [...this.cur.m].map((v) => Math.round(v * 1e4) / 1e4).join(',') : '?';
        rec.ops.push(`elems ${idx?.length ?? '?'}:t${rec.tex}${colSuffix()}`
          + ` [blend=${rec.blend} ${rec.bf} depth=${rec.depth} dmask=${rec.dmask}] mv=${mv}`);
        snapshot(this, { kind: 'elems', mode: 'TRIANGLES', n: idx?.length ?? 0 });
      }
      return o.apply(this, arguments);
    });
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
        window.__rec.ops.length = 0;
    if (window.__rec.states) window.__rec.states.length = 0; window.__rec.on = true;
        await d.render({ part: part.name, local: tt - part.start });
        window.__rec.on = false;
        return { part: part.name, local: tt - part.start, ops: window.__rec.ops.slice(), states: (window.__rec.states ?? []).slice() };
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

  // --only exercises the adapter's PER-CALL whitelist. `--query only=a,b` sets the
  // same filter at page load; both must produce the same draw stream, which is how
  // the per-call path is held to the one that was already proven.
  const frame = await page.evaluate(async ([t, only]) => {
    const d = window.__demo;
    const parts = d.schedule();
    const part = parts.find((p) => t >= p.start && t < p.start + p.dur) ?? parts[0];
    window.__rec.ops.length = 0;
    window.__rec.on = true;
    const info = await d.render({ part: part.name, local: t - part.start, ...(only ? { only } : {}) });
    window.__rec.on = false;
    return { part: part.name, local: t - part.start, ops: window.__rec.ops.slice(), states: (window.__rec.states ?? []).slice(), info };
  }, [showTime, onlyList]);

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
