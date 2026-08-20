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
  // PERSPECTIVE-CORRECT, and it has to be reconstructed rather than assumed.
  // The vertices arrive ALREADY PROJECTED — x and y in pixels, w = 1/zsrc — so
  // handing them to the rasteriser with w = 1.0 makes every varying interpolate
  // AFFINELY across the triangle. That is the classic texture-swim of a
  // software rasteriser without a divide, and it is not what this hardware did:
  // the recorded render state has W3D_PERSPECTIVE true, and the Permedia 2
  // divides per span.
  //
  // Multiplying the whole clip position back up by zsrc restores the homogeneous
  // coordinate the projection divided out. x/w and z/w come back to exactly the
  // values above, so nothing about the geometry moves; what changes is that the
  // rasteriser now interpolates u, v and the colour by 1/w, which is what
  // "perspective correct" means. On this intro's ground planes the UVs run past
  // 5,000 texels, so an affine error there does not distort the texture, it
  // scrambles which part of it is sampled.
  float zsrc = 1.0 / max(aPos.w, 1e-9);
  gl_Position = vec4(ndc * zsrc, (aPos.z * 2.0 - 1.0) * zsrc, zsrc);

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
uniform float uTexEnv;      // 0 replace, 1 modulate, 2 decal — see main()
uniform float uTexAlpha;    // 1 = multiply in the texture's alpha; see main()

out vec4 oColor;

void main() {
  // THE TEXTURE ENVIRONMENT IS THE BIGGEST OPEN QUESTION IN THIS FILE, and an
  // earlier version of this comment settled it on a false premise. It claimed
  // vertex RGB was 0.0 on every vertex of every primitive; counting the
  // recorded stream says otherwise — 5,702 distinct vertex colours, (1,1,1) on
  // 37,051 vertices and (0,0,0) on 76,057, and per primitive 20,737 trifans all
  // black, 9,697 all white and 9,976 genuinely varied. So the stream does not
  // decide this, and no W3D_SetTexEnv call exists to decide it either.
  //
  // uTexEnv selects, and the default is REPLACE:
  //   0 REPLACE   rgb = texel                       — the whole intro is grey
  //   1 MODULATE  rgb = texel * vColor              — half the geometry is black
  //   2 DECAL     rgb = mix(vColor, texel, texel.a) — needs the alpha channel,
  //                                                   and 34 of 69 textures have
  //                                                   a varying one
  // REPLACE is the default because it is the only one of the three under which
  // the 20,737 all-black primitives are visible at all, and because Warp3D's
  // W3D_AllocTexObj zeroes the texture object's environment fields (LVO -96 in
  // Warp3DPPC.library, at 0x100194b4 once flattened), so whatever the default
  // is, it is the zero value of the enum. What that constant IS lives in the
  // driver or the 68K library, neither of which is read yet — see PORT_SPEC §6.
  vec4 texel = uTextured > 0.5 ? texture(uTex, vUV) : vec4(1.0);
  vec3 rgb   = vColor.rgb;
  if (uTextured > 0.5) {
    rgb = uTexEnv < 0.5 ? texel.rgb
        : (uTexEnv < 1.5 ? texel.rgb * vColor.rgb
                         : mix(vColor.rgb, texel.rgb, texel.a));
  }
  // TEXTURE ALPHA REACHES THE BLEND, and the capture is what says so: dropping
  // it costs 0.12 of correlation over part one and loses on 13 of 16 scenes,
  // worst on 0x25ee at -0.50. That is worth stating because the font argues the
  // other way and is wrong to -- _init_txtgen fills the glyph atlas with
  // 0x00ffffff (lis r11, 0xff; ori r11, r11, 0xffff at 0x1000139c), alpha ZERO
  // on every set pixel, so a strict reading makes the credits invisible. They
  // are legible in the capture, so SOMETHING gives the glyph atlas an opaque
  // alpha, and it is not this multiply -- see installFont in textures.js.
  //
  // WHICH WAY ROUND, though, is a separate question, because byte 0 of every
  // texel is written as 255 - mask (toARGB in texturevm.js), so the channel is
  // stored inverted with respect to coverage. If the hardware's alpha is the
  // complement, the glyph quads become OPAQUE BLACK RECTANGLES WITH WHITE
  // LETTERS -- which is exactly the black caption bar the capture shows under
  // the credits, and which nothing in our render currently produces.
  //
  //   0  ignore the texture's alpha entirely
  //   1  a = texel.a * vColor.a
  //   2  a = (1 - texel.a) * vColor.a
  //
  // ?texalpha= picks; see the measurement in the comment on this.texAlpha.
  float ta = uTexAlpha < 0.5 ? 1.0 : (uTexAlpha < 1.5 ? texel.a : 1.0 - texel.a);
  float a = ta * vColor.a;

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
  constructor(canvas, opts = {}) {
    this.depth16 = opts.depth16 !== false;
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
      'uTex', 'uTextured', 'uTexEnv', 'uTexAlpha']
      .map((n) => [n, gl.getUniformLocation(prog, n)]));

    // 0 replace, 1 MODULATE, 2 decal. The recorded stream cannot decide this —
    // it carries the draw calls, and every value of this knob consumes them
    // identically — so it sat at 0 as "the one the stream is at least
    // consistent with". THE CAPTURE DECIDES IT. Correlating our frames against
    // the reference video across part one: replace -0.269, decal -0.256,
    // modulate +0.202, and modulate wins the frame-identification test on 6 of
    // 16 samples where the other two win 2. See work/re/capcheck.mjs.
    //
    // AND THE TWO ORACLES DISAGREE, which is why the default stays at 0. Under
    // `modulate` rendercheck's busiest RECORDED frame collapses to a single
    // colour: that frame's vertex colours are zero, so multiplying the texture
    // by them gives black, and only `replace` shows anything. So one oracle
    // says modulate and the other says the original cannot have been
    // modulating that draw.
    //
    // The likeliest resolution is that the environment is not one global
    // setting — W3D_SetState carries a texture-environment mode per draw and
    // the recorded stream does not carry it — but that is a hypothesis and this
    // comment is the evidence, not the answer. `?texenv=1` runs the other way.
    this.texEnv = 1;
    this.texAlpha = 1;
    this.filter = null;   // null = per texture; 'linear'/'nearest' force it

    // A 16-BIT DEPTH BUFFER, because that is what the hardware had. The
    // framebuffer is 16 bits deep (see render_state.json) and so is the z
    // buffer, and the difference is not academic: at t=692 of part one's 0x25ee
    // there are 263 overlapping pairs of primitives whose depth ranges
    // interpenetrate within 0.2% of each other and 148 of them cover more than
    // 2,000 pixels. At 16 bits those quantise to the same value, W3D_Z_GEQUAL
    // takes the later one, and the result is stable. Given the 24 bits WebGL
    // hands out by default the differences resolve, and each pixel picks a
    // winner on its own — which is z-fighting, on geometry the original drew
    // clean.
    //
    // WebGL cannot ask the default framebuffer for a depth size, so the frame
    // is drawn into one of our own and blitted across at the end. `?depth16=0`
    // renders straight to the canvas the way it used to.
    this.fbo = null;
    // Reported so that "we render at the hardware's depth" is checkable rather
    // than assumed: a driver that refuses the format leaves fbo null and this
    // falls back to the canvas, which may be 16 or 24 depending on the machine.
    this.depthBits = null;
    if (this.depth16) {
      const fbo = gl.createFramebuffer();
      const colour = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, colour);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.RGBA8, SCREEN_W, SCREEN_H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
        gl.RENDERBUFFER, colour);

      // A DEPTH TEXTURE, NOT A DEPTH RENDERBUFFER, and the difference is not
      // cosmetic. Firefox PROMOTES every depth renderbuffer to 32 bits —
      // `RENDERBUFFER_DEPTH_SIZE` reports 32 for DEPTH_COMPONENT16,
      // DEPTH_COMPONENT24 and DEPTH_COMPONENT32F alike — so asking for 16 there
      // got the opposite of what this whole framebuffer exists for: MORE
      // precision than the canvas would have given, and 0x25ee's interpenetrating
      // surfaces resolving individually instead of merging. A depth TEXTURE at
      // DEPTH_COMPONENT16 is honoured at 16 bits by Firefox and Chrome both.
      //
      // ⚠ `getParameter(DEPTH_BITS)` DOES NOT REPORT THIS. It returned 16 on
      // Firefox for the 32-bit renderbuffer, which is why the original fix
      // looked like it had taken and had not. Nothing here may use it to decide
      // anything; `?depth=` and the inspector report the format ASKED FOR, and
      // `work/re/depthcheck.mjs` measures what actually happens to the picture.
      const depth = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, depth);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT16, SCREEN_W, SCREEN_H,
        0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
      // A depth texture with the default mipmap filter is INCOMPLETE, and an
      // incomplete attachment is how this silently falls back to the canvas.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
        gl.TEXTURE_2D, depth, 0);
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        this.fbo = fbo;
        this.depthTex = depth;
        // WHAT WAS ASKED FOR. See the warning above: there is no query that
        // answers "what did the driver allocate" for a texture attachment, and
        // the one that claims to answer it for a renderbuffer lies.
        this.depthBits = 16;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

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

  /** W3D_AllocTexObj + W3D_UploadTexture, and W3D_SetFilter on most of them. */
  uploadTexture(index, pixels, pointSampled = false) {
    const { gl } = this;
    let tex = this.textures.get(index);
    if (!tex) { tex = gl.createTexture(); this.textures.set(index, tex); }
    // ALREADY RGBA, AND IT MUST NOT BE SWIZZLED AGAIN. The arena's surface is
    // A8R8G8B8, but `textures.js` converts on the way out of the VM
    // (`argbToRGBA`, called at its line 84), so what arrives here is in the byte
    // order GL wants. A second rotation here reads R from the green byte and
    // blue from the alpha byte, which is opaque 255 for every texture in the
    // intro — so every surface comes out saturated blue. That is what the
    // ground looked like for a while, and it looked plausible enough to be
    // blamed on fog and on the texture environment before it was measured.
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TEX_SIZE, TEX_SIZE, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // THE FILTER IS PER TEXTURE, and that is the whole of it. `_alloc_txt` has
    // one W3D_SetFilter call site but it runs per texture and DOES NOT RUN FOR
    // EVERY ONE — part one calls it on 44 of 48, part three on 14 of 21. The
    // ones it skips keep whatever W3D_AllocTexObj left them.
    //
    // Which settles what the argument means. `W3D_SetFilter(2, 2)` is
    // W3D_LINEAR, as the note always said, and the DEFAULT is point sampling:
    // part one's vertical bands are texture 4, one of the four it skips, and
    // along one scanline of 0x25aa the capture holds flat plateaus with hard
    // steps — 203, then 1-2 for twenty-six pixels, then 76, then 200 — where
    // bilinear gives a continuous ramp with no plateau anywhere. Meanwhile the
    // second half's surfaces are visibly bilinear in the capture, and every
    // texture they use is one SetFilter was called on.
    //
    // Reading the argument alone could not tell those apart. Only noticing that
    // some textures never get the call could, and that is in the recorded
    // library log rather than in the code — `scan_texture_filters` in export.py
    // writes the list into render_state.json.
    const f = this.filter === 'linear' ? gl.LINEAR
      : (this.filter === 'nearest' || pointSampled ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    // No W3D_SetWrapMode call exists, so the default stands — and it must be
    // REPEAT, because recorded UVs reach 5888 on a 128-texel texture.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return tex;
  }

  /** W3D_ClearDrawRegion — _calc_matrix computes the colour per frame. */
  clear(rgb = [0, 0, 0]) {
    const { gl } = this;
    if (this.fbo) gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.clearColor(rgb[0], rgb[1], rgb[2], 1);
    // THE DEPTH MASK GATES THE DEPTH CLEAR, not just drawing. `glClear` is
    // subject to the write masks, so clearing while `depthMask` is false --
    // which is exactly the state a frame opens in, because `_show_scene`
    // disables both z states before its first node -- leaves the depth buffer
    // holding the PREVIOUS frame's values. With Warp3D's reversed depth those
    // are compared GEQUAL against a cleared 1.0, so every fragment fails and
    // the scene renders black. That is what happened the first time the z
    // buffer was wired up, and it looks exactly like geometry that is not being
    // submitted at all.
    const wrote = gl.getParameter(gl.DEPTH_WRITEMASK);
    if (!wrote) gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!wrote) gl.depthMask(false);
  }

  /**
   * W3D_DrawTriFan / W3D_DrawLineStrip.
   * `draw` is one record as work/re/drawlog.py writes it:
   *   { prim: 'trifan'|'linestrip', texture: index|null, v: Float32Array|number[] }
   * with ten floats per vertex — x y z w u v r g b a.
   */
  draw(draw) {
    const { gl } = this;
    if (this.fbo) gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    const verts = draw.v instanceof Float32Array ? draw.v : new Float32Array(draw.v);
    if (verts.length < 20) return 0;                 // fewer than two vertices

    gl.useProgram(this.prog);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STREAM_DRAW);

    // THE DEPTH STATE THE ORIGINAL WAS IN WHEN IT SUBMITTED THIS. 1 is
    // W3D_ENABLE and 2 is W3D_DISABLE, and both z states move together in the
    // original -- the test and the write are never set apart. Absent means the
    // caller is replaying a recording made before drawlog carried it, and the
    // old behaviour was depth off, so that is what absent gets.
    if (draw.z !== undefined) this.setZBuffer(draw.z === 1, draw.z === 1);
    const tex = draw.texture != null ? this.textures.get(draw.texture) : null;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex ?? null);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform1f(this.u.uTextured, tex ? 1 : 0);
    gl.uniform1f(this.u.uTexEnv, this.texEnv);
    gl.uniform1f(this.u.uTexAlpha, this.texAlpha);
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
    this.present();
    return { objects: frame.draws.length, triangles, glError: this.gl.getError() };
  }

  /** Blit the 16-bit target to the canvas. A no-op when drawing straight to it. */
  present() {
    const { gl } = this;
    if (!this.fbo) return;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.fbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    gl.blitFramebuffer(0, 0, SCREEN_W, SCREEN_H, 0, 0, SCREEN_W, SCREEN_H,
      gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
}

export { SCREEN_W, SCREEN_H, TEX_SIZE };
