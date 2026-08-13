// Integration smoke test.
//
// Every subsystem passes its own suite, but until now none of them had been in the
// same process. This checks that they AGREE — that the numbers each was verified
// against independently are the same numbers, and that the assets each expects to
// exist actually do, in the form the others produce.
//
// It deliberately does NOT re-test what the component suites already cover.
// Run: node web/test/integration_test.mjs

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEB  = join(HERE, '..');
const WORK = join(WEB, '..');

let fails = 0;
const ok = (c, msg, extra = '') => {
  console.log((c ? 'PASS' : 'FAIL') + '  ' + msg + (extra ? `   [${extra}]` : ''));
  if (!c) fails++;
};

// ---------------------------------------------------------------- timeline <-> audio
const tl = JSON.parse(readFileSync(join(WEB, 'assets/timeline.json'), 'utf8'));
const { positionToSeconds, END_POSITION } = await import(join(WEB, 'js/timeline.js'));

ok(tl.event_count === 293, 'timeline: 293 events', String(tl.event_count));
ok(tl.end_position === END_POSITION, 'timeline JSON and module agree on the end position',
   `0x${tl.end_position.toString(16)}`);

// The XM the audio work produced must be the one the timeline's clock assumes.
const xmPath = join(WORK, 'work/extracted/sonnet.xm');
ok(existsSync(xmPath), 'audio: extracted/sonnet.xm exists');
if (existsSync(xmPath)) {
  const xm = readFileSync(xmPath);
  const [orders, , channels, patterns, instruments, flags, speed, bpm] =
    [0, 2, 4, 6, 8, 10, 12, 14].map(o => xm.readUInt16LE(64 + o));
  ok(xm.slice(0, 17).toString() === 'Extended Module: ', 'audio: valid XM signature');
  ok(orders === 45 && channels === 26 && patterns === 43 && instruments === 24,
     'audio: matches vic\'s release structure',
     `${orders} orders / ${channels} ch / ${patterns} pat / ${instruments} ins`);
  ok(speed === 6 && bpm === 92, 'audio: speed 6 / BPM 92', `${speed}/${bpm}`);

  // THE cross-check: the timeline's row duration is derived from the module's own
  // tempo, so an inconsistency here means the whole demo would run at the wrong speed.
  const rowSec = speed * 2.5 / bpm;
  ok(Math.abs(rowSec - tl.row_seconds) < 1e-9,
     'timeline row duration is derived from the XM tempo (not hardcoded)',
     `${rowSec.toFixed(6)} s`);

  // ...and the end position must land inside the module, on its last order.
  const endOrder = END_POSITION >> 8, endRow = END_POSITION & 0xff;
  ok(endOrder === orders - 1, 'demo ends on the module\'s LAST order', `order ${endOrder} of ${orders}`);
  ok(endRow < 64, 'demo end row is a legal pattern row', String(endRow));
  const secs = positionToSeconds(END_POSITION);
  ok(Math.abs(secs - 461.6) < 1.0, 'demo runtime ~461.6 s vs the 464 s capture', secs.toFixed(2));
}

const partyXm = join(WORK, 'work/extracted/sonnet_partypan.xm');
ok(existsSync(partyXm), 'audio: authentic-panning variant exists too');

// ------------------------------------------------------- what actually ships
// The port GENERATES its content now (see js/assets.js): textures and meshes from
// the intro's own resource archive, the font atlas from js/fontgen.js, and every
// audio sample from the four embedded streams. `baked/` and `extracted/` are the
// `?assets=baked` fallback and the regression corpus, so the checks below still
// apply to them — but the invariant that matters is that the GENERATORS are present
// and that the thing they replace is enormously larger.
//
// Byte-level agreement between the generated and the baked assets is a browser
// question and lives in `node web/test/generate_test.mjs`, which boots
// headless Chrome and compares all 28 texture programs, the font atlas glyph scan
// and the reconstructed XM. This file checks only that the pieces exist and that
// the payload claim is true.
for (const [p, what] of [
  ['work/js/resources.mjs', 'the 4 KB resource archive'],
  ['work/js/texgen.mjs', 'the texture VM'],
  ['work/js/meshgen.mjs', 'the mesh generators'],
  ['work/audio/writexm.mjs', 'the module rebuilder'],
  ['web/js/fontgen.js', 'texgen op 17 on canvas (the font atlas)'],
  ['web/js/assets.js', 'the generate-vs-download seam'],
  ['web/js/preloader.js', 'FUN_004010dc, the progress screen'],
  ['work/unpacked/sonnet_img.bin', 'the image the audio streams live in'],
]) ok(existsSync(join(WORK, p)), `generators: ${p} present — ${what}`);

{
  const { RESOURCES } = await import(join(WORK, 'work/js/resources.mjs'));
  ok(RESOURCES.length === 52, 'generators: 52 resource blocks', String(RESOURCES.length));
  const archive = RESOURCES.reduce((a, r) => a + r.length, 0);
  ok(archive < 5000, 'generators: the whole resource archive is under 5 KB',
     `${archive} B for ${RESOURCES.length} blocks`);

  // The payload claim from re/PRELOADER.md §2, asserted rather than asserted-in-prose.
  const bytes = (p) => { try { return readFileSync(join(WORK, p)).length; } catch { return 0; } };
  const downloaded = bytes('work/extracted/sonnet.xm') + bytes('work/baked/tex_2x/11.png');
  const generated = bytes('work/unpacked/sonnet_img.bin');
  ok(generated * 3 < downloaded,
     'generators: the generated path downloads far less than the baked one',
     `${generated} B vs ${downloaded} B`);
}

// ---------------------------------------------------------------- textures
// The bake is the `?assets=baked` fallback and the corpus generate_test.mjs diffs
// against, so it must stay complete and correct.
const texDir = join(WORK, 'work/baked/tex');
ok(existsSync(texDir), 'texgen: baked/tex exists');
if (existsSync(texDir)) {
  const manifest = JSON.parse(readFileSync(join(texDir, 'manifest.json'), 'utf8'));
  const list = Array.isArray(manifest) ? manifest : manifest.textures;
  ok(list.length === 28, 'texgen: 28 texture programs baked', String(list.length));

  const pngs = readdirSync(texDir).filter(f => /^\d+\.png$/.test(f));
  ok(pngs.length === 28, 'texgen: 28 PNGs on disk', String(pngs.length));

  const missing = list.filter(t => !existsSync(join(texDir, `${t.id}.png`)));
  ok(missing.length === 0, 'texgen: every manifest entry has a PNG',
     missing.length ? missing.map(t => t.id).join(',') : 'all present');

  // The font atlas is the join between the texgen and the text engine: it is
  // texture 11, it is 2048x512, and it must no longer be black.
  const font = list.find(t => t.id === 11);
  ok(font && font.width === 2048 && font.height === 512,
     'texgen: texture 11 is the 2048x512 font strip',
     font ? `${font.width}x${font.height}` : 'missing');
  const fontPng = readFileSync(join(texDir, '11.png'));
  ok(fontPng.length > 20000, 'texgen: font atlas is populated, not black',
     `${fontPng.length} B`);

  // Anything still unimplemented should be declared, not silently empty.
  const unimpl = list.filter(t => (t.unimplemented || []).length);
  ok(unimpl.length === 0, 'texgen: no program reports unimplemented ops',
     unimpl.length ? unimpl.map(t => `${t.id}:${t.unimplemented}`).join(' ') : 'none');
}

// ---------------------------------------------------------------- text <-> font
const poemPath = join(WORK, 'work/re/text/poem.json');
ok(existsSync(poemPath), 'text: poem.json exists');
if (existsSync(poemPath)) {
  const poem = JSON.parse(readFileSync(poemPath, 'utf8'));
  ok(poem.items.length === 50, 'text: 50 poem items', String(poem.items.length));

  // Every character the poem uses must exist in the atlas the texgen bakes,
  // otherwise text will render with holes. The two charsets are lower+digits
  // +punctuation and upper+brackets.
  const CHARSET = new Set([..."abcdefghijklmnopqrstuvwxyz0123456789,!?'",
                           ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ()[]:.", ' ']);
  const bad = new Map();
  for (const it of poem.items)
    for (const ch of it.text)
      if (!CHARSET.has(ch)) bad.set(ch, (bad.get(ch) || 0) + 1);
  ok(bad.size === 0, 'text: every poem character is covered by the font atlas',
     bad.size ? [...bad].map(([c, n]) => `'${c}'x${n}`).join(' ') : 'all covered');

  // Positions must be on-screen for a 640x480 backbuffer.
  const off = poem.items.filter(i => i.x < 0 || i.x > 640 || i.y < 0 || i.y > 480);
  ok(off.length === 0, 'text: all items positioned inside 640x480',
     off.length ? `${off.length} off-screen` : 'all on-screen');
}

// ---------------------------------------------------------------- shim
ok(existsSync(join(WEB, 'js/minid3d8.js')), 'shim: minid3d8.js present');
ok(existsSync(join(WEB, 'test/minid3d8_test.html')), 'shim: regression page present');

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails ? 1 : 0);
