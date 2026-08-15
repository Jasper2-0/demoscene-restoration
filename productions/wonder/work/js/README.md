# wonder/work/js

Recovered models that are **not** part of the shipped site.

- `order-timeline.js` — the XM order/pattern timeline recovered from the
  executable, including the terminal `F00` behaviour described in
  `work/reference/README.md` (one `F00`, order 21/pattern 13/row 63/channel 3,
  expanding the terminal row to 256 ticks so the order is held when the original
  exits at 186.5s).
- `inspector-data.js` — per-clip RE metadata (`WONDER_EFFECT_METADATA`).

Both lived under `web/js/` while the bespoke timeline inspector consumed them.
That inspector was deleted once the repo-wide tooling covered it
(`tools/inspect`, `?inspect=1`), leaving these reachable from no entry point —
which `tools/verify-wonder-dist.mjs` correctly flagged as dead weight in the
dist. They are kept because they are RE findings under test
(`shared/sunflower/test/wonder-order-inspector.test.mjs`), and moved here
because `work/` is where recovered knowledge lives and `web/` is the deployable
site.
