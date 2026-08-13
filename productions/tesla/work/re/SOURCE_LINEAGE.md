# Tesla source and Sunflower engine lineage

## Conclusion

The three shipped executables cannot currently be described as one engine
lineage.

- **Wonder** (27 September 1999) and **Energia** (20 August 2001) are a
  confirmed engine family. They share the dynamic OpenGL layer and the same
  typed `SUNF` scene stream.
- **Tesla** (8 July 2000) is a separate Yoghurt-led renderer, called Smasher in
  the source. Its shipped executable loads 3D Studio data and imports OpenGL
  directly. It does not contain the `SUNF`/`KEXP` loader.
- The published **Tesla source ZIP is nevertheless valuable** because it is a
  later collection of Sunflower libraries, not a byte-for-byte source snapshot
  of the July 2000 executable. Some of those later library files expose code
  used by Wonder and Energia.

This distinction lets us use the source without incorrectly treating Tesla as
the middle revision of Unreal's scene engine.

## Evidence

### Release order and toolchain

PE timestamps establish this order:

| production | PE timestamp | linker | code size |
|---|---:|---:|---:|
| Wonder | 1999-09-27 23:55:31 | MSVC 6 | `0x32000` |
| Tesla | 2000-07-08 16:07:45 | MSVC 6 | `0x32000` |
| Energia | 2001-08-20 21:55:14 | MSVC 6 | `0x36000` |

The compiler and similar sizes are context, not proof of common custom code;
all three also contain the same statically linked MSVC runtime.

### Tesla's shipped scene path

The source identifies `Load3ds` as Yoghurt/Pulse code dating to 1998 and reads
3DS material, mesh, and keyframe chunks directly:

- `source/load3ds/Load3ds.c:1-56`
- `source/Demo/Smasher/FFDEnvVector.cpp:37`
- `source/Demo/Smasher/Dragon.cpp:10`
- `source/Demo/Smasher/Tree.cpp:19`
- `source/Demo/Smasher/FaceMorph.cpp:51`

The shipped `data.pak` also starts with a 3DS `0x4d4d` main chunk. The archive
abstraction used for development is not present in the published source and is
commented out in `source/Demo/Smasher/Smasher.cpp:298-304`.

Tesla's executable imports the OpenGL entry points it uses directly from
`OPENGL32.dll`. It contains neither `SUNF`, `KEXP`, nor the dynamic-loader
diagnostic string below.

### Shared Sunflower support code in the later source bundle

`source/OpenGL/Dyngl.cpp:366-405` contains a dynamic OpenGL dispatch layer with
the distinctive diagnostic:

```text
GL function called after deintialization
```

The same misspelling, the complete GL/WGL procedure-name table, and the same
`GL_EXT_clip_volume_hint` extension check occur in both Wonder and Energia.
This is strong source-to-binary evidence for a shared library in those two
demos.

It is not evidence that Tesla's released binary used that layer: `Dyngl.cpp`
and `OpenGL.cpp` in the source ZIP are dated 12 August 2000, over a month after
Tesla's executable. Several other files were updated in December 2000 and
January 2001. The source release is a later build tree assembled around Tesla.

## What transfers to the restoration

The following code is useful as a semantic reference for Wonder and Energia,
even where the exact binary layout evolved:

- `source/3dlib/3dlib.h:27-194`: object, camera, light, material, scene, and
  element concepts. The element IDs begin object `1`, camera `2`, light `3`,
  target-camera `4`, target-light `5`, dummy `6`.
- `source/3dlib/Motion.h`: position, rotation, scale, FOV, roll, colour, and
  target keyframe tracks.
- `source/load3ds/Mesh.c:81-185`: 3DS vertex/face mapping, Y/Z exchange, and
  `v = 1-v` texture-coordinate conversion.
- `source/load3ds/Keyf.c:529-553`: keyframe-frame range and node dispatch.
- `source/OpenGL/Dyngl.cpp`: directly recoverable shared GL dispatch code.

The `SUNF` `.exp` files are best treated as a runtime-oriented serialization of
similar scene concepts, not as 3DS files and not as Tesla's in-memory structs.
Wonder uses 32-byte names where the old `3dlib` structs use 20-byte names, and
Energia's runtime objects are larger again.

## What does not transfer directly

- Tesla's Smasher effects and scene loader are not a drop-in renderer for
  Wonder or Energia.
- Tesla's ImageLib expects genuine TGA headers. Wonder's files named `.tga` are
  headerless RGB or alpha planes and must follow Wonder's own loader behaviour.
- Similar fixed-function OpenGL calls or MSVC runtime functions are not, by
  themselves, evidence of shared Sunflower code.

