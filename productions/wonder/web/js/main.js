import { AssetCatalog } from './shared/asset-catalog.js';
import { envelopeTimes, parseEnvelope } from './shared/envelope.js';
import { parseExp } from './shared/exp.js';
import { ExpSceneRenderer } from './shared/exp-renderer.js';
import { MiniGL } from './shared/minigl.js';
import { LayeredTimeline } from './shared/timeline.js';
import { WONDER_EFFECT_CLIPS, WONDER_SHOW_END } from './show-data.js';
import { WonderShowClock } from './wonder-clock.js';
import { uploadWonderRawAssets } from './raw-assets.js';
import { BeginningEffect } from './effects/beginning.js';
import { BubbleEffect } from './effects/bubble.js';
import { wonderBubblebathFrame } from './effects/bubblebath.js';
import { BoxicalEffect } from './effects/boxical.js';
import { Boxical4Effect } from './effects/boxical4.js';
import { DarkHorizonEffect } from './effects/dark-horizon.js';
import { IntroOverlayEffect } from './effects/intro-overlay.js';
import { IntroductionPoemEffect } from './effects/introduction-poem.js';
import { MaxTextureTunnelEffect } from './effects/max-texture-tunnel.js';
import { ShiteDesignEffect } from './effects/shite-design.js';
import { SceneMaskEffect } from './effects/scene-mask.js';
import { SphericalEffect } from './effects/spherical.js';
import { CheckEffect } from './effects/check.js';
import { WonderBackdropEffect } from './effects/wonder-backdrop.js';
import { DustTunnelEffect } from './effects/dust-tunnel.js';
import { Woah3Effect } from './effects/woah3.js';
import { CreditsDesignEffect } from './effects/credits-design.js';
import { ClockEffect } from './effects/clock.js';
import { FacetedEffect } from './effects/faceted.js';
import { DesignTunnelEffect } from './effects/design-tunnel.js';
import { EndEffect } from './effects/end.js';
import { EnergyEffect } from './effects/energy.js';

const canvas = document.querySelector('#screen');
const status = document.querySelector('#status');
const startButton = document.querySelector('#start');
const parameters = new URLSearchParams(location.search);
const fixedTime = parameters.has('t') ? Number(parameters.get('t')) : null;
// ?inspect=1 installs the production-agnostic tooling adapter (window.__demo,
// see tools/inspect/ADAPTER.md) and hands every frame to the caller: no audio,
// no click gate, no rAF loop. It is `?t=` without a time — the page loads ready
// to render whatever it is asked for, repeatedly, within ONE page load.
const inspect = parameters.has('inspect');
// Both modes skip the module, the AudioContext and the transport.
const headless = fixedTime !== null || inspect;
const debug = parameters.has('debug');
// Wonder's per-frame triangle rejection (wonderFacingFlags), derived from
// FUN_004070d0 and proven at 100% against the engine's own dumped flags.
//
// SCOPED TO woah3.exp, because the consumer's bypass is not resolved yet: the gate
// at 0x004076cf skips rejection entirely when material[+0x94] != 0, and no port
// field is known to correspond to that runtime offset. Applying rejection to every
// scene costs parts whose materials evidently bypass it — effect_40c760 falls
// 0.939 -> 0.565, effect_40f8e0 0.922 -> 0.812, effect_40d060 0.902 -> 0.809.
// woah3's B2.LWO0n are the meshes the rule was actually verified against.
// `?cull=all` applies it everywhere, `?cull=off` disables it.
const cullMode = parameters.get('cull') ?? 'proven';
const onlyEffects = new Set(parameters.getAll('only')
  .flatMap((value) => value.split(','))
  .map((value) => value.trim())
  .filter(Boolean));
// Set by __demo.render({ only }) for the duration of one call. It is a separate
// binding rather than a mutation of onlyEffects because the two have different
// empty cases: an empty ?only= means "no filter", while an empty explicit whitelist
// means "composite nothing" — which is what an inspector unchecking every layer asks
// for. Collapsing them would draw the whole frame at the moment the user expects none.
let onlyOverride = null;
const designParts = new Set(parameters.getAll('design-parts')
  .flatMap((value) => value.split(','))
  .map((value) => value.trim())
  .filter(Boolean));
const designPasses = new Set(parameters.getAll('design-passes')
  .flatMap((value) => value.split(','))
  .map(Number)
  .filter(Number.isInteger));
if (parameters.has('embedded')) document.documentElement.classList.add('embedded');

async function loadBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`cannot load ${url}: ${response.status} ${response.statusText}`);
  return response.arrayBuffer();
}

async function loadText(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`cannot load ${url}: ${response.status} ${response.statusText}`);
  return response.text();
}

try {
  if (fixedTime !== null && !Number.isFinite(fixedTime)) throw new Error('?t must be a finite number of seconds');
  const mgl = new MiniGL(canvas);
  const [assets, moduleBytes, orderEnvelopeText, positionText, circleAlphaText, exitText,
    bubbleText, woahPulseText, facetedPulseText] = await Promise.all([
    AssetCatalog.load('./assets-manifest.json'),
    headless ? null : loadBytes('./assets/mystified.xm'),
    fixedTime !== null ? null : loadText('./assets/mystified.env'),
    loadText('./assets/wondertext_pos.env'),
    loadText('./assets/alpha_circle.env'),
    loadText('./assets/koniec_intra.env'),
    loadText('./assets/bubble.env'),
    loadText('./assets/napierdalanie.env'),
    loadText('./assets/napierdalanie2.env'),
  ]);
  // Manager 0x410bf0 receives a float and accepts start <= t <= end.
  const showTimeline = new LayeredTimeline(WONDER_EFFECT_CLIPS, {
    inclusiveEnd: true,
    float32Time: true,
  });
  const sceneNames = [...new Set(WONDER_EFFECT_CLIPS.flatMap((clip) =>
    clip.data.assets.filter((name) => /\.exp$/i.test(name))))];
  const sceneEntries = await Promise.all(sceneNames.map(async (name) => {
    const scene = parseExp(await loadBytes(`./assets/${name}`), { variant: 'wonder', source: name });
    // Wonder disables GL_LIGHTING during startup at 0x414398 and contains no
    // matching glEnable(GL_LIGHTING) call. EXP light records still participate
    // in scene updates, but the release renderer's textured draw callbacks are
    // unlit, including boxical.exp despite its exported Omni01.
    const renderer = new ExpSceneRenderer(mgl, scene, assets,
      { lighting: false,
        sphereMap: false,
        // woah3 only: the rejection is verified there and the material[+0x94]
        // bypass that governs other scenes is still unidentified.
        // DEFAULT: the derived per-frame rejection everywhere. Verified against
        // the oracle per mesh — at show 102.7967 the port reproduces the
        // executable's 6408 / 2499 / 2472 / 2439 / 2388 / 1944 vertex submission
        // and its alphas exactly. `fitted` selects the superseded placeholder,
        // `off` disables rejection entirely.
        facingCull: cullMode === 'off' ? false
          : cullMode === 'fitted' ? (/woah3/i.test(name) ? 'fitted' : false)
            : true });
    return [name, { scene, renderer }];
  }));
  const scenes = new Map(sceneEntries);
  const [, rawTextures] = await Promise.all([
    Promise.all([...scenes.values()].map(({ renderer }) => renderer.prepare())),
    uploadWonderRawAssets(mgl, assets),
  ]);
  const introOverlay = new IntroOverlayEffect(mgl, rawTextures, {
    position: parseEnvelope(positionText, 'wondertext_pos.env'),
    circleAlpha: parseEnvelope(circleAlphaText, 'alpha_circle.env'),
    exit: parseEnvelope(exitText, 'koniec_intra.env'),
  });
  const beginningTextures = new Map(await Promise.all([
    'overtake.jpg', 'overtake2.jpg', 'introductionpoem1.jpg',
    'DarkHorizonOfDreams1__.jpg', 'y1.jpg', 'max_t4.jpg',
    'MAX_T5.JPG', 'Water2.jpg', 'MAX_t3.jpg',
    'vsz_d2.jpg',
    'backg.jpg',
    'DustOnYourEyes__.jpg',
    'NebulaMultiCrater1.jpg', 'WatergreenWorld.jpg', 'y3.jpg',
    'd1.jpg', 'd1_.jpg',
  ]
    .map(async (name) => {
      const image = await assets.loadImage(name);
      mgl.activeTexture(0);
      // Wonder's upload paths set only GL_LINEAR min/mag filters
      // (0x406211/0x406231 and siblings); they never override OpenGL's
      // default GL_REPEAT wrap or build mipmaps. This matters for the runtime
      // maps installed into shite1.exp, whose U coordinates scroll through
      // many whole tiles, and for the minified procedural tunnel maps.
      return [name, mgl.createTextureFromImage(image, false, false)];
    })));
  const beginningEffect = new BeginningEffect(
    mgl,
    scenes.get('beginning.exp').renderer,
    beginningTextures,
    {
      circleAlpha: parseEnvelope(circleAlphaText, 'alpha_circle.env'),
      exit: parseEnvelope(exitText, 'koniec_intra.env'),
    },
  );
  const introductionPoem = new IntroductionPoemEffect(
    mgl, beginningTextures.get('introductionpoem1.jpg'),
  );
  const darkHorizon = new DarkHorizonEffect(
    mgl, beginningTextures.get('DarkHorizonOfDreams1__.jpg'),
  );
  const bubble = new BubbleEffect(
    mgl,
    beginningTextures.get('y1.jpg'),
    parseEnvelope(bubbleText, 'bubble.env'),
  );
  const maxTextureTunnel = new MaxTextureTunnelEffect(
    mgl, beginningTextures.get('max_t4.jpg'),
  );
  const boxical = new BoxicalEffect(mgl, scenes.get('boxical.exp').renderer);
  const boxical4 = new Boxical4Effect(mgl, scenes.get('boxical4.exp').renderer);
  const shiteDesign = new ShiteDesignEffect(
    mgl,
    scenes.get('shite1.exp').renderer,
    scenes.get('design_bw2.exp').renderer,
    beginningTextures,
  );
  const sceneMask = new SceneMaskEffect(mgl, beginningTextures.get('vsz_d2.jpg'));
  const spherical = new SphericalEffect(mgl, scenes.get('spherical.exp').renderer);
  const check = new CheckEffect(mgl, scenes.get('check.exp').renderer);
  const wonderBackdrop = new WonderBackdropEffect(
    mgl, beginningTextures.get('backg.jpg'),
  );
  const dustTunnel = new DustTunnelEffect(
    mgl, beginningTextures.get('DustOnYourEyes__.jpg'),
  );
  const woah3 = new Woah3Effect(
    mgl,
    scenes.get('woah3.exp').renderer,
    parseEnvelope(woahPulseText, 'napierdalanie.env'),
  );
  const creditsDesign = new CreditsDesignEffect(
    mgl,
    scenes.get('credits.exp').renderer,
    scenes.get('design_bw.exp').renderer,
  );
  const clockEffect = new ClockEffect(mgl, scenes.get('clock.exp').renderer);
  const facetedPulse = parseEnvelope(facetedPulseText, 'napierdalanie2.env');
  const faceted = new FacetedEffect(
    mgl,
    scenes.get('faceted.exp').renderer,
    scenes.get('faceted2.exp').renderer,
    facetedPulse,
  );
  const designTunnel = new DesignTunnelEffect(
    mgl,
    ['NebulaMultiCrater1.jpg', 'WatergreenWorld.jpg', 'y3.jpg']
      .map((name) => beginningTextures.get(name)),
    ['d1.jpg', 'd1_.jpg'].map((name) => beginningTextures.get(name)),
    facetedPulse,
  );
  const endEntry = scenes.get('end.exp');
  endEntry.renderer.materialTextures = endEntry.scene.materials.map((material) =>
    [rawTextures.get(material.textureNames[0])]);
  const endEffect = new EndEffect(mgl, endEntry.renderer, rawTextures.get('bump-map'));
  const energyEffect = new EnergyEffect(mgl, scenes.get('energy.exp').renderer);
  let clock = null;
  let playing = false;
  if (!headless) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is unavailable');
    const context = new AudioContext({ latencyHint: 'interactive' });
    const orderEnvelope = parseEnvelope(orderEnvelopeText, 'mystified.env');
    clock = new WonderShowClock(context, moduleBytes, envelopeTimes(orderEnvelope));
    startButton.addEventListener('click', async () => {
      startButton.disabled = true;
      try {
        if (playing) {
          await clock.pause();
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
    const seconds = Math.fround(Math.max(0, Math.min(requestedSeconds, WONDER_SHOW_END)));
    const activeClips = showTimeline.active(seconds).filter((clip) => (onlyOverride
      ? onlyOverride.has(clip.id)
      : onlyEffects.size === 0 || onlyEffects.has(clip.id)));
    // Composite effects once in manager order, rather than once per EXP
    // asset. In particular 0x40dab0 is a native scene layer despite owning
    // only DustOnYourEyes__.jpg; deriving this list from EXP filenames made
    // that entire pass disappear. Multi-scene effects already own their
    // renderers and need only the first entry for the one generic fallback.
    const sceneLayers = activeClips
      .filter((clip) => clip.id !== 'effect_4106a0'
        && (clip.id === 'effect_40dab0'
          || clip.data.assets.some((name) => /\.exp$/i.test(name))))
      .map((clip) => {
        const name = clip.data.assets.find((asset) => /\.exp$/i.test(asset));
        return { clip, name, entry: name ? scenes.get(name) : null };
      });
    let frame = 0;
    let cleared = false;
    const beginningClip = activeClips.find((clip) => clip.id === 'effect_4106a0');
    if (beginningClip) {
      const beginningFrame = beginningEffect.render(seconds - beginningClip.start, { clear: true });
      frame = beginningFrame.objectFrame;
      cleared = true;
    }
    const maxTextureClip = activeClips.find((clip) => clip.id === 'effect_40d060');
    let maxTextureRendered = false;
    const renderMaxTexture = () => {
      if (!maxTextureClip || maxTextureRendered) return;
      if (!cleared) mgl.clear();
      maxTextureTunnel.render(seconds - maxTextureClip.start);
      maxTextureRendered = true;
      cleared = true;
    };
    const designTunnelClip = activeClips.find((clip) => clip.id === 'effect_40b040');
    let designTunnelRendered = false;
    const renderDesignTunnel = () => {
      if (!designTunnelClip || designTunnelRendered) return;
      if (!cleared) mgl.clear();
      designTunnel.render(seconds - designTunnelClip.start, {
        surface: designParts.size === 0 || designParts.has('surface'),
        overlays: designParts.size === 0 || designParts.has('overlays'),
        surfacePasses: designPasses.size ? designPasses : null,
      });
      designTunnelRendered = true;
      cleared = true;
    };
    if (sceneLayers.length) {
      let shiteDesignRendered = false;
      let creditsDesignRendered = false;
      let facetedRendered = false;
      let wonderBackdropRendered = false;
      sceneLayers.forEach(({ clip, entry }) => {
        if (clip.layer > maxTextureClip?.layer) renderMaxTexture();
        if (clip.layer > designTunnelClip?.layer) renderDesignTunnel();
        if (clip.id === 'effect_40c760') {
          const state = boxical.render(seconds - clip.start, { clear: !cleared });
          frame = state.frames[1];
        } else if (clip.id === 'effect_40ec40') {
          if (shiteDesignRendered) return;
          const state = shiteDesign.render(seconds - clip.start, { clear: !cleared });
          frame = state.shiteObjectFrame;
          shiteDesignRendered = true;
        } else if (clip.id === 'effect_40f2f0') {
          sceneMask.render(seconds - clip.start);
          frame = 0;
        } else if (clip.id === 'effect_410100') {
          const state = spherical.render(seconds - clip.start, { clear: !cleared });
          frame = state.frame;
        } else if (clip.id === 'effect_40cea0') {
          const state = boxical4.render(seconds - clip.start, { clear: !cleared });
          frame = state.frames[1];
        } else if (clip.id === 'effect_40ccc0') {
          const state = check.render(seconds - clip.start, { clear: !cleared });
          frame = state.frames[1];
        } else if (clip.id === 'effect_40fe10') {
          if (wonderBackdropRendered) return;
          wonderBackdrop.render();
          frame = 0;
          wonderBackdropRendered = true;
        } else if (clip.id === 'effect_40dab0') {
          dustTunnel.render(seconds - clip.start);
          frame = 0;
        } else if (clip.id === 'effect_410300') {
          const state = woah3.render(seconds - clip.start, { clear: !cleared });
          frame = state.objectFrame;
        } else if (clip.id === 'effect_40fa30') {
          if (creditsDesignRendered) return;
          const state = creditsDesign.render(seconds - clip.start, { clear: !cleared });
          frame = state.creditsFrame;
          creditsDesignRendered = true;
        } else if (clip.id === 'effect_40fc00') {
          const state = clockEffect.render(seconds - clip.start, { clear: !cleared });
          frame = state.frames.at(-1);
        } else if (clip.id === 'effect_40c990') {
          if (facetedRendered) return;
          const state = faceted.render(seconds - clip.start, { clear: !cleared });
          frame = state.firstFrame;
          facetedRendered = true;
        } else if (clip.id === 'effect_40bfa0') {
          const state = endEffect.render(seconds - clip.start, { clear: !cleared });
          frame = state.sceneFrame;
        } else if (clip.id === 'effect_40ea30') {
          const state = energyEffect.render(seconds - clip.start, { clear: !cleared });
          frame = state.frame;
        } else if (clip.id === 'effect_40f8e0') {
          frame = wonderBubblebathFrame(seconds - clip.start);
          entry.renderer.render(frame, { clear: !cleared });
        } else {
          throw new Error(`Wonder clip ${clip.id} has no class-specific renderer`);
        }
        cleared = true;
      });
    }
    renderMaxTexture();
    renderDesignTunnel();
    if (!cleared) {
      mgl.clear();
    }
    const darkClip = activeClips.find((clip) => clip.id === 'effect_40d790');
    if (darkClip) darkHorizon.render(seconds - darkClip.start);
    const introClip = activeClips.find((clip) => clip.id === 'effect_40de00');
    if (introClip) introOverlay.render(seconds - introClip.start);
    const poemClip = activeClips.find((clip) => clip.id === 'effect_4138a0');
    if (poemClip) introductionPoem.render(seconds - poemClip.start);
    const bubbleClip = activeClips.find((clip) => clip.id === 'effect_408ca0');
    if (bubbleClip) bubble.render(seconds - bubbleClip.start);
    const active = activeClips.map((clip) => clip.id);
    // Nothing on screen unless ?debug: the page is the demo, not a dev harness.
    // Inspection moved to the shared tooling (tools/inspect, ?inspect=1).
    status.textContent = debug
      ? `t=${seconds.toFixed(3)}s frame=${frame.toFixed(2)} active=${active.join(',') || 'none'}`
      : '';
    return { seconds, frame, active };
  };
  const draw = () => {
    renderAt(fixedTime === null ? clock.timeSeconds() : fixedTime);
    if (fixedTime === null && clock.ended) {
      clock.pause();
      playing = false;
      startButton.disabled = true;
      startButton.textContent = 'Ended';
    } else if (fixedTime === null) {
      requestAnimationFrame(draw);
    }
  };
  // In inspect mode the tooling drives every frame itself, so there is no loop.
  if (!inspect) requestAnimationFrame(draw);
  window.__wonderScene = scenes.get('beginning.exp').scene;
  window.__wonderScenes = scenes;
  window.__wonderClock = clock;
  window.__wonderTimeline = showTimeline;
  window.__wonderRawTextures = rawTextures;
  window.__wonderRenderAt = renderAt;

  // ---- INSPECTOR ADAPTER (tools/inspect/ADAPTER.md).
  //
  // Everything production-specific about Wonder lives here, so the repo-level
  // sweep, inspector and issue sync work on it without knowing anything about
  // it. Two things differ from Lapsus, the contract's first implementer, and
  // both are worth stating because they are what makes this a second data
  // point rather than a copy:
  //
  //  1. ONE CLOCK, NOT TWO. Lapsus has an MP3 per phase with a load between
  //     them, so its plan entries carry a per-phase offset. Wonder is a single
  //     continuous show, so captureTime is just showTime + the capture phase.
  //
  //  2. CLIPS OVERLAP; A "PART" DOES NOT OWN THE SCREEN. Lapsus parts are
  //     exclusive — one is on screen at a time. Wonder's manager (0x410bf0)
  //     runs a LAYERED timeline and several effects are live at once, so a
  //     sample attributed to a clip means "the whole frame while this clip was
  //     active". A low score therefore indicts the frame, not necessarily that
  //     clip, and `state().active` lists everything that contributed.
  //
  // CAPTURE PHASE IS EXPLICIT AND NOT BAKED IN, per work/reference/README.md:
  // the executable calls FSOUND_SetMixAhead(30) and drives visuals from
  // FMUSIC_GetOrder, so visuals lead audible output by ~30ms, and the 30fps
  // capture would add another 0-33ms of frame phase. Only the engine's 30ms
  // belongs in playback; `captureOffsetMs` carries the rest as a comparison-only
  // quantity — the same split Lapsus needed between trackOffsetsMs (audio) and
  // visualTrackOffsetsMs (frames), arrived at independently on both ports.
  //
  // MEASURED 2026-08-20 as +83.3ms = exactly FIVE frames of the 60fps capture.
  //
  // It was 0 until then, on a measurement that had selected against itself: the
  // offset was estimated from six WELL-MATCHING samples, and a well-matching
  // sample is precisely one whose phase scan is FLAT, so those six were the six
  // least able to see an offset. Re-measuring on samples with sharp scans, spread
  // from capture 1.2s to 183.8s, all EIGHTEEN peak at a positive offset (median
  // +0.08s, none negative; under a true zero that is a 1-in-260,000 coincidence).
  //
  // Three independent things then agree it is real rather than a score-grab:
  //   * the sweep median is single-peaked in the offset - 0.727 at 50ms, 0.762 at
  //     75ms, 0.767 at 80-85ms, 0.732 at 100ms - so it is an optimum, not a slope;
  //   * 80ms and 85ms score identically because ffmpeg -ss snaps to a frame, and
  //     both land on frame 5. The quantity being measured is an integer number of
  //     capture frames, which is what a capture START offset physically is;
  //   * it is constant across 180 seconds. A clock-RATE error would grow.
  //
  // The phase is still somewhat variable (three parts prefer a smaller offset and
  // lose ~0.09), so this is the best single constant, not an exact description.
  // COMPARISON ONLY: nothing but __demo.schedule()'s captureStart reads it, so it
  // cannot affect playback. `?capoff=<ms>` overrides it for re-measurement.
  // Order boundaries in seconds, when the envelope was loaded (everything but a
  // bare ?t= render). Drives __demo.positionAt.
  const ORDER_TIMES = orderEnvelopeText
    ? envelopeTimes(parseEnvelope(orderEnvelopeText, 'mystified.env')) : null;
  const CLIPS = WONDER_EFFECT_CLIPS.map((clip) => ({
    name: clip.id, phase: 1, start: clip.start, dur: clip.end - clip.start,
    assets: clip.data?.assets ?? [],
  }));
  // ?capoff=<ms> overrides it, so the constant can be MEASURED through the same
  // adapter the sweep uses rather than guessed.
  const captureOffsetMs = parameters.has('capoff') ? Number(parameters.get('capoff')) : 83.3;
  let lastState = null;
  window.__demo = {
    id: 'wonder',
    schedule: () => CLIPS.map((c) => ({
      name: c.name, phase: c.phase, start: c.start, dur: c.dur,
      captureStart: c.start + captureOffsetMs / 1000,
    })),
    // plan() intentionally omitted: the sample grid lives in
    // tools/inspect/plan.mjs so the five-sample floor cannot drift between
    // productions. Supply plan() here only to OVERRIDE it, and keep
    // tools/inspect/plan-identity.mjs passing so the override stays deliberate.
    // `only` is OPTIONAL and has exactly the semantics of ?only= : a WHITELIST of
    // clip ids to composite. Omitted or null renders whatever the URL asked for,
    // which is the unchanged behaviour every existing caller relies on.
    //
    // It is applied per CALL rather than through a setter because ADAPTER.md
    // requires render() to be deterministic and state() to be a pure function of
    // the last render() argument. A mutator would put the enabled set somewhere
    // state() would have to reflect, and the sweep depends on that purity.
    //
    // The swap is safe because the filter is evaluated fresh on every renderAt and
    // nothing derives from it at load time. It is restored in a finally so a throwing
    // render cannot leave the page filtered.
    async render({ part, local, only = null }) {
      const c = CLIPS.find((x) => x.name === part);
      if (!c) return null;
      const previous = onlyOverride;
      if (only) onlyOverride = new Set(only);
      try {
        // renderAt takes ABSOLUTE show time and is safe to call repeatedly, which
        // is what lets a whole sweep run in one page load.
        const info = renderAt(c.start + local);
        lastState = { ...info, part, local, glError: mgl.gl ? mgl.gl.getError() : 0 };
        return lastState;
      } finally {
        onlyOverride = previous;
      }
    },
    // What this adapter supports beyond the required surface, so the inspector can
    // hide controls that would silently do nothing on a port without them.
    features: { only: true },
    state: () => lastState,
    assets: (part) => CLIPS.find((x) => x.name === part)?.assets ?? null,
    // OPTIONAL: a MUSICAL coordinate for the timeline axis.
    //
    // Show time is monotonic but says nothing about where you are in the piece.
    // Wonder's executable drives its visuals from FMUSIC_GetOrder, so the XM
    // ORDER is the coordinate the demo itself thinks in, and mystified.env maps
    // order boundaries to seconds. Returning a short label keeps this generic:
    // the inspector prints whatever string it gets and needs to know nothing
    // about trackers. A production with no musical structure simply omits this.
    positionAt(showTime) {
      if (!ORDER_TIMES?.length) return null;
      let i = 0;
      while (i + 1 < ORDER_TIMES.length && ORDER_TIMES[i + 1] <= showTime) i++;
      return showTime < ORDER_TIMES[0] ? null : `order ${i}`;
    },
  };
  // Ready LAST, after __demo exists, so a harness that waits on either flag can
  // rely on the adapter being installed rather than racing it. __demoReady is
  // the CONTRACT's flag (tools/inspect/ADAPTER.md); __wonderReady is Wonder's
  // own, kept because its existing tests and shared/sunflower/test wait on it.
  window.__demoReady = true;
  window.__wonderReady = true;
} catch (error) {
  status.textContent = error.message;
  throw error;
}
