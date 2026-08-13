# Wonder asset formats

## Container: `WON.DER`

`WON.DER` is a custom named-entry archive. Each payload byte is decoded with:

```text
decoded[i] = encoded[i] XOR ((0x53 + 0x13*i) & 0xff)
```

`../unpack.mjs` extracts 82 directory entries to 78 unique files. Four pairs
differ only by filename case and contain identical payloads.

## `.exp`: Sunflower scene export

This is a binary, runtime-oriented 3D scene and keyframe stream. It is not a
Tesla/3DS file.

Header:

| offset | size | meaning |
|---:|---:|---|
| `0x00` | 4 | ASCII magic, `SUNF` or `KEXP` |
| `0x04` | 4 | little-endian scene frame span/end frame |
| `0x08` | ... | typed record stream |

The frame values range from 64 to 600 and line up with the scene animation
lengths. Yoghurt's older 3DS loader stores the imported keyframe range in
`scene_t.frames`, which supports this interpretation.

Wonder's loader at virtual address `0x402160` recognizes both magics, skips the
second dword, and dispatches record types 1 through 10:

| type | Wonder parser | interpretation |
|---:|---:|---|
| 1 | `0x401b20` | mesh/object |
| 2 | `0x401870` | camera |
| 3 | `0x401850` | light |
| 4 | no-op | reserved/target variant |
| 5 | `0x401650` | target/helper |
| 6-9 | no-op | reserved |
| 10 | `0x401510` | material |

Observed records confirm the mapping: `scene.exp` contains type 3 before
`Omni01`, type 2 before `Camera01`, type 5 before `Camera01.Target`, and type 10
before `Material #1`.

`KEXP` is a minor/legacy variant of the same stream, not a separate format. The
same dispatcher and record parsers handle it. Each record starts with its
little-endian `uint32` type. The checked implementation is
`shared/sunflower/js/exp.js`; all 19 streams finish at the exact file length.

Common animation-track layouts are:

| track | disk layout after `uint32 keyCount` |
|---|---|
| scalar | repeated `float time, value` |
| vector3 | repeated `float x, y, z, tension, continuity, bias, time` |
| quaternion | repeated `float w, x, y, z, tension, continuity, bias, time` |

Quaternion values in the stream are rotation deltas, not independent absolute
orientations. Wonder's preparation routine at `0x404290` replaces each value
after the first with `q[i] * q[i+1]`, then `0x403d80` constructs the incoming
and outgoing nonuniform-time TCB SQUAD controls. Sampling at `0x4043d0` retains
the executable's short/long-arc choice. The resulting rotation matrix uses the
literal storage order written by `0x403010`; these details are covered by the
shared runtime regression tests.

Mesh payloads are `name[32]`, signed object ID, vertex/UV/face counts, signed
parent ID, signed material index, pivot xyz, packed position xyz values, packed
UV values, optional per-face UV indices, and faces of three vertex indices plus
a smoothing-group flag. Translation, quaternion, and scale tracks follow.
Camera payloads contain `name[32]`, target name `[32]`, object and parent IDs,
then position, FOV, and roll tracks. Lights contain name/IDs, type, RGB,
multiplier, hotspot, falloff, and a position track. Targets contain name/IDs
and a position track.

Wonder material payloads are fixed at `0xad` bytes for `KEXP` and `0xae` for
`SUNF`:

| offset | field |
|---:|---|
| `0x00` | material name `[32]` |
| `0x20`, `0x40`, `0x60` | three map names `[32]` |
| `0x80` | map/render mode `uint32` (3 in every supplied scene) |
| `0x84` | two-sided/state byte |
| `0x85`, `0x91`, `0x9d` | ambient, diffuse, specular RGB float triples |
| `0xa9` | opacity float |
| `0xad` | `SUNF` blend byte; 1 selects source-alpha/additive blending |

The last byte is no longer unknown: parser `FUN_00401510` copies it to runtime
offset `+0x98`, and `FUN_00407fb0` maps 0 to `SRC_ALPHA /
ONE_MINUS_SRC_ALPHA` and 1 to `SRC_ALPHA / ONE`. The colour and opacity fields
are also corroborated by compiled effects writing runtime offsets `+0xa8`,
`+0xb4`, `+0xc0`, and `+0x9c`.

Files:

- 16 `SUNF` scenes
- 3 `KEXP` scenes: `boxical.exp`, `boxical4.exp`, `spherical.exp`

## `.env`: text animation envelope

The seven `.env` files are loose ASCII/CRLF keyframe or sync envelopes.

- The first line is a label.
- Scalar samples use `t <time> v <value>`.
- Vector samples use `t <time> v <x> <y> <z>`.
- The parser ignores the literal first and third tokens. This explains the
  inconsistent `D`, `d`, and `t` markers in the files.
- Records optionally carry tension, continuity, and bias after the scalar or
  XYZ value. Shipped curves omit them and therefore use zero for all three.
- Values are sampled with the native nonuniform-time Hermite/TCB tangents at
  `0x405580` (vector) and `0x4058b0` (scalar), including the special endpoint
  equations. They are not linearly interpolated.
- Parsing ends when the next line does not match. Terminators include `END` and
  `EEEEEEEEND`; one is attached to the previous record.

The corresponding `sscanf` patterns occur around Wonder VA `0x436064`,
including `%*s %f %*s %f %f %f`.

## Headerless images

The `.tga` extension is misleading here. Wonder's composite texture loader at
VA `0x407c50` decodes the first input as JPEG when it ends in `.jpg`; otherwise
it treats it as headerless square RGB24. It takes the second input as one raw
alpha byte per pixel and uploads the interleaved result as RGBA.

| files | actual format | dimensions |
|---|---|---:|
| `LeftSideOfSecret1b.tga`, `RightSideOfSecret1b.tga` | headerless RGB24 | 256x256 |
| `D1_CircleAlpha.tga`, `D1_FaceAlpha.tga`, `D1_WonderAlpha.tga` | 8-bit alpha masks | 256x256 |
| `unrd1.raw`, `unrd3.raw` | 8-bit masks | 256x256 |
| `bump.raw` | 8-bit bump/height map | 512x256 |

The decoded previews in `previews/` visibly reproduce the expected artwork,
titles, silhouettes, and displacement maps. This confirms both the dimensions
and the one-/three-channel interpretation.

## Standard formats

- `.jpg`: ordinary JPEG textures.
- `mystified.xm`: ordinary FastTracker II module.

## Open questions

- The name/meaning of material map mode 3 beyond the executable's callback
  selection; no supplied Wonder file exercises another value.
- Whether record types 4 and 6-9 were emitted by another exporter revision or
  merely reserved by this runtime.
