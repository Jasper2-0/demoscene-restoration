#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(workDir, 'src', 'WON.DER');
const outputDir = join(workDir, 'unpacked', 'won_der');
const archive = readFileSync(sourcePath);
const extractedByFoldedName = new Map();

mkdirSync(outputDir, { recursive: true });

let headerOffset = 0;
let entryIndex = 0;
let writtenCount = 0;
let aliasCount = 0;

for (;;) {
  if (headerOffset + 28 > archive.length) {
    throw new Error(`Truncated entry header at 0x${headerOffset.toString(16)}`);
  }

  const packedSize = archive.readUInt32LE(headerOffset);
  const unpackedSize = archive.readUInt32LE(headerOffset + 4);
  const nameLength = archive.readUInt32LE(headerOffset + 8);
  const dataOffset = archive.readUInt32LE(headerOffset + 12);
  const nameOffset = archive.readUInt32LE(headerOffset + 16);
  const nextOffset = archive.readUInt32LE(headerOffset + 20);

  if (packedSize !== unpackedSize) {
    throw new Error(`Entry ${entryIndex} unexpectedly uses compression`);
  }
  if (nameOffset !== headerOffset + 28 || dataOffset !== nameOffset + nameLength) {
    throw new Error(`Entry ${entryIndex} has inconsistent offsets`);
  }
  if (dataOffset + packedSize > archive.length) {
    throw new Error(`Entry ${entryIndex} extends beyond the archive`);
  }

  const encodedName = archive.subarray(nameOffset, nameOffset + nameLength);
  const nullOffset = encodedName.indexOf(0);
  const name = encodedName.subarray(0, nullOffset < 0 ? undefined : nullOffset).toString('latin1');
  if (!name || basename(name) !== name || name === '.' || name === '..') {
    throw new Error(`Unsafe entry name at index ${entryIndex}: ${JSON.stringify(name)}`);
  }

  const decoded = Buffer.allocUnsafe(packedSize);
  for (let i = 0; i < packedSize; i += 1) {
    decoded[i] = archive[dataOffset + i] ^ ((0x53 + 0x13 * i) & 0xff);
  }

  // Wonder was released for a case-insensitive filesystem and contains four
  // case-only aliases. Keep one copy after proving aliased payloads match.
  const foldedName = name.toLowerCase();
  const previous = extractedByFoldedName.get(foldedName);
  if (previous) {
    const digest = createHash('sha256').update(decoded).digest('hex');
    if (digest !== previous.digest) {
      throw new Error(`Case-colliding entries contain different data: ${previous.name}, ${name}`);
    }
    aliasCount += 1;
  } else {
    writeFileSync(join(outputDir, name), decoded);
    extractedByFoldedName.set(foldedName, {
      name,
      digest: createHash('sha256').update(decoded).digest('hex'),
    });
    writtenCount += 1;
  }

  entryIndex += 1;
  if (nextOffset === 0xffffffff) {
    if (dataOffset + packedSize !== archive.length) {
      throw new Error('Final entry does not end at the archive boundary');
    }
    break;
  }
  if (nextOffset !== dataOffset + packedSize) {
    throw new Error(`Entry ${entryIndex - 1} has an inconsistent next pointer`);
  }
  headerOffset = nextOffset;
}

console.log(
  `Extracted ${writtenCount} files from ${entryIndex} records to ${outputDir} ` +
    `(${aliasCount} byte-identical case aliases skipped)`,
);
