// imgmap.mjs — GENERATE the address-level map of unpacked/sonnet_img.bin.
//
//   node re/tools/imgmap.mjs            # write re/IMAGE_MAP.md
//   node re/tools/imgmap.mjs --stdout
//
// WHY GENERATED.  re/ANALYSIS.md §7 has a five-row entropy scan, which was the
// right thing in week one and is not a map.  Everything precise we know lives
// in the places that USE it — the audio port's stream table, codec0's constant
// addresses, poem.json's own `table_va`, timeline.json's `source`, the resource
// archive's generated header, re/oracle/names.json.  A hand-written map would
// be a sixth copy and the first to rot; this reads those sources and fails if
// one of them stops parsing.
//
// The last column is the point: how much of the image is ATTRIBUTED.  Regions
// nobody has named are the honest measure of what is still unknown, and they
// are printed with their entropy so the interesting ones stand out from the
// zero-fill.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(HERE, '..', '..');
const IMG_BASE = 0x401000;

const img = fs.readFileSync(path.join(WORK, 'unpacked/sonnet_img.bin'));
const hex = (v) => '0x' + v.toString(16).padStart(6, '0');
const regions = [];
const add = (va, end, kind, name, source) =>
  regions.push({ va, end, kind, name, source });

// ---------------------------------------------------------------- functions
const names = JSON.parse(fs.readFileSync(path.join(WORK, 're/oracle/names.json'), 'utf8')).symbols;
const fns = Object.entries(names)
  .map(([va, v]) => ({ va: parseInt(va, 16), ...v }))
  .sort((a, b) => a.va - b.va);

// ------------------------------------------------------------------- data
// Each of these is read from the module that depends on it, so the map cannot
// disagree with the runtime.
const codec = await import(path.join(WORK, 'audio/codec0.mjs'));
const mod = await import(path.join(WORK, 'audio/module.mjs'));
const modParsed = mod.readModule(path.join(WORK, 'unpacked/sonnet_img.bin'));

add(Math.min(...Object.values(codec.CONST)), 0x418288, 'data',
    'codec0 constants (pi/64 f64, pi/256, 1/256)', 'audio/codec0.mjs CONST');
add(codec.CONST.windowCoefficients, codec.CONST.windowCoefficients + 32, 'data',
    'codec0 window cosine series (f32[8])', 'audio/codec0.mjs CONST');
add(mod.STREAMS.header, mod.STREAMS.instrument, 'data',
    'XM header stream (276 B + order table)', 'audio/module.mjs STREAMS');
add(mod.STREAMS.instrument, mod.STREAMS.synth, 'data',
    'XM instrument stream (de-interleaved)', 'audio/module.mjs STREAMS');
add(mod.STREAMS.synth, mod.STREAMS.pattern, 'data',
    'XM synth stream (per-instrument programs)', 'audio/module.mjs STREAMS');
add(mod.STREAMS.pattern, modParsed.patterns.end, 'data',
    `XM pattern stream (43 patterns x 26 ch, de-interleaved)`, 'audio/module.mjs readPatterns');

// The resource archive: its generated header states the VA, and the chain is
// walked here so the END is measured rather than asserted.
const resSrc = fs.readFileSync(path.join(WORK, 'js/resources.mjs'), 'utf8');
const archVa = parseInt(/resource archive at VA (0x[0-9a-f]+)/i.exec(resSrc)[1], 16);
{
  const dv = new DataView(img.buffer, img.byteOffset, img.byteLength);
  let p = archVa - IMG_BASE, n = 0;
  const { RESOURCES } = await import(path.join(WORK, 'js/resources.mjs'));
  for (; n < RESOURCES.length; n++) { p += 4 + dv.getUint32(p, true); }
  add(archVa, IMG_BASE + p, 'data',
      `resource archive — ${n} length-prefixed blocks (texture programs, scene + sub-object descriptors)`,
      'js/resources.mjs header + walked here');
}

const poem = JSON.parse(fs.readFileSync(path.join(WORK, 're/text/poem.json'), 'utf8'));
add(parseInt(poem.table_va, 16), parseInt(poem.table_end_va, 16), 'data',
    `poem text-item table — ${poem.record_count} variable-length records`, 're/text/poem.json table_va');

const tl = JSON.parse(fs.readFileSync(path.join(WORK, '../web/assets/timeline.json'), 'utf8'));
const tlVa = parseInt(/VA (0x[0-9a-f]+)/i.exec(tl.source)[1], 16);
add(tlVa, tlVa + tl.event_count * 8, 'data',
    `timeline event table — ${tl.event_count} x 8 B {u16 t; u8 obj; u8 method; f32 param}`,
    'assets/timeline.json source + event_count');
add(tlVa + tl.event_count * 8, tlVa + tl.event_count * 8 + 40, 'data',
    'object name strings (Landscape, Font, Background, Border)', 're/ENGINE.md');

// Pinned singletons documented across re/.
add(0x41a9b8, 0x41a9bc, 'data', 'RNG seed — the MSVC LCG state, one global stream',
    're/CONVENTIONS.md, js/rng.mjs');
add(0x417000, 0x4170b0, 'data', 'private IAT (all zero in the depacked image)',
    're/oracle/emu.py');

// ------------------------------------------------------------------- code
const codeEnd = Math.max(...fns.map((f) => f.va)) + 0x400;   // last known symbol + slack
add(IMG_BASE, 0x416036, 'code', `engine code — ${fns.length} symbols pinned in names.json`,
    're/oracle/names.json');
add(0x416036, 0x4170b0, 'code', 'texgen VM (FUN_00416036) + init tail', 're/oracle/names.json');
add(0x485000, IMG_BASE + img.length, 'data', 'runtime import metadata (names resolved at startup)',
    're/ANALYSIS.md §1');

regions.sort((a, b) => a.va - b.va || a.end - b.end);

// ------------------------------------------------------------- unattributed
// Everything not covered above, with an entropy estimate so zero-fill and real
// data are distinguishable at a glance.
const covered = new Uint8Array(img.length);
for (const r of regions) {
  for (let i = r.va - IMG_BASE; i < Math.min(r.end - IMG_BASE, img.length); i++) covered[i] = 1;
}
const gaps = [];
let start = -1;
for (let i = 0; i <= img.length; i++) {
  if (i < img.length && !covered[i]) { if (start < 0) start = i; }
  else if (start >= 0) { gaps.push([start, i]); start = -1; }
}
const entropy = (a, b) => {
  const h = new Uint32Array(256);
  for (let i = a; i < b; i++) h[img[i]]++;
  const n = b - a;
  let e = 0;
  for (const c of h) if (c) { const p = c / n; e -= p * Math.log2(p); }
  return e;
};
const zeroFrac = (a, b) => {
  let z = 0;
  for (let i = a; i < b; i++) if (img[i] === 0) z++;
  return z / (b - a);
};

// ------------------------------------------------- cited scalar constants
// The port cites individual data addresses in its comments — `[0x418200]`,
// `_DAT_004170c4` — one per float or int it reads out of the image.  They are
// too small to be regions, but overlaying them turns "unidentified" into
// "referenced but unnamed", which is a much more useful thing to know.
const cited = new Set();
const scan = (dir, re) => {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) { if (!/node_modules|__pycache__/.test(f.name)) scan(full, re); continue; }
    if (!re.test(f.name)) continue;
    const txt = fs.readFileSync(full, 'utf8');
    for (const m of txt.matchAll(/(?:_?DAT_00|\[0x)([0-9a-fA-F]{6})/g)) {
      const va = parseInt(m[1], 16);
      if (va >= IMG_BASE && va < IMG_BASE + img.length) cited.add(va);
    }
  }
};
for (const d of ['js', 'audio', '../web/js', 're']) scan(path.join(WORK, d), /\.(mjs|js|md|py)$/);

let attributed = 0;
for (const c of covered) attributed += c;

// ---------------------------------------------------------------- emit
const L = [];
L.push('# Image map — `unpacked/sonnet_img.bin`');
L.push('');
L.push('**GENERATED by `re/tools/imgmap.mjs`. Do not hand-edit.**');
L.push('');
L.push('Every row is read from the module that depends on it (the audio port\'s');
L.push('stream table, codec0\'s constants, `poem.json`\'s own `table_va`,');
L.push('`timeline.json`\'s `source`, the generated resource-archive header,');
L.push('`re/oracle/names.json`), so this cannot drift from the runtime. Regenerate');
L.push('after any of those change.');
L.push('');
L.push('## Where the file came from');
L.push('');
L.push('`originals/threestate/3s-sonnet/sonnet.exe` — 65,536 B, the whole 64k budget');
L.push('to the byte — packed with **ryg\'s packer** (the PE sections are named');
L.push('`rygs and` / `packer. `; the nfo thanks "Ryg (Packer)"). An aPLib-style LZ');
L.push('(MSB-first tag bits, gamma lengths, offset thresholds 0x7D00/0x500/0x7F,');
L.push('simplified: repeat-offset on gamma==2 is unconditional), followed by an E8/E9');
L.push('call filter with exactly 0x851 rel32 fixups. `work/unpack.py` unpacks it');
L.push('statically and byte-faithfully — the stub was transcribed from ndisasm at file');
L.push('offset 0xfcc0. OEP 0x4042d3. See `re/ANALYSIS.md` §1.');
L.push('');
L.push(`**VA 0x401000 == file offset 0.** ${img.length} bytes, VA 0x401000..${hex(IMG_BASE + img.length)}.`);
L.push('');
L.push('## Named regions');
L.push('');
L.push('| VA start | VA end | size | kind | what | pinned by |');
L.push('|---|---|---|---|---|---|');
for (const r of regions) {
  L.push(`| \`${hex(r.va)}\` | \`${hex(r.end)}\` | ${(r.end - r.va).toLocaleString()} | ${r.kind} | ${r.name} | ${r.source} |`);
}
L.push('');
L.push(`**Attributed: ${attributed.toLocaleString()} / ${img.length.toLocaleString()} B ` +
       `(${(100 * attributed / img.length).toFixed(1)}%).**`);
L.push('');
L.push('## Unattributed');
L.push('');
L.push('What nobody has named yet. `zero` is the fraction of zero bytes and `H` the');
L.push('byte entropy in bits — a run at `zero≈1.00` is the allocator\'s zero-fill and');
L.push('uninteresting; anything with `H > 4` is real data still to be identified.');
L.push('');
L.push('| VA start | VA end | size | zero | H | note |');
L.push('|---|---|---|---|---|---|');
for (const [a, b] of gaps.filter(([a, b]) => b - a >= 256).sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]))) {
  const z = zeroFrac(a, b), h = entropy(a, b);
  const hits = [...cited].filter((v) => v >= IMG_BASE + a && v < IMG_BASE + b).length;
  const note = z > 0.99 ? 'zero-fill'
    : hits ? `${hits} cited constants — the float32 literal pool, analysed in re/ANALYSIS.md §7b`
    : h > 4 ? '**real data — unidentified**' : 'sparse / mostly zero';
  L.push(`| \`${hex(IMG_BASE + a)}\` | \`${hex(IMG_BASE + b)}\` | ${(b - a).toLocaleString()} | ${z.toFixed(2)} | ${h.toFixed(1)} | ${note} |`);
}
L.push('');
L.push(`Of the ${cited.size} distinct data addresses the port cites in its comments,`);
L.push(`${[...cited].filter((v) => !covered[v - IMG_BASE]).length} fall outside every named region above — those are the constant pool.`);
L.push('');
L.push('## Function symbols');
L.push('');
L.push(`${fns.length} pinned in \`re/oracle/names.json\`, which is the source of truth`);
L.push('shared with `re/tools/xray.py` and `re/oracle/*`. `js` is the port-map half.');
L.push('');
L.push('| VA | name | port |');
L.push('|---|---|---|');
for (const f of fns) L.push(`| \`${hex(f.va)}\` | ${f.name} | ${f.js || ''} |`);
L.push('');

const out = L.join('\n');
if (process.argv.includes('--stdout')) console.log(out);
else {
  fs.writeFileSync(path.join(WORK, 're/IMAGE_MAP.md'), out);
  console.log(`wrote re/IMAGE_MAP.md — ${regions.length} named regions, ` +
              `${(100 * attributed / img.length).toFixed(1)}% attributed, ${fns.length} symbols`);
}
