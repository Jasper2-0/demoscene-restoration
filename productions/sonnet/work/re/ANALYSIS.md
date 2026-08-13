# Sonnet (threestate, Assembly 2001 64k) — initial analysis

Date: 2026-08-04. Files: `originals/3s-sonnet/` (sonnet.exe 65536 B, sonnet.nfo, scene.org).
This is the **party version** (PE link date 2001-08-01; ASM'01 was mid-August; nfo says
"final version will have better hardware compatibility" — no final was found yet, worth a
scene.org/pouet check).

## 1. The binary

- PE32 GUI, 3 sections named **`rygs and` / `packer. ` / `.rsrc`** — "ryg's and packer",
  i.e. ryg's packer (nfo: "thanks to Ryg (Packer)"). fr-08-era, pre-kkrunchy.
- Compression is an **aPLib-style LZ** (MSB-first tag bits, gamma lengths, offset bonus
  thresholds 0x7D00/0x500/0x7F) but *simplified*: repeat-offset on gamma==2 is
  unconditional (no last-was-literal state). Followed by an **E8/E9 call filter**:
  exactly 0x851 (2129) rel32 fixups, stored as marker byte 0x05 + 24-bit big-endian.
- **Statically unpacked** by `work-sonnet/unpack.py` → `unpacked/sonnet_img.bin`
  (541,299 B, image VA 0x401000..0x485273). Deterministic, byte-faithful to the stub
  (transcribed from ndisasm at file 0xfcc0).
- **OEP = 0x4042d3** (stub's final `jmp`).
- Runtime imports resolved by name from a private table at VA 0x485000 (dll names reused
  from the stub's .rsrc; one decoy import per DLL forces the loader to map them).

## 2. Real import table (= architecture summary)

| DLL | Functions | Meaning |
|---|---|---|
| KERNEL32 | VirtualAlloc/Free, CreateThread, SetThreadPriority, Sleep, ExitProcess, GetModuleHandleA | mixer thread — MiniFMOD's exact shape |
| d3d8.dll | **Direct3DCreate8 only** | everything else via COM vtables |
| GDI32 | **CreateFontA, TextOutA**, GetDIBits/SetDIBits, CreateCompatibleDC/Bitmap, SelectObject, SetBkMode, SetTextAlign, SetTextColor, DeleteDC/Object | runtime font rasterization → textures |
| USER32 | RegisterClassA, CreateWindowExA, AdjustWindowRect, PeekMessageA/GetMessageA loop, SetCursor, GetDC | standard window bootstrap |
| WINMM | waveOutOpen/Write/Prepare/Unprepare/Reset/Close, **waveOutGetPosition** | streaming audio + **sample-position clock for sync** |

Notable absences: **no DirectSound**, no D3DX, no LoadLibrary at runtime beyond stub,
no CRT to speak of.

## 3. Graphics: Direct3D 8 FIXED-FUNCTION

- **No shader bytecode in the image** (scanned for vs/ps 1.x token magics 0xFFFE01xx /
  0xFFFF01xx — zero hits). "GeForce recommended" = T&L/fillrate, not shaders.
- 640×480 backbuffer (push 480 / push 640 pair at VA ~0x416106 in init code).
- Port consequence: a **minid3d8.js** shim over WebGL2, sibling of Lost Vegas's
  minid3d7.js — and *simpler*: no DDraw bootstrap, no surface juggling;
  IDirect3DDevice8::SetRenderState/SetTextureStageState/SetTransform/DrawPrimitive(UP)
  map to the same machinery minid3d7 already models. Same left-handed, z∈[0,1],
  D3DCOLOR-BGRA conventions. Expect vertex buffers (CreateVertexBuffer/Lock) instead of
  UP draws — check in RE.

## 4. Text engine (the heart of the demo)

- The demo renders its poem with **GDI: CreateFontA("times new roman") + TextOutA**,
  reads pixels back with GetDIBits, and (presumably) uploads as D3D textures.
- Two charset strings define the atlas contents:
  - `A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ( ) [ ] : .`
  - `a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 , ! ? '`
- **The full sonnet is embedded in plaintext** — a 4-seasons poem ("Summer splendor is
  conceived during spring", "the RAIN is still warm in the afterglow", "memories of
  green what happened to red", "wet feet, warm sand, summers final caress",
  "however snow might fall is but a guess", "YELLOWEST sun", "never turns sooty",
  "the WONDER of light", credits "threestate people brought you", "threestate 2001").
- Text records (~VA 0x4183c9 title block, ~0x4185xx.. poem blocks): roughly
  `u16 time, floats x,y,scale,speed…, u8 len, char[len], u8 timing[len]` — one timing
  byte **per character** (typewriter reveal with per-char cadence; values like 0xfc/0xfe
  and printable runs `|||`, `LLL`, `\\\` in strings output are these arrays). At least
  two record layouts (title cards carry extra fields incl. a color-looking dword).
  Exact schema = Ghidra task.

## 5. Timeline / scene system

- Named-object track data around VA 0x41a8f0..0x41a9a0: 8-byte keyframe records
  `(u16 time?, u8, u8, float value)` plus `FF FF <id> 03 <float>` marker records with
  ascending values 0.0..8.0, immediately followed by object names:
  **`ALandscape`, `Font`, `Background`, `Border`** — a small named-track animation
  system (a step up from Lost Vegas's hardcoded position ladder).
- Palette-ish dwords nearby: 0x7fd7a7, 0xa7d77f, 0xfdda62, 0xa34701, 0xd0c9cd —
  candidate scene colors (autumn/summer hues).

## 6. Audio

- nfo: "Firelight (Player)" ⇒ **MiniFMOD** (XM playback via waveOut + worker thread) —
  matches imports exactly. **No "Extended Module:" signature** in the unpacked image:
  header stripped or format repacked at build (like Lost Vegas's MXM situation — expect
  an RE step to reconstruct a playable .XM for Jasper's `work/xm.js`).
- Song/instrument data almost certainly the big sparse region **VA 0x41d000..0x485000**
  (~415 KB virtual, mostly zeros, low-entropy runs = pattern data; a param block at
  0x41d000 starts with floats 0.02/0.12/0.02, -48.0 — envelope-ish). High-entropy PCM
  is absent ⇒ samples are either tiny, delta-packed, or synthesized at init.
- **Sync clock = waveOutGetPosition** (sample-accurate audio position, the D3D8-era
  analog of Lost Vegas's song-position ladder). Live xm.js playback should again drive
  the timeline directly.

## 7. Image map (from entropy scan)

> ⚠ SUPERSEDED. This five-row table was an entropy scan from week one. The
> address-level map is **`re/IMAGE_MAP.md`**, GENERATED by
> `node re/tools/imgmap.mjs` from the modules that actually depend on each
> region, so it cannot drift from the runtime. 86.5% of the image is
> attributed by name; the rest is the zero-fill tail and the scalar constant
> pool. Keep the rows below only as the original coarse reading.

| VA range | Content |
|---|---|
| 0x401000–0x416000 | code (~84 KB) |
| 0x416000–0x41b000 | init code tail + data: strings, poem records, track/keyframe tables, charsets, palette |
| 0x41b000–0x41d000 | misc tables |
| 0x41d000–0x485000 | sparse music data (patterns/instruments), big zero runs |
| 0x485000+ | runtime import metadata |

## 7b. The constant pool (0x418dd8..0x41a048) — analysed 2026-08-13

`re/IMAGE_MAP.md` leaves one 4,721-byte region unnamed. It is the compiler's
**float32 literal pool**: 1,180 four-byte slots of which only **172 are
non-zero**. That 15% density is why the entropy reads 1.2 — the rest is `0.0f`
constants and alignment padding, which are the same bytes.

Attribution of the 172 live slots:

| | |
|---|---|
| 103 | cited by address in the port (`[0x418200]`, `_DAT_...` style) |
| 26 | present as literals under another name — value read off the disassembly, address never cited |
| 36 | do not read as plausible f32 — f64 halves, ints, table remnants |
| **7** | **genuinely unreferenced by the port** |

Typical contents: `1/63` (the poem's per-character size divisor), `1/2048`
(reciprocal of `U_TO_PX`), `0.99`, `62.5`, `37.5`, `2048`, `1/240`, `1/320`.

⚠ **Check RECIPROCALS before calling a constant unused.** A first pass put 13
in the residue; six of them moved to "accounted for" once reciprocals were
tested, because the port writes `/ 768` where the image stores `0.00130208337`
and `256` where it stores `0.00390625`. That included a satisfying cluster:
**4608, 1/768 and 8363 are the XM linear-frequency constants**. The module's
header flags are `0x1`, so it really is linear mode, and `xm.js` implements
exactly that (`linearPeriods`, a 768-entry `2^(i/768)` table) — in float form
rather than FT2's fixed-point form. Not a missing feature; a different
formulation of the same maths.

The residue, for anyone who wants it:

```
0x418f1c  2.392699      0x419004  1.32134938
0x418f74  1.9463495     0x41901c  2.142699
0x418fa4  0.937745094   0x41902c  2.39269876
0x419010  4608
```

`2.392699` appears TWICE and is not deduplicated, which usually means separate
translation units; `2.142699` is exactly `2.392699 - 0.25`. A cluster of
near-2.4 values with a fixed offset reads as a polynomial or approximation
series rather than tuning values, and `4608` among them fits the XM period maths
(`8363 * 2^((4608 - period)/768)`) that `xm.js` replaces with `Math.pow`.

**Treated as closed**: 7 slots out of 541,299 bytes, most likely the fixed-point
innards of audio maths the port already reproduces — `tools/audio_ab.mjs` proves
the whole 470 s song renders sample-for-sample identically.

## 8. Suggested next steps

1. Rebuild a loadable PE from `sonnet_img.bin` (fresh headers + real import table) →
   Ghidra project; or feed the raw image at base 0x401000 with entry 0x4042d3.
2. Reference capture: pouet/YouTube video of "Sonnet by threestate" (Assembly 2001
   64k compo) via yt-dlp; also check scene.org for a **final version**.
3. RE fan-out (per methodology): D3D8 call surface → minid3d8.js spec; text/typewriter
   engine (GDI rasterizer semantics: font height, weight, AA mode of 2001-era GDI —
   node-canvas + real Times New Roman for baking); music format → .XM for xm.js;
   timeline/track VM.
4. Port skeleton `web-sonnet/` mirroring web-lv/ structure.
