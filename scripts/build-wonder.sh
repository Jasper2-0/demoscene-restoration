#!/usr/bin/env bash
# Assemble a deployable static site for the Wonder restoration into
# dist/wonder-webgl.
#
#   ./build-wonder.sh
#
# Then serve it from anywhere:
#
#   (cd dist/wonder-webgl && python3 -m http.server 8080)
#
# WHY THIS BUILD IS A COPY AND NOT A TRANSFORM.  Unlike build-sonnet.sh, which
# has to reproduce an out-of-tree module layout and rewrite index.html, the
# Wonder runtime is already self-contained: every import specifier is relative
# and stays inside web-wonder/, there are no dynamic imports and no bare
# specifiers, and index.html is already at the root of that directory.  So the
# job here is subtraction (authoring-only files) plus deploy furniture, and the
# interesting work is VERIFICATION, not assembly.
#
# NOTHING IS MINIFIED OR BUNDLED.  The deployed code is the code under review,
# character for character — which is the whole point of a restoration whose
# claim is "this is what the executable does".  A bundler would fork the two.
#
# THREE THINGS ARE CHECKED, AND ANY OF THEM STOPS THE BUILD:
#   1. the 78 runtime assets still match the preserved WON.DER extraction,
#   2. the vendored js/shared/ modules have not drifted from shared/sunflower/,
#   3. the assembled tree re-hashes clean and every module resolves (see
#      tools/verify-wonder-dist.mjs).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="$PWD/productions/wonder/web"
OUT="$PWD/dist/wonder-webgl"
[ -f "$SRC/index.html" ] || { echo "error: no wonder web tree at $SRC" >&2; exit 1; }

# ---- guard 1: assets vs. the preserved extraction.
# The tool covers Wonder AND Energia and fails as a unit, so its exit code is
# the wrong thing to test — an unrelated Energia problem would block a Wonder
# build. Wonder is processed first and the tool throws on failure, so the
# presence of Wonder's own line is the precise signal.
echo "checking runtime assets against productions/wonder/work/unpacked/won_der ..."
ASSETS=$(node tools/check-sunflower-assets.mjs 2>&1 || true)
grep -q '^Wonder: .* case-exact assets verified$' <<< "$ASSETS" || {
  echo "error: Wonder assets do not match the preserved extraction" >&2
  echo "$ASSETS" >&2
  exit 1
}
echo "  $(grep '^Wonder:' <<< "$ASSETS")"

# ---- guard 2: vendored shared runtime.
# Same scoping problem, same reasoning: --check reports one repo-relative line
# per drifted file across every vendoring site, so filter to this one. Shipping
# a stale js/shared/ would deploy code that no test in shared/sunflower/ ran
# against.
echo "checking vendored js/shared against shared/sunflower/js ..."
DRIFT=$(node tools/sync-shared-runtime.mjs --check 2>&1 | grep '^\(drifted\|missing\): productions/wonder/web/' || true)
[ -z "$DRIFT" ] || {
  echo "error: vendored shared runtime is stale — run: node tools/sync-shared-runtime.mjs" >&2
  echo "$DRIFT" >&2
  exit 1
}
echo "  in sync"

# ---- assemble.
# test/ is a harness directory and .python-version pins a local toolchain;
# neither is runtime, and both misdescribe the artifact if shipped. README.md is
# excluded because it is rewritten below: the working-tree copy tells the reader
# to serve the repository and points at productions/wonder/work/, paths that do
# not exist in a published site.
rm -rf "$OUT"
mkdir -p "$OUT"
rsync -a \
  --exclude '.DS_Store' \
  --exclude 'test/' \
  --exclude '.python-version' \
  --exclude 'README.md' \
  "$SRC"/ "$OUT"/

# GitHub Pages runs the tree through Jekyll otherwise, which mangles paths
# beginning with _ and reinterprets .md.
touch "$OUT/.nojekyll"
printf '.DS_Store\n' > "$OUT/.gitignore"

# A favicon, so the only request the site cannot answer stops being a 404. Not
# cosmetic: an unexplained 404 in the console is exactly the noise that makes a
# real missing asset easy to miss when someone debugs a deploy.
# 1x1 transparent PNG, inline so the build has no binary fixture to carry.
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' \
  | base64 --decode > "$OUT/favicon.png"
cp "$OUT/favicon.png" "$OUT/favicon.ico"

cp "$SRC/LICENSE" "$OUT/LICENSE"

# METHOD.md deliberately does NOT travel with this one: it documents the two
# earlier restorations and says nothing about Wonder or Sunflower.
cat > "$OUT/README.md" <<'MD'
# wonder — Sunflower (Gravity 1999)

A from-scratch JavaScript/WebGL2 reconstruction of *Wonder* by Sunflower.

It plays the original XM, drives the show from the recovered order-to-seconds
clock, parses all 19 original EXP/KEXP scenes, and runs the compiled 22-entry
schedule. Every scheduled class has an executable-derived implementation —
generated spline surfaces, immediate-mode overlays, exact scene/camera clocks,
ENV-driven pulses, constructor material changes, texture scrolls, fades and
overlap order.

**This is an engineering build, not a signed-off faithful release.** It is
awaiting visual difference review against the reference capture.

Browser autoplay policy requires the **Start with sound** button.

## URL parameters

| parameter | effect |
|---|---|
| `?t=10` | render one deterministic frame at that show time |
| `?debug` | list the clips active at the current time |
| `?only=name[,name]` | render only the named effects |
| `?design-parts=` / `?design-passes=` | isolate design-tunnel parts or passes |
| `?embedded` | hide the status line and inspector link |

`timeline.html` opens an XM-order inspector: the live WebGL frame against
compiled effect lanes, active render-layer detail, and direct plus transitive
asset links for every element.

**Requires WebGL2.**

## Provenance

Every asset in `assets/` is byte-identical to the corresponding file in the
repeatable `WON.DER` extraction, verified by exact path, size and SHA-256 at
build time and re-verified against `assets-manifest.json` after assembly. The
original executable is unpacked, never modified. Runtime behavior is recovered
from `wONDEr.exe`, the external EXP/KEXP and ENV data, and the original XM.

## Original credits

The release credits Evilreal/Unreal (Wojtek Podgorski), Visualize (Timo Harju),
Virgill (Jochen Feldkoetter), and Yoghurt (Konrad Zagorowicz), with Camel,
Technomancer, and Voomie. It also credits Brett Paterson's FSOUND. These names
describe the original production; this reconstruction does not claim their
endorsement.

## Licensing

`LICENSE` covers reconstruction source only. The original executable, artwork,
design, text, and music remain the property of Sunflower and their credited
authors and are not relicensed. The vendored XM player retains its own
BSD-3-Clause notice.
MD

# ---- guard 3: verify what actually shipped, not what was meant to.
node tools/verify-wonder-dist.mjs "$OUT"

BYTES=$(du -sk "$OUT" | cut -f1)
echo
echo "built  $OUT  (${BYTES} KB, $(find "$OUT" -type f | wc -l | tr -d ' ') files)"
echo
find "$OUT" -maxdepth 1 -mindepth 1 | sed "s#^$OUT/##" | sort | awk '{print "  " $0}'
echo
echo "serve:  (cd $OUT && python3 -m http.server 8080)"
