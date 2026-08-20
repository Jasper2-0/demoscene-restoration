# 07 — originals/haujobb/hjb_geno/ — "Genoaux"

## SUMMARY
- **Title:** Genoaux — Haujobb, Alternative Party 2003 (2003-01-11), Alt Demo compo 17th (Demozoo 63983, pouet 8528).
- **Engine:** Haujobb 2002-branch script engine (same source base as morning.exe/liquid.exe); MSVC6, static MFC; **this pass decompiled the whole script parser, effect dispatch, playback loop, OB3 loader and the full .HJB scene format from Genoaux.exe with targeted Ghidra passes**.
- **GFX API:** OpenGL 1.1 fixed-function + ARB_multitexture (wglGetProcAddress); render2texture via glCopyTexSubImage2D (512×256 hardcoded).
- **Audio:** BASS.DLL (byte-identical 35cabf96 family, per fleet) streaming Data/mouthwash.mp3 — 160.026 s, 192 kbps 44.1 kHz (ffprobe).
- **Data:** Script.txt (813 B), 9 JPEG, 6 .HJB, STAR.OB3 (byte-decoded, exact), mouthwash.mp3, Thumbs.db (Explorer fossil).
- **Packer:** none. PE twin of morning.exe (both 425,984 B; .rsrc ends exactly at file size — no overlay). Linker 6.0, entry 0x23b50.
- **Port difficulty: 3/5** — every format this production uses is now decoded (script grammar measured from code; .HJB validated byte-exact on 6/6 own files and 96/118 sibling files; OB3 exact). Remaining work is rendering behavior (grid/droid/tunnel effect drawers), not file formats.
- **Closest sibling:** channel/Satellite (morning.exe) — ~76% byte-identical exe (fleet), identical string table, identical parser addresses ±.
- **Repo-wide contribution:** the .HJB controller/keyframe grammar (THE open question) is decoded and machine-validated; validator at scratchpad `work/parse_hjb_v2.py`.

## 1. Inventory
| file | size | mtime | note |
|---|---|---|---|
| Genoaux.exe | 425,984 | 2002-11-27 | PE32 GUI i386, MSVC6, not packed |
| BASS.DLL | 92,660 | 2001-11-25 | fleet: byte-identical to artf/mifi/channel5 copy |
| ijl11.dll | 180,224 | 1999-08-18 | Intel JPEG 1.1.2 (fleet: identical across 7 prods) |
| Script.txt | 813 | 2003-01-12 | 2 parts, 4 addparts, 2 addeffects (quoted in full in task context) |
| scene.org | 1,989 | 2003-01-13 | upload receipt |
| Data/ | — | 2001-12 … 2003-01-11 | 9 jpg, 6 HJB, STAR.OB3 (196 B), mouthwash.mp3 (3,840,624 B), Star.jpg+Script.txt rw (last edits party day) |

## 2. Script.txt grammar — MEASURED from the parser (FUN_00405830 @0x405830, decompiled)
Parser: reads script.txt line by line (MFC CStdioFile). Each iteration reads ONE line, lowercases+trims it, skips if empty, then substring-Finds section tokens in this order: `[module]`, `[mp3]`, `[textures]`, `[scenes]`, `[parameter]`, `[part]`, `[addpart]`, `[addeffect]`. A matched handler then reads its fixed number of following lines (or until an empty line). Unmatched junk lines are ignored.

| section | data lines | fields (measured semantics) |
|---|---|---|
| `[mp3]` | 2 | 1: filename (prefixed `data\`) → BASS_StreamCreateFile; or literal `nosound` → audio off. 2: **integer start-offset in SECONDS** → global 0x488a74; stream seeked via BASS_ChannelSetPosition(sec×1000×176.4) (176.4 = bytes/ms @44.1k 16-bit stereo, double at 0x43ca58) |
| `[module]` | 2 | same shape: 1: file → BASS_MusicLoad + BASS_MusicSetPositionScaler(handle,64); or `nosound`. 2: start seconds (clock offset sec×1000 ms in GetTickCount mode) |
| `[textures]` | until empty line | `filename [flag]`; first token = map key; flag `fullscreen` → decode via ijl into 640×480 RGB buffer, stored as 32-byte tiled-image record (table 0x480530, name→index map 0x488530 — same path as data\Loading.jpg); no flag → GL texture object (map 0x488570). `nomipmap` → GL_LINEAR, no mipmaps; default → gluBuild2DMipmaps + GL_LINEAR_MIPMAP_NEAREST. Both `.jpg` (ijl) and `.png` (libpng) accepted |
| `[scenes]` | until empty line | each line: hjb filename; `data\`+name loaded by HJB loader (0x412fa0) into 0x118-byte scene object; map 0x488550 keyed by lowercased filename |
| `[parameter]` | 1 | `rendertexturesize` → sticky flag=1; `renderfullscreen` → flag=0. Flag is stamped into byte +0x1d of every part/addpart/addeffect record parsed after it (viewport = render-target size vs full window during that part's render) |
| `[part]` | 6 | 1: scene file (`standard` = render nothing) · 2: **absolute end-time in ms** · 3: integer param (animation-time offset added to the scene clock) · 4: camera node name (`standard`/miss → scene default; lookup by name via 0x412b60) · 5: overlay A — texture drawn ortho BEFORE the 3D scene (background layer; `standard` = none) · 6: overlay B — drawn ortho AFTER everything (foreground; `standard` = none). Record = 0x28 bytes appended to parts array 0x480518 |
| `[addpart]` | 3 | 1: scene file · 2: int param · 3: camera. Chained onto the current [part] via index links (+0x18); inherits the part's time |
| `[addeffect]` | 5 | 1: effect name (resolved in name→id registry) · 2: texture name (map 0x488570 lookup) · 3: int p1 = time offset ms · 4: int p2 = speed multiplier · 5: int p3 (stored rec[9]; per-effect use, UNVERIFIED). Effect phase = (p1 + t_ms) × p2 × (1/30) (const 0x43ca44). Chained like addpart, flag byte +0x1c=1 |

**Timing confirmed two ways:** parts advance when clock > end-time (playback loop 0x407190: `while parts[i].t0 < elapsed_ms: i++`); and mouthwash.mp3 = 160.026 s while the last [part] says 160000 — absolute end-stamps, NOT durations (144115+160000=304 s would be double the track).
Clock source: stream mode = BASS_ChannelGetPosition bytes ÷ 176.4, resynced every 10 s with GetTickCount in between; module/nosound mode = GetTickCount − t0 + start×1000. Loop-demo flag restarts at part 0.

## 3. Effect registry — the engine's complete feature set (FUN_0040526a → FUN_004043f0(name,id); dispatch switch in FUN_00405440)
| id | name | id | name |
|---|---|---|---|
| 1 | droid1 | 9 | gridtunnel |
| 2 | droid2 (adds rand()) | 10 | gridinterf |
| 3 | droid3 | 11 | griddistord1 |
| 4 | tunnel | 12 | griddistord2 |
| 5 | oscope | 13 | griddistord3 |
| 6 | render2texture | 14 | griddistord4 |
| 7 | gridplane | 15 | griddistord5 |
| 8 | gridtunnel2 | 20 | gridvemputus1 |
Ids 16–19 unassigned (removed effects). That is the FULL list — 16 effects; no other names exist in the string table or registry. `render2texture` (case 6) = glBindTexture(tex-from-line-2) + glCopyTexSubImage2D(0,0,0,0,512,256) + glClear(COLOR) — 512×256 hardcoded, matching texture 512256_1.jpg. griddistord5 falls through into the gridvemputus1 drawing path plus its own pass. Grid effects render via shared vertex buffers at .data 0x450500/0x460500/0x470500 (the big virtual-only .data). Parameter names known to [parameter]: exactly `rendertexturesize`, `renderfullscreen` — nothing else.

## 4. STAR.OB3 — format DECODED from loader FUN_00401280 ("cannot load object" on failure)
```
u16 nverts; u16 nfaces;
nverts × 3 × s16          (x,y,z → float)
nfaces × 10 × s16: v0,v1,v2, X(+bias arg), u0,v0,u1,v1,u2,v2   (UV = s16/256, V flipped 1−v/256)
```
Arithmetic check: 4 + 12×6 + 6×20 = **196 = exact file size** of STAR.OB3. The 4th index X is biased by the loader's 5th arg (1 here) — texture/material id (INFERRED). Loader computes normals (arg2=1), builds a display list. Hardcoded load: `data\star.ob3` into global 0x44a900 at init. This decode serves geno/liquid/channel5/elements/we_are (byte-identical file, fleet crc32).

## 5. .HJB — the controller/keyframe grammar (repo-wide open question) — DECODED & VALIDATED
From FUN_00412fa0 (load), FUN_00413060 (recursive tree), node Read vtables, track readers, key readers (all decompiled; dumps in scratchpad re/*.c):
```
file    := u32 0 · u32 nframes · node* · (-1 terminators) · mattable
node    := i32 type · asciiz name "Name (HEXHANDLE)" · payload · children* · -1
              (after payload: u32 peek — if ≠ −1 seek −4 and recurse: records that follow are children)
type 0 mesh   := i32 nverts · nverts×3f32 · i32 nfaces · nfaces×3×{u32 idx,f32 u,f32 v}
                 · i32 ngroups · ngroups×{u32 matid, i32 n, n×u32 faceidx}
                 · TRACK(vec3 pos) · TRACK(vec4 quat rot) · TRACK(vec3 scale) · LIST · MORPHTRACK
type 1 camera := TRACK(vec3 pos) · TRACK(f32 roll) · TRACK(f32 fov rad) · LIST
type 2 camera target := TRACK(vec3 pos) · LIST
type 3 light variant  := 3×f32 rgb · TRACK(vec3) · TRACK(vec4) · TRACK(vec3) · LIST
type 4 omni light ("Omni01" measured) := same as type 3
type 5 camera-like (target spot?)     := TRACK(vec3) · TRACK(f32) · TRACK(f32) · LIST
TRACK   := u32 flags · i32 nkeys · nkeys×KEY
KEY     := u32 frame · 5×f32 TCB slots (tension/continuity/bias/easeIn/easeOut positions,
           junk-filled by this exporter) · payload (1/3/4 × f32)
MORPHTRACK := u32 flags · i32 nkeys · nkeys×{u32 frame · 5×f32 · i32 nv · nv×3f32}   (full vertex snapshots)
LIST    := u32 values until −1 (semantics unknown; empty in every geno file)
mattable:= i32 count · count×{ asciiz name · 11×{f32 amount, asciiz path} }   (slot 1 = diffuse observed)
```
- **Validation:** a Python implementation (`work/parse_hjb_v2.py`) consumes **6/6 geno HJBs byte-EXACT** (EOF landed to the byte) and **96/118** including all Satellite rar and liquid wen files. Sanity content: Black.HJB Box01 pos(−11.3,0,18.4), quat(0.707,−0.707,0,0)=90° X-rot, scale(1,1,1); Camera01 pos(144.35,0,18.8), FOV key π/8; material diffuse 0.99 "F:\Free\data\Black.bmp".
- Max key frame == header nframes in every animated geno file (1250/4000/4000) → header[1] = animation length in frames; key stamps are integer frames. Scene-time conversion factor ms→frame sits inside FUN_00412c30 (not decompiled); effects measured at ms/30, and 4000-frame anims inside the 144.1 s part are consistent with ms/30 + end-clamp (INFERRED).
- The 20 failures (satellite/liquid only, none geno) all die within ≤3 bytes of EOF or on the material table boundary — generational drift in THOSE exes (morning/liquid differ from Genoaux by ~24%); chase with their own binaries in round 2.
- Source-tree fossils in geno HJB materials: `C:\Genouax\Data\*.bmp` (author's project dir, misspelled "Genouax") + one `F:\Free\data\Black.bmp` (Black.HJB re-export, Apr 2002). Textures authored as .bmp, shipped as .jpg — material paths are matched by name, not used literally.

## 6. Frame rendering (FUN_00406df0, per frame)
viewport (per part's rendertexture flag) → overlay A (line 5) ortho → glClear(DEPTH) → for the part and each chained addpart/addeffect in script order: effects via dispatcher, scenes via Scene::Render(time+param) with camera-by-name (miss → default; "standard" scene = skip) → overlay B (line 6) ortho. Overlay names are looked up fullscreen-map first, texture-map second — a dangling name (Satellite's Start.jpg) just fails both lookups and draws nothing.

## 7. Cross-production notes
- The previous agent's `text.asm`/`text.bin` is **Art-final.exe's .text, not Genoaux's** (byte-compared); its "[part] handler: scene, atoi, atoi, three strings" finding actually describes the 2000-generation exe — yet matches the 2002 grammar shape measured here, so the [part] core (scene/time/param/camera/2 overlays) is stable across generations; fresh Genoaux disasm at scratchpad `geno_text.asm`.
- Genoaux carries the full 2002 feature set and is the only production whose script exercises [parameter]+[addeffect]+render-to-texture chaining.
- data.rar/`password` loader strings present but unused here (loose Data\ files) — confirms the dual loose/RAR loader (fleet).
- Grammar identical to Satellite's script (05-satellite.md §7) — this report supplies the code-level semantics that report inferred from data.

## OPEN QUESTIONS
- [addeffect] p3 (rec[9]) per-effect meaning; effect drawer geometry (FUN_00404650 tunnel/droid, FUN_004035xx grids).
- LIST (+0x94) semantics (never populated in geno's files).
- Node types 3 vs 5: which 3ds Max light/target maps to which (type 4 = Omni measured by name).
- The 5 key floats: TCB+ease by position/count (3ds Max exporter layout), but values are uninitialized garbage in every geno key — interpolation actually used by the engine (FUN_00412c30) not yet read.
- ms→frame conversion constant for scene tracks (effects: ms/30 measured).
- The 20 sibling HJB parse failures — re-run the validator against morning.exe/liquid.exe's own readers in round 2.
