#!/usr/bin/env node
// hjb-vs-oracle.mjs — check the JS .HJB reader against the Python oracle.
//
//   node hjb-vs-oracle.mjs <corpus-dir> [<corpus-dir> ...]
//
// Two independently written parsers over the same 252-file corpus. The Python one
// (docs/haujobb/tools/hjb_exact.py) was derived from Moments.exe's loader and
// validates byte-exact closure; this checks that the JS reader consumes the same
// number of bytes on every file and agrees on the record census.
//
// Agreement between two implementations is a far stronger statement than either
// one succeeding, and it is exactly how the earlier .HJB parser disagreement was
// settled — one-directional domination revealed a loop bug rather than a rival
// reading of the format.
//
// Exit: 0 agree · 1 disagreement or corpus too small · 77 no corpus (absent)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { parseHjb } from '../js/hjb.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ORACLE = join(HERE, '..', '..', '..', 'docs', 'haujobb', 'tools', 'hjb_exact.py');
// The floor is what a rehydrated clone can reach unaided: the 62 loose .HJB in
// originals/haujobb/. Reaching all 252 additionally needs the embedded RAR
// (Channel 5, Liquid) and ACE (Elements, We Are) payloads extracted; pass those
// directories as extra arguments. The point of the floor is that a corpus which
// shrank to nothing must FAIL rather than agree trivially.
const MIN_FILES = 60;
const KNOWN_SHORT = { 'Strain3D.HJB': 24 };   // see the study; residue is all zeros

const roots = process.argv.slice(2);
if (!roots.length) { console.error('usage: hjb-vs-oracle.mjs <corpus-dir> ...'); process.exit(2); }

const files = [];
const walk = (d) => {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (extname(p).toLowerCase() === '.hjb') files.push(p);
  }
};
for (const r of roots) { try { walk(r); } catch { /* missing root is not fatal */ } }
files.sort();

if (!files.length) { console.error(`no .HJB under ${roots.join(', ')} — corpus absent`); process.exit(77); }
if (files.length < MIN_FILES) {
  console.error(`FAIL precondition: ${files.length} files, expected >= ${MIN_FILES}\n` +
                '  A shrunken corpus agrees trivially; that is not a result.');
  process.exit(1);
}
if (files.length < 200) {
  console.log(`note: ${files.length} files — the loose corpus only. Pass the extracted ` +
              'RAR/ACE directories too for the full 252.');
}

// One python process for the whole corpus rather than one per file.
const py = execFileSync('python3', ['-c', `
import sys, importlib.util, json
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('h', ${JSON.stringify(ORACLE)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
out = {}
for f in sys.stdin.read().splitlines():
    try:
        _, size, o, h0, nf, st, status = m.parse(f)
        out[f] = {'size': size, 'consumed': o, 'nframes': nf,
                  'types': st['types'], 'nmat': st.get('nmat')}
    except Exception as e:
        out[f] = {'error': f'{type(e).__name__}: {e}'}
json.dump(out, sys.stdout)
`], { input: files.join('\n'), maxBuffer: 1 << 28, encoding: 'utf8' });
const oracle = JSON.parse(py);

let agree = 0;
const problems = [];
for (const f of files) {
  const o = oracle[f];
  const base = basename(f);
  let js;
  try {
    // NOT readFileSync(f).buffer — for files under 8 KB Node returns a Buffer
    // that is a VIEW INTO A SHARED POOL, so .buffer is the whole 8192-byte pool
    // and every small file parses the same memory. Pass the view itself.
    js = parseHjb(readFileSync(f), { source: base });
  } catch (e) {
    problems.push(`${base}: JS threw ${e.message}${o?.error ? ' (oracle also failed)' : ' but the oracle parsed it'}`);
    continue;
  }
  if (o?.error) { problems.push(`${base}: oracle failed (${o.error}) but JS parsed it`); continue; }

  const expectShort = KNOWN_SHORT[base] ?? 0;
  if (js.bytesConsumed !== o.consumed) {
    problems.push(`${base}: consumed ${js.bytesConsumed}, oracle ${o.consumed}`);
  } else if (js.bytesTotal - js.bytesConsumed !== expectShort) {
    problems.push(`${base}: ${js.bytesTotal - js.bytesConsumed} bytes left, expected ${expectShort}`);
  } else if (js.nframes !== o.nframes) {
    problems.push(`${base}: nframes ${js.nframes} vs oracle ${o.nframes}`);
  } else if (js.materials.length !== o.nmat) {
    problems.push(`${base}: ${js.materials.length} materials, oracle ${o.nmat}`);
  } else {
    // Record census, in tree order: the oracle appends each type as it reads it.
    const flat = [];
    (function walkNodes(ns) { for (const n of ns) { flat.push(n.type); walkNodes(n.children); } })(js.nodes);
    if (flat.join(',') !== o.types.join(',')) {
      problems.push(`${base}: record type sequence differs (${flat.length} vs ${o.types.length})`);
    } else agree++;
  }
}

console.log(`hjb-vs-oracle: ${agree}/${files.length} files agree with the Python oracle`);
if (problems.length) {
  console.error(`\nFAIL: ${problems.length} disagreement(s)`);
  for (const p of problems.slice(0, 20)) console.error('  ' + p);
  process.exit(1);
}
