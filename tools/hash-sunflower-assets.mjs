#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['productions/wonder/work', 'productions/energia/work'];
const write = process.argv.includes('--write');
const unknown = process.argv.slice(2).filter((arg) => arg !== '--write');
if (unknown.length) {
  console.error('usage: node tools/hash-sunflower-assets.mjs [--write]');
  process.exit(2);
}

async function filesBelow(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  await visit(directory);
  return files.sort();
}

function hashFile(filename) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filename);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

for (const rootName of roots) {
  const root = path.join(repo, rootName);
  const files = [
    ...await filesBelow(path.join(root, 'src')),
    ...await filesBelow(path.join(root, 'unpacked')),
  ];
  const lines = [];
  for (const filename of files) {
    lines.push(`${await hashFile(filename)}  ${path.relative(root, filename)}`);
  }
  const content = `${lines.join('\n')}\n`;
  const output = path.join(root, 'MANIFEST.sha256');
  if (write) {
    await fs.writeFile(output, content);
    console.log(`wrote ${path.relative(repo, output)} (${files.length} files)`);
  } else {
    let existing = '';
    try { existing = await fs.readFile(output, 'utf8'); } catch {}
    if (existing !== content) {
      console.error(`${path.relative(repo, output)} is missing or stale`);
      process.exitCode = 1;
    } else {
      console.log(`verified ${path.relative(repo, output)} (${files.length} files)`);
    }
  }
}

