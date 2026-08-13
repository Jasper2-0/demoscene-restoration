/** Compiled Energia EXP-manager entries recovered from Energia_FIXED.exe. */
export const ENERGIA_SCENE_CLIPS = Object.freeze([
  { id: 'kurwa2_scene', start: 56, end: 82, layer: 10,
    data: { scene: 'kurwa2_.exp', vtable: '0x43765c' } },
  { id: 'kurwa_scene', start: 82, end: 122, layer: 10,
    data: { scene: 'kurwa.exp', vtable: '0x43765c' } },
  { id: 'scene6_scene', start: 136, end: 157, layer: 10,
    data: { scene: 'scene6.EXP', vtable: '0x437658' } },
  { id: 'freak_scene', start: 56, end: 82, layer: 11,
    data: { scene: 'freak.exp', vtable: '0x43765c' } },
]);

/**
 * Independently overlapping frame-function gates. These are intentionally not
 * flattened into cuts: the executable runs several of them in the same frame.
 */
export const ENERGIA_PHASE_CLIPS = Object.freeze([
  { id: 'early_renderer_411e10_410470', start: 0, end: 56, layer: 0 },
  { id: 'main_effect_410f90', start: 56, end: 157, layer: 1 },
  { id: 'late_effect_pair_410f90_410470', start: 233, end: 290, layer: 1 },

  { id: 'texture_D2_3', start: 12, end: 19, layer: 2,
    data: { texture: 'D2_3.jpg' } },
  { id: 'texture_D4_4', start: 19, end: 31.5, layer: 2,
    data: { texture: 'D4_4.jpg' } },
  { id: 'texture_D2_2', start: 31.5, end: 44, layer: 2,
    data: { texture: 'D2_2.jpg' } },
  { id: 'texture_D4_1', start: 44, end: 56, layer: 2,
    data: { texture: 'D4_1.jpg' } },

  { id: 'compositor_mode_2', start: 44, end: 82, layer: 20,
    data: { mode: 2 } },
  { id: 'effect_40f070_opening', start: 0, end: 56, layer: 21,
    data: { effect: '0x40f070', effectTexture: 'kalju3512.jpg', phaseStart: 4 } },
  { id: 'transition_wave_dot', start: 82, end: 136, layer: 20,
    data: { effects: ['0x411e10', '0x410470'] } },
  { id: 'effect_40f070', start: 122, end: 132, layer: 21,
    data: { effect: '0x40f070', effectTexture: 'sc2.jpg', phaseStart: 122 } },
  { id: 'opening_dots_40c6f0', start: 0, end: 56, layer: 22,
    data: { effect: '0x40c6f0', assets: ['dot.jpg'], timeOffset: -6 } },
  { id: 'opening_logo_412750', start: 0, end: 56, layer: 23,
    data: { effect: '0x412750', assets: ['s.raw', 'sb.raw'] } },
  { id: 'compositor_mode_4', start: 132, end: 157, layer: 20,
    data: { mode: 4 } },
  { id: 'overlay_413050', start: 156, end: 182, layer: 30 },
  { id: 'main_effect_mode_3_overlay', start: 182, end: 233, layer: 30,
    data: { effect: '0x410f90', mode: 3 } },
  { id: 'effect_40f570', start: 233, end: 290, layer: 30 },
]);

export const ENERGIA_SHOW_END = 290;
