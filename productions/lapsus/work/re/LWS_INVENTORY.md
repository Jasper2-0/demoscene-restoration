# LWS inventory — what the 23 shipped scenes actually use

Parsed by `work/js/lws.mjs` (run the table below via the snippet in its
header). All scenes are **LWSC version 3, text, 30 fps**. Every envelope key
is spantype 0 = TCB (Kochanek-Bartels) except a handful of spantype 3
(Linear) in `rad_out.lws`; every envelope ends `Behaviors 1 1` (Reset).
Motion channels are always 9: `px py pz  h p b  sx sy sz` (meters / radians).

**Open question for the engine pass:** frame ranges are almost all `1-60` at
30 fps = 2 s, but parts visibly run 5–15 s in the capture — the engine must
loop, stretch, or drive envelope time nonlinearly. Resolve from the dm2000
sequencer before trusting any timing derived from `LastFrame`.

| scene | frames | objects | nulls | lights | cameras | keys | fog |
|---|---|---:|---:|---:|---:|---:|---:|
| diskojea.lws | 1-60 | 4 | 0 | 2 | 1 | 233 | 0 |
| flu2.lws | 1-60 | 2 | 0 | 2 | 1 | 54 | 0 |
| hairball.lws | 1-60 | 0 | 4 | 1 | 1 | 166 | 0 |
| hedi.lws | 1-60 | 5 | 3 | 1 | 1 | 475 | 0 |
| higherbiing.lws | 1-60 | 13 | 0 | 2 | 3 | 349 | 1 |
| hulluolli.lws | 1-60 | 2 | 1 | 1 | 1 | 57 | 0 |
| kaivoalieni.lws | 1-60 | 15 | 0 | 2 | 1 | 326 | 0 |
| kartonki.lws | 1-60 | 2 | 0 | 1 | 1 | 72 | 0 |
| kieku.lws | 1-60 | 6 | 0 | 2 | 1 | 132 | 0 |
| krediili.lws | 1-120 | 7 | 2 | 1 | 1 | 456 | 0 |
| kuubiotekniikka.lws | 1-60 | 32 | 1 | 1 | 1 | 609 | 1 |
| made.lws | 1-60 | 5 | 0 | 1 | 1 | 73 | 0 |
| mela.lws | 1-60 | 6 | 2 | 2 | 1 | 816 | 0 |
| morko.lws | 1-30 | 27 | 2 | 3 | 3 | 2727 | 0 |
| paleksi.lws | 1-60 | 3 | 1 | 1 | 1 | 150 | 1 |
| pehko.lws | 1-60 | 0 | 1 | 1 | 1 | 165 | 0 |
| pene.lws | 1-60 | 1 | 0 | 1 | 1 | 33 | 0 |
| rad_out.lws | 1-60 | 3 | 0 | 1 | 1 | 219 | 0 |
| silli.lws | 1-60 | 1 | 0 | 2 | 1 | 45 | 1 |
| sittis.lws | 1-60 | 8 | 0 | 1 | 1 | 303 | 0 |
| syrjakyla.lws | 1-60 | 1 | 0 | 1 | 1 | 39 | 0 |
| turska.lws | 1-60 | 3 | 0 | 2 | 1 | 78 | 0 |
| viherio.lws | 1-60 | 5 | 0 | 1 | 1 | 213 | 1 |

Totals: **228 items, 7,790 keys.**

Notes:
- `hairball.lws` and `pehko.lws` have **zero mesh objects** — only animated
  nulls + camera. These are the hair-system parts; geometry comes from
  `data/hairs/*.txt` at runtime, presumably attached to the nulls. Neither
  name is in the exe's 21-factory list — `Hairball` is (factory
  FUN_00405cd0), `Pehko` is not: pehko.lws must be loaded by another part
  (candidate: same hair engine, second use).
- 23 .lws files vs 21 factories: `pehko.lws` and one factory (`flu2`) pair
  up unevenly — cross-check against the sequencer's play order when known.
- `ParentItem` hierarchies are heavily used (kuubiotekniikka parents all 32
  objects, morko 26 of 27+2) — transform composition order matters.
- Plugin blocks are empty `.BRDF` MasterHandler stubs (authoring residue) —
  22 across 6 scenes, no payload.
- `higherbiing.lws` and `morko.lws` carry **multiple cameras** (3 each) —
  the engine picks/cuts between them somehow.
- Fog on in 5 scenes (`FogType 1`): higherbiing, kuubiotekniikka, paleksi,
  silli, viherio. Remember the GL_EXP-vs-linear trap (METHOD.md §3).
