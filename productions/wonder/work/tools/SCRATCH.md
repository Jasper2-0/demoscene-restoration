# Wonder scratch ledger

Per METHOD.md, *Let a tool earn the right to be believed*. One line per script written
during an investigation, and what became of it. Nothing evidence-bearing may be left
only in `/tmp` when an investigation closes.

## 2026-08-20/21 — the draw-stream campaign

Investigation: why Wonder's parts score 0.78-0.86 when the draw stream matches the
executable. Produced two engine fixes (closing TCB endpoint bias 0.5 -> 0.75 for scalar
tracks; the shite deform's mirrored normal field) and five dead ends, two of which were
the measurement rather than the port.

### Promoted to `scratch/`

| tool | question it answered | why it survived |
|---|---|---|
| `extract-exe-texture.sh` | what image was ACTUALLY bound at a draw | only access to texture content; ids are reused so size cannot identify a texture |
| `decode-exe-texture.py` | ditto, base64 PNG out of `glretrace -D` | carries the bottom-up row-order fact |
| `compare-texture-to-asset.py` | is the port binding the same picture? | CHECK; validated at 1.06 (same) / 24.82 (unflipped control) / 45.16 (unrelated) |
| `check-shite-deform-normals.mjs` | is the modifier fed the engine's normal orientation? | proved the fix two independent ways: fit error 0.066 vs 3.330, survivors 174 vs 178 |
| `check-global-scale.py` | is the reference a scaled version of ours? | killed the "capture is zoomed" lead; fails on 4106a0 (1.06), passes on 40cea0 (1.00) |
| `extract-uv-range.sh` | what texcoords did the executable submit? | the truncated-scan counterexample is now a coverage assertion that exits 1 |

### Kept as lessons, inside the tools above

* **Frame search is underdetermined.** `frames.mjs` searched for the object-clock frame
  reproducing the executable's 174 surviving triangles; dozens of frames in [0,200) give
  exactly 174, and the clock was never wrong. Recorded in
  `check-shite-deform-normals.mjs`'s header as the false finding it prevents.
* **A partial scan manufactures a clean defect.** `uv18.sh`/`uv20.sh` scanned calls
  2664600-2668523 of a 1944-vertex draw and reported a 1.5x V-only scale error. The
  range is now an argument and the vertex count is checked; the failing case is the
  fixture in `extract-uv-range.sh`.
* **Row order is not obvious.** The first texture comparison read as a vertical-flip
  defect. The control is the WONDER text overlay (texture 27 @68.642), which decodes
  upside down. Recorded in `decode-exe-texture.py`.

### Not promoted — question recorded, script let go

Left to expire in `/tmp`. Findings from these are written up in `../re/EFFECT_STATUS.md`; the scripts were
one-shot readers, re-derivable in minutes, and none is the only access to its layer.
Nothing below is cited as evidence anywhere except through the write-ups named here.

* `facing.mjs`, `fitted.mjs`, `solve.mjs`-`solve4.mjs` — successive attempts at the
  facing rule and the deform fit. Superseded by `check-shite-deform-normals.mjs`.
  `facing.mjs`'s negative result (no variant of normals x sign x combine gives 174) is
  what redirected the search from the facing rule to the deform's input.
* `meshes.mjs`, `mat.mjs`, `bm.mjs`, `beg.mjs`, `quv.mjs`, `tracks.mjs`, `rec.mjs`,
  `rec2.mjs`, `shape.mjs`, `snap.mjs` — one-line `.exp` readers (mesh face counts,
  material blendMode/opacity, track keyframe times, stored texcoord ranges). These
  established that `boxical4.exp`'s Box01 is static and that its camera roll is keyed at
  frames 0/50/100, which localised the TCB defect to the final spline segment.
* `pet.sh`, `pet2.sh` — per-primitive state across the 300 batched petals; established
  they share one modelview and one texture pair, so the port's batching into 2x2700 is
  legitimate.
* `texid.sh`, `tp.sh`, `tp2.sh` — texture id/size/filter inventories; established that
  the executable never mipmaps, sets `GL_NEAREST` on 5 of 75 textures, and reuses GL
  ids across sizes (which is why identity-by-size fails).
* `tc.sh`, `tc2.sh`, `tc3.sh` — texcoord dumps, superseded by `extract-uv-range.sh`.
* `imp.mjs` — attempted to resolve GL entry points from the PE import table; Wonder
  resolves them dynamically, so they are not there. Negative result, recorded here only.
