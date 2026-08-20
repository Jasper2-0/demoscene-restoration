# 06 — originals/haujobb/hjb_liqu/ — "liquid... wen?"

## SUMMARY
- **Title:** liquid... wen? — Haujobb — **WINNER, Assembly 2002** (Demozoo 31629, pouet 7130). Local copy = post-party "prebugfixed" upload (infofile.txt: "final version also" promised; exe PE timestamp 2002-08-05 12:46:43 = mtime).
- **Credits (infofile):** visualice, cynic, droid, vic (music), kimmo s.
- **Engine:** Haujobb 2002-branch engine (MSVC 6 linker 6.0), same family as morning.exe/Genoaux.exe; scenes+scripts inside embedded RAR `liquid.wen` via the urarlib path (strings `liquid.wen`+`password` at 0x445a28/0x445a34, referenced from 0x4191cb/0x4191c6).
- **GFX API:** OpenGL 1.1 **fixed-function + ARB_multitexture only** — no shader-era extensions (see §1).
- **Audio:** BASS with **exact-match version check for 1.6**; plays BOTH `vicdemo2.mp3` (part 1) and `Joo.xm` (part 2) — see §3.
- **Data:** data/ = 110 baseline-JFIF .jpg (6 progressive), Joo.xm (FastTracker 2), vicdemo2.mp3, STAR.OB3; liquid.wen (RAR, "Details: RAR 4" per unrar 7; 1,977,625 B) = **85 .HJB + SCRIPT.TXT + SCRIPT2.TXT** (not 87 HJB as previously noted).
- **Packer:** none. Sections .text/.rdata/.data/.rsrc raw sizes sum exactly to 430,080 = file size; no overlay.
- **Port difficulty:** 3/5 — everything is the shared-family work (.HJB + effects); no shader work needed. The .HJB track grammar is now substantially decoded (§4).
- **Closest sibling:** morning.exe (Channel 5 Sequence) / Genoaux.exe — same 2002 branch, but liquid extends it (larger effect roster, `grayscale` texture flag, BASS 1.6, two-script timeline).

## 1. GL extension inventory (priority 1) — VERDICT: FIXED-FUNCTION
Exhaustive `strings -a` sweep of liquid.exe for GL_*/ARB/NV_/EXT_/SGIS/ATI/wgl/combiner/program:

- **wgl:** wglCreateContext, wglDeleteContext, wglMakeCurrent, wglGetProcAddress. Nothing else (no wglSwapIntervalEXT, no wglARB pixel-format/pbuffer).
- **GetProcAddress'd GL names (complete list):** `glActiveTextureARB`, `glClientActiveTextureARB`, and the full `glMultiTexCoord{1,2,3,4}{d,f,i,s}[v]ARB` set (incl. the same `glMultiTexCoord1dEXT` and typo'd `glMultiTexCoord4sdARB` seen in morning.exe) — i.e. **GL_ARB_multitexture and nothing more**.
- **Zero** occurrences of: register_combiner, vertex_program, NV_, texture_env_combine, EXT_ extension names, CompiledVertexArray, any `GL_ARB_*` literal extension string (it never even queries glGetString(GL_EXTENSIONS) by name).
- Static OPENGL32 imports: the same fixed-function 1.1 set as morning.exe — immediate mode, vertex arrays, display lists, lighting, glTexGeni/f, `glCopyTexSubImage2D` (the render2texture effect), gluBuild2DMipmaps.

**"geforce3" in infofile.txt is a hardware recommendation, not a feature dependency.** Nothing in the binary needs more than OpenGL 1.1 + multitexture + copy-to-texture. Family trend confirmed and closed: Elements (2001, no extensions) → morning/Genoaux/liquid (2002, ARB_multitexture). **A shared WebGL2 runtime for all nine productions needs NO programmable-shader emulation path** (beyond the trivial fixed-function-to-shader mapping any WebGL2 port does anyway).

## 2. Sequencing (priority 2) — ANSWERED: two scripts inside liquid.wen
- liquid.wen contains **SCRIPT.TXT** (11,603 B, mtime 2002-08-05 = release day) and **SCRIPT2.TXT** (5,805 B, 2002-08-02). Extracted to scratchpad `liquid_wen/`.
- The exe hardcodes `data\script.txt` (0x44540c, referenced from code at 0x406b91) **and** `data\script2.txt` (0x445330, referenced at 0x407bd1). Both refs sit in the SAME function, calling the same loader (0x419610); between them a conditional back-edge (jz 0x407b9b → 0x406be8) forms the part-1 play loop. **MEASURED: the demo is a two-part production — script.txt plays first, then script2.txt.**
- SCRIPT.TXT: `[mp3] vicdemo2.mp3` + 130-entry [textures] + 83-entry [scenes] preload + 46 [part] / 69 [addpart] / 14 [addeffect] / 16 [parameter]. Last part at **355450 ms; vicdemo2.mp3 duration = 356.08 s** — confirms [part] field 2 = absolute ms in the audio stream.
- SCRIPT2.TXT: `[module] joo.xm`, **empty [textures] and [scenes]** (INFERRED: reuses part-1 pools), 46 [part] / 53 [addpart] / 8 [addeffect]; last part at 238262 ms (~4:00 of xm playback).
- Grammar = Satellite/Genoaux 2002 grammar (6-line [part]) plus a **new texture flag `grayscale`** (string present in liquid.exe, ABSENT from morning.exe — post-March-2002 engine drift).
- Effects used: part 1 render2texture×8, droid3×4, griddistord3×2; part 2 render2texture×6, griddistord2, griddistord3. Effect tokens compiled into liquid.exe (largest roster of the family): droid1-3, griddistord1-5, gridinterf, gridplane, gridtunnel, gridtunnel2, gridvemputus1, oscope, render2texture, tunnel (+parameters rendertexturesize, renderfullscreen).
- Content fossils: 4 HJB dated 2000-03-17 (Add_M, Flower, Plane_Fog, TubeWay ≈ moments era), Black.HJB 2001-02-08 (the Mosaik fossil), a March-2002 cluster driving SCRIPT2, and July/Aug-2002 files driving SCRIPT.TXT.

## 3. Audio (priority 3)
- **Both shipped tracks are played.** Part 1 streams `vicdemo2.mp3` (ID3: "Demo Song Nr2" / **Vic** / album "Number" / 2000 / House; 128 kbps, 5:56, file mtime 2000-05-19). Part 2 plays `Joo.xm` (FastTracker v2.00, blank title, 528,109 B, mtime 2002-04-07) via `[module]` → BASS_MusicLoad/BASS_MusicPlayEx (both imported, both script paths exercised).
- **BASS version claim confirmed at instruction level:** call BASS_GetVersion (thunk 0x43e03c via stub 0x424dbc) at **0x40a52a**, then `cmp eax, 0x00060001` (= version 1.6 encoding) — on mismatch pushes 0x44549c = `"bass 1.6 not found"`. It is an exact-match check, so the shipped DLL must be exactly 1.6.
- Shipped BASS.DLL: 113,288 B, sha256 d5e5eaf2…, PE timestamp **2002-06-28**, 104 exports (vs 80 in the 2000-era 92,660 B DLL), no version resource; BASS_GetVersion body lies in a virtual-only (runtime-unpacked) region so the return value can't be read statically — the exe-side cmp is the authoritative evidence. Liquid is the only sibling that upgraded BASS (all 2000-era siblings share the 35cabf96… DLL).

## 4. .HJB track grammar (priority 4) — MAJOR CONTRIBUTION, 225 mesh records, 0 failures
The previous fleet's mesh layout (6-u32 "A block", 44-B rot keys) is **wrong**; it only worked on nf=2 records by coincidence. Corrected grammar, validated on **all 225 type-0 mesh records across all 85 liquid HJBs with zero parse failures, zero non-monotonic key tracks, and 331/331 unit quaternions**:

```
mesh record (type 0):
  u32 nv;  f32 verts[nv][3]
  u32 nf;  face[nf] = 3 × {u32 idx, f32 u, f32 v}       (36 B/face, unchanged)
  u32 a, b                                              (a=1 always; b∈{0,1,2,3})
  u32 nfl(=nf);  u32 facelist[nf]                       (identity 0..nf-1 in all 225)
  u32 zero
  u32 npos; poskey[npos]  = {i32 frame, f32 tcb/ease[5], f32 xyz[3]}   36 B
  u32 n2;   key36[n2]                                   (always 0 in liquid)
  u32 nrot; rotkey[nrot]  = {i32 frame, f32 params[5], f32 quat[4]}    40 B  <- NOT 44
  u32 n3;   key36[n3]                                   (always 0 in liquid)
  u32 nsca; scakey[nsca]  = {i32 0, f32 ?, i32 time_TICKS, f32[3]=0, f32 sxyz[3]} 36 B
  i32 -1; u32 0
  u32 nmorph;  u32 0
  morphframe[nmorph] = {u32 zero[5], u32 nv, f32 verts[nv][3], (+4 B)}  28+12*nv B
```
- Key coincidence that fooled the old parser: pre-track words = 4+nf dwords, which equals the assumed 6-word A-block exactly when nf=2 (quads — the dominant simple case).
- **Rot keys carry unit quaternions** (e.g. (.70711,-.70711,0,0); (.32102,-.32102,-.63004,.63004), |q|=1.0000), 40-B stride proven by a 2-key track in Circle.HJB whose 2nd key time lands exactly on nframes=476.
- **Two time bases:** pos/rot key times are in FRAMES (0..header nframes); the scale-track time is in **ticks = frame × 160** (76160/476 = 112000/700 = 211200/1320 = … = 160; i.e. 3ds Max 4800 ticks/s at 30 fps → header nframes is 30 fps frames). TCB/ease params are 0.0 in every multi-key track measured.
- **Baked/dense data found — the morph track:** Real1-6.HJB (six 40,250-B files) each = one Box01 with 256 verts and **6 morph frames of full 3,100-B vertex snapshots** (28-B header carrying nv at +20, then 256×12 B xyz), ending flush at the record end (residual 0). Plane_Morph.HJB: 8 boxes × 11 frames of 280 verts; Ball_Morph, Balls_liquid, Mountain, Piece (2064 verts!), AddScroll likewise. Vertex morphing is baked per-frame, NOT keyframe-interpolated per-channel — for a port these are just vertex-buffer swaps/lerps.
- Real1 vs Real2 byte-diff: 30 bytes total — node handle text, one rot-key dword, a few morph vertex bytes, camera record bytes. Six near-identical exports.
- Record-type census across 85 files: type 0 ×256 (mesh+some materials), 1 ×178 (camera+materials), 2 ×139 (camera targets), 4 ×22, 3 ×2. The pre-name dword for Material records is NOT a record type (values 0/1/4 observed for materials in one file) — likely material index/count; camera/target/omni payloads still undecoded.

## 5. Cross-production notes
- Corrected per coordinator: "1.0.2" is libpng's version string, not an engine version. Liquid.exe carries the same libpng/zlib 1.1.3 baggage.
- ijl11.dll byte-identical to all siblings (sha 5a0b1c4e… family fossil). STAR.OB3 referenced as `data\star.ob3` as in geno/channel5.
- Engine drift order (measured): Elements(2001, no ext) → morning/Genoaux(2002-03, ARB_multitexture, 8 effect tokens) → **liquid(2002-08: 18 effect tokens, `grayscale` flag, BASS 1.6, scripts inside the archive, two-script playback)**. Liquid is the family's terminal build.
- Unlike Satellite (loose script.txt + scenes-only data.rar), liquid packs scripts INSIDE the .wen; textures/audio stay loose in data/.

## OPEN QUESTIONS
- Scale-key field order ({0, f32, ticks, …} vs pos-key {frame, params, value}) — needs the loader disasm at the track reader.
- Morph frame timing: all-zero 28-B headers; are the 6 frames uniformly spaced over nframes? (INFERRED likely; verify in code.)
- Meaning of pre-track word b (0/1/2/3) and the 56-byte-tail middle words (f32 + ticks pair present even when nsca=1).
- Camera (type 1/2), Omni, and Material payload layouts; the type-3/type-4 records (22+2 instances).
- Whether part 2 starts automatically or via a key/loop flag (the jz back-edge suggests automatic; confirm in round 2).
