const FRAME_END = 100;

function positiveRemainder(value, divisor) {
  const remainder = value % divisor;
  return remainder < 0 ? remainder + divisor : remainder;
}

export function wonderBoxicalState(localTime) {
  const time = Math.fround(localTime);
  // 0x40c92d stores t*8 back over the method's float argument before the
  // first fmod. The second draw at 0x40c951 reloads that overwritten slot,
  // then adds four; it does not reload the original t.
  const scaledTime = Math.fround(time * 8);
  let alpha = 1 - Math.min(time * 0.063, 1);
  if (time >= Math.fround(10.5)) {
    alpha *= 1 - Math.min(time - Math.fround(10.5), 1);
  }
  return {
    alpha: Math.max(0, alpha),
    frames: [
      Math.fround(positiveRemainder(scaledTime, FRAME_END)),
      Math.fround(positiveRemainder(scaledTime + Math.fround(4), FRAME_END)),
    ],
    textureOffset: [Math.fround(-time * 3.6), 0],
  };
}

/** Reimplementation of Wonder class 0x40c760 / render method 0x40c870. */
export class BoxicalEffect {
  constructor(mgl, renderer) {
    this.mgl = mgl;
    this.renderer = renderer;
  }

  render(localTime, { clear = false } = {}) {
    const state = wonderBoxicalState(localTime);
    const options = {
      depthTest: false,
      cullFaceOverride: false,
      opacityScale: state.alpha * Math.fround(0.7),
      blendFuncOverride: [this.mgl.SRC_ALPHA, this.mgl.SRC_ALPHA],
      materialTextureOffsets: new Map([[0, state.textureOffset]]),
    };
    this.renderer.render(state.frames[0], { ...options, clear });
    this.renderer.render(state.frames[1], { ...options, clear: false });
    return state;
  }
}
