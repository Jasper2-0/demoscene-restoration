#!/usr/bin/env bash
# Assemble a testable static site for the Lapsus restoration into
# dist/lapsus-webgl.
#
#   ./scripts/build-lapsus.sh              # assemble, verify, boot in Chrome
#   ./scripts/build-lapsus.sh --no-boot    # skip the browser gate
#
# Then serve it from anywhere:
#
#   (cd dist/lapsus-webgl && python3 -m http.server 8080)
#
# THIS IS A TESTING BUILD, NOT A PUBLISHABLE ONE.  Lapsus is at "engineering"
# status in README.md: it has no LICENSE in its source tree and no entry in
# publish-pages.sh, and prod.json still records status.web = "none".  What this
# target is for is running the assembled artifact — the thing a reviewer would
# actually download — instead of the working tree with its harnesses attached.
#
# WHY THE TREE LOOKS LIKE THIS.  The runtime is plain ES modules with no
# bundler, and its imports reach OUT of web/ into the generator libraries
# (`../../work/js/`), while `main.js` derives its data root from
# `import.meta.url` (`ROOT = ../../`, then `work/unpacked/lapsus_dat/data/`).
# Rather than rewrite those specifiers — which would fork the deployed code
# from the code every harness under work/verify/ measures — the dist
# reproduces the working tree's relative layout and puts index.html at the
# root, which is what a static host serves.  That is the same choice
# build-sonnet.sh made, for the same reason.
#
#   dist/lapsus-webgl/
#     index.html                     <- moved up from web/, its one path rewritten
#     prod.json                      <- RUNTIME data: the two tracks' capture offsets
#     web/js/{main.js,shared/}
#     work/js/*.mjs                  <- LWO/LWS/TGA/hair/particle readers
#     work/unpacked/lapsus_dat/      <- the preserved LAPSUS.DAT extraction
#     work/MANIFEST.sha256           <- so the dist can re-hash itself
#
# `.mjs` IS KEPT, unlike the sonnet build which renames it to `.js` because
# some servers send it with no Content-Type and the browser then refuses to
# execute a module script.  Both servers this tree is tested against —
# tools/harness/server.mjs and python3 -m http.server — map .mjs to
# text/javascript, and for a testing artifact "not one byte of the runtime was
# rewritten" is worth more than portability to a server nobody here uses.
#
# NOTHING IS MINIFIED OR BUNDLED.  The deployed code is the code under review,
# character for character — the whole point of a restoration whose claim is
# "this is what the executable does".
#
# THREE GATES, ANY OF WHICH STOPS THE BUILD:
#   1. the vendored js/shared/ modules have not drifted from shared/sunflower/,
#   2. the assembled tree re-hashes clean and every module resolves
#      (tools/verify-lapsus-dist.mjs),
#   3. it actually boots and draws in headless Chrome, with no 404 and no
#      case-mismatched fetch (tools/smoke-lapsus-dist.mjs).
set -euo pipefail
cd "$(dirname "$0")/.."

BOOT=1
[ "${1:-}" = "--no-boot" ] && BOOT=0

SRC="$PWD/productions/lapsus"
OUT="$PWD/dist/lapsus-webgl"
[ -f "$SRC/web/index.html" ] || { echo "error: no lapsus web tree at $SRC/web" >&2; exit 1; }
[ -f "$SRC/work/MANIFEST.sha256" ] || { echo "error: no $SRC/work/MANIFEST.sha256" >&2; exit 1; }

# ---- gate 1: vendored shared runtime.
# --check reports one repo-relative line per drifted file across every
# vendoring site, so its exit code is the wrong thing to test — an unrelated
# Wonder problem would block a Lapsus build. Filter to this one. Shipping a
# stale js/shared/ would deploy code that no test in shared/sunflower/ ran
# against.
echo "checking vendored js/shared against shared/sunflower/js ..."
DRIFT=$(node tools/sync-shared-runtime.mjs --check 2>&1 | grep '^\(drifted\|missing\): productions/lapsus/web/' || true)
[ -z "$DRIFT" ] || {
  echo "error: vendored shared runtime is stale — run: node tools/sync-shared-runtime.mjs" >&2
  echo "$DRIFT" >&2
  exit 1
}
echo "  in sync"

# ---- assemble.
rm -rf "$OUT"
mkdir -p "$OUT/web" "$OUT/work"

# The runtime modules. work/js/ holds only the six readers main.js imports, so
# this is a copy rather than a derived list — and gate 2 fails on any module
# that ships without an entry point reaching it, which is what would catch a
# tooling module appearing there later.
rsync -a --exclude '.DS_Store' "$SRC"/web/js/ "$OUT"/web/js/
rsync -a --exclude '.DS_Store' --include '*.mjs' --exclude '*' "$SRC"/work/js/ "$OUT"/work/js/

# The preserved extraction, whole. NOT cherry-picked to "the files the demo
# fetches": the LWS -> LWO -> texture reference graph is resolved at RUNTIME
# through three different path conventions (archive-relative, LWO-relative and
# a bare-basename fallback into data/lwo/textures/), so a statically-derived
# subset would be a guess, and the way it fails is a missing texture rendering
# a quietly wrong frame. 15 MB is a cheap answer to that.
rsync -a --exclude '.DS_Store' "$SRC"/work/unpacked/ "$OUT"/work/unpacked/
cp "$SRC/work/MANIFEST.sha256" "$OUT/work/MANIFEST.sha256"

# prod.json is runtime data here, not provenance furniture: main.js reads
# captures[0].visualTrackOffsetsMs to put both MP3s on one show clock.
cp "$SRC/prod.json" "$OUT/prod.json"

# ---- the page. index.html moves from web/ to the site root, so the one path
# it names has to gain the web/ prefix. Everything else it contains is either
# inline or resolved by the module from import.meta.url.
sed -e 's#src="js/main.js"#src="web/js/main.js"#' "$SRC/web/index.html" > "$OUT/index.html"

# Assert the rewrite happened. A silently unmatched sed would ship a page that
# 404s its own entry point, and the failure would only show in a browser.
grep -q 'src="web/js/main.js"' "$OUT/index.html" \
  || { echo "error: index.html script rewrite did not apply" >&2; exit 1; }

# A favicon, so the only request the site cannot answer stops being a 404. Not
# cosmetic: an unexplained 404 in the console is exactly the noise that makes a
# real missing asset easy to miss when someone debugs a deploy.
# 1x1 transparent PNG, inline so the build has no binary fixture to carry.
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' \
  | base64 --decode > "$OUT/favicon.png"
cp "$OUT/favicon.png" "$OUT/favicon.ico"

# GitHub Pages runs the tree through Jekyll otherwise, which mangles paths
# beginning with _ and reinterprets .md.
touch "$OUT/.nojekyll"
printf '.DS_Store\n' > "$OUT/.gitignore"

cat > "$OUT/README.md" <<'MD'
# lapsus — Maturefurk (Assembly 2000)

A from-scratch JavaScript/WebGL2 reconstruction of *Lapsus* by Maturefurk.

It parses the original LWSC scenes and LWO2 meshes straight out of the
preserved `LAPSUS.DAT` extraction, reproduces the engine's transform, camera
and projection conventions, and drives the show from the original MP3s — the
demo's clock IS the music, because the engine resets its QPC reference
immediately after `FSOUND_PlaySound`.

**This is an engineering build, not a signed-off faithful release.** Several
effects are still approximations and the per-part fidelity scores are open;
`RandomFadeOut` in particular draws a plain black ramp rather than the
original's flicker. It is a testing artifact — treat differences from the
capture as expected, not as bugs to report.

Browser autoplay policy means the demo waits for a click before it starts.

## URL parameters

| parameter | effect |
|---|---|
| `?scene=hulluolli&t=4.8` | render one deterministic frame of one part, then stop |
| `?nofade=1` | with the above, skip the part's scheduled fade |
| `?fb=0` | render a feedback part as a single frame instead of an accumulation |
| `?cam=N` | force a camera index |
| `?onlyobj=` / `?skipobj=` | draw only, or skip, objects whose name matches |
| `?stats=1` | frame statistics |
| `?inspect=1` | install the shared tooling adapter (tools/inspect) |

The single-frame path is the one every verification harness uses, so a frame
rendered here and a frame rendered by `work/verify/frame.mjs` are the same
frame.

**Requires WebGL2.**

## Provenance

Everything under `work/unpacked/lapsus_dat/` is byte-identical to the
repeatable `LAPSUS.DAT` extraction, verified by exact path and SHA-256 against
`work/MANIFEST.sha256` at build time and re-verified after assembly. The
original executable is unpacked, never modified. Runtime behavior is recovered
from the executable, the LWSC/LWO data and the original MP3s.

## Original credits

The release credits Radix (music), Petri and Mikko (code), Timo (2d graphics),
and Juha, Eetu and Janne (3d graphics). Those names describe the original
production; this reconstruction does not claim their endorsement. The original
executable, artwork, design, text and music remain the property of Maturefurk
and their credited authors.
MD

# ---- gate 2: verify what actually shipped, not what was meant to.
node tools/verify-lapsus-dist.mjs "$OUT"

# ---- gate 3: boot it. Static checks cannot see a texture path assembled at
# runtime; only a real page load produces that request.
if [ "$BOOT" = 1 ]; then
  echo "booting $OUT in headless Chrome ..."
  node tools/smoke-lapsus-dist.mjs "$OUT"
else
  echo "skipped the browser gate (--no-boot)"
fi

BYTES=$(du -sk "$OUT" | cut -f1)
echo
echo "built  $OUT  (${BYTES} KB, $(find "$OUT" -type f | wc -l | tr -d ' ') files)"
echo
find "$OUT" -maxdepth 1 -mindepth 1 | sed "s#^$OUT/##" | sort | awk '{print "  " $0}'
echo
echo "serve:  (cd $OUT && python3 -m http.server 8080)"
echo
echo "note: no LICENSE ships — productions/lapsus/ has none yet, so this tree"
echo "      is for local testing, not publication."
