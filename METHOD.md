# Method

How these demoscene productions are restored — the pipeline, the tools, and the
things we learned taking them apart.

This is Dutch demoscene **immaterial heritage** work. The goal is not "get it
running in an emulator": it is to recover *how these intros work*, document that
knowledge durably, and re-implement them so they run on hardware and software
that will still exist in twenty years — in a browser, from plain files, with no
plugins, no WebAssembly blobs, and no external dependencies at runtime.

Two productions from the same compo — **Ambience 2000**, the first party where
hardware-accelerated 64k intros went head to head, roughly nine months before
*fr-08*:

| | engine | textures | music |
|---|---|---|---|
| **please the cookie thing** — Aardbei (1st) | OpenGL 1.1 | ATG opcode scripts | IXS (procedural-sample IT) |
| **lost vegas** — threestate (3rd) | Direct3D 7 | MPEG-1 I-frames | MXM + procedural softsynth |

---

## The pipeline

### 1. Triage
Read every `.nfo`, `.txt` and `file_id.diz` first — the sceners tell you what
they used. Identify the packer (`file` → usually UPX; modern `upx -d` handles
2000-era *release* builds but often refuses party versions, whose stubs predate
current UPX).

### 2. Map the executable
Parse the PE (`pefile`): sections, imports, resources, overlay. Two questions
matter most:

- **Where does the data live?** A resource directory, an appended overlay, or —
  as in both of these — *nowhere*: `lost vegas` has a `.data` section that is
  1 MB virtual and 60 KB on disk, i.e. everything is generated at runtime.
- **What does it link against?** `lost vegas` statically imports only KERNEL32,
  USER32, WINMM and DSOUND; DirectDraw/Direct3D are resolved through
  `LoadLibraryA`/`GetProcAddress`, so the graphics API is invisible to a naive
  strings dump. `DirectDrawCreateEx` (not `DirectDrawCreate`) is the tell that
  it is a **Direct3D 7** program: in DX7 you obtain `IDirect3D7` *through*
  DirectDraw. Seeing `DDRAW.DLL` and concluding "2D software renderer" is wrong,
  and we made exactly that mistake before checking.

### 3. Decompile, then distrust the decompiler
Ghidra headless does the bulk:

```sh
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
analyzeHeadless <proj> <name> -import prog.exe -overwrite \
  -scriptPath ./ghidra -postScript ExportDecomp.java out.c
```

Ghidra's x86 decompiler **silently drops x87 floating-point expressions** — you
get `ftol()` with no operands, or a function whose entire math has evaporated.
Every one of the visual bugs we shipped and later fixed traced back to trusting
such a function. The rule that emerged:

> If a decompiled function looks too simple for what it draws, disassemble it.

`ndisasm -b 32` plus hand-tracking the x87 stack recovers the real expression.
Numeric constants are read straight out of `.rdata`/`.data`
(`struct.unpack_from('<f', image, addr - 0x400000)`), and MSVC's
`__real@3f800000`-style symbol names encode their own values.

Things worth knowing before you start:

- MSVC `rand()` is `seed = seed*214013 + 2531011; return (seed >> 16) & 0x7fff`.
  Engines consume one shared stream, so **any** change to the number or order of
  calls shifts every later random value. Adding detail later means forking a
  *local* PRNG, never borrowing from the global one.
- `__ftol` truncates toward zero, which is not what `Math.round` does.
- Fixed-function GL and D3D both hide traps that change how everything looks:
  sphere-map texgen runs on *unnormalised* normals unless `GL_NORMALIZE` is
  enabled (`please the cookie thing` never enables it — that is where its
  streaked chrome comes from); fog is often `GL_EXP`, not linear; D3D's front
  face is clockwise and its depth range is `[0,1]` where GL's is `[-1,1]`.

### 4. Look at unknown data
Before theorising about an unidentified blob, **render it**. Dumping `.data` as
1-bit and 8-bit greyscale at a few candidate widths, and simply looking, found
the `lost vegas` font atlas in about a minute — legible letterforms appear the
moment the stride is right. (We read it as 1bpp/512-wide; it is really 2bpp/256,
which looks equally legible at the same byte stride. Confirm against the code
that *consumes* the data, not against your own eyes.)

Entropy per window separates compressed payloads (~7.8 bits/byte) from tables
and bitmaps (< 4), which tells you where to look at all.

### 5. Port bit-exactly, remaster additively
The reconstruction is bit-exact where it can be: the same PRNG, the same
fixed-point arithmetic, the same truncation, the same integer kernels. Where the
original was resolution-limited we add a **strictly optional** remaster layer —
supersampled procedural textures, denser tessellation of analytic surfaces,
antialiased type — behind a switch, with the authentic build always one URL
parameter away, and a byte-identical regression guard proving the remaster
changes nothing at scale 1.

When one shared PRNG stream feeds every generator, **build order is part of the
spec** and the thing to check is the *exit state*, not the draw count. These
64k intros reseed constantly — in sonnet, 20 of the 28 procedural-texture
programs carry an `srand`, and a generator that runs one mid-body is cut in
two: everything drawn before the reseed is erased, so it cannot be moved across
it. Counting draws is the tempting invariant and it is the wrong one, because
the total is conserved under exactly the reordering that breaks the stream. A
sonnet generator sat for days with its verified-correct 4864 draws in the wrong
order around such a reseed, passing every count-based audit while everything
downstream ran 512 draws early. Pin the LCG word at each boundary instead —
it is one number, it is free to record, and it fails loudly.

### 6. Bake offline, ship plain files
Procedural assets are regenerated *by the ported generator* offline and shipped
as PNG/audio, so the runtime stays small, deterministic, and dependency-free.
Nothing is upscaled: the 4× textures are produced by running the original
generator at 4× with its random lattices pinned to the original sample points,
so every original pixel is reproduced exactly and the new detail is genuinely
interpolated, not invented.

### 7. Verify against the tape
A YouTube capture of the original is the ground truth. Align it once by
**cross-correlating its audio** against our rendered soundtrack (`numpy`), which
gives the capture's offset to the millisecond. From then on, any music position
maps to a video timestamp, so a headless Chrome harness can seek the port to a
scene, screenshot the canvas, and montage it beside the reference frame. Every
scene is signed off on a side-by-side, not on vibes.

Some things a capture cannot settle — those go in the docs as known deviations
rather than being quietly papered over.

### 8. Measure honestly, then believe the measurement
Most of the wasted effort on these ports came from measurements that were
quietly lying, so the harness rules are now explicit:

- **`gl.finish()` on both sides, or you are timing the queue, not the work.**
  A "180x speedup" turned out to be a baseline that had accidentally taken the
  fast path.
- **Assert the frame actually drew, and check `getError`, in the same task as
  the timing.** One convincing win came from writes running past the end of a
  buffer and silently doing nothing.
- **Sample audio-locked behaviour against the audio clock, never against
  `requestAnimationFrame`.** A throttled headless window invented a 77 % sync
  error that did not exist.
- **Warm up before screenshotting.** Cold-start hitches break exactly the
  entry-time fades you are trying to photograph.
- **A headless-vs-GUI disagreement is a hypothesis, not a verdict.** Blaming
  the harness was wrong twice; both times the GUI agreed within 7 % and the
  real cause was in the renderer (`bufferSubData` on ANGLE).

---

## What we found

### please the cookie thing (Aardbei) — OpenGL

- All 17 data files live in one RCDATA resource: 15 **ATG** texture scripts, a
  binary timeline, and the music. ATG is Aardbei's own procedural texture
  generator — and they *published it*, with example source, which is what made
  the format legible at all. Twenty-six years later, their documentation habits
  paid off.
- The timeline is 151 eight-byte events keyed to **music position** `(order,row)`,
  with per-layer clocks in 0.25 ms ticks.
- The soundtrack is *World of Noise* by Crystal Score in **IXS** — Impulse
  Tracker with procedurally synthesised samples, a format from Shortcut that
  Crystal Score co-created. It is rendered offline through Jürgen Wothke's
  `webIXS`, itself a reverse-engineered revival of the lost IXSPlayer.
- The player's position tag deliberately *leads* the audible audio by one row,
  which is why the original's cuts land on the beat rather than just after it.

### lost vegas (threestate) — Direct3D 7

- The whole demo is sequenced by **song position**: the master loop is a ladder
  of `while (musicpos < T)` blocks. There is no script table. Because the port
  plays the module live, its timeline is locked to the music by construction —
  no sync map, no latency calibration.
- The engine uses exactly **two vertex formats** and two primitive types, with
  lighting disabled entirely: all shading is baked into vertex colours and
  textures.
- The credited "DR design generator" is not a procedural generator at all. It is
  a **hand-written MPEG-1 I-frame decoder** — IDCT butterflies, VLC tables,
  zigzag, dequantisation and all. stevie drew the artwork, encoded each image as
  a single-frame MPEG-1 elementary stream, and embedded it: a 64k intro using a
  video codec as a texture compressor, in 2000. Our port decodes the same blobs
  to within a mean absolute error of 0.04/255 of ffmpeg. It uses full-range JFIF
  colour coefficients rather than BT.601, which is "wrong" and therefore
  faithfully preserved.
- Rather than hand-translating each effect's draw calls, the port reimplements
  **Direct3D 7 immediate mode itself** (`minid3d7.js`) on top of WebGL2, keeping
  D3D's conventions instead of converting them away — left-handed coordinates,
  row-major matrices, `[0,1]` depth, clockwise front faces, BGRA colours. The
  effects then read like the disassembly they came from, which makes them
  checkable; and every convention mismatch is fixed once, in one file, instead
  of once per effect.
- Faithfulness and speed turned out to be the same problem. The first shim was
  CPU-bound at exactly the places the original was cheapest, because a
  per-primitive API maps badly onto a driver that wants batches: the fixes were
  buffer-orphaning instead of `bufferSubData`, and hoisting per-vertex work out
  of the inner loops — not simplifying anything the intro actually does.
- The soundtrack is an **MXM** module driving a cosine-additive procedural
  softsynth; both were reconstructed from the binary, so the audio is generated
  rather than sampled, and the timeline rides it directly.
- The typography is a 2-bit alpha atlas with a proportional glyph table and a
  *vertical* kern table. Characters outside `a–z0–9#+` over-read the table;
  `*` lands on zeros and renders as an invisible zero-width glyph — which is how
  `threestate**in***lost***vegas**` gets its spacing. Bug, feature, or typing
  convenience, it is part of the work, so it is ported.

---

## Reconstruction, not restoration

None of this is the original source code. It is a reconstruction from the
shipped binaries plus whatever the groups published themselves. Where behaviour
was inferred rather than proven, the source says so, and the reverse-engineering
notes record the address the claim came from so the next person can check it.

Original bugs are preserved, not corrected: a light position that overwrites the
same coordinate three times, an asymmetric deblocking pass, a texture stage that
reads past its table. These are how the productions actually looked on the
night, and that is the artefact worth keeping.

## Tools

`upx` · `ghidra` (headless) · `ndisasm` · `pefile` · `numpy` · `ffmpeg` ·
`yt-dlp` · `node-canvas` (offline text rasterising with the period-correct
fonts) · `puppeteer-core` + headless Chrome (verification) · plain WebGL2 ·
a hand-written Direct3D 7 immediate-mode shim over WebGL2.

## Credits

All original code, design, music and artwork remain the work — and the credit —
of **Aardbei** and **threestate**, and of the tool authors whose formats these
intros stand on. Jürgen Wothke's `webIXS` made the *please the cookie thing*
soundtrack recoverable.

Restoration by coat / solar, with Claude (Anthropic).
