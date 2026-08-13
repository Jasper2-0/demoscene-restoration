# TODO — open decisions and planned phases

Open items from the 2026-08-13 monorepo migration. Each of the decisions is
deliberately *not* automated: they change published sites or preserved
behavior, so a human signs off.

## Decisions

- [ ] **Energia vendored-runtime drift.** `node tools/sync-shared-runtime.mjs
  --check` reports four files in `productions/energia/web/js/shared/` drifted
  from canonical `shared/sunflower/js/` (exp-renderer, mesh-geometry, scene,
  timeline). Adjudicate which side is current — canonical may have gained
  wonder-era fixes energia never re-vendored, or energia's copies may carry
  fixes that never flowed back. Then either sync or fold the energia changes
  into canonical, and re-run the energia effect signoffs.

- [ ] **Push the synced Pages checkouts** (all rsynced at `~/Developer/pages/`,
  none pushed):
  - `ptct-webgl` — METHOD.md update only.
  - `lost-vegas-webgl` — comment-only diffs from the layout migration.
  - `sonnet-webgl` — brand-new repo holding its FIRST site copy; pushing
    publishes an engineering build at jasper2-0.github.io/sonnet-webgl/.
  - `wonder-webgl` — repo not created yet; `scripts/publish-pages.sh wonder`
    arm is wired and `dist/wonder-webgl` passes its gates. Publication policy
    (SUNFLOWER_PORTS_TODO §5): after the 4:3 chronological signoff.

- [ ] **energia.mp3.** The licensed RinneRadio track is gitignored
  (`productions/energia/web/assets/energia.mp3`) until the energia site's
  publication story is decided. Local builds have it; fresh clones rehydrate
  it from `originals/sunflower/energia_fixed.zip` (see the
  check-sunflower-assets skip message).

## Planned phases

- [ ] **ixalance-js import.** Clean the dirty tree at
  `~/Developer/xx-sandbox/ixalance-js` (~10 modified files, remote solar-nl),
  audit history for large blobs (`git filter-repo --analyze`) BEFORE any
  subtree add — history is public forever after. Then
  `git subtree add --prefix=productions/ixalance/src`, flip
  `build-ixalance.sh`'s default SRC (keep `IXALANCE_SRC` override), add
  `productions/ixalance/prod.json` mapping the haujobb / aardbei / maturefurk
  / alien-prophets entries in `originals/`, and audit overlap with
  `productions/ptct/work/ixalance/` (currently gitignored).

- [ ] **Shared runtime unification** — one library at a time, each behind its
  consumers' verify gates (see the table stub in
  `tools/sync-shared-runtime.mjs`):
  - `minigl` (ptct copy vs sunflower copy — diff first; sunflower's carries
    multitexture/texture-env/normalize extensions)
  - `minid3d7` (lost-vegas), `minid3d8` (sonnet)
  - `xm` replayer (lost-vegas, sonnet, sunflower pair) — extra gate:
    `tools/audio_ab.mjs` sample-for-sample A/B per consumer before/after.

- [ ] **build-energia.sh** — mirror of build-wonder.sh (asset gate, drift
  gate, dist verify), plus a `publish-pages.sh energia` arm once it exists.

- [ ] **Top-level asset viewer for 3D scene formats** (`tools/`) — a browser
  viewer for LightWave (`.lwo` / `.lws`) and 3DS (`.3ds`) content, so
  extracted geometry, materials, UVs and animation can be *looked at* rather
  than inferred from parser output. METHOD.md §4 already says it: "before
  theorising about an unidentified blob, render it" — that rule currently
  only has tooling for raw bitmaps, not for scene formats.
  Foundations exist: `productions/lapsus/work/js/{lwo,lws}.mjs` parse all 50
  LWO2 objects and all 23 LWSC scenes cleanly, so the viewer is mostly a
  renderer plus a file picker. Promote those parsers to `shared/` when it is
  built, since 3DS shows up across the sunflower/maturefurk era too.
  Useful beyond Lapsus: it doubles as a diffing surface (original asset vs
  ported render) and as the eyeball check for n-gon triangulation and UV
  splitting.

- [ ] **Capture alignment backfill** — `alignmentOffsetMs` is recorded for
  ptct (+4431 ms) and wonder (0); lost-vegas and sonnet captures are pinned
  but their offsets are still null in `prod.json` — recover them from the
  existing cross-correlation data when next touched.
