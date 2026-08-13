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

## Next steps

1. Find the part table: who calls the per-part constructors, in what order,
   and how music time (FSOUND) drives part switching + the mid-demo loader.
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
