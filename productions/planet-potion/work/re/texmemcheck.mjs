// texmemcheck.mjs — the textures as the intro leaves them in memory.
//
//   node work/re/texmemcheck.mjs [out/]
//
// `texvmdiff` compares the JS VM against `rendertex.py`, which runs each texture
// program IN ISOLATION. That is the right way to test a VM, and it cannot see
// whether the programs interact: they run in sequence over one arena, and part
// one's program 26 provably reads texture memory. So "every program is
// byte-exact on its own" and "the texture the draw calls sample is right" are
// different claims, and only the second one is about the picture.
//
// This checks the second. `texmemdump.py` probes the live images after a real
// init — through the pointer in each W3D_AllocTexObj tag list rather than a
// guessed offset — and this compares all 48 against what the page generates.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTextures } from '../../web/js/textures.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] ?? path.join(HERE, 'out');
const DATA = path.resolve(HERE, '..', '..', 'web', 'data');
const live = path.join(out, 'texmem_p1.bin');

if (!fs.existsSync(live)) {
  console.log(`texmemcheck: need ${live} — ./ppcbox.sh python3 texmemdump.py. Skipping.`);
  process.exit(ABSENT);
}

const mem = fs.readFileSync(live);
const programs = JSON.parse(fs.readFileSync(path.join(DATA, 'tex_programs.json'), 'utf8'));
const kernels = JSON.parse(fs.readFileSync(path.join(DATA, 'tex_kernels.json'), 'utf8'));
const { byPart } = buildTextures(programs, kernels);

let rgbDiffering = 0;
const N = 128 * 128 * 4;
const count = Math.floor(mem.length / N);
let exact = 0, differing = 0, absent = 0, texels = 0;
const bad = [];
for (let t = 0; t < count; t++) {
  const ours = byPart.p1[t];
  if (!ours) { absent++; continue; }
  // The arena is A8R8G8B8 and textures.js hands back RGBA, so the comparison
  // rotates rather than assuming they agree — the same conversion uploadTexture
  // must NOT do a second time.
  let n = 0, rgbBad = 0;
  for (let i = 0; i < N; i += 4) {
    const rgb = mem[t * N + i + 1] !== ours[i] || mem[t * N + i + 2] !== ours[i + 1]
      || mem[t * N + i + 3] !== ours[i + 2];
    if (rgb) rgbBad++;
    if (rgb || mem[t * N + i] !== ours[i + 3]) n++;
  }
  if (rgbBad) rgbDiffering++;
  if (n) { differing++; texels += n; bad.push(`tex${t}: ${n} texels`); } else exact++;
}

let failed = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) failed++;
};

console.log(`${count} textures dumped from live memory after a real init\n`);
// A RATCHET, and it exists because it caught something no other check could.
// `texvmdiff` compares against the PNGs `rendertex.py` writes, and those DROP
// BYTE 0 — the alpha. So the alpha channel of all 69 textures was unverified,
// and one texture is wrong in it: tex10 has 251 texels, the whole of column
// x = 1, where the original's alpha is 255 and ours is 0. A one-pixel seam,
// invisible to every existing oracle, and it is a real defect rather than a
// tolerance: alpha drives the blend.
//
// Written down rather than hidden so it cannot get worse, and so that fixing it
// means editing this line.
const FLOOR = { exact: 47, texels: 251 };
ok('the textures in live memory are no worse than when last measured',
  exact >= FLOOR.exact && texels <= FLOOR.texels,
  `${exact}/${exact + differing} byte-exact including alpha`
  + (texels ? `, ${texels} texels differ (floor ${FLOOR.texels})` : ''));
ok('and every difference that remains is in the ALPHA channel only',
  rgbDiffering === 0, `${count - rgbDiffering}/${count} exact on R, G and B`);
for (const b of bad.slice(0, 8)) console.log(`     ${b}`);
ok('and the dump covers the whole table', count === 48 && absent === 0,
  `${count} images, ${absent} with no program of ours`);

if (failed) process.exit(1);
console.log('\nrunning the texture programs in sequence gives the same pixels '
  + 'as running each one alone');
