import { sampleEnvelope } from '../shared/envelope.js';

/** Reimplementation of Wonder effect class 0x40de00. */
export class IntroOverlayEffect {
  constructor(mgl, textures, { position, circleAlpha, exit }) {
    this.mgl = mgl;
    this.textures = textures;
    this.position = position;
    this.circleAlpha = circleAlpha;
    this.exit = exit;
  }

  drawTexture(texture, color, vertex) {
    const { mgl } = this;
    mgl.bindTexture(texture);
    mgl.color4(...color);
    mgl.begin(mgl.QUADS);
    for (const [u, v, x, y] of [
      [0, 0, -100, 100], [1, 0, 100, 100],
      [1, 1, 100, -100], [0, 1, -100, -100],
    ]) {
      mgl.texCoord2(u, v);
      mgl.vertex3(...vertex(x, y, -500));
    }
    mgl.end();
  }

  render(localTime) {
    const { mgl } = this;
    const position = sampleEnvelope(this.position, localTime);
    const pulse = Math.max(0, Math.min(1, sampleEnvelope(this.circleAlpha, localTime)));
    const exitY = sampleEnvelope(this.exit, localTime);

    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableLighting(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE_MINUS_SRC_ALPHA);
    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();

    const drawWonder = () => this.drawTexture(
      this.textures.get('wonder-title'), [1, 1, 1, 1],
      (x, y, z) => [x + position[0], y + position[1] - 70 + exitY, z + position[2]],
    );
    const drawFace = () => this.drawTexture(
      this.textures.get('face-title'), [1, 1, 1, 1],
      (x, y, z) => [x + position[0], y - position[1] + exitY, z - position[2]],
    );
    const circleScale = pulse + 1.35;
    const drawCircle = () => this.drawTexture(
      this.textures.get('circle-title'), [0, 0, 0, pulse],
      (x, y, z) => [
        x * circleScale + position[0] + 7,
        y * circleScale - position[1] + exitY,
        z - position[2],
      ],
    );
    if (localTime < 9.33) {
      drawWonder();
      drawCircle();
      drawFace();
    } else {
      drawCircle();
      drawFace();
      drawWonder();
    }
    mgl.depthMask(true);
    return { position, pulse, exitY, circleScale };
  }
}
