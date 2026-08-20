# 09 — We Are (Haujobb), 7th @ State of the Art 2002 demo compo

## SUMMARY
- **Title/year/party**: "We Are", Haujobb — State of the Art 2002 (exe linked 2002-12-14 07:08 UTC). Demozoo 56947 / pouet 8281.
- **Release form**: single file — WE_ARE.EXE (8,978,432 b) + FILE_ID.DIZ (+ scene.org footer added by mirror).
- **Engine**: Haujobb HJB engine family, MSVC6 (linker 6.0), statically linked MFC (CArchiveException RTTI + AFX resource strings), "OpenGL WinClass".
- **GFX API**: OpenGL 1.1 fixed-function + ARB_multitexture (wglGetProcAddress) + copy-based render-to-texture (glCopyTexSubImage2D). No shaders, no register combiners, no compressed textures.
- **Audio**: 128 kbps 44.1 kHz MP3 (fforestF.mp3, 290.4 s) decoded by an **in-exe MP3 decoder** ("Xing" tell) played via waveOut* (WINMM). No BASS, no fmod — the "fmod" string is the CRT math function.
- **Data**: embedded **ACE 1.2** archive (WinACE unregistered, ver_created=12/ver_extract=10, solid, method 1, 1024K dict) at file offset 0x4b0d0 = .data+0xd0; unpacked by embedded "UNACE v1.2 public version" code. 94 entries: 41 .HJB + 50 .jpg + 1 .mp3 + STAR.OB3 + script.txt.
- **Packer**: none. Plain MSVC6 PE, .text/.rdata/.data/.rsrc; upx refuses it (not packed); payload bulk is the ACE inside .data.
- **Port difficulty**: 3/5 — textures are baseline JFIF (free), mp3 is stored ~raw (free), script grammar is plain text; cost is the shared .HJB scene/keyframe decode + fixed-function GL with RTT.
- **Closest sibling**: **elements** (hjb_elef, 2002-02-23) — same packaging (ACE at .data+0xd0, same UNACE v1.2 stub strings, same ACE creator), same section scheme, same import DLL set, near-identical script grammar.

## 1. Extraction status — COMPLETE, honest accounting
- Carved ACE from WE_ARE.EXE at 0x4b0d0; truncated at 0x87c58b (after the last valid header, a 28-byte type-2 header @0x87c56b with good CRC; what follows is garbage that only *parses like* a type-43 header and has a bad CRC — the earlier listing's "end_of_archive 0x886594 past .data" was that junk walk. The real archive ends inside .data: 0x87c58b < .data raw end 0x882000).
- Decompressed with `elements-work/acefile.py` (Daniel Roethlisberger's pure-python acefile; full ACE 1.0 method-1 LZ77): **all 94 of 94 entries extracted, full size, CRC-verified — including every genuinely compressed .HJB (4–31 % ratios), not just stored entries.** Solid-mode dictionary carry-over handled by the library.
- CRC footnote: ACE stores CRC-32 **without the final inversion**. First pass "failed" 94/94 with every value the exact bitwise complement (Black.HJB computed bf3a94f8 vs stored 40c56b07 = ~bf3a94f8). Verified `~crc32(data) == stored` for all 94. All crc32 values quoted from ACE listings across this project are this variant.
- Correction to the round-1B note: the archive holds **94** entries, not 101 (41 HJB + 50 jpg + mp3 + OB3 + txt). `we_ace_list.txt` itself says files=94.
- Artifacts: `we_work/we.ace` (truncated carve), `we_work/extracted/` (94 files).
- Textures: 50 baseline JFIF JPEGs (e.g. WeTitle.jpg 640×480 baseline) — browser-decodable directly.

## 2. Lineage — the byte-identical asset chain
sha256, not just crc:
- **STAR.OB3** (196 b) `08923ff6…aa7bd` — identical in **five** productions: hjb_geno/Data, hjb_liqu/data, channel/Satellite/Data, elements ACE, We Are ACE.
- **Black.HJB** (1,108 b, mtime 2001-02-08) `adff75d8…aed93` — identical in **four**: mosaik, channel5/Satellite (data.rar), elements ACE, We Are ACE. Genoaux's Black.HJB is a *different* file under the same name (`e4f38426…9f77d4`).
- Black.HJB's material path is `D:\Memoirs\Data\Black.bmp`: the fossil was authored for a **Memoirs** project tree in Feb 2001 (Haujobb released a demo "Memoirs" at MS2001 — match INFERRED, not verified against that binary) and was then carried verbatim through mosaik → channel5 → elements → We Are. This answers mosaik report's open question about `D:\Memoirs\`.
- We Are's own scenes carry `C:\GreenPill2\data\*.bmp` (59 paths across 39 of 41 HJBs; Black.HJB is the lone D:\Memoirs holdout) — **"GreenPill2" is We Are's working project tree**, as `E:\Elements\` (48) was elements'. Materials reference .bmp, shipped textures are .jpg with matching basenames → engine matches by basename against [textures].
- What the chain proves: one shared data directory migrated release-to-release across at least five productions and ~22 months, on the same team's machines — assets were *copied forward, never re-exported* (byte-identical incl. stale absolute paths and 3dsmax handles). This is one engine + one accreting data tree, not per-production toolchains.

## 3. Script generation — 2002 grammar, and the biggest script in the set
`script.txt` (36,132 b, 4,406 CRLF lines, 2002-12-14 08:04 — saved 56 min after the exe link stamp):
- Sections: `[mp3]`×1, `[textures]`×1 (50 entries, flags `fullscreen`/`nomipmap`), `[scenes]`×1 (41 entries), **`[part]`×273** (every one exactly the 6-line body: scene / time-ms / int / blendmode / texture / blendmode), `[addpart]`×375 (all 3-line), `[parameter]`×38 (`rendertexturesize`×19, `renderfullscreen`×19), `[addeffect]`×19 (all `render2texture`).
- **Verdict: 2002 generation** — 6-line [part], texture flags, [parameter]/[addeffect] present; mp3+BASS-era layout but see audio. `[module]` never appears in the script, yet the **exe's parser vocabulary contains it** (keyword strings in .rdata: [addeffect] [addpart] [module] [mp3] [parameter] [part] [scenes] [textures]) — the engine supports module playback that this production doesn't use. Elements' exe lacks both `[parameter]` and `[module]`: those two keywords are the measurable grammar growth between 2002-02 and 2002-12.
- Sequencing scale: part times strictly monotonic 9,621 → 310,000 ms (mp3 is 290.4 s; last part outlives the music). 273 timeline cuts + 375 overlays in ~5 minutes ≈ a cut every 1.1 s — vs elements' 94 parts / 54 addparts / 1 addeffect (and an `[end]` tag We Are doesn't use; times not monotonic there, max 600,000). We Are sequences ~3× the show of elements with the same grammar.
- Closure: every one of the 94 archive files is referenced (50 textures + 41 scenes + mp3 + script itself + STAR.OB3 hardwired) and nothing referenced is missing.

## 4. Packaging vs elements.exe
| | elements.exe (2002-02-23) | WE_ARE.EXE (2002-12-14) |
|---|---|---|
| linker / CRT | MSVC 6.0, static MFC | MSVC 6.0, static MFC |
| sections | .text .rdata .data .rsrc | same order/scheme |
| .text vsize | 0x49332 | 0x3edb2 (smaller!) |
| .rdata vsize | 0xa87c | 0xa858 |
| .data raw | 0x6e4000 | 0x837000 (bulk = ACE) |
| ACE offset | 0x560d0 = .data+0xd0 | 0x4b0d0 = **.data+0xd0** |
| ACE creator | ver 12, extract 10, `*UNREGISTERED VERSION*`, solid, m1 q5 1024K | identical |
| unpack code | "UNACE v1.2 public version" + CArchiveException | identical strings |
| imports | OPENGL32(50) GLU32 WINMM KERNEL32 USER32 GDI32 WINSPOOL ADVAPI32 COMCTL32 | same 9 DLLs, OPENGL32(53), minor order shuffle |
| GL import diff | +glAlphaFunc | +glCopyTexSubImage2D, +glOrtho, +glTexGeni, +wglGetProcAddress |
| multitexture | none (no ARB strings) | full glMultiTexCoord*ARB family + glActiveTextureARB/glClientActiveTextureARB |
| resources | CURSOR BITMAP ICON DIALOG STRING VERSION (MFC boilerplate) | identical set; VERSION says "We are"/weare.exe; title 'Haujobb: "We Are"', class 'Haujobb at SOTA 2002' |
| first 4 KB | — | 93.2 % byte-identical (headers); 9.9 % over 64 KB (recompiled code); first diff @0x3c |
- Same build recipe, nine months of engine work apart: **identical packaging pipeline** (WinACE 1.2 unregistered archive pasted at .data+0xd0, public UNACE 1.2 source compiled in), one engine recompiled. We Are *dropped* code (.text −42 KB) while *adding* multitexture + RTT — consistent with stripping unused paths for the single-file release.
- WE GL reach: fixed-function + ARB_multitexture only. RTT is glCopyTexSubImage2D (framebuffer copy), driven by the script's render2texture/rendertexturesize/renderfullscreen. Not beyond fixed-function.

## 5. Audio with no DLL
No BASS/fmod DLL ships and none is imported or named. WINMM imports are exactly the seven `waveOut*` calls (same set both exes). "Xing" string = VBR header parser of an integrated mpglib/amp-family MP3 decoder. `nosound` option string present. The "fmod" string sits in the CRT float-function name table (frexp/fmod/_hypot/ldexp) — **not** FMOD. Both single-file releases therefore replaced the loose-file era's BASS/fmod DLLs with a statically compiled mp3→waveOut path. (mp3 stored at 99 % in the ACE — effectively raw.)

## 6. Contribution to the .HJB keyframe question
Dez1–4.HJB: four exports of the same one-box+camera scene, same day, **identical size (1,434 b)** — nframes=900, records "Box01 (…)"/"Camera01 (…)"/"Material #1 (…)". They differ in only 77 bytes across 13 short runs (0x17–1a = 3dsmax handle hex digits; the rest 1–12-byte runs at 0x28a…0x568). Same length despite edited animation ⇒ **key count did not change when values were edited** — track storage is fixed-size per key, no delta/varint encoding. Wide.HJB vs WideR.HJB (both 1,951 b) show the same pattern: 32 differing bytes in 9 runs. These pairs are the cleanest controlled inputs yet for the track-grammar decode: diff offsets are in `we_work/`, files in `we_work/extracted/`. (Attempted naive f32 reads at diff offsets are misaligned garbage — the record layout, not 4-byte alignment, governs; left for round 2.)

## OPEN QUESTIONS
- [module] keyword: what format does the 2002 engine's module path play (BASS-era .mod/.xm?), and is the code live or vestigial in WE?
- The 3rd line of [part] (always "0" here) and the [addpart] 2nd line (e.g. "90") — semantics unknown (blend amount? rotation?). Needs the parser at Ghidra depth.
- Dez/Wide diff runs → actual track field names (frame stamp? TCB?) — round-2 decode against the loader.
- Whether released "Memoirs" (MS2001) actually contains the ancestral Black.HJB — binary not in corpus (UNVERIFIED).
- Type-2 ACE header at 0x87c56b (28 b, flags 0x1): recovery record or comment? Harmless but unidentified.
