# 05 — originals/haujobb/channel/Satellite/ — "Channel 5 Sequence"

## SUMMARY
- **Title:** Channel 5 Sequence (MEASURED evidence below; name corroborated by Demozoo prod 26203, download `channel.zip` — matches parent dir `channel/`). Working title on disk: "Satellite" (dir name; mp3 ID3 title "Yuki-Satellites"). "Channel Zero" is NOT supported by any evidence.
- **Group / year / party:** Haujobb, released 2002-03-31 at **Mekka & Symposium 2002**, 4th in PC Demo (Demozoo; consistent with file mtimes Mar 17–30 2002 and scene.org stamp 2002-04-01).
- **Engine:** Haujobb OpenGL demo engine, script-driven ("OpenGL WinClass" / "Haujobb" window strings), MSVC 6 (linker 6.0), statically linked MFC; same build family as Genoaux.exe (identical 425,984-byte size).
- **GFX API:** OpenGL 1.1 fixed-function + ARB_multitexture via wglGetProcAddress; render-to-texture via glCopyTexSubImage2D.
- **Audio:** BASS.DLL (pre-2.x, byte-identical to the copy shipped Feb 2000 with Art/mikroStrange) streaming `Data/yuki2.mp3` — "Yuki-Satellites" by **Radix** (ID3: album Journey, 1999), 2:39.56, 96 kbps MP3.
- **Data formats:** 41 JPEG textures (40 baseline, 1 progressive), 1 `.OB3` (tiny int16 mesh, 12 verts/6 faces star), 25 `.HJB` 3ds-max-exported scene files **shipped only inside data.rar** (RAR 2.0), plain-text `script.txt`.
- **Packer:** none (`upx -t`: NotPackedException; normal PE, no overlay).
- **Port difficulty:** **4/5** — textures/music/script are free; the .HJB scene+animation format (up to 1.1 MB/scene) and 8 named effects are the work. data.rar is a non-issue (pre-extract once).
- **Closest sibling:** **hjb_geno (Genoaux.exe)** — same 425,984-byte exe layout (~76% bytes identical), identical script grammar, byte-identical BASS.DLL/ijl11.dll, byte-identical shared asset STAR.OB3.

## 1. Archive inventory

| file | size | mtime | what |
|---|---|---|---|
| morning.exe | 425,984 | 2002-03-17 | PE32 GUI i386, PE TimeDateStamp 2002-03-17 02:50:34 (matches mtime) |
| BASS.DLL | 92,660 | 2001-11-25 (bytes = Feb 2000 copies) | audio, 80 exports, packed sections (nameless, code virtual-only), no version resource |
| ijl11.dll | 180,224 | 1999-08-18 | Intel JPEG Library, version resource "Intel JPEG Library - Retail Version 1.1.2" |
| script.txt | 7,244 | 2002-03-30 | demo timeline, 807 lines: 92 [part] + 2 [addpart] |
| data.rar | 1,127,164 | 2002-03-30 | RAR v2.0 (Win32), 25 .HJB files, RAR 1.5(v20) -m3 -md=1m |
| Data/ (43 files) | — | Jan 2001–Mar 30 2002 | 41 .jpg + STAR.OB3 (196 B) + yuki2.mp3 (1,914,749 B) |

`unrar` note: the homebrew unrar is Gatekeeper-quarantined (SIGKILL, exit 137); a de-quarantined scratch copy was used. Listing/extraction went to scratchpad only.

### data.rar contents (25 .HJB, mtimes 2001-02-08 … 2002-03-29)
Black 1,108 · Cartoon 467,804 · ChannelCity 218,188 · Clock 1,127 · Flower 537,564 · LandS 258,012 · LandSW 51,243 · Line 370,349 · Mask 665 · Molecule 1,111,103 · More_N 698 · Noise1/Noise2/Poem 698 · PartOf 435,753 · Photo 2,441 · Print 18,969 · Render_Wheel 32,507 · Shadow 328,955 · Station 498,380 · Test2 29,974 · Torso 405,999 · WeirdTor 304,197 · World1 590,444 · World2 344,003.

### data.rar vs Data/ reconciliation (the anomaly, resolved)
- **Zero overlap.** data.rar holds *only* .HJB scenes; Data/ holds *only* textures/mp3/ob3. It is not a shipping duplicate — it is a **runtime archive**: morning.exe contains the strings `data.rar` immediately followed by `password` (at 0x44998, .data), plus decompression-error strings, i.e. an embedded unrar library call of the urarlib style (`file, archive, password`). MEASURED: the engine reads scenes out of data.rar; that is why Data/ has no .hjb. Genoaux.exe contains the identical `data.rar`+`password` strings but hjb_geno ships loose .HJBs in Data/ — so the loader supports both, and Satellite chose the rar path (INFERRED: Data\ loose file is the other path, given the `data\` prefix string).
- **Cut content:** script.txt's [scenes] names 17 hjb; the rar carries **8 more that are never referenced**: World1, World2, LandS, LandSW, More_N, Print, Render_Wheel, Test2 (~1.3 MB unpacked of unused scenes, incl. two landscapes). Additionally 4 of the 17 loaded scenes are never used in any [part]: Molecule (1.1 MB!), Photo, Mask, WeirdTor.
- **Reuse fossil:** rar's Black.HJB (mtime 2001-02-08) is **byte-identical** to mosaik/Mosaik/Data/Black.HJB (sha256 adff75d8…) — same helper scene carried since MS2001. (hjb_geno's Black.HJB is a different, re-exported file.)

## 2. Packer
Not packed. `upx -t` → NotPackedException. Standard MSVC sections, no overlay (last raw section ends exactly at file size 425,984).

## 3. PE map
Linker 6.0 (MSVC 6), entry RVA 0x23b50, base 0x400000.

| section | VA | VSize | RawSize |
|---|---|---|---|
| .text | 0x1000 | 240,222 | 241,664 |
| .rdata | 0x3c000 | 28,682 | 32,768 |
| .data | 0x44000 | **321,352** | **28,672** (≈293 KB zero-init runtime buffers) |
| .rsrc | 0x93000 | 115,304 | 118,784 |

Imports (static): OPENGL32 (53 fns), GLU32 (gluPerspective/gluLookAt/gluBuild2DMipmaps), ijl11.dll (ordinals 2/3/4 = ijlInit/ijlRead family), BASS.dll (11 fns: BASS_Init, BASS_StreamCreateFile, BASS_StreamPlay, BASS_ChannelGetPosition/SetPosition, BASS_MusicLoad, BASS_MusicPlayEx, BASS_MusicSetPositionScaler, BASS_Start, BASS_Free, BASS_GetVersion), KERNEL32 (96), USER32 (114), GDI32 (35), WINSPOOL.DRV, ADVAPI32, COMCTL32 ord17 — the WINSPOOL/print + CPtrArray/CStringList RTTI = statically linked MFC. LoadLibraryA/GetProcAddress present; the only dynamic GL resolution is via **wglGetProcAddress** (see §4).
Resources: MFC string tables/dialogs incl. a setup dialog — "Run Demo", "Loop Demo", "No Sound", "640x480/800x600/1024x768 Fullscreen" — with dialog caption **"Elements - Haujobb"** and VERSIONINFO "Copyright (C) 2001": leftover resources from *Elements* (TP2001 demo; elements.exe final built 3 days before morning.exe). One 100,482-byte RT_BITMAP (dialog art).

## 4. Graphics API
OpenGL, fixed-function 1.1. Statically imported: immediate mode (glBegin/glVertex3f), vertex arrays (glVertexPointer/glNormalPointer/glArrayElement), display lists (glNewList/glCallList), lighting (glLightf/glMaterialfv), texgen (glTexGeni/glTexGenf → env/projective mapping), glCopyTexSubImage2D (**render2texture effect**), gluBuild2DMipmaps. GetProcAddress'd names in .data: `glActiveTextureARB`, `glClientActiveTextureARB`, and the complete glMultiTexCoord{1,2,3,4}{d,f,i,s}[v]ARB set plus one `glMultiTexCoord1dEXT` — i.e. **ARB_multitexture**, nothing shader-era. Context via wglCreateContext/ChoosePixelFormat; errors "Can't Create A GL Rendering Context." etc.

## 5. Audio
BASS.DLL, 92,660 B, **byte-identical** (sha256 35cabf96…) to hjb_artf (mtime 2000-02-28), hjb_mifi, hjb_geno — a pre-2.x BASS; DLL has no version resource and its code lies in packed/virtual-only sections, so exact version UNVERIFIED (BASS_GetVersion export exists; export set incl. BASS_CD*, BASS_Music*, BASS_Stream*). Plays `Data/yuki2.mp3` via BASS_StreamCreateFile (script section `[mp3]`); `[module]` + BASS_MusicLoad path exists in the engine but is unused here. MP3: MPEG1 L3, 96 kbps JStereo 44.1 kHz, 2:39.56. **ID3: title "Yuki-Satellites", artist "Radix", album "Journey", 1999** — the demo's soundtrack identity, matching the dir name "Satellite" and the credit texture Radix.jpg. Timeline sync: last [part] at 159643 ≈ track length 159.56 s ⇒ [part] timestamps are absolute ms positions in the stream (INFERRED from that coincidence + BASS_ChannelGetPosition import).

## 6. Data formats
**STAR.OB3** (196 B, full hex in worklog): header `0c00 0600` = 12 / 6 (u16). Then 12 vertices × 3 × int16 (72 B, values ±~900), then 6 × 20-byte face records containing index triples <12 (e.g. `0800 0900 0b00`, `0b00 0a00 0800`) plus per-face 255/255/255 words and 0/1 flags — a tiny star mesh with per-face color (INFERRED layout; population = 1 file here; hjb_artf has 6 more .OB3 for cross-checking). Satellite's STAR.OB3 is **byte-identical** to hjb_geno/Data/STAR.OB3 (08923ff6…). Exe references it as `data\star.ob3` (hardcoded).

**HJB** (25 files, all in rar): every one starts `00000000 | u32 | u32(0|1) | "Name (HEXHANDLE)"` — 3ds max default node names (Box01, Camera01, Hedra01, Loft01, StationN, Desert1) with what looks like the exporter's node handle in hex. Population check across all 25: field2 ranges 0x26–0x582 (INFERRED: animation length, frames/ticks); field3 is 1 exactly when the first node is "Camera01" (8 of 25), else 0 (INFERRED: node-type tag). **Same header shape in every generation checked**: mosaik (2001), hjb_artf (2000), moments (2000), hjb_geno (2002) — the .HJB container is stable across the whole engine family.

**JPEGs:** 40 baseline, 1 progressive (512256_1.jpg — the 512×256 render-target placeholder, also present in geno with different bytes). All browser-decodable.

## 7. Script grammar (script.txt, 807 lines)
Sections in file: `[mp3]` (name + `0` offset line), `[textures]` (name + optional flag `fullscreen`/`nomipmap`), `[scenes]` (17 hjb preload list), then 92 `[part]` + 2 `[addpart]`.
[part] = 6 lines: hjb file / end-time ms / numeric param (0, or 400–700 on the Cartoon parts) / camera name (`standard` or `CameraNN` from the hjb) / overlay texture (`standard` = none) / second layer (`standard`). [addpart] = 3 lines: hjb / param / camera — stacks a scene on the current part (clock.hjb + poem.hjb over the opening Shadow.hjb).
Tokens the exe also knows but this script never uses: `[parameter]`, `[addeffect]`, `[module]`, effect names `render2texture, oscope, tunnel, droid1/2/3, gridvemputus1, griddistord5`, `rendertexturesize`, `renderfullscreen`, `nosound`, `loading`, `password`.
Anomaly: line 68 overlay `Start.jpg` is in neither [textures] nor Data/ — a dangling reference the engine evidently survives (UNVERIFIED how: skip vs blank).

**Generation diff:**
| | moments (TP2000) | Satellite (MS2002) | hjb_geno (2002-11) |
|---|---|---|---|
| [part] lines | 5 (file, duration≈frames, camera, overlay, overlay2) | 6 (adds numeric param; time is absolute ms) | 6, identical to Satellite |
| texture flags | none | fullscreen / nomipmap | same |
| [parameter]/[addeffect] | absent | in engine, unused in script | **used** (render2texture, tunnel) |
| [mp3] extra line | no | yes (`0`) | yes (`0`) |
⇒ Satellite is the **2002 generation**, grammar-identical to hjb_geno; moments is the earlier 5-line generation.

## 8. Strings of interest
`Haujobb` (window title) · `OpenGL WinClass` · `1.0.2` (adjacent to WinClass but equally consistent with libpng 1.0.2 — also present in moments/mosaik exes; AMBIGUOUS) · `inflate 1.1.3 Copyright 1995-1998 Mark Adler` + full libpng error set (PNG support compiled in; no .png shipped here, moments-era scripts used .png overlays) · `data.rar` + `password` · `script.txt`, `data\`, `data\Loading.jpg`, `data\star.ob3` · effect names (§7) · MFC/MSVC6 runtime ("Microsoft Visual C++ Runtime Library", VC20XC00U frame data) · leftover "Elements - Haujobb" dialog. No source-tree paths in the binary.

## 9. Third-party dependencies
- ijl11.dll = Intel JPEG Library **1.1.2 Retail**, sha256 5a0b1c4e… — byte-identical in **all 7** sibling prods that ship it (artf, mifi, moments, mosaik, geno, liqu, Satellite).
- BASS.DLL sha256 35cabf96… — byte-identical in artf, mifi, geno, Satellite. (liqu ships a newer 113,288-byte BASS d5e5eaf2…; moments/mosaik use fmod.dll 55f8c54c…, identical to each other.)
- Embedded: zlib 1.1.3 + libpng (1.0.x), unrar-style decompressor (RAR 2.0 -m3), statically linked MFC.

## 10. Port difficulty — 4/5
Free: 41 JPEGs (browser-decodable, incl. the one progressive), MP3, script parsing, timeline (absolute ms vs audio clock), OB3 (trivial).
Work: **.HJB** — 3ds-max-exported scenes with nodes, cameras (multi-camera per file, selected by name from script) and keyframed animation, up to 1.1 MB — the single decisive reverse-engineering target, shared with the entire engine family (crack it once, unlock Mosaik/Elements/geno/moments-era too, modulo generational drift). Effects engine: overlay compositing ("fullscreen" quads), the Cartoon numeric parameter, and the unused-but-present effect set. data.rar: pre-extract in restoration, no runtime RAR needed.

## Cross-production evidence (the point)
- **hjb_geno is the twin:** Genoaux.exe is exactly 425,984 B like morning.exe, differing in 102,864 bytes (~24%) — same source base recompiled (Nov 2002 vs Mar 2002); identical script grammar; identical `data.rar`/`password` loader strings; byte-identical BASS.DLL, ijl11.dll, STAR.OB3; both ship 512256_1.jpg and AllWhite.jpg (different bytes — regenerated).
- Effect-token generation marker: `droid1/griddistord5/gridvemputus1/oscope/render2texture` appear **only** in Genoaux.exe, liquid.exe, morning.exe — the 2002 engine branch. moments/mosaik exes lack them; artf/mifi lack even the WinClass string set at n≥6.
- .HJB header layout unchanged 2000→2002 (measured across artf, moments, mosaik, geno, Satellite).
- Reuse chain: Black.HJB byte-identical Mosaik(MS2001)→Satellite rar; ijl11.dll identical across all seven; BASS.DLL identical 2000→2002 until liquid upgraded it.

## OPEN QUESTIONS
- Exact BASS version (DLL packed, no version resource; disassembling BASS_GetVersion needs the unpacked image).
- [part] field 2 semantics (start vs end timestamp) and the Cartoon 400–700 parameter — needs disasm of the script consumer.
- How the engine resolves the dangling `Start.jpg` overlay and lookup precedence Data\ vs data.rar.
- Whether the `password` argument is empty here or a real archive password (data.rar opens without one).
- .OB3 face-record layout should be confirmed against hjb_artf's six KNOT*.OB3 before naming fields.
- Is "1.0.2" the engine's version or libpng's?
