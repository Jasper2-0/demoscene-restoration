#!/usr/bin/env node

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const workDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(workDir, 'src', 'demo.dat');
const outputDir = join(workDir, 'unpacked', 'demo_dat');
const data = readFileSync(sourcePath);

// Energia disguises the first ZIP local-file marker as "UN\x03\x04". The
// remaining local records and the central directory retain their PK markers.
if (!data.subarray(0, 4).equals(Buffer.from([0x55, 0x4e, 0x03, 0x04]))) {
  throw new Error('demo.dat does not have the expected UN local-file marker');
}
data[0] = 0x50;
data[1] = 0x4b;

mkdirSync(outputDir, { recursive: true });
const temporaryDir = mkdtempSync(join(tmpdir(), 'energia-unpack-'));
const temporaryZip = join(temporaryDir, 'demo.zip');

try {
  writeFileSync(temporaryZip, data);
  const result = spawnSync('/usr/bin/unzip', ['-qo', temporaryZip, '-d', outputDir], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `unzip exited ${result.status}`);
  }
} finally {
  rmSync(temporaryDir, { recursive: true, force: true });
}

console.log(`Extracted demo.dat to ${outputDir}`);
