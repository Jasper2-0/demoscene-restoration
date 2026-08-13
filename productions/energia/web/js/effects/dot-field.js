/**
 * Energia's 0x410470 dot-volume renderer.
 *
 * Constants and state below are transcribed from Energia_FIXED.exe. The
 * original evaluates four radial fields on a 25^3 lattice, then emits a
 * textured quad wherever round(field * .1) is positive.
 */

const GRID_SIZE = 25;
const GRID_EXTENT = 100;
const GRID_ORIGIN = -50;

export function energiaDotSources(seconds) {
  const t = seconds;
  const phase7 = t + 7;
  const phase17 = t + 17;
  return [
    {
      x: Math.sin(t * 0.41) * 40,
      y: Math.cos(t * 0.61) * 40,
      z: Math.sin(t * 0.21) * 50,
      radius: 40,
      strength: Math.sin(t * 2.21) * 36 + 48,
    },
    {
      x: Math.sin(phase7 * 0.051) * 40,
      y: Math.cos(phase7 * 0.021) * 40,
      z: Math.sin(phase7 * 0.321) * 40,
      radius: 40,
      strength: Math.sin((t - 123) * 0.61) * 17 + 38,
    },
    {
      x: Math.sin(phase17 * 0.2151) * 30,
      y: Math.cos(phase17 * 0.321) * 30,
      z: Math.sin(phase17 * 0.0521) * 30,
      radius: 40,
      strength: 38,
    },
    {
      x: Math.sin((t + 117) * 1.0151) * 50,
      y: Math.cos(phase17 * 1.0221) * 50,
      z: Math.cos(phase7 * 1.4321) * 50,
      radius: 30,
      strength: 48,
    },
  ];
}

function fieldAt(x, y, z, sources) {
  let field = -2;
  for (const source of sources) {
    const distance = Math.hypot(x - source.x, y - source.y, z - source.z);
    if (distance >= source.radius) continue;
    const falloff = 1 - distance / source.radius;
    field += falloff * falloff * source.strength;
  }
  return field;
}

export class EnergiaDotFieldEffect {
  constructor(mgl, texture) {
    this.mgl = mgl;
    this.texture = texture;
  }

  render(seconds) {
    const { mgl } = this;
    const sources = energiaDotSources(seconds);

    mgl.matrixMode(mgl.PROJECTION);
    mgl.loadIdentity();
    mgl.frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000);
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.loadIdentity();
    mgl.translate(0, 0, -100);
    mgl.rotate(seconds * 10, 0, 0, 1);
    mgl.rotate(seconds * 10, 0, 1, 0);
    mgl.rotate(seconds * 10, 1, 0, 0);

    mgl.activeTexture(1);
    mgl.enableTexture(false);
    mgl.activeTexture(0);
    mgl.enableTexture(true);
    mgl.texGenSphereMap(false);
    mgl.bindTexture(this.texture);
    mgl.texEnv({ mode: 'modulate' });
    mgl.matrixMode(mgl.TEXTURE);
    mgl.loadIdentity();
    mgl.matrixMode(mgl.MODELVIEW);
    mgl.enableLighting(false);
    mgl.enableDepthTest(false);
    mgl.depthMask(false);
    mgl.enableCullFace(false);
    mgl.enableBlend(true);
    mgl.blendFunc(mgl.SRC_ALPHA, mgl.ONE);
    mgl.color4(1, 0.91, 0.892, 0.074);

    mgl.begin(mgl.QUADS);
    for (let iz = 0; iz < GRID_SIZE; iz++) {
      const z = iz / GRID_SIZE * GRID_EXTENT + GRID_ORIGIN;
      for (let iy = 0; iy < GRID_SIZE; iy++) {
        const y = iy / GRID_SIZE * GRID_EXTENT + GRID_ORIGIN;
        for (let ix = 0; ix < GRID_SIZE; ix++) {
          const x = ix / GRID_SIZE * GRID_EXTENT + GRID_ORIGIN;
          const field = fieldAt(x, y, z, sources);
          // MSVC/x87 fistp rounds to nearest. The executable compares the
          // resulting integer with .21, so values below .5 do not emit.
          if (Math.round(field * 0.1) <= 0) continue;
          const halfSize = field * 0.1;
          mgl.texCoord2(0, 0); mgl.vertex3(x - halfSize, y - halfSize, z);
          mgl.texCoord2(0, 1); mgl.vertex3(x + halfSize, y - halfSize, z);
          mgl.texCoord2(1, 1); mgl.vertex3(x + halfSize, y + halfSize, z);
          mgl.texCoord2(1, 0); mgl.vertex3(x - halfSize, y + halfSize, z);
        }
      }
    }
    mgl.end();
    mgl.depthMask(true);
  }
}
