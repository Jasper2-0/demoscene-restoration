# Working on this repo from Claude Code on the web

Measured on a cloud session (Ubuntu 24.04, 4 vCPU, 15 GB RAM, ~30 GB writable
disk, Node 22.22.2, JDK 21). The container is ephemeral: it starts from a fresh
clone and is reclaimed after idle, so everything below has to be re-done per
session, and anything worth keeping has to be pushed.

The short version: **the port side of this project works here; the provenance
side does not.** Code, builds, deterministic frame capture, WebGL2 rendering,
scoring and Ghidra all run. Anything that has to *download the source material*
is blocked by network policy, and since `originals/` and `work/reference/` are
deliberately uncommitted, the sweep-against-reference loop cannot close.

## What works, verified

| capability | state |
|---|---|
| `npm install` | 66 packages, clean; `canvas` native addon loads |
| `./scripts/build-wonder.sh` | passes all three guards, 124 files / 7.0 MB into `dist/wonder-webgl` (needs `rsync`, see below) |
| WebGL2 render of the built site | correct — textured, GLSL ES 3.00, `MAX_TEXTURE_SIZE` 8192, zero page errors, zero failed requests |
| `window.__demo` adapter contract | `plan()` → 195 samples across 22 parts at step 2s; `render()` seeks and draws deterministically, `glError` 0 on every sample tried |
| Ghidra headless | 11.3.2 installs and analyses (`analyzeHeadless`, ~15 s on a small ELF) |
| `tools/sync-shared-runtime.mjs --check` | reproduces issue #35 exactly — 5 drifted Energia files |
| `tools/check-sunflower-assets.mjs` | Wonder: 78 case-exact assets verified |
| GitHub issues | full read/write via the MCP tools (see the `gh` caveat below) |
| git fetch / push | fine, over the session's git proxy |

Rendering is **software** (ANGLE → SwiftShader → Vulkan); there is no GPU. That
costs wall-clock, not correctness, because the sweep drives a static clock
rather than real time:

- free-running animation is ~3 fps — do not trust anything timing-dependent
  that reads the wall clock;
- the sweep's actual inner loop (`__demo.render()` + in-page `toDataURL`) is
  **~1.5 s per sample**, so a full 195-sample Wonder sweep is **~5 minutes**.
  That is a perfectly workable budget.
- `page.screenshot()` is ~2 s per call, so prefer the in-page readback the
  sweep already uses.

METHOD.md §8's warning applies with force: a backend disagreement is a
hypothesis, not a verdict. SwiftShader is a *third* backend next to Metal and
the desktop GL driver, so a rendering difference seen only here needs
confirming on real hardware before it is treated as a port bug.

## Session setup

Two binaries the toolchain shells out to are missing from the base image, and
the apt index ships stale (a bare `apt-get install` 404s on a superseded
version — update first):

```sh
apt-get update -qq
apt-get install -y rsync ffmpeg     # rsync: build-wonder.sh, publish-pages.sh
                                    # ffprobe: tools/inspect/sweep.mjs
```

Chromium ships pre-installed but not where `tools/harness/browser.mjs` looks,
and it needs the container flags:

```sh
export CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
# and pass, via extraArgs:
#   --no-sandbox --disable-dev-shm-usage
#   --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
```

Without `--enable-unsafe-swiftshader` it still works, but Chrome takes the
deprecated automatic-fallback path and says so on every context.

The repo's `pre-commit` guard — the one that keeps `MZ` headers and >10 MB
blobs out of a public history — is **not active in a fresh clone**:
`core.hooksPath` is unset and `.git/hooks` holds only samples. On a machine
where original binaries could exist this is the single most important line of
setup:

```sh
git config core.hooksPath scripts/hooks
```

Ghidra, if a session actually needs it (~446 MB download, ~2 GB unpacked):

```sh
curl -L -o /tmp/g.zip https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_11.3.2_build/ghidra_11.3.2_PUBLIC_20250415.zip
(cd /opt && unzip -q /tmp/g.zip && rm /tmp/g.zip)
```

## What is blocked, and why it matters

Outbound HTTPS is allowlisted. `api.github.com`, `github.com` (including
release downloads), `registry.npmjs.org` and `pypi.org` pass. Everything this
project's provenance automation needs does not:

```
files.scene.org   403 CONNECT      demozoo.org       403 CONNECT
www.pouet.net     403 CONNECT      www.youtube.com   403 CONNECT
jasper2-0.github.io  403 CONNECT   (own published sites, not reachable)
```

Consequences, in order of how much they hurt:

1. **`node tools/fetch/originals.mjs` cannot run.** `originals/` stays empty.
   Anything gated on the release archives is out — including
   `check-sunflower-assets.mjs` for Energia, which correctly reports
   `SKIPPED — missing .../RinneRadio-Helsinki_[Crankshaft.mix].mp3`.
   Wonder builds only because its extraction under `work/unpacked/` is
   committed; Energia's audio is not.
2. **`node tools/fetch/capture.mjs` cannot run.** No `work/reference/*.mkv`,
   so `sweep.mjs` stops immediately (`no capture at .../wonder_ref.mkv`) and
   `issues.mjs` has no `run.json` to sync. **The scoring half of verification
   is unavailable**: frames can be rendered and eyeballed, but not correlated
   or RMSE'd against the original. This is the real ceiling on what a cloud
   session can conclude about a port. (`yt-dlp` itself installs fine from
   pypi — it is YouTube that is unreachable, so installing it changes
   nothing.)
3. **`tools/inspect/issues.mjs` cannot run as written.** It shells out to the
   `gh` CLI, which is absent here; issue read/write is available, but only
   through the GitHub MCP tools. Syncing sweep findings from a cloud session
   would mean an API path in that script, not a `gh` path — and it is moot
   until (2) is solved anyway.
4. **New restorations cannot be scaffolded.** `tools/fetch/scaffold.mjs` needs
   demozoo.

If a session needs to work against reference material, the material has to
arrive some other way — committed to a scratch branch, or fetched before the
session by whatever creates the environment.

## Two findings from the shakedown

**`npm run test:shared` was broken on Node 22.22.2** — fixed in this commit.
`node --test <dir>` no longer walks the directory on this Node; it resolves the
path as a module and dies with `MODULE_NOT_FOUND` before running anything. It
reproduces on a two-line throwaway directory, so it is the Node build, not the
test files. The glob form works on every version.

**One shared-runtime test genuinely fails**, unrelated to the environment and
present on `main`: `recovered master schedules retain compiled intervals and
overlaps`, at `shared/sunflower/test/runtime.test.mjs:817` —

```js
assert.deepEqual(energia.active(0), []);
```

`active(0)` returns four clips, not none. They are the ones the Energia
schedule starts *at* zero with `inclusiveStart: true` — `early_renderer_411e10_410470`,
`opening_logo_412750` and two others. So either the assertion predates those
clips being compiled in, or the recovered schedule should not have them open at
t=0. That is a question about what `Energia_FIXED.exe` does at its first frame,
and it wants the binary and someone's judgement — not a test edit. Left alone,
noted here. Everything else passes: 62 of 63.
