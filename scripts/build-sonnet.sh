#!/usr/bin/env bash
# Assemble a deployable static site for the Sonnet restoration into
# dist/sonnet-webgl.
#
#   ./build-sonnet.sh
#
# Then serve it from anywhere:
#
#   (cd dist/sonnet-webgl && python3 -m http.server 8080)
#
# ...or publish it: ./publish-pages.sh sonnet <path-to-repo-checkout>
#
# WHY THE TREE LOOKS LIKE THIS.  The runtime is plain ES modules with no
# bundler, and its imports reach OUT of web/ into the generator libraries
# (`../../work/js/`) and the audio port (`../../work/audio/`).  Rather than
# rewrite those specifiers — which would fork the deployed code from the code
# under test — the dist reproduces the working tree's relative layout and puts
# index.html at the root, which is what GitHub Pages serves.  `main.js` derives
# its data roots from `import.meta.url`, so the page works at any depth.
#
# NOTHING IS MINIFIED OR BUNDLED.  This is the readable build; the 64k
# packaging exercise is a separate target (see METHOD.md).  Everything the
# browser needs is generated at runtime from `unpacked/sonnet_img.bin` — the
# textures, the meshes, the font atlas and the music are all computed, not
# shipped.  That is the point of the production and it is why the site is
# ~600 KB rather than ~20 MB.
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="$PWD/productions/sonnet"
OUT="$PWD/dist/sonnet-webgl"
[ -f "$SRC/web/index.html" ] || { echo "error: no sonnet production tree at $SRC" >&2; exit 1; }

rm -rf "$OUT"
mkdir -p "$OUT/web/js" "$OUT/web/assets" "$OUT/work/js" "$OUT/work/audio" \
         "$OUT/work/unpacked" "$OUT/work/re/text" "$OUT/work/baked/tex" "$OUT/work/baked/tex_2x" "$OUT/work/extracted"

# ---- runtime modules.  The list is DERIVED by walking the import graph from
#      web/js/main.js, not globbed: `js/*.mjs` also holds bake and test
#      tooling (bake_tex, meshgen_test, kernel_scaling_test, …) that the browser
#      never loads, and shipping it makes the dist impossible to read as a
#      statement of what the runtime is.
MODULES=$(cd "$SRC" && node web/test/modulegraph.mjs)
[ -n "$MODULES" ] || { echo "error: module graph came back empty" >&2; exit 1; }
while IFS= read -r m; do
  mkdir -p "$OUT/$(dirname "$m")"
  cp "$SRC/$m" "$OUT/$m"
done <<< "$MODULES"
echo "  $(printf '%s\n' "$MODULES" | wc -l | tr -d ' ') runtime modules"

# ---- `.mjs` -> `.js`.  NOT cosmetic: many web servers have no `.mjs` MIME
#      entry and send those files with no Content-Type at all, and the HTML spec
#      requires a JavaScript MIME type for module scripts, so the browser
#      refuses to execute them.  The page then renders its static markup and
#      does nothing.  Renaming depends on nothing server-side; an `.htaccess`
#      would only work on Apache.  The working tree keeps `.mjs` for Node.
node "$SRC/web/test/flatten_mjs.mjs" "$OUT"

# ---- data the runtime fetches
cp "$SRC"/web/assets/timeline.json          "$OUT"/web/assets/
cp "$SRC"/work/unpacked/sonnet_img.bin      "$OUT"/work/unpacked/
cp "$SRC"/work/re/text/poem.json            "$OUT"/work/re/text/

# ---- optional assets, for the `?assets=baked` escape hatch.  Not needed by the
#      default (generated) path; shipped so that flag is not half-broken.
cp "$SRC"/work/baked/tex/11.png    "$OUT"/work/baked/tex/    2>/dev/null || true
cp "$SRC"/work/baked/tex_2x/11.png "$OUT"/work/baked/tex_2x/ 2>/dev/null || true
cp "$SRC"/work/extracted/sonnet.xm "$SRC"/work/extracted/sonnet_partypan.xm "$OUT"/work/extracted/ 2>/dev/null || true

# ---- the page.  index.html moves from web/ to the site root, so the two
#      paths it names have to gain the web/ prefix.  Everything else in
#      it is already relative to the module, not to the page.
sed -e 's#"./js/node_fs.js"#"./web/js/node_fs.js"#' \
    -e 's#src="js/main.js"#src="web/js/main.js"#' \
    "$SRC/web/index.html" > "$OUT/index.html"

# Assert the rewrite actually happened — a silently unmatched sed would ship a
# page that 404s its own entry point, and the failure would only show in a
# browser.
grep -q 'src="web/js/main.js"' "$OUT/index.html" \
  || { echo "error: index.html script rewrite did not apply" >&2; exit 1; }
grep -q '"./web/js/node_fs.js"' "$OUT/index.html" \
  || { echo "error: index.html importmap rewrite did not apply" >&2; exit 1; }

# A favicon, so the only request the site cannot answer stops being a 404. It
# is not cosmetic: an unexplained 404 in the console is exactly the noise that
# makes a real missing asset easy to miss when someone debugs a deploy.
# 1x1 transparent PNG, inline so the build has no binary fixture to carry.
printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' \
  | base64 --decode > "$OUT/favicon.png"
cp "$OUT/favicon.png" "$OUT/favicon.ico"

# GitHub Pages runs the tree through Jekyll otherwise, which mangles paths
# beginning with _ and reinterprets .md.
touch "$OUT/.nojekyll"
printf '.DS_Store\n' > "$OUT/.gitignore"

cat > "$OUT/README.md" <<'MD'
# sonnet — threestate (Assembly 2001, 64k intro)

A from-scratch JavaScript/WebGL2 restoration of *sonnet* by threestate, which
won the Assembly 2001 combined 64k intro competition.

Everything is **generated at runtime from the original binary's own data**:
the textures come from the intro's texture-generator bytecode, the meshes from
its parametric generators, the font atlas is rasterised in the browser, and the
music is rebuilt from four compressed streams embedded in the executable. No
texture, mesh or audio asset is shipped.

Click to start. Then:

| key | action |
|---|---|
| `1`–`9`, `0` | jump to a scene |
| `[` `]` | ±1 order |
| `,` `.` | ±8 rows |

Useful URL parameters:

| parameter | effect |
|---|---|
| `?start=beach` or `?start=0x1200` | boot straight into a scene |
| `?quality=original` | reproduce the 2001 build, bugs included |
| `?texscale=4` | higher-resolution generated textures |
| `?fontscale=4` | higher-resolution font atlas |
| `?render=N` | pin the render scale (default 2) |
| `?lighting=legacy` | disable the shadow bake + D3D-correct normals |
| `?audio=party` | the original's stereo-panning bug |
| `?assets=baked` | download prebaked assets instead of generating |

**Requires WebGL2 and a user gesture to start audio.** If the screen stays
black, open the console — uncaught errors and WebGL context loss are painted
on screen with escape-hatch URLs.
MD

BYTES=$(du -sk "$OUT" | cut -f1)
echo "built  $OUT  (${BYTES} KB)"
echo
find "$OUT" -type f | sed "s#^$OUT/##" | sort | awk '{print "  " $0}' | head -50
echo
echo "serve:    (cd $OUT && python3 -m http.server 8080)"
echo "publish:  ./publish-pages.sh sonnet <path-to-repo-checkout>"
