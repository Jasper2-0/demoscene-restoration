# demoscene-restoration

Reverse-engineered browser reconstructions of classic demoscene productions —
Dutch demoscene immaterial heritage work. Each restoration recovers *how the
original works* from the shipped binary, documents that knowledge durably, and
re-implements it in plain JavaScript + WebGL2 so it runs from static files with
no plugins, no WebAssembly blobs, and no runtime dependencies.

The pipeline, the tooling lessons, and the reverse-engineering findings are in
**[METHOD.md](METHOD.md)** — start there.

## Productions

| production | group | year | original API | status |
|---|---|---|---|---|
| [please the cookie thing](productions/ptct/) | Aardbei | 2000 | OpenGL 1.1 | [published](https://jasper2-0.github.io/ptct-webgl/) |
| [lost vegas](productions/lost-vegas/) | threestate | 2000 | Direct3D 7 | [published](https://jasper2-0.github.io/lost-vegas-webgl/) |
| [sonnet](productions/sonnet/) | threestate | 2001 | Direct3D 8 | engineering (readable + 64k builds) |
| [wonder](productions/wonder/) | Sunflower | 1999 | software/DOS | engineering |
| [energia](productions/energia/) | Sunflower | 2001 | OpenGL FF | engineering |
| [tesla](productions/tesla/) | Sunflower | 2000 | — | evidence (source-lineage study) |

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
