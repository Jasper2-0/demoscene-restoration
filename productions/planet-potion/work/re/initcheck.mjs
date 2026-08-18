// initcheck.mjs — PORT_SPEC §1, the init stage, against its exported output.
//
//   node work/re/initcheck.mjs flat/ out/
//
// `font.js` ports `_init_txtgen` and `_init_scene_generate`. Both have an
// oracle already sitting in the dataset — `font_atlas.png` and `font.json` —
// and both are checkable byte-for-byte TODAY, before the text handler that will
// consume them exists. Once it does, a fault in either would surface as
// mispositioned letters and be attributed to the handler.
//
// THE ATLAS ORACLE IS RGB. `rendertex.py` writes PNG colour type 2, so the
// alpha byte never reaches the file — and the alpha byte is the interesting one
// here, because `_init_txtgen` stores 0x00ffffff and sets it to ZERO on every
// lit pixel. So this checks the three channels against the export and the
// fourth against the disassembly, and says which is which rather than implying
// the PNG covers both.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { ATLAS, expandAtlas, glyphTable, readClipScratch, CLIP_SCRATCH } from '../../web/js/font.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));
const flat = process.argv[2] ?? path.join(HERE, 'flat');
const out = process.argv[3] ?? path.join(HERE, 'out');

const seg0File = fs.existsSync(flat)
  ? fs.readdirSync(flat).find((f) => f.startsWith('seg0_')) : null;
const seg2File = fs.existsSync(flat)
  ? fs.readdirSync(flat).find((f) => f.startsWith('seg2_')) : null;
const atlasPng = path.join(out, 'font_atlas.png');
const fontJson = path.join(out, 'font.json');
const drawsJson = path.join(out, 'draws.json');
const stateJson = path.join(out, 'render_state.json');

if (!seg0File || !seg2File || !fs.existsSync(atlasPng) || !fs.existsSync(fontJson)) {
  console.log('initcheck: needs flat/ and out/font_atlas.png + font.json — see checkall.sh. Skipping.');
  process.exit(ABSENT);
}

const seg0 = new Uint8Array(fs.readFileSync(path.join(flat, seg0File)));
const seg2 = new Uint8Array(fs.readFileSync(path.join(flat, seg2File)));

let bad = 0;
const ok = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!pass) bad++;
};

/** rendertex.py writes 8-bit RGB with filter 0 on every row, so inflate is enough. */
function readPNG(file) {
  const buf = fs.readFileSync(file);
  let p = 8;
  const idat = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p);
    if (buf.toString('ascii', p + 4, p + 8) === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + n));
    p += 12 + n;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ATLAS * 3 + 1;
  const rgb = new Uint8Array(ATLAS * ATLAS * 3);
  for (let y = 0; y < ATLAS; y++) {
    if (raw[y * stride] !== 0) throw new Error('unexpected PNG filter');
    rgb.set(raw.subarray(y * stride + 1, (y + 1) * stride), y * ATLAS * 3);
  }
  return rgb;
}

// --- _init_txtgen -----------------------------------------------------------

ok('seg2 is exactly one bit per atlas pixel', seg2.length * 8 === ATLAS * ATLAS,
  `${seg2.length} bytes, ${ATLAS}x${ATLAS} pixels`);

const atlas = expandAtlas(seg2);
const want = readPNG(atlasPng);
let diff = 0, lit = 0;
for (let i = 0; i < ATLAS * ATLAS; i++) {
  for (let c = 0; c < 3; c++) if (atlas[i * 4 + 1 + c] !== want[i * 3 + c]) diff++;
  if (atlas[i * 4 + 1]) lit++;
}
ok('the expanded atlas matches font_atlas.png on every colour channel',
  diff === 0, `${ATLAS * ATLAS * 3} samples, ${diff} differ`);

// A blank atlas would also match a blank PNG, so say how much of it is ink.
ok('and it is not blank', lit > 1000 && lit < ATLAS * ATLAS,
  `${lit} of ${ATLAS * ATLAS} pixels lit`);

// The channel the oracle cannot see. `stw` of 0x00ffffff puts zero here.
const alphaSet = [...Array(ATLAS * ATLAS).keys()].filter((i) => atlas[i * 4] !== 0).length;
ok('every lit pixel has alpha ZERO, which the PNG cannot show', alphaSet === 0,
  `${alphaSet} pixels with a non-zero alpha byte`);

// --- _init_scene_generate ---------------------------------------------------

const glyphs = glyphTable(seg0);
const ref = JSON.parse(fs.readFileSync(fontJson, 'utf8'));
ok('the unpacker finds the same number of glyphs',
  glyphs.length === ref.glyphs.length, `${glyphs.length} vs ${ref.glyphs.length}`);

const mismatch = glyphs.filter((g, i) => {
  const r = ref.glyphs[i];
  return !r || r.code !== g.code || r.x !== g.x || r.y !== g.y
    || r.w !== g.w || r.h !== g.h;
});
ok('and every record matches font.json', mismatch.length === 0,
  `${glyphs.length} records, ${mismatch.length} differ`);

// The two quirks are IN THE DATA, so a port that tidies them is drawing
// something the intro does not. Asserted so nobody tidies them later.
const zeros = glyphs.map((g, i) => [g, i]).filter(([g]) => g.char === '0');
ok("the '0' record appears twice, as shipped", zeros.length === 2,
  `at ${zeros.map(([, i]) => i).join(' and ')}`);

const v = glyphs.find((g) => g.char === 'v');
const w = glyphs.find((g) => g.char === 'w');
ok("'v' carries 'w''s rectangle, so v renders as w",
  Boolean(v && w) && v.x === w.x && v.y === w.y && v.w === w.w && v.h === w.h,
  v && w ? `v=(${v.x},${v.y},${v.w},${v.h}) w=(${w.x},${w.y},${w.w},${w.h})` : 'absent');

// Every glyph rectangle has to sit inside the atlas it indexes, which is a
// cheap way of catching a record read at the wrong stride.
const outside = glyphs.filter((g) => g.x + g.w > ATLAS || g.y + g.h > ATLAS);
ok('every glyph rectangle lies inside the atlas', outside.length === 0,
  `${glyphs.length} rectangles`);

// --- _init_scene_show, as geometry ------------------------------------------

const clip = readClipScratch(seg0);
ok('the two clip pointer tables are 100 slots apart',
  clip.slots === CLIP_SCRATCH.slots, `${clip.slots} slots`);
ok('the two clip vertex arrays are 100 vertices of 0x24 apart',
  clip.arrayVertices === CLIP_SCRATCH.slots,
  `${clip.arrayVertices} x ${CLIP_SCRATCH.stride} bytes`);

// --- fog, which is init state the show script drives ------------------------
//
// `setFog` existed in the shim from the day it was written and nothing ever
// called it, so four of part one's scenes rendered clear that should not have.
// Wiring it needed the schedule resolved, and the first attempt got it wrong in
// a way worth pinning: it tracked which calls SET a preset and not whether
// fogging was switched on. `W3D_SetState(W3D_FOGGING, ...)` toggles twice each
// way inside part one, so three scenes carried a stale preset with fogging
// disabled and would have rendered foggy.
//
// The shape below is the tell that the second reading is right: four presets
// exist and four scenes use them, one each.

if (fs.existsSync(drawsJson) && fs.existsSync(stateJson)) {
  const draws = JSON.parse(fs.readFileSync(drawsJson, 'utf8'));
  const state = JSON.parse(fs.readFileSync(stateJson, 'utf8'));
  const presets = state.fog_presets ?? [];
  ok('four fog presets are exported', presets.length === 4, `${presets.length}`);
  ok('and each names the displacement it came from',
    presets.every((p) => typeof p.disp === 'string'),
    presets.map((p) => p.disp).join(' '));

  const foggy = draws.scenes.filter((s) => s.fog !== null && s.fog !== undefined);
  ok('every scene carries a resolved fog field',
    draws.scenes.every((s) => 'fog' in s), `${draws.scenes.length} scenes`);
  ok('four scenes have fog, one per preset',
    foggy.length === 4
    && new Set(foggy.map((s) => s.fog)).size === 4,
    foggy.map((s) => `${s.part}/${s.slot}=${s.fog}`).join(' '));
  ok('part three has none', foggy.every((s) => s.part === 'p1'),
    `${foggy.filter((s) => s.part === 'p3').length} p3 scenes with fog`);
  ok('every fog index addresses a preset that exists',
    foggy.every((s) => presets[s.fog]), `max index ${Math.max(...foggy.map((s) => s.fog))}`);
  // THE TEXTURE FILTER, WHICH IS PER TEXTURE. `_alloc_txt`'s one SetFilter
  // call site does not run for every texture, and the ones it skips keep
  // AllocTexObj's default — point sampling, which the capture shows on part
  // one's vertical bands. Pinned as the exact SETS, because the whole finding
  // is which textures are missing from the call and a count would not say.
  const tf = state.texture_filter;
  const WANT = { p1: [2, 4, 5, 13], p3: [0, 1, 2, 7, 10, 11, 18] };
  ok('the export records which textures W3D_SetFilter skips', Boolean(tf),
    tf ? `p1 ${tf.p1?.count} textures, p3 ${tf.p3?.count}`
      : 'no texture_filter — rerun export.py');
  if (tf) {
    for (const part of ['p1', 'p3']) {
      const got = (tf[part]?.point_sampled ?? []).join(',');
      ok(`${part}: the same textures are left point sampled`,
        got === WANT[part].join(','), `[${got}] — pinned [${WANT[part]}]`);
    }
    // And the call it DOES make is the same one every time, so "linear where it
    // is called" is a statement about one argument pair and not an average.
    const args = [...new Set(['p1', 'p3'].flatMap((k) =>
      (tf[k]?.args ?? []).map((a) => a.join(','))))];
    ok('and every call it does make is W3D_SetFilter(2, 2)',
      args.length === 1 && args[0] === '2,2', args.join(' | ') || 'none');
  }
} else {
  console.log('skipped the fog assertions — no draws.json/render_state.json');
}

if (bad) {
  console.log(`\n${bad} assertion(s) failed`);
  process.exit(1);
}
console.log('\nthe init stage reproduces the export exactly');
