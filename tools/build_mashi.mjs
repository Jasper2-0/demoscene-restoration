// build_mashi.mjs — the SIZE build: one self-extracting .html, packed with Mashi.
//
//   node tools/build_mashi.mjs [--keep-dev] [--no-pack]
//
// This is the second dist target.  `build-sonnet.sh` produces the READABLE
// build — 33 ES modules, the whole binary image, nothing minified — which is
// what gets published and what the harnesses drive.  This one produces a single
// compressed .html for delivery, the way a 64k intro actually ships.
//
// It does NOT fork the runtime.  Everything under web/js/, js/ and
// audio/ is compiled exactly as tested; the only Sonnet-specific code here is
// web/mashi/entry.js, which supplies what index.html used to (markup,
// styles, the node:fs import map) and answers the runtime's three fetches from
// memory.  See re/MASHI.md.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const WORK = path.join(ROOT, 'productions/sonnet');
const argv = process.argv.slice(2);
const OUT = path.join(ROOT, argv.includes('--harness') ? 'dist/sonnet-mashi-test' : 'dist/sonnet-mashi');
const MASHI = path.join(HERE, 'bin/mashi-aarch64-apple-darwin/mashi');
const KEEP_DEV = argv.includes('--keep-dev');
// --harness keeps the fork's single-frame capture path (?pos / __sonnetRender)
// compiled in and writes to a separate directory, so tools/compare_mashi.mjs can
// drive it and diff the fork against the untouched original.  Never shipped.
const HARNESS = argv.includes('--harness');
// --payload=wasm (default) | js   How the audio bytes reach the runtime.  See
// the A/B in re/MASHI.md: `wasm` hands raw bytes through Mashi's payload
// channel; `js` base64s them into the bundle and packs a single JS stream.
const PAYLOAD_MODE = (argv.find((a) => a.startsWith('--payload=')) || '--payload=wasm').split('=')[1];
if (!['wasm', 'js'].includes(PAYLOAD_MODE)) throw new Error(`--payload must be wasm|js`);
const NO_PACK = argv.includes('--no-pack');

// The synthetic base every `import.meta.url` in the bundle resolves against.
// It must sit where main.js really lives, because main.js derives the data
// roots from it (`../../` and `../assets/`) and entry.js re-derives the same
// strings to pre-register against.  Nothing is ever fetched from this host.
const MASHI_BASE = 'https://sonnet.invalid/web/js/main.js';

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
fs.mkdirSync(OUT, { recursive: true });

// ===========================================================================
// 1. THE AUDIO SLICE
// ===========================================================================
// The only part of unpacked/sonnet_img.bin the runtime still reads.  Both
// bounds are DERIVED from the audio port's own constants, never hardcoded, so
// this cannot drift if the streams are re-analysed:
//
//   lo = the lowest codec0 constant (codec0.mjs CONST — the window cosine
//        series, the matrix scale and the dequant scale live in .rdata, well
//        below the streams, and buildTables() reads all four)
//   hi = the end of the pattern stream, which readModule() computes and
//        self-checks against the next stream's start
const { CONST } = await import(path.join(WORK, 'work/audio/codec0.mjs'));
const mod = await import(path.join(WORK, 'work/audio/module.mjs'));
const { readModule } = mod;
const { synthesizeInstruments } = await import(path.join(WORK, 'work/audio/writexm.mjs'));

const IMG_PATH = path.join(WORK, 'work/unpacked/sonnet_img.bin');
const imgReal = fs.readFileSync(IMG_PATH);
const real = readModule(IMG_PATH);

// The RESOURCE ARCHIVE, VA 0x4170da: 52 length-prefixed blocks {u32 len; u8[]}
// that FUN_00401c3b walks — the texture programs, the scene descriptors and the
// per-sub-object descriptors.  js/resources.mjs carries the same bytes as
// base64, which costs 2,478 packed; pulling the slice down to cover them and
// decoding at runtime trades that for ~4.5 KB of raw payload, and payload
// compresses ~36:1 against code's ~3.5:1.
const ARCHIVE_VA = 0x4170da;
const LO = Math.min(...Object.values(CONST), ARCHIVE_VA) - mod.IMG_BASE;
const HI = real.patterns.end - mod.IMG_BASE;
if (!(LO > 0 && HI > LO && HI <= imgReal.length)) throw new Error(`bad slice [${LO},${HI})`);
const slice = imgReal.subarray(LO, HI);

console.log(`image      ${imgReal.length} B`);
console.log(`audio slice[0x${LO.toString(16)}, 0x${HI.toString(16)}) = ${slice.length} B ` +
            `(${(100 * slice.length / imgReal.length).toFixed(1)}% of the image)`);

// ---- prove the slice is sufficient ---------------------------------------
// Rebuild the image with everything outside the slice zeroed, parse it, and
// synthesise every instrument.  If any consumer reads a byte the slice does not
// carry, the PCM differs and this fails — which is the whole point: the packed
// build must not be discovered to be missing audio data in a browser.
{
  const stub = Buffer.alloc(imgReal.length);
  slice.copy(stub, LO);
  const tmp = path.join(OUT, '_slicecheck.bin');
  fs.writeFileSync(tmp, stub);
  const test = readModule(tmp);
  const a = synthesizeInstruments(real), b = synthesizeInstruments(test);
  const norm = (x) => JSON.stringify(x, (k, v) => ArrayBuffer.isView(v) ? Array.from(v) : v);
  if (norm(a) !== norm(b)) throw new Error('slice check FAILED: audio differs when the image is reduced to the slice');
  fs.rmSync(tmp);
  console.log(`slice check  OK — ${a.length} instruments synthesise bit-identically from the slice alone`);
}

// ---- prove the archive decodes byte-identically -------------------------
const ARCHIVE_OFF = ARCHIVE_VA - mod.IMG_BASE;
{
  const { RESOURCES } = await import(path.join(WORK, 'work/js/resources.mjs'));
  const dv = new DataView(imgReal.buffer, imgReal.byteOffset, imgReal.byteLength);
  let q = ARCHIVE_OFF;
  for (let i = 0; i < RESOURCES.length; i++) {
    const n = dv.getUint32(q, true); q += 4;
    const got = imgReal.subarray(q, q + n); q += n;
    const want = RESOURCES[i];
    if (got.length !== want.length || !got.every((b, k) => b === want[k])) {
      throw new Error(`archive check FAILED at resource ${i}`);
    }
  }
  console.log(`archive check OK — ${RESOURCES.length} resources decode identically from the slice`);
}

// ---- prove the poem decoder matches the transcribed parser ---------------
{
  const { decodePoem } = await import(path.join(WORK, 'web-mashi/mashi/poem_decode.js'));
  const ref = JSON.parse(fs.readFileSync(path.join(WORK, 'work/re/text/poem.json'), 'utf8')).items;
  const got = decodePoem(imgReal).items;
  if (got.length !== ref.length) throw new Error(`poem: ${got.length} items, expected ${ref.length}`);
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  for (let i = 0; i < ref.length; i++) {
    const a = got[i], b = ref[i];
    const bad = a.text !== b.text || a.flags !== b.flags || a.color !== b.color
      || !near(a.rot, b.rot) || !near(a.x, b.x) || !near(a.y, b.y)
      || !near(a.tracking, b.tracking) || !near(a.lineadv, b.lineadv)
      || !near(a.scale, b.scale) || !near(a.speed, b.speed)
      || a.attr.length !== b.attr.length || a.attr.some((v, k) => v !== b.attr[k])
      || a.size.some((v, k) => !near(v, b.size[k]));
    if (bad) throw new Error(`poem check FAILED at item ${i} (${JSON.stringify(a.text)})`);
  }
  console.log(`poem check   OK — ${got.length} items decode identically from the slice`);
}

// ---- wrap it in a WASM carrier -------------------------------------------
// `mashi pack --wasm` validates the magic number, so raw bytes cannot be handed
// over directly; the smallest legal container is a module with one custom
// section and an empty name.  The loader passes the decompressed binary to the
// JS as arguments[0], and the payload starts at a fixed offset the build hands
// to entry.js.  Going through --wasm rather than a base64 string in the JS
// avoids the 33% inflation AND keeps the bytes byte-aligned for the context
// model, which is what Mashi is built to exploit.
const leb = (n) => { const o = []; do { let b = n & 0x7f; n >>>= 7; if (n) b |= 0x80; o.push(b); } while (n); return o; };
const header = Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0,
  0x00, ...leb(slice.length + 1), 0x00]);
const wasm = Buffer.concat([header, slice]);
const WASM_PATH = path.join(OUT, 'payload.wasm');
fs.writeFileSync(WASM_PATH, wasm);

// ===========================================================================
// 2. THE BUNDLE
// ===========================================================================
// Bare specifier: resolves through the workspace-root node_modules (esbuild is
// hoisted there by the root npm install), wherever this tool runs from.
const esbuild = await import('esbuild');

// ---- main.js carries TOP-LEVEL AWAIT, which no IIFE can hold -------------
// esbuild refuses top-level await for the `iife` format, and `iife` is forced
// on us because Mashi evaluates the payload with `new Function(src)` — a
// function body, not a module.  Rather than fork main.js, hoist its static
// imports (which must stay at the top of the module) and wrap everything after
// them in an async IIFE.  Nothing imports main.js — it is the entry point of
// the readable build too — so its two `export const`s can simply lose the
// keyword.
const tlaWrap = {
  name: 'tla-wrap',
  setup(build) {
    build.onLoad({ filter: /web-mashi[/\\]js[/\\]main\.js$/ }, (args) => {
      const src = fs.readFileSync(args.path, 'utf8');
      // The static imports form one contiguous block at the top; find the end
      // of the last one.  (Dynamic `import(...)` calls later are expressions
      // and must stay inside the wrapper.)
      const re = /^import\b[\s\S]*?;\s*$/gm;
      let end = 0, m;
      while ((m = re.exec(src)) !== null) end = m.index + m[0].length;
      if (!end) throw new Error('tla-wrap: found no static imports in main.js');
      const head = src.slice(0, end);
      const body = src.slice(end).replace(/^export\s+(?=(const|let|var|function|class)\b)/gm, '');
      return { contents: `${head}\n(async () => {\n${body}\n})();\n`, loader: 'js' };
    });
  },
};

// ---- drop the dev / harness surface --------------------------------------
// Jasper, 2026-08-12: "we introduced many features for debugging and iteration
// that do not have to go into the mashi version".  These are stubbed rather
// than deleted so the runtime source stays identical between the two builds;
// esbuild then folds the dead branches away.  --keep-dev builds them back in,
// which is how the cost of each cut is measured.
const devStubs = {
  name: 'dev-stubs',
  setup(build) {
    if (KEEP_DEV) return;
    // warmstore.js is a precalc disk cache for the harnesses and dev reloads.
    // It cannot help a packed build (there is no server to hold a store) and
    // main.js already treats a missing store as a plain cold boot.
    build.onLoad({ filter: /web-mashi[/\\]js[/\\]warmstore\.js$/ }, () => ({
      contents: 'export async function loadWarmStore(){return null}' +
                'export function startRecording(){return null}' +
                'export function warmDirName(){return ""}',
      loader: 'js',
    }));
  },
};

// The audio bytes, as a virtual module, so entry.js has one code path.
//
// ⚠ BASE64 IS THE ONLY VIABLE JS-SIDE ENCODING, and not for the obvious reason.
// Mashi's loader does `new Function(text.slice(0, jsLen))(bytes.slice(jsLen))`
// — it slices the JS out of the decompressed stream by CHARACTER count after a
// UTF-8 text decode, and the payload out by BYTE offset.  Those two only agree
// while the JS is pure ASCII, so a raw-binary or Latin-1 string in the bundle
// would desynchronise the split and corrupt both halves.
const payloadModule = {
  name: 'payload-module',
  setup(build) {
    build.onResolve({ filter: /^mashi:payload$/ }, (a) => ({ path: a.path, namespace: 'mashi' }));
    build.onLoad({ filter: /.*/, namespace: 'mashi' }, () => ({
      contents: PAYLOAD_MODE === 'wasm'
        ? 'export const AUDIO = __MASHI_PAYLOAD__;'
        : `const B="${slice.toString('base64')}";\n` +
          'export const AUDIO = Uint8Array.from(atob(B), (c) => c.charCodeAt(0));',
      loader: 'js',
    }));
  },
};

// ---- text the MINIFIER CANNOT REACH --------------------------------------
// esbuild strips comments from CODE.  It cannot touch comments inside STRING
// literals, nor prose stored as DATA — and this codebase has 13 KB of both:
//   5,171 B  GLSL comments inside the shader template literals
//   4,998 B  explanatory `throw new Error(...)` prose, 29 sites
//   2,126 B  scene_desc's `note`/`test`/`generator` documentation fields
//     868 B  poem.json's provenance metadata (table_va, parser, notes, ...)
// None of it is readable in a packed delivery build.  All four are stripped
// HERE rather than in the sources, so the shared `js/` libraries and the fork's
// comments both stay intact.
const stripProse = {
  name: 'strip-prose',
  setup(build) {
    build.onLoad({ filter: /minid3d8\.js$/ }, (args) => {
      let src = fs.readFileSync(args.path, 'utf8');
      // GLSL: whole-line and trailing `//`, blank lines, indentation.  GLSL has
      // no string type, so `//` is unambiguously a comment inside these.
      src = src.replace(/`#version 300 es[\s\S]*?`/g, (lit) => lit
        .replace(/^[ \t]*\/\/[^\n]*\n/gm, '')
        .replace(/[ \t]+\/\/[^\n]*/g, '')
        .replace(/^[ \t]+/gm, '')
        .replace(/\n{2,}/g, '\n'));
      // THE UNIMPLEMENTED-FEATURE GUARDS.  The shim is defensive by design: it
      // throws on every D3D8 state, format, light type, transform and texcoord
      // generator Sonnet does not use, so that a wrong assumption surfaces
      // immediately instead of rendering something plausible.  That is the right
      // trade for the readable build and dead weight for a delivery pack —
      // coverage over every scene fires NONE of them, and the packed build
      // renders one fixed piece of content that cannot reach a new state.
      //
      // Replacing the throw with `0` rather than deleting the branch lets
      // esbuild collapse `if (<pure cond>) 0;` on its own, which is safer than
      // trying to find each guard's extent with a regex.
      let cut = 0;
      for (;;) {
        const at = src.indexOf('throw new Error(');
        if (at < 0) break;
        let i = src.indexOf('(', at), depth = 0, end = i;
        for (let j = i; j < src.length; j++) {
          if (src[j] === '(') depth++;
          else if (src[j] === ')') { depth--; if (!depth) { end = j + 1; break; } }
        }
        src = src.slice(0, at) + '0' + src.slice(end);
        cut++;
      }
      if (process.env.MASHI_VERBOSE) console.log(`  minid3d8: neutralised ${cut} guard throws`);

      // GLSL MINIFICATION.  The shader bodies are the one place esbuild's
      // identifier minifier cannot reach — they are string data.  Two safe
      // passes, no GLSL parser required:
      //
      //  1. whitespace.  `#`-directives keep their own lines (the preprocessor
      //     is line-based); everything else collapses, and spaces are dropped
      //     only next to `;,(){}[]`, which can never fuse into another token.
      //     Nothing is removed around `-`/`+`, where `a - -b` would become the
      //     decrement operator.
      //  2. identifiers.  Uniforms/attributes/varyings all match [uav][A-Z]...,
      //     a convention this shim keeps strictly.  Attributes are bound by
      //     `layout(location=)` and varyings never leave the program, so the
      //     only names that cross into JS are the uniforms, looked up through
      //     `U('name')` — so the same map is applied to those string literals.
      //     `${MAX_LIGHTS}` is untouched (it does not match), and `vClip` inside
      //     the clip-distance interpolation is renamed with everything else
      //     because the map runs over the whole literal.
      const glslNames = new Map();
      const shortName = (i) => 'z' + i.toString(36);
      // GLSL locals and varyings are renamed too — they never leave the program.
      // Anything in this list is a keyword, a type, a builtin function or a
      // builtin variable and must survive verbatim; a miss is a compile error,
      // which tools/test_mashi.mjs surfaces immediately as a blank canvas.
      const GLSL_KEEP = new Set(`void main return if else for while break continue discard
        const uniform in out inout layout location precision highp mediump lowp struct
        true false bool int uint float double vec2 vec3 vec4 bvec2 bvec3 bvec4 ivec2 ivec3
        ivec4 uvec2 uvec3 uvec4 mat2 mat3 mat4 mat2x2 mat2x3 mat2x4 mat3x2 mat3x3 mat3x4
        mat4x2 mat4x3 mat4x4 sampler2D sampler3D samplerCube sampler2DArray
        texture textureLod textureSize texelFetch mix clamp min max abs sign dot cross
        normalize length distance reflect refract faceforward pow exp log exp2 log2 sqrt
        inversesqrt floor ceil fract mod modf sin cos tan asin acos atan sinh cosh tanh
        step smoothstep isnan isinf transpose inverse determinant outerProduct matrixCompMult
        lessThan lessThanEqual greaterThan greaterThanEqual equal notEqual any all not
        dFdx dFdy fwidth degrees radians round roundEven trunc
        gl_Position gl_PointSize gl_FragCoord gl_FrontFacing gl_FragDepth gl_VertexID
        gl_InstanceID gl_ClipDistance gl_PointCoord
        version define extension enable require disable warn ifdef ifndef endif elif
        pragma undef line error defined`.split(/\s+/).filter(Boolean));
      src = src.replace(/`#version 300 es[\s\S]*?`/g, (lit) => {
        for (const m of lit.matchAll(/\b[uav][A-Z]\w+/g)) {
          if (!glslNames.has(m[0])) glslNames.set(m[0], shortName(glslNames.size));
        }
        // NOTE: renaming the shader's OWN locals as well was tried and reverted.
        // It is worth ~90 packed bytes and cost two classes of bug that a real
        // GLSL minifier handles for free — preprocessor directive names
        // (`version`, `define`, `extension`) read as identifiers, and then a
        // syntax error this hand-rolled pass could not localise.  If the last
        // bytes are ever needed, use webpack-glsl-minify or Shader Minifier
        // (both handle ES 3.00 and emit a uniform name map) rather than this.
        // ⚠ Work on the INNER text.  The literal's first line begins with the
        // backtick, so `#version` fails a startsWith('#') test and the whole
        // shader collapses onto line 1 — which GLSL rejects at the directive.
        const body = lit.slice(1, -1);
        let out = body.split('\n').map((line) => {
          const t = line.trim();
          // Directives AND `${...}` interpolations keep their own line: the
          // clip-distance interpolation expands to `#extension ...`, and the
          // preprocessor is line-based, so folding either into the previous
          // line is a compile error rather than a smaller shader.
          if (t.startsWith('#') || t.includes('${')) return '\n' + t + '\n';
          return t + ' ';
        }).join('');
        // `#version` must be the FIRST line of the shader, so the isolating
        // newline in front of it has to come back off.
        out = out.replace(/^\n+/, '')
          .replace(/ +/g, ' ').replace(/ ?([;,(){}\[\]]) ?/g, '$1');
        for (const [from, to] of glslNames) {
          out = out.replace(new RegExp('\\b' + from + '\\b', 'g'), to);
        }
        return '`' + out + '`';
      });
      // The uniform lookups.  ⚠ ARRAY uniforms are fetched by ELEMENT —
      // `U('uLightPos[0]')` — so an exact-string replace silently misses them,
      // the location comes back null, and the lights simply stop being uploaded.
      // That showed up as mean luma 120.6 -> 113.2 with no error anywhere.
      for (const [from, to] of glslNames) {
        src = src.replace(new RegExp("(['\"])" + from + "(\\[[^\\]]*\\])?\\1", 'g'),
          (m, q, idx) => `'${to}${idx || ''}'`);
      }
      return { contents: src, loader: 'js' };
    });
    // Are the never-called generators actually being tree-shaken?  scene7 pulls
    // meshgen in as a NAMESPACE (`import * as MG`), which can defeat it.  Strip
    // them explicitly and compare: no size change means esbuild already had it.
    build.onLoad({ filter: /meshgen\.mjs$/ }, (args) => {
      let src = fs.readFileSync(args.path, 'utf8');
      if (process.env.STRIP_MESHGEN) {
        for (const name of ['tessellate', 'buildTerrainTessellated',
                            'transferGridNormals', 'resampleHeights']) {
          const needle = '\nexport function ' + name + '(';
          const at = src.indexOf(needle);
          if (at < 0) continue;
          // The parameter list can contain destructuring braces, so find the
          // matching ')' first and only then the body's opening '{'.
          let k = at + needle.length, par = 1;
          while (par > 0) { const ch = src[k++]; if (ch === '(') par++; else if (ch === ')') par--; }
          let i = src.indexOf('{', k), depth = 0, end = i;
          for (let j = i; j < src.length; j++) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') { depth--; if (!depth) { end = j + 1; break; } }
          }
          src = src.slice(0, at) + '\nexport function ' + name + '(){throw 0}' + src.slice(end);
        }
      }
      return { contents: src, loader: 'js' };
    });
    // resources.mjs ships 52 base64 blobs of bytes the payload now carries.
    // Decode them from the image instead.  Evaluation order is safe: entry.js's
    // BODY builds the image and sets `__IMG` before it dynamically imports
    // main.js, and resources.mjs is only reached through that import.
    // texgen: three ported-but-unreachable ops, and the separable-kernel path.
    // js/verify_ops.mjs's own header records the census — "ops 2, 9 and 18 are
    // ported but never exercised by any of the 28 programs" — and coverage puts
    // the `separable` factorisation (with `rank3`, its only caller) in the same
    // bucket.  Stripped at build time so the shared library keeps them.
    build.onLoad({ filter: /texgen\.mjs$/ }, (args) => {
      let src = fs.readFileSync(args.path, 'utf8');
      for (const op of [2, 9, 18]) {
        const at = src.indexOf(`PIXEL_OPS[${op}] = `);
        if (at < 0) continue;
        let i = src.indexOf('{', at), depth = 0, end = i;
        for (let j = i; j < src.length; j++) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') { depth--; if (!depth) { end = j + 1; break; } }
        }
        while (src[end] === ';' || src[end] === '\n') end++;
        src = src.slice(0, at) + src.slice(end);
      }
      const sep = src.indexOf("  if (method === 'separable' && rank3(src) <= 1) {");
      if (sep >= 0) {
        let i = src.indexOf('{', sep), depth = 0, end = i;
        for (let j = i; j < src.length; j++) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}') { depth--; if (!depth) { end = j + 1; break; } }
        }
        src = src.slice(0, sep) + src.slice(end);
        const r = src.indexOf('function rank3(m) {');
        if (r >= 0) {
          let i2 = src.indexOf('{', r), d2 = 0, e2 = i2;
          for (let j = i2; j < src.length; j++) {
            if (src[j] === '{') d2++;
            else if (src[j] === '}') { d2--; if (!d2) { e2 = j + 1; break; } }
          }
          src = src.slice(0, r) + src.slice(e2);
        }
      }
      return { contents: src, loader: 'js' };
    });
    build.onLoad({ filter: /resources\.mjs$/ }, () => ({
      contents:
        'const I = globalThis.__IMG;\n' +
        'const dv = new DataView(I.buffer, I.byteOffset, I.byteLength);\n' +
        'export const RESOURCES = (() => {\n' +
        '  const out = []; let p = ' + ARCHIVE_OFF + ';\n' +
        '  for (let i = 0; i < 52; i++) { const n = dv.getUint32(p, true); p += 4;\n' +
        '    out.push(I.slice(p, p + n)); p += n; }\n' +
        '  return out;\n' +
        '})();\n' +
        'export function resource(id) { return RESOURCES[id]; }\n',
      loader: 'js',
    }));
    build.onLoad({ filter: /scene_desc\.mjs$/ }, (args) => ({
      contents: fs.readFileSync(args.path, 'utf8')
        .replace(/,?\s*(note|test|generator):\s*(['"])(?:(?!\2).)*\2/g, ''),
      loader: 'js',
    }));
  },
};

const define = {
  'import.meta.url': JSON.stringify(MASHI_BASE),
  __MASHI_IMG_LEN__: String(imgReal.length),
  __MASHI_AUDIO_OFF__: String(LO),
  __MASHI_PAYLOAD_OFF__: String(header.length),
  __HARNESS__: String(HARNESS),
};

const result = await esbuild.build({
  entryPoints: [path.join(WORK, 'web-mashi/mashi/entry.js')],
  bundle: true,
  format: 'iife',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
  // The runtime narrates itself heavily — the preloader, the warm store, the
  // shim's state warnings, every fatal() path.  None of it can be read in a
  // packed delivery build.  Measured: 2,100 raw / 739 packed bytes.
  drop: ['console', 'debugger'],
  // ⚠ NO mangleProps.  `/^_/` looked safe — 68 underscore-prefixed properties,
  // 1,496 recoverable bytes, no string-keyed access anywhere — and it packed to
  // 65,952 (100.6%).  It also HUNG THE BOOT: the runtime never became ready.
  // esbuild mangles per-bundle, but the underscore convention here spans objects
  // built in one module and read in another through paths esbuild cannot prove,
  // and one of them silently stopped matching.  Re-enabling this needs a
  // per-property bisect, not a regex.
  define,
  // arguments[0] is the decompressed payload.  It has to be captured out here:
  // esbuild's IIFE wrapper is an arrow function, which has no `arguments` of
  // its own, and relying on that lexical accident would be a trap for whoever
  // changes the output format next.
  banner: { js: 'var __MASHI_PAYLOAD__=typeof arguments!="undefined"&&arguments[0]?' +
                `arguments[0].subarray(${header.length}):new Uint8Array(0);` },
  loader: { '.json': 'json' },
  // index.html's import map, resolved at build time instead.  The audio port
  // was written for Node and statically imports `node:fs`; node_fs.js is the
  // browser shim that serves those reads out of node_compat.js's registry.
  alias: { 'node:fs': path.join(WORK, 'web-mashi/js/node_fs.js') },
  plugins: [tlaWrap, devStubs, payloadModule, stripProse],
  write: false,
  metafile: true,
  logLevel: 'warning',
});

// Where the bundle actually goes.  Minification has already removed this
// codebase's very large comment mass, so what is left is real code and the
// ranking is a genuine cut-list rather than a comment census.
{
  const inputs = Object.entries(result.metafile.outputs)[0][1].inputs;
  const rows = Object.entries(inputs).map(([f, v]) => [f.replace(/^.*productions\/sonnet\//, ''), v.bytesInOutput])
    .sort((a, b) => b[1] - a[1]);
  const tot = rows.reduce((s, r) => s + r[1], 0);
  console.log('\nbundled bytes by module (post-minify):');
  for (const [f, b] of rows.slice(0, 40)) {
    console.log(`  ${String(b).padStart(7)}  ${(100 * b / tot).toFixed(1).padStart(5)}%  ${f}`);
  }
  console.log(`  ${String(tot).padStart(7)}  100.0%  (${rows.length} modules)`);
}

const js = result.outputFiles[0].text;
const JS_PATH = path.join(OUT, 'intro.js');
fs.writeFileSync(JS_PATH, js);
console.log(`bundle     ${js.length} B minified${KEEP_DEV ? '  (--keep-dev)' : ''}`);

// ===========================================================================
// 3. PACK
// ===========================================================================
if (NO_PACK) { console.log('--no-pack: stopping before mashi'); process.exit(0); }
if (!fs.existsSync(MASHI)) {
  console.error(`\nmashi not found at ${MASHI}\n` +
    'Download it from https://github.com/datatrash/mashi/releases and extract into tools/bin/.');
  process.exit(1);
}
const HTML = path.join(OUT, 'index.html');
const packArgs = PAYLOAD_MODE === 'wasm'
  ? ['pack', JS_PATH, '--wasm', WASM_PATH, HTML]
  : ['pack', JS_PATH, HTML];
execFileSync(MASHI, packArgs, { stdio: 'inherit' });

const packed = fs.statSync(HTML).size;
// THE BUDGET IS NOW A GATE, not a progress bar.  Sonnet shipped in exactly
// 65,536 bytes in 2001 — the whole 64k, to the byte — and this pack is under it.
// Anything that pushes it back over should fail the build the day it lands, not
// be discovered the next time someone measures.
const LIMIT = 65536;
console.log('\n' + '='.repeat(58));
console.log(`  intro.js      ${String(js.length).padStart(8)} B  ${kb(js.length)}`);
console.log(`  payload       ${String(PAYLOAD_MODE === 'wasm' ? wasm.length : 0).padStart(8)} B  ` +
            `${PAYLOAD_MODE === 'wasm' ? kb(wasm.length) + '  (--wasm channel)' : '(base64, inside intro.js)'}`);
const rawTotal = js.length + (PAYLOAD_MODE === 'wasm' ? wasm.length : 0);
console.log(`  raw total     ${String(rawTotal).padStart(8)} B  ${kb(rawTotal)}`);
console.log(`  PACKED        ${String(packed).padStart(8)} B  ${kb(packed)}` +
            `   ${(100 * packed / LIMIT).toFixed(1)}% of 64k`);
console.log('='.repeat(58));
const headroom = LIMIT - packed;
if (packed > LIMIT) {
  console.error(`\n  ✗ OVER THE 64k BUDGET by ${-headroom} B.` +
    `\n    re/MASHI.md has the measured cut-list and the two traps (mangleProps,` +
    `\n    GLSL array uniforms) that look like wins and are not.`);
  if (!argv.includes('--allow-over')) process.exitCode = 1;
} else {
  console.log(`  ${headroom} B of headroom` +
    (HARNESS ? '  (harness pack — the shipped one is smaller)' : ''));
}
console.log(`\n  ${HTML}`);
console.log('  serve:  (cd dist/sonnet-mashi && python3 -m http.server 8080)');
