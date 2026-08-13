# Sonnet — shipping the web port as a real 64k intro

Jasper's idea, prompted by sagacity's own modern tooling at https://datatra.sh/projects/ :
**Wasm-PNG** (single-HTML-file packer — the PNG-bootstrap trick, where the payload is
stored as PNG pixel data so the browser's native DEFLATE does the decompression) and
**Mashi** (a PAQ-style compressor). The original coder's tools repackaging his own 2001
intro.

**Status: NOT STARTED. Mashi and Wasm-PNG are not integrated.** Everything below is
measurement, to establish whether it is worth doing. It is.

## 1. The data payload — a 13× win available right now

The port currently ships **`unpacked/sonnet_img.bin`, the entire 541 KB depacked
executable image**, because the audio streams are read out of it. Only five regions are
ever touched:

| region | bytes |
|---|---|
| resource archive (28 texture programs + 8 scene descriptors + 16 camera splines) | 4,386 |
| audio: header stream | 276 |
| audio: instrument stream | 5,448 |
| audio: synth stream | 3,928 |
| audio: pattern stream | 28,620 |
| **total** | **42,658 raw** |

| | raw | gzip -9 |
|---|---|---|
| what ships today (whole image) | 541,299 | **69,480** |
| what is actually needed | 42,658 | **5,270** |

**A 13× reduction in the data payload, and it is not a size-coding trick — it is just not
shipping 499 KB of code and BSS the port never reads.** Worth doing regardless of whether
we ever build a 64k version, and it is a prerequisite for one: 69 KB gzipped of *data*
alone would blow a 64 KB budget before a line of JavaScript.

## 2. The code payload — measured, with a real minifier

Earlier estimates in `re/PRELOADER.md` used regex comment-stripping, which is not
minification. Measured properly with terser (`--compress passes=3 --mangle`, per file —
a real bundler would do better, since per-file mangling cannot rename across modules):

| | bytes |
|---|---|
| JS source (32 files) | 596,312 |
| terser-minified | 214,199 |
| …gzip -9 | 76,985 |
| …**xz -9e** | **66,488** |

## 3. The budget

| | bytes |
|---|---|
| minified code, xz -9e | 66,488 |
| data (the five regions) | 5,270 |
| **total** | **71,758** |
| the limit | 65,536 |
| | **6,222 over** |

If Mashi beats xz by the 15–25% typical of PAQ-class compressors on text, the same
payload lands at roughly **58,500 — about 7 KB under the limit.**

So: **plausible, but not free.** It does not fit today, and it is not a rounding error
away either. What would close the gap, in order of expected value:

1. **Mashi itself** (~13 KB by the estimate above) — the whole point of the exercise.
2. **A real bundler rather than per-file minification.** Cross-module mangling and
   dead-code elimination cannot happen file-by-file; every export name currently survives.
3. **Strip the verification and debug surface from the 64k build.** `?bg=`, `?skip=`,
   `?pos=`, `?assets=baked`, `__sonnetRender`/`__sonnetRenderSeq`, `__sonnetClock`,
   `__scenesReady`, the baked-asset fallback path, and the extensive assertion comments
   exist to make the restoration verifiable. A released intro needs none of them.
4. **Property mangling** (`--mangle-props`) on internal fields — risky, needs a careful
   reserved list, but this codebase has long descriptive property names throughout.

## 4. The recommendation stands: two distributions, not one compromise

- **The readable build** is the restoration artifact: commented, documented, verifiable,
  shipping the generators and the baked corpus. This is the thing with historical value
  and it should never be minified.
- **The 64k build** is what you would actually release as an intro: same code, stripped
  and packed. Its correctness is guaranteed by the readable build's test suites, and it
  should be checked with one sweep at the end to prove packing changed nothing.

Do item 1 of §1 (ship only the five regions) regardless — it is a pure win for the normal
build too.
