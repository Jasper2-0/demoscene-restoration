// plan-identity.mjs — prove defaultPlan() reproduces every adapter's own plan().
//
//   node tools/inspect/plan-identity.mjs                 # every adopter
//   node tools/inspect/plan-identity.mjs lapsus wonder   # named ones
//
// WHY THIS EXISTS, AND WHY IT RUNS BEFORE THE REFACTOR.
//
// Moving plan() into the sweep changes where the sample grid comes from. If the
// shared version differs from a production's hand-written one by even one
// sample position, that production's existing baseline silently becomes
// incomparable to every future run — and nothing would report it. The scores
// would simply be of different frames.
//
// This is the whole risk of the change, and it is cheap to eliminate: ask each
// page for BOTH its own plan() and its schedule(), compute defaultPlan() from
// the schedule here in Node, and require the two arrays to be deep-equal at
// several step sizes. Only then is it safe to delete the copies.
//
// Keep this file after the refactor. A production that supplies its own plan()
// as a deliberate override should still be checked against the default, so the
// difference stays intentional rather than accidental.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { withPage, fromRepo } from '../harness/index.mjs';
import { defaultPlan } from './plan.mjs';

const STEPS = [1, 2, 5];
const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));

// Adopters = productions whose page installs window.__demo.
const adopters = named.length ? named : fs.readdirSync(fromRepo('productions'))
  .filter((slug) => {
    const main = fromRepo('productions', slug, 'web/js/main.js');
    return fs.existsSync(main) && /window\.__demo\s*=/.test(fs.readFileSync(main, 'utf8'));
  });

if (!adopters.length) { console.error('no adapters found'); process.exit(2); }
console.log(`plan identity: ${adopters.join(', ')}  steps ${STEPS.join(', ')}`);

let failures = 0;
for (const slug of adopters) {
  await withPage({ root: `productions/${slug}`, path: '/web/index.html', query: '?inspect=1',
    width: 640, height: 480, viewport: { width: 640, height: 480 } }, async ({ page }) => {
    await page.waitForFunction('window.__demoReady === true || !!window.__demo', { timeout: 600000 });

    const own = await page.evaluate(() => typeof window.__demo.plan === 'function');
    const schedule = await page.evaluate(() => window.__demo.schedule());

    for (const step of STEPS) {
      const mine = defaultPlan(schedule, step);
      if (!own) {
        console.log(`  ${slug} step ${step}: no plan() of its own — uses the default ` +
                    `(${mine.length} samples)`);
        continue;
      }
      const theirs = await page.evaluate((s) => window.__demo.plan(s), step);
      try {
        assert.deepStrictEqual(mine, theirs);
        console.log(`  ${slug} step ${step}: IDENTICAL (${mine.length} samples)`);
      } catch {
        failures++;
        console.log(`  ${slug} step ${step}: DIFFERS — ${theirs.length} own vs ${mine.length} default`);
        // Name the first divergence rather than dumping both arrays; the whole
        // point is to make a one-sample drift legible.
        const n = Math.max(mine.length, theirs.length);
        for (let i = 0; i < n; i++) {
          const a = JSON.stringify(theirs[i]), b = JSON.stringify(mine[i]);
          if (a !== b) { console.log(`    first at [${i}]\n      own     ${a}\n      default ${b}`); break; }
        }
      }
    }
  });
}

console.log(failures ? `\n${failures} mismatch(es) — do NOT delete plan() yet`
                     : '\nall identical — safe to delete the per-adapter copies');
process.exit(failures ? 1 : 0);
