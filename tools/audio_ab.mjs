// audio_ab.mjs — is the FORK's XM player still bit-identical to the original's?
//
//   node tools/audio_ab.mjs [--seconds=470] [--rate=48000]
//
// The size build deletes ~20 effect handlers from web-mashi/js/xm.js on
// the strength of a census of the module's pattern data (re/MASHI.md: 16 effect
// commands ever appear, and the volume column never carries an effect).  That
// argument is complete, but a mis-applied edit is not — deleting one case too
// many from a switch, or a helper two effects shared, changes the music in a way
// nobody notices until it is shipped.
//
// So: build the module once, run BOTH players over the WHOLE song, and compare
// every sample.  xm.js is pure JS with no DOM or WebAudio dependency, so this
// needs no browser and takes seconds.
//
// Exit code 0 only if the two are sample-for-sample identical.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.join(HERE, '..', 'productions/sonnet');
const argv = process.argv.slice(2);
const num = (n, d) => Number((argv.find((a) => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1]);
const SECONDS = num('seconds', 470);      // the demo is 7:41; 470 s covers it with margin
const RATE = num('rate', 48000);

const { buildXm } = await import(path.join(WORK, 'work/audio/writexm.mjs'));
const xmBuf = buildXm({ panMode: 'correct' });
const xm = new Uint8Array(xmBuf.buffer, xmBuf.byteOffset, xmBuf.byteLength);
console.log(`module ${xm.length} B, mixing ${SECONDS}s at ${RATE} Hz through both players`);

const CHUNK = 4096;
async function render(rel) {
  const { XmPlayer } = await import(path.join(WORK, rel));
  const p = new XmPlayer(xm, RATE);
  const L = new Float32Array(CHUNK), R = new Float32Array(CHUNK);
  const h = createHash('sha256');
  const scratch = Buffer.alloc(CHUNK * 8);
  const total = Math.ceil(SECONDS * RATE / CHUNK);
  let nonSilent = 0, peak = 0;
  for (let i = 0; i < total; i++) {
    // `render` is the driver — it advances ticks/rows and calls `mix` for each
    // slice.  Calling `mix` directly renders a song that never advances, i.e.
    // silence, which is exactly what the peak check below caught.
    p.render(L, R, CHUNK);
    for (let j = 0; j < CHUNK; j++) {
      scratch.writeFloatLE(L[j], j * 8);
      scratch.writeFloatLE(R[j], j * 8 + 4);
      const a = Math.abs(L[j]), b = Math.abs(R[j]);
      if (a > 1e-6 || b > 1e-6) nonSilent++;
      if (a > peak) peak = a; if (b > peak) peak = b;
    }
    h.update(scratch);
  }
  return { hash: h.digest('hex'), unsupported: [...(p.unsupported || [])].sort(), nonSilent, peak,
           frames: total * CHUNK };
}

const a = await render('web/js/xm.js');
const b = await render('web-mashi/js/xm.js');

const pct = (x) => (100 * x.nonSilent / x.frames).toFixed(1) + '%';
console.log(`  original  ${a.hash.slice(0, 16)}  peak ${a.peak.toFixed(4)}  audible ${pct(a)}`);
console.log(`  fork      ${b.hash.slice(0, 16)}  peak ${b.peak.toFixed(4)}  audible ${pct(b)}`);
if (a.unsupported.length) console.log(`  original reported unsupported: ${a.unsupported.join(', ')}`);
if (b.unsupported.length) console.log(`  fork     reported unsupported: ${b.unsupported.join(', ')}`);

// A silent render would match trivially, so prove there is music before trusting
// the comparison at all.
if (a.peak < 0.01 || a.nonSilent < a.frames * 0.5) {
  console.error('\nFAIL: the reference render is silent or nearly so — the comparison is meaningless');
  process.exit(2);
}
if (a.hash !== b.hash) {
  console.error('\nFAIL: the fork\'s player produces DIFFERENT audio');
  process.exit(1);
}
console.log('\nPASS — sample-for-sample identical over the whole song');
