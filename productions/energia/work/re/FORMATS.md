# Energia asset formats

## Container: `demo.dat`

`demo.dat` is a ZIP archive with only its first local-file signature changed
from `PK\x03\x04` to `UN\x03\x04`. `../unpack.mjs` restores that marker and
extracts 68 files.

## `.exp`: later Sunflower scene export

All seven files begin with `SUNF` and use the same high-level format as
Wonder:

| offset | size | meaning |
|---:|---:|---|
| `0x00` | 4 | `SUNF` magic |
| `0x04` | 4 | little-endian scene frame span/end frame |
| `0x08` | ... | typed record stream |

The frame values are 100, 300, 500, or 600 depending on the scene.

Energia's general scene loader at VA `0x4147a0` recognizes `.asc`, `.ase`,
`.exp`, and `.lws`. Its EXP parser at `0x4192d0` starts at byte 8 and has the
same 1-through-10 dispatch shape as Wonder:

| type | Energia parser | interpretation |
|---:|---:|---|
| 1 | `0x418e00` | mesh/object |
| 2 | `0x418b70` | camera |
| 3 | inline at `0x419338` | light |
| 4 | no-op | reserved/target variant |
| 5 | `0x418990` | target/helper |
| 6-9 | no-op | reserved |
| 10 | `0x418650` | material |

Unlike Wonder, this version does not appear to validate the magic before
skipping the eight-byte header. The identical record numbering and dispatch
are decisive evidence that Energia evolved from the Wonder/Unreal scene
lineage, even though its runtime object layouts are larger and more capable.

The common mesh, camera, light, target, and scalar/vector/quaternion track
layouts are byte-for-byte compatible with Wonder; see
`work-wonder/re/FORMATS.md` for the field order. The checked common parser
consumes all seven Energia streams exactly and validates counts, indices,
monotonic key times, and truncation.

Energia replaces Wonder's fixed material payload with this variable-length
record:

| field | type |
|---|---|
| name, primary map | two fixed strings `[32]` |
| U and V texture offset | two scalar tracks |
| secondary map, environment map | two fixed strings `[32]` |
| flags | `uint32` |
| two-sided | byte |
| ambient, diffuse, specular | three vector3 tracks |
| opacity | scalar track |
| blend mode | byte |

The supplied records happen to be `0x10a` bytes because each material track
has one key; that size is not a format constant. Parser `FUN_00418650` supplies
the field evidence. Renderer `FUN_00414f40` maps blend modes 0 through 3 to
`SRC_ALPHA/ONE_MINUS_SRC_ALPHA`, `SRC_ALPHA/ONE`, `SRC_COLOR/ONE`, and
`ONE_MINUS_SRC_ALPHA/ONE`. The third map is used as the environment/sphere map.

## Headerless `.raw` images

Energia's generic image loader at approximately VA `0x401e30` handles JPEG and
raw RGB. The raw branch uses caller-supplied dimensions and copies three bytes
per pixel.

| files | actual format | dimensions | evidence |
|---|---|---:|---|
| `s.raw`, `sb.raw` | headerless RGB24 | 512x128 | exact size and loader call at VA `0x4126c0` |
| `ADDICT1.raw` | 8-bit grayscale/aux map | 256x256 | size and rendered contents |
| `DISP2.raw` | 8-bit displacement mask | 256x256 | size and rendered radial field |
| `twirlB.raw` | 8-bit mask | 256x256 | size and rendered spiral |
| `wave1.raw` | 8-bit height/displacement field | 256x256 | size and rendered field |
| `yellowshit4.raw` | 8-bit mask | 256x256 | size and rendered cellular mask |
| `shit.raw` | four RGB triplets, likely a 2x2 texture/palette | 2x2 | 12-byte payload |

`shit.raw` contains RGB values black, white, `(200,6,38)`, and `(0,177,230)`.
No reference to its name was found in the executable or EXP streams, so its
purpose and whether it is used remain low-confidence.

The PNGs in `previews/` are diagnostic renders, not replacement assets.

## Standard formats

- `.jpg`: ordinary JPEG textures.

## Open questions

- Which effect consumes each 256x256 auxiliary map and whether it treats it as
  alpha, height, displacement, or lookup data.
- Whether `shit.raw` is dead data or a tiny colour table.
