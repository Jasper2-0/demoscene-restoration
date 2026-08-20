# Genoaux — reverse-engineering notes

- demozoo: https://demozoo.org/productions/63983/
- pouet: https://www.pouet.net/prod.php?which=8528
- original: https://files.scene.org/get/parties/2003/altparty03/demo/hjb_geno.zip
- party: Alternative Party 2003, Alternative Demo compo, 17th (2003-01-11)

Genoaux is the **smallest complete member of the Haujobb engine family** — six
scenes, nine textures, one geometry file — and it exercises the full 2002 script
grammar. That is why it is being ported first: it is the least show for the most
engine coverage, so it proves the shared runtime before any of the big ones
depend on it.

The cross-production study is **[docs/HAUJOBB_PORT_STUDY.md](../../../../docs/HAUJOBB_PORT_STUDY.md)**;
this file records only what is specific to Genoaux, and what still has to be
established here.

## Triage result

| | |
|---|---|
| exe | `Genoaux.exe`, 425,984 B, MSVC 6 + static MFC, **not packed**, no overlay |
| twin | same 425,984 B and ~76% byte-identical to Channel 5's `morning.exe` |
| GL | 1.1 fixed-function + `ARB_multitexture`; `render2texture` = `glCopyTexSubImage2D` 512×256 |
| audio | BASS, `mouthwash.mp3`, 160.026 s; clock = BASS byte position ÷ 176.4, resynced every 10 s |
| jpeg | `ijl11.dll` (Intel JPEG Library 1.1), baseline; browsers decode these directly |
| data | 6 `.HJB` scenes, `STAR.OB3`, 9 jpg, `Script.txt` — all loose on disk |
| fossils | `STAR.OB3` byte-identical across 5 productions; build tree `C:\Genouax\Data\` (misspelled) |

## Formats

All three formats this production uses are decoded — see the study for the full
layouts, and `docs/haujobb/tools/` for parsers.

- **`.HJB`** — 3ds Max node-tree export. Keys are
  `{ i32 frame; f32 tension, continuity, bias, unused, unused; value }`;
  pos/scale 36 B, rot 40 B (quaternion, **w,x,y,z**), float 28 B, morph
  28 B + nv×12. Kochanek-Bartels tangents at load, cubic Hermite at runtime,
  quaternions by 3-level de-Casteljau slerp.
- **`STAR.OB3`** — `u16 nverts, nfaces; nverts×3×s16; nfaces×10×s16
  {v0,v1,v2,mat,3×(u,v)/256}` with **V flipped**. `4 + 72 + 120 = 196` = the file.
- **`Script.txt`** — the 2002 grammar, recovered from the parser rather than the
  data. `[part]` is 6 lines and its number is an **absolute end-time in ms**
  (last part 160000 ≈ the mp3's 160.026 s).

## Effects this production uses

`Script.txt` invokes `render2texture` and `tunnel`. The engine's full registry is
16 effects (`droid1-3`, `tunnel`, `oscope`, `render2texture`, `gridplane`,
`gridtunnel`, `gridtunnel2`, `gridinterf`, `griddistord1-5`, `gridvemputus1`) —
a Genoaux port needs only its two, but the shared runtime will grow the rest as
its siblings land.

## Open — must be settled here

1. ~~Two `.HJB` parsers disagree.~~ **RESOLVED 2026-08-20** — see the study.
   `hjb_exact.py` is the reader (251/252 byte-exact over the full corpus);
   `parse_hjb_v2.py` had a loop-termination bug and is superseded. Genoaux's own
   six scenes parse exact under both. Regressions are caught by
   `python3 docs/haujobb/tools/hjb_corpus_check.py <corpus dirs...>`.
2. **Effect drawer internals.** The registry and dispatch are read; what
   `tunnel` and `render2texture` actually draw is not. This is the real porting
   work for this production.
3. **`[addeffect]` p3** is stored and its use is unverified.
4. Track `flag` and file `word0` have no observed non-zero value and no located
   consumer — likely dead, unproven. Do not silently drop them.
5. **Reference capture unconfirmed.** `captures[0]` is a candidate from pouet,
   not fetched and not verified to be this production. The soundtrack is
   160.026 s, so anything far off ~2:40 is a different prod.

## Method reminders that bit this family already

- The engine skips 1-key tracks with an `n == 1` early-out, and those tracks
  hold **exporter garbage in their TCB slots**. Trusting those bytes corrupts
  exactly the tracks that look simplest.
- Every TCB float in every multi-key track across all 213 files is `0.0`. The
  TCB path is real code that the shipped data never exercises — implement it,
  but do not expect it to be visible, and do not "verify" it against data that
  cannot exercise it.
