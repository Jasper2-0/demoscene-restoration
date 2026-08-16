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

## The binary is the source of truth

**The production always takes precedence over external documentation.** File
format specs, vendor manuals, published tool behaviour and community wisdom
are *hints about where to look* — never statements about what the program
does. When a spec and the executable disagree, the executable is right by
definition, because the executable is the artifact being restored.

This is not a rule about accuracy, it is a rule about what is being made.
A reconstruction that follows the documentation and looks wrong has not
"corrected a bug in the original" — it has stopped being a reconstruction.
Where the original deviates from its own format or from correct rendering,
the deviation *is* the work: `please the cookie thing` never enables
`GL_NORMALIZE`, and its streaked chrome is that omission; `lost vegas` uses
full-range JFIF coefficients where BT.601 is "correct"; its glyph table is
over-read by characters outside its range, and that is how the group's own
title spacing happens.

The rule already appears in this document as advice for one case — confirm a
data layout against *the code that consumes it*, not against your own eyes —
but it governs everything:

- **Parsing.** Read the container with the spec, then confirm which chunks
  the engine actually reads. Fields the program ignores are not part of its
  format however prominent they are in the standard, and a field it
  misreads must be misread identically.
- **Numerics.** Any formula — interpolation, projection, colour conversion,
  attenuation — comes from the disassembly. If a documented formula happens
  to agree, that is a result to be shown, not an assumption to start from.
- **Fitting.** An empirical fit against a capture is a hypothesis, never an
  answer. It is acceptable only as an explicitly marked placeholder, and it
  is dangerous precisely when it looks convincing.

Lapsus is the worked example of getting this wrong: texture coordinates were
implemented from LightWave's documented projection rules rather than from
dm2000, and the response to the mismatch was to fit a pivot to a single
frame. Both steps consulted the wrong authority.

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

That rule is now automated: `tools/ghidra/ExportDisasm.java` exports a paired
disassembly listing (same function markers as the decomp export), and
`tools/x87-audit.mjs` cross-references the two, flagging every function whose
x87 instructions have no floating-point counterpart in the C. A DROPPED flag
means un-ported until the asm has been read.

**The audit gates porting; it is not a report to consult after something
looks wrong.** Before implementing any numeric behaviour, find the function
that *produces* it and check it against the audit. Doing this in the wrong
order costs a full debugging round and, worse, tends to produce an empirical
fit that looks close enough to get committed and built upon. This happened on
Lapsus: texture coordinates were implemented from LightWave's *documented*
projection rules — an outside assumption, never the engine — and when the
backdrop did not match, the response was to fit a pivot to one frame rather
than to ask which function generated the coordinates at all. It was flagged.

The failure is subtle because the missing step is not "ignore a warning" but
"never locate the producing code": you cannot check a flag on a function you
have not identified. So the question to ask before porting a behaviour is
*which VA computes this?* — and only then, *is it trustworthy?*

**Verification does not spread.** Checking part of a function earns you that
part and nothing else. The Lapsus envelope evaluator was read out of the
disassembly and the key layout confirmed — 24-byte stride, times in absolute
seconds, how the span is searched — and the evaluator was then treated as
"verified" wholesale. The *tangent formula* had never been looked at, and it
was wrong: endpoint tangents were halved by substituting the key itself for
the missing neighbour, turning a straight ramp into an ease-in/ease-out
S-curve. It cost a long detour, because a curve that is right at both ends
and wrong in the middle presents as a *timing* error that varies with time,
which is a convincing disguise.

The data said so plainly. The scene file contained two keys — `0` to
`6.283185` over 12 seconds, tension/continuity/bias all zero — from which a
constant 30°/s follows directly. Nobody read them; a textbook interpolator
was written from memory instead. Before writing any interpolation, decoder or
evaluator, **read the actual values it will be given**: a handful of real
inputs constrain the answer far more sharply than the format's general case,
and they are free to look at.

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

## Run the original's own code instead of reimplementing it

The Planet Potion work added a technique the earlier restorations did not need,
and it generalises: **where a subsystem is pure computation, execute the
original's code and read its output, rather than deriving what it would produce.**

The test is cheap. Take a function's transitive call closure and ask whether it
touches any library base or OS entry point. For that intro, three of five
subsystems touched none — the procedural texture VM, the scene interpreter and
the whole softsynth were pure functions over memory. Those need no operating
system, no ROM, no accelerated hardware and no emulator of the original machine.
They need a CPU.

So: hand-build a static ELF that maps the executable's hunks at their linked
addresses, set the small-data base register, call one function through a
register-indirect branch, and write the result buffer out with a `write(2)`.
That is an ELF header, a few program headers and a twenty-instruction stub —
no cross-toolchain — under `qemu-user`.

What it bought, repeatedly, was answers where modelling had failed:

- **Texture data.** 69 textures byte-exactly, rather than reimplementing a
  20-opcode image language.
- **Geometry.** Three attempts to model the operand widths failed, because a
  shared prologue's byte consumption depended on a table built at runtime.
  Running the interpreter and reading back the linked list it builds decoded 38
  of 39 programs and made the widths irrelevant.
- **The scene graph.** Blocked statically because operand bytes index structures
  that only exist once earlier passes have run. Running those passes first builds
  them.

Two practical notes. Stub the hardware library by pointing its base at a table of
no-op vectors, and **blanket the vector region rather than placing entries on
their nominal spacing** — Warp3D's globals hold *base + 2*, so real fetches land
on displacements that are not multiples of six. Give the stub an address whose two
halves are identical and fill every slot, so any aligned load returns it. And when
a run faults, `qemu -d in_asm -dfilter <lo>..<hi>` narrows it to a function in one
pass; that is how the missing font-table initialiser was found.

### And where it is *not* pure, record the calls instead of stubbing them

The obvious limit of the above is that it only covers subsystems touching no
library. Planet Potion's renderer was filed under "needs the original hardware"
for exactly that reason: it ends in Warp3D calls, so it cannot be run as a pure
function.

That was the wrong conclusion from a true premise. **The library calls are the
output.** Point every vector at a stub that writes its arguments down and
returns, and running the renderer produces the program's own draw stream — every
primitive, the texture bound, and the screen-space vertices as the original
computed them, for any frame. No hardware, no driver, no capture.

This is the more transferable half, because a graphics subsystem almost never
qualifies as pure, and every production here reaches its API the same way: a base
pointer or an import table, indirected. Three details make a recorder work where
a no-op stub would not:

- **Give each call a distinct return value.** Have the recorder return the
  address of its own log record. Resource-creating calls then hand back unique
  handles, and every later call that binds one can be tied to which — texture
  identity falls out of allocation order without decoding a single tag list.
- **Redirect shared output buffers, do not just observe them.** The intro built
  every primitive into one reusable vertex array, so a passive log would have
  captured only the last one. The stub repoints the array and advances it past
  each slice. Watch what else lives next to that buffer: the original's sat
  0x500 bytes below a pointer array it would have corrupted within twenty
  vertices.
- **Make time an input.** The frame clock reduced to one counter in memory.
  Writing it directly turns the whole renderer into a deterministic function of
  (scene, frame) — reproducible, samplable out of order, and diffable.

What this yields is not a hint about the renderer, it is a **test oracle**: a
reimplementation that emits the same primitives is right for reasons you can
point at, and one that does not can be diffed primitive by primitive, offline,
before a single pixel is rasterised. It also settles by reading what would
otherwise be fitted — here the projection, the reciprocal *estimate* the original
divides by, texture coordinates in texels rather than normalised, and the clip
planes.

### Prefer a decidable check to a statistical one

A recurring shape: you have N things the code should produce and N things it did.
Counting how many of each *kind* match is the weak test and leaves ambiguity
wherever two producers share a value. Ordering is usually stronger and usually
available — output appended to a cursor comes out in call order, so the Nth call
is the Nth result. That turned "9 of 11 sample lengths agree, two are unclaimed"
into "56 of 56 positions agree", and it resolved a conditional branch and three
computed lengths that counting could not touch.

The limit is honest and worth stating: this recovers *what the original computed*,
not why. It is extraction, not understanding. The naming still has to be done by
reading the code — but it can be done against known-correct output instead of
guesses.

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

For the Amiga work: `lhasa` · `amitools` (`hunktool`) · `capstone` · `ghidra`
with the PowerPC processor module · `qemu-user` (running the original's own
subsystems, above) · a hand-written Hunk loader, because stock tooling rejects
the `0xC0000000` memory-flags encoding these executables use.

## Credits

All original code, design, music and artwork remain the work — and the credit —
of **Aardbei** and **threestate**, and of the tool authors whose formats these
intros stand on. Jürgen Wothke's `webIXS` made the *please the cookie thing*
soundtrack recoverable.

Restoration by coat / solar, with Claude (Anthropic).
