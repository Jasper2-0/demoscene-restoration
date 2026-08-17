// synthdiff.mjs — the ported softsynth, one primitive at a time.
//
//   node work/re/synthdiff.mjs flat/ out/synthref/ [--min N] [--only 0x10006f4c]
//
// `synthhash.py` pins each module whole and per chunk, which answers "is the
// softsynth done" and nothing else: one wrong frame in the first sample and
// every digest is wrong with no clue which of 32 primitives did it. This is the
// instrument that says which one. It is `texopdiff.mjs` for the synth, and
// per-opcode isolation is what got the texture VM to 30 of 30 byte-exact.
//
// HOW A PRIMITIVE IS ISOLATED WHEN IT CANNOT BE RUN ALONE. The routines share
// the module write cursor, and several share the reverb's state in seg0, so
// running sample 37 on its own is not defined. Instead the WHOLE script runs,
// and every routine that is not ported yet is FILLED FROM THE REFERENCE —
// synthref.py already sliced each sample out of the module the original built.
// So each ported routine executes in its true context against its own
// byte-exact target, the module always assembles for the digest check, and the
// number of filled samples is a progress figure that ends at zero.
//
// WHAT THAT DOES NOT COVER, stated because it will matter later: filling a
// sample reproduces its BYTES but not its side effects. A routine that leaves
// the reverb's delay lines full runs after a filled neighbour that left them
// empty, so a ported routine can fail for a reason that is not its own. It
// shows up as "was exact, now differs, and nothing about it changed" — check
// what the routine before it does before suspecting the routine itself.
//
// THE THRESHOLD IS A RATCHET. `--min` is the number of samples that must come
// out byte-exact; pass the current best so a change that breaks one fails.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// fileURLToPath, not `new URL().pathname`: this repository lives under a path
// with spaces in it, which the URL form percent-encodes into %20.
import { fileURLToPath } from 'node:url';
import { buildAll } from '../../web/js/tables.js';
import {
  SynthContext, SCRIPTS, HEADER_ROUTINE, PRIMITIVES, decodeScript,
} from '../../web/js/synth.js';

const ABSENT = 77;
const HERE = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const flag = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : def;
};
const WITH_VALUES = ['--min', '--only'];
const positional = argv.filter((a, i) => !a.startsWith('--') && !WITH_VALUES.includes(argv[i - 1]));
const flat = positional[0] ?? path.join(HERE, 'flat');
const refdir = positional[1] ?? path.join(HERE, 'out', 'synthref');
const minExact = Number(flag('--min', '0'));
const only = flag('--only', null);

const indexFile = path.join(refdir, 'index.json');
if (!fs.existsSync(indexFile)) {
  console.log(`synthdiff: ${indexFile} not here — python3 synthref.py ${flat} mods/ ${refdir}. Skipping.`);
  process.exit(ABSENT);
}
const seg0File = path.join(flat, 'seg0_CODE_10000000.bin');
const seg4File = path.join(flat, 'seg4_DATA_10040000.bin');
for (const f of [seg0File, seg4File]) {
  if (!fs.existsSync(f)) {
    console.log(`synthdiff: ${f} not here — see checkall.sh. Skipping.`);
    process.exit(ABSENT);
  }
}

const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
const seg0 = new Uint8Array(fs.readFileSync(seg0File));
const seg4 = new Uint8Array(fs.readFileSync(seg4File));
const tables = buildAll();
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

/** First differing byte, or -1. */
function firstDiff(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

let totalExact = 0, totalPorted = 0, totalSamples = 0;
const byRoutine = new Map();

for (const [part, spec] of Object.entries(index.parts)) {
  const script = decodeScript(seg0, SCRIPTS[part].lo, SCRIPTS[part].hi);
  if (script[0].call !== HEADER_ROUTINE) {
    throw new Error(`${part}: first call is ${script[0].call.toString(16)}`);
  }
  const producers = script.slice(1);
  if (producers.length !== spec.samples.length) {
    throw new Error(`${part}: ${producers.length} calls vs ${spec.samples.length} samples`);
  }

  const c = new SynthContext(seg0, seg4, tables);
  // The size the script loads into r3 — `lis`/`ori`, so decodeScript has it.
  const size = script[0].setup.r3;
  const headerBytes = c.header(size, SCRIPTS[part].descriptor);
  if (headerBytes !== spec.header.bytes) {
    throw new Error(`${part}: header copied ${headerBytes} B, reference has ${spec.header.bytes}`);
  }

  let filled = 0;
  const results = [];
  // `r8` and friends are sticky: the script sets them once and later calls run
  // under them, so the register state accumulates rather than resetting.
  const regs = {};
  for (let i = 0; i < producers.length; i++) {
    const call = producers[i];
    const want = spec.samples[i];
    Object.assign(regs, call.setup);
    const impl = PRIMITIVES[call.call];
    const skip = only && `0x${call.call.toString(16)}` !== only;

    if (!impl || skip) {
      // Fill from the oracle: the 8-byte sample header, then its PCM.
      const dv = new DataView(c.out.buffer);
      dv.setUint32(c.r31, want.flags, false);
      dv.setUint32(c.r31 + 4, want.frames, false);
      c.r31 += 8;
      if (want.file) {
        c.out.set(new Uint8Array(fs.readFileSync(path.join(refdir, want.file))), c.r31);
        c.r31 += want.frames;
      }
      filled++;
      continue;
    }

    const at = c.r31;
    impl(c, regs);
    const got = c.out.subarray(at + 8, at + 8 + want.frames);
    const wantPcm = want.file
      ? new Uint8Array(fs.readFileSync(path.join(refdir, want.file)))
      : new Uint8Array(0);
    const d = firstDiff(got, wantPcm);
    const wrote = c.r31 - at - 8;
    results.push({ i, routine: want.routine, frames: want.frames, diff: d, wrote });

    const key = want.routine;
    if (!byRoutine.has(key)) byRoutine.set(key, { exact: 0, total: 0 });
    byRoutine.get(key).total++;
    if (d < 0 && wrote === want.frames) byRoutine.get(key).exact++;
    totalPorted++;
    if (d < 0 && wrote === want.frames) totalExact++;
  }
  totalSamples += producers.length;

  console.log(`\n=== ${part}: ${producers.length} samples, ${filled} filled from the reference`);
  for (const r of results) {
    const ok = r.diff < 0 && r.wrote === r.frames;
    const detail = r.wrote !== r.frames
      ? `wrote ${r.wrote} of ${r.frames} frames`
      : r.diff < 0 ? 'byte-exact' : `differs at frame ${r.diff} of ${r.frames}`;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} #${String(r.i).padStart(2)} ${r.routine}  ${detail}`);
  }

  // The module always assembles, so the digest is always meaningful: with
  // everything filled it must MATCH, which proves the harness itself before it
  // is used to judge anything.
  const mod = c.out.subarray(4);
  const got = sha(mod);
  const okAll = got === spec.moduleSha256;
  console.log(`  module ${mod.length} B  sha256 ${got.slice(0, 16)}…  ` +
    `${okAll ? 'MATCHES' : 'differs from'} the reference`);
  if (!okAll && filled === producers.length) {
    console.log('  ...and everything was filled from the reference, so the HARNESS is wrong,');
    console.log('     not the port. Check header() and the sample framing first.');
  }
}

console.log(`\n${totalExact}/${totalPorted} ported samples byte-exact ` +
  `(${totalSamples - totalPorted} of ${totalSamples} still filled from the reference)`);
for (const [routine, s] of [...byRoutine].sort()) {
  console.log(`  ${routine}  ${s.exact}/${s.total}`);
}

if (totalExact < minExact) {
  console.log(`\nREGRESSION: ${totalExact} exact, ratchet is ${minExact}`);
  process.exit(1);
}
if (totalPorted && totalExact < totalPorted) {
  console.log('\nsome ported primitives do not reproduce their target');
  process.exit(1);
}
console.log(minExact ? '\nratchet held' : '');
