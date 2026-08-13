// Per-scene INVENTORY of every system the descriptors ask for, and whether the
// port builds it.  Jasper, 2026-08-08: "perhaps first we should build a general
// inventory of whether all objects and systems are present in each scene?"
//
// The point is that the DESCRIPTOR is the authority: every flag bit and array
// count comes straight out of the resource, so nothing can be forgotten by
// oversight the way array D was (deferred for objects 7..10, needed by object
// 5).  The port-side column is a hand-maintained map from each system to the
// call site that implements it — grep-checked here, so it rots loudly.
//
//   node web/test/inventory.mjs            # table
//   node web/test/inventory.mjs --md       # markdown for re/scenes/
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RESOURCES } from '../../work/js/resources.mjs';
import { decodeSceneDescriptor, DESC_RES_MAP, ACTIVE_SCENES,
         OBJECT_TO_SCENE } from '../../work/js/scene_desc.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
// EVERY file that can implement a system, and COMMENTS STRIPPED — the first
// run of this table reported the water glitter, the shadow bake and the lens
// flare as present because the patterns matched prose ABOUT them.  A checker
// that can be fooled by a comment is worse than no checker.
const FILES = ['../js/scene7.js', '../js/scenes.js', '../js/flare.js',
               '../js/scene3.js', '../js/main.js', '../../work/js/meshgen.mjs'];
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const src = FILES.map((f) => stripComments(readFileSync(path.join(here, f), 'utf8'))).join('\n');

// ---------------------------------------------------------------------------
// The system map.  `build` / `anim` are regexes that must appear in the port
// for the system to count as implemented; `note` explains a partial.
// ---------------------------------------------------------------------------
const SYSTEMS = [
  { key: 'terrain',      label: 'terrain mesh',            flag: 'terrainVisible',
    build: /MG\.buildTerrain\(/,            gen: 'FUN_0040e058' },
  { key: 'groundTex',    label: 'ground texture bake',     always: true,
    build: /bakeGroundTexture/,             gen: 'FUN_0040e058 step 5' },
  { key: 'water',        label: 'water plane',             cond: (d) => d.hasWater,
    build: /MG\.buildWaterPlane\(/,         gen: 'FUN_004082a9' },
  { key: 'reflection',   label: 'water reflection pass',   cond: (d) => d.hasWater,
    build: /#mirror\(\)/,                   gen: 'FUN_00408dfc' },
  { key: 'glitter',      label: 'water glitter strip',     flag: 'waterGlitter',
    build: /buildWaterGlitter|#stepGlitter|this\.glitter/, gen: 'FUN_004080e0' },
  { key: 'arrayA',       label: 'array A — spires',        flag: 'buildA',
    build: /MG\.buildRevolution|instanceRevolution/, gen: 'FUN_0040bc63' },
  { key: 'arrayB',       label: 'array B — curtains',      flag: 'buildB',
    build: /this\.curtains\.push/,          gen: 'FUN_0040c1b2' },
  { key: 'arrayC',       label: 'array C — tree impostors', flag: 'buildBillboards0',
    build: /type: 0, positions/,            gen: 'FUN_0040b0b0 t0' },
  { key: 'arrayD',       label: 'array D — plant impostors', flag: 'buildBillboards1',
    build: /type: 1, positions/,            gen: 'FUN_0040b0b0 t1' },
  { key: 'arrayE',       label: 'array E — real trees',    flag: 'buildTrees',
    build: /MG\.buildTree\(\{/,             gen: 'FUN_00409d45' },
  { key: 'arrayF',       label: 'array F — compound props', flag: 'buildProps',
    build: /MG\.buildDandelion\(\)/,        gen: 'FUN_0040c721' },
  { key: 'arrayG',       label: 'array G — birds',         flag: 'buildBirds',
    build: /this\.flocks\.push/,            gen: 'FUN_0040f803' },
  { key: 'precip',       label: 'precipitation',           flag: 'buildPrecip',
    build: /#resetPrecip|#emitPrecip/,      gen: 'FUN_0040d1f1' },
  { key: 'precipRT',     label: 'precip 64x64 refraction RT', flag: 'precipRenderTarget',
    build: /this\.precipRT/,                gen: 'FUN_00408eef tail' },
  { key: 'droplets',     label: 'lens droplets',           flag: 'precipRenderTarget',
    build: /MG\.buildLensDroplets\(|#emitDroplet\(/, gen: 'FUN_0040de4e' },
  { key: 'cloud',        label: 'cloud layer + RT composite', flag: 'cloudLayer',
    build: /#compositeCloud/,               gen: 'FUN_0040ec28/f27e' },
  { key: 'ribbons',      label: 'ribbon strips',           flag: 'hiResWater',
    build: /#stepRibbons/,                  gen: 'FUN_0040f5a8' },
  // ⚠ Both of these used to match a bare identifier (`terrainOverlay`,
  // `waterLevelAnim`), which `this.terrainOverlay = null` and a flag TEST
  // satisfy — i.e. they would have stayed green with the feature gutted.
  // Anchor to the line that produces the EFFECT, not to the name.
  { key: 'crossfade',    label: 'terrain cross-fade overlay', flag: 'terrainOpt24',
    build: /this\.terrainMesh\.material = this\.terrainOverlay/, gen: 'FUN_0040e058 tail' },
  { key: 'riseRamp',     label: 'terrain rise + water step', flag: 'waterLevelAnim',
    build: /this\.terrainMesh\.scale\[1\] = F\(desc\.terrainScale\[1\]/, gen: 'FUN_00408eef' },
  { key: 'flare',        label: 'lens flare',              always: true,
    build: /installFlare/,                  gen: 'FUN_00405082' },
  { key: 'shadowBake',   label: 'terrain shadow bake',     always: true,
    build: /MG\.buildShadowMap\(/,          gen: 'FUN_0040e923' },
];

// Animation/updater systems, keyed to the same flags — a build without its
// updater is a partial, and that distinction is the whole point of the table.
const UPDATERS = [
  { key: 'arrayE',  label: 'leaf fall',        build: /#stepLeaves/,      gen: 'FUN_0040a9ad' },
  { key: 'arrayG',  label: 'bird flight',      build: /#stepBird/,        gen: 'FUN_0040fba1' },
  { key: 'arrayA',  label: 'spire growth',     build: /#stepSpires/,      gen: 'FUN_0040bfc1' },
  { key: 'arrayB',  label: 'curtain wind',     build: /#stepCurtains/,    gen: 'FUN_0040c674' },
  { key: 'arrayD',  label: 'plant sway',       build: /#stepBillboards1/, gen: 'FUN_0040bb14' },
  { key: 'arrayF',  label: 'prop wind/seeds',  build: /#stepProps/,       gen: 'FUN_0040cfed' },
];

const has = (re) => re && re.test(src);

// ACTIVE_SCENES, not 0..7: scene 6 does not exist (DESC_RES_MAP[6] aliases
// scene 0's resource) and the FINALE is scene 8.  Iterating 0..7 silently
// inventoried a phantom scene and skipped the finale entirely.
const scenes = ACTIVE_SCENES.map((i) => {
  const d = decodeSceneDescriptor(RESOURCES[0x1c + DESC_RES_MAP[i]], i);
  const obj = Object.keys(OBJECT_TO_SCENE).find((k) => OBJECT_TO_SCENE[k] === Number(i));
  return { i, obj: Number(obj), d };
});

const wanted = (s, sys) => {
  if (sys.always) return true;
  if (sys.cond) return !!sys.cond(s.d);
  return !!s.d.flag[sys.flag];
};
const countFor = (s, sys) => {
  const m = { arrayA: 'A', arrayB: 'B', arrayC: 'C', arrayD: 'D', arrayE: 'E',
              arrayF: 'F', arrayG: 'G' }[sys.key];
  if (!m) return '';
  const arr = s.d.arrays[m] || [];
  const n = arr.reduce((a, r) => a + (r.instanceCount || 1), 0);
  return arr.length ? ` (${arr.length}rec/${n})` : '';
};

const md = process.argv.includes('--md');
const rows = [];
for (const sys of SYSTEMS) {
  const impl = has(sys.build);
  const up = UPDATERS.find((u) => u.key === sys.key);
  const upImpl = up ? has(up.build) : null;
  const cells = scenes.map((s) => {
    if (!wanted(s, sys)) return '·';
    if (!impl) return 'MISSING';
    if (up && !upImpl) return 'static';
    return 'yes';
  });
  rows.push({ sys, cells, impl, up, upImpl });
}

const HDR = ['0 spires', '1 lakes', '2 forest', '3 clouds', '4 beach', '5 autumn',
             '7 winter', '8 finale'];   // scene indices, matching ACTIVE_SCENES
if (md) {
  console.log('| system | generator | ' + HDR.map((h, k) => `${h} (obj ${scenes[k].obj})`).join(' | ') + ' |');
  console.log('|---|---|' + HDR.map(() => '---').join('|') + '|');
  for (const r of rows) {
    const mark = (c) => c === 'yes' ? '✅' : c === 'static' ? '⚠️ static' : c === 'MISSING' ? '❌' : '·';
    console.log(`| ${r.sys.label} | \`${r.sys.gen}\` | ` + r.cells.map(mark).join(' | ') + ' |');
  }
  console.log('\nLegend: ✅ built (and animated where the original animates it) · ⚠️ built but its per-frame updater is unported · ❌ the descriptor asks for it and the port does not build it · `·` not requested by this descriptor.\n');
  console.log('| updater | generator | ported |');
  console.log('|---|---|---|');
  for (const u of UPDATERS) console.log(`| ${u.label} | \`${u.gen}\` | ${has(u.build) ? '✅' : '❌'} |`);
} else {
  const w = 34;
  console.log('SYSTEM'.padEnd(w) + HDR.map((h) => h.slice(0, 8).padEnd(9)).join(''));
  console.log('-'.repeat(w + 9 * 8));
  for (const r of rows) {
    console.log(r.sys.label.padEnd(w) + r.cells.map((c) => c.padEnd(9)).join(''));
  }
  console.log('\nUPDATERS');
  for (const u of UPDATERS) console.log('  ' + u.label.padEnd(24) + (has(u.build) ? 'ported' : 'MISSING'));
  const missing = rows.filter((r) => r.cells.includes('MISSING'));
  const partial = rows.filter((r) => r.cells.includes('static'));
  console.log(`\n${missing.length} system(s) requested-but-absent, ${partial.length} built-but-static.`);
  for (const r of missing) {
    console.log(`  MISSING ${r.sys.label} — wanted by scenes ` +
      r.cells.map((c, k) => c === 'MISSING' ? scenes[k].i : null).filter((x) => x !== null).join(','));
  }
  for (const r of partial) {
    console.log(`  STATIC  ${r.sys.label} (${r.up.label}, ${r.up.gen}) — scenes ` +
      r.cells.map((c, k) => c === 'static' ? scenes[k].i : null).filter((x) => x !== null).join(','));
  }
}
