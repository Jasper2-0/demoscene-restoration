# Landscape per-frame animation, billboard impostors, particles

Working notes + final transcription. VAs are image VAs (`unpacked/sonnet_img.bin`,
VA 0x401000 = offset 0). File offset in `sonnet_u.exe` = 0x400 + (va - 0x401000).

STATUS: in progress.

## Targets
- [ ] `FUN_0040bfc1` — an UPDATE (per MESHGEN_PORT.md), not a generator
- [ ] `FUN_0040a9ad` — leaf wind
- [ ] `FUN_0040fba1` — bird flight
- [ ] `FUN_0040f5a8` — ribbon animation
- [ ] `FUN_0040f27e` — cloud scroll
- [ ] `FUN_0040abed` / `FUN_0040b0b0` — billboard impostors
- [ ] `FUN_0040d5c6` — particle appearance
- [ ] `FUN_0040c721` — compound prop

## 1. The per-frame update block in `FUN_00408eef` (raw, from the decompile)

Between the camera advance and the water-mirror pass the render calls, in this
exact order (`dt` = `this+0x04`, `TR` = `_DAT_00418260` = 0.01):

| gate (desc byte / bit) | call | stride | count | arg |
|---|---|---|---|---|
| `d[0x4f] & 0x200` cloudLayer | `FUN_0040f27e(this+0x94, dt*TR)` | — | 1 | cloud scroll |
| `d[0x50] & 0x08` | cloud vertex-colour grey + fade (inline) | 0x2c | mesh verts | uses `this+0x150`, gated by `+0x14c` (m10) |
| `d[0x50] & 0x20` | `FUN_0040f5a8(this+0x134 + i, dt*TR)`; then `mesh+0xc8 \|= 2` | 0x68 | to 0xd00 = **32** | ribbons — **re-hidden every frame** |
| `d[0x4f] & 0x08` buildTrees | `FUN_0040a9ad(this+0xb8 + i, d[10]*dt*TR)` | 0x28 | `d[9]` | LEAF WIND |
| `d[0x50] & 0x80` | `FUN_0040cfed(this+0xbc + i, dt*TR)` | 0x20 | `d[0xe]` | array F props |
| `d[0x4f] & 0x40` buildPrecip | `FUN_0040d5c6(this+0xc0, dt*TR)` | — | 1 | PARTICLES |
| `d[0x4f] & 0x02` | `FUN_0040bfc1(this+0x130 + i, d[2]*dt*TR)` | 0x24 | `d[1]` | array B curtains |
| `d[0x4f] & 0x04` | `FUN_0040c674(this+0x12c + i, dt*TR)` | 0x14 | `d[6]` | array C? |
| `d[0x4f] & 0x20` | `FUN_0040bb14(this+0x128 + i, dt*_DAT_00418ea4)` | 0x30 | `d[8]` | |
| `d[0x50] & 0x40` buildBirds | `FUN_0040fba1(this+0x138 + i, dt, 0xffff)` | 0x1c | `d[0xf]` | BIRD FLIGHT (note: raw `dt`, no TR) |

Key: the bird updater takes the RAW `dt` (frames-at-30fps); everything else
takes `dt * 0.01`.

### Correction to the gate table (byte-bit -> u32-bit)
`d[0x4f]` is bits 0..7, `d[0x50]` bits 8..15. So:

| gate | flag name | updater | applies to |
|---|---|---|---|
| `d[0x4f]&0x02` | buildA | `FUN_0040bfc1` (stride 0x24, count `d[1]`, arg `d[2]*dt*0.01`) | scene 0 only |
| `d[0x4f]&0x04` | buildB | `FUN_0040c674` (stride 0x14, count `d[6]`) | **scene 4** |
| `d[0x4f]&0x08` | buildTrees | `FUN_0040a9ad` (stride 0x28, count `d[9]`, arg `d[10]*dt*0.01`, `d[10]`=1.0) | **scene 5** |
| `d[0x4f]&0x20` | buildBillboards1 (array D) | `FUN_0040bb14` (stride 0x30, count `d[8]`, arg `dt*0.1`) | scene 2 only |
| `d[0x4f]&0x40` | buildPrecip | `FUN_0040d5c6` | **scenes 5, 7** |
| `d[0x4f]&0x200`| cloudLayer | `FUN_0040f27e(this+0x94, dt*0.01)` | **scenes 5, 8** |
| `d[0x50]&0x08` | cloudOpt11 | inline cloud grey/fade | no scene 4..8 |
| `d[0x50]&0x20` | hiResWater | `FUN_0040f5a8` x32 + re-hide | **scene 4** |
| `d[0x50]&0x40` | buildBirds | `FUN_0040fba1(flock, dt, 0xffff)` | **scene 4** |
| `d[0x50]&0x80` | buildProps (array F) | `FUN_0040cfed` | scene 2 only |

Array C (`buildBillboards0`) has **no** per-frame updater — the impostors are static.

Scene flags actually in play for objects 7..10:
* scene 4 (obj 7) 0x16015: waterGlitter, buildB, buildBillboards0(1 cluster x1, size 55),
  hiResWater, buildBirds(64, centre (-200,140,100), A=100, amp=0.4, species 1), terrainVisible
* scene 5 (obj 8) 0x8502d8: buildTrees(1), buildBillboards0(5 clusters, ctr (100,0,-300)
  ext (100,0,50), size 25), buildPrecip(768 rain), precipRenderTarget, cloudLayer(2, size 150,
  param 240, colour 0xc8c8c8), billboard0Opt, autumnLeaves
* scene 7 (obj 9) 0xd0050: buildBillboards0(20 clusters, ext (350,0,350), size 25),
  buildPrecip(4096 snow), precipOpt
* scene 8 (obj 10) 0x10300: terrainOpt8, cloudLayer(2, size 256, param 128, colour white)

## 2. `FUN_0040fba1` — BIRD FLIGHT (confidence: HIGH, decompile is clean)

Helpers, all verified: `FUN_004041dd`=sinf, `FUN_004041ee`=cosf, `FUN_00401950`=identity4x4,
`FUN_00401558`=vec3 set, `FUN_0040523d`=vec3 add, `FUN_00402a6f(out,v,M)` = row-vector
transform with perspective divide (`out.x=(v.x*M0+v.y*M4+v.z*M8+M12)/w`),
`FUN_00402280(M,e)` = `I * Rx(e0) * Ry(e1) * Rz(e2)` (`FUN_00402381`=X, `FUN_004023ed`=Y,
`FUN_00402459`=Z, each post-multiplied).

Flock object: `+0x00` float T, `+0x08` float amp, `+0x0c` int count,
`+0x14` ptr to bird-object pointers, `+0x18` ptr to records (stride 0x14 = 5 floats).
Record: `[0]`=euler X, `[1]`=euler Y, `[2]`=euler Z, `[3]`=speed, `[4]`=phase.
Bird object: `+0x08` 4x4 matrix, `+0x88` position, `+0xb0` vertex array, `+0xb8` index array.

```
T += dt                                    // dt = raw frames-at-30fps, NOT *0.01
for each bird i:
    step  = dt * rec[3]                    // rec[3] = speed
    rec[0] = sin(T * 0.027 + rec[4]) * amp        [0x418fdc]=0.027
    rec[1] += dt * 0.01                           [0x418260]=0.01
    M = Rx(rec[0]) * Ry(rec[1]) * Rz(rec[2])
    obj.pos += (0,0,step) * M              // forward is +Z of the local frame
    obj.matrix = M
    if (rec[0] >= 0)  obj.pos.y -= step * 0.01
    else              vert[2..5].y = sin(T * 0.2) * 3.0    [0x418f04]=0.2 [0x4182cc]=3.0
```
So the flock climbs while banking down and flaps its wings while banking up, and the
whole flock shares one clock T. Wing verts are 2,3,4,5 of the 6-vertex bird quad-pair.

Generator `FUN_0040f803` (matches `MG.buildFlock`), per bird, in this order:
`rec[3] = (rand01()+0.5)*A*0.01`; `rec[0..2] = DAT_00478938..40` (globals, = 0);
`rec[4] = rand01()*100`; mesh; `pos = centre + (2*rand01()*A - 2*A, 0, 2*rand01()*A - 2*A)`
(x drawn first? see below); colour = per-bird random grey; then
**`preroll = ftol(rand01()*K)` calls of `FUN_0040fba1(flock, 1.0, i)`** — a warm-up that
also advances the SHARED T, so bird i's preroll shifts every later bird's phase.

## 3. `FUN_0040a9ad` — LEAF FALL (it is not a "wind sway"; confidence: HIGH)

`this` = the per-tree animation record (stride 0x28) at `Landscape+0xb8 + i*0x28`:
`+0x00` vec3 tree world position, `+0x0c` terrain ptr, `+0x14` LEAF mesh object,
`+0x18` leaf record array, `+0x1c` float T, `+0x24` byte "settle" flag,
`+0x25` byte **active** (set by event `m9`), `+0x14`->`+0xac` vertex count,
`local_8[5]` = `this+0x14` mesh, whose `+0x94/98/9c` is its scale.

Leaf record = **0x20 floats (128 bytes)**, one per leaf, 8 vertices each:
`[0..23]` = the 8 vertices' base xyz; `[0x18..0x1a]` = displacement; `[0x1b..0x1d]` =
velocity; `[0x1e]` = byte `falling`; `[0x1f]` = float settle timer.

```
T += dt                                  // dt already = d[10]*frameDt*0.01
if (!active) return                      // +0x25, i.e. nothing moves until m9
h = dt * [0x418e60]                      // wind/step scale
G = (0, [0x418f28], 0)                   // gravity
for leaf j in 0 .. (vertexCount & ~7)/8:
    if (!falling) { s = 0 }
    else {
        if (settle >= 0) { if (+0x24) settle -= h*0.01 }
        else {
            disp += vel * h
            vel  += G  * h
        }
        s = sin((j + T) * [0x418f24]) * [0x4170bc]
        if (terrain) {
            th = terrainHeight(terrain, (disp.x + tree.x + base0.x)*scale.x,
                                        (disp.z + base0.z + tree.z)*scale.z)
            th = (th - tree.y) / scale.y
        } else th = 0
        if (base0.y + disp.y < th) falling = 0        // landed: freeze
    }
    for k in 0..7:
        sgn = {0,1,1,0, 0,1,1,0}[k]
        v[8j+k] = base[k] + disp + sgn * (s,s,s)
```
The sway `s` is applied isotropically to vertices 1,2,5,6 only (the two "far" corners
of each of the two oppositely-wound quads), which is what flutters the leaf as it falls.
A leaf that is not `falling` sits exactly at its base position — so the STATIC port is
correct for un-triggered leaves; the missing motion is the falling ones.

## 4. `FUN_0040f27e` — CLOUD SCROLL (confidence: HIGH for the UV maths)

`this` = `Landscape+0x94`. `+0x00` byte base brightness, `+0x04` float T,
`+0x08` int N (= `cloudCount`), `+0x0c` the scroll-quad object, `+0x10` a second object,
`+0x14` the sky mesh, `+0x18` per-layer params (stride 0xc: `[0]`=uv scale, `[1]`=u phase,
`[2]`=v phase), `+0x1c` byte.

```
T += dt*0.01
if (skyMesh.flags & 2) return                       // hidden -> nothing
c = 63
for layer i in 0..N-1:
    p = params[i]
    k  = (i*i*C + C) * T                            C = [0x418e48]
    u  = k + p[1];   v = k + p[2]
    quad i's 4 vertices get uv0 =
        (u*p0, v*p0), ((u+1)*p0, v*p0), (u*p0, (v+1)*p0), ((u+1)*p0, (v+1)*p0)
    and colour 0xff000000 | c<<16 | c<<8 | c
    c += 0x3f
```
Then the layer quads are composited into a render target (`FUN_00402b4f(DAT_00478960)`,
draw, `DAT_00478964`) and that RT textures the sky dome; finally, if `+0x1c == 0`, every
sky vertex's ALPHA byte is set to `(byte)(-(this[0]+1))` = **`255 - this[0]`** — the
`neg` at 0x40f404, which this note originally read as `this[0]+1`. Corrected and
measured in `SCENES_7_10.md` §11.3.

## 5. `FUN_0040f5a8` — RIBBONS: hidden from the scene graph, drawn MANUALLY last

The update loop hides each strip (`*(byte*)(ribbon_i[0x64]+0xc8) |= 2`) so that the
scene-graph pass `FUN_00406004` skips it -- but the **last** thing `FUN_00408eef` does is
```
if (flags & 0x2000) {                      // hiResWater
    for (i = 0; i < 0xd00; i += 0x68) {
        *(byte*)(ribbons[i+0x64] + 0xc8) &= 0xfd;      // un-hide
        ribbons[i+0x64]->render(0);                    // draw explicitly
    }
}
```
So the 32 ribbons ARE drawn, after the water surface, the flare and the precipitation --
they are the very last geometry in the frame.  (VA at the tail of `FUN_00408eef`.)

## 6. `FUN_0040d5c6` — PARTICLE INTEGRATION + QUAD EMIT (confidence: HIGH, disassembled)

Object at `Landscape+0xc0`: `+0x00` byte type (0 = snow), `+0x04` particle mesh object,
`+0x08` float T, `+0x0c/0x10/0x14` box X/Y/Z, `+0x18` count, `+0x1c` particle array
(stride **6 floats**: `[0..2]` pos, `[3..5]` vel), `+0x20` vec3 quad scale, `+0x48`
terrain, `+0x4c` snow-accumulation map, `+0x58` accumulate flag, `+0x5c` **global alpha
0..255 (= `Landscape+0x11c`, the `t158` fade written by the render)**, `+0x60` frame
counter clamped to 16.

```
if (globalAlpha == 0) return                     // the whole updater is skipped
camXZ = (camera.pos.x, 0, camera.pos.z)
frameCount = min(frameCount+1, 16);  T += dt
hh = (type != 0) ? 5.0 : 1.0                     // quad half-height  [0x40d62f]=5.0
M  = billboardMatrix(camera)                     // FUN_0040dd68(camera+8)
if (type != 0) { M[4]=0; M[5]=1; M[6]=0 }        // RAIN: local +Y is forced to world +Y
step = dt * 1250.0                                                       [0x418f98]
for each particle p:
    p0 = p.pos                                   // SAVED BEFORE the integration
    p.pos += p.vel * step
    if (terrainHeight(terrain, p0.x, p0.z) <= p.pos.y) {      // still airborne
        a = 255
        if (boxY - 32.0 < p.pos.y) a = ftol(255.0 - (p.pos.y - (boxY - 32.0)) * 8.0)
        if (p.pos.y < 8.0)         a = ftol(p.pos.y * 32.0)   // NOT else-if; overwrites
        a = clamp(a, 0, 255)
    } else {                                                  // hit the ground: respawn
        <snow accumulation splat into +0x4c, skipped>
        z = 2*rand01()*boxZ - boxZ          // NOTE: Z is drawn FIRST
        y = boxY + p.pos.y
        x = 2*rand01()*boxX - boxX
        p.pos = camXZ + (x, y, z)
        a = 0
    }
    if (type != 0) a >>= 1                       // rain half as bright
    col = ((a * globalAlpha) >> 8) << 24 | 0xffffff
    for corner in [(-1,-hh), (1,-hh), (1,+hh), (-1,+hh)]:     // [0x4170cc] = -1.0
        v = (corner.x, corner.y, 0) * quadScale        // componentwise, FUN_00405271
        v = v * M                                      // FUN_00402a6f
        vertex.pos = v + p0 ;  vertex.colour = col
```
So the real quad half-extents are **(1.0, 5.0) x quadScale** = (1, 10) for rain and
(1, 1) for snow, in world units — not the eyeballed 0.6/5.5 and 0.4/0.4 the port had.
Constants: `[0x418e84]`=32.0, `[0x418e7c]`=8.0, `[0x418268]`=255.0.

After the particle loop the function also appends one **lens droplet** to a 256-entry
ring at `+0x2c/0x30/0x34/0x3c` when `ftol(dot(up, camForward-ish)) > rand()`; the droplet
quad is built from two random numbers with the constants `[0x418f90]`=0.12,
`[0x418f8c]`=`[0x418f88]`=0.16, `[0x418f84]`=0.2133, `[0x418e1c]`=-0.5.  Not ported.

## 7. What was ported into `web-sonnet/js/scene7.js`

| system | function | status |
|---|---|---|
| bird flight | `FUN_0040fba1` | ported, incl. the build-time preroll |
| leaf sway + leaf fall | `FUN_0040a9ad` | ported, incl. the `m9` settle trigger |
| ribbon animation + explicit tail draw | `FUN_0040f5a8` | ported via `MG.updateRibbon` |
| cloud scroll | `FUN_0040f27e` | **fully ported**, including the 256 -> 512 RT composite and the corrected sky vertex alpha — `SCENES_7_10.md` §11 |
| particle integrate / respawn / alpha / quads | `FUN_0040d5c6` | ported |
| particle material + texture | `FUN_0040d1f1` | CORRECTED (below) |
| array A growth | `FUN_0040bfc1` | scene 0 only — not in objects 7..10 |
| array B updater | `FUN_0040c674` | **ported** — `SCENES_7_10.md` §10.2 / the `#stepCurtains` transcription |
| array D, F updaters | `FUN_0040bb14`, `FUN_0040cfed` | scene 2 only, not ported |

### Corrections this work made to the earlier port
1. **Particle material.** `SCENES_7_10.md` §1 says "texgen program 3 at 32x32,
   material flags 0x11".  Disassembling `FUN_0040d1f1` at VA 0x40d4d0-0x40d536 shows
   the particle mesh's material is texgen **15 at 16x16** (snow, with a
   `alpha < 0x80 -> 0` cut applied per texel) or **6 at 8x8** (rain), with flags
   **0x1050** = lighting off | alpha blend | CULLMODE NONE.  Program 5 at 16x16 does
   exist but is stored at `precip+0x40` and belongs to the lens droplets.
2. **Particle quad extents.** They are not a judgement call: half-width `1.0 *
   quadScale.x`, half-height `hh * quadScale.y` with `hh` = 5.0 rain / 1.0 snow.
   That is (1, 10) for rain and (1, 1) for snow.  The port had (0.6, 5.5) and
   (0.4, 0.4) — snow was 2.5x too small in both axes.
3. **Particle integration rate.** `pos += vel * (dt * 1250.0)`, `dt` being
   `frameDt * 0.01`; the port had an invented `g = 6.0 / 0.6` multiplier and a
   wrap at `-boxY`, where the original respawns on TERRAIN CONTACT around the
   camera's XZ.
4. **Bird mesh scale.** `FUN_0040f803` never writes the bird object's `+0x94`, so
   the meshes are unit-scaled; the flock record's float `[3]`, which the port was
   using as a scale, is the per-bird SPEED consumed by `FUN_0040fba1`.
5. **Ribbons are visible.**  They are hidden from the scene-graph pass and then
   drawn explicitly at the very end of `FUN_00408eef`.
6. **Event `m9` sets `+0x24`, not `+0x25`.**  `+0x25` is the build-time
   `leavesVisible` literal (always 1); `+0x24` starts the leaf settle timers.

### Clock source
Everything is driven by the object's own `dt` (`FUN_004060db`:
`(nowMs - lastMs) / (1000 / rate)`, i.e. frames at `rate` = 30 fps), which the
runtime already supplies through `ctx.songMs`.  The bird updater takes that `dt`
raw; every other updater takes `dt * 0.01`.  No new clock was introduced.

### Confidence
| item | confidence |
|---|---|
| bird flight maths + constants | **high** (clean decompile, constants from the image) |
| bird preroll ordering | **medium-high** (replayed after the fact; `ftol` vs `trunc` on `rand01()*500` can differ by one step) |
| leaf fall maths | **high** |
| leaf landing test | **medium** — the original mixes world and local space; transcribed verbatim |
| particle integrate/respawn/alpha/quads | **high** — disassembled |
| particle material/texture | **high** — disassembled |
| ribbon animation | **high** (`MG.updateRibbon`, already tested) |
| cloud scroll rate | **high**; its application to the sky mesh | **medium** — the original scrolls N noise quads into a render target, the port scrolls the sky's uv0 by layer 0's rate |

## 8. Verification

### Motion test (the point of the exercise)
A still frame cannot tell you whether animation runs, so the Landscape was built
against a stub device and ticked for exactly 30 frames of its own 30 fps time base
(one second), with the camera and the renderer out of the picture:

| object | measured |
|---|---|
| 7 | 64 gulls, mean \|dp\| = **28.93 u/s**, mean drift (+1.49, −1.00, −4.12) u/s |
| 8 | tree 0: **5792 of 10648** leaf vertices moved in 1 s, mean 1.03 u, max 18.83 u |
| 8 | 768 rain particles, 12.5 u/frame = 375 u/s downward |
| 9 | 4096 snow particles, same integrator, alpha ramping |
| 7 | 32 ribbons, phase advancing |
| 10 | nothing — correct: its only per-frame update is the cloud RT composite |

The 5792/10648 is the expected fraction: the sway offset lands on vertices 1, 2, 5, 6
of each 8-vertex leaf (= 50 %), plus the full 8 vertices of every leaf that has already
detached. The bird speed matches the model (`rec[3] ≈ 1 u/frame × 30 fps`).

In-browser, at a fixed music position with the wall clock advancing one frame at a
time, the changed-pixel fraction grows monotonically (obj 8 at 0x1a00: 18.9 % → 30.2 %
→ 37.4 % over three frames) and the change centroid migrates, i.e. things move rather
than flicker. Note `#tickClock` clamps `dt` to 4, so steps larger than ~133 ms
saturate — use one-frame steps when motion-testing.

### Masked RMSE, before vs after
Headless Chrome (ANGLE/Metal) 640×480, warmed from position 0 via `seek()`, objects
0/1/2 skipped, reference frame at `positionToSeconds(pos) + 2.43 + halfRow`. RMSE over
the centred inner 60 % masked to where the reference is not black.

| pos | obj | before | after | Δ |
|---|---|---|---|---|
| 0x1210 | 7 | 40.5 | 42.0 | +1.5 |
| 0x1330 | 7 | 37.8 | 37.8 | 0 |
| 0x1520 | 7 | 18.7 | 20.9 | +2.2 |
| 0x1630 | 7 | 27.6 | 27.7 | +0.1 |
| 0x1710 | 8 | 52.7 | 52.7 | 0 |
| 0x1830 | 8 | 53.0 | 53.0 | 0 |
| 0x1a00 | 8 | 48.0 | **44.3** | −3.7 |
| 0x1c00 | 8 | 97.4 | **92.8** | −4.6 |
| 0x1e10 | 9 | 51.9 | 51.9 | 0 |
| 0x2030 | 9 | 34.6 | **25.0** | −9.6 |
| 0x2200 | 9 | 37.2 | **31.3** | −5.9 |
| 0x2310 | 10 | 29.8 | 29.8 | 0 |
| 0x2600 | 10 | 33.4 | 33.4 | 0 |
| 0x2830 | 10 | 40.0 | 40.0 | 0 |
| 0x2a30 | 10 | 59.8 | 59.8 | 0 |
| **mean** | | **44.16** | **42.81** | **−1.35** |

The gains are all the particle rewrite (obj 9's snow, −9.6 and −5.9; obj 8's rain,
−4.6). The three obj-7 regressions were attributed by ablation: they are entirely the
32 ribbons, which the port had never drawn and which really are drawn by the original
(and whose material this work also corrected from texgen 13 / flags 0x1051 to the
binary's texgen 8 / flags 0x11). With the ribbons suppressed obj 7's numbers return to
40.5 / 37.8 / 18.7 / 27.7, so the bird animation itself is RMSE-neutral. Their
placement is imperfect (`MG.buildRibbon` is medium confidence), but suppressing
geometry the original draws to buy 1.5 RMSE would be the wrong trade.

### Suites
`js/meshgen_test.mjs` 369/369, `web-sonnet/test/{integration,timeline,text}_test.mjs`
ALL PASS. `js/meshgen.mjs` was not modified.

### A trap the motion work exposed: the particles must integrate during the WARM-UP

`FUN_0040d5c6` runs inside every rendered frame, so by the time any frame is shown the
particle field is in steady state.  The port ran it only from `render()`, so a warmed-up
single-frame capture caught **every** particle on its first update — which is the frame
the original writes `alpha = 0` on (the respawn branch) — and the snow was invisible even
though 2768 of 4096 particles were correctly placed.  `tick()` now integrates too
(vertex writes suppressed via an `emit` flag); `precipAlpha == 0` short-circuits it, so
it costs nothing outside the music-position gate and about 1 s of warm-up inside it.

With that fixed the snow at 0x2030 visually matches the reference — same blob size
distribution, same density, mean luma 124.9 vs the reference's 129.5 (it was 122.0 with
the snow missing).  Masked RMSE went 25.0 -> 29.5 because uncorrelated flake positions
add per-pixel error; the luma and the eye both say this is the better frame, and it is
the transcribed behaviour either way.

---

## 9. BILLBOARD IMPOSTORS — `FUN_0040abed` + `FUN_0040b0b0` (now ported)

These are the horizon trees: one cluster of 1 instance on obj 7's island, five on
obj 8's ridge, twenty scattered over obj 9's snowfield.

### `FUN_0040abed` — the baker (confidence: HIGH)
Called three times from `FUN_0040b0b0`, guarded by the never-reset global
`DAT_00478968`, so the whole demo bakes exactly once:

| call | set | RT | subject | passes |
|---|---|---|---|---|
| `(this, 0, 10.0, 0)` | 0 | 512x512 | leafy tree (`FUN_00409d45`) | 10 |
| `(this, 0, 10.0, 1)` | 1 | 512x512 | bare branches, black point light | 1 |
| `(this, 1, 10.0, 0)` | 2 | 128x128 | compound prop (`FUN_0040c721`) | 1 |

The `float` argument is genuinely dead (`[ebp+0xc]` is never read).  Per set,
`angleCount` = **2** render targets; target k is rendered from
`Ry(k/2 · PI) · (0, 128, −150)` looking at `(0, 128, 0)`, fov 90, aspect 1,
near 1, far 1000, lit by a point light at `(0, 300, 0)` [0x418e78], range 1000,
`Attenuation1` 0.002, over scene ambient `0x3F3F3F3F`.  Tree parameters:
`branchRadius` 10, `levelTaper` 0.75, `bend` (0,0,0), `leafSize` 2.0.

The 10-pass accumulation is the part that makes it read as a canopy — **one**
clear, then:
* pass 0: branches HIDDEN, leaves only, lit;
* passes 1..9: branches shown, **lighting OFF** (the scene ambient is set to −1,
  which makes `FUN_00406004` skip the lighting toggle entirely), the leaf mesh
  re-yawed by `rand01()·2PI`, and every leaf QUAD given a fresh random grey
  `ftol(rand01()·127 + 128)` [0x418e34] / [0x418e30].

Set 2 is not ported: `FUN_0040c721` has no transcription and no object in 7..10
uses array D.

### `FUN_0040b0b0` — the clusters (confidence: HIGH)
Two **separate meshes** per cluster (not one mesh with two quad sets), mesh k
yawed by `(k/2)·PI` and textured with impostor k — a fixed-orientation crossed
billboard, matched to the direction its texture was baked from.  There is **no
runtime billboarding and array C has no per-frame updater** (`FUN_0040c674`
belongs to the `FUN_0040c1b2` array at `Landscape+0x12c`, not to array C).
Type 0 = 4 verts / 2 tris per instance, size `record.f32 · 50.0`; the vertex
template and material (`flags 0x1310`, alphaRef 0x80) are `MG.buildBillboards`,
which already existed and was reused unchanged.

### Two corrections this needed
1. **`MG.scatter` draws X before Z; `FUN_004078b6` draws Z first.** Since the
   generator reseeds with `srand(clusterIndex)`, the draw order fully determines
   the positions — reversed, every impostor lands somewhere else.  `MG.scatter`
   is covered by `meshgen_test.mjs`, so the corrected order is a local
   `scatterC()` in `scene7.js` rather than a patch to the tested file.  Fixing it
   moved obj 9's horizon tree from the wrong side of the frame to within a few
   pixels of the reference's, and took 0x2200 from 41.8 to 32.8.
2. **The render target is cleared to the live scene's FOG COLOUR** (`DAT_00474790`,
   whose alpha byte is 0 in every descriptor), not to transparent black.  With a
   black clear the alpha-blended edges of the 512x512 impostor resolve towards
   black when minified onto a ~100 px quad and the horizon tree renders as a dark
   blob instead of the reference's pale fog-tinted silhouette.

## 10. Final numbers

| pos | obj | before | after | Δ |
|---|---|---|---|---|
| 0x1210 | 7 | 40.5 | 41.6 | +1.1 |
| 0x1330 | 7 | 37.8 | **31.7** | −6.1 |
| 0x1520 | 7 | 18.7 | 20.9 | +2.2 |
| 0x1630 | 7 | 27.6 | 27.5 | −0.1 |
| 0x1710 | 8 | 52.7 | **44.6** | −8.1 |
| 0x1830 | 8 | 53.0 | **49.9** | −3.1 |
| 0x1a00 | 8 | 48.0 | **44.4** | −3.6 |
| 0x1c00 | 8 | 97.4 | **92.3** | −5.1 |
| 0x1e10 | 9 | 51.9 | **38.5** | −13.4 |
| 0x2030 | 9 | 34.6 | **29.8** | −4.8 |
| 0x2200 | 9 | 37.2 | 37.3 | +0.1 |
| 0x2310 | 10 | 29.8 | 29.8 | 0 |
| 0x2600 | 10 | 33.4 | 33.4 | 0 |
| 0x2830 | 10 | 40.0 | 40.0 | 0 |
| 0x2a30 | 10 | 59.8 | 59.8 | 0 |
| **mean** | | **44.16** | **41.43** | **−2.73** |

**Measurement noise.** Frames with precipitation are stochastic: particle
respawns draw from the process-global RNG, whose state when a warm-up starts
depends on everything that ran before it in the session.  Repeating 0x2200 three
times in one session gave 39.8 / 34.2 / 34.0, so read the precipitation rows as
±3.  (The original has exactly the same global stream — this is not a port
artefact and reseeding it would be less faithful, not more.)

The two real regressions are both obj 7 and both the 32 ribbons, which the port
had never drawn and which the original does draw. Object 10 is unchanged because
its only per-frame update is the cloud composite (§8).

## 11. What is still missing
| thing | why |
|---|---|
| ~~cloud render-target composite~~ | **PORTED** — the two-stage 256 -> 512 RT chain is in `scene7.js`; see `SCENES_7_10.md` §11. The sky is now textured with the 512 target, not with texgen 7 |
| impostor set 2 (`FUN_0040c721`, array D) | the compound prop is now **transcribed** (`SCENES_7_10.md` §12) but deliberately not ported — see §12.5. No object in 7..10 uses array D |
| lens droplets (`FUN_0040d1f1`'s second mesh) | 256 screen-space quads; another agent's `FUN_00405082` work is adjacent |
| snow accumulation (`FUN_0040de4e`) | the 64x64 render target, obj 8 only |
| the impostor's terrain-lightmap speck | `FUN_0040b0b0` zeroes one lightmap texel per instance through a 512-stride index into a 256-wide texture — an original bug, one dark speck per tree, deliberately skipped |
| array D/F updaters (`FUN_0040bb14`, `FUN_0040cfed`) | scene 2 only, i.e. object 5. `FUN_0040bfc1` (array A) and `FUN_0040c674` (array B) are both **ported** now — the classes were merged, so there is only one `Landscape` |

### Visual confirmation of the impostors
* **0x1210 (obj 7).** The single array-C instance now sits on the island's summit,
  in the same place and at the same size as the reference's — the tree that
  `SCENES_7_10.md` §7 listed as the frame's main missing element.
* **0x2200 (obj 9).** The horizon tree is within a few pixels of the reference's,
  the same size, and the same pale fog-tinted grey.
* **0x2030 (obj 9).** With the warm-up integration fix the snow field matches the
  reference's blob size distribution and density by eye.
