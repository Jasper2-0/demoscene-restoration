// MODE:       CHECK — node:assert/strict, so a failed checkpoint exits non-zero.
// OBSERVABLE: the set of effects the port reports ACTIVE at fixed show seconds,
//             against boundaries read from FUN_0040d950's paired x87 comparisons.
// UNITS:      show seconds. Checkpoints are boundaries plus midpoints, not a sweep.
import assert from 'node:assert/strict';
import { assertClean, withPage } from '../../../../tools/harness/index.mjs';

// Boundary probes come directly from the paired x87 comparisons in
// FUN_0040d950. Midpoints exercise every expensive procedural compositor
// without the old quadratic one-second sweep repeatedly rebuilding them.
const CHECKPOINTS = Object.freeze([
  { seconds: 0, active: [] },
  { seconds: 1, visible: true, active: [
    'early_renderer_411e10_410470', 'effect_40f070_opening',
    'opening_dots_40c6f0', 'opening_logo_412750',
  ] },
  { seconds: 12, active: [
    'early_renderer_411e10_410470', 'effect_40f070_opening',
    'opening_dots_40c6f0', 'opening_logo_412750',
  ] },
  { seconds: 12.001, active: [
    'early_renderer_411e10_410470', 'texture_D2_3',
    'effect_40f070_opening', 'opening_dots_40c6f0', 'opening_logo_412750',
  ] },
  { seconds: 56, active: [
    'kurwa2_scene', 'freak_scene', 'compositor_mode_2',
  ] },
  { seconds: 60, visible: true, active: [
    'main_effect_410f90', 'kurwa2_scene', 'freak_scene', 'compositor_mode_2',
  ] },
  { seconds: 82, active: [
    'main_effect_410f90', 'kurwa2_scene', 'kurwa_scene', 'freak_scene',
  ] },
  { seconds: 82.001, active: [
    'main_effect_410f90', 'kurwa_scene', 'transition_wave_dot',
  ] },
  { seconds: 122, active: [
    'main_effect_410f90', 'kurwa_scene', 'transition_wave_dot',
  ] },
  { seconds: 127, visible: true, active: [
    'main_effect_410f90', 'transition_wave_dot', 'effect_40f070',
  ] },
  { seconds: 132, active: [
    'main_effect_410f90', 'transition_wave_dot',
  ] },
  { seconds: 144.5, visible: true, active: [
    'main_effect_410f90', 'scene6_scene', 'compositor_mode_4',
  ] },
  { seconds: 156, active: [
    'main_effect_410f90', 'scene6_scene', 'compositor_mode_4',
  ] },
  { seconds: 157, active: ['scene6_scene', 'overlay_413050'] },
  { seconds: 170, visible: true, active: ['overlay_413050'] },
  { seconds: 182, active: [] },
  { seconds: 207.5, visible: true, active: ['main_effect_mode_3_overlay'] },
  { seconds: 233, active: [] },
  { seconds: 250, visible: true, active: [
    'late_effect_pair_410f90_410470', 'effect_40f570',
  ] },
  { seconds: 290, active: [] },
]);

await withPage({
  root: 'productions/energia/web',
  path: '/index.html',
  query: '?t=0&debug',
  width: 1024,
  height: 768,
}, async ({ page, server, errors, failedRequests }) => {
  await page.waitForFunction('window.__energiaReady === true', { timeout: 30000 });

  const boot = await page.evaluate(() => ({
    rawTextures: window.__energiaRawTextures?.size,
    clips: window.__energiaTimeline?.clips.length,
  }));
  assert.equal(boot.rawTextures, 8, 'all Energia raw textures should upload');
  assert.equal(boot.clips, 21, 'all recovered Energia clips should register');

  for (const checkpoint of CHECKPOINTS) {
    const result = await page.evaluate(({ seconds, visible }) => {
      const frame = window.__energiaRenderAt(seconds);
      const gl = document.querySelector('canvas').getContext('webgl2');
      gl.finish();
      const glError = gl.getError();
      let nonBlack = null;
      if (visible) {
        const pixels = new Uint8Array(
          gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
        );
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight,
          gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        nonBlack = 0;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset] || pixels[offset + 1] || pixels[offset + 2]) nonBlack++;
        }
      }
      return { ...frame, glError, nonBlack };
    }, checkpoint);

    assert.equal(result.glError, 0, `WebGL error at ${checkpoint.seconds}s`);
    assert.deepEqual(result.active, checkpoint.active,
      `native gate mismatch at ${checkpoint.seconds}s`);
    if (checkpoint.visible) {
      assert.ok(result.nonBlack > 16,
        `frame at ${checkpoint.seconds}s should contain visible pixels`);
    }
    console.log(
      `Energia ${checkpoint.seconds.toFixed(3)}s: `
      + `active=${result.active.join(',') || 'none'} gl=0`
      + (checkpoint.visible ? ` pixels=${result.nonBlack}` : ''),
    );
  }

  assertClean({ errors, failedRequests }, server);
});

console.log(`Energia browser verification passed (${CHECKPOINTS.length} checkpoints)`);
