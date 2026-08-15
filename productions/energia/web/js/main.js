import { AssetCatalog } from './shared/asset-catalog.js';
import { MediaShowClock } from './shared/audio-clock.js';
import { parseExp } from './shared/exp.js';
import { ExpSceneRenderer } from './shared/exp-renderer.js';
import { MiniGL } from './shared/minigl.js';
import { LayeredTimeline } from './shared/timeline.js';
import { ENERGIA_PHASE_CLIPS, ENERGIA_SCENE_CLIPS } from './show-data.js';
import { uploadEnergiaRawAssets } from './raw-assets.js';
import { EnergiaDotFieldEffect } from './effects/dot-field.js';
import { EnergiaHardcodedCylinderEffect } from './effects/hardcoded-cylinder.js';
import { EnergiaLateCylinderEffect } from './effects/late-cylinder.js';
import {
  EnergiaLateOverlayEffect, energiaLateOverlaySceneState,
} from './effects/late-overlay.js';
import { EnergiaMainTriangleEffect } from './effects/main-triangles.js';
import { EnergiaMode2ParticleEffect } from './effects/mode2-particles.js';
import { EnergiaMode3LatticeEffect } from './effects/mode3-lattice.js';
import { EnergiaMode4MetaballEffect } from './effects/mode4-metaballs.js';
import { EnergiaOpeningDotsEffect } from './effects/opening-dots.js';
import { EnergiaSunflowerLogoEffect } from './effects/sunflower-logo.js';
import { TextureOverlayEffect } from './effects/texture-overlay.js';
import { EnergiaWaveFieldEffect } from './effects/wave-field.js';

const canvas = document.querySelector('#screen');
const status = document.querySelector('#status');
const startButton = document.querySelector('#start');
const parameters = new URLSearchParams(location.search);
const fixedTime = parameters.has('t') ? Number(parameters.get('t')) : null;
const debug = parameters.has('debug');

async function loadBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`cannot load ${url}: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

try {
  if (fixedTime !== null && !Number.isFinite(fixedTime)) throw new Error('?t must be a finite number of seconds');
  const mgl = new MiniGL(canvas);
  const assets = await AssetCatalog.load('./assets-manifest.json');
  const managedSceneNames = [...new Set(ENERGIA_SCENE_CLIPS.map((clip) => clip.data.scene))];
  const sceneNames = ['nowheretorun.exp', ...managedSceneNames];
  const sceneEntries = await Promise.all(sceneNames.map(async (name) => {
    const scene = parseExp(await loadBytes(`./assets/${name}`), { variant: 'energia', source: name });
    const renderer = new ExpSceneRenderer(mgl, scene, assets, { lighting: true, sphereMap: true });
    return [name, { scene, renderer }];
  }));
  const scenes = new Map(sceneEntries);
  const fallback = scenes.get('nowheretorun.exp');
  // The native clock and every gate operand are stored as 32-bit floats.
  // Per-clip boundary flags distinguish the inclusive EXP manager from the
  // strict compiled master-frame comparisons.
  const showTimeline = new LayeredTimeline(
    [...ENERGIA_PHASE_CLIPS, ...ENERGIA_SCENE_CLIPS],
    { float32Time: true },
  );
  const [, rawTextures] = await Promise.all([
    Promise.all([...scenes.values()].map(({ renderer }) => renderer.prepare())),
    uploadEnergiaRawAssets(mgl, assets),
  ]);
  const overlayNames = [...new Set([
    ...ENERGIA_PHASE_CLIPS.map((clip) => clip.data?.texture).filter(Boolean),
    ...ENERGIA_PHASE_CLIPS.map((clip) => clip.data?.effectTexture).filter(Boolean),
    'dust.jpg', 'back_gradient.jpg', 'dot.jpg', 'sotku2.jpg', 'water2.jpg',
    'yellowshitred.jpg', 'skymap.jpg',
  ])];
  const overlayTextures = new Map(await Promise.all(overlayNames.map(async (name) => {
    const image = await assets.loadImage(name);
    return [name, mgl.createTextureFromImage(image, true, true)];
  })));
  const textureOverlay = new TextureOverlayEffect(mgl, overlayTextures);
  const [waveBytes, twirlBytes, dispBytes] = await Promise.all([
    assets.loadBytes('wave1.raw').then((bytes) => new Uint8Array(bytes)),
    assets.loadBytes('twirlB.raw').then((bytes) => new Uint8Array(bytes)),
    assets.loadBytes('DISP2.raw').then((bytes) => new Uint8Array(bytes)),
  ]);
  const waveField = new EnergiaWaveFieldEffect(mgl, waveBytes, {
    dust: overlayTextures.get('dust.jpg'),
    gradient: overlayTextures.get('back_gradient.jpg'),
  });
  const dotField = new EnergiaDotFieldEffect(mgl, overlayTextures.get('dot.jpg'));
  const hardcodedCylinder = new EnergiaHardcodedCylinderEffect(
    mgl, waveBytes, twirlBytes, overlayTextures,
  );
  const lateCylinder = new EnergiaLateCylinderEffect(
    mgl, dispBytes, waveBytes, overlayTextures.get('kalju3512.jpg'),
  );
  const mainTriangles = new EnergiaMainTriangleEffect(mgl);
  const lateOverlay = new EnergiaLateOverlayEffect(mgl);
  const mode2Particles = new EnergiaMode2ParticleEffect(mgl);
  const mode3Lattice = new EnergiaMode3LatticeEffect(mgl, overlayTextures.get('skymap.jpg'));
  const mode4Metaballs = new EnergiaMode4MetaballEffect(mgl, {
    primary: overlayTextures.get('sotku2.jpg'),
    reflection: overlayTextures.get('water2.jpg'),
  });
  const openingDots = new EnergiaOpeningDotsEffect(mgl, overlayTextures.get('dot.jpg'));
  const sunflowerLogo = new EnergiaSunflowerLogoEffect(mgl, {
    sharp: rawTextures.get('s.raw'),
    blurred: rawTextures.get('sb.raw'),
  });
  let clock = null;
  let playing = false;
  if (fixedTime === null) {
    const audioUrl = assets.resolve('energia.mp3');
    if (!audioUrl) throw new Error('Energia soundtrack is absent from the asset manifest');
    const audio = new Audio(audioUrl.href);
    audio.preload = 'auto';
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is unavailable');
    const context = new AudioContext({ latencyHint: 'playback' });
    context.createMediaElementSource(audio).connect(context.destination);
    clock = new MediaShowClock(audio, { audioContext: context });
    startButton.addEventListener('click', async () => {
      startButton.disabled = true;
      try {
        if (playing) {
          clock.pause();
          playing = false;
          startButton.textContent = 'Resume sound';
        } else {
          await clock.start();
          playing = true;
          startButton.textContent = 'Pause';
        }
      } finally {
        startButton.disabled = false;
      }
    });
  } else {
    startButton.hidden = true;
  }
  const renderAt = (requestedSeconds) => {
    if (!Number.isFinite(requestedSeconds)) throw new Error('render time must be finite');
    const seconds = Math.max(0, Math.min(requestedSeconds, 290));
    const activeClips = showTimeline.active(seconds);
    const sceneClips = activeClips.filter((clip) => clip.data?.scene);
    const lateOverlayClip = activeClips.find((clip) => [
      'overlay_413050', 'main_effect_mode_3_overlay',
    ].includes(clip.id));
    const lateLocal = lateOverlayClip ? seconds - lateOverlayClip.start : null;
    const lateMode = lateOverlayClip?.id === 'main_effect_mode_3_overlay' ? 3 : 1;
    const renderLateScene = (clear) => {
      const state = energiaLateOverlaySceneState(lateLocal, lateMode, fallback.scene.meshes.length);
      fallback.renderer.render(state.frame, {
        clear,
        depthWrite: false,
        opacityScale: state.opacityScale,
        materialTextureOffsets: new Map([[0, state.textureOffset]]),
        materialTextureRotations: new Map([[0, state.textureRotationRate * seconds]]),
        materialTextureOverrides: new Map([[
          0, [overlayTextures.get(state.texture)],
        ]]),
        // Animation-controller mode 2 at 0x41df20 computes custom * sampled.
        meshMatrixOverrides: (index, sampledMesh) => (
          state.matrices[index].clone().mult(sampledMesh.matrix)
        ),
      });
      return state.frame;
    };
    const mainTrianglesActive = activeClips.some((clip) => [
      'main_effect_410f90',
      'late_effect_pair_410f90_410470',
      'main_effect_mode_3_overlay',
    ].includes(clip.id));
    let frame = 0;
    if (activeClips.some((clip) => clip.id === 'early_renderer_411e10_410470')) {
      frame = seconds;
      waveField.render(seconds, { clear: true });
      dotField.render(seconds);
    } else if (mainTrianglesActive) {
      frame = seconds;
      mainTriangles.render(seconds, { clear: true });
      if (activeClips.some((clip) => clip.id === 'late_effect_pair_410f90_410470')) {
        dotField.render(seconds);
      }
      sceneClips.forEach((clip, index) => {
        const entry = scenes.get(clip.data.scene);
        const progress = (seconds - clip.start) / (clip.end - clip.start);
        frame = Math.max(0, Math.min(entry.scene.frameEnd, progress * entry.scene.frameEnd));
        entry.renderer.render(frame, { clear: false });
      });
    } else if (sceneClips.length) {
      sceneClips.forEach((clip, index) => {
        const entry = scenes.get(clip.data.scene);
        const progress = (seconds - clip.start) / (clip.end - clip.start);
        frame = Math.max(0, Math.min(entry.scene.frameEnd, progress * entry.scene.frameEnd));
        entry.renderer.render(frame, { clear: index === 0 });
      });
    } else if (lateOverlayClip) {
      frame = renderLateScene(true);
    } else {
      // The nowheretorun scene was an early diagnostic scaffold, not a native
      // catch-all layer. Exact strict-gate boundaries have no master effect.
      mgl.clear();
    }
    const textureClip = activeClips.find((clip) => clip.data?.texture);
    if (textureClip) textureOverlay.render(textureClip.data.texture);
    if (activeClips.some((clip) => clip.id === 'compositor_mode_2')) {
      mode2Particles.render(seconds);
    }
    if (activeClips.some((clip) => clip.id === 'transition_wave_dot')) {
      waveField.render(seconds, { cameraStart: 82 });
      dotField.render(seconds);
    }
    const hardcodedCylinderClip = activeClips.find(
      (clip) => clip.data?.effect === '0x40f070',
    );
    if (hardcodedCylinderClip) {
      hardcodedCylinder.render(seconds, {
        startSeconds: hardcodedCylinderClip.data.phaseStart,
        texture: overlayTextures.get(hardcodedCylinderClip.data.effectTexture),
      });
    }
    if (activeClips.some((clip) => clip.id === 'effect_40f570')) {
      lateCylinder.render(seconds);
    }
    if (activeClips.some((clip) => clip.id === 'opening_dots_40c6f0')) {
      openingDots.render(seconds);
    }
    if (activeClips.some((clip) => clip.id === 'opening_logo_412750')) {
      sunflowerLogo.render(seconds);
    }
    // Native compositor mode 3 is submitted after 0x410f90 and before the
    // nowheretorun.exp / 0x413050 late overlay pair.
    if (activeClips.some((clip) => clip.id === 'main_effect_mode_3_overlay')) {
      mode3Lattice.render(seconds);
    }
    if (lateOverlayClip) {
      if (mainTrianglesActive || sceneClips.length) frame = renderLateScene(false);
      lateOverlay.render(lateLocal);
    }
    // This call is last in the native master frame, after 0x413050.
    if (activeClips.some((clip) => clip.id === 'compositor_mode_4')) {
      mode4Metaballs.render(seconds);
    }
    const active = activeClips.map((clip) => clip.id);
    status.textContent = debug
      ? `Energia restoration — t=${seconds.toFixed(3)}s frame=${frame.toFixed(2)} active=${active.join(',') || 'none'}`
      : 'Energia restoration';
    return { seconds, frame, active };
  };
  const draw = () => {
    renderAt(fixedTime ?? clock.timeSeconds());
    if (fixedTime === null) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  window.__energiaReady = true;
  window.__energiaScene = fallback.scene;
  window.__energiaScenes = scenes;
  window.__energiaClock = clock;
  window.__energiaTimeline = showTimeline;
  window.__energiaRawTextures = rawTextures;
  window.__energiaOverlayTextures = overlayTextures;
  window.__energiaMainTriangles = mainTriangles;
  window.__energiaLateOverlay = lateOverlay;
  window.__energiaMode2Particles = mode2Particles;
  window.__energiaMode3Lattice = mode3Lattice;
  window.__energiaMode4Metaballs = mode4Metaballs;
  window.__energiaHardcodedCylinder = hardcodedCylinder;
  window.__energiaLateCylinder = lateCylinder;
  window.__energiaOpeningDots = openingDots;
  window.__energiaSunflowerLogo = sunflowerLogo;
  window.__energiaRenderAt = renderAt;
} catch (error) {
  status.textContent = error.message;
  throw error;
}
