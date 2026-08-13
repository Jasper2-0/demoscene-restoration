# Scene 3 — the cloud sea (obj 6, sceneIdx 3, 0x0f00–0x1200)

Current-state entry point for scene 3, written 2026-08-11 from a step-through of
the descriptor, the port and the binary. Provenance per `re/CONVENTIONS.md`.

## What the scene actually is

The **smallest scene in the demo**. Its descriptor asks for four things:

```
flags   cloudLayer, cloudOpt10, cloudOpt11, buildBirds
arrays  G = 1 record: 4 instances, species 1, centre (0,300,0), radius 100
        A..F all empty — no terrain mesh, no water, no billboards, no props
terrainScale (5, 0.001, 5)     terrainVisible NOT set
sunPosition (0,440,400)        fogColour 0xC8C8FF        cloudCount 3
cloudSize 200                  cloudColour 0xffffff      cloudParam 180
```

So: a cloud layer, four birds, the flare, and the always-on ground/shadow bakes
whose output is never seen. **Anything wrong in this scene is the cloud
layer** — which is why it was worth stepping through rather than sampling.

## The rendering chain, and what was verified against the binary

| stage | port | binary | verdict |
|---|---|---|---|
| noise quads → rt256 | `flags 0x1811` | `0040ED09 push 0x1811` | ✓ |
| rt256 blit → rt512 | `flags 0x1111` | `0040EE45 push 0x1111` | ✓ |
| sky material (no bit 11) | `0x1050` | `0040F213 push 0x1050` | ✓ |
| sky material (bit 11) | `0x3091` | `0040F23F push 0x3091` | ✓ |
| blit alphaRef | `desc[0x1b]` = 180, rewritten per frame | `0040F391 mov [eax+0x14],cl` | ✓ |
| rt256 clear | **black** | `0040F39A and dword [0x474790],0x0` | ✓ |
| rt512 clear | **fog colour** | `0040F3C9 mov [0x474790],edi` (saved at `0040F394`) | ✓ |
| sky geometry | 8 stacked layers, alpha `max(t,1−t)` | `FUN_0040ec28` shape branch | ✓ |
| stage-0 `SUBTRACT` dissolve | implemented (`op==10 → a1-a2`) | flag 0x2000 | ✓ |

**A hypothesis I formed and then refuted by disassembly:** that the two clear
colours were swapped (rt256←fog, rt512←black). They are not; the original
zeroes the clear-colour global for rt256 and restores the scene's for rt512,
exactly as the port does. Worth recording so nobody re-runs it.

## ★ THE DIVERGENCE: the per-frame cloud vertex GREY was never ported

`FUN_00408eef`, VA **0x4091e4–0x4092e9**, gated on `desc[0x50] & 8`
(= `cloudOpt11`). **Object 6 is the only descriptor with that bit, so this
block is scene-3-only** — which is why it survived every other scene's review.

Ghidra emitted the value as a bare `lVar14 = FUN_00404224();` with **no
argument** — the project's familiar dropped-x87 pattern — so the expression only
exists in the disassembly:

```
004091F2  fld [esi+0x150] ; clamp t150 into [0,1]        (0x4170c8=0, 0x4170c4=1)
0040922A  fmul  dword [0x418eb4]      ; t150 * 31.0
00409230  fsubr dword [0x418eb4]      ; 31.0 - t150*31.0
00409236  call  0x404224              ; grey = ftol(31 * (1 - t150))
00409243+ for each cloud-layer vertex (stride 0x2c, diffuse at +0x18):
            diffuse = (diffuse & 0xff000000) | grey<<16 | grey<<8 | grey
          f = max(0, (t150 - 0.75) * 4.0)                (0x418eb0, 0x418230)
          obj(this+0x3c).0xd8 = .0xdc = f * 2000.0 + 300.0   (0x418eac, 0x418e78)
          if (m10 fired) t150 += dt * 0.003                  (0x418ea8)
```

**Two facts that make this the whole story:**

1. **The grey is 31, not 255.** `buildCloudSky` colours those vertices
   `desc.cloudColour` = `0xffffff` and nothing ever overwrote it, so the port
   drew the cloud sea **255/31 = 8.2× too bright**. With material `0x3091`
   (additive) that saturates the entire lower field to flat white and destroys
   the billow structure.
2. **The write is NOT gated on m10.** Only the `t150` accumulation is. The port
   read the gate as covering both, so even the *static* grey never happened —
   which is why the scene was blown out from its first frame, not just after
   the m10 event at 0x1100.

### Measured

Scene 3 median **29.17 → 27.55**, worst **37.01 → 34.41**. The fade window,
where both effects compound, moves most:

| pos | before | after |
|---|---|---|
| 0x1130 | 37.01 | **21.71** |
| 0x1128 | 31.35 | **19.30** |
| 0x1120 | 23.99 | **20.34** |
| 0x1138 | 11.36 | **9.26** |

Visually decisive: at 0x1000 the flat white lower field becomes billows with
lavender shading; at 0x1130 the frame is now near-identical to the reference.
No other scene's median moved (the gate is scene-3-only by construction);
whole-demo median 26.16 → 26.13, mean 28.57 → 28.44.

## Still open in scene 3

* **The middle window, 0x1000–0x1038, is still ~30–34.** Structure is now
  present but ours stays brighter and lower-contrast than the reference. The
  fix above removed the saturation; what remains is a smaller amplitude
  difference, not a missing mechanism.
* **The `this+0x3c` tail ramp is unported** — `+0xd8`/`+0xdc` going
  `300 → 2300` once `t150 > 0.75`. 300 matches the flare's base parameter, so
  the likely reading is that the flare blows up into a white-out at the scene
  boundary. The accumulator is now correct, so wiring it is self-contained.
  **Identity of the `+0x3c` object is INFERRED, not pinned** — confirm before
  porting.
* **The sun disc** renders harder-edged and slightly smaller than the
  reference's, which is soft and warm-tinted. Unquantified.
* The 4 species-1 birds have not been examined at all.


---

## Jasper's pushback: *"it looks like a bunch of subplasmas in ours instead of billowy clouds"* (2026-08-11)

**He is right that it does not match, and the measurement says so — but the
specific reading is inverted, which is worth knowing.** Measuring the cloud
field at 0x1000 (luminance over the 520×200 cloud region, contrast = stddev,
detail = RMS residual after a radius-4 box blur):

| | ours | reference | ratio |
|---|---|---|---|
| mean | 247.8 | 231.4 | +16 too bright |
| contrast (sd) | 9.99 | 18.13 | **0.55** |
| high-frequency energy | 0.39 | 2.07 | **0.19** |

**Ours is FLATTER and SMOOTHER than the reference, not noisier.** The reference
carries 5× more fine detail. So "plasma vs billows" is really "our field is a
washed-out low-contrast version of the same shapes".

### Everything that WAS verified against the binary, and matches

This is recorded so the next pass does not re-check it:

| # | fact | evidence |
|---|---|---|
| 1 | material flags `0x1811` / `0x1111` / `0x1050` / `0x3091` | pushes at 0x40ED09 / 0x40EE45 / 0x40F213 / 0x40F23F |
| 2 | blit alphaRef = `desc[0x1b]` = 180, rewritten per frame | `0x40F391 mov [eax+0x14],cl` |
| 3 | rt256 cleared BLACK, rt512 cleared FOG | `0x40F39A and dword [0x474790],0x0`; restored `0x40F3C9` |
| 4 | both RTs are `D3DFMT_A8R8G8B8` (they do have alpha) | `FUN_00402b16` `0x402B32 jnz` → `push 0x15` when arg3≠0; call passes 1 |
| 5 | UV scroll: `(u·s, v·s)`, `((u+1)·s, v·s)`, `(u·s, (v+1)·s)`, `((u+1)·s, (v+1)·s)` | full x87 trace of 0x40F2C8–0x40F373 |
| 6 | per-layer greys `0x3f / 0x7e / 0xbd` | the `or 0xffffff00` / `shl 8` / `or` chain at 0x40F315–0x40F333 |
| 7 | vertex allocator seeds diffuse `0xffffffff` | `0x4043C1 lea eax,[esi+0x18]` + `or dword [eax],0xffffffff` |
| 8 | scene 3 gets STACKED layers, not the dome | `param_7 = ~bit10 & 1` = 0 ⇒ stacked |
| 9 | `S = 1.0` for opt11 (all 8 layers un-tiled, same scale) | `0x40EFC9 fmul [0x418f04]` / `fsubr [0x4170c4]`, overridden by `0x40EFDD fld1` |
| 10 | `KK = 4` for opt11 (layer spacing) | `0x40EF8E neg al` / `sbb eax,eax` / `and al,0xf5` / `add eax,0xf` ⇒ 4 or 15 |
| 11 | quad extent ±1500 | `[0x418fbc] = -1500` |
| 12 | stage-0 `SUBTRACT` dissolve implemented | `combine()` `op==10 → a1-a2` |

Two hypotheses formed during this pass and **refuted by disassembly**, recorded
so they are not re-run: the clear colours are *not* swapped, and the blit quad's
diffuse is *not* zero-filled.

### So the remaining fault is amplitude/contrast, and it is NOT yet explained

Where the contrast is lost is visible in the intermediates: **rt256 spans
132–255 but rt512 is crushed to 200–255** (mean 251) — the additive blit onto
the lavender clear saturates everything above 55. The sky then magnifies that
low-contrast image across a 3000-unit quad with `S = 1.0`, so the frame can
only be as contrasty as rt512 is.

Next probes, in order:

1. **The noise texture's alpha reduction.** `cloudNoiseTexture` subtracts
   `0x20` from every texel's alpha, cited to VA 0x40ec7d with the comment
   *"what stops the layers saturating when N of them are added together"*.
   That is the one input on this path whose exact value was never
   instruction-checked, and it directly sets how much of rt256 clears the
   alpha test. **Verify the constant and the clamp.**
2. **Whether rt256's alpha is meant to saturate.** Three additive layers push
   its alpha to mean 228.9 against a source mean of 172.4; in D3D8 there is no
   separate alpha blend, so `dst.a = src.a² + dst.a` compounds fast. If the
   original avoids that, everything downstream gains contrast.
3. The mip chain on the render targets (magnification, so probably inert, but
   unchecked).


---

## Jasper: *"problem with the shim perhaps?"* — YES, a real one. Just not this scene's.

**Found and fixed: `applyMaterial` never restored WRAP addressing.** Our shim
had only two branches — `0x0200` → CLAMP, `0x0400` → MIRROR — and no `else`, so
**stage-0 addressing was STICKY**: once any material carrying `0x0200` had
drawn, stage 0 stayed CLAMPed for every later material that names no mode of its
own. A state leak from one draw into the next.

The original has all three branches (`FUN_00401d12`, ndisasm — the region needs
a hand-picked alignment, Ghidra and a naive disassembly both mis-frame it):

```
00401EB2  test ah,0x2      ; 0x0200 -> push ebx(0)   -> setAddressMode(0, CLAMP)
00401EBA  test ah,0x4      ; 0x0400 -> ADDRESSU/V = MIRROR, written directly
00401ED5  push esi(1)      ; ELSE   -> bWrap = 1
00401ED6  push ebx(0)      ;           stage  = 0
00401ED7  call 0x40191b    ;        -> setAddressMode(0, WRAP)
```

**Measured, whole demo:** worst frame **109.72 → 81.07** (and the worst position
moved, 0x1410 → 0x1428), mean **28.44 → 27.55**, scene 4 median
**34.98 → 32.46**. Scene 5 drifted +0.27. Median unchanged at 26.13.
`run_minid3d8_test.mjs` still 116/116.

So the biggest single frame-error in the whole demo was a leaked texture
addressing mode — in the beach scene, not here.

### …and it does NOT fix scene 3

Same measurement after the fix: contrast ratio **0.55**, high-frequency ratio
**0.19**, mean +16 — **identical to three decimals**. Stage 0 was already WRAP
by the time the cloud noise quads drew, so the leak never reached them.

**Scene 3's contrast deficit therefore remains unexplained**, with every input
and the whole flag decode now verified:

* thirteen data/constant facts (table above), plus
* `FUN_00401d12`'s blend selection: `0x401D77 test al,0x1` → mode 1 vs 0, and
  under `0x0100` the `0x401DA9 test byte [ebp+0xc],0x1` → `push 2` (`DESTBLEND
  = ONE`) vs `push 6` (`INVSRCALPHA`). The additive blit is authentic.
* `FUN_004019e6`: mode 1 = SRCALPHA/ONE, mode 2 = SRCALPHA/INVSRCALPHA.
* the noise alpha reduction: `0x40EC7C sub ecx,0x20` with `jns`/`xor` clamp,
  over exactly `0x10000` texels. Authentic.
* render targets are `levels: 1, hasMips: false` — no mip blur.

**The structural fact to attack next:** our rt512 is effectively BINARY in RGB
(min 200 = the lavender clear, max 255) because additive white always saturates
a 200-base clear — any texel passing the alpha test adds ≥181. Its ALPHA,
however, is graded (0–255, mean 201), and the sky's `SUBTRACT` op turns that
into the visible gradient. So the remaining question is not "why is rt512 flat"
but **"why is the gradient the sky derives from rt512's alpha weaker than the
reference's"** — i.e. look at the eight layers' vertex alphas and the SUBTRACT
result, not at the composite chain again.
