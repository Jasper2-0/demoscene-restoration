#!/usr/bin/env node
// sync-shared-runtime.mjs — vendor shared runtime packages into production web
// trees, and (--check) fail on drift.
//
//   node tools/sync-shared-runtime.mjs           # copy canonical -> vendored
//   node tools/sync-shared-runtime.mjs --check   # report drifted/missing, exit 1
//
// Shipped sites stay self-contained: no page imports across production
// boundaries, so shared code travels by CHECKED VENDORING. Each package below
// has one canonical source under shared/ and a list of vendor sites; the
// build scripts run --check as a hard gate, so a stale vendored copy cannot
// ship. Growing the table is the whole upgrade path: when a runtime library
// (minigl, minid3d7, minid3d8, the XM replayer) is unified from its
// per-production copies into shared/<package>/, it gets an entry here and
// every consumer inherits the drift gate.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// package -> { source, files, targets[] }. Paths are repo-relative.
const PACKAGES = {
  sunflower: {
    source: 'shared/sunflower/js',
    files: [
      'asset-catalog.js', 'audio-clock.js', 'envelope.js', 'exp.js',
      'exp-renderer.js', 'mathlib.js', 'mesh-geometry.js', 'minigl.js',
      'scene.js', 'textures.js', 'timeline.js', 'xm.js',
    ],
    targets: [
      'productions/wonder/web/js/shared',
      'productions/energia/web/js/shared',
    ],
  },
  // Lapsus renders its meshes through minigl but has no use for the rest of
  // the sunflower scene layer, so it takes the shim and the maths it imports
  // and nothing else. Vendored rather than cross-imported for the same reason
  // as wonder and energia: a shipped page must stand on its own tree, and the
  // verify harness serves productions/lapsus as its root.
  minigl: {
    source: 'shared/sunflower/js',
    files: ['minigl.js', 'mathlib.js'],
    targets: ['productions/lapsus/web/js/shared'],
  },
  // Planned (unification happens one library at a time, each behind the
  // production's own verify gates — see the monorepo plan):
  //   minigl:   OpenGL 1.x FF over WebGL2   (ptct, wonder, energia)
  //   minid3d7: D3D7 immediate mode         (lost-vegas)
  //   minid3d8: D3D8 fixed function         (sonnet)
  //   xm:       XM replayer                 (lost-vegas, sonnet, sunflower pair)
};

const check = process.argv.includes('--check');
const unknown = process.argv.slice(2).filter((arg) => arg !== '--check');
if (unknown.length) {
  console.error('usage: node tools/sync-shared-runtime.mjs [--check]');
  process.exit(2);
}

let failures = 0;
let nFiles = 0, nSites = 0;
for (const [name, pkg] of Object.entries(PACKAGES)) {
  const source = path.join(repo, pkg.source);
  for (const targetRel of pkg.targets) {
    const target = path.join(repo, targetRel);
    nSites++;
    if (!check) await fs.mkdir(target, { recursive: true });
    for (const file of pkg.files) {
      nFiles++;
      const canonical = await fs.readFile(path.join(source, file));
      const to = path.join(target, file);
      if (check) {
        let vendored;
        try {
          vendored = await fs.readFile(to);
        } catch (error) {
          if (error.code !== 'ENOENT') throw error;
          console.error(`missing: ${path.relative(repo, to)}`);
          failures++;
          continue;
        }
        if (!canonical.equals(vendored)) {
          console.error(`drifted: ${path.relative(repo, to)}`);
          failures++;
        }
      } else {
        await fs.writeFile(to, canonical);
        console.log(`synced ${path.relative(repo, to)}`);
      }
    }
  }
}

if (failures) process.exit(1);
if (check) console.log(`shared runtime verified (${nFiles} vendored files across ${nSites} sites)`);
