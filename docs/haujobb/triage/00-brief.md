# Haujobb triage brief — shared instructions

Repo: /Users/scjas/Developer/01 - Jasper2-0/02 - Github Public/demoscene-restoration
Originals: originals/haujobb/<dir>/   (READ ONLY — never modify anything under originals/)
Read METHOD.md in the repo root FIRST. It is the governing method document.
Your output goes to the scratchpad path given in your task. Write NOTHING into the repo.

## The governing rule (METHOD.md)
The binary is the source of truth. Specs and nfo files are hints about where to
look, never statements about what the program does. Report what you MEASURED and
mark everything else explicitly as INFERRED or UNVERIFIED.

## Environment (already checked — do not re-check, do not install anything)
Available: upx, ndisasm, unrar, ffmpeg, yt-dlp, node, strings, xxd, file.
PE parsing: `uv run --with pefile python3 -c "import pefile; ..."` (pefile 2024.8.26).
Ghidra 12.1.2 headless, invoked by ABSOLUTE PATH (it is not on $PATH):
  export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
  /opt/homebrew/Cellar/ghidra/12.1.2/libexec/support/analyzeHeadless ...
  repo scripts: tools/ghidra/{ExportDecomp,ExportDisasm,DecompileAt}.java
  See productions/wonder/work/tools/run-oracle-audit.zsh for the working invocation.
Ghidra is available but THIS ROUND IS TRIAGE — do not start a full decompile
(it is slow and belongs to round 2). Use it only if a specific question needs it
and you can answer that question in one targeted pass.
Do NOT run any Windows executable. Static analysis only.

## What to produce
A markdown report. Be dense and factual; tables over prose. Cover:

1. **Archive inventory** — every file, size, mtime, what it is. Nested archives:
   list contents (`unrar l`), do not extract into originals/ (extract to your
   own scratch dir if needed).
2. **Packer** — is the exe packed? (`upx -t`, section names, entropy). If UPX,
   can `upx -d` unpack it to a scratch copy? Record the version tell.
3. **PE map** — sections (raw vs virtual size — a big virtual/small raw .data
   means runtime generation), imports (statically imported DLLs AND anything
   resolved via LoadLibraryA/GetProcAddress — grep the strings for DLL names),
   resources, overlay (data appended past the last section).
4. **Graphics API** — OpenGL vs Direct3D, and WHICH version. Cite the evidence
   (imported symbols, GetProcAddress'd names in strings, D3D interface GUIDs).
   Note fixed-function vs shader-era extensions (ARB_*, NV_*, register combiners).
5. **Audio** — BASS.DLL / fmod.dll / other, and what it plays (mp3? xm? mod?).
   Note the BASS/fmod version if the DLL exports or version resource says so.
6. **Data formats** — for every non-obvious extension in the data dir
   (.hjb, .ob3, .3do, .dat, .cfg, .wen), dump the first 128 bytes as hex+ascii,
   report magic, look for a plausible header, count records where a structure is
   claimed. Follow METHOD.md's "count the population before naming a field": do
   NOT declare a field constant from 4 samples. If several files share an
   extension, tabulate the candidate header fields across ALL of them.
7. **Script/config text** — quote it and explain the grammar you can infer from
   the data present (which files it names, in what order).
8. **Strings of interest** — engine/tool signatures, compiler tell (MSVC version
   string, RTTI), library credits, format names, shader/extension names,
   file paths left in the binary (they name the author's source tree).
9. **Third-party dependencies** — ijl11.dll = Intel JPEG Library; note whether
   textures are baseline JPEG (`file` + first bytes) since that decides whether
   a browser can decode them directly.
10. **Port difficulty assessment** — what is hard, what is already free
    (a .jpg texture is free; a bespoke procedural VM is not), and what shared
    infrastructure this production would need.

## Cross-production question (answer explicitly, it is the point of this study)
This group shipped ~9 productions over 2000-2002 with mostly the same coders
(cynic = engine, visualice, droid, hellfire). Report every piece of evidence
about SHARED ENGINE CODE between your production and the others:
 - identical or near-identical strings/format magics
 - the script.txt grammar and how it differs from the other prods' script.txt
 - .hjb / .ob3 header layout
 - compiler/runtime version drift
 - byte-identical helper DLLs (sha256 the DLLs)
Say clearly which OTHER production in originals/haujobb/ yours is closest to,
and on what measured evidence.

## Report format
Start with a 10-line SUMMARY block: title, year, party, engine, GFX API, audio,
data formats, packer, port difficulty (1-5), closest sibling.
Then the detail sections. End with an OPEN QUESTIONS list.

---

## ROUND-1B ADDENDUM — work already done, do NOT redo it

A previous agent fleet was killed mid-flight by a session limit. It left
COMPLETED reports and EXTRACTED ARTIFACTS in this same directory. Read what is
relevant to you BEFORE doing anything, and never re-extract what is already here.

Completed reports (read the ones touching your production):
  03-mosaik.md  04-art.md  05-satellite.md  10-provenance.md  10-prodjson-drafts.json

Extracted payloads already on disk (in this directory):
  liquid_wen/      87 .HJB extracted from hjb_liqu/liquid.wen (RAR)
  rar_extract/     25 .HJB extracted from channel/Satellite/data.rar (RAR)
  elements-work/   ACE tooling + extracted/ (archive1, elements.mp3) for elements.exe
  we_work/         elef_ace_list.txt, we_ace_list.txt — FULL ACE listings for BOTH
                   single-file releases (name, packed, orig, ratio, date, crc32)
  work/            parse_hjb.py, scan_hjb.py, stride.py, cmp_records.py, dump_words.py
  api/             cached Demozoo prod_*.json
  bin/unrar, unrar-local, hjb.py, pemap.py, res.py, text.asm (172K .text disasm)

Established facts (MEASURED by the previous fleet — treat as given, do not re-derive):
  - ALL nine productions are one engine family; every one uses .HJB scenes + .OB3.
  - THREE loader paths for scene data: loose files (art, moments, mosaik, genoaux),
    embedded RAR via urarlib (channel5 data.rar, liquid liquid.wen),
    embedded ACE (elements, we_are). Genoaux.exe carries the RAR loader strings too.
  - .HJB header = u32 0, u32 nframes, u32 first-record-type; records named
    "Name (3dsmax-handle)"; mesh = verts + per-corner {index,u,v}; materials carry
    absolute D:\Textures\ paths. Layout identical across all 46 loose files checked.
  - Two script generations: 2000 (fmod FSOUND 3.20, 5-line [part], no texture flags)
    vs 2002 (BASS, 6-line [part], texture flags, [parameter]/[addeffect]/[addpart]/[module]).
  - Byte-identical fossils across productions: ijl11.dll in all 7 that ship it;
    BASS.DLL 35cabf96 in artf/geno/mifi/channel5; fmod.dll in moments/mosaik;
    STAR.OB3 in geno/liquid/channel5 (crc32 f163c888 also in elements+we_are ACE);
    Black.HJB (2001-02-08, crc32 40c56b07) in mosaik/channel5/elements/we_are.
  - morning.exe and Genoaux.exe: same 425,984 bytes, ~76% byte-identical.
  - Engine version string "1.0.2"; liquid wants "bass 1.6".

THE HIGHEST-VALUE OPEN QUESTION, repo-wide: the .HJB animation/controller
(keyframe) track grammar — key counts, interpolation type, TCB params, the
frame-stamp stride. One decode serves ~250 scene files across all nine
productions. If your production can contribute evidence toward it, prioritise that
over restating what is already known above.

### CORRECTIONS to the addendum above (measured by the Elements pass, 08-elements.md)
- "Engine version 1.0.2" is WRONG. That string is **libpng 1.0.2**, present in
  several siblings. There is no engine version string. Do not repeat the claim.
- Elements' ACE holds **115 entries, not 122** (the 122 figure counted header
  lines in the listing). All 115 are ACE method 1; all 115 are extracted and
  verified. ACE stores CRC-32 **without the final inversion** — compare against
  `~crc32(data) & 0xffffffff`, or every entry will look corrupt.
- The generation split is NOT one axis. Script grammar, audio library and
  archive format change at DIFFERENT points:
    moments, mosaik   5-line [part], fmod FSOUND 3.20, loose files
    Elements          6-line [part], NO BASS/fmod (static MP3 decoder -> waveOut),
                      static UNACE 1.2, static libjpeg, fixed-function GL,
                      NO wglGetProcAddress, effects: tunnel + droid1-3 only
    channel5, liquid, genoaux
                      6-line [part] + [parameter]/[module], BASS, embedded RAR,
                      ARB_multitexture + render2texture, full effect set
  So the 5->6 line change falls between Mosaik (Apr 2001) and Elements (Dec 2001).
