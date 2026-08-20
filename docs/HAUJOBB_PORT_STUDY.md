# Haujobb — a nine-production port study

Nine Windows productions released 2000–2003 by **Haujobb**, held unpacked in
`originals/haujobb/`. This document is the result of a triage pass over all
nine, run in parallel; the per-production reports are in
[`docs/haujobb/triage/`](haujobb/triage/), the parsers in
[`docs/haujobb/tools/`](haujobb/tools/) and the decompiles they cite in
[`docs/haujobb/re/`](haujobb/re/).

**The question it was commissioned to answer:** these productions share a team,
so can they be ported in parallel rather than in series?

**The answer is yes, and more strongly than expected.** All nine are one engine
by the same coder (cynic), evolving across three stages. One scene format,
one geometry format, one script language and one fixed-function renderer serve
the entire set. The engine work is shared; only the show data differs.

---

## The nine

| # | production | released | party (rank) | dz | pouet | local dir |
|---|---|---|---|---|---|---|
| 1 | Mikrostrange | 2000-04-23 | Mekka&Symposium 2000 PC Demo (2nd) | 23701 | 1092 | `hjb_mifi` |
| 2 | Art | 2000-08-05 | Assembly 2000 Combined Demo (2nd) | 230 | 125 | `hjb_artf` |
| 3 | Moments | 2000-12-28 | The Party 2000 PC Demo (4th) | 259 | 1237 | `moments` |
| 4 | Mosaik | 2001-04-15 | Mekka&Symposium 2001 PC Demo (2nd) | 24897 | 1959 | `mosaik` |
| 5 | Elements | 2001-12-28 | The Party 2001 Demo (**1st**) | 8975 | 4776 | `hjb_elef` |
| 6 | Channel 5 Sequence | 2002-03-31 | Mekka&Symposium 2002 PC Demo (4th) | 26203 | 5591 | `channel/Satellite` |
| 7 | Liquid... Wen? | 2002-08-03 | Assembly 2002 Combined Demo (**1st**) | 31629 | 7130 | `hjb_liqu` |
| 8 | We Are | 2002-12-14 | State of the Art 2002 Demo (7th) | 56947 | 8281 | `hjb_we` |
| 9 | Genoaux | 2003-01-11 | Alternative Party 2003 Alt Demo (17th) | 63983 | 8528 | `hjb_geno` |

Two identity corrections the study produced: `morning.exe` is **Channel 5
Sequence**, not "Channel Zero" — "Satellite" is only the soundtrack's name; and
Genoaux is **January 2003**, not late 2002.

Draft `prod.json` bodies for all nine are in
[`triage/10-prodjson-drafts.json`](haujobb/triage/10-prodjson-drafts.json), with
every unverified field left `null` rather than guessed. Archive hashes are
deliberately absent: the local trees are *unpacked*, so nothing honest can be
hashed until `tools/fetch/originals.mjs` pins the real archives.

## Three stages, on three independent axes

The generations do **not** move together. Script grammar, audio, archiving and
GL capability each change at different releases, which is why the set looks
like nine engines until you tabulate it:

| | script `[part]` | audio | scene data | GL |
|---|---|---|---|---|
| Mikrostrange | *no script* — hardcoded ms table | BASS 0.8 (exact-version gate) | `.dat`, anonymous | 1.1 FF |
| Art | *no script* — compiled into `.text` | BASS | loose `.hjb` | 1.1 FF |
| Moments, Mosaik | 5 lines, no texture flags | fmod FSOUND 3.20 | loose `.hjb` | FF + multitexture |
| **Elements** | **6 lines** | **static MP3 decoder → `waveOut`** | **embedded ACE** | FF only, no `wglGetProcAddress` |
| Channel 5, Liquid, Genoaux | 6 lines + `[parameter]`/`[module]` | BASS (Liquid: 1.6) | embedded RAR / loose | FF + multitexture + RTT |

Elements is the hinge: it takes the new grammar but has *no sound library at
all*, and packs with a statically linked **UNACE 1.2**. Channel 5's setup
dialogs still read `"Elements - Haujobb, Copyright 2001"`, so Elements is the
literal parent of the 2002 branch.

**Three loader paths, one engine.** Loose files (Art, Moments, Mosaik,
Genoaux), embedded **RAR** read through a urarlib-style unpacker (Channel 5's
`data.rar`, Liquid's `liquid.wen`), and embedded **ACE** (Elements, We Are).
Genoaux carries the RAR loader strings while shipping loose files, so these are
alternate paths in one codebase, not forks. A port needs all three readers and
exactly one scene engine behind them.

## The formats, decoded

### `.HJB` — the scene container

A 3ds Max exporter dump: a recursive node tree whose records are named
`"Name (3dsmax-handle)"`. Read out of Moments.exe's loader in Ghidra, then
validated by parsing rather than by inspection: **251 of 252 files across all
eight `.HJB` productions consume to byte-exact EOF**, asserted by
`docs/haujobb/tools/hjb_corpus_check.py`.

```
file  : u32 word0 (0 in 252/252) · u32 nframes · node tree · -1 · u32 dead · u32 matCount · materials
node  : [ type ; body ; children… ; 0xFFFFFFFF ]      types: 0 mesh, 1 camera, 2 target, 4 omni
mesh  : name\0 · nv · verts · nf×3×{u32 idx, f32 u, v} · material groups {ngrp; matId, n, n×faceIdx}
        · pos/rot/scale tracks · visibility (i32 list, -1 terminated) · vertex-morph track
track : u32 flag (0 in 7083/7083) · u32 nkeys · keys
key   : { i32 frame ; f32 tension, continuity, bias, unused, unused ; value }
```

| track | stride |
|---|---|
| position, scale | 36 B |
| rotation | 40 B — quaternion, component order **(w, x, y, z)** |
| float (FOV, roll) | 28 B |
| morph | 28 B header + nv×12 per frame (baked full-mesh vertex snapshots) |

Interpolation is **Kochanek-Bartels tangents computed at load**, then cubic
Hermite at runtime with clamp/hold ends; quaternions by 3-level de-Casteljau
slerp. Scale-track times are in **ticks = frame × 160** (30 fps Max ticks).

Two population facts that change how this gets ported, both from counting
rather than sampling:

- **Every TCB float in every multi-key track is 0.0** — across all 4,057
  multi-key tracks (2,112 position/scale, 1,945 rotation) in all 252 files. The
  shipped data never exercises the TCB machinery; it all runs the
  Catmull-Rom-like path. All 1,945 rotation keys are unit quaternions.
- **1-key tracks hold exporter garbage in their TCB slots**, and the engine
  provably skips them with an `n == 1` early-out. A parser that trusted those
  bytes would corrupt exactly the tracks that look simplest. Implement the
  early-out, not the bytes.

### `.OB3` — geometry

Tiny and fully specified, verified by arithmetic against the file size:

```
u16 nverts · u16 nfaces · nverts × 3×s16 · nfaces × 10×s16 { v0,v1,v2, mat, 3×(u,v)/256 }   (V flipped)
```

`STAR.OB3`: `4 + 72 + 120 = 196` bytes = the file, exactly.

### `.3do` — Moments only

`{ u32 nv, nf; nv×12 f32; nf×36 corner }` — `8 + 12·614 + 36·1224 = 51440`, the
file size to the byte.

### `.dat` / `.cfg` — Mikrostrange only

The predecessor. Anonymous byte-packed records prefixed `00 FF`, **no name
strings at all**, and keys that store **baked in/out Hermite tangents** rather
than TCB — vector key 40 B `{f32 inTan[3], i32 time, f32 value[3], f32
outTan[3]}`, quat 52 B, scalar 16 B. Same evaluation model as `.hjb`, different
serialization: cynic rewrote the format and kept the mathematics. `flare.cfg`
configures only the lens flare (and declares 12 flares while shipping 15).

### `script.txt` — the show language

Recovered from Genoaux's parser, not from the files. Sections are matched by
substring on lowercased lines: `[module] [mp3] [textures] [scenes] [parameter]
[part] [addpart] [addeffect]`.

| section | lines | semantics |
|---|---|---|
| `[mp3]` / `[module]` | 2 | file (or `nosound`); **start offset in seconds** |
| `[textures]` | n | `name [fullscreen\|nomipmap\|grayscale]`; else `gluBuild2DMipmaps` |
| `[scenes]` | n | preload `data\`+name |
| `[parameter]` | 1 | `rendertexturesize` / `renderfullscreen` — sticky, stamps all later parts |
| `[part]` | 6 | scene (`standard`=none) / **absolute end-time ms** / int param added to the scene clock / camera name / overlay drawn ortho **before** / overlay **after** |
| `[addpart]` | 3 | scene / param / camera — chained onto the current part |
| `[addeffect]` | 5 | effect / texture / p1 time-offset ms / p2 speed / p3; phase = `(p1+t)·p2/30` |

Clock is BASS byte-position ÷ 176.4, resynced every 10 s — so a port that plays
the music live is sync-locked by construction, as with `lost vegas`.

### The effect table — this *is* the runtime

Recovered complete from the registry and its switch. Sixteen effects:

```
1  droid1        5  oscope          9  gridtunnel     13 griddistord3
2  droid2        6  render2texture  10 gridinterf     14 griddistord4
3  droid3        7  gridplane       11 griddistord1   15 griddistord5
4  tunnel        8  gridtunnel2     12 griddistord2   20 gridvemputus1
```

`render2texture` is `glCopyTexSubImage2D` at a hardcoded 512×256 plus a colour
clear. Elements knows only `tunnel` + `droid1-3`; the 2002 branch knows all
sixteen. **This list is the scope of a shared runtime.**

## Rendering: fixed-function, all nine

The one genuine risk was Liquid — Assembly 2002 winner, "geforce3" in its
infofile, the register-combiner era. The complete inventory says no: the only
`wglGetProcAddress` names anywhere are `glActiveTextureARB`,
`glClientActiveTextureARB` and the `glMultiTexCoord*ARB` set. **Zero** `NV_`,
`EXT_`, `ATI_`, register-combiner or vertex-program strings, and no
`GL_EXTENSIONS` query at all. "geforce3" was advice, not a dependency.

So the target is **GL 1.1 + `ARB_multitexture` + `glCopyTexSubImage2D`** — an
ordinary WebGL2 emulation job, and one this repo has already done twice
(`minigl`, `minid3d7`). **No shader path is required for any production.**

## One data directory, never re-exported

The reuse is not stylistic, it is byte-level:

- `STAR.OB3` is **sha256-identical across five productions** — Genoaux, Liquid,
  Channel 5, and (by CRC inside their archives) Elements and We Are.
- `Black.HJB`, dated **2001-02-08**, is byte-identical across four, and its
  material path reads `D:\Memoirs\Data\Black.bmp` — authored for the *Memoirs*
  tree and shipped unchanged for 22 months.
- `ijl11.dll` is byte-identical in all seven productions that ship it;
  one `BASS.DLL` build spans four; `fmod.dll` is shared by Moments and Mosaik.
- Build trees left in the binaries: `C:\GreenPill2\` (We Are, 59 paths),
  `C:\Genouax\Data\` (Genoaux, misspelled), `D:\Textures\` (Moments, Mosaik).
- `morning.exe` and `Genoaux.exe` are the **same 425,984 bytes, ~76% identical**.

This is why the format never drifted: one accreting data directory, carried
forward release after release.

## The runtime, so far

`shared/haujobb/` holds the reading layer, shared by construction rather than by
refactoring — see its [README](haujobb/../../shared/haujobb/README.md).

| module | status |
|---|---|
| `js/hjb.js` | `.HJB` scenes — **252/252 agree with the Python oracle** |
| `js/ob3.js` | `.OB3` geometry — size assertion holds (`4 + 72 + 120 = 196`) |
| `js/script.js` | `script.txt`, both generations — **8/8 scripts parse, zero warnings** |

The script reader independently reproduces the per-production counts the triage
agents derived separately: We Are 273 parts / 375 `[addpart]` / 19 effects,
Elements 94 / 54 / 1, Liquid's two-script structure, Channel 5's 92 parts. The
generation split it detects is 2 × 2000 and 6 × 2002, matching the table above,
and no script anywhere uses an effect name or texture flag outside the recovered
registry — so that registry is complete.

Not yet written: the 16 effect drawers and the GL-over-WebGL2 layer. Those are
what the draw-stream oracle exists to check.

## What this means for porting

**Shared, build once:**

1. `.HJB` reader + node tree + the TCB/Hermite/squad evaluator
2. `.OB3` reader (+ `.3do` for Moments)
3. `script.txt` parser and the part/addpart/addeffect scheduler
4. the 16-effect runtime
5. a GL 1.1 + multitexture + copy-tex-sub-image layer over WebGL2
6. three container readers: loose, RAR, ACE
7. BASS-style clock: byte-position ÷ 176.4, 10 s resync

**Per production, genuinely:** the assets (all baseline or progressive JPEG —
browser-native either way), the script, and the timeline.

**The exception that must not be missed.** Three productions **do not keep
their timeline in the script**:

- **Mikrostrange** — no script at all; a hardcoded 11-entry ms table.
- **Art** — the whole sequence compiled into `.text`.
- **Moments** — `script.txt`'s `[part]` number is *parsed and never read back*.
  The real timing is a hardcoded 21-double table of absolute seconds
  (+0.1857 s offset) on a `GetTickCount` clock, `frame = (t − start) × 30.0`,
  no music resync.

Porting Moments from its script alone yields a plausible, wrong show. Each of
these three needs its table extracted from the binary.

### Suggested parallel order

1. **Genoaux first, alone.** Six scenes, nine textures, every format decoded,
   and it exercises the full 2002 grammar. It is the smallest complete proof of
   the shared runtime — and the natural first oracle target.
2. **Then fan out across the 2002 branch** — Channel 5, Liquid, We Are — which
   reuse that runtime unchanged. Liquid adds a second script and an XM part;
   We Are is the largest show (273 parts, 310 s, a cut every ~1.1 s).
3. **Elements** next: same grammar, but needs the ACE reader and `waveOut`-era
   audio handling.
4. **Moments and Mosaik** with the 5-line grammar variant — and Moments' hardcoded
   timing table.
5. **Art and Mikrostrange** last. Art needs its compiled-in sequence recovered;
   Mikrostrange needs a second, smaller reader for `.dat` and is the only
   production whose engine is genuinely separate. Both are small (2/5).

## Open questions

- ~~Two independent `.HJB` parsers disagree.~~ **RESOLVED 2026-08-20.** Both were
  run over one 252-file corpus (every `.HJB` on the machine, all eight
  productions). The disagreement is **one-directional**: `hjb_exact.py` parses
  251/252 byte-exact and `parse_hjb_v2.py` fails 47 of those, while passing
  *none* that `hjb_exact.py` fails. Every one of the 47 is a read past
  end-of-buffer — several at exactly the file length — i.e. a loop-termination
  bug in v2's node walk, **not a rival reading of the format**. `hjb_exact.py`
  is the reader; `hjb_corpus_check.py` now asserts the whole corpus and has been
  seen to fail. The single remaining non-exact file is below.
- **`Strain3D.HJB` (Elements) leaves 24 bytes unconsumed** — the sole non-exact
  file in 252. The residue is all zeros and so are the 32 bytes before it, so no
  information is lost, and 158 of the other 159 `nmat == 1` files parse exact, so
  it is not a material-count bug. Open: whether `elements.exe` reads them at all.
  Named explicitly in `hjb_corpus_check.py` rather than absorbed by a fuzzy rule.
- Effect *drawer* internals (the 16 effects' actual geometry) are not yet read.
- `[addeffect]` p3's meaning is stored but unverified.
- Track `flag` and file `word0` have no observed non-zero value and no located
  consumer — likely dead, unproven.
- Mikrostrange's `.dat` decode is validated by parsing but not yet against a
  reference capture.
- Archive SHA-256s for all nine are unpinned (local trees are unpacked).

## Oracles — both complete

Two independent oracles now exist, and a reimplementation can be checked against
each without running the other.

**1. The scene-format oracle.** `docs/haujobb/tools/hjb_exact.py`, derived from
Moments.exe's loader, parses **251 of 252 `.HJB` files** across all eight
productions to byte-exact EOF. `hjb_corpus_check.py` asserts the corpus — exit 1
on regression, 1 on a corpus too small to mean anything, 77 when absent — and has
been seen to fail against a deliberately sabotaged key stride.

**2. The draw-stream oracle.** `tools/winebox/` runs the original Win32 binary and
records the GL calls it makes, then renders them as a per-frame draw stream. This
is the Planet Potion technique with its cheaper half doing the work: not "execute
the pure subsystems" — little here is pure, since the assets are files — but
**"the library calls are the output."** Wine is already the recorder
(`WINEDEBUG=+opengl`), so no stub had to be built.

- `--platform linux/386` runs on Apple Silicon; Wine 8.0 executes the 32-bit PE.
- Genoaux yields **833,807 GL calls over 1,118 frames**, with full arguments.
- **Time is an input**, two ways. Cheaply, via `Script.txt`'s `[mp3]` start
  offset — the original's own seek path, no build — once ALSA has a null device
  so BASS opens. Exactly, via a **stub `BASS.DLL`** (`tools/winebox/bassstub/`)
  that scripts `BASS_ChannelGetPosition` and also hooks `GetTickCount`, since
  this engine runs on two clocks. With both pinned, two independent runs give
  **161,833 calls over 29 frames with byte-identical GL streams** — a frame is
  now addressed by position rather than sampled from a moving show.
- The seek is confirmed against the script's own part table: crossing the
  144.1 s boundary collapses display lists **51×**, exactly as the two-part
  script predicts.

What this buys is what it bought Planet Potion: a reimplementation that emits the
same primitives is right for reasons you can point at, and one that does not can
be diffed frame by frame, offline, before a pixel is rasterised.

**Known limits, stated plainly.** Rendering is llvmpipe software with no GPU, so
nothing timing-dependent should be read from these runs. The stub's argument
widths are measured for **Genoaux**; each sibling's call sites must be scanned
before reusing it there, and the `BASS_GetVersion` gate differs per production
(Genoaux `cmp eax,0x80000` = 0.8; Liquid demands 1.6). Moments and Mosaik use
**fmod**, not BASS, so they need the equivalent stub against `fmod.dll`. The
apparatus is Docker-only — like `ppcbox.sh`, anything that cannot run must exit
**77 — absent** rather than pass silently.

---

*Triage by ten parallel agents, 2026-08-19. All original code, design, music and
artwork remain the work — and the credit — of Haujobb and their credited
authors.*
