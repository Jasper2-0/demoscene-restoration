// measure.mjs — METHOD.md §8's measurement rules, encoded once.
//
// Every rule below exists because a harness that ignored it produced a
// confidently wrong number that cost real debugging time:
//
//   * gl.finish() on BOTH sides or you time the queue, not the work.
//     ("180x speedup" = a baseline that had taken the fast path.)
//   * Assert the frame actually drew, and check getError, IN THE SAME TASK
//     as the timing. (A convincing win came from writes running past the end
//     of a buffer and silently doing nothing.)
//   * Sample audio-locked behaviour against the AUDIO CLOCK, never against
//     requestAnimationFrame. (A throttled headless window invented a 77 %
//     sync error that did not exist.)
//   * Warm up before screenshotting. (Cold-start hitches break exactly the
//     entry-time fades you are trying to photograph.)
//
// These are exported as functions rather than documented as advice because
// advice is what got ignored.

/**
 * Time a browser-side operation honestly.
 *
 * Runs `body` (a function string or function) inside ONE page task that:
 *   1. warms up (`warmup` iterations, discarded),
 *   2. calls gl.finish() before starting the clock,
 *   3. runs `iterations` timed passes,
 *   4. calls gl.finish() before stopping it,
 *   5. checks gl.getError() and asserts the frame drew,
 * and refuses to return a number if any of that fails.
 *
 * `canvasSelector` is used to find the GL context; pass `glExpr` to name it
 * directly (e.g. 'window.__gl').
 */
export async function timeGL(page, body, {
  iterations = 60, warmup = 10, canvasSelector = 'canvas', glExpr = null,
  requirePixels = true,
} = {}) {
  const src = typeof body === 'function' ? body.toString() : `(${body})`;
  const result = await page.evaluate(async (src, opts) => {
    const fn = eval(src);
    const gl = opts.glExpr
      ? eval(opts.glExpr)
      : (() => {
          const c = document.querySelector(opts.canvasSelector);
          if (!c) throw new Error(`no canvas matching ${opts.canvasSelector}`);
          return c.getContext('webgl2') ?? c.getContext('webgl');
        })();
    if (!gl) throw new Error('no GL context — cannot time GL work honestly');

    for (let i = 0; i < opts.warmup; i++) await fn(i);
    gl.finish();                                   // rule 1, entry side

    const t0 = performance.now();
    for (let i = 0; i < opts.iterations; i++) await fn(i);
    gl.finish();                                   // rule 1, exit side
    const t1 = performance.now();

    // rule 2: same task — error check and proof-of-draw
    const err = gl.getError();
    let drew = true;
    if (opts.requirePixels) {
      const px = new Uint8Array(4);
      gl.readPixels(
        Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2),
        1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      drew = px[0] !== 0 || px[1] !== 0 || px[2] !== 0 || px[3] !== 0;
    }
    return { ms: t1 - t0, iterations: opts.iterations, err, drew,
      width: gl.drawingBufferWidth, height: gl.drawingBufferHeight };
  }, src, { iterations, warmup, canvasSelector, glExpr, requirePixels });

  if (result.err !== 0) {
    throw new Error(`timeGL: gl.getError() = 0x${result.err.toString(16)} — the measurement is not trustworthy`);
  }
  if (requirePixels && !result.drew) {
    throw new Error('timeGL: centre pixel is transparent black — the frame did not draw, so the timing measures nothing');
  }
  return { ...result, msPerIteration: result.ms / result.iterations };
}

/**
 * Wait until the page is ready to be photographed.
 *
 * `readyExpr` is a JS expression that becomes true when the runtime has
 * booted (e.g. 'window.__lvReady === true'). After it resolves we render
 * `warmupFrames` more frames and force a GL flush, because a cold start
 * hitches through exactly the fades a screenshot is usually trying to catch.
 */
export async function warmUp(page, {
  readyExpr = null, warmupFrames = 8, timeout = 30000, canvasSelector = 'canvas',
} = {}) {
  if (readyExpr) await page.waitForFunction(readyExpr, { timeout });
  await page.evaluate(async (frames, sel) => {
    const c = document.querySelector(sel);
    const gl = c && (c.getContext('webgl2') ?? c.getContext('webgl'));
    for (let i = 0; i < frames; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    gl?.finish();
  }, warmupFrames, canvasSelector);
}

/**
 * Sample a value against the AUDIO clock, not rAF.
 *
 * `audioTimeExpr` must evaluate to the current audio position in seconds
 * (e.g. 'window.__audioCtx.currentTime' or a module's own position). The
 * sampler waits until that clock passes each requested time and reads
 * `valueExpr` there. Sampling on rAF instead is what invented a 77 % sync
 * error in a throttled headless window.
 */
export async function sampleAgainstAudioClock(page, times, {
  audioTimeExpr, valueExpr, timeout = 60000,
} = {}) {
  if (!audioTimeExpr) throw new Error('sampleAgainstAudioClock: audioTimeExpr is required — rAF is not an audio clock');
  const out = [];
  for (const t of times) {
    await page.waitForFunction(`(${audioTimeExpr}) >= ${t}`, { timeout });
    out.push({
      t,
      audioTime: await page.evaluate(`(${audioTimeExpr})`),
      value: await page.evaluate(`(${valueExpr})`),
    });
  }
  return out;
}

/**
 * Screenshot the canvas itself (not the page) after warming up.
 * Returns a PNG Buffer.
 */
export async function shootCanvas(page, {
  canvasSelector = 'canvas', readyExpr = null, warmupFrames = 8, timeout = 30000,
} = {}) {
  await warmUp(page, { readyExpr, warmupFrames, timeout, canvasSelector });
  const el = await page.$(canvasSelector);
  if (!el) throw new Error(`shootCanvas: no element matching ${canvasSelector}`);
  return el.screenshot({ type: 'png' });
}

/**
 * Assert a page ran clean: no uncaught errors, no failed requests, no
 * case-mismatched or missing server fetches. Throws with everything it found
 * rather than the first item, so one run tells you the whole story.
 */
export function assertClean({ errors = [], failedRequests = [] } = {}, server = null) {
  const problems = [
    ...errors.map((e) => `page error: ${e}`),
    ...failedRequests.map((r) => `request: ${r}`),
    ...(server?.caseErrors ?? []).map((c) => `case mismatch: ${c}`),
    ...(server?.missing ?? []).map((m) => `404: ${m}`),
  ];
  if (problems.length) {
    throw new Error(`page did not run clean (${problems.length}):\n  ` + problems.join('\n  '));
  }
}
