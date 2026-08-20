# Moments — Haujobb, 4th @ The Party 2000 (Demozoo 259, pouet 1237)

## SUMMARY
- **Title / year / party**: Moments — Haujobb, The Party 2000 (Dec). Moments.exe link timestamp 2000-12-27 04:53:44, MSVC6, static MFC 4.2 ("AsmDemo MFC Application" version resource left from the AppWizard project).
- **Engine**: the MFC OpenGL scene player (same codebase family as Art/Mosaik; see 03/04 reports). **This round: the .HJB loader was decompiled with Ghidra and the full container grammar — including the controller/keyframe tracks — is now VERIFIED against the consuming code and against a byte-exact parse of 213/213 .HJB files across seven productions.**
- **GFX API**: OpenGL 1.1 fixed-function + ARB_multitexture (as measured in 03-mosaik; identical loader table).
- **Audio**: fmod.dll FSOUND 3.20; FSOUND_SetOutput(2=DSOUND), FSOUND_Init(44100,32,0), Stream_OpenMpeg → Data/planet.mp3 (255.55 s per ffprobe). **No FSOUND_Stream_GetTime: clock is GetTickCount, music free-runs, no resync.**
- **Data formats**: 16 .HJB (fully decoded below), 1 .3do (decoded, loader FUN_00408510), 58 baseline jpg, 4 png, 1 bmp, planet.mp3.
- **Packer**: Moments.exe not packed; fmod.dll stock-UPX (Firelight build).
- **Timeline**: script.txt is parsed, but **the [part] time numbers are stored and never read back — actual part timing is a hardcoded table of 21 doubles (absolute seconds) in the main loop**, +0.1857 s global offset (measured, below).
- **Port difficulty**: 2/5 now — the repo-wide blocker (.HJB animation grammar) is resolved and code-verified.
- **Closest sibling**: mosaik (per 03-mosaik: byte-identical fmod/ijl11, 95% string overlap). One engine correction: **"engine version 1.0.2" is libpng's version string** (passed to png_create_read_struct in the PNG loader FUN_00401600), not an engine version.

## 1. The .HJB controller/keyframe grammar — VERIFIED against Moments.exe

Method: full Ghidra headless analysis + ExportDecomp of Moments.exe (decomp at `re/moments-decomp.c`, disasm at `re/moments-disasm.asm`, targeted vtable-only functions in `re/evals.c`, `re/evals2.c`, scratch project `ghidra/`). The loader entry is **FUN_0040db10** ("rb" fopen), the record tree reader **FUN_0040dbe0**. Every field below was then re-checked against data by an exact parser (`work/hjb_exact.py`) that must consume every byte: **213/213 files parse to exactly EOF, 0 failures** (moments 16, mosaik 24, art 16, genoaux 6, liquid.wen 85, Satellite rar 25, we_are ACE 37, elements ACE 4).

### File layout (all VERIFIED)
```
u32  word0            ; 0 in 213/213 (population), read into obj+0x100, use unobserved
u32  nframes          ; animation length in frames (scene plays frame 0..nframes)
tree                  ; records, see below
u32  0xFFFFFFFF       ; end of top level
u32  skipped          ; read then OVERWRITTEN by the next read (FUN_0040de50 reads twice
u32  material_count   ;   into the same local) — first dword is dead
material * material_count
EOF                   ; byte-exact in 213/213
```
The tree (FUN_0040dbe0): `[ u32 type; record-body; children-tree; 0xFFFFFFFF ]*` at every level, terminated by 0xFFFFFFFF. After each record the loader reads one dword; -1 = empty child list, else it seeks back 4 and recurses. Depth observed in data: always 0 (flat). The "third header dword" reported by round 1 was simply the first record's type (0=mesh, 1=camera — the "Camera01-first" correlation).

### Record types (dispatch switch in FUN_0040dbe0; read = vtable[0])
| type | class | read fn | body after asciiz name `"Name (HEXHANDLE)\0"` |
|---|---|---|---|
| 0 | mesh (class id 1) | FUN_0040a8b0 | geometry; then pos, rot, scale tracks; vis list; vertex-anim track |
| 1 | camera (id 2) | FUN_0040b470 | pos track; **roll** float track (+0xd8); **FOV** float track (+0xb8); vis list |
| 2 | camera/omni target (id 3) | FUN_0040bd60 | pos track only |
| 3 | (never in data) | FUN_0040c9d0 | 3×u32; P3 track; 2 float tracks; vis list |
| 4 | omni light (id 5) | FUN_0040c2a0 | 3×u32; pos track; rot track; P3 track (color anim, ctor default 1,1,1); vis list |
| 5 | (never in data) | FUN_0040cd10 | pos; rot; P3 track; vis list |
Types 3 and 5 occur in 0/213 files. Post-load FUN_0040eab0 links each camera (and type-5) to the **same-named** type-2 record — hence the two consecutive "Camera01" records: camera + look-at target.

### Mesh geometry (FUN_0040a2f0 / FUN_0040a570 — VERIFIED)
```
u32 nv;  nv × { f32 x,y,z }
u32 nf;  nf × 3 × { u32 vertIdx, f32 u, f32 v }          ; 36 B/face
u32 ngroups; ngroups × { u32 materialId, u32 n, n × u32 faceIdx }
```
The round-1 "A-block (1,0,nf,0,1,2)" was this material-group table misread — the six words are `ngroups=1, matId=0, n=nf, faceIdx 0,1,2,...`.

### Key records — the headline answer
Every key begins with the same 24-byte header, **time first** (this settles the field-order ambiguity the previous agent died on):

| off | type | field | status |
|---|---|---|---|
| +0 | i32 | frame number (3dsmax frames; compared as `(float)key.time` vs the float playback frame) | VERIFIED (integer subtraction in FUN_00410420/FUN_0040efe0; `frame=600 == nframes` in Circle_Around rot key) |
| +4 | f32 | **tension** — appears only as `(1-t)` factor | VERIFIED |
| +8 | f32 | **continuity** — `(1±c)` chord weights AND `(1-|c|)` in the non-uniform time adjust | VERIFIED |
| +12 | f32 | **bias** — `(1+b)`×incoming chord, `(1-b)`×outgoing chord | VERIFIED |
| +16 | f32 | ease? — **read into memory, never referenced by any evaluator/precompute** | VERIFIED unused; "easeIn/easeOut" naming INFERRED from 3dsmax convention |
| +20 | f32 | ease? — same | VERIFIED unused |

Then the value payload — total on-disk strides:
- **Point3 key (position, scale, omni color, target): 36 B** = header + f32 x,y,z (read FUN_004109f0: 6 dwords → mem +4..+0x18, 12 B → +0x28)
- **Rotation key: 40 B** = header + **absolute unit quaternion (w,x,y,z)** (read FUN_00406be0: 6 dwords + 16 B → +0x2c). Order (w,x,y,z) VERIFIED from the quat→matrix build in the mesh update forced_0x40adb0: the squared-term pattern (m00 misses q[2],q[3]; m11 misses q[1],q[3]; m22 misses q[1],q[2]) pins q=[w,x,y,z] unambiguously. 1668/1668 multi-key quats in the population are unit-norm. (An earlier note in this thread said 44 B — that was the in-memory object size 0x4c minus vtable confusion; on disk it is 24+16=40.)
- **Float key (camera FOV, roll): 28 B** = header + f32 value (read FUN_00410ed0)
- **Vertex-anim (morph) key: 28 B header + u32 nv + nv×12 B** full vertex snapshot (read FUN_00406f30). 28/1047 mesh records use it (2–11 keys).

### Track container (each of the five per-record track slots)
```
u32 flag       ; 0 in ALL 3129 tracks in 213 files; stored at track+8, consumer unobserved
u32 nkeys      ; then nkeys × key
```
The **visibility slot is not a track**: it is a bare i32 list terminated by 0xFFFFFFFF (read forced_0x4047e0) — toggle frames, object starts visible, each listed frame flips it (evaluator FUN_00404900). Empty in all 213 files (1479/1479 lists). This -1 plus the record's child-list -1 are the "sentinels" of round 1.

### Interpolation (the code the evaluator runs — VERIFIED)
1. **Load-time tangent pass** (FUN_0040ec00 walks the tree calling vtable[2]): for each track with n≥2 keys, per-key in/out tangents are computed by the **Kochanek-Bartels/3dsmax TCB formula with non-uniform time adjustment** (Point3: forced_0x40efe0 + FUN_00410420; float: forced_0x40fd50; quat: forced_0x403650 via slerp helpers, tension scaled by 1/3). Out-tangent at middle key i (FUN_00410420, constants 1.0 @0x438638, 0.5 @0x43863c):
   `adj = (dtn/(dtp+dtn) − 0.5)·(1−|c|) + 0.5;  TD = adj·(1−t)·[ (1−c)(1−b)·(P[i+1]−P[i]) + (1+c)(1+b)·(P[i]−P[i−1]) ]`
   (in-tangent mirrors with dtp ratio and swapped (1±c)(1±b) products; n==1 and n==2 have special cases; **n==1 skips entirely, so the garbage TCB bytes in 1-key tracks are provably harmless**).
2. **Evaluate at float frame f** (cursor-based, e.g. FUN_00410060 float, FUN_00403ac0 quat, inline in FUN_0040b8d0 camera / forced_0x40adb0 mesh): advance/retreat a persistent cursor; **clamp-and-hold** before first / after last key; else `u = (f − t0)/(t1 − t0)` (raw, no ease) and **plain cubic Hermite** (FUN_00410770: h = 2u³−3u²+1 etc.) over {P0, outTan0, P1, inTan1}. Quaternions: 3-level **de-Casteljau slerp chain** (squad) over {q0, outTanQ0, inTanQ1, q1} — same algorithm family as mikro's .dat player, but **the storage differs: .dat bakes tangents, .hjb stores TCB and computes tangents at load**. (Coordinator's mikro-inheritance hypothesis tested and refuted on storage, confirmed on evaluation.)
3. Mesh transform: M = quat→3×3 (rows scaled by scale.xyz) + translation; position track feeds +0x84 translation row. Camera: pos track + target-record pos track → gluLookAt (up vector built from view dir, roll track applied); `gluPerspective(fov_key × 360/π, …)` i.e. **the stored FOV value is the half-angle in radians** (constants 360.0 @0x438a58, 1/π @0x438a50).

### Population facts (all 213 files)
- header word0: 0 in 213/213. Track flag: 0 in 3129/3129. First record: mesh 170, camera 27.
- **Every tension/continuity/bias/ease float in every multi-key track is 0.0** (1782 P3 + 1668 rot + all float/morph multi-keys). So all shipped data runs the t=c=b=0 path — a time-adjusted Catmull-Rom. The TCB code paths exist but are unexercised; an implementation should still copy the formula (per METHOD.md), noting it cannot be validated against shipped data.
- 1-key tracks carry exporter garbage in the TCB slots (raw memory dumps, incl. the 0x01E76918 pointer) — matches the engine never reading them for n==1.
- Key counts: P3 up to 100s of keys; rot up to 5+; morph up to 11 keys × 2064 verts.
- Materials (moments): only slots 1 (diffuse, 50×) and 9 (reflection/env, 12×) used; engine classifies maps into diffuse-only/reflection-only/both (flags 8/0x10/0x18 in FUN_0040de50 tail) → the 2-unit multitexture path.

### Differential confirmation (Dez1–4.HJB, we_are)
The 13 differing runs across the four same-day exports land on: 3dsmax handle digits in names (2), **camera pos key values k0/k1/k6/k8 (xyz slots exactly)** (4), the texture path (1), and single-byte wiggles inside 1-key-track garbage TCB slots (3) + material name handle (1) + target name handle (1) + tgt 1-key garbage (1). Nothing lands outside the code-derived field map.

### Material record (FUN_0040de50 — VERIFIED)
`asciiz name; 11 × { f32 amount, asciiz path }` — the 11 slots are 3dsmax's map channels (slot1=diffuse, slot9=reflection per usage); a slot is active when amount > 0.0.

## 2. script.txt semantics (2000 generation) — the [part] number is dead
Grammar (parser FUN_00401eb0, tokens `[mp3] [textures] [scenes] [part]`): each [part] = scene / **int** / camera / tex1 / tex2, stored in a 20-byte entry {num, scene, camera, tex1, tex2}. **Playback (FUN in .text @~0x401f?? main loop, decomp lines 960–1090) reads only fields +4..+0x10 — the number at +0 is never read** (verified over every reference to the parts array DAT_00443a04).

Actual timing: a **hardcoded stack table of 21 doubles** (absolute seconds): 0, 8.924, 18.707, 26.713, 28.502, 47.435, 57.894, 67.684, 87.322, 106.864, 126.460, 146.091, 148.539, 168.123, 187.725, 207.317, 226.908, 236.578, 253.248, 260, 270 — **plus 0.1857 s added to every entry** at start (DAT_00438670). Clock: `t = (GetTickCount()−t0) × 0.001`; part advances when `t > boundary[i]`; local scene frame = `(t − boundary[part]) × 30.0` (DAT_00438660) → **30 fps frame addressing, same as Art**. The 18 script numbers ARE part durations in 30ths (sum 7733 → 257.8 s ≈ mp3 255.6 s; per-part `num/30` tracks the hardcoded deltas to within ~1 s) — they are the stale source values; the shipped exe supersedes them with the hand-resynced table. 18 parts end at 253.25 s (+0.186); screen fades from t=250 s at 0.35/s (DAT_00438650/48); loop mode restarts part 0 + FSOUND_Stream_SetPosition(0). Scene-frame overruns (e.g. cylinder part: 730 frames vs nframes 600) hold the last key — the evaluators clamp.

Part index 16 (17th, the greetings/planet part) bypasses scene rendering: glDisable(GL_FOG), custom effect FUN_00409990(frame×1/15) using **data\sphere2.3do** (hardcoded path @0x43fab0) + himap3/inter/flare4/claw.jpg.

## 3. SPHERE2.3DO — VERIFIED against loader FUN_00408510
`u32 nv; u32 nf; nv×{f32 x,y,z}; nf×3×{u32 idx, f32 u, f32 v}` — same corner layout as the .HJB mesh, floats (NOT the int16 .ob3 of Art). Arithmetic: 8 + 12·614 + 36·1224 = 51440 = file size exactly. Single loose mesh, no name/material; textures bound by the effect code.

## 4. Corrections to earlier rounds
- "Engine version 1.0.2" (ADDENDUM) → **libpng 1.0.2** version string in the PNG reader (FUN_00401600 passes `s_1_0_2` to png_create_read_struct). No engine version string exists.
- "A-block (1,0,nf,0,1,2)" (round-1 parse) → material-group table `{1, 0, nf, faceIdx...}`.
- "pos keys ×36 / rot ×44 / sca ×36 + 4-int tail" (previous agent's parse_hjb.py) → strides 36/40/36 and the "tail" was the vis-list/morph/child sentinels; the old script misaligned on any nf≠2 mesh (it died on Circle_Around's 11904-face `arrayobu1_freezed`).
- Round-1's "0xFFFFFFFF sentinels" = child-list terminators + vis-list terminators; "pointer garbage" = uninitialized TCB slots of 1-key tracks (harmless, see above).

## 5. Cross-production
- The grammar above parses **all seven** .HJB-shipping productions byte-exactly (2000→2002): the container did NOT change from Art (Aug 2000) through liquid/we_are (2002). One loader implementation serves ~250 scene files.
- fmod/ijl11 fossils, script drift, sibling analysis: unchanged from 03-mosaik/04-art (moments closest to mosaik).
- vs mikro (June 2000, .dat): same evaluation (Hermite + de-Casteljau squad, 30 fps frame addressing) but different serialization (baked tangents vs TCB) — cynic rewrote storage, kept the data model.

## 6. Port assessment — 2/5
Free now: full .HJB scene graph (mesh+uv+material groups), TCB→Hermite interpolators with exact constants, camera model (lookAt + target + roll + fov×360/π), morph keys, materials/multitexture classification, .3do, baseline JPEGs, mp3. Work left: the fullscreen-overlay compositing ("standard" logic + glOrtho quads at parts), the part-16 planet effect (FUN_00409990, one function to read), fog settings, GetTickCount drift behaviour (reproduce, don't fix). Shared infra: this loader spec + `work/hjb_exact.py` is the reference parser.

## OPEN QUESTIONS
1. Track flag dword (track+8) and header word0 (+0x100): constant 0 in all data; consumer not yet located in code — likely dead. UNVERIFIED.
2. Key header fields +16/+20: unused by the engine (verified); "easeIn/easeOut" naming is convention only.
3. FUN_00409990 (planet/greetings effect) internals — deliberately out of scope this round.
4. gluPerspective aspect argument decompiled as double 1.2777… (23/18) — odd vs 4:3; needs one disasm look before porting the projection. UNVERIFIED.
5. Omni record's 3 leading u32 and type-3/5 record semantics (no data exercises them).
