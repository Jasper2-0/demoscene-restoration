# TEXT_ENGINE.md — Sonnet's text engine (timeline object 1) and compositor (object 0)

The demo *is* a poem, and object 1 is the renderer that draws it. This document is the
reverse engineering behind `web-sonnet/js/text.js` and `web-sonnet/js/compositor.js`,
plus the runtime that drives them (`web-sonnet/js/main.js`).

Every constant below was read out of `unpacked/sonnet_img.bin` at its VA
(`VA 0x401000 == offset 0`). Every function reference is to `re/out/sonnet.c` unless
marked "disassembled", which means Ghidra failed on it and it was read from the image
with capstone.

| what | where |
|---|---|
| record table | VA 0x418328 … 0x418dd7, 50 records, decoded to `re/text/poem.json` |
| parser | `FUN_004067c0` |
| object ctor | `FUN_004069ed` (obj 1); atlas setup `FUN_00406a7d` |
| atlas column scan | `FUN_00406c98` |
| line measure | `FUN_004071d3` |
| line renderer | `FUN_00406db7` |
| quad rotate | `FUN_0040727a` |
| per-frame update + title bars | `FUN_004072e9` |
| event handler | `FUN_004076c4` |
| compositor ctor / render / events | `FUN_0040617b` / `FUN_00406222` / `FUN_004063b3` (disassembled) |
| shared object base | `FUN_004060ac`, `FUN_004060c9`, `FUN_004060db`, `FUN_00406127` |

---

## 1. The record format

Each record parses into a 0x40-byte struct. The leading `u16` is a **presence mask**:
a field is only in the stream if its bit is set, otherwise it is inherited from the
previous record (`FUN_004042b5(dst, prevRecord + off, len)`).

| mask bit | offset | field | note |
|---|---|---|---|
| 0x0001 | +0x0a | `flags` (u16) | the behaviour word, §4 |
| 0x0002 | +0x14 | `rot` (f32) | whole-line rotation, radians. **Zero in all 50 records** |
| 0x0004 | +0x24 | `x` (f32) | 640×480 screen pixels |
| 0x0008 | +0x28 | `y` (f32) | 640×480 screen pixels |
| 0x0010 | +0x2c | `tracking` (f32) | multiplies every advance |
| 0x0020 | +0x30 | `lineadv` (f32) | multi-line spacing. **Zero in all 50 records** |
| 0x0040 | +0x34 | `scale` (f32) | atlas pixels → screen pixels |
| 0x0080 | +0x38 | `color` (u32) | D3DCOLOR `0xAARRGGBB` |
| 0x0100 | +0x3c | `speed` (f32) | fade rate multiplier |
| 0x0200 | +0x18 | `text` (len bytes) | else inherit |
| 0x0400 | +0x1c/+0x20 | `attr[]` / `size[]` | else inherit |

`attr[]` is one byte per character. The parser splits it:

```c
size[i] = (attr[i] >> 2) * (1/63.0f);   // _DAT_00418dd8 = 0.015873016
attr[i] &= 3;
if (attr[i] & 1) text[i] |= 0x80;       // BOLD is folded into the character itself
```

So **`attr` bit 0 = bold, bit 1 = fake italic, bits 2..7 = a 6-bit per-character size
multiplier**. The earlier reading of `size[]` as per-character reveal timings was wrong:
there is **no typewriter effect anywhere in this engine**. Confirmed visually — e.g.
item 30, "the **lonely planet** is vibrant and new", renders with a smaller middle
phrase in both our port and the reference capture at 172 s.

Runtime state lives in the same struct: `+0x04` per-character random angles (0x800
bytes), `+0x08` active flag, `+0x0c` the clamped fade value `t`, `+0x10` an unclamped
accumulator.

Item 0 ("beauty continues to amaze") is never referenced by the timeline; the loading
screen `FUN_004010dc` sets `active = 1, t = 1` and draws it directly. In the reference
capture it is on screen for the first ~2.0 s, over the precalc animation.

---

## 2. The font atlas and the column scan

Texture 11 is a 2048×512 strip generated with GDI at startup (see
`re/gen/TEXGEN_PORT.md` §17). It has **four bands of 128 rows**:

| band | rows | glyph indices | content |
|---|---|---|---|
| 0 | 0…127 | 0x00…0x27 | regular lowercase + digits + `, ! ? '` |
| 1 | 128…255 | 0x28…0x47 | regular uppercase + `( ) [ ] : .` |
| 2 | 256…383 | 0x80…0xa7 | **bold** lowercase set |
| 3 | 384…511 | 0xa8…0xc7 | **bold** uppercase set |

`FUN_00406a7d` builds a 256-entry ASCII→glyph table:

```
'a'..'z' -> 0..25   '0'..'9' -> 26..35   ',' 36  '!' 37  '?' 38  '\'' 39
'A'..'Z' -> 40..65  '(' 66  ')' 67  '[' 68  ']' 69  ':' 70  '.' 71
' '      -> 0xff
then for every c:  map[c | 0x80] = (map[c] - 0x80) & 0xff
```

That last line is what makes the bold fold work: `map['a'|0x80] = 0x80`, i.e. band 2.

### The scan — port this, do not replace it

`FUN_00406c98(buf, glyphStart, glyphEnd, bandY)` walks the rasterised atlas one column
at a time. For each glyph in turn it finds the first column containing a non-zero pixel
inside the band, then the first fully blank column after it, and stores

```
u0[g] = (firstInkColumn - 1) / 2048
u1[g] =  firstBlankColumn      / 2048      // and the next search resumes at +1
```

**The demo never stores or reads a metrics table.** This is why our offline-baked atlas
works at all: FreeType's hinting and GDI's differ, glyph advances differ, the row widths
differ — and none of it matters, because the consumer re-derives every box from the
pixels it actually has. The port keeps the scan exactly, generalised from the hardcoded
`0x800`/`0x80` to `atlasWidth`/`atlasHeight/4` so the 2× remaster atlas works unchanged
(the stored `u` values are fractions, hence scale-invariant).

Space is special-cased: `FUN_00406a7d` writes `u = 0.98 … 0.99` into slots 0x7f (bold)
and 0xff (regular), a deliberately blank strip. Our bake's *bold* rows overrun 2048 px
(TEXGEN_PORT.md §19.4) so that strip is **not** blank in bands 2 and 3 — harmless,
because no poem line contains a bold space, and `text_test.mjs` asserts both facts.

The scan's degenerate path is also reproduced: if a row has run out of glyphs (our
bold apostrophe, 0xa7) the search finds no ink, `first` stays where it was, the blank
search terminates immediately, and the glyph gets a 2-texel-wide box. That is what the
original would have done too.

---

## 3. Layout — `FUN_00406db7`

All coordinates are 640×480 screen pixels until the last step, which converts to NDC.
There is **no XYZRHW path** in this engine; 2D is identity transforms and NDC, and
NDC `+y` is up, so the y conversion flips.

```
width  = trunc(measureWidestLine(item, scale))     // FUN_004071d3, ftol truncation
cellH  = scale * 125.0
penX   = width * tracking * -0.5                   // THE LINE IS CENTRED ON (x, y)
penY   = cellH * lineadv * -0.5

for each character i:
    if (c & 0x7f) == '\n':  penX = width*tracking*-0.5;  penY += scale*lineadv*80;  continue
    g  = charmap[c]
    w  = (u1[g] - u0[g]) * size[i] * scale * 2048        // glyph box width in px
    h  = size[i] * cellH
    quad = { (-w/2,-h/2), (+w/2,-h/2), (+w/2,+h/2), (-w/2,+h/2) }   // v0..v3, y down
    u:     u0, u1, u1, u0
    adv = w * tracking
    ... italic fixups (§3.1) ...
    rotate(quad, (1 - spinT) * rand[i])               // the per-character reveal, §4
    translate(quad, adv/2 + penX, penY)
    rotate(quad, item.rot)
    translate(quad, item.x, item.y);  z = 1.0
    v: band 0/1 by (g & 0x7f) < 0x28, then + 0.5 if attr[i] & 1 (bold)
    NDC: x = x*(2/640) - 1;  y = 1 - y*(2/480)
    penX += adv
draw 2 triangles per quad, indices 0,1,2, 2,3,0
```

`measureWidestLine` differs from the renderer in one detail worth preserving: it gives a
space a flat `scale * 20.0` advance and **ignores `size[i]`**, whereas the renderer uses
the atlas box (`0.01 * 2048 * size[i] * scale` = 20.48·size·scale). It is a small
original inconsistency, reproduced as-is. Neither applies `tracking` — the pen start
does, which is why `penX = width * tracking * -0.5`.

### 3.1 Fake italic

`attr` bit 1 shears the quad's **top two vertices** right by `size[i] * scale * 62.5`
(half the 125 px cell → a 26.6° lean). Run boundaries are patched too:

* entering a run (previous char not italic): all four vertices shift left by
  `size*scale*17.5`, and the advance is reduced by `size*scale*37.5`
* leaving a run: all four vertices shift right by `size*scale*30.0`, and the advance
  grows by the same amount

There is no italic band in the atlas — the lean is purely a quad shear.

---

## 4. `flags` — the behaviour word

| bit | effect |
|---|---|
| 0x0004 | while SHOWN: `scale *= (2 - t)` (zoom in from 2×) and enable the spin reveal |
| 0x0008 | while SHOWN: `scale *= t` (grow from nothing) and enable the spin reveal |
| 0x0010 | vertex alpha = `colorAlpha * t` — the cross-fade. Present on all 50 records |
| 0x1000 | as 0x0004 but while HIDING |
| 0x2000 | as 0x0008 but while HIDING |
| 0x4000 | also draw the title-card colour bars (§5) |

`flags & 0x300c` (the four zoom bits) is also what decides whether the show event fills
`rand[]` with per-character angles:

```c
// FUN_004076c4, method 0
t = 0; active = 1;
for (i = 0; i < 512; i++)
    rand[i] = (flags & 0x300c) ? rnd()*6.0f - 3.0f : 0.0f;     // radians, [-3, +3]
```

so the reveal is a **per-character spin into place**, driven by `(1 - spinT) * rand[i]`,
not a typewriter. `spinT` is `t` while the relevant flag applies and a hard `1.0`
(= no rotation) otherwise.

The fade machine, from the tail of `FUN_004072e9`:

```c
step = dt * 0.01f * speed;
if (!active) {
    if ((flags & 0x3010) == 0) t = 0;        // dead code: every record has 0x10
    t -= step;  if (t < 0) t = 0;
} else {
    tAccum += step;  t = min(tAccum, 1.0f);
}
```

Two quirks, both reproduced:

1. **`tAccum` is never reset.** Method 0 zeroes `t` but not the accumulator, so the
   *second* and later showings of an item snap to full opacity instantly. Item 1
   (`[t]`) is shown nine times in the intro; only the first fades in.
2. The `0x3010` branch is unreachable in this poem — every record carries 0x10 — so
   hiding always cross-fades down rather than cutting.

`dt` is not a wall clock. `FUN_004060db` computes
`dt = (musicMs - lastMusicMs) * timeScale / 1000`, where `musicMs` is `FUN_00402f01`,
**the MiniFMOD player's own millisecond counter**, and `timeScale` is method 254.
Object 1 is given 90 at position 0 and 30 at 0x013f, so a `speed = 4` line fades in
over 1/(30·0.01·4) = **0.83 s** for the whole demo after the intro. Measured against
the reference: the title's bars start appearing at 23.30 s and are at full strength at
~24.1 s. That is the single strongest confirmation of this whole model.

---

## 5. The title card's colour bars

Only the record with flag 0x4000 (item 4, "sonnet") draws them, and only while the music
position is below 0x0400. Six full-height vertical bars in `TEXTUREFACTOR` colour, drawn
as triangle fans with stage 0 set to `SELECTARG1(TFACTOR)`:

```
colours (DAT_0041a9bc):  7fa7d7  a7d77f  fdda62  a34701  c9cdd0  7fa7d7
edges[k] = k*0.1666667*1.24 + (k > 2 ? 0.03 : 0) - 0.62          for k = 0..6, in NDC
edges[k] += sin(k + phase[k]) * 0.06                             for k = 1..5
phase[i] += rate[i] * dt * 4.0   rate = .01 .007 .013 .01 .008 .015 .008
alpha = trunc(trunc(flash[k] > 0 ? flash[k]*127 + 128 : 128) * item.t)
flash[k] -= dt * 0.05
```

**Object 1's method 2 is `flash[N] = 1.0`** — the mystery method from ENGINE.md. Its 40
events carry values 0…5, exactly the six bar indices, and it makes one bar flash bright
on a beat. The projection is set to `scale(1, 4/3, 1)` for the duration and reset
afterwards, which has no visible effect on full-height bars.

Verified pixel-for-pixel: at 0x0300 and 0x0330 the bar colours, edges and the black
"sonnet" over them line up with the reference (§8).

---

## 6. Object 0 — the global compositor

`ENGINE.md` guessed "the white flash between scenes". It is not that. The script sets
R = G = B = 0 once, at 0x0400, and thereafter only ever drives the **alpha**:

* `m0/m1/m2/m3` set red / green / blue / alpha of the current colour **and** the fade
  target, instantly.
* `m4` sets only the target's alpha and arms a fade — all 31 of its events, alternating
  255 and 0.
* Render: `fadeT += dt * 0.01`; when it passes 1.0 the colour snaps to the target and
  `fadeT` resets; the drawn colour is a per-channel `trunc(cur*(1-fadeT) + tgt*fadeT)`.
* The quad is only drawn when alpha ≠ 0, and **alpha 255 skips blend mode 2** — a full
  fade is an opaque overwrite.

So it is a **fade to black**, on render layer 3 (m252). The eight scenes sit at layer 2
and the text at 14, so the compositor blacks out the *scene* and leaves the poem
readable on top of it. With `timeScale = 60` the fade takes 1/0.6 = **1.667 s**.

Measured against the reference: all sixteen fade-downs begin within 0.05–0.15 s of their
`m4` event, and reach 5 % brightness in 1.40–1.55 s (mean 1.49 s). A linear ramp to
1.667 s crosses 5 % at 1.58 s, and video gamma plus black clipping accounts for the rest.

---

## 7. The runtime

`main.js` reproduces the original's loop: play the XM live, take the **audible**
`(order << 8) | row` from it, run the timeline's events up to that position, render.

The player's `position`/`row` describe what has been *rendered into the buffer*, roughly
85 ms ahead of what you hear, and they jump in bursts at callback boundaries. The sibling
restoration lost time to exactly that (≈8 Hz stagger). The fix, carried over here: render
the module in 1024-frame slices inside the audio callback and push a
`{ t: playbackTime + offset/sampleRate, pos }` tag whenever the position changes; each
video frame picks the newest tag with `t <= audioContext.currentTime`. Motion gets a
continuous millisecond clock (the audio clock, interpolated with wall time between the
128-frame quanta) plus a `rowFrac` spanned against the *next* queued tag rather than a
nominal row length. `window.__sonnetClock` exposes all of it; `test/live_test.mjs`
asserts continuity, the 1:1 rate, the 0..1 rowFrac sweep and a bounded tag queue.

Deriving the row from elapsed time does **not** work — the module has pattern breaks.

Query parameters: `?pos=0xNNN` (one frame, no audio), `?debug`, `?quality=original`
(640×480 and the 1× atlas; the default remaster supersamples and uses the 2× atlas),
`?audio=party` (`extracted/sonnet_partypan.xm`, reproducing the party version's
stereo-panning bug; the default `sonnet.xm` is the corrected one), and two verification
aids, `?bg=RRGGBB` and `?skip=0,3`.

`?pos=` warms up rather than cold-jumping: `seek()` replays the script and every object's
state machine is stepped at a simulated 60 fps with all device calls suppressed, then a
further half row so a frame landing exactly on an event boundary is not stuck at alpha 0.

**Seam for objects 2…10.** `main.js` optionally imports `js/scenes.js` and expects
`buildScenes(d3d, { atlas, params })` to return an array whose indices 2…10 are the
camera and the eight scenes. Missing entries stay `null`; `timeline.js` skips them.

---

## 8. Verification

`test/text_test.mjs` — 30 headless assertions on the charmap, the scan against the real
baked atlas, measure/layout, bold/italic, the fade machine, the compositor arithmetic and
the timeline wiring. All pass.

`test/capture.mjs` — screenshots the port at 23 music positions and compares with
`reference/sonnet_ref.mkv`. **The reference video leads music position 0 by 2.43 s**,
measured from the title card's fade-in.

* **0x0200…0x03ff, the title card.** Objects 0 and 2…10 are all still disabled, so every
  pixel is object 1's. Straight photometric comparison: PSNR **32.4 / 26.3 / 23.9 dB**
  (RMSE 6.1 / 12.4 / 16.3) at 0x0210 / 0x0300 / 0x0330. The residual is the bar wobble
  phase — it integrates real frame times, so it cannot be expected to match — plus the
  per-bar flash states and YouTube compression. Colours, edge positions, bar widths and
  the black "sonnet" over them agree visually.
* **After 0x0400** the poem is black ink over scenes we do not render, so the comparison
  is between *text masks* (locally-extreme pixels), scored per line. IoU with **zero**
  best-alignment offset at 18 of 20 positions; the exceptions offset by 1–8 px on one
  line. Per-position IoU: 0.89, 0.51, 0.30, 0.90, 0.62, 0.70, 0.75, 0.91, 0.89, 0.77,
  0.78, 0.55, 0.56, 0.56, 0.68, 0.70, 0.94. Low values are where the scene behind the
  text is high-contrast (0x0630's grass blades cut straight through the text band), not
  where the text is misplaced — the montages in `test/shots/` show the glyphs sitting on
  top of each other.
* Three positions are not comparable this way and are labelled as such: 0x0500 (both
  ours and the reference are early in the same fade, below the mask threshold — visually
  a match), and 0x1300 / 0x2000 (the reference is mid fade-to-black, which this mode
  disables with `skip=0`).
* **Object 0** is checked separately, by timing the reference's mean brightness through
  all sixteen fades (§6).

`test/integration_test.mjs` and `test/timeline_test.mjs` still pass unchanged.

---

## 9. Uncertainties, with confidence

1. **The reveal is a per-character spin, not a typewriter — high confidence.** The code
   is unambiguous (`rand[i]` in radians, applied as a rotation about each glyph's own
   centre, scaled by `1 - t`). Not *directly* verified against video, because the four
   flags that enable it are only on items 4, 18, 34 and 46 and the reveal lasts under a
   second; our sampled frames caught those items already settled.
2. **The italic shear constant (62.5) — high confidence** in the value, medium in the
   interpretation. It is a big lean for Times, but the italic 'e' in "sonnet" matches the
   reference's lean at 0x0300 closely.
3. **The bar wobble phase — low confidence, and unfixable.** `phase[i] += rate[i]·dt·4`
   integrates the original machine's frame times. Ours integrates the browser's. The
   bars will never be phase-locked to the capture; only their range and rate can match.
4. **`ftol` truncation.** Reproduced as `Math.trunc` at the four sites where the original
   calls `FUN_00404224` (line width, alpha, the compositor lerp, the bar alpha). The x87
   control word is set to round-toward-zero there, so this is right; the residual risk is
   float32-vs-float64 rounding one texel differently on a boundary. Negligible, untested.
5. **Vertex normals and texcoord set 1 are never written by the original** — the buffer
   is malloc'd and left uninitialised. Lighting and stage 1 are off, so it cannot matter;
   we write zeros, which is a divergence from "undefined" only in theory.
6. **The item `rot` field and `lineadv`** are zero in all 50 records, so the whole-line
   rotation and the newline path are implemented from the decompile but **never
   exercised** by this poem. Unverified.
7. **The `0x3010` snap-off branch** is likewise unreachable here. Implemented, untested
   against the original.
8. **Our `rnd()`** is a deterministic LCG, not MSVC's `rand()` seeded as the original
   seeds it. The angles are random by design, so this only affects reproducibility, not
   fidelity — but it means our spin reveal will never match the capture frame-for-frame.
9. **The compositor's `fading` flag is never cleared.** Once armed it keeps lerping
   forever. Harmless (colour == target after arrival) and faithful, but it does mean the
   object does per-frame work for the rest of the demo.
10. **`REF_OFFSET = 2.43 s`** is measured, not derived: the title card's alpha crosses
    zero at video 23.30 s against a predicted music 20.87 s. Independently corroborated
    by all sixteen compositor fades starting within 0.15 s of prediction. Confidence
    high, precision ±0.1 s.
