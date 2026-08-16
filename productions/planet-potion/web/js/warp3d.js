// warp3d.js — the intro's 22-call Warp3D surface, over WebGL2.
//
// Planet Potion talks to exactly 22 library vectors at 29 sites, and every state
// argument in the program is an immediate. So this is not a general Warp3D
// emulation: it is the specific configuration the intro sets up, implemented
// once, with the constants named. See ../../work/re/PORT_SPEC.md §5.
//
// It consumes the SAME record shape that work/re/drawlog.py records from the
// original, so the recorded draw stream can be played through it before any of
// the engine exists. That ordering is deliberate — it isolates "is the GL
// translation right" from "is the reimplemented engine right", and only one of
// those two questions is open at a time.
//
// Vertices arrive as the original computed them: screen-space pixels, texel
// UVs, per-primitive alpha. Nothing here projects, transforms or clips.

const SCREEN_W = 640;
const SCREEN_H = 480;
const TEX_SIZE = 128;          // every texture is 128x128 A8R8G8B8

const VERT_SRC = `#version 300 es
precision highp float;
// x y z w u v r g b a — the ten fields drawlog.py records per vertex
layout(location = 0) in vec4 aPos;      // x, y in PIXELS; z is the depth value; w = 1/zsrc
layout(location = 1) in vec2 aUV;       // TEXELS, not normalised
layout(location = 2) in vec4 aColor;

uniform vec2  uViewport;                // 640, 480
uniform float uTexelScale;              // 1/128
uniform vec3  uFog;                     // start, end, enabled

out vec2  vUV;
out vec4  vColor;
out float vFog;

void main() {
  // Pixel centre to NDC. y flips: the original's origin is top-left.
  vec2 ndc = vec2(aPos.x / uViewport.x * 2.0 - 1.0,
                  1.0 - aPos.y / uViewport.y * 2.0);
  // REVERSED DEPTH. Warp3D puts 1.0 at the front plane and 0.0 at the back and
  // compares with GEQUAL, so the value passes through and the clear/compare are
  // inverted instead (see setup()). The exact encoding the driver applies before
  // normalising is one of the three things marked unknown in PORT_SPEC section 6.
  gl_Position = vec4(ndc, aPos.z * 2.0 - 1.0, 1.0);

  vUV    = aUV * uTexelScale;
  vColor = aColor;

  // W3D_FOG_LINEAR, interpolated PER VERTEX — the Permedia 2 driver fakes linear
  // fog by interpolating this factor across the primitive rather than computing
  // it per fragment. Reproducing that is the point; a per-fragment version would
  // be smoother and wrong.
  vFog = uFog.z > 0.5
       ? clamp((aPos.w - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0)
       : 0.0;
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2  vUV;
in vec4  vColor;
in float vFog;

uniform sampler2D uTex;
uniform vec3  uFogColor;
uniform float uTextured;

out vec4 oColor;

void main() {
  // No W3D_SetTexEnv call appears anywhere in the program, so the default
  // applies. The recorded stream settles which default that is: vertex RGB is
  // 0.0 on every vertex of every primitive while the picture is plainly not
  // black, so colour cannot be modulating the texture. Alpha does vary and does
  // drive the fades, so alpha modulates and RGB is replaced.
  vec4 texel = uTextured > 0.5 ? texture(uTex, vUV) : vec4(1.0);
  vec3 rgb   = uTextured > 0.5 ? texel.rgb : vColor.rgb;
  float a    = texel.a * vColor.a;

  oColor = vec4(mix(rgb, uFogColor, vFog), a);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

export class Warp3D {
  constructor(canvas) {
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, depth: true, preserveDrawingBuffer: true,
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.textures = new Map();
    this.fog = { start: 0, end: 0, color: [0, 0, 0], enabled: false };

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);
    }
    this.prog = prog;
    this.u = Object.fromEntries(['uViewport', 'uTexelScale', 'uFog', 'uFogColor',
      'uTex', 'uTextured'].map((n) => [n, gl.getUniformLocation(prog, n)]));

    this.vao = gl.createVertexArray();
    this.vbo = gl.createBuffer();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    const STRIDE = 10 * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 16);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, STRIDE, 24);
    gl.bindVertexArray(null);

    this.setup();
  }

  /** The state the intro enables once at init, and never changes. §5. */
  setup() {
    const { gl } = this;
    gl.viewport(0, 0, SCREEN_W, SCREEN_H);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);   // W3D_SetBlendMode(7, 8)
    gl.depthFunc(gl.GEQUAL);                              // W3D_Z_GEQUAL
    gl.clearDepth(0.0);                                   // back plane is 0.0
    gl.disable(gl.CULL_FACE);      // the intro culls itself, in the scene handler
    gl.disable(gl.DITHER);         // see the 16-bit note in PORT_SPEC §6
  }

  /** W3D_SetState(W3D_ZBUFFER / W3D_ZBUFFERUPDATE) — toggled per frame. */
  setZBuffer(test, write) {
    const { gl } = this;
    if (test) gl.enable(gl.DEPTH_TEST); else gl.disable(gl.DEPTH_TEST);
    gl.depthMask(!!write);
  }

  /** W3D_SetFogParams(ctx, &fog, W3D_FOG_LINEAR). One of four per-scene presets. */
  setFog(preset) {
    this.fog = preset
      ? { start: preset.start, end: preset.end, color: preset.color, enabled: true }
      : { ...this.fog, enabled: false };
  }

  /** W3D_AllocTexObj + W3D_UploadTexture + W3D_SetFilter(2, 2). */
  uploadTexture(index, pixels) {
    const { gl } = this;
    let tex = this.textures.get(index);
    if (!tex) { tex = gl.createTexture(); this.textures.set(index, tex); }
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TEX_SIZE, TEX_SIZE, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // W3D_LINEAR for both min and mag — bilinear, and NO mipmaps: the Permedia 2
    // driver never exposed them on this path, so a port that generates them is
    // sharper than the original at distance.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // No W3D_SetWrapMode call exists, so the default stands — and it must be
    // REPEAT, because recorded UVs reach 5888 on a 128-texel texture.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
  }

  /** W3D_ClearDrawRegion — _calc_matrix computes the colour per frame. */
  clear(rgb = [0, 0, 0]) {
    const { gl } = this;
    gl.clearColor(rgb[0], rgb[1], rgb[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * W3D_DrawTriFan / W3D_DrawLineStrip.
   * `draw` is one record as work/re/drawlog.py writes it:
   *   { prim: 'trifan'|'linestrip', texture: index|null, v: Float32Array|number[] }
   * with ten floats per vertex — x y z w u v r g b a.
   */
  draw(draw) {
    const { gl } = this;
    const verts = draw.v instanceof Float32Array ? draw.v : new Float32Array(draw.v);
    if (verts.length < 20) return 0;                 // fewer than two vertices

    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);

    const tex = draw.texture != null ? this.textures.get(draw.texture) : null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex ?? null);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform1f(this.u.uTextured, tex ? 1 : 0);
    gl.uniform2f(this.u.uViewport, SCREEN_W, SCREEN_H);
    gl.uniform1f(this.u.uTexelScale, 1 / TEX_SIZE);
    gl.uniform3f(this.u.uFog, this.fog.start, this.fog.end, this.fog.enabled ? 1 : 0);
    gl.uniform3fv(this.u.uFogColor, this.fog.color);

    const n = verts.length / 10;
    gl.drawArrays(draw.prim === 'linestrip' ? gl.LINE_STRIP : gl.TRIANGLE_FAN, 0, n);
    return draw.prim === 'linestrip' ? 0 : Math.max(0, n - 2);
  }

  /** Play a whole recorded frame — the oracle path, before the engine exists. */
  drawFrame(frame) {
    let triangles = 0;
    for (const d of frame.draws) triangles += this.draw(d);
    return { objects: frame.draws.length, triangles, glError: this.gl.getError() };
  }
}

export { SCREEN_W, SCREEN_H, TEX_SIZE };
