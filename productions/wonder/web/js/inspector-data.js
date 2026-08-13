function part(name, usage, assets) {
  return Object.freeze({ name, usage, assets: Object.freeze(assets) });
}

/** Semantic labels and direct asset roles for the compiled Wonder effect list. */
export const WONDER_EFFECT_METADATA = Object.freeze({
  effect_4106a0: {
    name: 'Beginning scene + overtake',
    description: 'Animated opening geometry under a two-image additive crossfade.',
    parts: [
      part('Opening geometry and animation', 'scene', ['beginning.exp']),
      part('Overtake crossfade', 'texture', ['overtake.jpg', 'overtake2.jpg']),
      part('Pulse and exit controls', 'control', ['alpha_circle.env', 'koniec_intra.env']),
    ],
  },
  effect_40d790: {
    name: 'Dark horizon planes',
    description: 'Eight additive image planes moving through the opening scene.',
    parts: [part('Plane texture', 'texture', ['DarkHorizonOfDreams1__.jpg'])],
  },
  effect_40de00: {
    name: 'Wonder title / face / circle',
    description: 'Three composited title cards with animated position, pulse and exit.',
    parts: [
      part('Wonder title card', 'texture', ['d1_wonder2.jpg', 'D1_WonderAlpha.tga']),
      part('Face card', 'texture', ['d1_face.jpg', 'D1_FaceAlpha.tga']),
      part('Circle card', 'texture', ['d1_circle2.jpg', 'D1_CircleAlpha.tga']),
      part('Card transforms and opacity', 'control', ['wondertext_pos.env', 'alpha_circle.env', 'koniec_intra.env']),
    ],
  },
  effect_40c760: {
    name: 'Boxical',
    description: 'Two offset passes of the animated Boxical scene.',
    parts: [part('Scene geometry, animation and material maps', 'scene', ['boxical.exp'])],
  },
  effect_40d060: {
    name: 'MAX card tunnel',
    description: 'Two procedural strands of additive cards.',
    parts: [part('Card texture', 'texture', ['max_t4.jpg'])],
  },
  effect_40f8e0: {
    name: 'Bubblebath scene',
    description: 'Depth-tested EXP scene driven by a local frame clock.',
    parts: [
      part('Scene geometry and animation', 'scene', ['bubblebath.exp']),
      part('Scene material texture', 'texture', ['vsz_d2.jpg']),
    ],
  },
  effect_4138a0: {
    name: 'Introduction poem',
    description: 'Full-screen poem card with a sinusoidal opacity envelope.',
    parts: [part('Poem card', 'texture', ['introductionpoem1.jpg'])],
  },
  effect_408ca0: {
    name: 'Spline bubble surface',
    description: 'Procedural Catmull–Rom surface rendered in two additive texture passes.',
    parts: [
      part('Surface texture', 'texture', ['y1.jpg']),
      part('Camera control', 'control', ['bubble.env']),
    ],
  },
  effect_40ec40: {
    name: 'Shite + design scenes',
    description: 'Two design passes followed by four deformed scene-mesh passes.',
    parts: [
      part('Deformed primary scene', 'scene', ['shite1.exp']),
      part('Design layer scene', 'scene', ['design_bw2.exp']),
      part('Runtime material replacements', 'texture', ['MAX_T5.JPG', 'Water2.jpg', 'MAX_t3.jpg']),
    ],
  },
  effect_40f2f0: {
    name: 'Immediate-mode scene mask',
    description: 'Sliding image, waveform bars, alpha mask and six strips.',
    parts: [
      part('Visible mask texture', 'texture', ['vsz_d2.jpg']),
      part('Constructed but not read while drawing', 'loaded', ['scene.exp']),
    ],
  },
  effect_410100: {
    name: 'Spherical',
    description: 'Three scrolling additive materials over an animated EXP scene.',
    parts: [part('Scene geometry, animation and material maps', 'scene', ['spherical.exp'])],
  },
  effect_40cea0: {
    name: 'Boxical 4',
    description: 'Two alpha-blended scene passes four frames apart.',
    parts: [part('Scene geometry, animation and material maps', 'scene', ['boxical4.exp'])],
  },
  effect_40ccc0: {
    name: 'Check',
    description: 'Two additive scene passes with a fast texture scroll.',
    parts: [part('Scene geometry, animation and material maps', 'scene', ['check.exp'])],
  },
  effect_40fe10: {
    name: 'Wonder backdrop',
    description: 'Centered full-screen WONDER image; the two scenes are constructor-only.',
    parts: [
      part('Visible backdrop', 'texture', ['backg.jpg']),
      part('Loaded but not read while drawing', 'loaded', ['stars.exp', 'speedy.exp']),
    ],
  },
  effect_40dab0: {
    name: 'Dust card tunnel',
    description: 'Sixteen additive cards in two rotating strands.',
    parts: [part('Card texture', 'texture', ['DustOnYourEyes__.jpg'])],
  },
  effect_410300: {
    name: 'Woah3 layered scene',
    description: 'Textured QuadPatch/Original geometry plus four envelope-faded LWO passes.',
    parts: [
      part('Scene geometry and animation', 'scene', ['woah3.exp']),
      part('Pulse control', 'control', ['napierdalanie.env']),
      part('Scene material image', 'texture', ['unrd1.jpg']),
      part('Constructed composite maps with no render read', 'loaded', ['unrd1.raw', 'unrd3.raw']),
    ],
  },
  effect_40fa30: {
    name: 'Credits + design',
    description: 'Animated design scene followed by the seven-material credits scene.',
    parts: [
      part('Design scene', 'scene', ['design_bw.exp']),
      part('Credits scene', 'scene', ['credits.exp']),
    ],
  },
  effect_40fc00: {
    name: 'Clock repetitions',
    description: 'The same clock scene drawn six times at independent frame rates.',
    parts: [part('Clock scene and material maps', 'scene', ['clock.exp'])],
  },
  effect_40c990: {
    name: 'Faceted pair',
    description: 'Two additive faceted scenes with separate clocks and a pulse-driven fade.',
    parts: [
      part('Primary faceted scene', 'scene', ['faceted.exp']),
      part('Secondary faceted scene', 'scene', ['faceted2.exp']),
      part('Pulse control', 'control', ['napierdalanie2.env']),
    ],
  },
  effect_40b040: {
    name: 'Procedural design tunnel',
    description: 'Generated spline tunnel with three material passes and a sine crossfade.',
    parts: [
      part('Crossfade textures', 'texture', ['d1.jpg', 'd1_.jpg']),
      part('Tunnel material textures', 'texture', ['NebulaMultiCrater1.jpg', 'WatergreenWorld.jpg', 'y3.jpg']),
      part('Pulse control', 'control', ['napierdalanie2.env']),
    ],
  },
  effect_40bfa0: {
    name: 'Emboss card + end scene',
    description: 'Animated bump card composited before the end EXP scene.',
    parts: [
      part('Emboss card composite', 'texture', ['bump.jpg', 'bump.raw']),
      part('End geometry, animation and material maps', 'scene', ['end.exp']),
      part('Constructed objects not read by the render method', 'loaded', ['Secret.jpg', 'y4.jpg', 'MAX_t1.jpg']),
    ],
  },
  effect_40ea30: {
    name: 'Energy finale',
    description: 'Final animated scene with texture scroll and compiled fade-out.',
    parts: [part('Scene geometry, animation and material maps', 'scene', ['energy.exp'])],
  },
});

export function metadataForWonderClip(clip) {
  return WONDER_EFFECT_METADATA[clip.id] ?? Object.freeze({
    name: clip.id,
    description: 'Recovered compiled effect.',
    parts: Object.freeze([part('Direct assets', 'loaded', clip.data.assets)]),
  });
}
