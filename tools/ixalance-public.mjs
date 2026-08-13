// Rewrites ixalance-js's index.html and docs for the public build, and writes
// the public README / LICENSING / BUILD notes. Invoked by build-ixalance.sh.
//
// Every transform asserts its anchor first: if upstream moves the ports block
// or renames the build id, this fails loudly instead of silently shipping a
// build with Boost still in the selector.
import fs from 'node:fs';
import path from 'node:path';

const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) { console.error('usage: ixalance-public.mjs <src> <out>'); process.exit(2); }

const BUILD_ID = 'ixalance-public-v1';
const OLD_BUILD_ID = 'boost-port-deploy-v27';

/* ---------------- index.html ---------------- */
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

const START = '// Source-derived ports are intentionally not distributed';
const END = "const texViewCanvas = document.getElementById('tex-view-canvas');";
const i = html.indexOf(START), j = html.indexOf(END);
if (i < 0 || j < 0 || j < i) throw new Error('index.html: ports block anchors not found');
if (!html.includes('ports/boost/boost.ixa')) throw new Error('index.html: expected a Boost entry to remove');

const EGG = `// Square ships but is unlisted. The three TBL productions are what this page
// is for; Square is a source port of someone else's demo, so it stays out of
// the selector unless you already know to ask for it — type its name anywhere
// on the page. Keystrokes are ignored while a control has focus, so the
// <select>'s own type-to-match behaviour keeps working.
const EGG_NAME = 'square';
const EGG_PORT = {
  path: './sdk/ixalance-sdk/ports/square/square.ixa',
  label: 'Square \\u2014 Pulse, 1997 (source port)',
};
let eggBuffer = '';
let eggRevealed = false;
addEventListener('keydown', (event) => {
  if (eggRevealed || event.metaKey || event.ctrlKey || event.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(event.target?.tagName || '')) return;
  if (event.key.length !== 1) return;
  eggBuffer = (eggBuffer + event.key.toLowerCase()).slice(-EGG_NAME.length);
  if (eggBuffer !== EGG_NAME) return;
  eggRevealed = true;
  fetch(EGG_PORT.path, { method: 'HEAD', cache: 'no-store' })
    .then((response) => {
      if (!response.ok) { eggRevealed = false; return; }
      const option = document.createElement('option');
      option.value = EGG_PORT.path;
      option.textContent = EGG_PORT.label;
      prodSel.append(option);
      prodSel.value = EGG_PORT.path;
      log(\`\${EGG_PORT.label} \\u2014 press "Load and run"\`);
    })
    .catch(() => { eggRevealed = false; });
});
`;

html = html.slice(0, i) + EGG + html.slice(j);

// The old cache-busting id is literally 'boost-port-deploy-v27' and appears in
// the on-page log, so it has to go before the no-Boost assertion can mean
// anything.
const hits = html.split(OLD_BUILD_ID).length - 1;
if (hits !== 4) throw new Error(`index.html: expected 4 build-id occurrences, found ${hits}`);
html = html.split(OLD_BUILD_ID).join(BUILD_ID);

if (/boost/i.test(html)) throw new Error('index.html: a Boost reference survived the rewrite');

fs.writeFileSync(path.join(OUT, 'index.html'), html);

/* ---------------- README ---------------- */
fs.writeFileSync(path.join(OUT, 'README.md'), `# iXalance — in the browser

The Black Lotus' **iXalance** demo loader, ported to JavaScript, running the
original 1997 386 binaries instruction by instruction.

- **Live: https://jasper2-0.github.io/ixalance-js/**
- Development repository, tests and performance research:
  https://github.com/solar-nl/ixalance-js

iXalance was a small Win32 host TBL wrote in February 1998 so their DOS demos
would keep running after DOS. It did not rewrite them: it read the original
protected-mode executable out of an \`.IXA\` file, relocated it, and jumped in.
This does the same thing in JavaScript.

## Running it

Open the page. Pick a production and press **Load and run**. Nothing to install
and no build step — what is served here is the source.

**Jizz spends its first ~2.5 billion instructions generating its graphics** and
shows a decrunch bar while it does. That is the intro working as designed, not
the page hanging. Give it a minute or two.

The production selector stays live during playback: choose another title and
press **Switch and run** to replace the worker and audio session in place.

| control | effect |
|---|---|
| sound | XM replay through an AudioWorklet |
| JIT | hot-block JavaScript compilation; off falls back to the interpreter |
| Pandora textures + samples | recovered texture profiles and sample views |
| \`?provenance=1\` | experimental LUT / software-3D tracing panels |

## Why it cannot just be compiled

\`startdemo\` in iXalance's \`code.asm\` ends with \`call far [runexe]\` — it jumps
into x86 machine code. The payload *is* x86, so Emscripten would produce the
loader's shell and nothing that runs inside it.

What makes the port tractable is that iXalance already did the hard decoupling
in 1998: under it the demos never touch DOS, the BIOS, VGA registers, interrupts
or I/O ports. The entire interface is one struct and nine function pointers. So
this needs a CPU and almost nothing else — not a PC emulator.

The CPU runs in a **worker**, because a slice large enough to make progress
blocks for hundreds of milliseconds and would read as a hung tab. The XM replayer
runs in an **AudioWorklet**, on the audio thread, because the interpreter is
slower than real time in places and music that stalled whenever the emulation did
would be worse than silence.

## Layout

| File | Role |
|------|------|
| \`lib/ixa.js\` | \`.IXA\` container, LZSS and RLE codecs, script bytecode |
| \`lib/d32.js\` | DOS/32A header parse and relocation |
| \`lib/machine.js\` | flat address space, \`gfxmodeinfo\`, callback trampolines, the \`startdemo\` stack frame |
| \`lib/cpu.js\` | 386 integer interpreter |
| \`lib/jit.js\` | hot-block JavaScript compiler, with the interpreter as fallback and oracle |
| \`lib/fpu.js\` | x87 core |
| \`lib/xm.js\` | FastTracker II replayer, free of Web Audio so it also runs in Node |
| \`lib/pandora.js\` · \`lib/debug-capture.js\` | recovered texture profiles, event-driven stages, browser snapshots |
| \`worker.js\` | runs the CPU off the main thread, posts one backpressured RGBA frame |
| \`audio.js\` | builds the AudioWorklet, relays music position back to the worker |

\`FT2_COMPATIBILITY_AUDIT.md\` maps this replayer against ft2-clone, including the
quirks corrected and the mixer differences deliberately retained. The two
optimization notes record where the interpreter and JIT time actually goes.

## Licence and provenance

The runtime is **GPL-2.0-only**; \`lib/xm.js\` is BSD-3-Clause. The demo data is
neither — see [LICENSING.md](LICENSING.md), which is the file to read before
reusing anything here.

iXalance and the demos it runs are the work of **The Black Lotus** and the
credited individual authors. Reproduced here for preservation, with admiration.

Port: coat / solar, 2026, with Claude (Anthropic).
`);

/* ---------------- LICENSING ---------------- */
// Rewritten from the source repo's version: that one describes a repository
// which deliberately ships no demo data. This build ships it, so the section
// has to say so plainly rather than leaving the old claim standing.
let lic = fs.readFileSync(path.join(SRC, 'LICENSING.md'), 'utf8');
const secStart = lic.indexOf('## Demo binaries and rendered media');
const secEnd = lic.indexOf('## Local research sources');
if (secStart < 0 || secEnd < 0) throw new Error('LICENSING.md: section anchors not found');

lic = lic.slice(0, secStart) + `## Demo binaries and rendered media

**This deployment ships demo data.** That is the difference between it and the
development repository, which excludes every \`.ixa\` file. The data is included
because the page is meant to run when you open it, and because the upstream
archive sends no \`Access-Control-Allow-Origin\` header, so a browser cannot
fetch it at runtime.

The \`.ixa\` files, and the music, graphics and executables inside them, are **not
covered by either software licence above** and are not ours to relicense:

- \`data/jizz.ixa\`, \`data/stash.ixa\`, \`data/astral.ixa\` are the unmodified
  containers from the official iXalance archive, byte-identical to upstream
  (verify them against \`MANIFEST.sha256\`). They remain copyright **The Black
  Lotus** and the credited individual authors, distributed here noncommercially
  for preservation. If TBL would rather they were not, they come down.
- \`sdk/ixalance-sdk/ports/square/square.ixa\` is rebuilt through the guest SDK,
  but its embedded music, graphics and packed production data remain copyright
  **Pulse** and the credited Square authors.

Nothing here is a grant to redistribute any of it further. The GPL covers the
runtime, not the productions it plays.

` + lic.slice(secEnd);

lic = lic.replace(/## Local research sources[\s\S]*$/, `## Development repository

Research material, the guest SDK, the source ports and the benchmark corpus live
in the development repository at <https://github.com/solar-nl/ixalance-js> and
are not part of this deployment.
`);
fs.writeFileSync(path.join(OUT, 'LICENSING.md'), lic);

/* ---------------- lib/jit.js: the logged revision id ---------------- */
// worker.js prints `jit=${JIT_REVISION}` to the on-page log every run, and
// upstream's value is 'boost-hotforms-v1'. The explanatory comments about what
// Boost's compiler output taught the JIT stay — they are real history and are
// not surfaced — but the build should not announce a production it omits.
const jitPath = path.join(OUT, 'lib', 'jit.js');
let jit = fs.readFileSync(jitPath, 'utf8');
const REV_FROM = "export const JIT_REVISION = 'boost-hotforms-v1';";
const REV_TO = "export const JIT_REVISION = 'hotforms-v1';";
if (!jit.includes(REV_FROM)) throw new Error('lib/jit.js: JIT_REVISION anchor not found');
fs.writeFileSync(jitPath, jit.replace(REV_FROM, REV_TO));

/* ---------------- data/README ---------------- */
// Upstream's copy states the containers are deliberately absent and tells you
// to run `npm run data`. Both are wrong here, and it ships, so it gets rewritten
// rather than copied. The hashes are kept — they are the useful part.
fs.writeFileSync(path.join(OUT, 'data', 'README.md'), `# Demo data

Unlike the development repository, this deployment **includes** the three
original TBL containers, so the page runs when you open it. They are the
unmodified files from the
[official iXalance archive](https://www.libsdl.org/projects/ixalance/),
byte-identical to upstream:

| File | SHA-256 |
|---|---|
| \`jizz.ixa\` | \`5c55d364740911715e6ee50fafd1f4a2a88479ed853364b857b0711cb4a0685e\` |
| \`stash.ixa\` | \`87b326631d4ef9f4b4ba2c93c46dd73854666b6213d1c5074cb23f9f92bd9e21\` |
| \`astral.ixa\` | \`4f5326b36ba790bf439921e3d0a48c02e425d48bba617a541ef5be58be49b9fa\` |

Verify with \`shasum -a 256 *.ixa\`, or check the whole build against
\`../MANIFEST.sha256\`.

The demos, music, graphics and other embedded creative work remain copyrighted
by their respective authors. Jizz and Stash were distributed under
non-commercial, unmodified-copy terms; no open-source or free-content licence is
asserted over them here. See [../LICENSING.md](../LICENSING.md), and check the
original release documentation before redistributing them further.
`);

/* ---------------- BUILD notes ---------------- */
fs.writeFileSync(path.join(OUT, 'BUILD.txt'), `iXalance-js public build
========================

Build: ${BUILD_ID}
Entry point: index.html

Contents
--------

  data/jizz.ixa         Jizz         64K intro, Wired 1997          (TBL)
  data/stash.ixa        Stash        64K intro, The Party 1997      (TBL)
  data/astral.ixa       Astral Blur  demo, The Gathering 1997       (TBL)

  lib/, audio.js, worker.js, index.html   the runtime, which is also its source

Differences from a local working copy
-------------------------------------

- Boost is not part of this build. No container, no selector entry, no notes.
- Square is present but unlisted; it is not offered by the production selector.
- The three original TBL containers are included, so the page runs on open.
  See LICENSING.md for the terms that applies under.
- The guest SDK, source ports, benchmark corpus and research material are not
  included; they live in the development repository.

Every shipped file is hashed in MANIFEST.sha256. The three TBL containers should
match the official iXalance archive byte for byte.
`);

console.log('rewrote index.html, README.md, LICENSING.md, BUILD.txt');
