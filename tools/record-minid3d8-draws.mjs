#!/usr/bin/env node
// record-minid3d8-draws.mjs — capture a MiniD3D8 port's draw stream.
//
// MODE:       REPORT — prints the stream and exits 0. Exits 1 only when nothing
//             was recorded, which is an invocation failure, not a verdict.
// OBSERVABLE: the ORDERED list of primitives the port submits for one frame, with
//             the D3D8 state in force at each — read from the shim, not inferred.
// UNITS:      `vertexCount` is vertices, never triangles. `stride` is bytes.
//             `--pos` is a MUSIC POSITION, (order << 8) | row, as the issues quote.
//
//   node tools/record-minid3d8-draws.mjs sonnet --pos 0x151f [--out port.jsonl]
//   node tools/record-minid3d8-draws.mjs sonnet --pos 0x151f --verts
//
// Writes the envelope in tools/DRAWSTREAM.md, so the original's side — recorded by
// a completely different machine (work/re/oracle) — is diffable against it.
//
// WHY MiniD3D8.prototype AND NOT THE WebGL CONTEXT. The same reason
// record-minigl-draws.mjs gives for MiniGL: the two sides do not agree below the
// API the port reimplements and are not supposed to. The original calls
// DrawPrimitiveUP with 44-byte vertices; this shim uploads them into a buffer and
// issues drawArrays. Comparing at the GL level would report a difference on every
// draw and mean nothing. D3D8 is the level where the original and the port say the
// same thing, so D3D8 is where the tap goes.
//
// NOTHING IN THE PORT IS MODIFIED. ES modules are cached per URL, so importing the
// page's own minid3d8.js from the page context yields the SAME module object the
// app is using; patching its prototype affects the live instance.
import { writeFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withPage, fromRepo } from './harness/index.mjs';

const argv = process.argv.slice(2);
const production = argv.find((a) => !a.startsWith('--'));
const opt = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i < 0 ? d : (argv[i + 1]?.startsWith('--') ? true : argv[i + 1]) ?? true;
};
if (!production) {
  console.error('usage: record-minid3d8-draws.mjs <production> --pos 0xNNNN [--out f.jsonl] [--verts]');
  process.exit(2);
}

// DERIVED, NOT TABULATED — a shared tool must not carry a list of the productions
// it happens to have been used on, which is how oracle-at.sh came to look general
// while only working for Wonder. The layout IS the contract.
// THE SERVER ROOT IS THE PRODUCTION, NOT web/. main.js derives its data roots from
// import.meta.url as `../../work/`, so a server rooted at web/ answers the page and
// 404s everything it needs — the boot then hangs on __sonnetReady with no error,
// which reads as a broken recorder rather than a wrong root. (This is the same
// layout build-sonnet.sh reproduces in dist/, and for the same reason.)
const cfg = { root: `productions/${production}`, page: '/web/index.html',
              mod: './js/minid3d8.js' };
for (const [what, rel] of [['production', ''], ['MiniD3D8 module', 'web/js/minid3d8.js'],
                           ['page', 'web/index.html']]) {
  const probe = rel ? fromRepo(cfg.root, rel) : fromRepo(cfg.root);
  if (!existsSync(probe)) {
    console.error(`no ${what} at ${cfg.root}${rel ? `/${rel}` : ''}`);
    console.error(`productions with a MiniD3D8: ` +
      readdirSync(fromRepo('productions')).sort()
        .filter((p) => existsSync(fromRepo('productions', p, 'web/js/minid3d8.js'))).join(', '));
    process.exit(2);
  }
}

const posArg = opt('pos');
if (!posArg || posArg === true) { console.error('--pos 0xNNNN is required'); process.exit(2); }
const WANT_VERTS = argv.includes('--verts');

let status = 0;
await withPage({ root: cfg.root, path: cfg.page, query: '?inspect=1&quality=original&warm=0' },
  async ({ page, errors }) => {
    await page.waitForFunction('window.__sonnetReady === true', { timeout: 180000 });

    const installed = await page.evaluate(async (modUrl) => {
      const mod = await import(modUrl);
      const P = mod.MiniD3D8?.prototype;
      if (!P) return { ok: false, why: 'no MiniD3D8 export' };
      if (P.__recInstalled) return { ok: true, already: true };
      P.__recInstalled = true;
      const wrapLater = [];

      const rec = (window.__d3drec = { draws: [], on: false, frames: 0 });

      // ONE FRAME, NOT ALL OF THEM. __sonnetRender replays FLARE_BURST (48)
      // frames as REAL renders so the flare integrator settles, then draws the
      // one being asked for. Recording across the whole call concatenates ~49
      // frames into a single "frame" — 8317 draws where the frame has ~170 —
      // and would have diffed catastrophically against a one-frame oracle while
      // looking like a plausible number.
      //
      // renderAt() presents BEFORE it renders, so this call is the frame
      // boundary: clearing here leaves exactly the last frame's draws behind.
      wrapLater.push(['presentAndRestoreBackbuffer', (orig) => function (...a) {
        if (rec.on) { rec.draws.length = 0; rec.frames++; }
        return orig.apply(this, a);
      }]);

      // NAMED, NOT NUMERIC (DRAWSTREAM.md). The emulator sees the raw argument and
      // this shim exports its own constants; a diff reporting `6 vs TRIANGLEFAN`
      // would have failed for a reason unrelated to either renderer.
      const PRIM = { 1: 'POINTLIST', 2: 'LINELIST', 3: 'LINESTRIP',
                     4: 'TRIANGLELIST', 5: 'TRIANGLESTRIP', 6: 'TRIANGLEFAN' };
      const vcount = (t, n) => (t === 1 ? n : t === 2 ? n * 2 : t === 3 ? n + 1
                              : t === 4 ? n * 3 : n + 2);

      // A texture object has no identity of its own — every one stringifies the
      // same. Number them in creation order, which is how the original's handles
      // come out too, so both sides agree on which texture is "3".
      let nextTexId = 1;
      const texId = (t) => {
        if (t == null) return 0;
        if (!t.__recId) { try { t.__recId = nextTexId++; } catch { return 0; } }
        return t.__recId;
      };

      const b64 = (view, byteLength) => {
        if (!view) return null;
        const src = ArrayBuffer.isView(view)
          ? new Uint8Array(view.buffer, view.byteOffset, Math.min(byteLength, view.byteLength))
          : new Uint8Array(view, 0, byteLength);
        let s = '';
        for (let i = 0; i < src.length; i++) s += String.fromCharCode(src[i]);
        return btoa(s);
      };

      // STATE IS OBSERVED, NOT RECONSTRUCTED (DRAWSTREAM.md). The shim already
      // holds it — that is the whole reason the tap is here and not on a log.
      // Field names are the shim's own: `transforms[state].m`, `textures[stage]`,
      // `rs[state]`, `tss[stage]`. Guessing these would have silently produced a
      // stream of nulls that diffed clean against anything.
      //
      // D3D8 transform states, from minid3d8's own SetTransform guard: WORLD is
      // 0x100 (D3D7 used 1 — a trap this shim documents), VIEW 2, PROJECTION 3,
      // TEXTURE0/1 0x10/0x11.
      const TS = { world: 0x100, view: 2, proj: 3, tex0: 0x10, tex1: 0x11 };
      const mat = (self, s) => { const t = self.transforms?.[s]; return t?.m ? [...t.m] : null; };
      const snapshot = (self) => ({
        textures: Object.fromEntries((self.textures ?? []).map((t, i) => [i, texId(t)])),
        xform: Object.fromEntries(Object.entries(TS).map(([k, s]) => [k, mat(self, s)])),
        state: { ...(self.rs ?? {}) },
        tss: [...(self.tss ?? [])].map((s) => ({ ...s })),
      });

      const wrap = (name, fn) => { const orig = P[name]; P[name] = fn(orig); };
      for (const [n, f] of wrapLater) wrap(n, f);

      wrap('DrawPrimitiveUP', (orig) => function (primType, primitiveCount, pVerts, stride) {
        if (rec.on && primitiveCount > 0) {
          const n = vcount(primType, primitiveCount);
          rec.draws.push({
            i: rec.draws.length, call: 'DrawPrimitiveUP',
            prim: PRIM[primType] ?? `PRIM_${primType}`,
            vertexCount: n, stride,
            verts: b64(pVerts, n * stride),
            ...snapshot(this),
          });
        }
        return orig.call(this, primType, primitiveCount, pVerts, stride);
      });

      wrap('DrawIndexedPrimitiveUP', (orig) => function (primType, minVertexIndex, numVertices,
                                                         primitiveCount, pIndices, indexFormat,
                                                         pVerts, stride) {
        if (rec.on && primitiveCount > 0) {
          const idxCount = vcount(primType, primitiveCount);
          rec.draws.push({
            i: rec.draws.length, call: 'DrawIndexedPrimitiveUP',
            prim: PRIM[primType] ?? `PRIM_${primType}`,
            minVertexIndex, numVertices, vertexCount: idxCount, stride,
            verts: b64(pVerts, ((minVertexIndex | 0) + numVertices) * stride),
            indices: b64(pIndices, idxCount * (pIndices?.BYTES_PER_ELEMENT ?? 2)),
            ...snapshot(this),
          });
        }
        return orig.call(this, primType, minVertexIndex, numVertices, primitiveCount,
                         pIndices, indexFormat, pVerts, stride);
      });

      return { ok: true };
    }, cfg.mod);

    if (!installed?.ok) throw new Error(`recorder not installed: ${installed?.why}`);

    const pos = Number.parseInt(String(posArg), 16);
    if (!Number.isFinite(pos)) throw new Error(`--pos ${posArg} is not a hex position`);

    const frame = await page.evaluate((p) => {
      window.__d3drec.draws.length = 0;
      window.__d3drec.on = true;
      window.__d3drec.frames = 0;
      const info = window.__sonnetRender(p);
      window.__d3drec.on = false;
      return { draws: window.__d3drec.draws, info, frames: window.__d3drec.frames };
    }, pos);

    // Digest here rather than in the page: the same hash the comparator uses, from
    // one implementation, so a mismatch cannot be the hashing.
    for (const d of frame.draws) {
      if (d.verts) d.vertsDigest = 'sha256:' + createHash('sha256').update(d.verts).digest('hex').slice(0, 16);
      if (!WANT_VERTS) delete d.verts;
      if (!WANT_VERTS) delete d.indices;
    }

    const record = {
      api: { name: 'd3d8', version: 8 },
      side: 'port',
      source: `record-minid3d8-draws.mjs ${production} --pos ${posArg}`,
      at: { position: `0x${pos.toString(16).padStart(4, '0')}`,
            scene: frame.info?.scene ?? null, songMs: frame.info?.ms ?? null },
      frame: 0,
      draws: frame.draws,
    };

    console.log(`${production} @ 0x${pos.toString(16).padStart(4, '0')}  ` +
                `${frame.draws.length} draws, ` +
                `${frame.draws.reduce((n, d) => n + d.vertexCount, 0)} vertices  ` +
                `(last of ${frame.frames} rendered frames — the rest are the flare burst)`);
    for (const d of frame.draws.slice(0, 8)) {
      console.log(`  ${String(d.i).padStart(3)}  ${d.prim.padEnd(14)} ` +
                  `${String(d.vertexCount).padStart(6)}v  stride ${d.stride}  ` +
                  `tex ${JSON.stringify(d.textures)}`);
    }
    if (frame.draws.length > 8) console.log(`  … ${frame.draws.length - 8} more`);

    if (!frame.draws.length) {
      console.error('FAIL: the port submitted nothing — the recorder or the seek is wrong,');
      console.error('      not the port. An empty stream and a perfect match are the same');
      console.error('      JSON, so this is reported loudly rather than written out.');
      status = 1;
    }
    if (errors.length) {
      console.error(`page errors: ${errors.length}`);
      for (const e of errors.slice(0, 3)) console.error('  ' + e);
      status = 1;
    }

    const out = opt('out');
    if (out && out !== true) {
      writeFileSync(out, JSON.stringify(record) + '\n');
      console.log(`wrote ${out}`);
    }
  }).catch((e) => { console.error(`FAIL: ${e.message}`); status = 1; });
process.exit(status);
