# Object 4 (scene 1) — SOLVED: the terrain rises out of the water

> ## ⚠ CORRECTION (2026-08-06) — the water half of this file was wrong
>
> This file's claim that "`desc+0x10` (waterLevel) is a constant 1.0; neither
> `FUN_00408eef` nor the event handler ever writes it" is **FALSE**.
> `FUN_00408eef` writes it EVERY FRAME at VA **0x4091a7–0x4091c4**:
>
> ```
> test byte [desc+0x51],0x2        ; bit 17 — the SAME bit as the ramp
> call FUN_004030ef                ; music position
> cmp  ax,0x820
> jc   -> fldz / else fld1
> fstp dword [desc+0x10]           ; waterLevel = pos < 0x820 ? 0.0 : 1.0
> ```
>
> **Bit 17 carries BOTH behaviours**: the terrain-rise ramp documented below AND
> a waterLevel step at 0x820 — which is exactly the moment scene 1's camera cuts
> to its second vista (`m4` at 0x0820). The first landscape is DRY: no water
> sheet, no reflection pass, no clip planes, full colour clear. The step the
> old port had (and this file called "a fabrication") was a literal transcription
> of the binary; deleting it was an over-correction that left water (and a teal
> lake) in the first landscape — spotted by Jasper by eye.
>
> This also dissolves §"What is still wrong" below: the plane2 experiment failed
> on the ramp frames only because the step was missing — before 0x820 no clip
> plane exists at all. With step + plane2-through-main-and-overlay both in
> (landed 2026-08-06), every measured position improves or matches the best of
> both prior states: 0x0708 18.10, 0x0718 24.34, 0x0730 22.12, 0x0800 27.18,
> 0x0820 9.32, 0x0900 33.16 (means 30.64 → 22.37). The water section below is
> kept for the disassembly citations but its conclusions are superseded.

The five worst samples in the whole 354-position sweep were object 4 at
0x0708–0x0728, RMSE **80–119**. The cause is now identified and fixed: it was
**not** a wrong height scale. The terrain is supposed to start **DEAD FLAT** and
rise to its full relief over the first ~3.3 s of the scene, and the port had that
animation computed-and-discarded.

## The bug

`js/scene_desc.mjs` flag bit 17 was named `waterLevelAnim` and the port
implemented it as a step on the water level:

```js
if (desc.flag.waterLevelAnim) desc.waterLevel = this.position < 0x820 ? 0 : 1.0;
```

Both halves of that are wrong. The real code, `FUN_00408eef` VA 0x40968a–0x4096f6
(ndisasm; Ghidra happens to be right here):

```
test byte [ecx+0x51],0x2        ; bit 17
cmp  byte [esi+0x144],0x0       ; the m7 gate  (obj 4 fires m7 at 0x0720)
fld  [esi+0x04] ; fmul [0x418260]=0.01 ; fadd [esi+0x140] ; fstp [esi+0x140]
clamp [esi+0x140] into [ [0x4170c8]=0.0 , [0x4170c4]=1.0 ]
test byte [ecx+0x51],0x1        ; bit 16, terrainVisible — the SECOND gate
fld  [ecx+0x44]                 ; desc+0x44 = terrainScale.Y = 0.5
fmul [esi+0x140]                ; * the ramp
mov  eax,[esi+0x6c]             ; the TERRAIN mesh
fstp [eax+0x98]                 ; -> node scale.Y
```

* **`this + 0x6c` is the terrain mesh.** `FUN_0040e058`'s own `this` is
  scene+0x4c and it stores the generated mesh at its +0x20, i.e. scene+0x6c; and
  the render tail hides exactly that pointer when bit 16 is clear
  (`if ((desc[0x51] & 1) == 0) terrainMesh[0xc8] |= 2`).
* **`mesh + 0x94..0x9c` is the node SCALE triple**, so **+0x98 is scale.Y**.
  Three independent writers agree: `FUN_0040e058` puts `terrainScale` there,
  `FUN_00407983` puts a tree's uniform scale there, `FUN_004082a9` copies the
  same triple onto the water plane.
* **`desc + 0x44` is `terrainScale.Y`** — `scene_desc.mjs` already decodes
  `terrainScale: r.vec3(0x40)`; 0x44 is its middle component, 0.5 for scene 1.
* **Bit 16 does gate it, and scene 1 sets it.** Scene 1's flags are
  `0x1030200` — bits 9 (cloudLayer), **16**, **17** and **24**.
* **`desc + 0x10` (waterLevel) is a constant 1.0.** Neither `FUN_00408eef` nor
  the event handler `FUN_00409acb` ever writes it.

So the ramp does not touch the water at all. **The landscape rises out of a
fixed water level**, and the port had it frozen at full height from the first
frame — which is exactly the "dark mountain ridge where the reference is a flat
pale plain" this file used to describe. The relief was never 10x too tall;
`terrainScale.y = 0.5` is correct, it was simply never ramped in.

## "nor is the texture changing" — flag bit 24 (`terrainOpt24`)

The same ramp drives a cross-fade. `FUN_0040e058`'s tail builds a SECOND terrain
material under `param_13 == 0` (i.e. bit 24 set — scene 1 alone):

```
this[0x3c] = texture(texgen program 0x11, 256x256)
this[0x40] = material(tex0 = this[0x3c], tex1 = DAT_00478978 /* program 0x10,
                      512x512, the shared detail map */, flags 0xc018)
this[0x40][0x14] = 0xff                       ; the alpha byte (minid3d8 `alphaRef`)
```

`this[0x40]` is scene+0x8c. `FUN_00408eef` then, at VA 0x409783 — where **Ghidra
drops the whole x87 chain and prints a bare `FUN_00404224()` with no argument**:

```
fld1 ; fsub [esi+0x140] ; fmul [0x418268]=255.0   ; (1 - ramp) * 255
fcom [0x4170c8] ; jnc keep ; fstp st0 ; fldz      ; clamp at 0 below
call ftol -> (byte) overlayMaterial[0x14]
cmp byte [..+0x14],0xff ; jz -> SKIP FUN_00406004  ; the whole main scene-graph pass
```

and after the main pass, at VA 0x40980e:

```
if (overlayMaterial[0x14] != 0) {
    save terrainMesh[0xc4] ; terrainMesh[0xc4] = overlayMaterial
    terrainMesh->Render(0.0)
    restore terrainMesh[0xc4]
}
```

So the terrain cross-fades from texgen program 17 to its baked ground texture
over exactly the ramp that raises it. Program 17's mean colour is (232, 227, 193)
— the reference's pale sand. While the ramp is still 0 the overlay is fully
opaque and **the main scene graph is not drawn at all**.

The overlay pass is **UNLIT**: `FUN_00406004` brackets its own lighting
(`FUN_00401b86(1, root+0x14)` … `FUN_00401b86(0, 0xffffffff)`), so it returns
with lighting disabled, and nothing between that call and the overlay pass turns
it back on. Drawing it lit leaves the plain near-black under the point light.

Nothing extra is needed for the shoreline: `applyShorelineColours` only runs in
the hi-res-water branch (scene 4), and its `v.y <= waterLevel` test is against
the *unscaled* vertex Y, so the node scale never enters it.

## Motion evidence (one warm-up per position, advancing clock)

| pos | t140 | terrain scale.Y | overlay alpha | waterLevel |
|---|---|---|---|---|
| 0x0700 … 0x071e | 0.000 | 0.000 | 255 | 1 |
| 0x0720 | 0.028 | 0.014 | 248 | 1 |
| 0x0724 | 0.223 | 0.112 | 198 | 1 |
| 0x0728 | 0.419 | 0.210 | 148 | 1 |
| 0x072c | 0.615 | 0.307 |  98 | 1 |
| 0x0730 | 0.810 | 0.405 |  48 | 1 |
| 0x0734 … 0x0938 | 1.000 | 0.500 |   0 | 1 |

100 frames-at-30fps = 3.33 s = ~20 music rows from the m7 at 0x0720. The
reference video shows precisely this arc: black at 0x0700, a flat pale sandy
plain 0x0704–0x0720, relief and green appearing at 0x0728, full green hills by
0x0730.

## Result

| pos | before | after |
|---|---|---|
| 0x0700 |  15.14 |  9.20 |
| 0x0708 | 101.76 | 30.05 |
| 0x0710 | 118.98 | 37.18 |
| 0x0718 | 113.88 | 35.60 |
| 0x0720 | 106.60 | 32.79 |
| 0x0728 |  80.41 | 24.44 |
| 0x0730 |  47.22 | 27.02 |
| 0x0800 |  27.18 | 32.84 |
| 0x0820 |  11.54 | 11.54 |
| 0x0900 |  46.78 | 46.78 |
| **mean** | **66.95** | **28.74** |

## What is still wrong here — the water, and it is a SEPARATE defect

0x0800 is the one regression (+5.66) and it is not caused by the ramp: it is
water that the old step hack used to suppress before 0x0820 and that the binary
says is there the whole time.

`verify/pair_obj4after2_0x0900.png` localises it exactly. Our lakes are in the
**right places with the right outlines** — so `waterLevel = 1.0` and the water
plane's extent are correct — but ours are **teal** and the reference's are
**near-white**. The reference's lakes are showing the **reflection**, and here is
why (VA 0x4094c0–0x409572, disassembled):

```
plane1 = (0, -1, 0, waterLevel*1.1)     ; keep y <= 1.1   — the reflection pass
SetRenderState(0x98, 1) ; FUN_00406004(root, 0.0) ; SetRenderState(0x98, 0)
un-mirror
plane2 = (0, +1, 0, -waterLevel)        ; keep y >= waterLevel
SetRenderState(0x98, 1)                 ; <-- LEFT ON for the MAIN pass
```

and CLIPPLANEENABLE is only cleared at VA 0x4098a4, immediately before the water
surface is drawn. So the original clips the main pass (and the terrain-overlay
pass) to above the water line, leaving the reflection visible in the hollows.
The port instead disables the clip plane straight after the reflection pass and
draws opaque terrain under an additive water sheet.

Adding plane2 as a straight transcription was **measured and is not yet a win**:

| pos | without plane2 | with plane2 |
|---|---|---|
| 0x0708 | 30.05 | 36.82 |
| 0x0718 | 35.60 | 51.42 |
| 0x0730 | 27.02 | 63.82 |
| 0x0800 | 32.84 | 86.84 |
| 0x0820 | 11.54 | **9.32** |
| 0x0900 | 46.78 | **33.16** |

It clearly helps once the terrain has risen (0x0820, 0x0900) and clearly hurts
while it is low or flat — a flat terrain at y = 0 is entirely below
`waterLevel = 1.0` and gets clipped away, yet the reference plainly shows it. So
one of the two is not yet right: either the reflection pass has to leave
something in the colour buffer that our Z-only clear is discarding, or the
plane's sense/offset differs from the literal reading. That is a water-pipeline
investigation, not a terrain one, and it is left open here deliberately.
