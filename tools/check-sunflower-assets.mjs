#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configurations = [
  {
    name: 'Wonder',
    source: path.join(repo, 'productions/wonder/work', 'unpacked', 'won_der'),
    target: path.join(repo, 'productions/wonder/web', 'assets'),
    manifest: path.join(repo, 'productions/wonder/web', 'assets-manifest.json'),
    extras: [],
  },
  {
    name: 'Energia',
    source: path.join(repo, 'productions/energia/work', 'unpacked', 'demo_dat'),
    target: path.join(repo, 'productions/energia/web', 'assets'),
    manifest: path.join(repo, 'productions/energia/web', 'assets-manifest.json'),
    extras: [{
      source: path.join(repo, 'productions/energia/work', 'src', 'RinneRadio-Helsinki_[Crankshaft.mix].mp3'),
      path: 'energia.mp3',
    }],
  },
];

const write = process.argv.includes('--write');
const unknown = process.argv.slice(2).filter((argument) => argument !== '--write');
if (unknown.length) {
  console.error('usage: node tools/check-sunflower-assets.mjs [--write]');
  process.exit(2);
}

async function walk(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await walk(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files;
}

async function describe(filename, relative) {
  const bytes = await fs.readFile(filename);
  return {
    path: relative,
    size: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

const present = async (p) => fs.access(p).then(() => true, () => false);

for (const configuration of configurations) {
  // Gitignored inputs (work/src payload, the energia MP3) are absent on a
  // fresh clone until rehydrated from originals/. Skip that configuration
  // with an actionable message instead of throwing — build-wonder.sh greps
  // for its own production's verified line, so a skip elsewhere never
  // green-lights a build it shouldn't.
  const inputs = [configuration.source, ...configuration.extras.map((e) => e.source)];
  const absent = [];
  for (const input of inputs) if (!await present(input)) absent.push(path.relative(repo, input));
  if (absent.length) {
    console.log(`${configuration.name}: SKIPPED — missing ${absent.join(', ')} ` +
      `(rehydrate: node tools/fetch/originals.mjs, then unzip into work/src)`);
    continue;
  }
  const paths = await walk(configuration.source);
  const expected = await Promise.all([
    ...paths.map((relative) => describe(path.join(configuration.source, relative), relative)),
    ...configuration.extras.map((extra) => describe(extra.source, extra.path)),
  ]);
  expected.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  const document = { demo: configuration.name, assets: expected };

  if (write) {
    await fs.writeFile(configuration.manifest, `${JSON.stringify(document, null, 2)}\n`);
  } else {
    const recorded = JSON.parse(await fs.readFile(configuration.manifest, 'utf8'));
    if (JSON.stringify(recorded) !== JSON.stringify(document)) {
      throw new Error(`${configuration.name} asset manifest is stale; run with --write`);
    }
  }

  const targetPaths = await walk(configuration.target);
  const expectedPaths = expected.map((entry) => entry.path);
  if (JSON.stringify(targetPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`${configuration.name} runtime asset paths or filename case do not match the manifest`);
  }
  const actual = await Promise.all(targetPaths.map((relative) => describe(path.join(configuration.target, relative), relative)));
  actual.sort((a, b) => a.path.localeCompare(b.path, 'en'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${configuration.name} runtime assets differ from the preserved extraction`);
  }
  console.log(`${configuration.name}: ${expected.length} case-exact assets verified`);
}
