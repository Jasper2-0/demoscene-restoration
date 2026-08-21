// lint.test.mjs — does the tool lint still catch what it claims to catch?
//
//   node --test tools/test/lint.test.mjs
//
// MODE:       CHECK
// OBSERVABLE: the lint's exit status and rule name, given a file that violates
//             exactly one rule.
// UNITS:      exit statuses (0 pass, 1 violation) and rule slugs.
//
// FALSE FINDING PREVENTED: the lint quietly ceasing to check. A linter that has
//             stopped matching — a changed comment marker, a tightened regex —
//             reports a clean tree, which is indistinguishable from a clean tree.
//             Every rule here was seen to fire when it was written; this keeps that
//             true rather than leaving it as a claim in a header.
//
// LIMITATIONS: fixtures are written into a real scanned directory and removed in a
//             finally block. It asserts the rule FIRES, not that its wording is good.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fromRepo } from '../harness/index.mjs';

const LINT = fromRepo('tools/lint-investigation-tools.mjs');
// The lint only walks tools/ and productions/*/work/tools/, so a fixture has to live
// somewhere it actually looks.
const HOST = fromRepo('productions/wonder/work/tools');

const runLint = () => {
  try {
    return { code: 0, out: execFileSync('node', [LINT], { encoding: 'utf8' }) };
  } catch (e) {
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const withFixture = (name, body, fn) => {
  const dir = mkdtempSync(path.join(HOST, 'linttest-'));
  const file = path.join(dir, name);
  try { writeFileSync(file, body); fn(); }
  finally { rmSync(dir, { recursive: true, force: true }); }
};

const OK_HEAD = '// MODE: REPORT\n// OBSERVABLE: x\n// UNITS: y\n';

test('a clean tree passes', () => {
  const { code, out } = runLint();
  assert.equal(code, 0, `lint should pass on the tree as committed:\n${out}`);
  assert.match(out, /scanned \d+ tool file/);
});

for (const [rule, name, body] of [
  ['name-is-a-claim', 'check-fixture.mjs', OK_HEAD],
  ['incomplete-header', 'fixture.mjs', '// MODE: REPORT\n'],
  ['orphan-supersession', 'fixture.mjs', `${OK_HEAD}// STATUS: superseded\n`],
  ['general-but-not', 'fixture.mjs', `// usage: x <production>\n${OK_HEAD}const p = "productions/lapsus/web";\n`],
  ['report-claims-pass', 'fixture.mjs', `${OK_HEAD}console.log("PASS ok");\n`],
]) {
  test(`rule fires: ${rule}`, () => {
    withFixture(name, body, () => {
      const { code, out } = runLint();
      assert.equal(code, 1, `${rule} should have failed the lint:\n${out}`);
      assert.match(out, new RegExp(rule), `expected rule ${rule} in:\n${out}`);
    });
  });
}

test('the scan cannot silently cover nothing', () => {
  const { out } = runLint();
  const n = Number(/scanned (\d+) tool file/.exec(out)?.[1] ?? 0);
  assert.ok(n > 20, `only ${n} files scanned — the roots are probably wrong`);
});
