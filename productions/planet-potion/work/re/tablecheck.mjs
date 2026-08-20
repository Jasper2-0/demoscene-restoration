// tablecheck.mjs — is the JS table build byte-identical to the harness's?
//
//   node work/re/tablecheck.mjs
//
// The four lookup tables are a dependency of the geometry transforms and the
// whole softsynth, so a drift of one ulp here would surface much later as a
// mysterious audio or rotation difference. Compare digests, not eyeballs.
import { createHash } from 'node:crypto';
import { buildAll, toBigEndianBytes } from '../../web/js/tables.js';

// From `python3 -c "import ppcrun; ppcrun.build_tables(d0)"` — the harness build,
// which is itself checked by running the intro's own code against it.
const REFERENCE = {
  sinus: ['bbeafe622e721108', 40960],
  atan:  ['a0679873f150f462', 4096],
  power: ['f9cccd1fa0f2f7bc', 400000],
  mexp:  ['d9c026495c8390f1', 60000],
};

let bad = 0;
for (const [name, arr] of Object.entries(buildAll())) {
  const bytes = toBigEndianBytes(arr);
  const got = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  const [want, wantLen] = REFERENCE[name];
  const ok = got === want && bytes.length === wantLen;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(6)} ${String(bytes.length).padStart(7)} bytes  ${got}`
    + (ok ? '' : `   expected ${want} / ${wantLen}`));
}
console.log(`\n${Object.keys(REFERENCE).length - bad}/${Object.keys(REFERENCE).length} tables byte-identical to the harness`);
process.exit(bad ? 1 : 0);
