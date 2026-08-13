# Sonnet — the preloader, and the port that generates its content at load

Status: **implemented**. `web-sonnet/js/preloader.js` is the port of `FUN_004010dc`;
`web-sonnet/js/assets.js` + `js/fontgen.js` + `js/node_compat.js` move the font atlas
and the whole module off the download and onto the machine that is watching.

---

## 1. What the original does — CORRECTED

`FUN_004010dc` is **not** a screen drawn once. It is a **progress tick**, called from
the top of twelve heavy precalc constructors, one of them inside a 16-iteration loop:

```
0x402f30  0x407ea8  0x408e6b  0x409303  0x4095ea  0x409861
0x40a0cb  0x40aab7  0x40ad20 (x16)  0x40ae59  0x40b3c6  0x40b5f7
```

### It is not a progress bar, and there are no rectangles

The earlier draft of this document read the four `FUN_00402362(0, a, b)` calls as
"two nested rectangles, outline and fill". They are not geometry at all.
**`FUN_00402362` is `SetTextureStageState`** (vtbl +0xfc), so the four calls are

| call | meaning |
|---|---|
| `FUN_00402362(0,2,3)` | `D3DTSS_COLORARG1 ← D3DTA_TFACTOR` |
| `FUN_00402362(0,1,2)` | `D3DTSS_COLOROP ← D3DTOP_SELECTARG1` |
| `FUN_00402362(0,5,3)` | `D3DTSS_ALPHAARG1 ← D3DTA_TFACTOR` |
| `FUN_00402362(0,4,2)` | `D3DTSS_ALPHAOP ← D3DTOP_SELECTARG1` |

i.e. *"ignore the texture and the vertex colour, take everything from
`D3DRS_TEXTUREFACTOR`"*. The four calls **after** the draw (`(0,2,2) (0,1,4) (0,5,2)
(0,4,4)`) put the stage back to `MODULATE`/`TEXTURE` for the text engine.

Likewise **`FUN_00401558` is not a colour setter**: it is `vec3::set(x,y,z)`, three
stores and a return. `FUN_00401558(v, 0, 0, 0x3f800000)` seeds a **point** at
`(0, 0, 1.0)`, where the third component is the quad's size, not blue.

### What it really draws: a collapsing diamond lattice

```
  pts = [ (0, 0, 1) ]                    ; DAT_00474614, count DAT_0047461c
  n   = fistp(progress)                  ; FUN_00404224 = round-to-nearest of _DAT_00474650
  for i in 0 .. n-1:                     ; breadth-first over a GROWING array
      t = (i == n-1) ? clamp01(progress - n) : 1.0
      FUN_00401061 spawns 4 children of pts[i] at (-d,0)(+d,0)(0,-d)(0,+d), z = t
  for each point i:
      h = 0.08 * pts[i].z
      TEXTUREFACTOR = PALETTE[i & 3] | 0x1f000000
      DrawPrimitiveUP(TRIANGLEFAN, 2, quad(x±h, y±h), stride 0x2c)
  progress -= 100.0/599.0
```

`FUN_00401bd0` (= the shim's `reset2D`) sets **WORLD, VIEW and PROJECTION all to
identity**, so those coordinates are NDC. The cloud holds `1 + 4·round(progress)`
quads — 401 at the start — the four newest fade in by growing from zero, and the
whole thing collapses towards a single quad as `progress` falls.

### The real geometry and colours, read out of the image

`unpacked/sonnet_u.exe`, `.text` at VA 0x401000 = file offset 0x400:

| VA | value | what it is |
|---|---|---|
| `0x4170b4` | **599.0f** | the number of ticks the counter is scaled for |
| `0x4170b8` | **0.08f** | quad half-size in NDC, and the lattice pitch unit |
| `0x4170bc` | **1.5f** | pitch = `0.08 × 1.5` = **0.12 NDC** |
| `0x4170c0` | **100.0f** | the decrement numerator, and the counter's start value |
| `0x4170c4` | **1.0f** | upper clamp on the newest generation's fade |
| `0x4170c8` | **0.0f** | lower clamp |
| `0x4170cc` | **-1.0f** | the "stop drawing" sentinel |
| `0x41a9c0` | `00a7d77f 00fdda62 00a34701 00c9cdd0` | the four-entry palette, indexed `i & 3` |

Alpha is `0x1f` (31/255 ≈ 12%) on every quad, blended `SRCALPHA/INVSRCALPHA` with
Z-writes off (`FUN_004019e6(2)`). On a 640×480 backbuffer the quads are **25.6 × 19.2
px** and the pitch is **38.4 × 28.8 px**, so neighbours overlap and the lattice reads
as one soft blob rather than a grid of dots. The palette is the demo's own — it is
the same run of colours the title-card bars use (`text.js`'s `BAR_COLORS`, at
0x41a9bc), which is a nice independent confirmation that 0x41a9c0 is the right table.

`_DAT_00474650` is initialised to **100.0f** in `FUN_00401000`, which also allocates
`60000` bytes = **5000 vec3 slots** for the point array (401 are ever used).

### And a line of the poem

The tail pokes the text engine's item array directly:

```
  items[0].active = 1 ; items[0].t = 1.0f        (+0x08 / +0x0c of a 0x40 record)
  if (DAT_00478920) { vtbl[0](); vtbl[4](0); vtbl[0](); vtbl[4](0); }     <- TWICE
  items[0].active = 0 ; items[0].t = 0
```

The vtable is at **0x418de0** = `{ FUN_00406d90 init, FUN_004072e9 render,
FUN_004076c4 event }`, so that is `init(); render(layer 0);` run **twice** — a real
double-draw of the same frame, which does change the pixels because the glyphs'
antialiased edges composite twice. `FUN_00406d90` zeroes the title-bar phase/flash
arrays and re-anchors the frame clock; it does **not** clear item state, which is why
item 0 survives between the two passes (so it is *not* `TextEngine.reset()`).

The `DAT_00478920 != 0` guard is why the early call sites draw the cloud with no text
on it: the text object does not exist yet. The port reproduces that.

Poem item 0 is **"beauty continues to amaze"** — the one item the timeline never
triggers. So the original's loading screen is: **black, a slowly collapsing cloud of
soft coloured quads, and a line of the poem it is about to show you.**

### §4's open question, answered: the original does NOT weight its call sites

Every call subtracts exactly `100.0/599.0 = 0.16694…`, regardless of how much work
the caller did. With ~27 call sites reached in practice the counter only falls from
100 to ~95.5, so **the original's own bar barely moves** — the counter is scaled for
599 ticks and gets 27. The port drives the same counter across its full designed
range (`progress = 100·(1 − fraction)`, and 599 × 100/599 is exactly 100), so the
mechanism, the geometry and the palette are the original's and only the input is
honest. Nothing is animated on a timer; if no generator reports progress, nothing
moves.

### One deliberate reordering

The original opens with `FUN_00402c72(0)` (clear) and closes with `FUN_0040149b`
(Present, then clear for the next frame). D3D8 flips, so clearing after Present
touches the *next* back buffer. WebGL has one buffer and the browser composites when
the task ends, so clearing after Present wipes exactly the frame just drawn — it did,
and the loading screen came out black. `presentAndRestoreBackbuffer` moved to the
**top** of the tick instead, which is the same rotation `main.js`'s `renderAt` already
uses. Same device calls, same frames.

---

## 2. Generating at load — what changed, and what it costs

Payload, measured on this tree:

| | raw | gzip -9 |
|---|---|---|
| the intro's own resource archive (28 texture programs + 8 scene descriptors + 16 camera splines) | **4,178 B** | — |
| `extracted/sonnet.xm` | 1,552,564 B | 708,260 B |
| `baked/tex_2x/11.png` (the font atlas) | 233,714 B | 214,113 B |
| **what those two are replaced by:** `unpacked/sonnet_img.bin` | 541,299 B | **69,480 B** |

Textures and meshes were already generated (the scene objects call `texgenImage()`
and never fetch a PNG). This work removed the last two downloads:

**The font atlas.** `re/gen/TEXGEN_PORT.md` §4 lists op 17 as "not portable" because
it is Win32 GDI, and §19 bakes it offline with node-canvas. That was reasoned from
Node, where it is true. A browser has the exact equivalent of every GDI call the op
makes — `ctx.font` ≡ `CreateFontA`, `fillText` ≡ `TextOutA`, `getImageData` ≡
`GetDIBits`, `fillStyle`/no-clear ≡ `SetTextColor`/`SetBkMode(TRANSPARENT)` — and the
substitution is safe **because the consumer scans the atlas for glyph extents**
(§18: `FUN_00406c98` walks each 128-row band column by column and splits at the blank
columns) rather than trusting metrics. `web-sonnet/js/fontgen.js` is that port, kept
line-for-line comparable with `js/bake_font.mjs`.

**The module.** `audio/writexm.mjs` rebuilds the XM from the four embedded streams
and is byte-identical to `extracted/sonnet.xm` — verified, not assumed. It is Node
code (`node:fs`, `Buffer`) and belongs to the audio work, so rather than porting it
the browser is given the two facilities it uses: `web-sonnet/js/node_compat.js`
(a `Buffer` over `Uint8Array`, a file registry, an empty `process`) plus a `node:fs`
entry in index.html's import map.

`?assets=baked` keeps the whole download path, and `baked/` stays the regression
corpus. `node web-sonnet/test/generate_test.mjs` is the test that uses it as one.

---

## 3. Measured — 2026-08-05, headless Chrome (ANGLE/Metal), 8 cores

Boot phases from `window.__sonnetTimings`, median of three consecutive runs each.
(An early, cold-machine pass read 25–40% faster across the board — 659 ms of texture
generation rather than ~900. The settled repeated numbers are the ones below;
the *ratios* between rows were the same in both passes.)

| path | atlas | textures | scenes | audio | **total** |
|---|---|---|---|---|---|
| `?pos=…&quality=original`, no loading screen, no audio | 33 | 935 | 197 | — | **1164 ms** |
| playback, `?quality=original` | 35 | 903 | 223 | 66 | **1227 ms** |
| playback, remaster (2x atlas) | 104 | 888 | 219 | 68 | **1292 ms** |
| playback, `?assets=baked` — the old download path | 95 | 898 | 217 | 12 | **1223 ms** |

Read these carefully:

* **The last row is the honest comparison, and generating loses by 69 ms.** On
  localhost, with zero network latency, the download path is 1223 ms and the
  generated one 1292 ms — the difference is the font atlas rasterising (104 ms)
  instead of a PNG decoding (95 ms) plus the module synthesising (68 ms) instead of
  1.5 MB arriving instantly (12 ms). Over a real network the 858 KB of gzipped
  payload it saves costs far more than 69 ms: **at 10 Mbit/s the download path is
  ~0.7 s slower, at 5 Mbit/s ~1.5 s slower.** Generating is a win on time everywhere
  except a local disk, and a 13× win on bytes everywhere.
* **Only the atlas and the module changed.** The 888–935 ms of texture generation is
  in every row including `?assets=baked` — the scene objects have always called
  `texgenImage()` and never fetched a PNG.
* **Building the scenes is nearly free.** With the textures already cached, all nine
  objects build in **85 ms total** (obj 2: 0.1, 3: 5.2, 4: 8.3, 5: 20.9, 6: 5.0,
  7: 11.7, 8: 20.4, 9: 7.2, 10: 6.2). The `scenes` phase above is ~200 ms because it
  also uploads the textures to the device.
* **Audio synthesis is 66–68 ms**, including reading the image. Not a bottleneck, and
  it does not need a worker. `main.js` starts the `sonnet_img.bin` fetch at page load,
  while the page waits for the click an AudioContext requires, so the audio phase is
  pure CPU by the time the preloader reaches it.
* **The loading screen itself costs under 40 ms** — but only after it was measured.
  Repainting on every one of the ~30 progress steps meant awaiting a vsync each time
  and added **~270 ms**, because a 2 ms texture program would still pay up to 16 ms to
  display a change nobody can see. Repaints are now capped at 30 Hz (17 repaints over
  a real boot); the bar still updates from real completed work on every call, it is
  just not *drawn* more often than that.

### The two optimisations in the brief, priced

**1. Web Workers — measured win ~400 ms, but BLOCKED by ownership.**
A module worker running the same `runTexgen` over the 27 programs (results
transferred, pool warmed first):

| workers | total |
|---|---|
| 1 | 666 ms |
| 2 | 397 ms |
| **4** | **259 ms** |
| 6 | 289 ms |
| 8 | 275 ms |

So four workers would cut ~400 ms off a ~1000 ms boot, and more than four is worse
(the tail is five long programs, not 27 equal ones). **It cannot be wired up from
the files this task owns.** `texgenImage`'s memo table is a module-private
`const _texgenCache = new Map()` inside `web-sonnet/js/scene7.js`, and the scenes
call `texgenImage` directly, so a worker-computed image has no way in. The enabling
change is one line in `scene7.js`:

```js
export function putTexgenImage(id, entry) { _texgenCache.set(id, entry); }
```

with `entry` shaped `{ w, h, argb, rgba }` exactly as `texgenImage` builds it. With
that, a pool of four workers in `assets.js` can fill the cache before `buildScenes`
runs and every scene finds its textures already there. Flagged for whoever owns
`scene7.js`; **not** worth doing behind their back while they are editing it.

**2. Lazy per-scene generation — measured win ≈ 0, so NOT built.**
The brief expected this to turn a 2 s wait into a near-instant start. The
measurements say otherwise. The remaster path was *already* lazy — the scenes pull
only the programs they use — and it cost **exactly the same 834 ms** as precalculating
everything, because between them the eight scenes touch nearly every program. And
since building a scene once its textures exist costs 5–21 ms, deferring scene 10's
build to 0x2300 would save single-digit milliseconds. The idea is sound in principle
and the timeline does say when each asset is first needed; on this content there is
nothing to win, and `re/PERFORMANCE.md` §0 is explicit that measurement decides.

That measurement then argued the *opposite* change, which is what shipped: since the
lazy path saves nothing, **both** quality paths now precalculate every texture program
up front, as the original does. It costs ~40 ms and it turns the progress screen from
5 coarse steps into 30 fine ones, because the work is visible to the preloader instead
of buried inside one opaque `buildScenes()` call.

### Regression

* **Sweep, default cold warm-up, 354 samples:** median RMSE **26.7** (mean 28.8,
  worst 118.99 at 0x0710) against a baseline of 27.49. The same sweep with the baked
  atlas forced on scores **26.54**, so the generated atlas costs **+0.16 RMSE** —
  noise against a 27.49 budget.
* **Generated vs baked textures:** all **27** pixel programs are byte-identical in
  the browser to `baked/tex/*.png`. (Program 11 is the font strip; its only op is 17.)
* **Generated vs baked font atlas:** not identical and cannot be — different
  rasterisers, exactly as §19 says of the offline bake against GDI itself. What is
  identical is what the demo consumes: the column scan finds **the same 146 glyph
  boxes** in the same four bands, and the four row advance sums come out at
  **2009 / 1940 / 2076 / 2016**, the same integers the offline bake produces. Glyph
  box widths differ by **0.48 px mean, 2 px max**; the browser inks 12.5% more texels
  (a heavier AA ramp).
* **Generated vs extracted module:** byte-identical to `extracted/sonnet.xm`.

---

## 4. Could we ship it as a real 64k intro again? — now genuinely unblocked

Jasper's idea, prompted by sagacity's own modern tooling at https://datatra.sh/projects/:
**Wasm-PNG** (payload stored as PNG pixel data so the browser's native DEFLATE does
the decompression) and **Mashi** (a PAQ-style compressor) — the original coder's own
tools, used to repackage his own 2001 intro.

Measured earlier on this tree (scene work still in progress, so this will move):

| | bytes |
|---|---|
| all JS source | 473,289 |
| de-commented (crude regex, **no real minification**) | 262,157 (55%) |
| …gzip -9 | 77,441 |
| …**xz -9e** (proxy for a PAQ-class packer) | **66,516** |
| 64 KB limit | 65,536 |

Within 1.5% of the limit with no identifier mangling, no dead-code elimination and no
property mangling.

The two things that made this feasible are now both true rather than hoped for:

1. **The data is 4,178 bytes** — asserted by `integration_test.mjs`, not just claimed
   here — because we ship the intro's own bytecode and run its own generators.
2. **The font atlas generates in-browser**, so no asset has to ship as an image.

The one thing still outside the code budget is `unpacked/sonnet_img.bin` for the
audio streams (69 KB gzipped by itself). The four streams are 367,502 bytes of the
541,299-byte image, and only some scattered float constants outside them are read
(`codec0.mjs`'s `CONST` table), so a trimmed image is a straightforward win if the
64k build is ever attempted — but it is the audio work's file to trim, not this one's.

---

## 5. Files

| file | what |
|---|---|
| `web-sonnet/js/preloader.js` | `FUN_004010dc` — the lattice, the palette, the poem line |
| `web-sonnet/js/fontgen.js` | texgen op 17 on a canvas; the atlas, generated |
| `web-sonnet/js/assets.js` | generate-vs-download seam, and the payload numbers |
| `web-sonnet/js/node_compat.js` | `Buffer` + a file registry, so `audio/*.mjs` runs unmodified |
| `web-sonnet/js/node_fs.js` | the `node:fs` import-map target |
| `web-sonnet/index.html` | the import map |
| `web-sonnet/js/main.js` | boot order, the progress model, `window.__sonnetTimings` |
| `web-sonnet/test/generate_test.mjs` | generated-vs-baked, in a real browser |

Debug seams: `?assets=baked`, `?preload=0|1`, `window.__sonnetTimings`, and
`window.__sonnetPreloader` (set `.progress = 100*(1-f)` then `.draw()` to repaint the
loading screen at any fraction — the only way to screenshot a canvas created with
`preserveDrawingBuffer: false`).

## 6. Known issue found while verifying — NOT this work's

`web-sonnet/test/warm_equiv_test.mjs` fails on this tree, with **6–7 of 18 positions
differing and the count varying run to run**. All the failures are inside the rain
(from 0x1b00) and snow (from 0x2000) windows. It fails identically with
`?assets=baked` (7, 6, 6 over three runs) and with generation on (7, 6, 6), so it is
not caused by anything here — it is non-determinism in the precipitation path, in
files another agent is actively editing. Reported, not touched.
