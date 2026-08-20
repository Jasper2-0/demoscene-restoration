# Art — Haujobb, Assembly 2000 demo (final, exe 2001-06-18)

## SUMMARY
- **Title / year / party**: "Art - Haujobb Assembly 2000 demo, final version" (file_id.diz); PE link timestamp 2001-06-17 08:58:02 UTC; credits in diz: Visualice Cynic Melwyn Droid Hellfire Solar
- **Engine**: bespoke MFC OpenGL app; VS_VERSION_INFO says project name **"AsmDemo MFC Application"** (AsmDemo.EXE), linker 6.0 = VC6, MFC statically linked (RTTI `.?AUCThreadData@@`, WinHelp/GrayString/print imports)
- **GFX API**: OpenGL 1.1 fixed-function + **ARB_multitexture only** (the entire wglGetProcAddress name pool is glActiveTextureARB/glClientActiveTextureARB/glMultiTexCoord*ARB)
- **Audio**: BASS.DLL (92660 b, 2000-02-28), plays `data\yellow.mp3` (MPEG1 L3 128k stereo, ~232.4 s). Only 7 BASS imports; **no BASS_ChannelGetPosition — the demo clock is GetTickCount, not music position**
- **Data formats**: .hjb = 3ds-Max-exported keyframed scene (MEASURED, below); .ob3 = tiny int16 mesh (VERIFIED against loader disasm, below); 48 baseline JPEGs (all 48/48 baseline per `file`); 1 mp3
- **Packer**: none (`upx: NotPackedException`; plain VC6 sections .text/.rdata/.data/.rsrc, no overlay: sections end exactly at 344064)
- **Sequencing**: **no script.txt — the whole timeline is compiled in**: 26 float boundaries stored as immediates at 0x403365–0x40346D, dispatch loop at 0x403b67 (details below)
- **Port difficulty**: **2/5** — fixed-function GL, baseline JPEGs, both container formats now decoded; hard part is reversing per-part effect code and .hjb animation tracks
- **Closest sibling**: **moments** (Dec 2000): byte-compatible .HJB record layout (verified field-by-field), same jpg-texture pipeline, same ijl11.dll (sha-identical across ALL prods); moments differs by fmod audio + external script.txt

## 1. Inventory
`originals/haujobb/hjb_artf/`: Art-final.exe 344064 (mtime 2001-06-18), BASS.DLL 92660 (2000-02-28), ijl11.dll 180224 (1999-08-18), file_id.diz 93 b, data/ = 16 .hjb (28 KB–672 KB, mtimes Jul–Aug 2000), 48 .jpg (Aug 2000, few Oct 2000/Mar 2001), 6 KNOT1–6.OB3 (each exactly 67042 b, 2000-05-04, all different content — 6 morph targets of one mesh), yellow.mp3 3718288 b.

## 2. PE map (MEASURED, hand-parsed)
| section | va | vsize | raw | entropy |
|---|---|---|---|---|
| .text | 0x1000 | 168802 | 172032 | 6.56 |
| .rdata | 0x2b000 | 24612 | 28672 | 4.43 |
| .data | 0x32000 | 65608 | 20480 | 3.19 |
| .rsrc | 0x43000 | 115184 | 118784 | 7.33 |

No overlay. Imports: OPENGL32 (48 fns), GLU32 (gluPerspective/gluLookAt/gluBuild2DMipmaps), BASS.dll (BASS_GetVersion, StreamCreateFile, Start, StreamPlay, Stop, Init, Free), ijl11.dll (ordinals 2,3,4), KERNEL32/USER32/GDI32/WINSPOOL/ADVAPI32/COMCTL32 (MFC baggage). .rsrc: MFC dialogs+strings, VS_VERSION_INFO ("AsmDemo"), one 100 KB 24-bit BMP resource 2/131 (180×186) — likely the setup-dialog picture. Entry 0x412a84.

## 3. THE SEQUENCING (the key question — MEASURED from disassembly)
There is no script anywhere in the data. Everything lives in .text:

1. **Load order** (all refs are inline code in one loader fn, file offsets 0x2a0f–0x3346): loading.jpg, droid.jpg, Credits.jpg, Credits2.jpg, Art_Title3.jpg, Wonder_12.jpg, then ~43 textures, then hjb in order **1,2,4,3,5,6,7,8,9,10…16** (note 4 before 3), then yellow.mp3, then knot1–6.ob3 (0x47fc–0x487d, path literal `data//knotN.ob3`).
2. **Clock** (0x403b4b/0x403b86): `t_seconds = (GetTickCount() - t0) * 0.001` (double 0.001 at .rdata 0x2b6d0). Music free-runs via BASS_StreamPlay; **no resync** — A/V drift is possible and must be reproduced/accepted.
3. **Timeline table**: 26 floats written as immediates onto the stack (esp+0x198..0x1fc) at 0x40334f–0x40346d. Decoded boundaries (seconds):
   `0, 8.278, 62.356, 74.494, 85.768, 104.045, 107.701, 122.537, 126.204, 141.427, 163.238, 166.891, 174.291, 177.995, 181.791, 185.091, 192.798, 196.489, 207.575, 222.0, 242.0, 250.0, 260.0, 270.0, 280.0, 290.0`
   Main loop exits when part >= 0x14 (20) → 20 playable parts, demo ends at t=222 s (mp3 is 232 s). Boundaries ≥222 are dead entries.
4. **Part → frame mapping** (0x403bb9–0x403c0a): find part i with `start[i] <= t < start[i+1]`; local animation frame = `(t - start[i]) * 30.0` (double at 0x2b670) → **.hjb animation is addressed in frames at 30 fps**. hjb header word 1 (500/800/…) is the scene's frame length; part 1 is 54.1 s = 1622 frames vs 1.hjb's 500 → scenes loop or are played partially (UNVERIFIED which).
5. **Dispatch** (0x403c2d ff.): cmp-chain, not a jump table. Special-cased parts: 1, 5 (frame×0.15), 6 (**KNOT part**: skips the glClear mask 0x4100, calls 0x404ae0 with t×1000; knot render code at 0x404700 does `idiv 6` twice → interpolates between consecutive knot meshes with fsin/fcos — morphing torus knot, INFERRED), 7, 9 (its own 4-entry sub-timeline on the stack), 12 (×0.5), 17 (frame+30). Default path: scene object from a stack array `[esp+ebx*4+0x118]`, filled with the loader's return values in hjb load order — so part n renders the n-th loaded .hjb (1,2,4,3,5,…,16) plus the knot/credits parts (exact part→hjb index table needs one more pass, UNVERIFIED).

## 4. .ob3 format — VERIFIED against the consuming code (loader at 0x4014b0)
Tested on all 7 known samples (6 KNOT + STAR.OB3, which is byte-identical in geno/liquid/Satellite):

| file | size | nverts | nfaces | 4+nv*6+nf*20==size |
|---|---|---|---|---|
| KNOT1–6.OB3 | 67042 | 1573 | 2880 | True (all 6) |
| STAR.OB3 | 196 | 12 | 6 | True |

Layout (little-endian, no magic):
- `u16 nverts, u16 nfaces`
- vertices: `nverts × 3 × int16` (x,y,z) — loader does fild only, **no scale**: raw int16 world units
- faces: `nfaces × 10 × int16` = `[i0, i1, i2, mat, u0,v0, u1,v1, u2,v2]`
  - i0..i2: vertex indices (all in range in all 7 files, max 1558/1573)
  - word 3: **material index** — loader does `movsx` then `add ecx,[caller arg]` and stores per-face; value is 0 in all 17,286 faces sampled (single-material meshes), the engine adds a base material id passed at the call site
  - u,v: `float(u) * 0.00390625` (=1/256, double at 0x2b580); **v is flipped**: `v = 1.0 - v/256` (fsubr 0x2b548). KNOT1 has u up to 768 (=3.0, tiling)
- no normals stored (computed at runtime); no name strings, no material names — binding is by the caller's material argument. Error string: `"cannot load object: "`, fopen mode `"rb"`.

The 6 KNOTs share identical topology (same nverts/nfaces, different vertex positions) = morph targets.

## 5. .hjb format — MEASURED structure, byte-compatible with moments
Header: `u32 =0, u32 anim_length_frames, u32 flag` (flag=1 in 10.hjb, 13.hjb and moments Control.HJB, else 0 — meaning UNVERIFIED). Then a sequence of named object records, each starting `"Name (HEXPTR)\0"` — 3ds Max node names with the exporter's in-memory pointer (e.g. `Loft01 (2DDCAF0)`, `Camera01 (2DDEE50)`, `Omni01`, `Material #1 (104FC10)`).

Mesh record (verified in art 3.hjb Box01 and moments Curtains.HJB Box01 — identical):
- `u32 nverts`, `nverts × 3 float` positions
- `u32 nfaces`, faces = `3 × { u32 vertex_index, float u, float v }` (36 b/face)
- then material binding + per-face list (`1, 0, nfaces, 0,1,2,3…`) and PRS animation tracks: position keys (frame,x,y,z), quaternion rotation keys (0.707,-0.707,0,0 seen), scale keys (1.0,0.769,1.0), 0xFFFFFFFF terminators (track container layout partially decoded, UNVERIFIED in detail)
- Camera appears as **two** consecutive `Camera01` records (camera + target track, INFERRED); Omni light record starts with floats (1.0 = color, INFERRED)
- Material records at end of file contain **length-prefixed source paths**: `D:\Textures\Leaf.bmp`, `D:\Textures\Envi_1.bmp` etc. — author's disk layout; names match the shipped data\*.jpg; materials with two textures = diffuse + env map (fits ARB_multitexture + glTexGeni env mapping)

Frame lengths per file: 1:500 2:500 3:800 4:700 5:900 6:650 7:550 8:600 9:850 10:500* 11:650 12:650 13:500* 14:700 15:400 16:700 (*flag=1). Object census: 10–79 objects/file, e.g. 2.hjb has 34 meshes, 30 camera records (15 cuts), 15 materials.
Moments .HJB headers have the same `(0, nframes, 0|1)` shape → **format unchanged between Art (Aug 2000) and Moments (Dec 2000)**.

## 6. Shared-engine evidence (cross-production)
- **ijl11.dll sha256 5a0b1c4e… identical in ALL prods that ship it**: artf, geno, liqu, mifi, moments, mosaik, channel/Satellite
- **BASS.DLL sha256 35cabf96… byte-identical** in artf, geno (re-dated 2001), mifi, channel/Satellite; liquid ships a newer BASS (113288 b, 2002-06-28, sha d5e5eaf2…). Neither BASS has a version resource; 2000-02-28 build ≈ BASS 0.8/0.9 era (UNVERIFIED)
- **STAR.OB3 byte-identical (md5 d8079b7e…) in geno, liquid, Satellite** — same .ob3 code carried forward; Art is the richest .ob3 sample and the format decoded here (with the loader disasm) applies to them
- **moments/liquid/Satellite .HJB = same container** (same header, same name-record pattern, overlapping scene files: Curtains/Control/City/Circle_Around etc. appear in both moments and liquid)
- **Script evolution**: Art (Aug 2000) = everything hardcoded → moments (Dec 2000) script.txt with `[mp3] [textures] [scenes] [part]` (part = scene + number + effect names) → genoaux (Dec 2001) adds `[addpart] [addeffect] [parameter]` and per-texture flags (`nomipmap`, `fullscreen`). Art is the ancestor with the script still in .text
- elements.exe and WE_ARE.EXE both contain .hjb name strings (42/41 hits) → same engine, data embedded/absent
- Closest sibling: **moments** (format-identical scenes, same texture pipeline, adjacent timeframe); Satellite/geno/liquid are later descendants (BASS+script+STAR.OB3)

## 7. Port assessment
Free: 48 baseline JPEGs (browser-decodable, ijl11 unnecessary), mp3, .ob3 (fully specified above), .hjb geometry+materials (specified above). Work: .hjb animation-track grammar (position/rotation/scale/camera/FOV key layout), the ~7 special-part effect renderers, GL fixed-function + 2-unit multitexture emulation (trivial in WebGL), the GetTickCount clock including its drift behaviour. No procedural generation anywhere — all content is in data files; the exe is engine only. Shared infrastructure: an .hjb scene player would serve Art, Moments, Liquid, Satellite and probably Elements/We_Are.

## OPEN QUESTIONS
1. Exact part index → hjb scene mapping for all 20 parts (needs one pass over the dispatch tail 0x403dae–0x404129; parts ≥ #16 use Credits/Credits2/Art_Title3 jpgs — order unread)
2. .hjb animation track record grammar (key counts, interpolation type, the `100`/`nframes` fields seen in Box01), the two-Camera-records convention, and the header flag word (10.hjb/13.hjb/Control.HJB)
3. What scene playback does when part duration × 30 exceeds the scene's nframes (loop vs clamp) — decides visible behaviour of part 1 (54 s vs 500 frames)
4. Material record numeric fields (ambient/diffuse/specular colors, env-map strength) — bytes present, layout undecoded
5. What the knot part's `[esp+0x16c]` material-base and second per-face dword (caller arg stored at face+0x10) mean for texture binding of the 6 knots
