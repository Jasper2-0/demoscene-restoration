function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function roundEven(value) {
  const floor = Math.floor(value);
  const fraction = value - floor;
  if (fraction < 0.5) return floor;
  if (fraction > 0.5) return floor + 1;
  return floor % 2 === 0 ? floor : floor + 1;
}

const MAIN_MARKS = Object.freeze([
  [320, 240, 64],
  [320, 88, 64],
  [320, 164, 64],
  [320, 315, 64],
  [320, 391, 64],
]);

// 0x40c810-0x40c834 passes these six doubles directly to glOrtho. The
// reversed bottom/top pair is intentional: this pass uses top-left 2D design
// coordinates, while MiniGL itself retains OpenGL's generic bottom-left
// convention.
export const ENERGIA_OPENING_DOTS_ORTHO = Object.freeze([
  0, 1024, 768, 0, -1, 1,
]);

/** The eight instruction-identical column loops in native function 0x40c6f0. */
export const ENERGIA_OPENING_DOT_GROUPS = Object.freeze([
  { x: 247, start: 93, step: 64, end: 413, rate: 0.4,
    timeRate: 3.4, phase: 1234, base: 54, amplitude: 6.75,
    fadeRate: 0.3, color: [124, 91, 58] },
  { x: 389, start: 93, step: 64, end: 413, rate: 0.4,
    timeRate: 3.4, phase: 7654, base: 54, amplitude: 6.75,
    fadeRate: 0.3, color: [127, 126, 125] },
  { x: 193, start: 117, step: 48, end: 357, rate: 0.5,
    timeRate: 4.4, phase: 1234, base: 40, amplitude: 10 / 3,
    fadeRate: 0.45, color: [124, 91, 58] },
  { x: 444, start: 117, step: 48, end: 357, rate: 0.5,
    timeRate: 4.4, phase: 7654, base: 40, amplitude: 10 / 3,
    fadeRate: 0.45, color: [127, 126, 125] },
  { x: 155, start: 160, step: 29, end: 334, rate: 0.6,
    timeRate: 5.4, phase: 1234, base: 23, amplitude: 1.4375,
    fadeRate: 0.4, color: [126, 114, 62] },
  { x: 482, start: 160, step: 29, end: 334, rate: 0.6,
    timeRate: 5.4, phase: 7654, base: 23, amplitude: 1.4375,
    fadeRate: 0.4, color: [127, 126, 125] },
  { x: 130, start: 209, step: 22, end: 275, rate: 0.7,
    timeRate: 6.4, phase: 11234, base: 13, amplitude: 0.8125,
    fadeRate: 0.35, color: [125, 124, 69] },
  { x: 508, start: 209, step: 22, end: 275, rate: 0.7,
    timeRate: 6.4, phase: 17654, base: 13, amplitude: 0.8125,
    fadeRate: 0.35, color: [127, 126, 125] },
]);

function fadeChannel(phase, rate) {
  return Math.fround(1 - clamp01(Math.fround(phase * rate)));
}

function fadedColor(color, fade) {
  return color.map((channel) => roundEven(Math.fround(fade * channel)));
}

/**
 * Exact compiled quad state for the opening dot-design pass at 0x40c6f0.
 * The pass evaluates its design channels at show time minus six seconds.
 */
export function energiaOpeningDotsState(seconds) {
  const time = Math.fround(seconds);
  const local = time - 6;
  const fadePhase = Math.fround(local - 12);
  const fades = Object.freeze({
    0.5: fadeChannel(fadePhase, 0.5),
    0.45: fadeChannel(fadePhase, 0.45),
    0.4: fadeChannel(fadePhase, 0.4),
    0.35: fadeChannel(fadePhase, 0.35),
    0.3: fadeChannel(fadePhase, 0.3),
  });
  const quads = [];

  const mainFade = fades[0.3];
  const mainColor = fadedColor([110, 61, 48], mainFade);
  for (let index = 0; index < MAIN_MARKS.length; index++) {
    const [x, y, size] = MAIN_MARKS[index];
    const halfSize = Math.fround(size * 0.5
      * (1 + Math.sin(index * 0.4 + local * 2.4) / 6));
    quads.push({ x, y, halfSize, color: mainColor });
  }

  for (const group of ENERGIA_OPENING_DOT_GROUPS) {
    const fade = fades[group.fadeRate];
    const color = fadedColor(group.color, fade);
    let index = 0;
    for (let y = group.start; y < group.end; y += group.step, index++) {
      const halfSize = Math.fround((group.base + group.amplitude
        * Math.sin(index * group.rate + local * group.timeRate + group.phase)) * 0.5);
      quads.push({ x: group.x, y, halfSize, color });
    }
  }

  return { local, fadePhase, fades, quads };
}

export class EnergiaOpeningDotsEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render(seconds) {
    const state = energiaOpeningDotsState(seconds);
    const { mgl } = this;
    const width = mgl.gl.drawingBufferWidth;
    const height = mgl.gl.drawingBufferHeight;
    mgl.viewport(0, 0, width, height);
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.ortho(...ENERGIA_OPENING_DOTS_ORTHO);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableLighting(false);
    mgl.enableCullFace(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_COLOR, mgl.ONE);
    mgl.bindTexture(this.texture);
    mgl.begin(mgl.QUADS);
    for (const quad of state.quads) {
      const [red, green, blue] = quad.color;
      mgl.color4(red / 255, green / 255, blue / 255, 1);
      const left = quad.x - quad.halfSize;
      const right = quad.x + quad.halfSize;
      const top = quad.y + quad.halfSize;
      const bottom = quad.y - quad.halfSize;
      mgl.texCoord2(0, 1); mgl.vertex3(left, top, 0);
      mgl.texCoord2(1, 1); mgl.vertex3(right, top, 0);
      mgl.texCoord2(1, 0); mgl.vertex3(right, bottom, 0);
      mgl.texCoord2(0, 0); mgl.vertex3(left, bottom, 0);
    }
    mgl.end();

    // The native tail performs an empty second quad pass but leaves this state.
    mgl.blendFunc(mgl.ONE, mgl.ONE);
    mgl.depthMask(true);
    return state;
  }
}
