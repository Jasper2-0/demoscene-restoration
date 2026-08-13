# tools/harness — the shared verification harness

One static server, one Chrome launcher, one set of measurement rules, for
every restoration's verification scripts.

```sh
node tools/harness/selftest.mjs     # proves the harness itself works
```

## Why

Before this, ~47 harness files each stood up their own `http.createServer`
with their own MIME table and root computation, and ~49 hardcoded
`/Applications/Google Chrome.app/...`, which made the whole suite
machine-specific. The monorepo migration had to hand-patch the root in every
one of them — the clearest possible evidence they should have been a module.

## Use

```js
import { withPage, warmUp, shootCanvas, assertClean }
  from '../../../tools/harness/index.mjs';

await withPage({ root: 'productions/lapsus/web', path: '/index.html', query: '?t=12' },
  async ({ page, server, errors, failedRequests }) => {
    await warmUp(page, { readyExpr: 'window.__ready === true' });
    assertClean({ errors, failedRequests }, server);   // throws with ALL problems
    const png = await shootCanvas(page);
  });
```

`withPage` serves the root, opens the page, and tears down the browser and
the socket even when the body throws. Paths are resolved against the repo
root by `fromRepo()`, so no script computes `../../..` again.

## What it adds that the hand-rolled harnesses did not have

**Case-exact serving.** macOS filesystems are case-insensitive, so a page
asking for `Textures/Foo.PNG` when the file is `textures/foo.png` works
locally and 404s on GitHub Pages. The server refuses the wrong case and
records it in `server.caseErrors`, so that class of bug fails on the machine
where it is cheap to fix. Pass `caseExact: false` to opt out deliberately.

**A traversal guard.** `path.join(root, url)` with `..` in the URL escapes the
root; every hand-rolled server had this.

**Request accounting.** `server.requests`, `server.missing`, `server.caseErrors`
— so a harness can assert no 404s happened instead of quietly rendering a
scene with missing textures.

**Chrome discovery.** Explicit option → `$CHROME_PATH` →
`$PUPPETEER_EXECUTABLE_PATH` → the usual per-platform locations, with an error
that says how to fix it. `--use-angle=metal` stays the macOS default because
that is what the restorations were measured against.

## measure.mjs — METHOD.md §8, encoded

These are functions rather than advice because advice is what got ignored.
Every one exists because a harness that skipped it produced a confidently
wrong number.

| function | the rule it enforces |
|---|---|
| `timeGL(page, body)` | `gl.finish()` on **both** sides; checks `getError()` and proves the frame drew **in the same task**; refuses to return a number otherwise |
| `warmUp(page, {readyExpr})` | render warm-up frames before photographing, so cold-start hitches do not break the fades you are trying to catch |
| `sampleAgainstAudioClock(page, times, {audioTimeExpr, valueExpr})` | sample audio-locked behaviour against the **audio clock**, never `requestAnimationFrame` — a throttled headless window once invented a 77 % sync error |
| `shootCanvas(page)` | screenshot the canvas itself, after warm-up |
| `assertClean(page, server)` | fail on page errors, failed requests, 404s and case mismatches — reporting **all** of them, not the first |

`timeGL` throwing is the point: a timing that cannot prove it drew a frame is
not a slower number, it is not a number at all.

## Migration

New harnesses should start here. Existing ones can move over file by file —
the shapes they need are `serve(root)`, `launch()`, and `withPage()`, and the
per-production part then becomes "pick a root, drive a page, assert".

Note the two existing server roots differ by design: the sonnet harnesses
serve a *production* root (`productions/sonnet/`, so pages are at `/web/...`
and data at `/work/...`) while the mashi ones serve a *dist* tree. `serve()`
takes a root rather than assuming one precisely so both keep working.
