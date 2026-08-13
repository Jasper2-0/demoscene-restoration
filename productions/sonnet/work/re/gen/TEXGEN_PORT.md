# Sonnet — TEXGEN port report

Port: `work-sonnet/js/texgen.mjs` (+ `bake_tex.mjs`, `kernel_scaling_test.mjs`, `png.mjs`).
All 28 programs parse, execute and bake. Method: read `re/out/sonnet.c`, then
**disassemble** (`ndisasm -b 32`) every handler whose x87 work Ghidra dropped, and read
every float constant out of `unpacked/sonnet_img.bin`. That was necessary far more often
than expected — see §6.

---

## 1. What the spec had right (confirmed)

* **Archive layout, program header, instruction encoding, arg-length escapes** —
  all confirmed byte-exact. Parsing all 28 programs reproduces the spec's
  size/op-count table exactly (15×256², 5×128², 3×32², 2×16², 1×8², 1×512²,
  1×512×2048; op counts 0..27).
* **`(opcode & 0xff00) == 0xff00` = control op** — confirmed.
* **The opcode table** (21 pixel handlers at those 21 slots) — confirmed from
  `FUN_0041254d`.
* **The layer-stack model** — confirmed, and now fully decoded (§3).
* **Float RGBA throughout, quantise once on output** — confirmed
  (`FUN_00414cf7` is the only quantiser).
* **PRNG is MSVC `rand()`** — confirmed by disassembly of `FUN_00404258`
  (`imul eax,eax,0x343fd; add eax,0x269ec3; sar eax,0x10; and eax,0x7fff`).
* **Op 3 = multi-octave noise, 8 octaves, seeds itself from arg0** — confirmed.
* **Op 10 invert, op 14 fill, op 18 channel op, op 22 normalised spatial op,
  op 25/26 box blur, op 28 3×3 convolution with `mode = arg & 7` and
  `strength = (arg>>3)·0.5`, op 30 transpose-ish** — all confirmed.
* **`FUN_00413ed9` is a box blur of width N texels** — confirmed, including that
  it is a *forward* (non-centred) running-sum window.

### The PRNG claim in the brief is CORRECT — no ambient stream

Verified per-op. Every op that draws random numbers seeds the generator itself
first: op 3 `srand(u16 arg0)`, op 16 `srand(arg[1])`, op 33 `srand(arg[0x0c])`.
**No op reads the PRNG without seeding it.** Ops 31 and 32 (which look random)
are fully deterministic — they read explicit control points out of the bytecode.
So there is no global stream to preserve and no desync risk from changing
resolution. *Nothing to flag.*

---

## 2. What I corrected in the spec

| spec said | actually |
|---|---|
| flags high byte = "a stack/slot selector", used only for control ops | it is the **layer index for BOTH classes**. Pixel ops run on `slots[flags>>8]`, not on the current stack pointer. `FUN_00412a3c` (which sets the sp) is only called on the control path. |
| control op 12 = "PUSH WITH EXPLICIT SIZE" | **wrong.** `FUN_00412387` is one instruction: `*(uint*)ctx = argByte`. It is a **BROADCAST flag**: while non-zero, every pixel op is applied to *every* layer in turn (`FUN_0041281f`'s `FUN_00412a2c(ctx) != 0` branch). Used by tex 0, 2, 13, 18. |
| control op 3 = "SWAP + POP" | swap `slot[sp]` with `slot[sp-1]`, then `sp--`. **No slot is deleted** — the array length is unchanged. |
| channel mask "bit0 → 0x000000ff" (implying bit0 = channel 0) | the expansion is right but the **consumer inverts it**: `FUN_00415fbb` writes component 0 for `mask & 0xff000000`. So nibble **bit3 → component 0, bit0 → component 3**. Component 0 is ALPHA, 1..3 are R,G,B. Hence `0x07` = RGB and `0x0f` = ARGB, as observed — but for the opposite reason to the one in the spec. |
| op 2 "scale/reciprocal" | **ROTATE + ZOOM.** `FUN_004141b9(1/(arg0·k), arg1, canvas)` is a centred rotate-scale resample. (Op 2 is never used by any of the 28 programs.) |
| op 9 "stripes/bands" | **VERTICAL BARS** — `arg1` bars evenly spaced across the width, each `2·(arg0>>1)` texels wide, painted with a flat colour. (Never used.) |
| op 12 "radial gradient/circle" | **2-D GAUSSIAN BLOB**, literally `colour · exp(−r²/2σ²)/(2πσ)` with `σ = arg1/255` and the radius scaled by `arg0·(10/255)`. |
| op 16 "randomised op, low confidence" | **additive white noise**: `srand(arg1)` then `+= sqrt(arg0/255) · rand()/32767` on all four channels. |
| op 17 "a filter implemented in integer space" | **it is the WIN32 GDI FONT ATLAS renderer.** `FUN_00413479` calls `CreateFontA("times new roman")`, `CreateCompatibleDC`, `TextOutA` of `"a b c d e f …"` and `"A B C …"`, then blits the DIB back into channels 1..3. Used by exactly one program (res 11, the 2048×512 font strip). **Not portable and not ported** — see §5. |
| op 19 "tone curve, two byte params" | **BRIGHTNESS + CONTRAST**, and arg0 is a **u16**, not a byte (`movzx ecx, word [eax]`). `bright = u16/255 − 1` (so 255 = neutral, and the real programs cluster at 231..271), `contrast = arg[2]/255 − 0.5` applied as `x >= 0.5 ? x+c : x−c`. |
| op 21 "hue/sat-like, low-medium" | **HSV ADJUST**, confirmed: full RGB→HSV→RGB round trip with `hueShift = u16 degrees`, `sat += 2·arg[2]/255 − 1`, `val += 2·arg[3]/255 − 1`. Hue 600.0 is the "undefined hue" sentinel. |
| op 26 "a level/normalise wrapper" | **DIRECTIONAL BLUR**: rotate by `arg1/255·360°` (at zoom 2), box-blur along X by `arg0`, rotate back (at zoom 0.5). |
| op 31 "colour-parameterised op" | **CUBIC-HERMITE SPLINE STROKE.** `arg0` control points read as normalised u8 pairs from offset 0x0c, `arg1/255` = tangent tension, `arg[8]` = stroke thickness, Bresenham with a square brush. The point list is closed (last pair == first) in every program that uses it. |
| op 32 "flood-fill / distance-transform / cellular, low" | **FLOOD FILL**, confirmed: explicit stack, per-texel 4-direction visit counter pre-set to 4, seeded at `(arg0/255·w, arg1/255·h)`, target = the seed texel's *quantised* colour. |
| op 33 "colour-parameterised op" | **SPOTS**: `arg1` random discs of radius `arg0/255·w`, each writing `255·d/r` into an 8-bit min-composited buffer, then `lerp(colA, colB, buf/255)`. Seeds from `arg[0x0c]`. |
| op 34 "spatial, reads w/h" | **HORIZONTAL LINEAR GRADIENT** between two colours, ramping from column `arg[0]` to column `arg[2]` (both in TEXELS). |

### Two genuine bugs in the original, now documented

1. **The root layer and the pushed layers disagree about which header field is
   width.** `FUN_0041224d` builds slot 0 / the view / the output as
   `(iw = hdrB, ih = hdrA)`; `FUN_00412391` (push) builds new layers as
   `(iw = hdrA, ih = hdrB)`. Verified by disassembling both push sequences — the
   argument order really is reversed. Harmless: 27 of 28 programs are square, and
   the one that is not (res 11, 512×2048) has no push. The consumer asks for
   `FUN_00416036(0xb, 0x800, 0x200, …)`, i.e. 2048 wide × 512 tall, which matches
   the root-layer convention — so `hdrA` is HEIGHT and `hdrB` is WIDTH, and the
   push path is the buggy one. The port reproduces both.
2. **Op 22 uses the width accessor for both loop bounds** (`FUN_00412c4f` twice),
   so it would mis-scan a non-square canvas. Reproduced.
3. **Op 31's thickness is `arg[8] / (256 / iw)` with *integer* division**, which
   divides by zero the moment `iw > 256`. The original therefore cannot run op 31
   at any remaster scale on a 256-wide texture. The port uses the algebraically
   identical `arg[8] · iw / 256`, which agrees exactly at 128 and 256 (the only
   sizes op 31 is used at) and stays finite above.

---

## 3. Architecture as ported (all verified)

```
ctx.broadcast      (+0x00)  control op 12; non-zero -> ops hit every layer
ctx.sp             (+0x04)  set by FUN_00412a3c from flags>>8, control ops only
ctx.view           (+0x08)  scratch layer that pixel ops actually run on
ctx.slots[]        (+0x10)  layer array, ctx.slots.length at +0x0c
ctx.out            (+0x28)  output image
slot = { img, opacity u8 (default 100), colour u32 (default 0xffffff), blend u8 }
```

Per pixel op: bind `slots[flags>>8]` into `ctx.view` (copy pixels + inherit the
filter mode), run the handler on the view, then masked-copy view → slot through
the channel nibble. Per control op: set `sp`, run, then flatten.

Flatten (`FUN_00412305`): clear a composite to `(1,1,1,1)`, then blend every layer
in order. `slot.colour` acts as a **per-layer channel mask** (`FUN_004154e5` tests
`colour & 0xff000000` etc.), `slot.opacity/100` as alpha, `slot.blend` selects
over / add / subtract / multiply / divide. That is why several textures come out
"white" in RGB — they are **alpha-only sprites** (glows, cut-outs); the contact
sheet composites over a checkerboard so this is visible.

### The sampler is the most surprising part — and it is NOT plain bilinear

`FUN_00415a71` (and its scalar twin `FUN_00412abd`) do **cosine interpolation with
8-bit-quantised weights**:

```
t  = trunc(x*256) & 0xff
f  = trunc( (1 - cos( (t/256) * PI )) * 128 ) & 0xff      ; PI is a QWORD at 0x419018
w0 = (255-f)/255 ;  w1 = f/255
```

Ghidra renders the `fmul qword [0x419018]` as a *float* read and yields garbage;
read as a double it is `3.1415927`. Same for `[0x419028] = 6.283184` (2π, used by
op 12). Missing this would have produced visibly wrong noise everywhere.

Coordinates are wrapped by `FUN_00415cf8` first (`if (n < 2) return x;` — which is
why the 1×1 first noise octave works at all).

---

## 4. Per-handler confidence AFTER porting

| op | meaning | confidence | basis |
|---|---|---|---|
| 2 | rotate + zoom | **high** | full disassembly of `FUN_004141b9`. Never used by any program, so untested against the reference. |
| 3 | 8-octave value noise × colour | **high** | disassembled; octaves are 1,2,4…128 lattices at *equal* amplitude (not 1/f), each lattice texel = `rand()·5.0864e-6` ∈ [0,1/6]. Verified visually (bark, grass, leaf mottling). |
| 7 | load layer (`0xff` = none) | **high** | trivial. |
| 9 | vertical bars | medium-high | fully disassembled; **never used**, so unverifiable against the reference. |
| 10 | invert | **high** | trivial. |
| 12 | Gaussian blob | **high** | disassembled; matches the sun/glow sprites (tex 5,6,7,14,22) seen in the video. |
| 14 | fill | **high** | trivial. |
| 16 | additive white noise, `sqrt(amp)` | **high** | disassembled. |
| 17 | **GDI font atlas** | identified, **NOT ported** | `FUN_00413479` is Win32 GDI. Emits a black 2048×512 strip. See §5. |
| 18 | channel swap / copy / mean | **high** | disassembled; **never used**. |
| 19 | brightness + contrast | **high** | disassembled; the u16 brightness parameter is confirmed and the real args cluster tightly around neutral, which is strong independent evidence. |
| 21 | HSV adjust | medium-high | `FUN_00413a01`/`FUN_00413b24` are a textbook RGB↔HSV pair; sector selection is transcribed from a heavily-optimised conditional chain and is the one place I would look first if a colour comes out wrong. |
| 22 | normalised scroll/offset | **high** | disassembled. |
| 25 | box blur, both axes | **high** | disassembled + validated numerically (§7). |
| 26 | directional blur | **high** | disassembled; produces exactly the vertical bark streaking (tex 0) and the ice striations (tex 27) visible in the reference video. |
| 28 | 3×3 convolution | **high** | disassembled. Modes 0,3,4,5 build kernels; modes 1,2,6,7 leave an all-zero kernel and emit a flat 0.5 field (none of them are used). |
| 30 | rotate 90° (square only) | medium | `dst(x,y) = src(y, ih−x)`; only used once (tex 8) and the loop starts at `ih` rather than `ih−1`, relying on the wrap. |
| 31 | Hermite spline stroke | **high** | disassembled including the Hermite basis (`h00 = 2t³−3t²+1` etc., constants −2.0/3.0 read from 0x4182c8/cc) and the bracket search. Verified visually — it is what draws the leaf outline (tex 1). |
| 32 | flood fill | medium-high | disassembled. The stack pointer arithmetic (`push` writes at `ptr+2` then advances, `pop` decrements then reads) is transcribed literally; it terminates correctly at 1× on all 7 users. |
| 33 | spots / discs | **high** | disassembled. |
| 34 | horizontal gradient | medium-high | disassembled; the `t` clamp beyond the ramp end (`t = arg[2]`, not `arg[2]−arg[0]`) looks like an original bug and is reproduced literally. |

Control ops 3, 4, 6, 7, 8, 9, 10, 12: all **high** (each is a handful of
instructions and all were read directly).

### Remaining honest uncertainties

1. **Op 17 (font)** — not ported at all. Res 11 bakes as black.
2. **Op 21's HSV sector chain** — Ghidra's output for `FUN_00413b24` is a mangled
   short-circuit chain; I reconstructed the standard 6-sector table from it. It is
   used by 4 textures (0, 2, 18, 20) and those look right, but this is the handler
   I am least sure is *bit*-faithful.
3. **Ops 2, 9, 18 are never exercised** by any of the 28 programs, so they are
   ported-but-unverified.
4. **Float precision.** The original computes in x87 80-bit registers; the port
   uses IEEE doubles with `Float32Array` storage. Values agree to well under one
   8-bit quantisation step in every spot check, but the port is *not* claimed to be
   bit-identical to the original binary — only to the original algorithm.
5. **There are no ground-truth dumps.** Correctness rests on (a) internal
   consistency, (b) the reference video (§5), and (c) the numerical experiments
   (§7). I have not diffed against a texture dumped from the running exe.

---

## 5. Verification against the reference video

Frames extracted from `reference/sonnet_ref.mkv` at 12 s intervals and compared by
eye against `baked/tex/contact.png`. This is a **visual** match, not a numeric one;
reported honestly:

| baked texture | what it looks like | seen in the video |
|---|---|---|
| 0 | orange/brown vertical streaks | **yes** — the tree trunks in the autumn scene, unmistakable |
| 1 | a green **leaf** with an alpha cut-out and mottling | **yes** — the leaf sprites in every tree canopy. This is the strongest single confirmation in the whole port: the silhouette comes out of op 31 (spline) + op 32 (flood fill) and the mottling out of op 33 (spots), so it validates three "low confidence" handlers at once. |
| 3, 13, 19 | green noise | **yes** — the grass fields |
| 5, 6, 7, 14, 22 | white/warm radial glows, alpha only | **yes** — the sun and the dandelion seeds |
| 8, 16 | soft white gradient / grey noise | **yes** — sky and clouds |
| 17 | cream speckled sand | **yes** — the desert scene ("its genius") |
| 18 | grey-brown rough rock | **yes** — the cliffs and the island |
| 20 | orange/brown mottled ground | **yes** — the autumn ground |
| 27 | pale blue vertical striations | **yes** — the ice/waterfall scene |
| 9, 10, 23, 24, 25 | organic filled silhouettes | **plausible** — petal/leaf/snow sprites; I could not tie any of them to a specific on-screen element with confidence |
| 11 | black (font atlas, not ported) | the video obviously has text |
| 12 | black, 0 ops | untestable |

No texture looks wrong or degenerate. Nothing in the baked set contradicts the
video. That is as far as an eyeball comparison honestly goes.

---

## 6. Method note — Ghidra was wrong more often than the brief warned

The brief flagged ops 7 and 25 as bare `LAB_`s. In practice the decompile had to be
overruled in at least eight more places, all of them silently:

* `fmul qword [addr]` (a **double** constant) rendered as a float read →
  π and 2π appeared as `1.79e16` and `−5.77e36`. Both are load-bearing (the sampler
  and op 12).
* Every `ftol()` with a dropped argument — ops 9, 12, 32, 33 all lost their
  coordinate expressions.
* `FUN_004041ab` decompiles as an unreadable stack shuffle; it is `floorf`.
* Op 19's `movzx ecx, word [eax]` was typed as `ushort*` by Ghidra but the correct
  reading (u16, not u8) only became certain from the disassembly *and* the fact that
  every real argument then lands within ±16 of the neutral value 255.
* The two `FUN_0041538d` call sites' argument order (the width/height bug) is
  invisible in the decompile and only shows in the `push` order.

**Recommendation for whoever ports the meshgen or the audio: budget for
disassembling roughly a third of the handlers.**

---

## 7. The kernel-scaling experiment

`node js/kernel_scaling_test.mjs` (add `--full` for the slow 256² programs at
S = 3,4). Criterion: generate at scale S, box-downsample by S, compare with the
authentic 1× output. Errors in 8-bit units.

### Two bases, because they answer different questions

* **base A** — the op-3 noise evaluated natively at each resolution. Its lattice is
  already pinned (sizes 1..128 regardless of canvas size) so sample *positions*
  coincide, but the 1× value is a **point sample** where the downsampled S× value is
  an **area average**. That mismatch is an irreducible floor:
  **S=2 → 4.221, S=3 → 5.305, S=4 → 5.861** (max 24/31/34).
  Every base-A number below has to be read against that.
* **base B** — the same noise rendered at 1× and block-replicated to S×, so
  `down(B_S) == B_1` exactly and the floor is 0. This isolates the operator.

### 7.1 Box blur (ops 25/26) — radius N → N·S

base B (operator isolated), scaled radius:

| N | S=2 | S=3 | S=4 |
|---|---|---|---|
| 1 | 4.174 | 5.296 | 5.815 |
| 2 | 1.928 | 2.522 | 2.812 |
| 3 | 1.289 | 1.701 | 1.906 |
| 5 | 0.785 | 1.046 | 1.172 |
| 9 | 0.441 | 0.590 | 0.663 |
| 19 | 0.226 | 0.299 | 0.336 |

Control — **radius left unscaled**: N=2 → 3.20/4.42/5.07, N=5 → 4.50/6.07/6.79,
N=9 → 4.93/6.73/7.68. Note that this *grows* with N and with S, while the scaled
version *shrinks*.

**Verdict: scaling the radius is right, and the port is sound.** The residual is
not a porting bug: `FUN_00413ed9`'s window is *forward*, not centred (it sums
texels `x … x+N−1`). At S× the S sub-positions inside one 1× texel therefore see S
slightly different windows, and box-downsampling averages them — which is exactly
the same point-vs-area effect as the base-A floor, and it dies away as `1/N`
(0.226 at N=19). The N=1 row is the degenerate case (identity at 1×, a genuine
S-wide box at S×) and lands right on the noise floor, as it must.

Whole-program confirmation (full VM, box path only): tex 22 → **0.237 / 0.281 /
0.304**, tex 7 → 0.493 / 0.640 / 0.729, tex 27 → 0.230 / 0.633 / 0.298.

### 7.2 op 28 — the actual question

Modes used by the 28 programs: **0** (tex 13), **3** (tex 0), **4** (tex 9, 18),
**5** (tex 17, 19, 20). Modes 1, 2, 6, 7 build an all-zero kernel and emit a flat
0.5 field at every scale (error identically 0 — they are trivially scale-free).

**base B, operator isolated** (mean error):

| mode | method | S=2 | S=3 | S=4 |
|---|---|---|---|---|
| 0 | none | 19.372 | 23.096 | 24.606 |
| 0 | nearest | 125.508 | 18.853 | 79.161 |
| 0 | bilinear | 16.352 | 19.806 | 21.241 |
| 0 | separable | 16.352 | 19.806 | 21.241 |
| 0 | **continuous** | **0.000** | **0.000** | **0.000** |
| 3 | none | 56.015 | 70.446 | 77.192 |
| 3 | nearest | 127.380 | 34.272 | 127.260 |
| 3 | bilinear / separable | 25.979 | 36.633 | 42.219 |
| 3 | **continuous** | **0.000** | **0.000** | **0.000** |
| 4 | none | 14.929 | 19.090 | 21.178 |
| 4 | bilinear / separable | 13.357 | 16.639 | 18.087 |
| 4 | **continuous** | **0.000** | **0.000** | **0.000** |
| 5 | none | 9.437 | 11.229 | 11.909 |
| 5 | bilinear / separable | 7.839 | 9.455 | 10.117 |
| 5 | **continuous** | **0.000** | **0.000** | **0.000** |

**base A, realistic** (mean of means over the four live modes and S=2,3,4):
`none 28.174`, `nearest 69.805`, `bilinear 24.348`, `separable 24.348`,
**`continuous 16.888`**.

**Real programs** (full VM, the seven op-28 textures): `none 20.782`,
`nearest 60.968`, `bilinear 20.614`, `separable 20.614`, **`continuous 19.673`**.
Per-texture, `continuous` wins clearly on 13 (4.883 vs 8.587 for `none`), 18
(5.615 vs 9.755), 19 (1.960 vs 2.145) and 20 (1.634 vs 2.049); it is a wash on 0,
9 and 17 because those textures' error is dominated by *other* resolution-dependent
ops (see §8), not by the kernel.

### What the four methods are

* **none** — keep the literal 3×3. Control.
* **nearest** — treat the taps as samples of a kernel density, reconstruct
  nearest-neighbour: each tap becomes an S×S block of weight `w/S²`.
* **bilinear** — same density view, tent reconstruction, `/S²`.
* **separable** — factorise the 3×3 into a row profile ⊗ column profile and
  tent-resample each. **Only valid when the kernel is rank 1**: modes 3, 4, 5 are,
  and there separable is *bit-identical* to bilinear; mode 0 is rank 2, and forcing
  a factorisation on it produced a mean error of ~100. The port now checks the rank
  and falls back to bilinear, which is why the two columns agree above.
* **continuous** — keep the three tap **weights** and move them to ±S texels
  (dilation). This treats the taps as *impulses*, which is what the operator
  literally is.

### Recommendation: `continuous` (dilate the taps to ±S) — now the default

Reasons, in order of weight:

1. **It round-trips exactly.** 0.000 mean, 0 max, at S = 2, **3** and 4, for every
   live mode. Nothing else comes within an order of magnitude. The odd scale S=3 is
   passed as cleanly as the even ones, which is precisely what the brief asked the
   odd scale to test.
2. **It is provably the same continuous operator.** All four live modes are pure
   *dipoles* (`Σw = 0`) — finite differences across 2 texels. A finite difference at
   a fixed *physical* separation is exactly what dilation preserves; the density
   interpretation (bilinear/nearest) silently convolves an extra low-pass into the
   operator, which is why its error is bounded away from zero.
3. **Visually it is also the closest.** Rendering mode 3 (the strongest emboss,
   tex 0) at 4× against the 1× reference: `none` gives the predicted hairline
   (fine, washed-out), `nearest` collapses to near-white, `bilinear` keeps the
   feature scale but loses contrast, `continuous` matches the reference's feature
   scale *and* contrast.
4. **`nearest` fails exactly as the brief predicted** — and worse at *even* scales
   (125.5 at S=2, 18.9 at S=3, 79.2 at S=4). The parity effect comes from
   `round(±0.5)` breaking the block symmetry, which shifts the dipole by half a
   tap. A single-scale test would have missed this in either direction.

Wired in: `runTexgen(bytes, {scale, kernel})` defaults to `kernel: 'continuous'`,
and `scale === 1` forces `kernel: 'none'` so the authentic path keeps the literal
3×3 and stays byte-identical. Box radii (`ops 25/26`) are scaled by S
unconditionally, which the numbers above justify.

---

## 8. What still does NOT scale, and needs a decision from scene work

The kernel question is settled, but the round-trip test surfaced a **separate**
resolution problem the spec did not anticipate:

**Ops 31 + 32 (spline stroke + flood fill) are not resolution-independent, and
they can fail catastrophically rather than gracefully.** The stroke is rasterised
with a square brush and the fill spreads through whatever it does not seal. At 1×
the outline happens to be watertight; at 2× **texture 9's fill escapes and floods
the whole canvas** (round-trip mean 88.6 at S=2, and identical for every kernel
method, confirming the kernel is not the cause). Textures 1, 10, 23, 24 and 25 —
the other five users of the pair — survive 2× intact, so this is a knife-edge, not
a systematic failure.

Options for the remaster (not decided here, because it is a look decision):
generate ops 31/32 at 1× and upsample the resulting mask; or seal the stroke
against the canvas border before filling; or leave texture 9 at 1×. Whatever is
chosen must be measured with the same round-trip.

Two lesser items:

* **Op 34's ramp bounds (`arg[0]`, `arg[2]`) are in texels**, so the gradient's
  ramp gets narrower relative to the image as resolution rises. It is used by
  tex 8 and 9 with `arg = 0 … 254` on a 256-wide canvas, i.e. the ramp spans the
  whole image — so scaling those two bytes by S is almost certainly right, but the
  port does **not** currently do it. Flagged rather than guessed.
* **Op 9's bar width** is in texels and is scaled by `kscale` in the port; op 9 is
  never used, so this is untested.

---

## 9. Files

| file | what |
|---|---|
| `js/texgen.mjs` | the VM. `runTexgen(bytes, {scale = 1, kernel = 'continuous'}) -> {width, height, rgba, opsUsed, unimplemented, opcount}` |
| `js/png.mjs` | dependency-free RGBA8 PNG writer |
| `js/bake_tex.mjs` | `node js/bake_tex.mjs [--scale N] [--kernel M] [--out DIR]` → 28 PNGs + `contact.png` + `manifest.json` |
| `js/kernel_scaling_test.mjs` | §7, `[--full]` |
| `baked/tex/` | the authentic (scale 1) set — the regression baseline |
| `baked/tex_2x/` | a 2× remaster set, for comparison |

The contact sheet composites over a checkerboard, because a third of these
textures are alpha-only sprites and look like blank white squares otherwise.

---

# PART II — resolution-independence audit + font atlas (2026-08-05)

Work log, appended incrementally. Baseline for the byte-identity guard: sha256 of the
29 files in `baked/tex/` taken before any edit (see §14 for the after-hashes).

## 10. Argument-unit audit — raw material

Dumped every spatial op's actual argument bytes across all 28 programs (`op 3, 9, 12,
16, 22, 25, 26, 28, 31, 32, 33, 34`). Two things jumped out immediately:

* **op 31's thickness is ALREADY resolution-scaled** and the port already does it.
  The original is `arg[8] / (256 / iw)` — an integer division *by a ratio against a
  fixed 256 reference*, so at `iw = 128` it halves the thickness and at `iw = 256` it
  keeps it. The port's `trunc(arg[8] * iw / 256)` is the same value at 128/256 and
  keeps scaling above. So the §8 hypothesis that texture 9's flood escapes because the
  stroke gets *relatively thinner* at 2x is **already excluded on inspection** — the
  stroke gets relatively slightly THICKER (thick=2 -> r=1 -> 3x3 brush at 1x; thick=4
  -> r=3 -> 7x7 at 2x, where proportionality would only ask for 6x6). The real cause
  must be elsewhere; investigated in §12.

* **op 34's argument layout is suspicious.** The three call sites are

  | tex | args |
  |---|---|
  | 8 (a) | `00 00 0f fe  cd cd cd cd  ff ff ff 00  00 00 00 ff` |
  | 8 (b) | `00 00 fd fe  cd cd cd cd  ff ff ff ff  00 00 00 00` |
  | 9     | `00 00 fe fe  cd cd cd cd  ff ff ff ff  00 00 00 00` |

  The port reads `x0 = a[0]`, `x1 = a[2]`, which makes tex 8(a) a ramp from column 0 to
  column **15** on a 256-wide canvas — implausible for a "horizontal gradient". The
  `a[1] = 0`, `a[3] = 0xfe` pattern instead looks like **two points (a[0],a[1]) and
  (a[2],a[3])**, i.e. a *directional* gradient. Settled by disassembly in §11.

## 11. op 34 — disassembled, port confirmed, ramp bounds ARE texels

`FUN_00415012` in full (`ndisasm -b 32 -o 0x415012`):

```
  w = FUN_00412c4f(canvas)        ; width
  h = FUN_00412c54(canvas)        ; height
  c0 = decodeColour(arg[8..0xb])          ; FUN_00412cde
  c1 = decodeColour(arg[0xc..0xf])
  d  = FUN_00414157(c1, c0)               ; float4 SUBTRACT  (verified: fsub x4)
  k  = [0x4170c4] / (arg[2] - arg[0])     ; [0x4170c4] = 1.0f  (read from the image)
  d  = FUN_004132f4(d, k)                 ; float4 SCALE     (verified: fmul x4)
  for x in 0..w-1:
      if      x <  arg[0]:  t = 0
      else if x >  arg[2]:  t = arg[2]        ; <-- the original's clamp bug, reproduced
      else:                 t = x - arg[0]
      for y in 0..h-1:  texel = FUN_0041343b(c0, FUN_004132f4(d, t))   ; c0 + d*t
```

So: **`arg[1]` and `arg[3]` are genuinely unused** (the `0xfe` in `a[3]` is leftover
`0xcd`-adjacent junk, not a second endpoint) — the "directional gradient" reading in §10
is **wrong**, the port's original reading is right, and `arg[0]`/`arg[2]` are texel
columns. Confirmed the constant is `1.0f`, not something scale-dependent.

Also note the clamp bug is *invisible* in practice: all three call sites have
`arg[0] == 0`, so `t = arg[2]` at the far end gives exactly `c0 + (c1-c0) = c1`.

**Classification: texel-denominated. Must be multiplied by S.** Fixed.

## 12. First full round-trip over all 28 programs (S=2, kernel=continuous)

`node js/scale_roundtrip.mjs --scales 2` after the op-34 fix. New harness
`js/scale_roundtrip.mjs` (all 28 programs; tex 11 skipped — 8192x2048 at S=4 is ~270 MB
per layer and its only op is the offline-baked font).

```
   0 23.814/185   1  7.586/255   2 14.641/ 81   3  4.585/ 35   4  0.000/  0
   5  1.262/ 31   6  1.758/ 33   7  0.493/ 11   8  0.356/ 10   9 66.702/255
  10  4.471/176  12  0.000/  0  13  4.883/ 72  14  0.226/  5  15  3.275/114
  16 16.236/ 75  17 11.194/107  18  5.615/ 51  19  1.960/ 27  20  1.634/ 33
  21  0.000/  0  22  0.237/  2  23  3.067/ 28  24  1.368/ 12  25  2.003/ 71
  26  3.555/112  27  0.230/  5
```

* **tex 8 is now 0.356** (was one of the two op-34 users) — the op-34 scaling landed.
* **tex 9 improved 88.6 -> 66.7** purely from the op-34 fix, but is still degenerate.
* The next-worst cluster (0, 2, 16, 17) is **every program that uses op 16 with
  amplitude 0x19**. That is a different phenomenon, analysed in §15.

## 13. Texture 9 — root cause. The hypothesis in the brief was WRONG; here is the real one

**The brief's hypothesis was that op 31's stroke thickness is texel-denominated and
unscaled, so the boundary thins at 2x and the fill escapes. Tested directly and it is
false**, in two independent ways:

1. The thickness is already scaled (§10) — `arg[8] / (256/iw)` in the original.
2. Measured stroke coverage on texture 9 *rises* with scale, it does not fall:
   **4.14 % at 1x, 4.68 % at 2x, 4.96 % at 3x, 5.04 % at 4x.** The boundary gets
   relatively THICKER, not thinner.

A plain 4-connected BFS on the torus from op 32's seed, blocked by the stroke:

| S | canvas | stroke | reachable |
|---|---|---|---|
| 1 | 256² | 4.14 % | **43.5 %** (sealed) |
| 2 | 512² | 4.68 % | 95.3 % (leaks) |
| 3 | 768² | 4.96 % | 95.0 % (leaks) |
| 4 | 1024² | 5.04 % | 95.0 % (leaks) |

So the outline is genuinely open at every S > 1, and the flood fill is an innocent
bystander. Locating the holes: **every hole is at x = 0, 1 or the wrapped x = 255**, for
y ≈ 19…40.

### Cause A — op 31's out-of-bounds clip is quantised, and 1x closure is an accident

Texture 9's spline overshoots the left edge. Evaluating it by hand:

```
S=1  out-of-bounds samples: k74(1.7,-0.3) k75(0.5,-4.0) k76(0.1,-6.5) k77(0.2,-7.1)
                            k78(0.5,-5.0) k81(-0.6,25.3) k82(-0.8,46.3)
                            k83(-0.6,71.8) k84(-0.1,100.1)
S=2                         ... k81(-1.3,50.6) k82(-1.6,92.7) k83(-1.2,143.5) k84(-0.1,200.2)
```

`FUN_004147ab` (the brush) starts with a hard clip — verified by disassembly, the port
is faithful:

```
  004147CA  cmp dword [ebp+0x10],0 / jl  return      ; x < 0
  004147DA  cmp [ebp+0x10],edi     / jnl return      ; x >= w
  004147E3  cmp dword [ebp+0x14],0 / jl  return      ; y < 0
  004147ED  cmp [ebp+0x14],eax     / jnl return      ; y >= h
```

and the coordinate reaching it has been through `ftol` = **truncate toward zero**. So a
sample at x = −0.6 becomes x = **0** and IS drawn; a sample at x = −1.2 becomes −1 and is
**dropped entirely** (the whole brush, not just its left half).

At 1x the overshoot is 0.1…0.8 texels — inside the "grace band" that truncation toward
zero provides. At 2x the *same normalised* overshoot is 0.2…1.6 texels and crosses −1.
**Texture 9's outline is watertight at 1x only because the overshoot happens to be less
than one texel.** That is not a property the bytecode intends; it is a rasteriser
accident that a resolution change necessarily breaks.

**Classification:** the clip bound is texel-denominated. Its scale-consistent form is to
test in *original-grid* texels: drop only when the sample is more than **S** texels
outside, and otherwise clamp into range — which is exactly what `trunc` does for free at
S = 1, so `scale = 1` is untouched (for integer coordinates, `x < 0 && x > -1` is empty).

### Cause B — op 32's `& 0xffff` coordinate wrap is only correct for power-of-two canvases

`FUN_00414b1e` stores the walker's coordinates as **words** (`dec word [ebp+0x14]`,
`movzx eax, word [ebp+0x16]` then `cdq; idiv`), i.e. `index = (u16 y) % ih * iw +
(u16 x) % iw`. Stepping left from x = 0 gives `0xffff`, and `0xffff % iw == iw − 1`
**only when `iw` divides 65536**. At S = 3 the canvas is 768 wide and `0xffff % 768 =
255`, so the walker teleports to column 255 — which is why S = 3's flood terminated
having covered only 48 % while the BFS says 95 % is reachable. The same u16 storage also
lets the coordinate drift above `iw` and eventually overflow 65535 at a wrong residue.

**Classification:** the wrap modulus is texel-denominated. Reducing `x`/`y` into
`[0, iw)` / `[0, ih)` at every step is **bit-identical for every power-of-two canvas**
(same residue) and correct for the rest, so `scale = 1` is untouched.

Both are the same shape of defect as op 34's: **a bound expressed in texels against a
grid whose size changed.** So the brief's *framing* (unit classification) holds
perfectly; only its specific guess about which parameter was at fault did not.

Both fixed in `js/texgen.mjs` (`plotThick`/`drawLine` gain a `gs` grace-band parameter
defaulting to 1; op 32 keeps `x`,`y` reduced into range). Result — the outline is now
sealed at every scale, and the flood covers the same fraction as 1x:

| S | stroke | BFS-reachable | op-32 filled |
|---|---|---|---|
| 1 | 4.14 % | 43.51 % | 47.7 % |
| 2 | 5.03 % | 43.15 % | 48.2 % |
| 3 | 5.33 % | 43.05 % | 48.4 % |
| 4 | 5.47 % | 42.97 % | — |

**`scale = 1` re-baked and diffed against the pre-work sha256 set: all 29 files
identical.**

## 14. op 16 — the only op whose PRNG DRAW COUNT depends on resolution

After §13, the residual error was dominated by exactly the four programs that use
**op 16 at amplitude 0x19** (tex 0, 2, 16, 17). Op 16 draws **one random number per
texel**, so at scale S it draws S² times as many and produces S-times-finer grain. That
field box-downsamples to a *different*, lower-variance field — a round-trip error of
~16 8-bit units at the amplitude the programs actually use, and it is irreducible while
the draws stay on the fine grid.

This is the one place the port violated `re/REMASTER.md`'s explicit rule — *"Never change
PRNG draw count or order … keep random draws on the COARSE grid and let fine texels
interpolate the same noise."* Checked the other three stochastic ops against the same
rule and they already comply: **op 3** draws fixed 1…128 lattices, **op 33** draws
`2·arg[1]` numbers for a fixed disc count, and both re-seed themselves. **Op 16 is the
only offender.**

Implemented `ctx.noisePin` (`runTexgen(..., {noise: 'pinned'|'native'})`, default
`pinned` for S > 1, no-op at S = 1): the field is drawn on the ORIGINAL grid, in the
original order and count, then block-replicated. Effect at S = 2:

| tex | native | pinned |
|---|---|---|
| 0 | 23.814 | **16.017** |
| 1 | 7.586 | **1.485** |
| 2 | 14.641 | **0.087** |
| 9 | 5.023 | **2.779** |
| 10 | 4.471 | **1.508** |
| 16 | 16.236 | **0.000** |
| 17 | 11.194 | **3.676** |
| all | 4.425 | **2.298** |

`noise: 'native'` is kept because finer grain at higher resolution is a defensible
*look* choice for a remaster even though it is not scale-consistent; the default follows
the project rule.

## 15. Round-trip over all 28 programs at S = 2, 3, 4 — final

`node js/scale_roundtrip.mjs --scales 2,3,4` (kernel `continuous`, noise `pinned`).
Mean / max absolute error in 8-bit units, against the authentic 1x bake.

| tex | size | S=2 | S=3 | S=4 |
|---|---|---|---|---|
| 0 | 256² | 16.017 / 181 | 17.547 / 180 | 16.107 / 180 |
| 1 | 256² | 1.485 / 255 | 1.883 / 255 | 2.104 / 255 |
| 2 | 256² | 0.087 / 1 | 0.112 / 2 | 0.125 / 2 |
| 3 | 32² | 4.585 / 35 | 4.932 / 33 | 5.187 / 35 |
| 4 | 32² | 0.000 / 0 | 0.000 / 0 | 0.000 / 0 |
| 5 | 16² | 1.262 / 31 | 1.685 / 41 | 1.907 / 45 |
| 6 | 8² | 1.758 / 33 | 2.367 / 43 | 2.664 / 47 |
| 7 | 256² | 0.493 / 11 | 0.640 / 14 | 0.729 / 16 |
| 8 | 256² | 0.356 / 10 | 0.467 / 13 | 0.520 / 15 |
| 9 | 256² | **2.779** / 255 | **3.657** / 255 | **4.113** / 255 |
| 10 | 256² | 1.508 / 176 | 3.069 / 244 | 1.848 / 197 |
| 12 | 32² | 0.000 / 0 | 0.000 / 0 | 0.000 / 0 |
| 13 | 256² | 4.883 / 72 | 6.267 / 88 | 7.062 / 96 |
| 14 | 256² | 0.226 / 5 | 0.299 / 7 | 0.335 / 8 |
| 15 | 16² | 3.275 / 114 | 9.108 / 197 | 4.492 / 122 |
| 16 | 512² | 0.000 / 0 | 0.000 / 0 | 0.000 / 0 |
| 17 | 256² | 3.676 / 70 | 4.655 / 83 | 5.192 / 87 |
| 18 | 256² | 5.615 / 51 | 7.272 / 66 | 8.224 / 75 |
| 19 | 256² | 1.960 / 27 | 2.514 / 33 | 2.831 / 35 |
| 20 | 256² | 1.634 / 33 | 2.056 / 39 | 2.288 / 42 |
| 21 | 256² | 0.000 / 0 | 0.000 / 0 | 0.000 / 0 |
| 22 | 128² | 0.237 / 2 | 0.281 / 2 | 0.304 / 2 |
| 23 | 128² | 3.067 / 28 | 3.977 / 36 | 4.492 / 41 |
| 24 | 128² | 1.368 / 12 | 1.591 / 11 | 1.872 / 14 |
| 25 | 128² | 2.003 / 71 | 2.638 / 88 | 2.886 / 94 |
| 26 | 128² | 3.555 / 112 | 4.117 / 115 | 4.547 / 116 |
| 27 | 256² | 0.230 / 5 | 0.633 / 25 | 0.298 / 6 |
| **mean of means** | | **2.298** | **3.028** | **2.968** |

**No program degenerates at any scale, and S = 3 behaves like S = 2 and S = 4** — the odd
scale shows no parity effect anywhere (only tex 15, a 16² canvas where S=3 gives a 48²
grid and the box-downsample is coarse relative to the content, is visibly noisier at
S=3, and it recovers at S=4).

**Texture 9 now round-trips like the rest** (66.7 -> 2.779 at S=2; it was 88.6 before any
of this work). Its remaining max of 255 is a handful of texels on the flood boundary,
where a texel that is inside the outline at 1x is outside at S x or vice versa; the mean
of 2.8 is in the same band as textures 13, 18 and 23.

### Where the remaining error comes from — attributed, not hand-waved

Per-op attribution for the worst program (tex 0), by running the VM with `stopAfter`:

```
  after op 0 = 14  (fill)          mean  0.000
  after op 1 = 16  (noise)         mean  0.000     <- pinned: exact
  after op 2 = 26  (dir blur)      mean  1.437
  after op 4 =  7  (load layer)    mean  1.437
  after op 5 = 28  (emboss, s=6)   mean 22.325     <- x15 amplification
  ...
  after op15                       mean 16.017
```

* **op 26 contributes 1.437** and that is a *resampling* floor, not a unit defect:
  op 26 is `rotZoom(x2) -> box blur -> rotZoom(x0.5)`, and the zoom-out step minifies by
  2 with a 2-tap cosine filter. At 1x that samples every 2 original texels; at S x it
  samples every 2/S original texels, so it aliases *differently*. Isolated measurement
  (block-replicated input, so the operator is the only variable):
  white-noise input **1.531 / 1.785 / 1.559** at S = 2/3/4, op-3-noise input
  **0.931 / 3.264 / 0.987**. Both small and both flat in S — an operator property, not a
  divergence.
* **op 28 mode 3 at strength 6 multiplies it by ~15.** That kernel is
  `[-6 0 +6] x 3` — a gain-18 finite difference that then clamps to [0,1]. The kernel
  itself round-trips **exactly** (§7.2: `continuous` = 0.000 at every S). So tex 0's 16
  is an extreme high-pass amplifying a 1.4-unit input difference, not a scaling bug.
* Everything else sits on the **op-3 point-sample-vs-area-average floor** documented in
  §7 (4.221 / 5.305 / 5.861 for raw noise), attenuated by later blurs or amplified by
  later embosses. tex 3 (a single op-3 call) is 4.585/4.932/5.187 — i.e. exactly the
  floor, as it must be.

## 16. THE ARGUMENT-UNIT CLASSIFICATION TABLE (the deliverable)

Every argument of every handler, classified. Categories:

* **N** — *normalised*: the value is divided by 255 and multiplied by a canvas dimension,
  or is a pure ratio/angle/index/count. Scales for free; no change needed.
* **T** — *texel-denominated*: the value is a length, coordinate or bound measured in
  texels of the canvas. **Must be multiplied by S.**
* **D** — *dimensionless per-texel*: colour, gain, mode selector, seed. No spatial
  meaning at all.
* **G** — *grid-structural*: not an argument but a property of the handler that is
  expressed in texels (a clip bound, a wrap modulus, a kernel extent, a draw count).
  These are the ones the brief's framing predicted would be missed, and they are where
  every remaining defect actually lived.

| op | argument / property | cat | in the original | port at scale S | status |
|---|---|---|---|---|---|
| 2 | `u16@0` zoom | N | `1/(u16/255)`, a pure ratio | unchanged | ok |
| 2 | `u16@2` angle | D | degrees | unchanged | ok |
| 2 | rotate centre | G | `iw>>1, ih>>1` | scales exactly (even sizes) | ok |
| 3 | `u16@0` seed | D | `srand` | unchanged | ok |
| 3 | `u32@4` colour | D | | unchanged | ok |
| 3 | octave lattice sizes | G | pinned 1,2,4…128 **independent of canvas** | unchanged — already the pinned-lattice rule | ok |
| 7 | `a[0]` slot | D | index, `0xff` = none | unchanged | ok |
| 9 | `a[0]` bar width | **T** | `half = a[0]>>1` texels | `round((a[0]>>1)·S)` | scaled (untested — op 9 unused) |
| 9 | `a[1]` bar count | N | `step = iw/count` | unchanged | ok |
| 9 | `u32@4` colour | D | | unchanged | ok |
| 10 | — | D | per-texel invert | — | ok |
| 12 | `a[0]` spread | N | multiplies `x/halfW` | unchanged | ok |
| 12 | `a[1]` sigma | N | `/255`, applied to normalised r | unchanged | ok |
| 12 | `u32@4` colour | D | | unchanged | ok |
| 14 | `u32@0` colour | D | | unchanged | ok |
| 16 | `a[0]` amplitude | D | `sqrt(a[0]/255)` | unchanged | ok |
| 16 | `a[1]` seed | D | `srand` | unchanged | ok |
| 16 | **draw count** | **G** | **one `rand()` per texel** | **pinned to the 1x grid** | **FIXED §14** |
| 17 | `CreateFontA` cHeight | **T** | `ftol(width · [0x419034])` — derived FROM the canvas width | scales for free | ok (see §17) |
| 18 | `a[0]` src/dst/mode | D | | unchanged | ok |
| 19 | `u16@0` brightness, `a[2]` contrast | D | per-texel | unchanged | ok |
| 21 | `u16@0` hue, `a[2]` sat, `a[3]` val | D | per-texel | unchanged | ok |
| 22 | `a[0]`,`a[1]` offset | N | `a/255 · iw`, `a/255 · ih` | unchanged | ok |
| 22 | loop bound | G | uses the WIDTH accessor twice (original bug) | reproduced | ok (bug preserved) |
| 25 | `a[0]` blur width | **T** | box of `a[0]` texels | `round(a[0]·S)` | scaled |
| 26 | `a[0]` blur width | **T** | box of `a[0]` texels, inside a x2 zoom | `round(a[0]·S)` | scaled |
| 26 | `a[1]` angle | D | `a/255·360` | unchanged | ok |
| 26 | the x2 / x0.5 zoom pair | G | minify-then-magnify; resampling loss is scale-dependent | left alone | **irreducible, 1.4–1.8 units, §15** |
| 28 | `a[0]&7` mode, `a[0]>>3` strength | D | | unchanged | ok |
| 28 | 3x3 kernel extent | **G/T** | taps at ±1 texel | taps dilated to ±S (`continuous`) | scaled, exact (§7.2) |
| 30 | — | G | `dst(x,y)=src(y,ih−x)`, square only | scales exactly | ok |
| 31 | `a[0]` point count, `a[1]` tension | D | | unchanged | ok |
| 31 | `u32@4` colour | D | | unchanged | ok |
| 31 | `a[8]` thickness | **T** | `a[8] / (256/iw)` — **already** relative to a fixed 256 reference | `trunc(a[8]·iw/256)`, identical at 128/256 | **already scaled** |
| 31 | control points `a[0x0c+]` | N | `iw·(byte/255)` | unchanged | ok |
| 31 | spline parameter step | G | `n·10` samples, chords joined by Bresenham | unchanged (chords still connect) | ok |
| 31 | **brush clip bound** | **G** | hard `x<0 \|\| x>=w` on a `trunc`-toward-zero coordinate — a 1-texel grace band on the negative side | grace band widened to S texels + clamp | **FIXED §13** |
| 32 | `a[0]`,`a[1]` seed position | N | `iw·(a/255)`, `ih·(a/255)` | unchanged | ok |
| 32 | `u32@4` colour | D | | unchanged | ok |
| 32 | visit counter (=4) | D | 4 directions | unchanged | ok |
| 32 | **coordinate wrap modulus** | **G** | u16 storage, `(u16 x) % iw` — correct only when `iw \| 65536` | reduced into `[0,iw)` each step | **FIXED §13** |
| 33 | `a[0]` radius | N | `iw·(a[0]/255)` | unchanged | ok |
| 33 | `a[1]` disc count | D | fixed count -> fixed draw count | unchanged | ok |
| 33 | disc centres | N | `iw·rand()/32767` | unchanged | ok |
| 33 | `a[0x0c]` seed, colours @4/@8 | D | | unchanged | ok |
| 33 | the 8-bit min-composite buffer | G | `255·d/r` — normalised inside the disc | unchanged | ok |
| 34 | `a[0]`, `a[2]` ramp columns | **T** | texel columns (disassembled, §11) | `a·S` | **FIXED §11** |
| 34 | `a[1]`, `a[3]` | — | **unread by the handler** | — | n/a |
| 34 | colours @8 / @0x0c | D | | unchanged | ok |
| c3,c4,c6,c7 | — | D | stack manipulation | unchanged | ok |
| c8 opacity, c9 blend, c10 colour-mask, c12 broadcast | D | | unchanged | ok |

### Unclassifiable arguments

**None.** Every argument of every handler resolved into one of the four categories.
The two genuinely ambiguous-looking ones were resolved by disassembly rather than
guessed: op 34's `a[1]`/`a[3]` are **not read at all** (§11), and op 31's `a[8]` is
already scale-relative rather than absolute (§10).

### The one thing the classification does NOT reach

Category **G** — the grid-structural properties — is where all three real defects were,
and it is a category the "classify the arguments" framing does not generate on its own:
none of them is an argument. They only surface by asking *"what else in this handler is
measured in texels?"* — clip bounds, wrap moduli, kernel extents, and PRNG draw counts.
That question is the reusable form of the lesson; it is recorded in
`re/gen/TEXGEN.md` §3d's terms as an extension, and it is what caught op 16 (which no
program exercised hard enough at 1x to expose, exactly as the brief predicted).

---

## 17. Op 17 — the GDI font atlas, fully reverse-engineered

`FUN_004136a2` (the op-17 handler) and `FUN_00413479` (the GDI worker), disassembled.
Ghidra dropped **every** argument of the twelve GDI calls and mis-typed the loop
variables, so all of this is from `ndisasm` plus the import-name block.

### The imports

The rebuilt PE's IAT is filled at runtime, so Ghidra has no names. The packer's name
table is at **VA 0x48508d** and the gdi32 block is, in order:
`TextOutA, GetDIBits, CreateFontA, CreateCompatibleDC, SelectObject, SetBkMode,
DeleteDC, DeleteObject, CreateCompatibleBitmap, SetTextAlign, SetDIBits, SetTextColor`
— mapping one-for-one onto IAT slots `0x417000 … 0x41702c`. `0x417080` is user32's
`GetDC` (it is called with one argument at 0x413529 and again at 0x413552, in both cases
`GetDC(NULL)`; the three pushes preceding the second one are
`CreateCompatibleBitmap`'s).

### The two fonts

```
  cHeight = ftol(canvasWidth * [0x419034])      ; [0x419034] = 0.0390625f = 1/25.6
          = ftol(2048 / 25.6) = 80              ; POSITIVE -> a CELL height (tmHeight)

  CreateFontA(80, 0, 0, 0,  100, 0,0,0, 0, 0, 0, 4, 0, "times new roman")   ; regular
  CreateFontA(80, 0, 0, 0,  700, 0,0,0, 0, 0, 0, 4, 0, "times new roman")   ; bold
```

Argument by argument (pushes at 0x413496 and 0x4134b0, 14 each):

| CreateFontA param | value | meaning |
|---|---|---|
| cHeight | **80** | positive -> match **tmHeight** (cell), not em size |
| cWidth | 0 | aspect from the font |
| cEscapement / cOrientation | 0 / 0 | no rotation |
| cWeight | **100** / **700** | FW_THIN -> resolves to Regular; FW_BOLD -> real TNR Bold |
| bItalic / bUnderline / bStrikeOut | 0 / 0 / 0 | none |
| iCharSet | **0** | ANSI_CHARSET |
| iOutPrecision | **0** | OUT_DEFAULT_PRECIS |
| iClipPrecision | 0 | CLIP_DEFAULT_PRECIS |
| **iQuality** | **4** | **ANTIALIASED_QUALITY** — AA is explicitly requested |
| iPitchAndFamily | 0 | DEFAULT_PITCH \| FF_DONTCARE |
| pszFaceName | `"times new roman"` @0x41aa6c | |

`iQuality = 4` is the answer to the question the brief flagged: this is **2001-era
grayscale antialiasing**, not aliased and not ClearType (which did not ship until
Windows XP and is `CLEARTYPE_QUALITY = 5`).

### The DC / bitmap / DIB

```
  bmi.biSize=40  biWidth=2048  biHeight=512  biPlanes=1  biBitCount=32  biCompression=BI_RGB
  memDC = CreateCompatibleDC(GetDC(NULL))
  SelectObject(memDC, regularFont)
  SetBkMode(memDC, 1)                      ; TRANSPARENT
  hbm = CreateCompatibleBitmap(GetDC(NULL), 2048, 512)
  SelectObject(memDC, hbm)
  SetTextColor(memDC, 0x00ffffff)          ; WHITE
  SetTextAlign(memDC, 0)                   ; TA_LEFT | TA_TOP | TA_NOUPDATECP
  for i in 0..511:  SetDIBits(memDC, hbm, 511-i, 1, buf + i*2048*4, &bmi, 0)
```

The `511-i` start-scan is the bottom-up-DIB vertical flip. **The existing canvas is
uploaded into the bitmap first**, so the text composites over whatever the layer already
holds (for res 11 that is black), and `SetBkMode(TRANSPARENT)` means the glyph boxes do
not erase it.

### The four TextOutA calls — this is the atlas layout

`ebp = canvasHeight / 4 = 128`, and the two spare stack slots hold `2*ebp = 256` and
`3*ebp = 384`:

| # | font | x | y | string | len |
|---|---|---|---|---|---|
| 1 | regular | 0 | **0** | `a b c … z 0 1 … 9 , ! ? '` @0x41aa1c | 79 |
| 2 | regular | 0 | **128** | `A B C … Z ( ) [ ] : .` @0x41a9dc | 63 |
| 3 | **bold** | 0 | **256** | lowercase string | 79 |
| 4 | **bold** | 0 | **384** | uppercase string | 63 |

So the strip is **four rows of 128 px**, and the port report's earlier claim that only
the two charset strings are drawn was incomplete — **each is drawn twice, regular and
bold.** The two strings verbatim:

```
0x41aa1c  "a b c d e f g h i j k l m n o p q r s t u v w x y z 0 1 2 3 4 5 6 7 8 9 , ! ? '"
0x41a9dc  "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ( ) [ ] : ."
```

### Read-back and channel routing

```
  for i in 0..511:  GetDIBits(memDC, hbm, 511-i, 1, buf + i*2048*4, &bmi, 0)
  for i in 0..2048*512-1:  ((u8*)buf)[i*4+3] |= 0xff        ; force the top byte
  DeleteObject(hbm); DeleteDC(memDC); DeleteObject(regularFont)
```

then `FUN_004136a2` unpacks each `u32` (which is `0xAARRGGBB`, i.e. B,G,R,A in memory =
the Windows DIB byte order) into the float canvas:

```
  0041373C  shr ebx,0x10 / and 0xff   -> comp1  (R)     ; fstp [eax-4], eax = &comp2
  00413754  shr ebx,0x8  / and 0xff   -> comp2  (G)
  00413768  and 0xff                  -> comp3  (B)
```

**Component 0 (alpha) is never written** — confirming the port's note. The instruction's
channel mask is `0x07` (= comps 1,2,3 per §2's inversion), so the layer keeps its alpha
of 1.0 and the glyphs land in RGB as white-on-black coverage.

## 18. The atlas layout is SELF-DESCRIBING — the consumer scans it

Before assessing how closely the offline bake matches GDI, it matters enormously **how
the demo consumes the atlas**. `FUN_004056xx` (the block around line 5690 of
`re/out/sonnet.c`, right after `FUN_00416036(0xb, 0x800, 0x200, buf)`):

```
  buf[i] &= 0xff                     ; keep only the B channel (component 3)
  FUN_00406c98(buf, 0x00, 0x28, 0x000)   ; glyphs   0.. 39, band y = 0     regular lower
  FUN_00406c98(buf, 0x80, 0xa8, 0x100)   ; glyphs 128..167, band y = 256   BOLD lower
  FUN_00406c98(buf, 0x28, 0x48, 0x080)   ; glyphs  40.. 71, band y = 128   regular upper
  FUN_00406c98(buf, 0xa8, 0xc8, 0x180)   ; glyphs 168..199, band y = 384   BOLD upper
  buf[i] = buf[i] << 24 | 0xffffff   ; coverage becomes ALPHA, RGB forced white
```

and `FUN_00406c98(atlas, first, last, yBand)` walks the strip **column by column over a
128-row band looking for a non-zero pixel**, splitting the row into glyph boxes at the
blank columns. The character -> glyph-index map built just above it is:

```
  'a'..'z' -> 0..25      '0'..'9' -> 26..35     ',' 36   '!' 37   '?' 38   '\'' 39
  'A'..'Z' -> 40..65     '(' 66  ')' 67  '[' 68  ']' 69  ':' 70  '.' 71
  bold: the text parser sets text[i] |= 0x80, which selects index+128 -> the y=256/384 bands
```

40 lowercase-row glyphs and 32 uppercase-row glyphs — **exactly** the glyph counts of the
two strings, which independently confirms both the strings and the four-row layout. This
also confirms `re/text/parse_poem.py`'s note that attr bit 0 = BOLD sets `text[i] |= 0x80`.

**Consequence: glyph advance widths do not have to match GDI.** The demo derives every
glyph's UV rectangle from the rendered pixels, not from a metrics table. What must match
is: the glyph **order**, the **four bands** at y = 0/128/256/384, and the fact that
consecutive glyphs are separated by at least one fully blank column (guaranteed by the
space-separated strings). Everything else is self-correcting.

## 19. The offline font bake — what it is, and where it CANNOT match GDI

`js/bake_font.mjs` renders the atlas with node-canvas (cairo/FreeType) and the real
`/System/Library/Fonts/Supplemental/Times New Roman.ttf` + `Times New Roman Bold.ttf`;
`js/bake_tex.mjs` injects it as texture 11. Run it once per scale:

```
  node js/bake_font.mjs --scale 1     -> baked/font_atlas_1x.png  (2048x512)
  node js/bake_font.mjs --scale 2     -> baked/font_atlas_2x.png  (4096x1024)
  node js/bake_tex.mjs  --scale 1     -> picks up baked/font_atlas_1x.png automatically
```

If the atlas file is missing, `bake_tex.mjs` prints a warning and texture 11 bakes black
as before — the dependency is opt-in and offline, nothing at runtime needs node-canvas.

**Font identity is confirmed, not assumed.** `fc-match "Times New Roman"` resolves to the
real Microsoft face, and the metrics prove it: space advance measures **18.000 px** at
72 px = 512/2048 em, and `a` measures **31.96 px** = 909/2048 em — both are Times New
Roman's own values, and both differ from macOS's `Times.ttc` (space 20.0). The row widths
land at 2009 / 1940 / 2076 / 2016 against a 2048-wide strip, i.e. the author sized the
font to fill the strip — strong independent confirmation that ppem = 72 is right.

### Verified to match

* face, weights (Regular for `cWeight = 100`, real Bold for 700), no italic
* em size 72 px, derived from `cHeight = 80` by GDI's own
  `MulDiv(80, 2048, usWinAscent + usWinDescent)`; the resulting
  `tmAscent + tmDescent = 64 + 16 = 80` reproduces the requested cell height exactly
* baseline at `y + 64` (TA_TOP means y is the top of the cell)
* the four rows, their y positions, their fonts and their strings
* white on black, background preserved (TRANSPARENT background mode)
* grayscale antialiasing (the original asks for `ANTIALIASED_QUALITY = 4`, so AA is
  correct and ClearType would be wrong)
* per-glyph **integer** pen advances (GDI's `TextOutA` accumulates integer advances;
  cairo positions subpixel by default, which drifts several px across 79 characters, so
  the bake draws character by character on whole-pixel origins)
* channel routing: RGB written, alpha left to the VM

### Where it CANNOT match, honestly

1. **Rasteriser and hinting.** GDI at 72 ppem grid-fits the outlines with the font's own
   TrueType hinting program; FreeType's interpreter, autohinter and stem-darkening
   choices differ. Individual glyph stems will land on different pixels and AA fringes
   will differ by 1 pixel here and there. **This is unfixable without running Windows
   GDI, and it is the largest divergence.** Not measured — there is nothing to measure
   against.
2. **The AA filter itself.** `ANTIALIASED_QUALITY` produces GDI's 4x4-ish coverage
   downsample with its own gamma; cairo does exact analytic coverage. Even with
   identical outlines the grey ramps would not be equal.
3. **Advance widths.** Reproduced as integers, but GDI's integers come from *hinted*
   advances (`GetCharWidth32` after grid-fitting), not from rounding the linear advance.
   Measured effect: row widths differ from the linearly-rounded sum by up to ~22 px over
   63 characters (the uppercase row measures 1917.5 px unrounded, 1940 px integer-
   accumulated). **Per §18 this does not matter** — the consumer re-derives every glyph
   box from the pixels.
4. **The bold lowercase row overruns the strip.** Its advance sum is **2074.8 px
   unrounded / 2076 px integer-accumulated** against a 2048-wide bitmap, so the trailing
   `'` starts at x ~= 2055 and falls off the right edge; the glyph-scan for index 0xa7
   (bold apostrophe) finds nothing. The overrun is 1.3 %, i.e. it is present in the
   *unrounded* widths too, so the original almost certainly lost the bold apostrophe as
   well — but that depends on GDI's hinted advances and **I cannot verify it without
   Windows, so it is stated as likely, not proven.**
5. **Scale > 1.** `--scale N` renders at `72·N` px with positions multiplied by N. That
   is genuinely re-rendered type rather than an upscale (the point of the remaster), but
   the per-glyph integer rounding at N x is not N times the rounding at 1 x, so glyph
   origins drift by a pixel or two relative to a scaled 1 x layout. Harmless for the same
   reason as (3).
6. **No pixel-match is claimed and none was measured.** There is no ground-truth atlas
   dumped from the running exe; this is a reconstruction from the API call sequence, and
   the only quantitative checks are the metric identities above.

## 20. Baked-set state after Part II

```
  node js/bake_font.mjs --scale 1
  node js/bake_tex.mjs  --scale 1 --out baked/tex        # authentic
  node js/bake_font.mjs --scale 2
  node js/bake_tex.mjs  --scale 2 --out baked/tex_2x     # remaster
```

**sha256 over `baked/tex/`, before vs after all of Part II: 27 of the 29 files are
byte-identical. The two that changed are `11.png` (the font atlas, previously black —
this is Task 2's whole point) and `contact.png` (which contains it).** All 27 texture
PNGs that existed as real content before are unchanged, so the `scale = 1` regression
guard holds.

---

## 21. Task 3 — op 21's HSV chain, disassembled and corrected

`FUN_00413a01` (RGB->HSV) and `FUN_00413b24` (HSV->RGB) fully disassembled, x87 stack
tracked by hand. Constants read from the image: `[0x4170c8] = 0.0`, `[0x4170c4] = 1.0`,
`[0x418200] = 2.0`, `[0x418230] = 4.0`, `[0x41903c] = 60.0`, `[0x419040] = 1/60`,
`[0x419038] = 360.0`, `[0x418e88] = 600.0`.

### FUN_00413a01 (RGB -> HSV) — the port was already exactly right

The max/min are built by the `fcom`/`jnc`/`jna` ladder at 0x413a0d…0x413a53, `s` by
`(MAX−MIN)/MAX` with an exact `MAX == 0.0` test, and the sector chain by three
`fcomp st2` tests against MAX in the order **R, G, B**, giving `(G−B)/D`,
`(B−R)/D + 2`, `(R−G)/D + 4`, then `× 60` and `if (h < 0) h += 360`. The
never-taken fall-through at 0x413ad8 loads `[ebp+0xc]` = **B**, which is exactly the
port's `let f = b;` initialiser — so even the dead branch matches.
**Verdict: confirmed, no bug.** Promote op 21's rgb2hsv from medium-high to **high**.

### FUN_00413b24 (HSV -> RGB) — one real divergence found

The six sector cases were traced individually through the `dec eax / jz` chain
(0x413be7…0x413bfa) and all six match the port's `switch (i)` exactly, including
`h == 360 -> 0` and the `p/q/t` definitions. The `i > 5` fall-through at 0x413c47 loads
`[ebp+8]` — the *destination pointer* reinterpreted as a float, i.e. garbage — but `i` is
always 0..5 because `h ∈ [0, 360)`, so it is unreachable; the port's `default:` covering
it as case 5 is a strictly safer no-op.

**The divergence is the `s == 0 && h != 600` branch at 0x413b53.** It builds its result
from **four** `fldz`, so it zeroes **component 0 (alpha)** as well — unlike every other
path, which forwards `fld [esi]`. The port was preserving alpha. Fixed.

Reachability: `rgb2hsv` sets `h = 600` whenever `s == 0`, so this branch is reached only
when op 21's own `sat += ds` clamps a *hued* colour's saturation to exactly 0, i.e. only
for a negative `ds`. Two of the four op-21 call sites have one:

| tex | dh | ds | dv |
|---|---|---|---|
| 0 | 0 | +0.1529 | +0.1137 |
| 2 | 324 | **−0.2000** | −0.0667 |
| 18 | 145 | +0.0118 | −0.0039 |
| 20 | 318 | **−0.0039** | +0.0118 |

**Measured effect on the bake: zero.** All four op-21 instructions carry channel mask
`0x07` (= components 1,2,3), so the masked write-back never copies component 0 into the
layer. Re-baking with the corrected handler produces **byte-identical PNGs for all 28
textures**. The correction is therefore free: the port is now faithful to the binary and
the regression guard is untouched.

`node js/verify_ops.mjs` checks all of this:

* **1a — round trip.** 14 probe colours through op 21 with the most neutral byte deltas a
  `u8` can express (128 -> +0.00392). Worst error **0.0039** = exactly one byte step, on
  the greys only (where the delta lands on `v`); the six pure hues and the four mixed
  colours come back **bit-exact**.
* **1b — hue rotation.** The same probes rotated +120° and compared against an
  independently written textbook HSV. Every hued colour matches to **0.0000**
  (red->green->blue->red, yellow->cyan->magenta, orange 30°->150°, 0.2/0.4/0.6 at
  h=210°, 0.9/0.1/0.3 at h=345°). The only non-zero residuals are the achromatic probes,
  where the reference and the binary legitimately differ over whether a hueless colour
  takes the saturation delta (the binary does not — the whole hue/sat block is inside
  `if (h != 600)`).
* **1c — the zeroing branch**, exercised directly: `A=1, RGB=(0.6,0.5,0.5)` with
  `ds = −1` returns `0.000 0.000 0.000 0.000`.

## 22. Task 3 — ops 2, 9, 18 exercised for the first time

None of the 28 programs uses these three, so they were ported-but-unrun.
`js/verify_ops.mjs` hand-assembles synthetic programs (header + instruction stream, same
encoding as the archive) and runs them through the real VM:

```
  op2  rot+zoom  (zoom u16=510 -> x0.5, angle 30)  128x128  colours  313  changed  99.4%
  op2  rot+zoom  (zoom u16=128 -> x2,   angle 45)  128x128  colours  328  changed  99.3%
  op9  vertical bars (width 6, count 8)            128x128  colours  338  changed  37.5%
  op9 bars then op2 rotate 45                      128x128  colours 1599  changed  99.6%
  op18 mode 0 swap R<->B  (arg 0x0d)               128x128  colours  343  changed 100.0%
  op18 mode 1 copy        (arg 0x1d)               128x128  colours  277  changed 100.0%
  op18 mode 2 mean        (arg 0x2c)               128x128  colours  266  changed  97.9%
```

`--png DIR` writes the results. Visually inspected:

* **op 9** produces exactly 8 evenly spaced vertical bars of the specified colour,
  6 texels wide, over the noise. Coverage 37.5 % = 8 bars x 6 px / 128 — the arithmetic
  checks out on the nose.
* **op 2** on that bar field rotates it to a clean 45° diagonal with the bars intact,
  which is what confirms it: on isotropic noise a rotation is invisible, on bars it is
  unmistakable.
* **op 18** mode 0 swaps R and B (blue noise -> orange), mode 1 copies (-> magenta),
  mode 2 averages (-> desaturated teal). All three modes behave as the disassembly says.

**All three ops execute correctly and produce structured output.** They remain
unverifiable *against the original* (there is nothing to compare to), but they are no
longer unrun.

## 23. Files added / changed in Part II

| file | what |
|---|---|
| `js/texgen.mjs` | op 34 scaling; op 31 clip grace band; op 32 wrap modulus; op 16 pinned noise (`{noise}`); `{stopAfter}` diagnostic knob; op 21's alpha-zeroing branch |
| `js/scale_roundtrip.mjs` | **new** — round-trip over all 28 programs, `--scales`, `--only`, `--kernel`, `--noise`, `--json` |
| `js/bake_font.mjs` | **new** — offline GDI font-atlas reproduction (node-canvas + real Times New Roman) |
| `js/verify_ops.mjs` | **new** — op-21 HSV hand-trace + synthetic programs for ops 2, 9, 18 |
| `js/png.mjs` | added `decodePNG` (8-bit RGBA, non-interlaced) |
| `js/bake_tex.mjs` | injects `baked/font_atlas_<N>x.png` as texture 11; warns if absent |
| `baked/font_atlas_1x.png`, `baked/font_atlas_2x.png` | **new** — the rendered atlases |
| `baked/tex/`, `baked/tex_2x/` | re-baked; at scale 1 only `11.png` and `contact.png` differ from before |

### Still uncertain after Part II

1. **The font atlas is not pixel-matched to GDI** and cannot be without Windows (§19).
2. **Op 26's zoom-out resampling loss** (1.4–1.8 units) is scale-dependent by
   construction; making it scale-consistent would mean deliberately aliasing the
   high-resolution path, which is a look decision, not a correctness one (§15).
3. **Op 16's `pinned` default is a policy choice**, not a proof. It follows
   `re/REMASTER.md`'s explicit rule and it round-trips exactly, but `native` (finer grain
   at higher resolution) is a defensible alternative and is kept available.
4. **Ops 2, 9, 18 are now known to run**, but still have no ground truth (§22).
5. **Still no ground-truth texture dumped from the running exe.** Everything rests on
   disassembly, internal consistency and the reference video.

---

## ⚠⚠ SELF-SEEDING IS NOT ENOUGH — THE EXIT STATE ANCHORS EVERYTHING AFTER (2026-08-11)

This file, and a comment in `op 3`, asserted:

> Safe for the same reason op 16 is: this op seeds itself from its own bytecode
> (`srand(dv.getUint16(0))`), so a changed draw count cannot desync anything.

**That is false, and it broke the forest.**

Self-seeding makes an op's ENTRY state irrelevant. It says nothing about its
EXIT state — and the exit state is the anchor for every draw that follows.
For texture 3 the very next consumers are `FUN_0040b0b0`'s per-instance
**billboard yaws**, so:

| texture scale | op-3 draws | exit state | consequence |
|---|---|---|---|
| 1 | 21,845 | `0xb67fd936` | the authentic forest |
| 2 | 87,380 | `0xed8e6b2f` | **every tree rotated differently** |
| 4 | 349,520 | `0x1a411bfb` | different again |

`D(S) = S² · 21845` (eight octaves, `n²` draws each, `n` doubling from `S`),
confirmed analytically and against the live stream.

**Jasper found it from the far end of the chain**, without seeing any of this:
*"in the original the canopy is set up so the pulses of the sun coincide with
leaves moving in front of it; our impostor has leaves in other places."* The
sun's flare is an occlusion probe at one screen point, so it reads leaf
PLACEMENT directly — something RMSE, which averages the frame, cannot separate
from leaf QUANTITY.

### The audit, and the fix

Testing all 28 programs' exit states at scale 1 / 2 / 4 found **six offenders**:
programs 0, 2, 9, 10, 16 and 17 — every one of them via op 3 or op 16, the two
self-seeding ops whose draw count scales with resolution.

Both now restore the stream to the SCALE-1 exit state on the way out. Pixels are
untouched at every scale (the restore happens *after* generating), and the S = 1
path is guarded off entirely, so the authentic path is unchanged by
construction. Re-audited: **no program's exit state depends on scale.**

**This also resolves the old pinned-vs-native tension properly.** Op 16 was
pinned to the original lattice to keep the stream stable, which produced the
"more like a mosaik" blockiness; it was then flipped to native, which fixed the
look and silently reintroduced the desync. Restoring the exit state gives both
— native fine noise AND an identical stream. The choice was never actually
between them.

**Measured.** Authentic path unchanged, exactly as it must be: median 25.91,
mean 27.56, worst 81.5. **Remaster path: mean 28.36 → 27.22, worst
114.48 → 81.81, median 25.42 → 25.31**, scene 2 22.72 → 22.56. And the default
path's first-cluster yaws now match the authentic path's
(`preYaw 0xb67fd936`, angles 4.613397 / 5.500256 / 3.779652) where they
previously did not.

### The rule

**An op may change its own draw count freely ONLY if it also restores its exit
state.** "It reseeds itself" licenses the entry, never the exit. Any remaster
knob that alters how many randoms a generator consumes must be audited this way
— the test is three scales, one seed, compare the exit state.
