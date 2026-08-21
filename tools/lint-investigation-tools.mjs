// lint-investigation-tools.mjs — do the tools obey the protocol they are held to?
//
//   node tools/lint-investigation-tools.mjs [--list]
//
// MODE:       CHECK — exits 1 when a tool breaks a rule from METHOD.md,
//             "Let a tool earn the right to be believed".
// OBSERVABLE: header labels and path literals in tool SOURCE. Nothing is executed;
//             this is a text check and cannot tell whether a tool is correct.
// UNITS:      files, not lines. One finding per rule per file.
//
// PAIRING AND COVERAGE: every file under tools/ and productions/*/work/tools/ with a
//             known extension is read; the count of files scanned is printed so a
//             silent zero-file run cannot pass.
//
// VALIDATION: run with a deliberately broken fixture (rename a tool to check-*.mjs
//             without MODE: CHECK, or drop a SUPERSEDED BY line) and it must exit 1.
//             It was seen to do so on all five rules before being wired into anything.
//
// FALSE FINDING PREVENTED: the convention decaying silently. A header rule nobody
//             checks is a style suggestion, and within a month the labels are absent
//             from exactly the tools that most needed them.
//
// LIMITATIONS: deliberately NOT applied to every legacy tool. Rules 2-5 only bind
//             files that have opted in by declaring MODE, because the protocol asks
//             for labels on new and materially-changed tools, not on a retroactive
//             sweep of thirty files. Rule 1 binds by NAME, because calling something
//             check-* is itself the claim. Rule 4 binds only tools that advertise a
//             <production> argument — a tool that is openly production-specific, like
//             extract-energia-mode4-table.mjs, is allowed to name its production.
//             Directories named test/ are skipped entirely — see walk().
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fromRepo } from './harness/index.mjs';

const EXT = new Set(['.mjs', '.js', '.sh', '.py', '.zsh']);
const SLUGS = readdirSync(fromRepo('productions'))
  .filter((d) => statSync(fromRepo('productions', d)).isDirectory());

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    // test/ is skipped: a test file is not a tool, and a fixture exercising a rule
    // necessarily CONTAINS a violation. Scanning them made the lint's own test suite
    // fail rule 4 on its fixture strings.
    if (e.isDirectory()) { if (!['node_modules', 'test', 'tests'].includes(e.name)) walk(p, out); }
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
};

const roots = [fromRepo('tools')];
for (const s of SLUGS) {
  const d = fromRepo('productions', s, 'work/tools');
  try { if (statSync(d).isDirectory()) roots.push(d); } catch { /* none */ }
}
const files = roots.flatMap((r) => walk(r));

// A label may sit in a // or # comment, or bare inside a Python docstring — the
// .py tools here head with """...""" and their labels have no comment marker.
const label = (src, name) => new RegExp(`^\\s*(?://|#)?\\s*${name}\\s*:`, 'm').test(src);
const findings = [];
const add = (file, rule, text) => findings.push({ file: path.relative(fromRepo('.'), file), rule, text });

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const head = src.slice(0, 4000);
  const base = path.basename(file);
  const self = file.endsWith('lint-investigation-tools.mjs');

  // 1. the name is a claim
  if (/^(check|verify)-/.test(base) && !/^\s*(?:\/\/|#)?\s*MODE:\s*CHECK/m.test(head)) {
    add(file, 'name-is-a-claim', `${base} is named as a check but does not declare MODE: CHECK`);
  }
  // 2. opting in means opting in fully
  if (label(head, 'MODE')) {
    for (const req of ['OBSERVABLE', 'UNITS']) {
      if (!label(head, req)) add(file, 'incomplete-header', `declares MODE but not ${req}`);
    }
  }
  // 3. a superseded tool must say what replaced it
  if (/^\s*(?:\/\/|#)?\s*STATUS:.*superseded/mi.test(head) && !/SUPERSEDED BY/i.test(head)) {
    add(file, 'orphan-supersession', 'STATUS says superseded but nothing names the replacement');
  }
  // 4. a tool that takes <production> must not hard-code one
  if (/<production>/.test(head)) {
    for (const slug of SLUGS) {
      const re = new RegExp(`productions/${slug}/`);
      for (const line of src.split('\n')) {
        if (/^\s*(?:\/\/|#|\*)/.test(line)) continue;       // prose may name examples
        if (re.test(line)) {
          add(file, 'general-but-not', `takes <production> yet reads productions/${slug}/`);
          break;
        }
      }
    }
  }
  // 5. a report must not claim to have passed
  if (/^\s*(?:\/\/|#)?\s*MODE:\s*REPORT/m.test(head) && !self) {
    for (const line of src.split('\n')) {
      if (/^\s*(?:\/\/|#|\*)/.test(line)) continue;
      if (/(["'`])\s*PASS\b/.test(line)) {
        add(file, 'report-claims-pass', 'declares MODE: REPORT but prints PASS');
        break;
      }
    }
  }
}

const listed = process.argv.includes('--list');
if (listed) for (const f of files) console.log(path.relative(fromRepo('.'), f));
console.log(`scanned ${files.length} tool file(s) across ${roots.length} root(s)`);
if (!files.length) { console.error('scanned nothing — the roots are wrong'); process.exit(1); }

if (!findings.length) { console.log('PASS  no protocol violations'); process.exit(0); }
const byRule = new Map();
for (const f of findings) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
for (const [rule, list] of byRule) {
  console.log(`\n${rule}  (${list.length})`);
  for (const f of list) console.log(`  ${f.file}: ${f.text}`);
}
console.log(`\nFAIL  ${findings.length} violation(s)`);
process.exit(1);
