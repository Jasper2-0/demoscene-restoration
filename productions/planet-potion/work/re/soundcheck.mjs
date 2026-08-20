// soundcheck.mjs — press the page's own button and check that sound comes out.
//
//   node work/re/soundcheck.mjs
//
// The sibling of rendercheck.mjs, for the half of the page that makes noise.
// It exists because of a specific failure that no suite could see: `#start`
// said "Start with sound", `main.js` imported neither dbm.js nor dbmplayer.js,
// and the only line that touched the button HID it — on the default path, the
// one mode where it might have worked. So the control was dead, and visible in
// exactly the modes that render. dbmcheck and dbmtime were both green
// throughout, because both test the reader and the sequencer directly and
// neither has any opinion about whether the page calls them.
//
// WHAT IT ASSERTS
//
//   * the button is visible where it works and hidden in the three modes where
//     it cannot — ?inspect, ?oracle and ?scene all render one still or nothing;
//   * pressing it queues a decoded buffer of part one's FULL length. A
//     truncated mix is the likely regression if the sequencer's row loop or the
//     module's declared size drifts, and it would still play;
//   * that buffer is not silence. A mixer that triggers no voices returns a
//     correctly-shaped, correctly-timed Float32Array of zeros, and every
//     structural check passes on it;
//   * the picture ADVANCES while the music plays, which is what proves the
//     frames are driven by the audio clock rather than by nothing at all.
//
// HOW IT LISTENS. There is no way to read a headless Chrome's speakers, so it
// wraps `createBufferSource` and measures the AudioBuffer the page assigns —
// the samples actually handed to the output, after render() and the interleave.
// Chrome gets --autoplay-policy=no-user-gesture-required so a synthetic click
// counts as a gesture; everything else is the page exactly as shipped.
//
// SKIPS (77) rather than fails when Chrome or the modules are missing: the
// .dbm files are the softsynth's output and, like the rest of the dataset, are
// regenerated rather than committed. See checkall.sh for the recipe.
import fs from 'node:fs';
import { withPage, findChrome, fromRepo } from '../../../../tools/harness/index.mjs';

const ABSENT = 77;
const WEB = 'productions/planet-potion/web';
const MODULES = ['data/part1_full.dbm', 'data/part3.dbm'];
const EXTRA = ['--use-angle=metal', '--autoplay-policy=no-user-gesture-required'];

if (!findChrome()) {
  console.log('soundcheck: no Chrome found — skipping');
  process.exit(ABSENT);
}
const missing = MODULES.filter((m) => !fs.existsSync(fromRepo(WEB, m)));
if (missing.length) {
  console.log(`soundcheck: ${missing.join(', ')} absent — run synthdump.py and copy`);
  console.log('soundcheck: mods/ into web/data/ (see checkall.sh) — skipping');
  process.exit(ABSENT);
}

let bad = 0;
const say = (ok, what, detail = '') => {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${what}${detail ? `  ${detail}` : ''}`);
};

/** Record every AudioBuffer the page assigns to a source node. */
const TAP = `(() => {
  window.__audio = [];
  const make = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function (...a) {
    const src = make.apply(this, a);
    const slot = Object.getOwnPropertyDescriptor(AudioBufferSourceNode.prototype, 'buffer');
    Object.defineProperty(src, 'buffer', {
      get() { return slot.get.call(this); },
      set(b) {
        if (b) {
          const ch = b.getChannelData(0);
          let peak = 0, nz = 0, n = 0;
          // Every 101st sample: enough to characterise 14M of them, and prime
          // so it cannot land in step with any period in the music.
          for (let i = 0; i < ch.length; i += 101, n++) {
            const v = Math.abs(ch[i]);
            if (v > peak) peak = v;
            if (v > 1e-4) nz++;
          }
          window.__audio.push({ seconds: b.duration, rate: b.sampleRate,
            channels: b.numberOfChannels, peak, nonSilent: (nz / n) * 100 });
        }
        slot.set.call(this, b);
      },
    });
    return src;
  };
})()`;

await withPage({ root: WEB, path: '/index.html', query: '', extraArgs: EXTRA },
  async ({ page, errors, failedRequests }) => {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    say(!(await page.$eval('#start', (e) => e.hidden)),
      'the button is visible on the default page');

    await page.evaluate(TAP);
    await page.click('#start');
    // Part one is ~1.2 s to mix on a warm machine; then watch long enough to
    // cross at least one of its five recorded samples (they are ~3.7 s apart).
    await new Promise((r) => setTimeout(r, 6000));
    const seen = new Set();
    for (let i = 0; i < 6; i++) {
      seen.add(await page.$eval('#status', (e) => e.textContent));
      await new Promise((r) => setTimeout(r, 1500));
    }

    const audio = await page.evaluate(() => window.__audio);
    const first = audio[0] ?? {};
    const real = failedRequests.filter((f) => !f.includes('favicon.ico'));

    console.log(`    queued ${audio.length} buffer(s); first: `
      + `${first.seconds?.toFixed(1)}s @ ${first.rate} Hz x${first.channels}, `
      + `peak ${first.peak?.toFixed(3)}, ${first.nonSilent?.toFixed(1)}% non-silent`);
    for (const s of seen) console.log(`    ${s}`);

    say(await page.$eval('#start', (e) => e.hidden), 'it hides itself once pressed');
    say(errors.length === 0, 'no page errors', errors.slice(0, 3).join('; '));
    say(real.length === 0, 'no failed requests', real.slice(0, 3).join('; '));
    say(audio.length >= 1, 'a decoded soundtrack reached the output', `${audio.length}`);
    say(first.channels === 2, 'it is stereo', String(first.channels));
    // 289.286 s is dbmtime's figure for part one, derived from the module's own
    // rows rather than from anything this file knows.
    say(Math.abs((first.seconds ?? 0) - 289.286) < 0.5,
      "part one's full length was mixed", `${first.seconds?.toFixed(3)}s`);
    say((first.peak ?? 0) > 0.05, 'the mix is not silence', `peak ${first.peak?.toFixed(3)}`);
    say((first.nonSilent ?? 0) > 50, 'and not mostly silence',
      `${first.nonSilent?.toFixed(1)}%`);
    say(seen.size > 1, 'the picture advances with the music',
      `${seen.size} distinct status lines`);
  });

// A control that does nothing must not be on screen. This is the regression
// that started the file, so it is checked rather than assumed fixed.
for (const query of ['?oracle=1', '?scene=18&t=3', '?inspect=1']) {
  await withPage({ root: WEB, path: '/index.html', query, extraArgs: EXTRA },
    async ({ page }) => {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      say(await page.$eval('#start', (e) => e.hidden),
        `${query}: the button is hidden where it cannot work`);
    });
}

console.log(bad === 0 ? '\nall checks passed' : `\n${bad} checks FAILED`);
process.exit(bad ? 1 : 0);
