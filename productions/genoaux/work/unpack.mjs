#!/usr/bin/env node
// unpack.mjs — extract the pinned Genoaux archive into work/unpacked/hjb_geno/.
//
//   node productions/genoaux/work/unpack.mjs
//
// The original is an ordinary zip, so this could have been `unzip`. It is not,
// for two reasons that matter to a restoration:
//
//   1. CASE. The engine loads `data\Star.jpg` while the archive holds
//      `Data/Star.jpg`, and the script names things in a third casing again.
//      Extraction has to preserve the archive's bytes for a name exactly,
//      because "which case did the original ship?" is a question the port has
//      to answer, and a case-insensitive filesystem plus a helpful tool will
//      quietly destroy the evidence. Names are decoded latin1 and written
//      verbatim; a collision that differs only by case is an ERROR, not a
//      silent overwrite.
//   2. REPRODUCIBILITY. This verifies the source hash against prod.json before
//      it writes anything, so the tree can never be built from a different
//      archive than the one the manifest pins.
//
// Writes work/MANIFEST.sha256 over the extracted tree.
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const workDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(workDir, '..', '..', '..');
const prod = JSON.parse(readFileSync(join(workDir, '..', 'prod.json'), 'utf8'));
const source = prod.originals[0];
const archivePath = join(repoRoot, source.path);
const outputDir = join(workDir, 'unpacked', 'hjb_geno');

let archive;
try {
  archive = readFileSync(archivePath);
} catch {
  console.error(`no archive at ${source.path} — run: node tools/fetch/originals.mjs genoaux`);
  process.exit(1);
}

const actual = createHash('sha256').update(archive).digest('hex');
if (actual !== source.sha256) {
  throw new Error(`archive hash mismatch\n  expected ${source.sha256}\n  actual   ${actual}`);
}

// Locate the end-of-central-directory record. The comment field is variable
// length, so scan back from the end rather than assuming it is absent — this
// archive carries a scene.org ASCII banner as its comment.
let eocd = -1;
for (let i = archive.length - 22; i >= 0; i--) {
  if (archive.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
}
if (eocd < 0) throw new Error('no end-of-central-directory record');

const entryCount = archive.readUInt16LE(eocd + 10);
let offset = archive.readUInt32LE(eocd + 16);

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const seen = new Map();
const written = [];

for (let i = 0; i < entryCount; i++) {
  if (archive.readUInt32LE(offset) !== 0x02014b50) {
    throw new Error(`bad central directory header at entry ${i}`);
  }
  const method = archive.readUInt16LE(offset + 10);
  const crc = archive.readUInt32LE(offset + 16);
  const compSize = archive.readUInt32LE(offset + 20);
  const rawSize = archive.readUInt32LE(offset + 24);
  const nameLen = archive.readUInt16LE(offset + 28);
  const extraLen = archive.readUInt16LE(offset + 30);
  const commentLen = archive.readUInt16LE(offset + 32);
  const localOffset = archive.readUInt32LE(offset + 42);
  const name = archive.subarray(offset + 46, offset + 46 + nameLen).toString('latin1');
  offset += 46 + nameLen + extraLen + commentLen;

  if (name.endsWith('/')) continue;                       // directory entry
  if (name.includes('..')) throw new Error(`refusing traversal path: ${name}`);

  // The local header repeats the name and carries its own extra field, whose
  // length routinely differs from the central one. Read the local lengths.
  if (archive.readUInt32LE(localOffset) !== 0x04034b50) {
    throw new Error(`bad local header for ${name}`);
  }
  const lNameLen = archive.readUInt16LE(localOffset + 26);
  const lExtraLen = archive.readUInt16LE(localOffset + 28);
  const dataStart = localOffset + 30 + lNameLen + lExtraLen;
  const compressed = archive.subarray(dataStart, dataStart + compSize);

  let data;
  if (method === 0) data = Buffer.from(compressed);
  else if (method === 8) data = inflateRawSync(compressed);
  else throw new Error(`${name}: unsupported compression method ${method}`);

  if (data.length !== rawSize) {
    throw new Error(`${name}: inflated ${data.length} bytes, header says ${rawSize}`);
  }
  // The zip's own CRC is a free end-to-end check on the inflate; use it.
  let c = ~0;
  for (const b of data) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  if ((~c >>> 0) !== crc) throw new Error(`${name}: CRC mismatch`);

  const folded = name.toLowerCase();
  if (seen.has(folded) && seen.get(folded) !== name) {
    throw new Error(`case collision: ${name} vs ${seen.get(folded)} — this filesystem cannot hold both`);
  }
  seen.set(folded, name);

  const target = join(outputDir, ...name.split('/'));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
  written.push([name, createHash('sha256').update(data).digest('hex')]);
}

written.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
const rel = `unpacked${sep}hjb_geno${sep}`;
writeFileSync(
  join(workDir, 'MANIFEST.sha256'),
  written.map(([n, h]) => `${h}  ${rel}${n.split('/').join(sep)}`).join('\n') + '\n',
);

console.log(`genoaux: ${written.length} files extracted, CRC-checked, into work/unpacked/hjb_geno/`);
console.log(`genoaux: wrote work/MANIFEST.sha256`);
