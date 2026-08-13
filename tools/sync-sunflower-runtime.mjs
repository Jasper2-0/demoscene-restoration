#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(repo, 'shared', 'sunflower', 'js');
const targets = [
  path.join(repo, 'productions/wonder/web', 'js', 'shared'),
  path.join(repo, 'productions/energia/web', 'js', 'shared'),
];

const files = [
  'asset-catalog.js',
  'audio-clock.js',
  'envelope.js',
  'exp.js',
  'exp-renderer.js',
  'mathlib.js',
  'mesh-geometry.js',
  'minigl.js',
  'scene.js',
  'textures.js',
  'timeline.js',
  'xm.js',
];

const check = process.argv.includes('--check');
const unknown = process.argv.slice(2).filter((arg) => arg !== '--check');
if (unknown.length) {
  console.error('usage: node tools/sync-sunflower-runtime.mjs [--check]');
  process.exit(2);
}

let failures = 0;
for (const target of targets) {
  if (!check) await fs.mkdir(target, { recursive: true });
  for (const name of files) {
    const from = path.join(source, name);
    const to = path.join(target, name);
    const canonical = await fs.readFile(from);
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

if (failures) process.exit(1);
if (check) console.log(`shared runtime verified (${files.length} files, ${targets.length} sites)`);
