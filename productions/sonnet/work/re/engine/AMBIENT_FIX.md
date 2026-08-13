# AMBIENT_FIX — D3D8 fixed-function ambient material source

Status: IN PROGRESS (started)

## Task
Claim under test: `D3DRS_AMBIENTMATERIALSOURCE` defaults to `D3DMCS_MATERIAL`, not
`D3DMCS_COLOR1`. If true, the shim's `dif.rgb * lit` is wrong: the ambient term
must NOT be multiplied by the vertex diffuse.

## Log
- [t0] Located shader in `web-sonnet/js/minid3d8.js` ~line 694-722. Current model:
  `lit = uAmbient + sum(att*(Ld*ndl + La)); dif.rgb = dif.rgb * lit`.
  Comment cites D3D8_API.md 9.2 item 5.
- [t1] DOCS VERIFIED (subagent, MS Learn + Wine + DXVK):
  COLORVERTEX=TRUE, DIFFUSEMATERIALSOURCE=D3DMCS_COLOR1,
  SPECULARMATERIALSOURCE=D3DMCS_COLOR2, **AMBIENTMATERIALSOURCE=D3DMCS_MATERIAL**,
  EMISSIVEMATERIALSOURCE=D3DMCS_MATERIAL, D3DRS_AMBIENT=0, NORMALIZENORMALS=FALSE.
  Wine dlls/wined3d/stateblock.c and DXVK d3d9_device.cpp both default ambient
  source to MCS_MATERIAL. NB a DX8-era WinCE MSDN page says D3DMCS_COLOR2 for
  ambient — that is a known doc copy-paste bug (contradicted by D3D9 docs + both
  runtimes). Either way it is NOT COLOR1, so the shim is wrong.
  MS ambient equation: Ambient = Ca * (Ga + sum(Atten*Spot*La)).
  Alpha always from the diffuse colour alpha. Claim HOLDS.
- [t2] BINARY FACT 1 VERIFIED. `re/out/sonnet.c`: SetRenderState always goes through
  wrapper `FUN_00402349` (49 call sites; zero direct `+0xc8` vtbl calls). The complete
  set of literal render states used is:
    0x07 0x0e 0x0f 0x13 0x14 0x16 0x17 0x18 0x19 0x1b 0x1c 0x22 0x23 0x24 0x25
    0x3c 0x89 0x8b 0x8c 0x98
  plus ONE variable-state site (line 766, FUN_00401abf) whose state is 0x1c or 0x30.
  **No 0x8d (COLORVERTEX), 0x91 (DIFFUSEMATERIALSOURCE), 0x92, 0x93
  (AMBIENTMATERIALSOURCE) or 0x94 anywhere.** D3D defaults apply.
- [t3] BINARY FACT 2 VERIFIED. Exactly one `+0xa8` (SetMaterial) call site, sonnet.c:480
  inside FUN_00401575:
      FUN_00404282(&local_60, 0, 0x44);        // memset D3DMATERIAL8
      local_60 = local_5c = local_58 = 1.0f;   // +0x00,+0x04,+0x08 = Diffuse.rgb
      local_50 = local_4c = local_48 = 1.0f;   // +0x10,+0x14,+0x18 = Ambient.rgb
      SetMaterial(&local_60);
  D3DMATERIAL8 layout: Diffuse@0x00, Ambient@0x10, Specular@0x20, Emissive@0x30,
  Power@0x40. So Diffuse=(1,1,1,0), **Ambient=(1,1,1,0) — WHITE**, Specular=Emissive=0.
  CLAIM FULLY HOLDS. Proceeding with the fix.

## The fix (implemented)
`web-sonnet/js/minid3d8.js`:
- new `uniform vec3 uMatAmbient` (D3DMATERIAL8.Ambient.rgb), uploaded from
  `SetMaterial()`; GLSL default 0 matches D3D's all-zero default material.
- VS lighting now accumulates two sums instead of one:
    difSum = Σ att * lightDiffuse * max(N·L,0)
    ambSum = D3DRS_AMBIENT + Σ att * lightAmbient
    rgb    = clamp(vertexDiffuse.rgb * difSum + uMatAmbient * ambSum, 0, 1)
    a      = vertexDiffuse.a           (untouched)
  No normalize() added; N is still `(uWorld * vec4(aNormal,0)).xyz`.
- `D3DRS_AMBIENTMATERIALSOURCE` guard now accepts D3DMCS_MATERIAL (was COLOR1);
  DIFFUSEMATERIALSOURCE guard unchanged (COLOR1). Const comment at line 127 fixed.

## Test correction (explicit)
`web-sonnet/test/minid3d8_test.html` had ONE check encoding the wrong model:
  'vertex diffuse REPLACES the material diffuse (COLORVERTEX/D3DMCS_COLOR1)'
  — red vertex diffuse + ambient-only, expected 128,0,0 (i.e. ambient tinted by
  the vertex). Under the correct model it is 128,128,128. It failed 115/116.
Replaced (together with the adjacent white-quad 'D3DRS_AMBIENT alone' check, so
the count is unchanged at 2) by a pair that pins BOTH routings with the same
red quad:
  - light-only, no ambient      -> 128,0,0    (diffuse term IS vertex-tinted)
  - ambient-only, no light      -> 128,128,128 (ambient term is NOT)
Result: 116/116.

## Sweep A/B (one snapshot; only the one shader line differs)
BEFORE (old model, `dif.rgb * (difSum + ambSum)`), `--tag=before`, 354 samples:
  RMSE best 0 (0x2b00)  median 27.06  mean 28.94  worst 118.99 (0x0710)
  PSNR median 19.48 dB

AFTER (correct model), `--tag=after`, same snapshot, 354 samples:
  RMSE best 0 (0x2b00)  median 27.06  mean 28.94  worst 118.99 (0x0710)
  PSNR median 19.48 dB
  => delta 0.00 on every one of the 354 samples.

## !!! The predicted consequence DOES NOT MATERIALISE
Byte-comparing the 354 `ours_before_*.png` / `ours_after_*.png` pairs:
  346 frames BYTE-IDENTICAL; 8 differ (0x1208 0x1228 0x1230 0x1308 0x1318
  0x1320 0x1328 0x1528, all obj 7) and each by 1-7 CHANNELS at +/-1 LSB.
That is float re-association (`d*(x+y)` vs `d*x + 1*y`), not a model change.
0x0738 is byte-identical before/after.

Reason: the premise "the mesh generator bakes a radial alpha/COLOUR fade into
vertex diffuse" is wrong for the terrain. `js/meshgen.mjs` `applyShorelineColours`
(line ~558):
    terrainMesh.setColor(i, ((((-(a+1))<<24)>>>0) | 0x00ffffff) >>> 0);
The shoreline fade is baked into **ALPHA ONLY**; the RGB stays 0xffffff. With a
white vertex diffuse, `vertexDiffuse.rgb * ambSum` == `matAmbient(white) * ambSum`,
so the old and new models are algebraically identical on every lit surface here.
(The water mesh does get rgb 0x3f3f3f, but it is not drawn with lighting on —
otherwise the fix would have brightened it by ~24 levels, and it did not.)

The 8 one-LSB diffs are nonetheless PROOF the new code path is live and that
uMatAmbient really is 1.0: the two expressions can only differ at all when
uLighting=1 and ambSum != 0.

=> The fix is CORRECT and now matches D3D8, but it is NOT the cause of the
   "shadow on the landscape is too dark" at 0x0738. That has another cause.

## Final verification
- `test/minid3d8_test.html`: **116/116** (one check corrected, see above).
- `web-sonnet/test/{integration,timeline,text,generate}_test.mjs`: ALL PASS.
- `js/meshgen_test.mjs`: **369/369**. (Note: the path in the brief was
  `web-sonnet/js/meshgen_test.mjs`; the file is at `js/meshgen_test.mjs`.)
- Sweep median RMSE 27.06 before AND after (one snapshot, `--tag=before` /
  `--tag=after`, no `--seq`, no concurrent sweep). Nothing got worse.
- Object 10 (0x2300..0x2b00, D3DRS_AMBIENT 0xFFFFFFFF with lighting off via flag
  bit 8): every sample byte-identical, as required.
- Crop evidence: `verify/ambient_fix_0x0738_crop.png` — ours BEFORE / ours AFTER /
  REFERENCE of the shaded hillside. Ours 27.94 mean luma before AND after;
  reference 43.53. The fix does not move it.

## Where the 0x0738 darkness must come from instead (NOT investigated here)
Ruled out: the ambient material source. Still open candidates —
  * `D3DRS_AMBIENT` value/decoding: scene7.js uses K.AMBIENT = 0x1f1f1f1f. The
    shim unpacks it as `((v>>16)&255)/255` etc. Worth re-deriving 0x1f1f1f1f
    from FUN_00406004 rather than trusting it.
  * The terrain TEXTURE (texgen) being darker than the original's in shadow.
  * The un-normalised normal shortening (deliberately kept) combined with the
    terrain's normal averaging — a shorter |n| darkens creases, and if our
    averaging differs from FUN_*'s the shadowed slope suffers first.
  * Fog / haze: att1 = max(desc.haze, K.ATT_MIN) feeds the light attenuation.
