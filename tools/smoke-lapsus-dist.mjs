#!/usr/bin/env node
// Boot an assembled Lapsus dist in headless Chrome and prove it renders.
//
//   node tools/smoke-lapsus-dist.mjs dist/lapsus-webgl
//   node tools/smoke-lapsus-dist.mjs dist/lapsus-webgl krediili:8 hairball:3.5
//
// WHAT THIS CATCHES THAT verify-lapsus-dist.mjs CANNOT.  The static verifier
// walks import specifiers and re-hashes files. It cannot know that a part
// fetches `data/lwo/textures/Foo.jpg` when the file on disk is `foo.jpg`,
// because that path is assembled at RUNTIME from an LWO surface record through
// three different fallback conventions (main.js §texture resolution). Only
// running it produces the request, and only the harness's case-exact server
// makes the wrong case fail here instead of after publication.
//
// It uses the deterministic single-frame path (`?scene=&t=`), not the player:
// the player is driven by audio and would make this a timing test. One part,
// one instant, then stop — the same path work/verify/frame.mjs measures.
//
// A part counts as rendered when it reports a clean GL error and SOME
// primitive. Not triangles: Lapsus draws three primitive families and hairball
// is a pure hair part — 0 objects, 0 triangles, ~9180 hair lines, in the
// working tree as much as here. Gating on triangles alone would have failed a
// correct build for reproducing the renderer faithfully.
//
// Screenshot comparison is deliberately NOT done here: fidelity is the job of
// productions/lapsus/work/verify/, and duplicating it would make a build gate
// fail for reasons that have nothing to do with the build.
import process from 'node:process';
import { withPage, warmUp, assertClean } from './harness/index.mjs';

const [target = 'dist/lapsus-webgl', ...rest] = process.argv.slice(2);

// Three parts, chosen to exercise three different asset paths rather than to
// be representative of the show: hulluolli is plain geometry plus a scheduled
// fade, krediili pulls textures through the basename-resolution fallback, and
// hairball runs the hair simulation and its own .txt fetches.
const DEFAULT_PARTS = [['hulluolli', 4.8], ['krediili', 8], ['hairball', 3.5]];
const parts = rest.length
  ? rest.map((a) => { const [n, t] = a.split(':'); return [n, parseFloat(t ?? '4')]; })
  : DEFAULT_PARTS;

let failures = 0;
await withPage({ root: target, path: '/index.html', query: `?scene=${parts[0][0]}&t=${parts[0][1]}` },
  async ({ page, server, errors, failedRequests, url }) => {
    for (const [i, [scene, t]] of parts.entries()) {
      // The first part is already open from withPage's own goto; navigating to
      // the same URL again would just pay for a second boot.
      if (i > 0) {
        await page.goto(`${server.url}/index.html?scene=${scene}&t=${t}`, { waitUntil: 'domcontentloaded' });
      }
      // 60s, not the 30s default: a cold part parses its LWS and every LWO it
      // references before it can draw, and headless software GL is slower than
      // the machine this was authored on.
      await warmUp(page, { readyExpr: 'window.__lapsusReady === true', timeout: 60000 });

      // main.js installs a module-level error trap that sets __lapsusReady even
      // when it never drew, precisely so a harness does not sit out its full
      // timeout. So readiness alone proves nothing — read the trap.
      const pageError = await page.evaluate(() => window.__lapsusError ?? null);
      if (pageError) { console.error(`fail: ${scene}: ${pageError}`); failures++; continue; }

      const info = await page.evaluate(() => window.__lapsusInfo ?? null);
      if (!info) { console.error(`fail: ${scene}: rendered no frame info`); failures++; continue; }
      if (info.glError) { console.error(`fail: ${scene}: gl error ${info.glError}`); failures++; continue; }
      const drawn = (info.triangles ?? 0) + (info.hairLines ?? 0) + (info.particleCount ?? 0);
      if (!(drawn > 0)) { console.error(`fail: ${scene}: drew nothing`); failures++; continue; }

      console.log(`  ${scene} t=${t}s — ${info.objects} objects, `
        + `${Math.round(info.triangles)} triangles, ${info.texturedGroups} textured groups`
        + (info.hairLines ? `, ${info.hairLines} hair lines` : '')
        + (info.particleCount ? `, ${info.particleCount} particles` : ''));
    }

    // Everything the pages fetched, judged together: uncaught errors, failed
    // requests, 404s and case mismatches, all of them reported rather than the
    // first. A missing texture does not throw — it renders a wrong frame
    // quietly, which is the failure METHOD.md §8 is about.
    assertClean({ errors, failedRequests }, server);
    console.log(`  ${server.requests.length} requests served clean from ${url.replace(/\?.*/, '')}`);
  });

if (failures) {
  console.error(`\n${failures} part(s) failed to render in ${target}`);
  process.exit(1);
}
console.log(`booted ${target}`);
