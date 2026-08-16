# demoscene-restoration

Reverse-engineered browser reconstructions of classic demoscene productions.
Each restoration recovers *how the original works* from the shipped binary,
documents that knowledge durably, and re-implements it in plain JavaScript +
WebGL2 so it runs from static files with no plugins, no WebAssembly blobs, and
no runtime dependencies.

The project began as **Dutch demoscene immaterial heritage work** — Aardbei and
threestate — and the method turned out not to care about nationality. It now
also covers Sunflower, a pan-European group whose members are mostly Polish,
Maturefurk from Finland, and Potion from Poland. Each production's group and
origin are in its own `prod.json` and in the table below.

The pipeline, the tooling lessons, and the reverse-engineering findings are in
**[METHOD.md](METHOD.md)** — start there.

## Productions

| production | group | year | original API | status |
|---|---|---|---|---|
| [please the cookie thing](productions/ptct/) | Aardbei | 2000 | OpenGL 1.1 | [published](https://jasper2-0.github.io/ptct-webgl/) |
| [lost vegas](productions/lost-vegas/) | threestate | 2000 | Direct3D 7 | [published](https://jasper2-0.github.io/lost-vegas-webgl/) |
| [sonnet](productions/sonnet/) | threestate | 2001 | Direct3D 8 | engineering (readable + 64k builds) |
| [wonder](productions/wonder/) | Sunflower | 1999 | OpenGL FF | engineering |
| [energia](productions/energia/) | Sunflower | 2001 | OpenGL FF | engineering |
| [lapsus](productions/lapsus/) | Maturefurk | 2000 | OpenGL 1.x FF | engineering |
| [tesla](productions/tesla/) | Sunflower | 2000 | — | evidence (source-lineage study) |
| [planet potion](productions/planet-potion/) | Potion | 2002 | Warp3D (Amiga PPC/RTG) | evidence (decoded; no capture yet) |

Each production directory holds `prod.json` (provenance: demozoo/pouet ids,
original archive URLs + SHA-256, reference-capture manifest), `work/`
(reverse-engineering notes, unpackers, generators, verification harnesses) and
`web/` (the deployable site).

## Layout

```
productions/<slug>/   prod.json + work/ + web/   one directory per production
shared/               runtime libraries shared across restorations
tools/                build & verification toolchain; tools/fetch/ = provenance automation
scripts/              build-*.sh, publish-pages.sh
originals/            release archives — gitignored, rehydrated from prod.json manifests
dist/                 assembled sites — gitignored, fully regenerable
```

## Rehydrating a fresh clone

```sh
npm install                                # toolchain (esbuild, puppeteer-core, canvas)
node tools/fetch/originals.mjs --all       # original archives from scene.org, sha256-verified
node tools/fetch/capture.mjs <slug>        # YouTube reference capture (yt-dlp), if needed
./scripts/build-wonder.sh                  # each build script gates on its own verification
```

Starting a new restoration:

```sh
node tools/fetch/scaffold.mjs <demozoo-id> --slug <slug>
```

## Verifying a port

Two repo-level tools, both driven by one small per-production adapter
(`tools/inspect/ADAPTER.md`), so adding a production means implementing that
contract and nothing else.

```sh
node tools/serve.mjs <production>          # watch it
node tools/inspect/sweep.mjs <production>  # score the whole timeline, raise issues
node tools/inspect/serve.mjs <production>  # scrub it beside the reference
node tools/inspect/issues.mjs <production> # dry run: what would go to GitHub Issues
```

**sweep** walks the timeline against the reference capture, scores every
sample on correlation *and* RMSE — "is this the same picture" and "is it the
same brightness" answer different questions and disagree usefully — and writes
`work/verify/inspect/{run.json,issues.md,worst.png}`. Findings are thresholded
and grouped per part rather than dumped as numbers.

**inspect/serve** opens the inspector: the port beside its reference, with what
is on screen (objects, triangles, textured groups, camera, GL errors) and the
geometry and images the part references. Its timeline is drawn from the
sweep's `run.json`, so clicking a bad sample drives the live demo to it.

**Notes.** The inspector's comment box turns "this looks wrong" into something
actionable. You only say WHAT is wrong; the tool attaches WHERE from the frame
in front of you — part, local and show time, the scores there, the renderer's
own report of the frame, the resources that part uses, and **both frames saved
to disk**, ours and the reference. Notes land in
`work/verify/inspect/notes.json`, which is a machine-readable queue an agent
can read directly, and optionally as a comment on that part's GitHub issue
(or a new one labelled `observed`). Everything filed — sweep issues and notes
alike — is **plotted on the timeline**: issues span their part, notes pin at
their instant, closed ones dim rather than vanish.

**inspect/issues** syncs findings to GitHub Issues, and is **dry run by
default** — a sweep re-runs on every change, a tracker is public and
permanent. Each issue carries a `sweep-key` in its body, so re-running
updates or closes in place instead of duplicating, and an issue without that
key (i.e. one a human opened) is never touched. Filed issues carry
`sweep`, `prod:<name>` and `sev:*` labels.

## What is deliberately not in this repository

- **Original release archives** (`originals/`) — copyrighted works; manifests
  with URLs and hashes are committed instead.
- **Reference captures** (`work/reference/`) — recorded for verification, not
  distributed; `prod.json` pins their identity and audio-alignment offsets.
- **Ghidra project databases** — they embed the analyzed original binaries.
  The recovered knowledge lives in `work/re/` as text.
- **Verification output and baked intermediates** — regenerable by the
  committed harnesses and generators.

## Credits

All original code, design, music and artwork remain the work — and the
credit — of their original authors and groups. See each production's
`prod.json` and the credits sections of METHOD.md.

Restoration by coat / solar, with Claude (Anthropic).
