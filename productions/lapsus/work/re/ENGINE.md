# Lapsus engine (dm2000) — runtime sequencing, fully recovered

Everything below is verified against `re/decompiled.c`, `re/targeted1.c`
(headless re-decompile of the vtable-only functions, `ghidra/DecompileAt.java`),
raw `.rdata`/`.data` bytes of `src/Lapsus.exe` (sections identity-mapped:
file offset = VA − 0x400000), and — for the sequencer core — the raw
disassembly (ndisasm of 0x402670–0x402860). Statements marked *inference*
are not byte-verified.

The exe ships **full MSVC RTTI**, so every class has its real name. There is
no name→factory string registry and nothing is built at CRT init — the
"0x50-byte records at 0x45c688" hypothesis is **refuted**, see §8.

## 1. Class map (RTTI-verified names)

| class | vtable (.rdata) | key methods |
|---|---|---|
| `Application` | 0x45a298 | base of Demo; vf2/vf3 pure (`__purecall` 0x4301e6) |
| `Demo` | 0x45a284 | ctor `FUN_00401000`, init `FUN_00401260`, dtor-body `FUN_00402480`, **update `0x402620`**, **render `0x402670`**, **loadPhase `FUN_00402860`** |
| `DemoPart` | 0x45a318 | abstract base of the 27 part-factory objects |
| `Part_*` (24 concrete) | 0x45a364–0x45a598 | vf0=create, vf1=destroy, vf2=tick+draw (see §5) |
| `Transition` / `Fader` | 0x45a344 / 0x45a338 | fullscreen-quad fade, ctor `FUN_00404840` |
| `FadeIn` / `FadeOut` | 0x45a2d0 / 0x45a2c4 | draw `FUN_00404970` / `FUN_00404a60` |
| `RandomFadeIn` / `RandomFadeOut` | 0x45a2b8 / 0x45a2ac | flicker wrappers `0x401e00` / `0x401ea0` |
| `Music` | 0x45a350 | ctor `FUN_00404c70` (FSOUND_Sample_LoadMpegMemory), play `FUN_00405060`, stop `FUN_00405140` |
| `Timer` | 0x45a5ac | QPC clock, see §3 |
| `Display` | 0x45a5c4 | GLUT window, ctor `FUN_0040b050` |
| `Picture` | (0x45e...) | ctor `FUN_0040a700(path, archive, mode)`, draw `FUN_0040ab50` |
| `LW::Scene` | — | ctor `FUN_00414880`, tick `FUN_004150b0`, getCamera `FUN_004150a0`, render `FUN_004151e0` |
| `LW::TextureManager` | 0x45acc0 | ctor `FUN_004142e0`; global `DAT_004a9008`, also `Demo+0x68` |
| `File` | — | archive open `FUN_00409690("Lapsus.dat")` |

RTTI mechanics: each vtable is preceded by a CompleteObjectLocator pointer;
COL+0xC → TypeDescriptor in .data; TD = { vtable-of-`type_info` 0x45af4c,
spare, mangled name }. E.g. TD 0x4633b8 = `.?AVMusic@@`,
TD 0x463768 = `.?AVPart_Diskojea@@`.

## 2. Boot & callback flow

- `FUN_00404b80` @ 0x404b80 (called from WinMain wrapper `FUN_00404c10`):
  stack-allocates the `Demo` (0x8c bytes), `FUN_00401000` ctor,
  `FUN_00401260` init, `FUN_0040b800` run, `FUN_00401160` dtor.
- `Demo::init` `FUN_00401260` @ 0x401260:
  1. `FUN_0040a4a0` — builds 2×32k fast-sqrt mantissa LUT at 0x468f58.
  2. `FUN_00409690("Lapsus.dat")` — opens the ZIP archive (registers atexit
     cleanup 0x409810).
  3. `new Display(0x280, 0x1e0, fullscreen=1, "Lapsus (C) 2000 MatureFurk")`
     → `FUN_0040b050`: `glutInit` (fake argv `"dm2000"` @ 0x464320),
     `glutGameModeString("%dx%d:%d@%d")`+`glutEnterGameMode`, registers
     display=0x40b820, reshape=0x40b870, idle=0x40b8a0; resolves the 34
     `GL_ARB_multitexture` entry points; requires 2 texture units
     ("Dual texturing not supported."). Stored at `Demo+0x08`; global window
     ptr `DAT_004a8f5c`, input manager `DAT_004a8f54` (0x224 bytes,
     `FUN_0040b8e0`, registers keyboard/mouse GLUT callbacks).
  4. Constructs **all 27 part factories** with `operator new` and pushes them
     into `vector<DemoPart*>` at `Demo+0x40` (begin +0x44, end +0x48;
     push_back = `FUN_0041c5b0`). Insertion order = **part index** (§5).
  5. Constructs the six shared faders (§6) at `Demo+0x6c..0x80` and the
     pre-load `Picture("data/pics/loading.jpg")` at `Demo+0x60`.
  6. `FUN_00404ee0` — `FSOUND_SetBufferSize(20)`, `FSOUND_Init(44100, 32, 0)`.
  7. `FUN_00408950(Demo+0x28)` — Timer reset.
- `Demo::run` `FUN_0040b800` @ 0x40b800: `DAT_004a8f58 = demo;
  glutMainLoop()`.
- **display callback 0x40b820** (re-decompiled, `targeted1.c`):
  `input.beginFrame(0x40ba10)`; `ok = demo->vf2(input)` (= update 0x402620);
  `if (!ok) exit(0)` (0x4316f8); `demo->vf3()` (= render 0x402670);
  `glutSwapBuffers()`; inlined input end-frame (copies key/button state to
  prev-frame arrays, cf. `0x40ba40`).
- **reshape 0x40b870**: stores w/h into `Display+8/+0xc`,
  `glViewport(0,0,w,h)`.
- **idle 0x40b8a0**: literally `jmp 0x40b820` — idle re-renders, so the demo
  runs frame-free-running (Ghidra saw it as DAT because it's a 5-byte thunk).

## 3. Clock

`Timer` (0x14 bytes at `Demo+0x28`): `FUN_004088b0` ctor caches
`QueryPerformanceFrequency` in `DAT_00468f28/2c` (double at `DAT_00468f30`);
+0x08 64-bit start count, +0x10 last-seconds float.
`FUN_00408950` = reset(now); `FUN_004089a0(t0)` = reset + seed last-time;
`FUN_004089f0` = seconds(); `FUN_00408a30` = seconds() + delta-since-last-call.
There is **no audio-clock query** — sequencing rides this QPC clock, which is
**reset at each phase load immediately after `FSOUND_PlaySound`**
(`FUN_00402860` lines: play `FUN_00405060`, `FUN_00408950`,
`FUN_004089a0(clock, -0.02f)` — the −0.02 only seeds the first frame delta).
So per-phase time ≈ time since that phase's MP3 started.

## 4. Sequencer (Demo::render @ 0x402670, byte-verified)

Schedule = `vector<Entry>` at `Demo+0x50` (begin +0x54, end +0x58), Entry is
0x20 bytes:

| off | field |
|---|---|
| +0x00 | int partIndex (into factory vector at +0x44) |
| +0x04 | float startTime — **recomputed every frame as running sum of durations, starting at 0** |
| +0x08 | float duration (seconds) |
| +0x0c | float localTime — accumulates frame dt while current |
| +0x10 | FadeIn* (0 = none) |
| +0x14 | float fadeInDuration |
| +0x18 | FadeOut* (0 = none) |
| +0x1c | float fadeOutDuration |

Per frame: `t = timer.seconds(); dt = timer.delta()`. Current entry = **last**
entry with `start <= t` (so the final entry stays current past its duration —
load-bearing, see §7). Then:

- `factory[partIndex]->vf2(entry.localTime, dt)` — tick+draw the part;
  `entry.localTime += dt`.
- if FadeIn: `fadeIn->draw((t - start) / fadeInDur)`.
- if FadeOut: `fadeOut->draw((t - (start + dur - fadeOutDur)) / fadeOutDur)`.

If the schedule is empty or `t` is before entry 0 (never happens in practice):
clear, draw `Demo+0x60` loading.jpg picture, fade value
`clamp0((t − 0.5) * 0.5)` through the black FadeIn at `Demo+0x6c` — i.e. the
boot loading screen fades in from black between t=0.5 and t=2.5.

Tail of every frame (asm-verified):
- frame counter `Demo+0x64`++; **exactly on frame 2: `Sleep(4000)` then timer
  reset** (one-time; lets the mode switch settle behind the loading screen).
- `if (t > 3.0f  /* _DAT_0045a32c */ && phase == 0) loadPhase(1)`.
- `if (currentEntry.partIndex == 0xc /* Part_LoadPart2 */ &&
     currentEntry.localTime >= 2.5f /* _DAT_0045a328 */) loadPhase(2)`.

`Demo::update` @ 0x402620: ESC (`FUN_0040bb80(input, 0x1b)`) → quit;
`if (phase == 2 && t > 112.0f /* _DAT_0045a324 */)` → quit. Phase lives in
`DAT_00468f08` (0 = booting, 1 = first half, 2 = second half).

Shared float constants: 0x45a308 = 1/32767 (rand scale), 0x45a30c = 0.0,
0x45a310 = 1.0, 0x45a324 = 112.0, 0x45a328 = 2.5, 0x45a32c = 3.0,
0x45a330 = 0.5.

## 5. Part registry and play order

### Factory vector (insertion order in `FUN_00401260` = part index)

Factory objects are tiny (`{vtable, LW::Scene* instance=0, params...}`);
vf0 = create (loads `data/<name>.lws` from the archive into an `LW::Scene`
(0x100 bytes, `FUN_00414880`), stored at factory+4), vf1 = destroy instance
(default `FUN_00407fe0`), vf2 = tick+draw (default `FUN_00406e50`: clear
`FUN_0040b790`, `scene->tick(localTime, dt)` `FUN_004150b0`,
`render(getCamera(0))` `FUN_004151e0`). Parts with custom vf1/vf2 noted.

| idx | class | ctor | create (vf0) | loads | notes |
|---|---|---|---|---|---|
| 0 | Part_Empt | 0x405550 | 0x405570 | pics/design1.tga + design1_a.tga | custom draw 0x4057b0: rand-flickered design slides |
| 1 | Part_Flu2 | 0x405b60 | 0x405b70 | data/flu2.lws | |
| 2 | Part_HigherBiing | 0x405f80 | 0x405f90 | data/HigherBiing.lws | custom vf2 0x4060b0 |
| 3 | Part_Made | 0x406bc0 | 0x406bd0 | data/Made.lws | |
| 4 | Part_Mela | 0x406d20 | 0x406d30 | data/Mela.lws | **never scheduled** |
| 5 | Part_Pene | 0x4079c0 | 0x4079d0 | data/Pene.lws | |
| 6 | Part_Silli | 0x407c80 | 0x407ca0 | data/Silli.lws | vf1 0x407e00, vf2 0x407e30 |
| 7 | Part_Syrjakyla | 0x408030 | 0x408050 | data/Syrjakyla.lws | vf1 0x4081b0, vf2 0x4081f0 |
| 8 | Part_Turska | 0x4082c0 | 0x4082f0 | data/Turska.lws | vf1 0x408430, vf2 0x408460 |
| 9 | Part_Sittis | 0x407eb0 | 0x407ec0 | data/Sittis.lws | **never scheduled** |
| 10 | Part_Paleksi | 0x407030 | 0x407050 | data/Paleksi.lws | vf1 0x407270, vf2 0x4072b0 |
| 11 | Part_Radiosity | 0x407b20 | 0x407b30 | data/rad_out.lws | |
| 12 | Part_LoadPart2 | inline, vtbl 0x45a2fc | 0x401f50 | pics/loading2.jpg | draw 0x402290 = clear + picture; **its index (0xc) is the phase-2 trigger** |
| 13 | Part_Kaivoalieni | 0x406320 | 0x406330 | data/Kaivoalieni.lws | |
| 14 | Part_Hairball | 0x405cc0 | 0x405cd0 | data/Hairball.lws | |
| 15 | Part_Kuubiotekniikka | 0x4068c0 | 0x4068e0 | data/Kuubiotekniikka.lws | vf1 0x407e00, vf2 0x406b20 |
| 16 | Part_Morko | 0x406ec0 | 0x406ee0 | data/Morko.lws | vf1 0x407e00 |
| 17 | Part_Pehko | 0x407430 | 0x407490 | particles/tauno/tauno.txt (+ data/pehko.lws @ 0x463af4) | vf1 0x407740, vf2 0x407800 — the tauno sprite/particle part |
| 18 | Part_Kieku | 0x406600 | 0x406610 | data/Kieku.lws | **never scheduled** |
| 19 | Part_Krediili | 0x406760 | 0x406770 | data/Krediili.lws | |
| 20 | Part_Viherio | 0x4085d0 | 0x4085f0 | data/Viherio.lws | vf1 0x408750, vf2 0x4087a0 |
| 21 | Part_Kartonki | 0x4064a0 | 0x4064b0 | data/Kartonki.lws | |
| 22 | Part_Hulluolli | 0x4061c0 | 0x4061d0 | data/Hulluolli.lws | |
| 23 | Part_Hedi | 0x405e20 | 0x405e30 | data/Hedi.lws | |
| 24 | Part_Diskojea | 0x4053d0 | 0x4053e0 | data/Diskojea.lws | |
| 25 | Part_StartPart1 | inline, vtbl 0x45a2ec | 0x4020f0 | pics/loading.jpg | draw = clear + picture |
| 26 | Part_StartPart2 | inline, vtbl 0x45a2dc | 0x4022d0 | pics/loading2.jpg | **never scheduled** (leftover) |

Unused parts: **Mela, Sittis, Kieku, Part_StartPart2** — Mela.lws, Sittis.lws,
Kieku.lws exist in the archive but are dead content in the final release.

The float blobs interleaved between the vtables (0x45a380–0x45a3cf,
0x45a4b8–0x45a4fc, 0x45a560, 0x45a574, 0x45a594…) are per-part tuning
constants (e.g. Part_Empt's 3.6, π, 180.0, 1/RAND_MAX-scaled jitter), **not**
timeline data. All timeline numbers are immediates inside `FUN_00402860`.

### Play order + times (hardcoded in `Demo::loadPhase` `FUN_00402860` @ 0x402860)

Both schedules are literal stack-built Entry structs pushed in order
(`FUN_00403520` / `FUN_00403c50` = vector insert-at-end). Start times below
are the running sums the sequencer recomputes each frame; t=0 is the phase's
clock reset, which coincides with that phase's `FSOUND_PlaySound` (§3).

**Phase 1** (mp3 `data/mjuusik/1.mp3` @ 0x46339c; capture-aligned at 6.41 s):

| # | idx | part | start | dur | end | fade in | fade out |
|---|---|---|---|---|---|---|---|
| 1 | 25 | Part_StartPart1 | 0.0 | 1.0 | 1.0 | — | black 1.0 |
| 2 | 0 | Part_Empt | 1.0 | 13.0 | 14.0 | — | **RandomFadeOut** 0.7 |
| 3 | 1 | Part_Flu2 | 14.0 | 9.0 | 23.0 | black 2.0 | black 2.0 |
| 4 | 5 | Part_Pene | 23.0 | 8.0 | 31.0 | black 2.0 | black 2.0 |
| 5 | 19 | Part_Krediili | 31.0 | 16.0 | 47.0 | black 1.0 | — |
| 6 | 6 | Part_Silli | 47.0 | 8.0 | 55.0 | black 2.0 | black 2.0 |
| 7 | 7 | Part_Syrjakyla | 55.0 | 9.531 | 64.531 | **white 0.5** | black 2.0 |
| 8 | 10 | Part_Paleksi | 64.531 | 9.531 | 74.062 | **white 0.5** | black 2.0 |
| 9 | 17 | Part_Pehko | 74.062 | 9.531 | 83.593 | black 1.0 | black 1.0 |
| 10 | 22 | Part_Hulluolli | 83.593 | 9.531 | 93.124 | black 4.0 | black 4.0 |
| 11 | 12 | Part_LoadPart2 | 93.124 | 1.5 | (94.624) | white 2.0 | — |

(dur 9.531 = 0x41187efa. Entry 11 stays current past its end; at
localTime = 2.5, i.e. t ≈ 95.6, `loadPhase(2)` fires.)

**Phase 2** (mp3 `data/mjuusik/2.mp3` @ 0x463388; capture-aligned at 106.96 s):

| # | idx | part | start | dur | end | fade in | fade out |
|---|---|---|---|---|---|---|---|
| 1 | 15 | Part_Kuubiotekniikka | 0.0 | 13.8 | 13.8 | — | black 2.0 |
| 2 | 24 | Part_Diskojea | 13.8 | 8.5 | 22.3 | black 1.0 | black 1.0 |
| 3 | 21 | Part_Kartonki | 22.3 | 7.4 | 29.7 | black 1.0 | black 1.0 |
| 4 | 14 | Part_Hairball | 29.7 | 7.0 | 36.7 | black 1.0 | black 1.0 |
| 5 | 2 | Part_HigherBiing | 36.7 | 14.0 | 50.7 | black 2.0 | black 2.0 |
| 6 | 20 | Part_Viherio | 50.7 | 10.46 | 61.16 | — | black 1.0 |
| 7 | 16 | Part_Morko | 61.16 | 3.54 | 64.7 | **white 0.5** | black 0.5 |
| 8 | 8 | Part_Turska | 64.7 | 7.5 | 72.2 | black 1.0 | black 1.0 |
| 9 | 11 | Part_Radiosity | 72.2 | 14.0 | 86.2 | black 2.0 | black 2.0 |
| 10 | 13 | Part_Kaivoalieni | 86.2 | 13.5 | 99.7 | black 2.0 | black 2.0 |
| 11 | 3 | Part_Made | 99.7 | 5.5 | 105.2 | black 1.0 | black 1.0 |
| 12 | 23 | Part_Hedi | 105.2 | 3.0 | 108.2 | black 0.5 | black 2.0 |

Hard exit at phase-2 clock 112.0 (`_DAT_0045a324`). Hedi remains on screen
(faded to black from 106.2–108.2) until then. Capture cross-check: mp3#2 →
capture-end = 219.1 − 106.96 = 112.14 s ≈ 112.0. Phase-1 music span
106.96 − 6.41 = 100.55 s = 95.6 s schedule+trigger + ~5 s phase-2 load time.

## 6. Faders

Six shared fader objects built in `FUN_00401260`, each `{vtable, Material*
(0x6c bytes, `FUN_00404840`), r, g, b}` with material mode at mat+0x58:

| Demo off | class / vtable | mode / color | used as |
|---|---|---|---|
| +0x6c | FadeIn 0x45a2d0 | 3, black | "black N" fade-ins; also boot loading-screen fade |
| +0x70 | FadeOut 0x45a2c4 | 3, black | all "black N" fade-outs |
| +0x74 | FadeIn 0x45a2d0 | 1, 255.0 (white) | "white 0.5" flash-ins (Syrjakyla, Paleksi, Morko, LoadPart2) |
| +0x78 | FadeOut 0x45a2c4 | 1, white | **never used** |
| +0x7c | RandomFadeIn 0x45a2b8 | 3, black | **never used** |
| +0x80 | RandomFadeOut 0x45a2ac | 3, black | Part_Empt's 0.7 s flicker-out |

Draw semantics (`FUN_00404970` FadeIn / `FUN_00404a60` FadeOut, both:
ortho 640×480 `FUN_0040b740`, material apply `FUN_0040c060`, one GL_QUADS
fullscreen quad; clamp01):
- FadeIn early-outs at v ≥ 1 (done); FadeOut early-outs at v ≤ 0 (not yet).
- mode 3: writes v (FadeIn) / 1−v (FadeOut) into material alpha (+0x38) —
  *inference:* mode 3 material = multiplicative blend, so alpha 0 = black
  screen, 1 = untouched → fade from/to black.
- mode 1: scales the RGB color by 1−v (FadeIn) / v (FadeOut) — *inference:*
  additive blend → white flash decaying / rising.
- RandomFade*: `if rand()/32767 <= v then draw(1.0) else draw(v)` —
  per-frame flicker between "done" and the ramp (0x401e00 / 0x401ea0).

## 7. Boot, mid-demo loader, music — full lifecycle

1. **Boot (phase 0)**: schedule empty → every frame draws
   `data/pics/loading.jpg` (Demo+0x60). Frame 2: `Sleep(4000)` + clock reset.
   Loading pic fades in from black t=0.5→2.5.
2. **t > 3.0 → `loadPhase(1)`** (`FUN_00402860`, synchronous, screen frozen):
   - replaces the global `LW::TextureManager` (`DAT_004a9008`, Demo+0x68) —
     old one deleted with all its GL textures, fresh one created;
   - calls vf1 (destroy) on **all 27 factories** (no-ops first time);
   - clears + rebuilds the schedule vector (phase-1 table above);
   - walks the schedule and calls vf0 (create) **once per unique part**
     (dedup via a std::set-like tree, `FUN_004042f0`/`FUN_00403a30`/
     `FUN_00403710`) — this loads every phase-1 .lws/.lwo/texture;
   - stops+frees the old `Music` (none yet), then
     `Music("data/mjuusik/1.mp3")` — whole file read from the ZIP, decoded
     via `FSOUND_Sample_LoadMpegMemory(FSOUND_FREE, buf, 0x29, len)`;
   - `FSOUND_PlaySound` (`FUN_00405060`), **timer reset** → phase-1 t=0.
3. **First half plays** 0→93.1 s; last entry Part_LoadPart2 draws
   `pics/loading2.jpg`.
4. **Mid-demo loader**: Part_LoadPart2 stays current past its 1.5 s duration;
   when its localTime hits 2.5 → `loadPhase(2)`: same procedure — all phase-1
   scene objects and textures destroyed (vf1 on every factory + new
   TextureManager), phase-2 parts loaded (~5 s wall, display frozen on
   loading2.jpg, **mp3#1 still playing**), then mp3#1 stopped
   (`FSOUND_StopSound`), `Music("data/mjuusik/2.mp3")` played, timer reset.
5. **Second half plays** 0→108.2 s; `Demo::update` exits the process at
   t > 112.0. (mp3#2 would run ~7 s longer — the exe cuts it, matching the
   capture.)
6. Teardown `FUN_00402480`: delete factories (via `DemoPart` vf1+delete),
   stop/free music, `FSOUND_Close`, delete faders/pictures/display.

## 8. The 0x45c688 records: MSVC RTTI, not a part registry

The "0x50-byte records at 0x45c688" are **RTTI CompleteObjectLocator /
ClassHierarchyDescriptor / BaseClassDescriptor clusters** that MSVC emits per
class at roughly 0x50-byte pitch here (COL 0x45c688 belongs to `Music`). The
".data static objects at 0x4633b8, 0x463768, … with vtable 0x45af4c" are
`type_info` instances (TypeDescriptors): 0x45af4c is `type_info`'s vtable;
the bytes after each pointer are the mangled names (`.?AVMusic@@`,
`.?AVPart_Diskojea@@`, …). The flags 0x1/0xffffffff and "next" pointers are
BCD attribute/PMD fields. Nothing runs at CRT init except normal static-init;
the part list is built imperatively in `Demo::init` (§2.4) and the play order
lives in `Demo::loadPhase` (§5). The 0x45a344..0x45a5a8 region is simply the
.rdata vtable island (COL ptr + 2–4 vtable slots per class, interleaved with
per-part float constants).

## 9. What remains unknown / open

- ~~envelope interpolation~~ **RESOLVED** — see `re/LWS_INVENTORY.md`.
  `FUN_0041ab80` is the evaluator, read out of `disasm.asm` because it is
  x87-audit SUSPECT (118 x87 instrs, math dropped from the C). Keys are a
  24-byte-stride array indexed by **absolute seconds** (`ADD EBX,0x18`; the
  `0x2aaaaaab`+`SAR 2` magic is division by 24); the span search compares
  `key[i].t` at offset 0; the TCB 4-point stencil **clamps** at both ends.
  No modulo, no wrap, no time scaling. The `.lws` `LastFrame`/`Behaviors`
  headers are authoring metadata the engine never reads — 19 of 20 scheduled
  scenes key past their slot, and `kuubiotekniikka` holds its final pose for
  its last 1.8 s, exactly as clamping predicts.
- **Per-part rendering internals**: the LW::Scene tick/render pipeline
  (`FUN_004150b0`/`FUN_004151e0`) and every custom
  part vf2 (HigherBiing 0x4060b0, Kuubiotekniikka 0x406b20, Silli 0x407e30,
  Paleksi 0x4072b0, Pehko 0x407800, Syrjakyla 0x4081f0, Turska 0x408460,
  Viherio 0x4087a0, Part_Empt 0x4057b0) are un-analysed. Several sit near
  x87-audit SUSPECT territory (`FUN_0041ab80`, `FUN_00410350`,
  `FUN_004107f0`) — read their asm before porting.
- **Material/blend semantics of fader modes 1 vs 3** (`FUN_0040c060`) are
  inferred from usage, not read.
- **Hair (`data/hairs/*.txt`, HairMesh/Hair classes) and Pehko's tauno.txt
  format** — consumer code located (Part_Pehko creates from tauno.txt +
  pehko.lws) but not parsed.
- Exact wall-clock offset between capture t=0 and process start (mode-switch
  time before the first frame) is unknowable statically; all relative timing
  is anchored to the two PlaySound events and matches the capture.
- `Picture` mode argument (0 for loading screens, 3 for part pictures) —
  meaning not chased.
- Sequencer float math: the schedule loop, trigger compares, and constants
  were verified directly in the disassembly (0x402670–0x402860), so the x87
  audit's DROPPED risk does not apply to the timeline. `FUN_00404ee0`
  (audit-flagged, 1 x87 instr) is just the FSOUND version check — harmless.
