# shared/haujobb — the Haujobb engine runtime

One engine served **nine productions** released 2000–2003 (Mikrostrange, Art,
Moments, Mosaik, Elements, Channel 5 Sequence, Liquid... Wen?, We Are, Genoaux).
The formats never drifted, because the group carried one accreting data directory
forward release after release — `STAR.OB3` is byte-identical across five of them,
and `Black.HJB`, dated 2001-02-08, ships unchanged in four.

So this is shared code by construction rather than by refactoring. The
cross-production study is **[docs/HAUJOBB_PORT_STUDY.md](../../docs/HAUJOBB_PORT_STUDY.md)**.

## Modules

| module | reads |
|---|---|
| `js/hjb.js` | `.HJB` — the 3ds Max scene export: node tree, meshes, cameras, lights, TCB controller tracks, baked vertex-morph tracks, material table |
| `js/ob3.js` | `.OB3` — compact fixed-point geometry |
| `js/script.js` | `script.txt` — the show language, both generations, plus the 16-effect registry |

Every grammar here was read out of a decompiled loader, not inferred from hex
dumps. `hjb.js` follows Moments.exe's record tree (`FUN_0040db10`/`FUN_0040dbe0`);
`script.js` follows Genoaux's parser (`FUN_00405830`).

## Verification

```sh
npm run test:haujobb                               # the 62 loose .HJB in originals/
HAUJOBB_CORPUS="originals/haujobb <rar-dir> <ace-dir>" npm run test:haujobb   # all 252
```

`test/hjb-vs-oracle.mjs` checks this reader against the **independent Python
oracle** (`docs/haujobb/tools/hjb_exact.py`, derived separately from the same
loader) over the whole corpus: byte consumption, frame count, material count and
the record-type sequence in tree order. Two implementations agreeing is a much
stronger statement than either succeeding, and it is how the earlier `.HJB`
parser dispute was settled.

**Result: 252/252 agree.** Exit 0 agree · 1 disagreement or corpus below floor ·
**77 corpus absent**. It has been seen to fail: widening the rotation key from 40
to 44 bytes drops it to 129/252 and returns 1.

## Three things the data will mislead you about

All three were established by counting the whole population, not by sampling it.
They are the difference between a reader that works on the files you looked at
and one that works.

1. **Every TCB float in every multi-key track in all 252 files is `0.0`.** The
   Kochanek-Bartels machinery is real code that no shipped scene exercises;
   everything runs the Catmull-Rom path. Implement it, but do not "verify" it
   against data that cannot exercise it.
2. **Single-key tracks hold exporter garbage in their TCB slots**, and the engine
   skips them with an `n == 1` early-out. Trusting those bytes corrupts exactly
   the tracks that look simplest. `evalTrack` reproduces the early-out.
3. **In Moments the `[part]` number is parsed and never read back.** Its real
   timing is a hardcoded table of absolute seconds in the executable; Art and
   Mikrostrange keep their whole sequence in code as well. Driving those three
   from the script alone gives a plausible, wrong show.

## Conventions preserved, not corrected

- `.OB3`'s **V coordinate is flipped** relative to GL. That is the format.
- `.HJB` UVs live on the **face corner**, not the vertex, so a shared vertex
  carries different UVs per face and the port must split rather than index.
- Rotation keys are quaternions in **(w, x, y, z)** order.
- Scale-track times are in **ticks = frame × 160** (30 fps 3ds Max ticks).
- Names are **latin1** and carry the 3ds Max scene handle: `"Camera01 (4BB64E0)"`.
  A camera's target is linked to it **by identical name**, not by index.

## Not here yet

The 16 effect *drawers* (`tunnel`, `render2texture`, `droid1-3`, the `grid*`
family) and the GL 1.1 + `ARB_multitexture` + `glCopyTexSubImage2D` layer over
WebGL2. The draw-stream oracle in [`tools/winebox/`](../../tools/winebox/) exists
to check them: it records the original's own GL calls per frame, with the show
clock pinned, so a reimplementation can be diffed primitive by primitive before a
pixel is rasterised.
