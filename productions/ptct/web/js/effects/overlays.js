// 2D overlay effects 0x32–0x37 (renderfuncs.c 724–845).
// All: texture off, depth test off, blend SRC_ALPHA/ONE_MINUS_SRC_ALPHA,
// fullscreen ortho quad; skip when alpha <= 0. t = elapsed ticks (0.25 ms).

const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];

function makeFade(R, color, base, rate) {
  return {
    render(t) {
      R.solidFade(color, base - rate * t);
    },
  };
}

// 0x32 (FUN_00405840): white, α = 1.0 − 0.0002·t
export const make32 = (R) => makeFade(R, WHITE, 1.0, 0.0002);
// 0x33 (FUN_00405980): black, α = 1.0 − 0.0002·t (fade-in from black)
export const make33 = (R) => makeFade(R, BLACK, 1.0, 0.0002);
// 0x35 (FUN_00405a10): black, α = 1.0 − 0.00001·t (25 s veil)
export const make35 = (R) => makeFade(R, BLACK, 1.0, 0.00001);
// 0x36 (FUN_00405aa0): black, α = 0.7 − 0.0002·t
export const make36 = (R) => makeFade(R, BLACK, 0.7, 0.0002);
// 0x37 (FUN_004058e0): white, α = 0.7 − 0.0002·t
export const make37 = (R) => makeFade(R, WHITE, 0.7, 0.0002);

// 0x34 (FUN_00405b30): additive spinning/zooming grid flash.
// Ported EXACTLY from the unpacked-EXE disassembly (405b30–405d61):
// - Texture built once: 16×16 RGBA (0x400 bytes), all black, with row y=0
//   and column x=0 set to 0xAFAFAFAF (a cross; tiles into a grid via REPEAT).
// - blend ONE,ONE; per layer L = 0..2 (t' = t − 200·L, div = 1.5^L):
//     b = (1 − t'·0.0003750938)/div        — return when b ≤ 0
//     q = 1 / (t'·0.0005 + 0.1)            — hyperbolic zoom radius
//     θ = t'·0.00025                       — rotation
//     glColor3f(b,b,b)
//     corner k (angles θ + k·π/2, k = 0..3):
//       x_k = 0.5 + sin(θ + kπ/2)·q
//       y_k = 0.5 − cos(θ + kπ/2)·q·1.2    — 1.2 vertical stretch
//     uv_k = (0,0), (0,7), (7,7), (7,0)    — texture tiles 7× → 7×7 grid
export function make34(R) {
  let tex = null;
  const UVS = [0, 0, 0, 7, 7, 7, 7, 0];
  const HALF_PI = Math.PI / 2;
  return {
    render(t) {
      if (!tex) {
        const buf = new Uint8Array(16 * 16 * 4);
        for (let i = 0; i < 16; i++) {
          buf.fill(0xaf, i * 4, i * 4 + 4);            // row 0
          buf.fill(0xaf, i * 16 * 4, i * 16 * 4 + 4);  // column 0
        }
        tex = R.makeTextureFromRGBA(buf, 16, 16);
      }
      const mgl = R.mgl, gl = R.gl;
      mgl.enableDepthTest(false);
      mgl.enableBlend(true);
      gl.blendFunc(gl.ONE, gl.ONE);
      mgl.enableTexture(true);
      mgl.bindTexture(tex);
      let tt = Math.floor(t), div = 1.0;
      for (let L = 0; L < 3; L++) {
        const b = (1 - tt * 0.0003750937758013606) / div;
        if (b <= 0) break;
        const q = 1 / (tt * 0.0005 + 0.1);
        const th = tt * 0.00025;
        mgl.color4(b, b, b, 1);
        const pts = [];
        for (let k = 0; k < 4; k++) {
          const a = th + k * HALF_PI;
          pts.push(0.5 + Math.sin(a) * q, 0.5 - Math.cos(a) * q * 1.2);
        }
        R.rotatedQuad(pts, UVS);
        div *= 1.5;
        tt -= 200;
      }
      mgl.color4(1, 1, 1, 1);
      mgl.enableBlend(false);
      mgl.enableTexture(false);
      mgl.enableDepthTest(true);
    },
  };
}
