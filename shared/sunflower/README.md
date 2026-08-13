# Shared Sunflower browser runtime

Canonical browser-side modules shared by the Wonder and Energia restorations.
The two deployable sites remain self-contained: `tools/sync-sunflower-runtime.mjs`
copies the files listed in its manifest into each site's `js/shared/` directory,
and `--check` verifies that those generated copies have not drifted.

`minigl.js` and `mathlib.js` descend from the completed PTCT restoration.
`xm.js` is the existing FT2-compatible replayer and retains its BSD-3-Clause
notice. Demo assets are not covered by the reconstruction source licence.

Verification from the repository root:

```sh
node --test shared/sunflower/test/runtime.test.mjs
node tools/check-sunflower-assets.mjs
node tools/sync-sunflower-runtime.mjs --check
node shared/sunflower/test/sites-smoke.mjs
```

The browser suite seeks representative frames, deterministically sweeps every
second and clip boundary/midpoint in both ports, starts both audio clocks,
exercises the fixed-function compatibility pixels, and performs a PTCT debug
seek as a regression check for the MiniGL baseline.
