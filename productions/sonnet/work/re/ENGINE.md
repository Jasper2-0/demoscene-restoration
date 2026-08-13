# Sonnet — engine architecture (from the rebuilt PE decompile)

Artifacts: `unpacked/sonnet_u.exe` (rebuilt, loads in Ghidra with named imports),
`ghidra/proj` (Ghidra project "sonnet", 392 functions), `re/out/sonnet.c` (full
decompile, 1 failure), `re/out/timeline.txt` (decoded demo script).

## Entry / main

```
entry @0x4042d3            ExitProcess(main())
main  @0x4160ff
    FUN_004014ef(0x280,0x1e0)     init(640,480)   -> window + D3D8 + generators
    obj = FUN_00402d46(new 0x10)  the SCENE MANAGER object
    FUN_00402e4e(obj)             build/register objects
    FUN_00402d87(obj, 0xffff)     run all init events (time == 0xffff)
    FUN_00403039()                audio init (44100 = 0xac44, 1 MB buffer)
    FUN_004030ba(0)               start playback at position 0
    while (!done) {
        FUN_00402d87(obj, 0)      run events up to now, then RENDER
        FUN_0040149b()            pump window messages
        if (FUN_004030ef() > 0x2c0f) done = 1
    }
```

**The demo is driven entirely by music position** (same as Lost Vegas). Position comes
from `FUN_004030ef` = `(hi(FUN_0041009a) << 8) | FUN_004100ba` on the MiniFMOD player
handle `DAT_004748b4` — i.e. **`(order << 8) | row`**, identical encoding to Lost Vegas.
End of demo = position **0x2c0f** (order 44, row 15).

### Clock CONFIRMED by three independent sources

vic's original soundtrack was released publicly (scene.org "demodulate" compilation) and
is at `reference/sonnet.xm`. Its real header: **45 orders (0..44), 26 channels,
43 patterns, 24 instruments, linear frequencies, speed 6, BPM 92** ⇒ a row lasts
`6 × 2.5 / 92 = 0.1630 s`.

- Timeline VM's terminating position 0x2c0f = order 44 (the song's **last** order), row 15
- `(44×64 + 15) × 0.1630 s` = **461.6 s**
- Reference video capture = **464.07 s**

Agreement within ~2.5 s (lead-in/tail). So: the `(order<<8)|row` decode is right, the
intro plays the **complete released song** (no edit, unlike Lost Vegas), and the music is
a sound clock we can drive the port from directly — live XM playback again gives
sample-exact sync with no offline sync map.

## The timeline VM — `FUN_00402d87(this, forcedPos)`

Two phases per call.

**1. Event dispatch.** Event table at **VA 0x41a048**, 8-byte records, time-sorted:

```
struct Event { u16 time; u8 objIndex; u8 method; f32 param; };
```

Dispatch is a *virtual call*: `objects[objIndex]->vtbl[8](method, param)`.
A cursor (`this[2]`) only moves forward, so events fire once. Called with
`forcedPos == 0xffff` at startup it runs **only** the records whose time is 0xffff —
the init/setup events. **293 events**, table VA 0x41a048..0x41a970, immediately
followed by the object-name strings `Landscape`, `Font`, `Background`, `Border`.
(Note: the "ALandscape" seen in a raw strings dump is a red herring — that `A` is the
last byte of the float 8.0 = 0x41000000.)

**2. Render.** 16 passes, `layer = 0..15`; for every object whose `+0x14` byte equals
the current layer: set up state (`FUN_0040184c`), `device->Clear(0,0,2,color,1.0f,0)`
(flags 2 = ZBUFFER only — so layers composite over each other), then
`object->vtbl[4](layer)`. So objects declare a **render layer** and the engine draws
them back-to-front with a Z clear between layers.

## Object map (from the decoded timeline)

11 objects. Method 255 is the visibility/enable toggle, and it lays the demo out exactly:

| obj | active (music pos) | role (inferred) |
|---|---|---|
| 0 | 0x0400–0x2b00 | global compositor — `m4` × 31 with 255.0/0.0 = the white flash / fade between scenes |
| 1 | 0x0000–0x2c00 | **text engine**: `m0` = show poem line N, `m1` = hide line N (62 each, N = 1..33+), `m2` × 40 = title/effect variants |
| 2 | 0x0400–0x2813 | ~~camera~~ **CORRECTED: the ragged black BORDER that frames the picture.** Its 28 `m0` values are **`srand()` seeds**, not keyframe indices. The real camera lives *inside* each Landscape (`Landscape+0x18`, 64 slots, selected by `m4`). See `re/scenes/SCENES_2_6.md`. |
| 3 | 0x0400–0x0700 | effect scene 1 |
| 4 | 0x0700–0x0a00 | effect scene 2 |
| 5 | 0x0a00–0x0f00 | effect scene 3 |
| 6 | 0x0f00–0x1200 | effect scene 4 |
| 7 | 0x1200–0x1700 | effect scene 5 |
| 8 | 0x1700–0x1e00 | effect scene 6 |
| 9 | 0x1e00–0x2300 | effect scene 7 |
| 10 | 0x2300–0x2b00 | effect scene 8 |

**8 effect scenes = 2 per season** ("4 seasons in 64k"). Scene handover is always a
clean pair at one timestamp (`obj N -> 0`, `obj N+1 -> 1`).

### The four embedded names ARE the class table (confirmed 2026-08-05)

The class-id array at **VA 0x41a038** is `[1, 2, 0, 3, 3, 3, 3, 3, 3, 3, 3]` — one entry
per object. Matched against the four names stored after the event table (in reverse class
order), every object's role falls out:

| class | name | objects | role |
|---|---|---|---|
| 0 | **Border** | 2 | the ragged black frame around the picture |
| 1 | **Background** | 0 | the fade-to-black compositor |
| 2 | **Font** | 1 | the poem |
| 3 | **Landscape** | 3–10 | **all eight scenes are ONE shared C++ class**, differing only by their descriptor |

That last row is the important one for the port: there is no per-scene class, only one
Landscape driven by eight different descriptors (res 28–35).

Common methods across the effect objects: `m3`, `m6` (set at spawn, likely
params/geometry select), `m252` and `m254` (scalars — 254 takes 24/30/45/60/75/90,
smells like **FOV or fade duration**; 252 takes 2/3/14/15), plus one unique method each
(`m7` obj4, `m8` obj7, `m9` obj8, `m10` obj6) = per-effect tweaks.

## Confirmed elsewhere

- **No shader bytecode** anywhere in the image (vs/ps 1.x magics absent) ⇒ D3D8
  fixed-function throughout.
- API census over the whole image: exactly one call site each for the window/audio/GDI
  APIs, 3× SelectObject — everything funnels through single wrappers, easy to RE.
- Text is rasterized at runtime with GDI (`CreateFontA` "times new roman" → `TextOutA`
  → `GetDIBits`), two charsets (caps + lowercase/digits/punctuation).
- Per sagacity (original coder): the intro contains a **synth**, a **texgen**, and
  probably a **meshgen** — consistent with the image holding no stored PCM, bitmaps or
  vertex blobs.
