# Sonnet — submission order, and the traversal the port does not have

Opened 2026-08-22 out of issue #50, "scene 4 — beach / sunset: ground / beach is
missing". It is not missing. The port submits the ground, and the geometry is
identical to the original's — what differs is **where in the frame it is
submitted**, and the reason is a scene-graph traversal the port never modelled.

Measured with the D3D8 draw-stream oracle (`re/oracle/targets/drawstream.py`)
against the port (`tools/record-minid3d8-draws.mjs`), compared by
`tools/compare-drawstream.mjs`. See `tools/DRAWSTREAM.md` for the contract.

## 1. What is NOT wrong

At 0x151f, obj 7, both sides submit **the same 171 draws**. Identical
vertex-count multiset:

    {6:6, 12:128, 90:32, 768:1, 5766:1, 23040:1, 23814:2}

and identical pass structure — reflection (world-matrix Y negated) is draws
0–66, main pass 67–170, on both sides. Nothing is missing, nothing is extra, no
primitive type or stride differs.

This is worth stating plainly because the port also *measurably* draws ground:
bottom-third luma 149.8, `groundTex true`, 83 quads, and identical under the new
default, `?quality=original` and `?texscale=2` alike. Every cheap check says the
ground is there. It is. It is in the wrong place in the stream.

## 2. What is wrong

| | original | port |
|---|--:|--:|
| terrain (23814v) in the reflection pass | draw 0 | draw 0 |
| terrain in the MAIN pass | draw **136** | draw **67** |

    original main pass:  6 6 12x...  5766 768  [23814]  23040 6 90x32
    port     main pass:  [23814]  6 6 12x...  768 5766  23040   90x32

69 draws early. Two smaller transpositions ride along: `5766`↔`768`, and a `6v`
draw against the `90v` block.

Order is not cosmetic in a fixed-function pipeline. Every prop and grass draw the
original places between 67 and 136 is composited against the ground in the
opposite direction, under z-writes and alpha blending.

## 3. The mechanism — mask and mode routing

`FUN_00406004` (the main pass) walks the scene graph **four times**, with
different masks:

    FUN_00405f8b(root, 2,   t, 0);      ; the LIT passes
    FUN_00405f8b(root, 0xc, t, 1);
    FUN_00405f8b(root, 2, 0.0, 0);      ; trailing, unlit
    FUN_00405f8b(root, 4,   t, 2);

and `FUN_00405f8b` routes each node on the node's OWN flags (`node[0x29]`, i.e.
`+0xa4`) — not on its material:

```c
if ((mask & flags) != 0) {
  if ((flags & 4) == 0)  { ...normal draw... }
  else if (mode == 0)      FUN_0040520d(node);
  else if (mode == 1)      FUN_004050ed(node, t);
  else                     goto normal_draw;
}
```

MEASURED by hooking `FUN_00405f8b` and tagging every draw with the walk that
issued it (`--scenes 4`, scene 4):

| traversal | draws | terrain? |
|---|--:|---|
| reflection — mask `0xc`, mode 1 | 0–66 (**67**) | yes, at 0 |
| main — mask `0xc`, mode 1 | 67–132 (**66**) | **no** |
| main — mask `0x4`, mode 2 | 133–169 (37) | yes, at **135** |

Two things fall straight out. **Only three traversals emit draws**, not four —
the mask-2 walks contribute nothing in this scene. And **the main pass's first
walk is exactly one draw shorter than the reflection's**: that missing draw is
the terrain, which reappears in a later walk.

The terrain node carries **bit 4**. Mask `0xc` matches it (`0xc & 4`), but at
mode 1 it is routed through `FUN_004050ed` rather than drawn; under mask `0x4`
at mode 2 it falls through to the normal draw. The reflection pass differs
because it **suppresses the flare first** — `flare->+0xac = 0` immediately
before `FUN_00408dfc`, restored to 1 after — so the same node is handled
differently in the two passes.

So the asymmetry is real and is *in the original*. The port cannot reproduce it:

```js
#drawAll(d3d, reflected) {
  for (const m of this.meshes) drawMesh(d3d, m);
}
```

One walk, registration order, and the `reflected` parameter is **accepted and
ignored** — which is why the port is necessarily symmetric across the two passes
while the original is not.

The collapse was known about. The comment at the main-pass call site says it
outright: "`#drawAll` collapses the four masked passes into one traversal, so the
bracket has to be closed here instead." It was known to change **lighting** —
that comment exists because the ribbons saturated to white without a
compensating bracket. What was not known is that it also changes **submission
order**, and nothing in the pixel metrics could have attributed that: scene 4's
median RMSE is unremarkable and every direct check says the ground is drawn.

## 4. What a fix needs

Not a reordering of `this.meshes`. Three pieces:

1. **Model `+0xa4` node flags** on the drawables. `scene7.js:1553` already
   records the default is 8 (`[esi+0xa4] = 8` @0x404322, "neither builder
   overrides it"), so most meshes are bit-3 only and the interesting ones are
   the exceptions.
2. **Replace `#drawAll`'s single walk** with `FUN_00406004`'s traversal
   sequence, honouring mask and mode — including the `FUN_004050ed` /
   `FUN_0040520d` routing for bit-4 nodes.
3. **Reproduce the reflection pass's flare suppression**, since that is what
   legitimately makes the two passes asymmetric.

⚠ This moves every draw in every scene. It wants its own full-sweep A/B and
probably a re-bless, the same shape of landing as the fixed timestep (bc08221).

**A good check on whether the mask assignment is right:** the two smaller
transpositions in §2 should resolve *together with* the terrain. If they do not,
the masks are wrong — which makes them a test rather than loose ends.

## 5. Related, and probably the same bug

`#51` reports "in ours clouds are visible that are not visible in the original".
The decompile shows the sky being hidden by exactly this flag mechanism —
`if (flags & 0x200) cloudMesh.flags |= 2` before the refraction render target,
cleared after — which is the same `+0xa4` byte this section is about. A mesh the
original hides for one traversal and the port draws unconditionally would
present precisely as "visible when it should not be".

Not yet measured. Scene 5's stream is only 16 draws and has no reflection pass,
so it is a much cheaper place to confirm the mechanism than scene 4 was.

---

# Scene 5 — 70 fewer leaves, and where the stream parts

Same instruments, different scene. Issue #52/#53, "leaves are in different
positions", at 0x1916 (show 264.5 s).

## The measurement

Both sides submit **14 draws** for obj 8 and thirteen agree on primitive type
and vertex count. The branch mesh matches **exactly** at 8184 vertices — the
figure ORACLE.md validated for scene 2's tree — so the tree generator is not
broadly wrong. One mesh differs:

| | vertices | leaves (4 verts each) |
|---|--:|--:|
| original | 10920 | **2730** |
| port | 10640 | **2660** |
| deficit | 280 | **70** |

"Different positions" understates it. There are seventy fewer, and a generator
that emits a different number consumes a different number of RNG draws, so
every leaf after the first divergence moves.

## It is a STREAM difference, not an off-by-one

Leaf emission is stochastic — `meshgen.mjs`'s tree builder runs
`TREE.LEAF_TRIES` (16) attempts per ring and emits when
`rand() < TREE.LEAF_THRESHOLD` (4000 of 32767, ~12 %). Seventy fewer successes
out of ~22,000 tries is not a loop bound; it is the shared LCG arriving in a
different place.

## Where it parts

Oracle build seeds, all eight real scenes from image seed 1:

    scene 0  0x1f818a28      scene 4  0x90b31246
    scene 1  0x71224a04      scene 5  0xd1adf447
    scene 2  0x2d4f124f      scene 7  0x42165e3c
    scene 3  0x2e4e9b0b      scene 8  0xabe15a5b

Scenes 0–4 reproduce `fixtures/scenebuild/scenes_0_1_2_3_4` **exactly** —
recorded in an earlier session, before the draw-stream work — so the
instrumentation does not perturb the build and the emulator is reproducible
across sessions. ORACLE.md records those boundaries matching the port.

With the branch mesh also agreeing, that places the divergence **inside scene
5's own build**. Something specific to that scene consumes RNG differently: its
tree parameters, or the order it draws them in.

## What is still needed

The port's per-scene exit seeds, to confirm scene 4 leaves both sides on
`0x90b31246` and scene 5 does not. The port does not expose them:
`buildSceneN(d3d, opts)` DEFERS the build, so constructing the scenes from a
page probe consumes no RNG at all — measured, the state stayed at `0x00000001`
through all eight. A hook is needed inside the build, not around it.

## ⚠ There is no scene 6

The demo builds Landscape indices **0,1,2,3,4,5,7,8** — eight scenes through
nine object slots, read off the `scene*.js` `new Landscape(d3d, sceneIdx,
{objIndex})` calls. Index 6 is never constructed, and building it consumes RNG
the original never consumes. `--scenes 0,1,2,3,4,5,6,7,8` reads like the
thorough option and silently corrupts every seed comparison downstream;
`drawstream.py` now rejects it.

---

# The RNG divergence — what is measured, and what is not

`#51`, `#52` and `#53` are one bug (see above): everything RNG-derived in scene 5
differs while everything descriptor-derived matches. This section records how far
the hunt for *where* the stream parts actually got, including a probe that turned
out to measure nothing.

## Cloud parameters — the same bug as the leaves

At 0x173c the cloud scroll is draw 0, two full-screen layers, 8 vertices.

| | original | port |
|---|---|---|
| layer 0 / 1 colour | `0xff3f3f3f` / `0xff7e7e7e` | identical ✅ |
| layer 0 UV span | **3.1468** | 2.2040 |
| layer 1 UV span | **2.4685** | 1.0658 |

The colours are exactly right, so the grey ramp and the alpha are faithful — the
alpha was the obvious suspect and it is innocent. The UV **span** is `p0`, since
`FUN_0040f27e` lays the quad out as `(u*p0, v*p0) … ((u+1)*p0, (v+1)*p0)`, and
`p0` is drawn from the shared LCG at build time:

```js
const s  = F(F(MG.rand01() * K.CLOUD_UV_SPAN) + 1.0);   // rand01()*4 + 1 -> [1,5)
```

Both sides land inside the legal range. They are different draws from a diverged
stream, not a mis-transcribed constant. Clouds tiled at a different scale is
exactly "a different tint of orange, and clouds visible that are not in the
original": same texture, same greys, different pattern.

## ⚠ A probe that measured nothing

Rebuilding the scenes inside an already-booted page — `MG.srand(1)`, then each
`buildSceneN(d3d)` followed by `build()`, reading `MG.randState()` between —
produced seeds that disagreed with the oracle at EVERY scene, including scene 0,
which contradicts ORACLE.md's recorded match. The right conclusion was to
distrust the probe, and it was then measured directly:

**a warm rebuild of scene 0 consumes 240 RNG draws. A cold one consumes
344,078,249.**

The texture cache is already populated, so texgen draws nothing the second time.
The probe was self-consistent — the same value twice — which is precisely why
self-consistency is not evidence of correctness.

Getting the port's real per-scene seeds needs a hook INSIDE the cold boot, not a
rebuild after it.

## A lead worth checking: the gap is one shadow bake

Walking the LCG from seed 1 and recording where each observed state falls:

    240             port, warm rebuild of scene 0   (i.e. nothing)
    344,078,249     oracle scene 0 exit
    1,417,885,946   PORT at __scenesReady
    1,419,983,994   oracle scene 8 exit

The gap between the port's final state and the oracle's is **2,098,048** draws.
One shadow bake is **2,097,152** (`2 × 65536 × 16`, the count scenebuild.py pins
and fast-forwards in closed form). The two differ by **896**.

That is close enough to be worth chasing and not close enough to assert: the
oracle appears to fast-forward one more bake than the port performs, or the port
skips one. If so the divergence is not in a generator at all — it is in how many
landscapes run the bake.

⚠ **These counts are modulo the LCG period** (2³² = 4,294,967,296), so any of
them may be short by whole wraps. The two above are only comparable because they
are near neighbours; **per-scene deltas derived from this table are ambiguous and
must not be used.** The scene exits do not even come out monotonic, which is the
tell.

---

# The RNG hunt, and where it actually stands

⚠ **Read this before trusting the scene-5 numbers above.** The leaf and cloud
findings are real measurements of two streams, but WHOSE stream is wrong is not
settled, and one measurement in the set is provably inconsistent.

## Both sides, at the same semantic point

The port already records the shared-RNG state around each scene's shadow bake,
for its warm store (`js/warmstore.js`, `manifest.shadows[] = {sceneIdx,
streamEntry, streamExit}`); `?warm=record` exposes it on a COLD boot. The oracle
records the same point by hooking `FUN_0040e923`. Directly comparable.

| scene | port entry | oracle entry (1st bake) | |
|---|---|---|---|
| 0 | `0xec790f32` | `0x89d29c2f` | differ |
| 1 | `0x803d556a` | `0x7b4ba91d` | differ |
| **2** | `0x8b6be7d9` | `0x8b6be7d9` | **EXACT MATCH** |
| 3 | `0x70d500cf` | `0x3b7d0100` | differ |
| 4 | `0x442310eb` | `0x8ae9e52c` | differ |
| 5 | `0xacbe7a07` | `0x44887db1` | differ |
| 7 | `0xc0887601` | `0x9611cbd8` | differ |
| 8 | `0xe772cd8b` | `0xb3098f45` | differ |

**Scene 2 matches exactly, on entry AND exit, while every neighbour is hundreds
of millions of draws away.** Two LCG streams that part do not re-converge. So
one of these measurements is not measuring what it appears to. That is the
first thing to resolve; everything else here is provisional until it is.

## Three hypotheses tested and killed

* **A missing shadow bake.** The gap between the port's `__scenesReady` state and
  the oracle's scene-8 exit is 2,098,048 draws against a bake of 2,097,152 — off
  by 896, which looked like a smoking gun. It is not. Counting 2²¹-advances
  between each side's own entry and exit gives **2 bakes for scenes 0–5 and 7,
  1 for scene 8, on BOTH sides**. The `terrainOpt8` gate is faithful:
  `param_14 = (desc[0x4f] & 0x100) != 0` is bit 8, which is what the port reads.
  The apparent coincidence was the modulo-2³² ambiguity already flagged above.

* **Build ORDER.** `js/scenes.js` runs nine constructors and then a loop of
  `build()`, while this target interleaved ctor/build per scene — and
  `scenes.js` itself warns that "the shared RNG stream makes build ORDER part of
  the spec". Fixed to match, and it changed **nothing**: the emulator reports
  `constructed 8 objects, seed 0x00000001`. The Landscape constructors draw no
  random numbers at all, so the interleaving never mattered.

* **The missing `Border` object.** `objects[2]` is constructed before every scene
  and it both draws from the stream and RESEEDS it (`srand(4000)`,
  `srand(5000)`, `scene_camera.js` ~135). The oracle never built it. Added
  (`FUN_00406539`, `BORDER_CTOR_VA`) — it leaves the seed at `0xb0737aef` rather
  than 1, and scene 0's build STILL exits at `0x1f818a28`. **The scene builds
  are seed-independent**; they reseed internally. Kept in the target because it
  is the faithful sequence, but it is not the divergence.

## What that leaves

The difference is in draws consumed INSIDE a scene's own build, before its
shadow bake — texgen, terrain, trees. Not in the surrounding sequence, not in
the bake gate, not in build order.

## ⚠ A probe that measured nothing

Rebuilding the scenes inside an already-booted page (`MG.srand(1)`, then
`buildSceneN(d3d)` + `build()`, reading `randState()` between) disagreed with the
oracle at every scene, contradicting ORACLE.md. The probe was wrong, not the
record: **a warm rebuild of scene 0 consumes 240 RNG draws where a cold one
consumes 344,078,249** — the texture cache is already populated, so texgen draws
nothing. It returned the same numbers twice, which is exactly why
self-consistency is not evidence of correctness.

Use the warm-store record (`?warm=record`) instead. It is a cold boot and the
port maintains it for its own purposes.
