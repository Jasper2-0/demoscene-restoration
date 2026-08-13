# Lapsus (Mature Furk, Assembly 2000) — reverse-engineering notes

- demozoo: https://demozoo.org/productions/24439/
- pouet: https://www.pouet.net/prod.php?which=130
- original: originals/maturefurk/lapsus_by_maturefurk.zip (pinned in prod.json;
  the second scene.org variant `lapsus_b.zip` is info-files only: readme +
  zepoinfo.txt)
- readme: "jesus, they're back." — "100% hobby production made in 3 days".
  code petri mikko · 2d timo · 3d janne eetu juha · music radix (mikko mix).
  "opengl. geforce or something like that. 500-700mhz strongly recommended."

## Triage (2026-08-13) — first pass, asset access CONFIRMED

Release contents: `Lapsus.exe` (430,080 B, **plain PE32 — not packed**),
`Lapsus.dat` (10,087,965 B), `fmod.dll` (UPX), `glut32.dll`, readme, scene.org.

**`Lapsus.dat` is an ordinary ZIP** (`PK\x03\x04` at offset 0). 196 files,
14.9 MB uncompressed, all standard formats. Repeatable extraction:
`node productions/lapsus/work/unpack.mjs` → `unpacked/lapsus_dat/` +
`MANIFEST.sha256` (`--verify` to re-check).

| what | count | notes |
|---|---|---|
| `data/*.lws` | 23 | LightWave Scene **v3, text** — full keyframe envelopes, per-channel keys, `LoadObjectLayer` refs into `lwo/` |
| `data/lwo/*.lwo` | 50 | LightWave Object (binary IFF) |
| `data/lwo/textures/*` + `data/pics/` | 98 jpg + 9 tga | textures |
| `data/particles/tauno/epes000..041.jpg` | 42 | 32×32 sprite-animation frames |
| `data/hairs/*.txt` | 6 | text data (hair/strand definitions — to parse) |
| `data/mjuusik/*.mp3` | 2 | the soundtrack |

## What the exe tells us (strings only so far — no Ghidra yet)

- Imports: KERNEL32, USER32, OPENGL32, `glut32.dll`, `fmod.dll`. Fixed-function
  **OpenGL 1.x via GLUT** — same API family as ptct, so the minigl shim line
  of work applies directly.
- FMOD surface is tiny: `FSOUND_Init/SetBufferSize/Sample_LoadMpegMemory/
  PlaySound/StopSound/Close`. It loads the MP3 **from memory** and plays it —
  in a browser this is one `<audio>` element; timeline sync rides the audio
  clock as usual (METHOD.md §7).
- The exe carries the show's part list as literal `data/<Name>.lws` strings:
  Diskojea, Hairball, Hedi, HigherBiing, Hulluolli, Kaivoalieni, Kartonki,
  Kieku, Krediili, Kuubiotekniikka, Made, Mela, … — cross-reference against
  the 23 .lws files and recover the play order + per-part effect code next.

## Why this one is different

Everything previous was procedural 64k reconstruction. Lapsus is an
asset-driven demo: the recoverable unknowns are the **player** — LWS
interpretation (which envelope channels, what interpolation), per-part GL
state/effects, particle behavior (tauno sprites), the hair system, and the
part sequencing/sync. The assets themselves need no reconstruction, only
parsers: LWO/IFF and LWS are publicly documented formats; JPG/TGA/MP3 are
browser-native (TGA needs a tiny loader).

## Ghidra pass (2026-08-13)

Ghidra 12.1.2 headless (install: `~/tools/ghidra_12.1.2_PUBLIC`, JDK 21 at
`~/tools/jdk-21*`): 2,062 functions → `re/decompiled.c` + paired
`re/disasm.asm` (canonical scripts in `tools/ghidra/`).

- `re/x87_audit.md`: **42 functions flagged** by `tools/x87-audit.mjs` — the
  automated "decompiler dropped the float math" cross-check. Verified real on
  `FUN_0043fcd0`: C shows `"%f %f %f %f"` calls with NO arguments; the asm
  FLD/FSTPs four floats per call. Treat DROPPED entries as un-ported until
  their asm is read. (Some flags are MSVC CRT float helpers — known noise.)
- The engine calls itself **dm2000** (fake argv in `FUN_0040b050`, the
  window/init class at 0x40b050). GLUT callbacks: display `0x40b820`,
  reshape `0x40b870`, idle `0x40b8a0`. Fullscreen via
  `glutGameModeString("%dx%d:%d@%d")` + `glutEnterGameMode`.
- `GL_ARB_multitexture` resolved via `wglGetProcAddress` (glMultiTexCoord*).
- **One C++ class per part**: each part function `operator_new`'s its object
  (e.g. 0x100 bytes for Diskojea) and builds a std::string of its
  `data/<Name>.lws` path. The part table / sequencing that instantiates them
  in order is the next target.

## Engine recovered (2026-08-13) — see `re/ENGINE.md`

The whole sequencing model is out, and the exe ships **full MSVC RTTI** (108
mangled class names), so every class has its real name: `Demo`, `DemoPart`,
`Part_<Name>`, `Music`, `Timer`, `FadeIn/FadeOut/RandomFadeIn/RandomFadeOut`,
`LW::Scene`, `LW::TextureManager`. That is an enormous head start — no
guessing at class boundaries.

- **Timeline is hardcoded**, not scripted: `Demo::loadPhase` (0x402860)
  builds two literal schedules of 0x20-byte entries
  `{partIndex, start, duration, localTime, fadeIn*, fadeInDur, fadeOut*,
  fadeOutDur}`. Full play order + fades in ENGINE.md §5.
- **Clock is QPC wall time**, reset right after each `FSOUND_PlaySound`; FMOD
  is never queried for position. Per-phase time ≈ time since that half's MP3
  started — which is exactly what the capture alignment measured.
- **Independent confirmation**: the hard exit constant at 0x45a324 is
  **112.0 s**, and the capture gives 219.1 − 106.96 = **112.14 s**. Static
  analysis and the audio-aligned capture agree without either being fitted to
  the other.
- **Mid-demo loader**: `Part_LoadPart2` (draws pics/loading2.jpg) stays
  current past its 1.5 s duration; at localTime 2.5 it calls `loadPhase(2)`,
  which destroys phase-1 parts + the TextureManager, loads the phase-2 scenes
  (~5 s, screen frozen, mp3#1 still playing), then StopSound → play mp3#2 →
  reset clock. Matches the two-halves structure Jasper described.
- **Dead content**: `Part_Mela`, `Part_Sittis`, `Part_Kieku`,
  `Part_StartPart2` are registered but never scheduled — so `mela.lws`,
  `sittis.lws`, `kieku.lws` ship unused. (Resolves the 23-scenes-vs-21-
  factories discrepancy from LWS_INVENTORY.md; `pehko` is scheduled and
  `flu2` is its own part.)
- The 0x45c688 records were **MSVC RTTI**, not a part registry — hypothesis
  killed. Nothing sequencing-related runs at CRT init.

## First static frame (2026-08-13) — transform chain VERIFIED

`node productions/lapsus/work/verify/frame.mjs hulluolli 4.8` renders one
frame and montages it against the capture. The jester statue matches the
reference in **silhouette, framing, scale, orientation and pose**, which
validates the whole transform chain at once:

- `fovX = 2·atan(1/zoom)` with `fovY = 0.75·fovX` **as an angle** (34.7° here)
- `local = T · Ry(h) · Rx(p) · Rz(b)`, `world = local · parentWorld`
- `modelview = Scale(1,1,−1) · inverse(cameraWorld) · objectWorld` with
  `frontFace(CW)`
- near = 1.0, far = 100.0

**Textures added the same day** and the frame now matches the capture closely:
statue, background colonnade, tone and framing all read correctly. Texture
coordinates are *computed*, not read — see `LWO_INVENTORY.md`: most objects
carry no TXUV map, only a projection + axis + size + centre. Surfaces with
`LUMI 1.0` are drawn unlit per RENDER.md §8, which is right because several
textures are pre-rendered views of the object with the lighting already baked
in.

### Background mapping — SOLVED 2026-08-13, see `RENDER.md` §10

The texgen was read out of the asm (`FUN_0042b0c0` @0x42b0c0 dispatches a jump
table at 0x42b128 to four x87 workers). dm2000 **does** implement cylindrical,
but its U is the **negative** of LightWave's and phased on the projection
axis' +Z rather than the texture centre:

```
PROJ 1, AXIS 1:  u = −WRPW · atan2(x − CNTR.x, z − CNTR.z) / (2π)
                 v = 0.5 − (y − CNTR.y) / SIZE.y
```

Mirror + half-texture shift — which is precisely a shape change no wrap
multiplier can undo. Verified against the capture: predicted column positions
land within 5 px of the reference's, background-profile correlation **0.971**
(the textbook formula scores **−0.443**), and no extra U offset improves it.
Full per-mode formulas, the `BLOK` field layout and the uv1 answer are in
`RENDER.md` §10. The measurements below stand as the record of *how* it was
cornered — note in particular that the "top 110 px" strip used there is **not**
pure background in this frame (the jester's hat fills it), which is why that
correlation ceiling sat at 0.75.

### Background mapping is NOT solved — measured, not guessed (superseded)

Jasper flagged the backdrop tiling. Quantified by cross-correlating the
horizontal intensity profile of the top 110 px (pure background) of our frame
against the reference:

- best fit under a pure scale+shift is **×1.11 and 14 px**, and even there the
  correlation only reaches **0.754**;
- sweeping the cylindrical wrap multiplier gives 0.348 / 0.540 / 0.647 /
  0.668 / **0.710** / 0.698 for 1.80 / 1.91 / 2.00 / 2.02 / 2.14 / 2.25
  repeats across the backdrop.

So the correlation plateaus near 0.70 for *every* wrap value: **no tiling
factor fixes it**, and the tempting round number (exactly 2.0 repeats) is
actually worse than what we ship. The mapping's shape is wrong, not its
scale.

**The LWO data is complete and does not explain it.** Every projection
parameter was dumped with values (`naamiotaus.lwo`, sole BLOK):

| chunk | value | meaning |
|---|---|---|
| `PROJ` | 1 | cylindrical |
| `AXIS` | 1 | about Y |
| `CNTR` | (0, 5, −100) | projection centre |
| `SIZE` | (125, 100, 15.74) | projection extent |
| `ROTA` | (0, 0, 0) | **no** projection rotation |
| `CSYS` | 0 | **object** coordinates, not world |
| `WRAP` | Repeat / Repeat | tiles on both axes |
| `WRPW` / `WRPH` | 5 / 1 | wrap counts |

Nothing is missing or ambiguous, and nothing there is a hidden shape
parameter: `ROTA` is zero so the projection is unrotated, `CSYS` is object
space which is what we use, and `WRAP` is Repeat which is what we bind.
(Watch out: dumping `WRAP`'s 4 bytes through a float formatter prints
"0.0000" and reads as `Reset` — it is two u16s, and it is `1/1`.)

Conclusion: rendering the data faithfully by LightWave's own cylindrical
rules does **not** reproduce the capture, so **dm2000 does not implement
LightWave cylindrical projection faithfully**. That makes this a question
about the engine, not about the assets, and it is only answerable by reading
its texgen — which RENDER.md lists as unread. The origin-pivot currently in
`main.js` is an empirical stand-in that looks closer; it is not derived and
should be replaced by whatever the disassembly says.

`?wmul=` on the renderer scales the cylindrical wrap for sweeps like this one.

### Open: the reference leads our render, but not by a constant

Jasper spotted that the object's rotation in `pene` is slightly ahead in the
capture. Confirmed by sweeping our render time against a fixed reference
frame and correlating whole-frame luma:

| nominal local t | best-matching render t | offset | corr at peak |
|---:|---:|---:|---:|
| 2.0 | 2.6 | **+0.60** | 0.962 |
| 4.0 | 4.4 | **+0.40** | 0.953 |
| 6.0 | 6.0 | **+0.00** | 0.964 |

(at t=4 the peak is pronounced: 0.907 at +0.0 rising to 0.953 at +0.4.)

So there IS a discrepancy, but it is **not a constant clock offset** — and it
is not drift either: ENGINE.md's independent check has phase 2 running
112.14 s in the capture against the binary's hardcoded 112.0 s exit, i.e. the
two clocks agree to 0.12 % over 112 seconds. A rate error large enough to
explain 0.6 s over a few seconds would have shown up there as many seconds.

Candidates, in the order worth testing:

1. **The estimator is noisy for this content.** `pene` is a semi-transparent
   object over a static backdrop that dominates the frame, so whole-frame
   luma correlation is mostly measuring the (time-invariant) backdrop and
   only weakly the rotation. A sharper probe — silhouette centroid or edge
   position, measured on the object region only, with the backdrop masked
   out — would give a far better-conditioned peak.
2. **Frame quantisation in the capture.** The demo free-runs (idle callback
   re-renders continuously) while the capture is a fixed-rate video, so any
   single reference frame is the demo's state at an arbitrary sub-frame
   instant.
3. **A genuine per-part time origin difference**, e.g. a part whose local
   clock does not start exactly at its scheduled boundary.

Do not "fix" this by adding a fudge to the frame harness: an offset that
varies with t cannot be a constant, and fitting one would hide whichever of
the above is real.

Still open on this frame: the object is slightly lighter than the reference
with softer detail (the reflection/material path), and the reference is
slightly warmer/higher contrast. Candidates
are a sub-frame time offset (the demo is free-running, so the capture's frame
is not exactly at t=4.8), and the fact that no lighting, fog or fader is
implemented yet. Worth settling with a small time sweep before assuming a
transform error.

Two format facts cost a debugging round each and are now in
`LWS_INVENTORY.md`: **cameras carry 6 motion channels, not 9**, and
**`ParentItem` is a hex item ID**. Both fail *silently* into something that
looks like a different bug.

Also: the schedule in `ENGINE.md` was independently confirmed against the
capture with ffmpeg scene detection. Detected cuts at 61.43 / 70.95 / 99.53 s
match predicted part boundaries at 61.41 / 70.94 / 99.53, and 147.97 matches
HigherBiing's internal camera cut at 148.16. The boundaries that went
undetected are precisely those with slow black fades rather than the fast
white ones — so the schedule, the 6.41 s audio alignment and the fade table
all corroborate each other.

## Next steps

1. Textures + materials: LWO `SURF`/`BLOK` → GL state per `RENDER.md` §8
   (RGBA8, REPEAT, `LINEAR_MIPMAP_NEAREST`, no row flip, alpha from the
   separate `_a` image, unit-1 env `GL_ADD`).
2. Per-part draw functions (the `vf2` of each factory) and `LW::Scene`
   rendering internals — several sit near x87-audit SUSPECT entries, so read
   `disasm.asm` for those rather than the C.
2. LWO (binary IFF) parser — `work/js/lws.mjs` already covers the scenes.
3. Fader material modes 1/3 blend semantics (ENGINE.md §6).
4. `data/hairs/*.txt` + the tauno particle system formats.
2. LWS parser first (text; small), render one scene's camera + object motion
   against a stub renderer; LWO parser second.
3. ~~Reference capture~~ DONE: youtube oP3lrBNVKBs pinned (219.1 s). Jasper:
   **the two MP3s play in order; there is a loading part in the middle.**
   10 ms log-energy correlation against the capture: mp3#1 starts at
   **6.41 s** (score 0.81), mp3#2 at **106.96 s** (score 0.88). mp3#1 is cut
   before its natural end (would reach 117.4 s) — consistent with
   `FSOUND_StopSound` in the imports; the capture ends at 219.1 s, ~7 s
   before mp3#2 would finish. Part 1 ≈ 0–107 s, part 2 ≈ 107–219 s.
4. Hair `.txt` + `epes` particle sprites: parse formats after the Ghidra pass
   shows the consuming code.
