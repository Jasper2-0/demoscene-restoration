# Mikrostrange — Haujobb, 2nd @ Mekka-Symposium 2000 PC demo (Demozoo 23701, pouet 1092)
`originals/haujobb/hjb_mifi/` — triage round 1B. All claims MEASURED unless marked.

## SUMMARY
- **Title/year/party**: Mikrostrange ("slightly fixed version"), June 2000, Mekka-Symposium 2000 (2nd, demo compo)
- **Engine**: cynic; pre-.hjb codebase — same author lineage, different serialization (see verdict)
- **GFX API**: OpenGL 1.1 fixed-function, static opengl32 imports only, NO wglGetProcAddress, 640x480 hardcoded
- **Audio**: BASS 0.8 (hard version gate 0x80000) playing data\5tfina.mp3 (MPEG1 L3 128kbps 44.1 JStereo); DSound via bass.dll
- **Data formats**: 12 .dat (bespoke byte-packed 3ds-max scene export, NO names/handles), 1 .cfg (lens-flare INI), 64 baseline JFIF jpg, 2 BMP 128x128x24, 1 mp3
- **Packer**: none (plain MSVC6 .text/.rdata/.data; upx: not packed; all strings/imports in the clear)
- **Sequencing**: hardcoded in exe — no script.txt of any kind; ms part-table in main loop synced to BASS_ChannelGetPosition
- **Port difficulty**: 2/5 — grammar of all data files now fully decoded, all textures browser-decodable, timeline is a table in this report
- **Closest sibling**: moments (2000) — but only via init-code fossils (NeHe wgl strings, "OpenGL WinClass", "cannot load picture: ", data\flare4.jpg); string overlap 45% vs the 95.4% mosaik<->moments
- **Verdict**: ANCESTOR, not abandoned sibling — same 3dsmax {index,u,v}-corner mesh convention and Hermite keyframe model, rewritten into .hjb for moments

## 1. Archive inventory
| file | size | mtime | note |
|---|---|---|---|
| mikro-fullscreen.exe | 106,496 | 2000-06-03 | PE32 i386, linker 6.0 (MSVC6), not packed |
| mikro-window.exe | 106,496 | 2000-06-03 | same build; **differs in exactly 2 bytes** |
| bass.dll | 92,660 | 2000-02-28 | sha256 35cabf96… = byte-identical artf/geno/channel5 (given) |
| IJL11.DLL | 180,224 | 2000-04-25 | sha256 5a0b1c4e5d91… = byte-identical mosaik/moments/genoaux/liquid build |
| mikro.nfo / file_id.diz | 1691/249 | | credits cynic engine, "ian luck for bass v0.8", "pentium, opengl, directsound" |
| data/ | 82 files | Apr–Jun 2000 | 64 jpg, 12 .dat, 2 BMP, flare.cfg, 5tfina.mp3 |

**Two-exe diff (measured, cmp -l = 2 bytes)**:
1. offset 0xF0 (PE TimeDateStamp low byte): 0xD0 vs 0x72 — linked 94 s apart (0x393854D0 vs 0x39385472, both 2000-06-02).
2. offset 0xC3B7: `6a 01` vs `6a 00` — a single `push 1`/`push 0` (fullscreen flag) ahead of `push 0x1E0; push 0x280` = **640x480 hardcoded**, into the window-init call (FUN_00401390). The "windowed version" is literally a one-bit patch.

## 2. PE map
.text 0x1387E/0x14000, .rdata 0x18F0/0x2000, .data vsz 0x4994 raw 0x3000 — nothing runtime-generated, no overlay, no resources beyond defaults. Imports: KERNEL32(51), USER32(24, incl. ChangeDisplaySettingsA), GDI32(10, CreateDIBSection/SetDIBits/GdiFlush — loading-text blitter), OPENGL32(47 gl* + 3 wgl*), GLU32(gluPerspective), BASS(7), WINMM(timeGetTime), ijl11 (ordinals 2,3,4). **No DSOUND import in the exe** — bass.dll itself imports DSOUND.dll (measured; nfo's "directsound" is via BASS).

## 3. Graphics API (measured)
- Pure GL 1.1 fixed-function. **wglGetProcAddress is not imported and no gl*ARB/EXT function-name strings exist** — the binary cannot call any extension function.
- FUN_00401590 strstr's the extension string for `GL_ARB_multitexture`, then `GL_EXT_texture_env_combine`, calls glGetIntegerv(0xD33 = GL_MAX_TEXTURE_SIZE) — and **always returns 1**. The "no multi-texturing supported" error path is dead code. Extension use is at most env-combine enum constants on one unit (nfo's nvidia-only warning is really the texture-size query + downsampler: "%s %dx%d -> %dx%d").
- Display list + glBitmap font for "loading..." text.

## 4. Audio (measured)
FUN_00404b40: `BASS_GetVersion() == 0x80000` **hard gate — requires exactly BASS 0.8** (nfo confirmed); BASS_Init(-1, 44100, 0, hwnd); BASS_StreamCreateFile("data\5tfina.mp3"); BASS_StreamPlay. Contrast: moments/mosaik use fmod FSOUND 3.20; geno/liquid return to BASS 1.x. Mikro is the only BASS-0.8 build; bass.dll bytes shared with artf/geno/channel5 are the *shipped DLL*, but mikro is the earliest user.

## 5. Sequencing — priority 1 answer
**There is no script.** Every one of the 79 data filenames is a string constant in .data (grep list at exe strings 1044–1124); scene loads are literal calls, e.g. `FUN_00402b20("data\light.dat", buf, 10)` … `("data\morph1.dat", base+0x31AC0, 0x3C)` — third arg = hardcoded texture-index base per scene.
Main loop FUN_0040a2b0: `t_ms = BASS_ChannelGetPosition(stream) * 0.005668934240362812` (double = 1/176.4 = 1/(44100Hz*4B) — **byte position -> milliseconds**). Compared against an on-stack part table (ms):
`0, 13200, 54300, 82200, 107800, 134000, 173000, 199700, 215800, 228000, 240000`
= 10 parts over a 4:00 song; exits when the part counter passes the table end or WM_CLOSE. Scene-local animation time = `t_ms * 0.035` (double) — i.e. key "frames" replay at **35 frames/sec**. Two further on-stack tables (0,0x73,0xE6,0x159,0x1CC,… and per-part float params) drive intra-part events.

## 6. flare.cfg — decoded completely
INI-style, ASCII, parsed with per-key prefix match; full text quoted in triage evidence (German comment block by the author explains every key: "der reader ist bestimmt total buggy…"). Grammar (from exe strings + FUN_004037a0 parser): `[Flare]` block: `NumberOfFlares:`, `FlareDistance:`, `FlarePreLight:`, `FlareAngle:`, `FlareBlend:`; then `[Lens %d]` blocks: `Filename:` (data\lensN.jpg), `size:` (512 = full screen), `colour red/green/blue:` (0–255); `[eof]` terminator. Shipped values: NumberOfFlares **12** but **15** [Lens] blocks present — blocks 13–15 are dead data (reader takes the declared count). Errors: "cannot load flaredata", debug fmt "lens: %d,%d,%d,%d - filename: %s". This configures the lens flare only; it sequences nothing.

## 7. The .dat format — fully decoded from the loader (Ghidra pass; decomp at re/mikro-decomp.c)
Loader FUN_00402b20 ("mesh-file not found" on fopen fail). Byte-packed (no alignment), all counts u8, **no names anywhere**:

```
file  := camera_rec, u8 nMesh, mesh[nMesh], u8 nLight, light[nLight], u8 n2(=0 in all 12), 0x00
rec-prefix (every record): u8 =0x00, u8 =0xFF   (population: 12 hdr + 76 mesh + 24 light, all 00 FF)
camera_rec := prefix, vtrack pos, strack roll, strack fov(rad), vtrack target, ttrack
mesh  := prefix, u32 =0 (76/76), u32 nVerts, f32 xyz[nVerts],
         u32 nFaces, u8 texId, {u32 idx, f32 u, f32 v}[3][nFaces],
         vtrack pos, qtrack rot, vtrack scale, ttrack vis
light := prefix, u8 r,g,b (scaled *1/256), vtrack pos, ttrack
vtrack := u8 n, n * 40B key {f32 inTan[3], i32 time, f32 value[3], f32 outTan[3]}
qtrack := u8 n, n * 52B key {f32 inTan[4], i32 time, f32 value[4](quat), f32 outTan[4]}
strack := u8 n, n * 16B key {f32 inTan, i32 time, f32 value, f32 outTan}
ttrack := u8 n, n * i32 times — crossing a time XORs a visibility flag (FUN_004019d0)
```
**Interpolation (measured, FUN_00401830/00401a20/00401b70)**: cubic **Hermite** — h = p0(2t³−3t²+1) + m0(t³−2t²+t) + p1(3t²−2t³) + m1(t³−t²), with m0 = this.outTan, m1 = next.inTan, t normalized between integer key times (3dsmax-style baked TCB tangents). Quaternions: cubic bezier via de-Casteljau slerp chain (P0=value, C0=outTan, C1=next.inTan, P1=next.value); slerp = classic sin-ratio form.
**Population check**: a parser implementing exactly this grammar consumes **all 12 files to EOF−1** (final byte always 0x00 = the empty count of a section the loader never reads / terminator). Totals: 76 meshes, 24 lights. Key times are 3dsmax frames (aterie camera: 20 keys at 0,100,…,1600); constant-FOV key = 0.7328 rad ≈ 42°. morph1–5.dat: 10 meshes each, identical topology (7240 v / 14400 f), differing vertex positions = fish morph frames (fisch2.dat = base fish, 5 meshes).
Per-file table: aterie(1 mesh 3606v/7232f, 9 lights, 20-key cam), darm(3 mesh, 7 lights, 47-key cam), fisch2(5 mesh), kopuli(4 mesh 124–…v, 1 light), light(1 mesh, 5 colored lights 148/196/196), mirror(3 mesh), morph1–5(10 mesh), neuronal(9 mesh, 2 lights).

## 8. Ancestry test vs .hjb — priority 2 answer
| | .dat (mikro 2000) | .hjb (moments…we_are) |
|---|---|---|
| header | u8 0x00, u8 0xFF, camera tracks inline | u32 0, u32 nframes, u32 first-record-type |
| record names | **NONE — zero strings in any of 12 files** | "Name (3dsmax-hex-handle)" every record |
| counts/fields | u8 counts, byte-packed | u32 fields |
| material paths | none (textures bound in code by index) | absolute D:\Textures\ paths in file |
| mesh | u32 nVerts, xyz; faces = **3 x {u32 index, f32 u, f32 v}** | verts + per-corner **{index,u,v}** — SAME convention |
| animation | Hermite tracks, u8 key counts, in/time/value/out keys | undecoded (repo open question) |

Hexdump evidence of "no names": `strings -n 5` over all 12 .dat = float noise only; kopuli.dat object record starts `00 ff 00 00 00 00 7c 00 00 00` (prefix, u32 0, nVerts=124) — where a .hjb record would carry its ASCII name.

## 9. Engine kinship — priority 3 answer
Overlap computed the mosaik way (unique strings ≥5 chars, verbatim membership): mikro(527 uniq) ∩ moments = 238 = **45.2%**; ∩ mosaik = 222 = **42.1%** (vs 95.4% mosaik<->moments). Nearly all of the 238 are MSVC6 CRT/API names. The *engine* strings shared with moments are exactly: the four NeHe-basecode wgl errors ("Can't Find A Suitable PixelFormat." / "Can't Set The PixelFormat." / "Can't Create A GL Rendering Context." / "Can't activate GLRC."), window class **"OpenGL WinClass"**, JPEG-loader error **"cannot load picture: "** (verbatim incl. trailing space+colon), and the texture filename **data\flare4.jpg**. NOT shared: moments' 34-entry wglGetProcAddress multitexture table (mikro has none at all), script tokens, fmod anything. GL init + IJL picture loader survived into moments; scene format, sequencer and everything else was rewritten.

## 10. Third-party / textures
All 64 JPEGs: JFIF baseline (0 progressive markers) — browser-decodable as-is. 2 BMP 128x128x24 (water/surface — likely dynamic-texture sources). ijl11.dll = the same 1999 Intel JPEG Library build as 4 later prods. MSVC6, linker 6.0 — no compiler drift into moments/mosaik.

## 11. Port difficulty: 2/5
Free: all textures, mp3, flare.cfg, the .dat grammar (this report), Hermite/slerp math, 640x480 GL 1.1 fixed function. Work: per-part effect code is hardcoded C (10 parts, ~316 functions total, small), water/morph/mirror effects need reading FUN_00405xxx–00407xxx; the two BMPs feed some procedural surface. No shared .hjb infrastructure needed — this one is standalone.

## OPEN QUESTIONS
- Whether .hjb keyframe blocks reuse the 40/52/16-byte {inTan, i32 time, value, outTan} Hermite key — **test this against the ~250 .HJB files**: it is the direct ancestor candidate for the repo-wide track-grammar question.
- The unread 0xE0-record section (rgb + 5 tracks; count 0 in all 12 files) — extra lights/cameras never exercised.
- light.dat's 2 "black" lights (0,0,0 with 6–7 pos keys) in aterie — flare anchors? (UNVERIFIED)
- Exact per-part effect inventory (which .dat + textures per part boundary) — round 2, from FUN_0040a2b0's dispatch.
- Why 35 units/sec (0.035·ms) rather than 30 — author choice or party-hack retiming. (UNVERIFIED)
