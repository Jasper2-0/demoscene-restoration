/**
 * Wonder's compiled top-level effect manager, recovered from wONDEr.exe.
 *
 * Implementations deliberately retain their constructor VAs until each class
 * has a trustworthy semantic name. Intervals are half-open [start, end), just
 * like the original manager's range checks.
 */
export const WONDER_EFFECT_CLIPS = Object.freeze([
  { id: 'effect_4106a0', start: 0.000, end: 22.000, layer: 0,
    data: { assets: ['beginning.exp', 'alpha_circle.env', 'koniec_intra.env',
      'overtake.jpg', 'overtake2.jpg'] } },
  { id: 'effect_40d790', start: 9.862, end: 13.500, layer: 1,
    data: { assets: ['DarkHorizonOfDreams1__.jpg'] } },
  { id: 'effect_40de00', start: 0.000, end: 20.000, layer: 2,
    data: { assets: ['d1_wonder2.jpg', 'D1_WonderAlpha.tga', 'd1_face.jpg',
      'D1_FaceAlpha.tga', 'd1_circle2.jpg', 'D1_CircleAlpha.tga',
      'wondertext_pos.env', 'alpha_circle.env', 'koniec_intra.env'] } },
  { id: 'effect_40c760', start: 35.500, end: 47.000, layer: 3,
    data: { assets: ['boxical.exp'] } },
  { id: 'effect_40d060', start: 26.900, end: 44.500, layer: 4,
    data: { assets: ['max_t4.jpg'] } },
  { id: 'effect_40f8e0', start: 26.500, end: 44.000, layer: 5,
    data: { assets: ['bubblebath.exp', 'vsz_d2.jpg'] } },
  { id: 'effect_4138a0', start: 20.341, end: 35.500, layer: 6,
    data: { assets: ['introductionpoem1.jpg'] } },
  { id: 'effect_408ca0', start: 18.341, end: 40.400, layer: 7,
    data: { assets: ['y1.jpg', 'bubble.env'] } },
  { id: 'effect_40ec40', start: 44.400, end: 60.000, layer: 8,
    data: { assets: ['shite1.exp', 'design_bw2.exp', 'MAX_T5.JPG', 'Water2.jpg',
      'MAX_t3.jpg'] } },
  { id: 'effect_40f2f0', start: 44.400, end: 60.000, layer: 9,
    data: { assets: ['scene.exp', 'vsz_d2.jpg'] } },
  { id: 'effect_410100', start: 53.000, end: 59.000, layer: 10,
    data: { assets: ['spherical.exp'] } },
  { id: 'effect_40cea0', start: 58.900, end: 69.753, layer: 11,
    data: { assets: ['boxical4.exp'] } },
  { id: 'effect_40ccc0', start: 59.302, end: 69.753, layer: 12,
    data: { assets: ['check.exp'] } },
  { id: 'effect_40fe10', start: 58.900, end: 69.753, layer: 13,
    data: { assets: ['stars.exp', 'speedy.exp', 'backg.jpg'] } },
  { id: 'effect_40dab0', start: 69.753, end: 103.500, layer: 14,
    data: { assets: ['DustOnYourEyes__.jpg'] } },
  { id: 'effect_410300', start: 69.753, end: 104.000, layer: 15,
    data: { assets: ['woah3.exp', 'napierdalanie.env', 'unrd1.jpg', 'unrd1.raw',
      'unrd3.raw'] } },
  { id: 'effect_40fa30', start: 104.000, end: 138.500, layer: 16,
    data: { assets: ['credits.exp', 'design_bw.exp'] } },
  { id: 'effect_40fc00', start: 104.000, end: 138.500, layer: 17,
    data: { assets: ['clock.exp'] } },
  { id: 'effect_40c990', start: 138.302, end: 159.440, layer: 18,
    data: { assets: ['faceted.exp', 'faceted2.exp', 'napierdalanie2.env'] } },
  { id: 'effect_40b040', start: 155.440, end: 172.578, layer: 19,
    data: { assets: ['d1.jpg', 'd1_.jpg', 'napierdalanie2.env',
      'NebulaMultiCrater1.jpg', 'WatergreenWorld.jpg', 'y3.jpg'] } },
  { id: 'effect_40bfa0', start: 172.000, end: 185.035, layer: 20,
    data: { assets: ['bump.jpg', 'bump.raw', 'end.exp', 'Secret.jpg', 'y4.jpg',
      'MAX_t1.jpg'] } },
  { id: 'effect_40ea30', start: 176.000, end: 195.000, layer: 21,
    data: { assets: ['energy.exp'] } },
]);

// The final registered effect extends past the release executable's exit cut.
export const WONDER_EFFECT_SCHEDULE_END = 195;
export const WONDER_SHOW_END = 186.5;
