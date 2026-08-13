# The Mashi target — packing Sonnet the way a 64k intro ships

**Status: WORKING, and 73.0 KB — 114% of 64k.  It boots, renders and plays.**
Jasper's ask, 2026-08-12: a second dist "specifically aimed at being compressed
with Mashi by Sagacity".

    ./build-sonnet-mashi.sh              # build, pack, and prove it runs
    ./build-sonnet-mashi.sh --no-pack    # bundle only
    ./build-sonnet-mashi.sh --keep-dev   # leave the harness surface in (A/B)

Output: `dist/sonnet-mashi/index.html`, one self-extracting file.

## Two dist targets, and neither replaces the other

| | `build-sonnet.sh` | `build-sonnet-mashi.sh` |
|---|---|---|
| shape | 33 ES modules + assets | one `.html` |
| image | all 541 KB | a 369 KB slice |
| minified | no | yes, plus `drop: console` |
| size | ~600 KB | **74,729 B** |
| for | publishing, every harness | delivery / size-coding |

**The runtime is NOT forked.**  Everything under `web-sonnet/js/`, `js/` and
`audio/` compiles exactly as tested.  The only target-specific source is
`web-sonnet/mashi/entry.js`, which supplies the three things `index.html` used
to carry (markup, styles, the `node:fs` import map) and answers the runtime's
three fetches out of memory.  A size build that quietly diverges is a second
port to verify, and this project already has enough to verify.

## What Mashi actually does to the input

`mashi pack intro.js --wasm payload.wasm out.html` emits a loader that ends:

```js
new Function(source)(payloadBytes)
```

Three consequences drive the whole build:

1. **The packed JS is a FUNCTION BODY, not a module.**  No `import`, `export` or
   `import.meta` survives — hence esbuild `format: 'iife'`, with
   `import.meta.url` substituted for one fixed synthetic base
   (`https://sonnet.invalid/web-sonnet/js/main.js`, never fetched).  `main.js`
   derives its data roots from that URL and `entry.js` re-derives the identical
   strings, so the pre-registered paths cannot drift from the runtime's.
2. **The payload arrives as `arguments[0]`.**  Captured in a `banner`, because
   esbuild's IIFE wrapper is an arrow function with no `arguments` of its own.
3. **`--wasm` validates the magic number** — it is not a raw byte channel.  The
   smallest legal carrier is a module with a single zero-named custom section,
   which costs 13 bytes and keeps the payload byte-aligned for the context
   model.  Base64 in the JS would inflate it 33% first.

Mashi also picks its own strategy: for small inputs it emits Zopfli +
`DecompressionStream('deflate-raw')`; the 2.5 KB WASM stub only pays for itself
on large ones.

## Why the binary image is 69.8% shipped, not 100%

Jasper asked why the bin is needed at all.  Mostly it is not: texture programs,
meshes, camera splines and scene descriptors are already base64 inside
`js/resources.mjs`.  **The only remaining consumer is the music**, and it needs
two things:

* the four XM streams, VA `0x41aa80..0x47460e` — `readModule()` self-checks that
  header/instrument/synth/pattern butt up exactly; and
* four float constants `codec0.buildTables()` reads out of `.rdata` —
  `0x418278` (π/64, f64), `0x418280` (π/256), `0x418284` (1/256) and the
  8-float window series at `0x41a998`.

Both bounds are **derived at build time** from `codec0.CONST` and
`readModule().patterns.end`, never hardcoded, so re-analysis of the streams
cannot silently invalidate the slice.  The union is one contiguous
`[0x17278, 0x7360e)` = 377,750 B; `audio/module.mjs` indexes by absolute file
offset, so it is pasted back at its original offset in a zero-filled
full-length array — half a megabyte of RAM, nothing in the file, and the audio
port's arithmetic untouched.

The build **proves** the slice is sufficient: it parses the reduced image and
synthesises all 24 instruments, and fails the build unless the PCM is
bit-identical to the full image's.  A missing audio byte must not be something
you discover in a browser.

## Measurements — data compresses, code does not

The instinct is to attack the biggest raw blobs.  That is wrong here:

| cut | raw | **packed** | ratio |
|---|---|---|---|
| `poem.json` + `timeline.json` (35.5 KB of the bundle) | −35,480 | **−2,579** | 13.8:1 |
| `warmstore.js` stub | −3,296 | **−915** | 3.6:1 |
| `drop: ['console','debugger']` | −2,100 | **−739** | 2.8:1 |
| the 369 KB audio slice, alone with a stub JS | 377,763 | **~10,400** | 36:1 |

**Data compresses 14–36:1; code compresses ~3:1.**  So the remaining 9.2 KB has
to come out of unique CODE, and roughly 33 KB of minified JS must go.  Do not
spend effort compacting the poem or the timeline — they are nearly free
already.

Bundle composition after minification (36 modules, 262,015 B):

```
  49757  18.9%  web-sonnet/js/minid3d8.js
  42148  16.0%  web-sonnet/js/scene7.js
  29346  11.1%  web-sonnet/js/xm.js
  24401   9.2%  re/text/poem.json
  18862   7.1%  js/meshgen.mjs
  17022   6.5%  js/texgen.mjs
  12279   4.7%  web-sonnet/js/main.js
  11099   4.2%  web-sonnet/assets/timeline.json
```

## Getting the last 9.2 KB — the cut-list

Everything below is dev/iteration surface or remaster surface, and none of it
belongs in a delivery build.  It cannot be removed by the bundler today because
nothing MARKS it: `--keep-dev` currently only swaps `warmstore.js` for a stub.

The principled fix is a build-time constant — `define: { __SIZE__: true }` —
and guarding these in the source the way `?quality=original` already gates
behaviour, so esbuild folds them away and there is still ONE codebase:

* **`main.js` (~12 KB minified)** — `__sonnetRender` / `__sonnetRenderSeq`,
  `warmToBurst`, `warmStep`, the stats overlay, the scene-jump keyboard map,
  `fatal()`'s escape-hatch prose, and the whole URL-parameter matrix
  (`pos`, `debug`, `bg`, `skip`, `assets`, `warm`, `warmstep`, `flareburst`,
  `prewarm`, `render`, `texscale`, `fontscale`, `lighting`, `audio`).  A
  delivery build needs none of it.  Estimate 6–8 KB.
* **`scene7.js` (42 KB)** — the remaster paths (terrain re-sampling
  tessellation, `resampleHeights`, `transferGridNormals`), the `lighting=legacy`
  alternative, and the diagnostic knobs `__noRibbons`, `__noLightBracket`,
  `__propT`, `__camTimeOverride`, `__waterDbg`, `__landscapes`.  Estimate 8–12 KB.
* **`minid3d8.js` (50 KB)** — unused D3D8 API surface, state-block bookkeeping,
  the `setNormalTransform('world')` legacy branch, validation and error strings.
  Estimate 8–15 KB.
* **`meshgen.mjs` / `texgen.mjs`** — the remaster-only generators and scale
  paths, dead when the build pins `quality=original`. Estimate 3–5 KB.

That totals 25–40 KB minified ≈ 7–11 KB packed, which brackets the target.  The
honest summary: **64k is reachable, but only by pinning one quality mode and
compiling the harness out — not by squeezing data.**

## Verification

`tools/test_mashi.mjs` (run automatically by the build) serves the packed file,
then:

1. loads it with `?pos=0x120a`, waits for `__sonnetReady`, renders a frame and
   reads the canvas back — asserts it is not blank (currently mean luma 120.6,
   68.5% non-black, `glError` 0);
2. loads it again with no parameters, clicks the overlay for the AudioContext
   gesture, and waits for `__sonnetClock` to advance — which only happens after
   the XM has been rebuilt from the sliced streams.  `?pos` never touches audio,
   so without this second pass a bad slice would pass unnoticed.

Chrome's unprompted `/favicon.ico` 404 is filtered; a single packed file has
nothing to answer it with.

## Gotchas worth keeping

* **`main.js` has top-level `await`**, which esbuild refuses for `iife`.  The
  build hoists its static import block and wraps the remainder in an async IIFE,
  stripping the two `export const`s — safe precisely because nothing imports
  `main.js`.  If an importer is ever added, this transform must change.
* **`node:fs` is aliased** to `web-sonnet/js/node_fs.js` at build time — the
  same mapping `index.html`'s import map performs.
* **`WARM_MODE` resolves to `auto` when `location.hostname === ''`** (i.e.
  `file://`), so a packed build opened locally probes for a warm-store manifest.
  `entry.js`'s fetch stand-in returns a clean 404 and `warmstore.js` cold-boots,
  which is why the stub returns `null` rather than throwing.
* Opening the packed file directly from `file://` needs Chrome's
  `--allow-file-access-from-files`; the loader fetches its own document.  Serving
  it over HTTP is the sane path.

---

# The fork — `web-sonnet-mashi/` (Jasper's call, 2026-08-12)

> "create a copy of the current web-sonnet we have, we're not going to touch the
> original, call it web-sonnet-mashi, that's the version we're going to optimize
> for compression with mashi, our goal is to get it to compress smaller than 64kb"

`work-sonnet/web-sonnet-mashi/` is that copy (`js/`, `assets/`, `index.html`,
`mashi/entry.js`; the `test/` harness deliberately did not come along).
`work-sonnet/web-sonnet/` is now **untouched** by this target — the entry shim
moved into the fork.  The shared generator libraries `js/` and `audio/` are
still shared, unforked, and imported by both.

The fork buys freedom to delete; it costs the guarantee that the delivery build
and the verified build are the same code.  That risk is managed by
`--harness` + `tools/test_mashi.mjs`: the fork can still be built WITH the
single-frame capture path and diffed frame-for-frame against the original
(currently identical at 0x120a — mean luma 120.6, 68.5% non-black, glError 0).

## The budget

| | packed | vs 64k |
|---|---|---|
| starting point | 74,729 | 114.0% |
| `?pos` capture path behind `__HARNESS__` | 74,513 | 113.7% |
| scene jumping, `jumpTo`, `?start=` | **73,971** | **112.9%** |
| **target** | 65,536 | — |
| **still to find** | **8,435** | — |

⚠ **Two calibration facts that should stop anyone guessing:**
* Code packs at roughly **3.5:1**, data at **14–36:1**.  8,435 packed bytes
  therefore needs ≈ 30 KB of minified JS deleted.
* The intuition about where the fat is was WRONG.  The `?pos` capture path — the
  single most obviously "harness" thing in the runtime — is 845 minified bytes,
  **216 packed**.  Removing the whole scene-jump system bought 542.  Nothing in
  `main.js` is going to close this gap.

## The cut-list is MEASURED, not guessed — `tools/coverage_mashi.mjs`

    node tools/coverage_mashi.mjs --live --json

Drives the untouched readable build through 27 positions (every scene) plus a
live playback pass under V8 precise coverage, and reports the source ranges that
never execute, comment-stripped and ranked.  **63,488 bytes of dead code:**

```
   dead     of    %   file
  17941  43915   41%   web-sonnet/js/xm.js
  13836  68537   20%   web-sonnet/js/minid3d8.js
   6931  39538   18%   js/meshgen.mjs          <- SHARED, would need forking
   5831  18824   31%   web-sonnet/js/main.js
   5581  30534   18%   js/texgen.mjs           <- SHARED
   3604   4780   75%   web-sonnet/js/warmstore.js   (already stubbed by the build)
   3065  68190    4%   web-sonnet/js/scene7.js
   1439   2861   50%   web-sonnet/js/node_compat.js
   1368  14552    9%   web-sonnet/js/text.js
   1113  11677   10%   web-sonnet/js/flare.js
```

⚠ **A second browser page is a second V8 isolate**, so the live pass's coverage
is not in the first session's report.  Collecting only the first made the entire
XM effect engine look dead — acting on that would have deleted the player.  The
tool now starts and merges coverage on both sessions; if this is ever extended
to more pages, the same trap applies.

## xm.js: don't sample it, COUNT it

Coverage is a sampling argument, and the live pass only played 20 s of a 7:41
song — the weakest possible evidence for the biggest target.  The module is
fixed data, so the question has an exact answer.  Scanning all 43 patterns x 26
channels x 71,552 cells of the de-interleaved pattern stream:

```
EFFECTS PRESENT   8:3048  E9:508  4:383  Eb:325  9:252  3:224  Ec:185  A:165
                  6:151   1:99    2:97   5:60    7:32   Ea:27  E8:4    F:1
VOLUME COLUMN     plain volume only (5,598 cells) — never a volume-column effect
```

Sixteen commands, and the volume column never carries an effect.  So these are
**provably unreachable**, not merely unsampled: arpeggio (0), position jump (B),
pattern break (D), global volume (G/H), key-off (K), envelope position (L),
panning slide (P), multi-retrigger (R), tremor (T), extra-fine portamento
(X1/X2), note delay (Ed), pattern delay (Ee), pattern loop (E6), glissando (E3),
vibrato/tremolo waveform selects (E4/E7), and the whole volume-column effect
decoder.  That is the 17.9 KB, and it can be cut with certainty rather than
hope.

The same trick applies to `js/texgen.mjs` (5.6 KB dead): the 28 texture programs
are fixed bytecode, so the opcode census is exact — but texgen is SHARED, and
cutting it means forking `js/` too.

## Order of work from here

1. **xm.js** — delete the 20 unreachable effect handlers and the volume-column
   effect decoder.  ~17.9 KB source, the single biggest item, and the only one
   backed by a complete rather than sampled argument.
2. **minid3d8.js** — 13.8 KB never executes: unused D3D8 entry points, state-block
   bookkeeping, the `setNormalTransform('world')` legacy branch.  Coverage here
   is trustworthy (all scenes render) but is still per-GPU; keep anything on a
   capability path.
3. **main.js remainder** (~5 KB) — `fatal()`'s escape-hatch prose, the stats
   overlay, `?bg`/`?skip`/`?prewarm`/`?assets`/`?warm`/`?lighting`, and pinning
   one quality mode so the remaster/authentic fork folds away.
4. **Fork `js/`** only if 1–3 fall short — `meshgen.mjs` (6.9 KB: `tessellate`,
   `buildTerrainTessellated`, `transferGridNormals`, `resampleHeights`) and
   `texgen.mjs` (5.6 KB) together are worth ~3.5 KB packed.

Items 1–3 total ~37 KB of source ≈ 10–11 KB packed, which clears the 8,435 gap
without touching the shared libraries.

## Open product question for Jasper

**Which quality does the delivery pack ship?**  The default today is the
remaster (2x textures, render scale 2); `?quality=original` reproduces the 2001
build.  Pinning ONE of them at build time lets the other fold away.  Pinning
`original` saves more code (the whole re-sampling tessellation path goes) and is
arguably the honest thing for a 64k delivery; pinning the remaster ships what
the published site shows.  This is a product call, not a size one — it is worth
roughly 3–5 KB packed either way.

## xm.js — done, and verified sample-for-sample

Jasper, 2026-08-12: *"ship remastered, start on xm.js"*.  (The quality decision
is recorded above: the pack ships the REMASTER, so `?quality=original`'s
branches become the ones that may fold away, not the remaster's.)

**Guard first: `tools/audio_ab.mjs`.**  Builds the module, runs BOTH players —
untouched original and fork — over the whole 470 s song at 48 kHz, and compares
every sample by hash.  xm.js has no DOM or WebAudio dependency, so this needs no
browser and takes seconds.  Baseline: peak 0.8026, 99.2% audible,
`9b59e59c9e5922f4`.

⚠ It also asserts the reference render is NOT silent, which caught the first
version of itself: `mix()` is the inner voice mixer and does not advance the
song — `render()` is the driver.  Calling `mix` directly renders silence, and
silence compares equal to silence.  A comparison harness that can pass on
nothing is worse than none.

Removed on the strength of the census (all exhaustive, none sampled):

* **rowEffect** — B position jump, C set volume, D pattern break, G global
  volume, L envelope position, R multi retrigger, X extra-fine portamento;
  E1/E2 fine portamento, E3 glissando, E4/E7 waveform select, E5 finetune,
  E6 pattern loop, ED note delay, EE pattern delay.
* **tickEffects** — arpeggio (0), H, K, P, R, T, and the ED arm.
* **orphaned helpers** — `slideGlobalVolume`, `slidePanning`, `multiRetrigger`,
  `tremor`, `triggerDelayed`, `setEnvelopePosition`, `period2NotePeriod`, and
  the arpeggio phase table.
* **the volume column** — 5,598 cells, every one a plain volume, so the slide /
  fine-slide / vibrato / panning / pan-slide / tone-porta forms went, and
  `volumeColumnTick` disappeared entirely along with its call site.
* **waveform selection** — with E4/E7 gone `vibWave`/`tremWave` are permanently
  0, so vibrato and tremolo fold to the sine table and `resetInstrument`'s
  `& 4` tests are always true.

⚠ **`tremolo` is USED (effect 7, 32 cells) and `tremor` (T) is not.**  A
brace-matching removal script that also swallowed the preceding comment block
took `tremolo` out with `tremor`; the A/B caught it on the next run
(`this.tremolo is not a function`).  Adjacent similarly-named methods are the
hazard in this file — `vibrato`/`vibratoTick`, `tremolo`/`tremor`,
`retrigger`/`multiRetrigger`.

| | minified | packed | vs 64k |
|---|---|---|---|
| after the scene-jump cut | 259,572 | 73,971 | 112.9% |
| xm.js effect + volume-column cuts | 254,837 | 73,149 | 111.6% |
| waveform fold | 254,567 | **73,102** | **111.5%** |
| **still to find** | | **7,566** | |

xm.js went 29,346 -> 24,341 minified.  The remaining dead bytes coverage found
in this file are not whole functions but format-generality branches INSIDE live
ones (`parse`, `triggerNote`, `unpackPattern`, `mix` — 8- vs 16-bit samples,
loop types, and so on).  Each is worth a few hundred bytes; the same census
trick applies (the module's sample flags are fixed data) but the yield per edit
is an order of magnitude lower than the effect table was.  **minid3d8.js
(13,836 dead source bytes) is the better next target.**

## The payload experiment — settled, and the current design wins

Prompted by Sagacity's remark that Mashi has to be "trained".  **It does, but
automatically:** `model.rs::train()` is an ONLINE mixer-weight update —
21 base context models, up to 8 match models, 3 APM stages, and a neural mixer
whose weights adapt as it compresses — and the decompression stub runs the
identical update (`$train` in `decompress.wat`) so the two stay in lockstep.
The model is trained on OUR data every run.  There is no offline training pass,
no dictionary to prime, no CLI flag and no environment knobs (checked the v0.1.4
source: the entire option surface is `--wasm`).

What that *does* imply is that `compress(&js_input, &wasm_input)` mixes both into
ONE adaptive stream, JS first — so the model reaches the audio already fitted to
JavaScript text, and the `--wasm` vs in-JS choice is a real question rather than
an obvious one.  Measured, with everything else identical:

| payload carried as | intro.js | payload | **packed** |
|---|---|---|---|
| **`--wasm` channel, raw bytes** | 243,733 | 377,763 | **72,203** |
| base64 inside the bundle, no channel | 747,434 | — | **79,519** (+7,316) |

Base64's 33% inflation is NOT recovered by the context model: the 6-bit-in-8-bit
misalignment defeats the byte-context models, and it costs 7.3 KB.  Use the
payload channel.

⚠ **Base64 is also the only encoding the JS side could have used**, for a reason
worth recording: the loader does
`new Function(text.slice(0, jsLen))(bytes.slice(jsLen))` — it slices the JS out
of the decompressed stream by CHARACTER count after a UTF-8 decode, and the
payload by BYTE offset.  Those agree only while the JS is pure ASCII, so a raw
or Latin-1 binary string in the bundle would desynchronise the split and corrupt
both halves.

And the carrier shape inside the payload makes no difference — swapping only the
`.wasm` under an identical `intro.js`:

| carrier | packed |
|---|---|
| custom section, zero-length name (current) | **72,203** |
| real module: memory + active data segment | 72,216 (+13) |

+13 is exactly the extra module structure, so Mashi models our opaque bytes the
same either way and the smallest legal container wins.  `DisModel`, the
WASM-specific modelling, targets CODE sections — we have none, which is what the
"doesn't seem to have a code section" warning is about, and it costs nothing.

**Conclusion: the payload design was already optimal.**  `--payload=js` is kept
in the build only so the comparison can be re-run.

| | packed | vs 64k |
|---|---|---|
| timeline decoded from the image | 72,186 | 110.1% |
| + payload virtual module (one code path) | **72,203** | **110.2%** |
| **still to find** | **6,667** | |

## minid3d8 + the long tail — 74,729 -> 66,036 (100.8% of 64k)

Every step below was verified by rendering a frame at 0x120a from the fork's
`--harness` pack and checking it against the untouched original: **mean luma
120.6, 68.5% non-black, glError 0** throughout.  Two changes moved those numbers
and were caught immediately; both are recorded because the failure was silent.

| step | packed | Δ |
|---|---|---|
| after the xm.js cuts | 73,102 | |
| timeline decoded from the image | 72,186 | −916 |
| payload virtual module (one code path) | 72,203 | +17 |
| **prose the minifier cannot reach** | **68,834** | **−3,369** |
| resource archive decoded from the image | 68,353 | −481 |
| poem decoded from the image | 67,430 | −923 |
| pin the shipped configuration | 67,199 | −231 |
| drop the unreachable baked-asset paths | 66,741 | −458 |
| fold `lighting=fixed` (normal transform, shadow bake) | 66,601 | −140 |
| strip texgen ops 2/9/18 + the separable kernel | 66,193 | −408 |
| GLSL comment strip + uniform renaming | 66,036 | −157 |
| **remaining to 64k** | | **500** |

### The biggest win was not code at all

**esbuild strips comments from CODE.  It cannot touch comments inside STRING
literals, nor prose stored as DATA.**  This codebase had 13 KB of both, and
removing it was worth more than every structural cut combined:

* 5,171 B of GLSL comments inside the shader template literals
* 4,998 B of explanatory `throw new Error(...)` prose across 29 sites
* 2,126 B of `note`/`test`/`generator` documentation fields in `scene_desc`
* 868 B of provenance metadata in `poem.json`

If a size build ever looks stuck, grep the ARTIFACT for English before touching
the architecture.

### minid3d8 was NOT the target it looked like

Coverage reported 13,836 dead bytes in the shim, but a function-level pass
(`--live`, `callCount: true`) found only 3,537 of them in whole functions, and
**esbuild had already tree-shaken almost all of it** — a control experiment
stripping four never-called `meshgen` generators by hand changed the bundle by
**0 bytes**, so the namespace import (`import * as MG`) does not defeat
tree-shaking here.  What is left in the shim is branch-level dead code inside
live functions, which is exactly the expensive kind to remove.  The only real
wins were class methods (always retained: `SetViewport`, `GetTransform`,
`GetClipPlane`, `checkError`) and the `lighting=legacy` normal-transform arm.

### Two silent failures the guards caught

* **`mangleProps: /^_/`** — 68 underscore-prefixed properties, 1,496 recoverable
  bytes, no string-keyed access anywhere, packed to **65,952 (100.6%)** — and
  hung the boot.  The convention spans objects built in one module and read in
  another through paths esbuild cannot prove.  Reverted; it needs a
  per-property bisect, not a regex.
* **GLSL array uniforms.**  Renaming shader identifiers looked clean and the
  demo still ran — but mean luma dropped 120.6 -> 113.2.  Array uniforms are
  fetched by ELEMENT (`U('uLightPos[0]')`), so an exact-string replace missed
  five of them, `getUniformLocation` returned null, and the lights stopped being
  uploaded with no error anywhere.  Fixed by matching the `[...]` suffix.

Renaming the shader's own LOCALS as well is worth ~90 more bytes and was
reverted: it cost two bug classes a real tool handles for free (preprocessor
directive names read as identifiers, then an unlocalised syntax error).  **For
the last 500 bytes use `webpack-glsl-minify` or Shader Minifier** — both handle
ES 3.00 and emit a uniform name map, which is the part that has to stay in sync
with `U('...')`.

### What the delivery build now is

One `index.html`.  Ships the REMASTER, pinned: no `?quality`, `?texscale`,
`?render`, `?lighting`, `?assets`, `?audio`, `?warm`, `?debug`, no scene-jump
keys, no `?start=`, no capture path.  The timeline, the poem and the 52-entry
resource archive are all decoded from the image slice at runtime rather than
shipped a second time as JSON or base64 — each with a build-time assertion that
the decode is byte-identical to the file it replaced.

---

# The build is automated and gated (2026-08-13)

Jasper, after testing the pack on several machines and browsers: *"we need to
automate the creation of the mashi version; we now have established that it can
sit below the 64kb barrier"*.

    ./build-sonnet-mashi.sh                # bootstrap, build, verify, gate
    ./build-sonnet-mashi.sh --quick        # build only, no browser
    ./build-sonnet-mashi.sh --no-compare   # skip the frame diff
    ./build-sonnet-mashi.sh --payload=js   # re-run the payload A/B

One command, no manual setup.  It:

1. **bootstraps the toolchain** — `npm install --prefix tools` for esbuild, and
   `tools/fetch_mashi.sh` downloads Mashi and verifies it.  The VERSION is
   PINNED, deliberately: Mashi is a compressor, so a new release can move the
   packed size, and this build gates on that size.  Bumping it is an act with a
   re-measure attached, never something a build picks up on its own.  The
   macOS/arm64 digest is pinned from a hand-verified checksum; other platforms
   fall back to the release's own `sha256.sum`, which the script says out loud
   is weaker.
2. **proves the data before packing anything** — the build fails unless the
   audio slice synthesises all 24 instruments bit-identically, the 52-entry
   resource archive decodes byte-identically out of that slice, and the poem
   decoder reproduces `re/text/poem.json` field-for-field.
3. **builds both packs** — the ship pack, and the `--harness` pack that still
   carries the single-frame capture hook so the frame checks can drive it.
4. **verifies it runs** (`tools/test_mashi.mjs`: boots, renders, plays, and
   proves the audio path by clicking through to a moving clock).
5. **verifies it is still the same demo** (`tools/compare_mashi.mjs`: 17
   positions across every scene, fork vs the untouched readable build,
   pixel-for-pixel).  Latest run: **worst RMSE 0.001, all 17 identical.**
6. **gates on 64k** — over budget is `exit 1`, and `set -e` aborts the pipeline.

## The gate, and its control case

`LIMIT = 65536` in `tools/build_mashi.mjs`.  Verified in BOTH directions, which
is the only way a gate is worth anything:

```
over-budget build (--payload=js)  exit 1   ✗ OVER THE 64k BUDGET by 6874 B
normal build                      exit 0     676 B of headroom
pipeline with the bad build       exit 1   (set -e aborts)
```

`--allow-over` exists for deliberate experiments; it is not wired into the
pipeline.

## Where it landed

```
  dist/sonnet-mashi/index.html    64860 B
  original sonnet.exe (ASM 2001)  65536 B
  under the 64k budget by           676 B
```

The original spent the entire 64k to the byte, so "under budget by 676" and
"smaller than the original by 676" are the same number.

⚠ Not a like-for-like comparison, and it should not be quoted as one: the 2001
binary was self-contained and carried its own depacker; this is an HTML file
standing on a browser that supplies WebGL2, Web Audio, `DecompressionStream`, a
WASM engine and Times New Roman.  What IS like-for-like is the content — every
texture, mesh, camera spline and note still comes from the original's own data,
decoded at runtime from a 382 KB slice of its depacked image.

## Gotcha worth keeping

`bash` 3.2 still ships on macOS and expands an empty `"${arr[@]}"` to an unbound
variable error under `set -u`; the script uses `${arr[@]+"${arr[@]}"}`.

---

# TODO: UNFORK — build the pack from the readable source (Jasper, 2026-08-13)

> "we should 'unfork' the mashi version and completely automate its building
> from the readable version"

**Agreed, and this is the right moment.** The fork was the correct call when the
question was *can this get under 64k at all* — it bought freedom to cut without
risking the verified build. Now that it HAS (64,860 B), the cut inventory is
known and measured, and the fork's cost starts accruing instead: two copies of
the runtime, and a delivery artifact whose only defence against silent drift is
that someone remembers to run `tools/compare_mashi.mjs`.

**Goal:** delete `work-sonnet/web-sonnet-mashi/` entirely.
`./build-sonnet-mashi.sh` builds the pack from `work-sonnet/web-sonnet/` — the
same tree the harnesses drive and `run-verify.sh` blesses.

## What is actually forked

Six files, and they are NOT six equal problems:

| file | changed lines | nature |
|---|---|---|
| `xm.js` | 329 | **deletions** — 20 unreachable effect handlers + the volume-column decoder |
| `main.js` | 157 | **pinning** — one shipped configuration, plus scene-jump/`jumpTo`/`?start=` removal |
| `minid3d8.js` | 55 | **deletions** — 4 never-called methods, `worldMatrix3`, the legacy normal arm |
| `assets.js` | 41 | **deletions** — the baked-asset download paths |
| `text.js` | 22 | **deletion** — `loadAtlas` (baked-atlas only) |
| `scene7.js` | 12 | **pinning** — `AUTHENTIC`/`SHADOW_BAKE` become constants |

Plus two fork-only files that are NOT a fork problem and should simply move to a
neutral home (`web-sonnet/mashi/`): `entry.js` and `poem_decode.js`.

## The mechanism already exists, and most of the work is done

`tools/build_mashi.mjs` ALREADY rewrites the shared, unforked `js/` libraries at
build time and nobody has to maintain a copy of them: the prose strip, the
texgen op removal, the `scene_desc` documentation fields, the `resources.mjs`
swap and the guard-throw neutralisation are all esbuild `onLoad` transforms
against the pristine source. The fork exists only because the six files above
were edited by hand instead. Re-express each as the same kind of transform:

1. **Pinning (`main.js`, `scene7.js`) → esbuild `define`.** Land the small
   number of source hooks in the READABLE build — `const AUTHENTIC = __AUTHENTIC__`
   and friends, defaulting to today's runtime behaviour — and let the pack define
   them to constants. This is the only category needing source changes, and they
   are one-line, behaviour-preserving, and testable by the existing sweep.
2. **Deletions (`xm.js`, `minid3d8.js`, `assets.js`, `text.js`) → onLoad
   transforms**, exactly like the texgen op strip: name the symbols, brace-match,
   remove. The census that justifies each is already written down (the XM effect
   census, the never-called-method list, `?assets=baked` being unreachable in a
   single file).
3. **`__HARNESS__` already works this way** — it is the proof the pattern scales.

## Acceptance test — do not accept it on inspection

The unforked build is correct only if, with `web-sonnet-mashi/` deleted:

* `./build-sonnet-mashi.sh` still packs **≤ 64,860 B** and passes the 64k gate;
* `tools/compare_mashi.mjs` is still 17/17 identical against the readable build;
* `tools/audio_ab.mjs` is still sample-for-sample over the whole song — it
  currently compares the fork's `xm.js` to the original's, so it will need
  re-pointing at the TRANSFORMED source (feed it the esbuild output, or run the
  transform in-process);
* `run-verify.sh --full` is unchanged at median 24.35 — proving the source hooks
  from (1) did not perturb the readable build.

## Why it is worth doing now rather than later

Every future fidelity fix currently has to be applied twice or the pack silently
falls behind. The beach colour-cast fix (FIXLOOP_LOG #14.5) will be the first
one to hit this. Unforking first means that fix lands once.

Also worth folding in at the same time: wire `build-sonnet-mashi.sh --quick`
into `run-verify.sh` as a tier, so a size regression is caught by the same
command as a fidelity one.
