# Mosaik — Haujobb (PC demo compo, Mekka & Symposium 2001)

## SUMMARY
- **Title / year / party**: Mosaik — Haujobb, released PC Demo Compo, Mekka & Symposium 2001 (nfo). Exe link timestamp 2001-04-15 11:55:54 UTC; file mtimes 2001-04-15.
- **Credits** (file_id.diz): visualice, janne, cynic, radix.
- **Engine**: same MFC-shell OpenGL scene player as Moments (2000) — measurably the same codebase (see cross-prod section). Version resource still not fully renamed in Moments ("AsmDemo MFC Application"); Mosaik's is filled in ("Mosaik - A Demo from Haujobb at MS2001").
- **GFX API**: OpenGL 1.1 fixed-function + GL_ARB_multitexture via wglGetProcAddress (34-name loader table). No shaders, no other extensions.
- **Audio**: fmod.dll, FSOUND 3.20 (measured from FSOUND_GetVersion), streams Data/Mosaik.mp3 (MPEG1 L3 128kbps 44.1kHz JStereo).
- **Data formats**: 24 .HJB (3ds-max-exported scene: meshes + cameras + controller tracks + materials), 66 baseline JPEG, 3 RGBA PNG, 1 mp3, script.txt timeline.
- **Packer**: Mosaik.exe NOT packed (upx: NotPackedException). fmod.dll is UPX-packed (stock Firelight build; upx -d works on a scratch copy). ijl11.dll unpacked.
- **Port difficulty**: 3/5 — GL fixed-function, baseline JPG/PNG/mp3 all free; the one real unknown is the .HJB animation-controller blocks.
- **Closest sibling**: **moments** (2000) by a wide margin — byte-identical fmod.dll + ijl11.dll, 95% string-table overlap, identical launcher dialog/resources, identical script grammar.

## 1. Archive inventory

`originals/haujobb/mosaik/`: `ms2001.nfo` (353 B, party stamp only), `scene.org` (2033 B, scene.org banner), `Mosaik/`:

| file | size | mtime | what |
|---|---|---|---|
| Mosaik.exe | 389,120 | 2001-04-15 | PE32 GUI i386, not packed |
| fmod.dll | 74,240 | 2000-05-04 | FMOD 3.20, UPX-packed (stock) |
| ijl11.dll | 180,224 | 1999-08-18 | Intel JPEG Library 1.1 |
| script.txt | 6,441 | 2001-04-15 | timeline (below) |
| file_id.diz | 69 | 2001-04-15 | credits |
| Data/ (94 files) | | | 66 .jpg + 24 .HJB + 3 .png + 1 .mp3 |

No nested archives. HJB mtimes: Feb–Apr 2001 (Black.HJB 2001-02-08, City.HJB 2001-04-12).

## 2. Packer
`upx -t Mosaik.exe` → NotPackedException; section names are stock MSVC (.text/.rdata/.data/.rsrc). fmod.dll tests OK as UPX and `upx -d` (UPX 5.2.0) unpacks a scratch copy cleanly — that is Firelight's own shipping compression, same byte-identical DLL as Moments ships.

## 3. PE map — Mosaik.exe (with Moments.exe alongside)

| | Mosaik.exe | Moments.exe |
|---|---|---|
| Link timestamp | 2001-04-15 11:55:54 | 2000-12-27 04:53:44 |
| Linker | 6.0 (MSVC 6) | 6.0 |
| .text raw | 217,088 (vsz 215,454) | 225,280 (vsz 222,990) |
| .rdata raw | 28,672 | 28,672 |
| .data raw/virt | 20,480 / 40,136 | 20,480 / 90,600 |
| .rsrc raw | 118,784 | 118,784 |
| overlay | none | none |

Imports (both): OPENGL32 (47 vs 52 funcs), GLU32 (gluLookAt, gluPerspective, gluBuild2DMipmaps), ijl11.dll (ord 2/3/4 = ijlInit/ijlFree/ijlRead), fmod.dll, KERNEL32 (110 both), USER32 (115 both), GDI32 (35 both), comdlg32/WINSPOOL/ADVAPI32/COMCTL32 — the last four are the statically-linked-MFC print/registry surface. No MSVCRT/MFC42 imports → static CRT + static MFC 4.2 (MFC RTTI `.?AVCCmdTarget@@` etc. present in both).

fmod import diff: Mosaik adds **`_FSOUND_Stream_GetTime@4`** (7 funcs vs Moments' 6). This is the sync change that explains the script diff below.

GL import diff: Moments-only glLoadMatrixf, glNormal3f, glPushAttrib, glPopAttrib, glTexEnvf; Mosaik-only glDisable-set unchanged otherwise. Everything else identical.

Resources: byte-for-byte the same tree shape in both exes — BITMAP 131 (100,482 B splash, same size, different pixels: sha256 525a6f68… vs b08f6956…), same MFC string tables/cursors, DIALOG 102 = launcher: "Run Demo / Properties / WindowMode / 640x480 / 800x600 / 1024x768 Fullscreen / No Sound / Loop Demo" — identical control text in both, only the caption differs ("Mosaik - Haujobb" vs "Moments - Haujobb").

Version resource: Moments still says **"AsmDemo MFC Application" / AsmDemo.EXE / Copyright (C) 2000** (the MFC AppWizard project name); Mosaik's was edited: "Mosaik - A Demo from Haujobb at MS2001", CompanyName "Haujobb", Copyright (C) 2001.

## 4. Graphics API
OpenGL 1.1, fixed-function. Evidence: static OPENGL32/GLU32 imports (glBegin/glEnd, glTexGen, display lists, vertex arrays via glArrayElement); ChoosePixelFormat/SetPixelFormat/SwapBuffers in GDI32; EnumDisplaySettingsA/ChangeDisplaySettingsA for fullscreen. One extension: a 34-name wglGetProcAddress table in .data — glActiveTextureARB, glClientActiveTextureARB, glMultiTexCoord{1..4}{d,dv,f,fv,i,iv,s,sv}ARB, **with `glMultiTexCoord1dEXT` (EXT, not ARB) as the lone off-pattern name — the same anomaly is in Moments' table**, i.e. the identical copy-pasted loader. No GL_ extension-string checks in either binary. Error strings (identical wording in both): "Can't Find A Suitable PixelFormat." / "Can't Set The PixelFormat." / "Can't Create A GL Rendering Context." / "Can't activate GLRC."

## 5. Audio
fmod.dll FSOUND 3.20 (FSOUND_GetVersion is `fld [3.2f]; ret` — measured on the unpacked scratch copy). Used strictly as an mp3 streamer: SetOutput, Init, Stream_OpenMpeg, Stream_Play, Stream_SetPosition, Stream_GetTime, Close. Plays Data/Mosaik.mp3.

## 6. Data formats — .HJB (24 files; population tabulated, plus 16 in moments and 6 in genoaux)

Fixed prefix across **all 46 files in the three productions**:

| off | type | value (population) |
|---|---|---|
| 0x00 | u32 | **0** in 46/46 (version? reserved?) |
| 0x04 | u32 | varies: mosaik 9–1400, moments 220–740, genoaux 100–4000 — INFERRED animation length in frames |
| 0x08 | u32 | first-record type: 0 or 1; **=1 exactly when the first named record is "Camera01"** (7/7 in mosaik, 1/1 in moments, 0 in genoaux; perfect correlation across 46 files) |
| then | | repeated records: u32 type (0=mesh, 1=camera, 2=camera-target INFERRED), C-string name `"Name (HEXHANDLE)"` — the hex is a 3ds max node handle, e.g. `Box01 (51008E0)` |

Mesh record (measured fully on Black.HJB, 1108 B, and consistent with I1–I9, Curtains):
u32 V (8 for Box01); V×3 f32 positions; u32 F (12); F×3 corner records of {u32 vertex index, f32 u, f32 v}; then per-face u32 table (0..F-1); then controller blocks that contain **raw in-memory structs including pointer garbage** (0x01E76918 repeats where a pointer sat); then u32 material count, material records {name "(handle)", f32 ≈0.11/0.99, C-string absolute .bmp path}. Camera records end in 0xFFFFFFFF sentinels.

Embedded source paths (exporter dumps the artist's tree): mosaik → `D:\Mosaik\Data\*.bmp`, `D:\Textures\Mosaik\*.bmp`, `D:\Textures\*.bmp`, and one `D:\Memoirs\Data\Black.bmp`; moments → `D:\Textures\Pictures\*.bmp`, `D:\Textures\*.bmp`; genoaux → `C:\Genouax\Data\*.bmp` plus one `F:\Free\data\Black.bmp`. Same `D:\Textures\` tree in moments and mosaik = same artist machine.

Mosaik header dword @4 values: 9 (Intro_Dif), 100 (I1–I9, Intro1–4), 190 (Alpha), 400 (Scape120a), 430 (Flower), 450 (Black), 500 (Space1–4), 900 (City), 1400 (Hug2).

Textures: all 66 .jpg are **baseline** JPEG (SOF0; checked programmatically, 66/66) — browser-decodable directly. PNGs are 512×256/512×287 RGBA non-interlaced. Engine also contains a statically linked libpng + zlib 1.1.3 ("inflate 1.1.3 Copyright 1995-1998 Mark Adler") in both exes.

## 7. script.txt grammar (and the diff vs moments — see cross-prod section)
Sections: `[mp3]` (1 line), `[textures]` (63 lines), `[scenes]` (23 lines), then 90 `[part]` blocks of exactly 5 lines:
```
[part]
<scene>.hjb
<time>          ; mosaik: absolute mp3 time in ms, monotonic 1333 → 213830 (3:33.8)
<camera>        ; "standard" or a named camera in the .hjb: Camera01..Camera05
<texture1>      ; "standard" or a texture override (.jpg)
<texture2>      ; "standard" or an overlay/alpha texture (.png/.jpg)
```
Referenced but absent from Data/: `Allwhite.jpg` (Data has only AllWhite128.jpg) and `I9b.jpg` — so the loader must tolerate a failed texture load (absence MEASURED; tolerance INFERRED). Case-insensitive filenames used throughout (sleep1.jpg vs Sleep1.jpg).

## 8. Strings of interest
- "Mosaik - Haujobb" (window/dialog caption), "script.txt", "data\Loading.jpg" (hardcoded loading screen; Moments hardcodes data\claw.jpg, flare4, himap3, inter, widescreen1 instead).
- Section tokens in the binary: exactly `[mp3] [textures] [scenes] [part]` + "standard" — identical set to Moments.
- MFC 4.2 RTTI, MSVC6 CRT messages; libpng/zlib 1.1.3 messages (identical set in both exes).
- No GL_/vendor extension strings, no compiler path strings.

## 9. Third-party dependencies
- **ijl11.dll** — Intel JPEG Library 1.1 (1999-08-18 build), imported by ordinal 2/3/4. Textures are all baseline JFIF → a browser decodes them natively; IJL fidelity is not a porting issue.
- **fmod.dll** — FMOD 3.20; mp3 streaming only.
- Statically linked: MFC 4.2, libpng, zlib 1.1.3 (PNG overlays).

## 10. Port difficulty — 3/5
Free: all textures (baseline jpg + png), music (mp3), timeline (trivial 5-line grammar with ms timestamps — mosaik is actually *easier* to re-sync than moments because times are absolute stream-ms), fixed-function GL 1.1 + multitexture maps 1:1 onto WebGL.
Hard: the .HJB controller/keyframe blocks (mesh + UV layout is solved above; the animation tracks are raw 3ds-max controller structs with pointer garbage and need the loader disassembled — one loader serves moments/mosaik/genoaux, so decoding it pays off three times). Medium: per-part camera selection and the texture-override compositing ("Black.hjb + texture" is how all the credit/photo slides are done — likely a textured quad scene reused 40+ times).
Shared infrastructure needed: HJB scene player, script.txt scheduler, mp3-clock sync, JPG/PNG texture cache.

## Cross-production evidence (the point of this study)

**Mosaik is Moments' engine, one party later. Measured:**

1. **Byte-identical helper DLLs**: sha256(fmod.dll) `55f8c54c67ce…` identical mosaik↔moments; sha256(ijl11.dll) `5a0b1c4e5d91…` identical across **mosaik, moments, genoaux, liquid** (all four ship the same 1999 Intel build). Genoaux/liquid switch audio to BASS.DLL (different sha256 from each other too — 1.1 vs 1.5 era, unverified versions).
2. **String tables**: 1,153 of Mosaik's 1,208 unique strings (≥5 chars) appear verbatim in Moments (95.4%). Identical GL error wording, identical section tokens, identical libpng/zlib/CRT blocks.
3. **Same copy-paste fingerprint**: the 34-entry wglGetProcAddress table is identical in both, including the off-pattern `glMultiTexCoord1dEXT` among 33 ARB names.
4. **Same MFC AppWizard shell**: Moments' version resource still says "AsmDemo MFC Application / AsmDemo.EXE"; identical launcher DIALOG 102 text, identical resource tree, same 100,482-byte splash BMP slot (different pixels). Same linker 6.0, static MFC 4.2 + CRT in both; no runtime drift 2000→2001.
5. **.hjb format**: identical header/record layout across moments(16) / mosaik(24) / genoaux(6) — same `0, frames, type` prefix, same `"Name (HEXHANDLE)"` naming, same material records with absolute .bmp paths. Same-named files (Black.HJB, City.HJB) are re-exports, not copies (differ from byte 5).
6. **script.txt grammar drift** (measured):
   - moments (2000): `[mp3] [textures] [scenes] [part]`; [part] = 5 lines; time field is small and non-monotonic (60–730; relative frames/duration — INFERRED, consistent with no FSOUND_Stream_GetTime import).
   - mosaik (2001): **same four sections, same 5-line [part] arity**; time field becomes absolute monotonic milliseconds — enabled by the newly imported `FSOUND_Stream_GetTime`. Adds named-camera use (Camera01–05) which moments' scripts never exercise ("standard" everywhere) though moments' Control.HJB already contains a Camera01.
   - genoaux (2002): adds `[parameter] [addeffect] [addpart] [module]`, texture flags (`nomipmap`, `fullscreen`), an extra line in `[mp3]`, and a 6-line [part] (extra `0` after the time).
   - liquid (2002): same extended tokens minus `[mp3]` (XM module via BASS); scene data moved into `liquid.wen`, which is a plain **RAR archive** containing .HJB files (magic `Rar!`, first member `Add_M.HJB`).

**Closest sibling: moments** — on DLL bytes, string overlap, resources, grammar. Mosaik is the last fmod/pure-`script.txt` build of the lineage; genoaux/liquid are the same player grown an effect system and re-based on BASS.

## OPEN QUESTIONS
- The .HJB controller/keyframe block encoding (TCB? linear? per-track key counts) — needs Mosaik.exe's loader disassembled; the 0xFFFFFFFF sentinels and pointer-garbage fields are mapped but not the key layout.
- What the type-2 record ("Camera01" repeated) holds — camera target track is the guess (INFERRED).
- Exact semantics of moments' [part] time field (frames at what fps?) — resolvable from its GetTickCount-based main loop, out of scope here.
- Whether header dword @4 is frames and at what fps (values 9–4000 across the population; never confirmed against code).
- How the engine resolves the two missing textures (Allwhite.jpg, I9b.jpg) — silent skip vs fallback to AllWhite128.jpg.
- Working titles: `D:\Memoirs\` appears once in mosaik's data, `F:\Free\` once in genoaux's — earlier project names or shared scene files? (UNVERIFIED)
