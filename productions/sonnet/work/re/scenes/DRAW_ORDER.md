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
