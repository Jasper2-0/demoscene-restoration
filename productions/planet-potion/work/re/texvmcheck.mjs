// texvmcheck.mjs — how far can the JS texture VM get through the shipped programs?
//
//   node work/re/texvmcheck.mjs <out-dir>
//
// The oracle is export.py's 69 PNGs. Until every opcode is written, the useful
// measure is not "does it match" but "where does it stop" — this reports the
// decode (which is complete and verified) and the instruction coverage, so the
// remaining work is a number rather than an impression.
import fs from 'node:fs';
import { decode, UNIMPLEMENTED } from '../../web/js/texturevm.js';

const out = process.argv[2] ?? '/tmp/texprog';
const doc = JSON.parse(fs.readFileSync(`${out}/tex_programs.json`, 'utf8'));
// The operand-width table at r2+0x2502, as export.py reads it.
const WIDTHS = [3, 20, 13, 12, 1, 10, 12, 9, 18, 12, 1, 1, 1, 1, 1, 1, 127, 3, 4, 0];

let exact = 0, instructions = 0, runnable = 0;
const blocked = new Map();
for (const p of doc.programs) {
  if (!p.hex) continue;
  const { ops, exact: ok } = decode(Uint8Array.from(Buffer.from(p.hex, 'hex')), WIDTHS);
  if (ok) exact++;
  for (const { op } of ops) {
    instructions++;
    if (UNIMPLEMENTED.has(op)) blocked.set(op, (blocked.get(op) ?? 0) + 1);
    else runnable++;
  }
}
console.log(`decode:       ${exact}/${doc.programs.length} programs exact`);
console.log(`instructions: ${runnable}/${instructions} executable `
  + `(${(runnable / instructions * 100).toFixed(0)}%) — the rest are convolutions vs table opcodes`);
console.log('\nblocked, most frequent first — this is the remaining work list:');
for (const [op, n] of [...blocked].sort((a, b) => b[1] - a[1])) {
  console.log(`  op${String(op).padEnd(3)} x${n}`);
}
process.exit(exact === doc.programs.length ? 0 : 1);
