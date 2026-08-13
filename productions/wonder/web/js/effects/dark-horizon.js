const PLANE_COUNT = 8;
const DEPTH_START = -100;
const DEPTH_STEP = 80;
const DEPTH_SWING = 90;
const DEPTH_RATE = 0.4;
const Z_ROTATION_RATE = Math.fround(25);
const Z_ROTATION_STEP = 16;
const TILT_TIME_RATE = 0.5;
const TILT_TIME_CAP = 1.57;
const PIVOT_Y = 150;
const PIVOT_ROTATION_RATE = Math.fround(26);

/** Scalar transforms emitted by render method 0x40d820. */
export function wonderDarkHorizonState(localTime) {
  // The method's argument is a float. It temporarily stores t*.5 back into
  // that stack slot for the tilt calculation, then doubles it to restore t;
  // it does not compound time between planes.
  let time = Math.fround(localTime);
  const planes = [];
  for (let index = 0; index < PLANE_COUNT; index++) {
    const z = DEPTH_START - index * DEPTH_STEP;
    const phase = index * Z_ROTATION_STEP;
    const translationZ = Math.fround(z + Math.sin(time * DEPTH_RATE) * DEPTH_SWING);
    const zRotation = Math.fround(time * Z_ROTATION_RATE + phase);
    const halfTime = Math.fround(time * TILT_TIME_RATE);
    const limited = Math.min(halfTime, TILT_TIME_CAP);
    const tilt = Math.fround(Math.sin(limited) ** 2 * DEPTH_SWING + DEPTH_SWING);
    time = Math.fround(halfTime + halfTime);
    const pivotRotation = Math.fround(time * PIVOT_ROTATION_RATE);
    planes.push(Object.freeze({
      index, translationZ, zRotation, tilt, pivotRotation,
    }));
  }
  return Object.freeze({ time, planes: Object.freeze(planes) });
}

/** Reimplementation of Wonder class 0x40d790 / render method 0x40d820. */
export class DarkHorizonEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  drawPlane() {
    const { mgl } = this;
    mgl.color4(1, 1, 1, 0.23000000417232513);
    mgl.begin(mgl.QUADS);
    mgl.texCoord2(0, 0); mgl.vertex3(-100, 100, 0);
    mgl.texCoord2(1, 0); mgl.vertex3(100, 100, 0);
    mgl.texCoord2(1, 1); mgl.vertex3(100, -100, 0);
    mgl.texCoord2(0, 1); mgl.vertex3(-100, -100, 0);
    mgl.end();
  }

  render(localTime) {
    const { mgl } = this;
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);

    const state = wonderDarkHorizonState(localTime);
    for (const plane of state.planes) {
      mgl.loadIdentity();
      mgl.translate(0, 0, plane.translationZ);
      mgl.rotate(plane.zRotation, 0, 0, 1);
      mgl.rotate(plane.tilt, 1, 0, 0);
      mgl.translate(0, PIVOT_Y, 0);
      mgl.rotate(plane.pivotRotation, 1, 0, 0);
      mgl.translate(0, -PIVOT_Y, 0);
      this.drawPlane();
    }
    mgl.depthMask(true);
    return state;
  }
}
