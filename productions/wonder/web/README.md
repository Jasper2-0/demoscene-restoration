# Wonder — browser restoration

Work-in-progress JavaScript/WebGL2 reconstruction of **Wonder by Sunflower**
(Gravity 1999). The current build plays the original XM, uses its recovered
order-to-seconds clock, parses all 19 original EXP/KEXP scenes, and runs the
compiled 22-entry show schedule. Every scheduled class now has an
executable-derived implementation, including the generated spline surfaces,
immediate-mode overlays, exact scene/camera clocks, ENV-driven pulses,
constructor material changes, texture scrolls, fades, and overlap order. The
late credits/clock, faceted, procedural design tunnel, bump/end, and energy
sequences no longer use clip-normalized EXP scaffolds. It is an engineering
build awaiting visual difference review, not yet a signed-off faithful
release.

## Run and inspect

Serve the repository with any static HTTP server and open `web-wonder/`. There
is no build step or runtime dependency. Browser autoplay policy requires the
**Start with sound** button.

- `?t=10&debug` renders a deterministic show-time frame and lists active clips.
- `?t=60&debug` exercises several overlapping recovered scene layers.
- `timeline.html` opens an XM-order visual inspector with the live WebGL frame,
  compiled effect lanes, active render-layer details, and direct/transitive
  asset links for each element.
- Shared modules are vendored under `js/shared/`; edit the canonical copies in
  `shared/sunflower/js/` and run `node tools/sync-sunflower-runtime.mjs`.

## Restoration method and provenance

The release files are preserved under `work-wonder/src/`. `WON.DER` is unpacked
repeatably rather than modified, and every deployed asset is verified by exact
path, size, and SHA-256 against that extraction. Runtime behavior is recovered
from `wONDEr.exe`, external EXP/KEXP and ENV data, and the original XM. The
reference-video audio is aligned to show time; only low-resolution diagnostic
boundary sheets are retained under `work-wonder/reference/`.

Format and sequencing evidence is documented in `work-wonder/re/FORMATS.md`
and `work-wonder/re/TIMELINE.md`. The common parser, MiniGL compatibility layer,
clocks, texture decoders, and tests live under `shared/sunflower/`.

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
