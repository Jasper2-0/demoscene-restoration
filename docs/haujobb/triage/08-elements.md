# 08 — Elements (hjb_elef), Haujobb — round-1B triage

## SUMMARY
- **Title/year/party:** "Elements", Haujobb — **WINNER, The Party 2001 demo compo** (Demozoo 8975 / pouet 4776). Shipped file is the **final version** (file_id.diz: "final version"; exe mtime 2002-03-14, PE TimeDateStamp **2002-02-23 02:08:12**; script.txt inside dated 2002-01-13). Credits (diz): Visualice, Cynic, Droid, Hellfire, Virgill feat. Tasium.
- **Engine:** Haujobb script-driven OpenGL engine, MSVC 6 (linker 6.0), statically linked MFC; **single-exe build**: all data embedded (ACE archive + raw MP3 in .data, hardcoded addresses in .text).
- **GFX API:** OpenGL **1.1 fixed-function only** — 49 gl* + 3 wgl* static imports; **no wglGetProcAddress, no ARB/EXT extension strings at all** (unlike Satellite's ARB_multitexture). No glCopyTexSubImage2D either.
- **Audio:** **neither BASS nor fmod** — statically linked MP3 decoder (Xing-header tables in .rdata @0x4bcc0) playing a raw MP3 blob from memory through **WINMM waveOut\*** (7 imports). MEASURED in .text @0x4dcf: `push 0x6d55a0 (mp3 VA); push 0xac44 (44100); push 0x45d127 (4,575,527 = mp3 len)`.
- **Data formats:** embedded ACE 1.0 archive, 115 entries: 39 .HJB scenes, 73 .jpg (53 progressive / 20 baseline), 1 .png, STAR.OB3, script.txt.
- **Packer:** none (`upx -t` NotPackedException); the 7.6 MB is .data payload (ACE 2.6 MB + MP3 4.6 MB).
- **Port difficulty:** **4/5** — same .HJB wall as siblings; everything else (script/jpg/png/mp3) is free once pre-extracted (done).
- **Closest sibling:** **channel/Satellite (morning.exe)** — grammar/token superset of Elements', and morning.exe still ships Elements' setup dialog "Elements - Haujobb" + "Copyright (C) 2001" VERSIONINFO (confirmed present here as the original: RT_DIALOG 102 + RT_VERSION). Elements is the **direct parent of the 2002 engine**.

## 1. Extraction status — COMPLETE AND VERIFIED (115/115)
The brief said 122 entries; the actual listing (`we_work/elef_ace_list.txt`) and archive contain **115 file entries** — 122 was a miscount.
- Prior fleet's `elements-work/extracted/archive1/` already held all 115 files, decompressed with **acefile.py (Roethlisberger's full pure-python ACE 1.0/2.0 implementation — real LZ77 method-1 decompression, not stored-only)**. All 115 entries use ACE method 1 (LZ77, qual 5, 1024K dict); none is stored.
- **Verification (this round):** every one of the 115 files matches its header's original size AND crc32. The initial check "failed" 115/115 because **ACE stores CRC-32 without the final bit-inversion**: for every file, `~zlib.crc32(data) == header crc` exactly (e.g. Black.HJB zlib bf3a94f8 ↔ ACE 40c56b07). With the ACE convention: **ok=115 bad=0 missing=0**. Extraction is genuinely complete; the data is in hand.
- **The MP3 is NOT in the ACE.** `extracted/elements.mp3` (4,575,527 B) was carved by the prior agent as an MPEG frame chain; this round confirmed it is **byte-identical to exe raw 0x2d55a0–0x7326c7** and that the engine references exactly that VA+length as immediates (§4). It ends with an ID3v1 tag: title "Elements", artist **"Virgill & Tasium"**, year 2001, comment "www.mp3.com/virgill". MPEG1 L3 128kbps 44.1kHz JStereo ≈ 4:46 — matching the last real [part] at 285891 ms (absolute-stream-ms timeline confirmed again).
- Exe payload map (MEASURED): ACE main header raw 0x560d0; last member data ends 0x2d32ff; genuine WinACE **recovery record** (header type 2, crc_ok, contains `**ACE**` + relsize 2,609,711 = archive size) + ~8.8 KB recovery data to 0x2d55a0; raw MP3 to 0x7326c7; engine string block + CRT tables to .rsrc @0x73a000; file ends 0x746000, **no overlay**. The other two `**ACE**` hits (0x2d330a, 0x732f44) are the recovery record's own signature and the UNACE string constant — not archives.

## 2. Engine lineage / fossils (all byte-compared this round)
- **STAR.OB3** (196 B, ACE crc f163c888, 2001-12-16): extracted copy is **byte-identical** (cmp) to hjb_geno/Data/STAR.OB3, hjb_liqu/data/STAR.OB3, channel/Satellite/Data/STAR.OB3. Exe hardcodes `data\star.ob3` (0x73284c). Fourth confirmed carrier; we_are's ACE lists the same crc → all five 2001–2002 prods share the one star mesh.
- **Black.HJB** (1,108 B, mtime 2001-02-08, ACE crc 40c56b07): **byte-identical** to mosaik/Mosaik/Data/Black.HJB, Satellite data.rar's Black.HJB, and liquid.wen's Black.HJB. (hjb_geno's Black.HJB is the known different re-export, 1,105 B.) The Feb-2001 helper scene rode along unchanged from Mosaik through Liquid/Elements/Satellite.
- Name-level reuse: **Spider.HJB's first node is "Mosaik_SpiderNurbed"** — a Mosaik-era 3dsmax scene re-exported for Elements' ending.
- HJB container unchanged: all 39 extracted scenes start `u32 0 | u32 nframes (64–500) | u32 0|1 | "Name (HEXHANDLE)"` — same header as every other generation checked (39/39 leading-zero check passed).

## 3. Script generation — THE VERDICT
`script.txt` (10,017 B, dated **2002-01-13**; party version was 2001-12-28-ish, so grammar was set by Dec 2001):
- Sections used: `[mp3]` (name + extra `0` line), `[textures]` (with **`nomipmap` and `fullscreen` flags**), `[scenes]` (39), **94 `[part]` × 6 lines** (hjb / absolute-ms time / numeric param / camera name ("standard" or Camera02) / overlay tex / "standard"), **54 `[addpart]`** (3 lines), **1 `[addeffect]`** (`tunnel` + Fog.jpg + 3 numbers), `[end]`.
- **Elements already speaks the 6-line "2002" grammar** — extra numeric param line, texture flags, [addpart], [addeffect], the [mp3] `0` line. **The 5→6-line split therefore falls between Mosaik (2001-04, 5-line/fmod) and Elements (2001-12), not at MS2002.**
- But the engine's token set is a **strict subset of the MS2002 exes** (binary strings @0x73282c–0x7328c4): `[mp3] [textures] [scenes] [part] [addpart] [addeffect]` + effects `tunnel droid1 droid2 droid3` only. **No `[parameter]`, no `[module]`, no `oscope/render2texture/gridvemputus1/griddistord5`, no `data.rar`/`password`, no `nosound`** — those are all post-Elements additions in morning/Genoaux/liquid. ([end] appears in the script but not in the binary; parser evidently stops at EOF/unknown.)
- Refined generation ladder: moments/mosaik (5-line, fmod) → **Elements TP2001 (6-line + flags + addpart/addeffect, waveOut-mp3, ACE loader, effects tunnel/droid1-3)** → morning/liquid/genoaux 2002 (BASS, RAR loader, + [parameter]/[module] + oscope/render2texture/grid* effects).

## 4. Engine basics for the record
- **PE map:** linker 6.0, base 0x400000. .text VA 0x1000 raw 303,104; .rdata 45,056; **.data VA 0x56000 VSize 7,445,416 raw 7,225,344** (payload lives here; raw≈virtual, so no big runtime-zeroed buffer trick); .rsrc raw @0x73a000 (48,648). No overlay.
- **Imports:** OPENGL32 (49 gl + wglCreateContext/DeleteContext/MakeCurrent), GLU32 (gluPerspective/gluLookAt/gluBuild2DMipmaps), **WINMM (waveOutOpen/Write/Reset/GetPosition/Prepare/Unprepare/Close)**, KERNEL32(102)/USER32(114)/GDI32(35), WINSPOOL+ADVAPI32+COMCTL32 ord17 (static MFC tell). **No BASS/fmod/ijl11 import and no such DLL ships** — audio §1; JPEG via **statically linked IJG libjpeg** ("JPEGMEM" @0x7336bc), not Intel ijl11.dll — which is why 53 of 73 textures could be **progressive** JPEG. libpng **1.0.2** + zlib 1.1.3 static ("1.0.2" sits adjacent to "Incompatible libpng version…" — this resolves the siblings' "1.0.2 engine version?" ambiguity in favor of **libpng**).
- **Archive loader:** statically linked **"UNACE v1.2 public version"** (string @0x732f24, + "Main comment:/File comment:/archivesize: %d"). Loader messages " - loading from disk" / " - loading from archive" / "trying to open '%s'" → tries loose file first, then the in-memory archive. MEASURED @0x4d1e: `push 0x27f4cd (len); push 0x4560d0 (VA of ACE header)` — archive handed to unace as a hardcoded memory buffer (length runs to the MP3 start).
- **Setup dialog:** RT_DIALOG "Elements - Haujobb" — Run Demo / Loop Demo / No Sound / **Window Mode** / 640x480 / 800x600 / 1024x768 Fullscreen; resolution table confirmed in code @0x4d3c–0x4d80 (640/480, 800/600, 1024/768). VERSIONINFO "Copyright (C) 2001". This exact resource block persists in morning.exe (Satellite) — Elements is the 2002 engine's direct parent.
- **GL feature set** (import census): immediate mode + vertex arrays + display lists + lighting + glTexGenf (env mapping) + gluBuild2DMipmaps + glAlphaFunc/glBlendFunc. Absent vs Satellite: glCopyTexSubImage2D, glTexGeni, multitexture — the render2texture pipeline was added AFTER Elements.
- **Textures:** 53/73 jpgs progressive, 20 baseline; 1 PNG (Windows.png 640×480 RGBA). All browser-decodable.

## 5. Port difficulty — 4/5
Free: complete verified data set already extracted (this dir); script grammar trivial; absolute-ms sync; jpg/png/mp3 native in browsers; OB3 solved-ish. Work: the shared **.HJB keyframe/controller decode** (39 more scene files, same format) plus effects tunnel/droid1-3 and the [addpart] scene-stacking compositor. Nothing Elements-specific beyond that — no runtime ACE/RAR needed after pre-extraction.

## OPEN QUESTIONS
- [part] line 3 numeric param semantics (0 / 2 / 4–15 stepping here — looks like a variant/index, not the Cartoon 400–700 use).
- The MP3 decoder's identity (Xing-capable, float tables; mpglib/amp family? needs disasm) — cosmetic only.
- .HJB keyframe grammar — unchanged; Elements adds 39 samples but no new structural evidence was chased this round (round-2 target).
- What the 8.8 KB WinACE recovery record implies about the build pipeline (archive built by registered WinACE? main hdr says UNREGISTERED — recovery was on anyway).
