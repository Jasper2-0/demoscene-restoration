# originals/

Pristine release archives, organized by group. **Nothing in this directory is
committed except this file**: the archives are copyrighted works and this is a
public repository, so they are rehydrated instead of distributed.

```sh
node tools/fetch/originals.mjs --all     # fetch + sha256-verify every archive
node tools/fetch/originals.mjs <slug>    # one production
```

Every archive's URL(s) and pinned SHA-256 live in
`productions/<slug>/prod.json` under `originals[]`. A fetched file that does
not hash to the pinned value is deleted, not kept — a wrong artifact never
sits at a recorded path.

Groups without a production directory yet (haujobb, alien prophets,
maturefurk) are local working material for the ixalance line of work; their
manifests arrive with the ixalance-js import.
