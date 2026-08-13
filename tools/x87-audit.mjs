#!/usr/bin/env node
// x87-audit.mjs — mechanize METHOD.md's rule: "if a decompiled function looks
// too simple for what it draws, disassemble it."
//
//   node tools/x87-audit.mjs <decompiled.c> <disasm.asm> [--out report.md]
//
// Cross-references the two Ghidra exports (ExportDecomp.java +
// ExportDisasm.java — same "// ==== name @ addr ====" markers). For every
// function it counts x87 instructions in the disassembly and floating-point
// evidence in the decompiled C, then flags the mismatches:
//
//   DROPPED   x87 code present, decompiled C shows (near-)zero float activity
//             — the classic silent-drop: the math evaporated.
//   SUSPECT   x87-heavy function whose C float evidence is thin relative to
//             the instruction count — eyeball it against the listing.
//   ftol()    a __ftol/ftol call with empty parentheses — Ghidra lost the
//             operand; the truncation source must be read from the asm.
//
// Every one of sonnet's shipped-then-fixed visual bugs traced back to a
// function this audit would have flagged. Run it after every export; treat
// DROPPED entries as un-ported until the asm has been read.
import fs from 'node:fs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const outIdx = process.argv.indexOf('--out');
const outPath = outIdx > 0 ? process.argv[outIdx + 1] : null;
if (args.length < 2) {
  console.error('usage: node tools/x87-audit.mjs <decompiled.c> <disasm.asm> [--out report.md]');
  process.exit(2);
}

const MARK = /^\/\/ ==== (.+) @ ([0-9a-fA-F]+) ====$/;
const split = (text) => {
  const map = new Map();
  let name = null, addr = null, buf = [];
  for (const line of text.split('\n')) {
    const m = line.match(MARK);
    if (m) {
      if (name) map.set(addr, { name, body: buf.join('\n') });
      [, name, addr] = m; buf = [];
    } else if (name) buf.push(line);
  }
  if (name) map.set(addr, { name, body: buf.join('\n') });
  return map;
};

const dec = split(fs.readFileSync(args[0], 'utf8'));
const asm = split(fs.readFileSync(args[1], 'utf8'));

// x87 mnemonics (FABS..FYL2XP1 family). Matched as the instruction column of
// the ExportDisasm line format: "<addr>  <bytes>  MNEMONIC operands".
const X87 = /\b(F(?:LD|ST|STP|ILD|IST|ISTP|ADD|ADDP|IADD|SUB|SUBP|SUBR|SUBRP|ISUB|ISUBR|MUL|MULP|IMUL|DIV|DIVP|DIVR|DIVRP|IDIV|IDIVR|ABS|CHS|SQRT|SIN|COS|SINCOS|PTAN|PATAN|2XM1|YL2X|YL2XP1|SCALE|PREM|PREM1|RNDINT|XTRACT|COM|COMP|COMPP|ICOM|ICOMP|UCOM|UCOMP|UCOMPP|COMI|COMIP|UCOMI|UCOMIP|TST|XAM|LD1|LDL2T|LDL2E|LDPI|LDLG2|LDLN2|LDZ|XCH|FREE|NOP|INIT|CLEX|STCW|LDCW|STSW|STENV|LDENV|SAVE|RSTOR|INCSTP|DECSTP|CMOVB|CMOVE|CMOVBE|CMOVU|CMOVNB|CMOVNE|CMOVNBE|CMOVNU))\b/;

// float evidence in decompiled C: float/double types, float literals, the
// *10^n formatting Ghidra uses, and named float ops.
const cFloatEvidence = (s) =>
  (s.match(/\b(?:float|double)\b/g) ?? []).length +
  (s.match(/\b\d+\.\d+(?:e[+-]?\d+)?f?\b/gi) ?? []).length +
  (s.match(/_?_?ftol|fsqrt|SQRT|__fdivr?/g) ?? []).length;

const rows = [];
for (const [addr, { name, body }] of asm) {
  const x87 = body.split('\n').filter((l) => X87.test(l.slice(30))).length;
  if (!x87) continue;
  const d = dec.get(addr);
  const ev = d ? cFloatEvidence(d.body) : 0;
  const emptyFtol = d ? /\bftol\s*\(\s*\)/.test(d.body) : false;
  let verdict = null;
  if (!d) verdict = 'NO-DECOMP';
  else if (ev === 0) verdict = 'DROPPED';
  else if (emptyFtol) verdict = 'ftol()';
  else if (x87 >= 10 && ev < x87 / 5) verdict = 'SUSPECT';
  if (verdict) rows.push({ addr, name: (d ?? { name }).name, x87, ev, verdict });
}
rows.sort((a, b) => (a.verdict > b.verdict ? 1 : a.verdict < b.verdict ? -1 : b.x87 - a.x87));

const total = [...asm.values()].length;
const lines = [
  `# x87 audit — ${rows.length} flagged of ${total} functions`,
  '',
  'Treat DROPPED as un-ported until the asm has been read (METHOD.md §3).',
  '',
  '| verdict | function | addr | x87 instrs | C float evidence |',
  '|---|---|---|---:|---:|',
  ...rows.map((r) => `| ${r.verdict} | ${r.name} | ${r.addr} | ${r.x87} | ${r.ev} |`),
  '',
];
const report = lines.join('\n');
if (outPath) { fs.writeFileSync(outPath, report); console.log(`wrote ${outPath} (${rows.length} flagged)`); }
else process.stdout.write(report);
