// Fixed-function-style OpenGL 1.x emulation over WebGL2 for the Sunflower
// restorations. It retains the original PTCT surface while adding the subset
// observed in Wonder and Energia: two texture units and combiners, immediate
// normals, sphere-map texgen, viewport and line-width state.

import { Mat4 } from './mathlib.js';

const MAX_LIGHTS = 8;

// Lighting is per vertex, as OpenGL 1.x does it.
//
// It began as the narrow subset PTCT/Wonder/Energia needed: GL_COLOR_MATERIAL on
// with its default GL_AMBIENT_AND_DIFFUSE, so glColor drives both material
// terms, no light ambient, and no specular at all —
//
//     lit = 0.2 (GL's default global ambient) + sum of diffuse * N.L
//
// Lapsus drives the fixed-function pipeline harder: explicit glMaterialfv for
// ambient/diffuse/specular/shininess, a per-scene GL_LIGHT_MODEL_AMBIENT that
// is usually ZERO rather than GL's 0.2 default, and GL_SEPARATE_SPECULAR_COLOR
// so the highlight is added AFTER the texture stages instead of being
// modulated by them. All three are here now, and all three DEFAULT TO THE
// BEHAVIOUR ABOVE, so a caller that sets none of them renders exactly what it
// rendered before:
//
//     material()      -> colorMaterial stays on unless a material is given
//     lightModelAmbient() -> 0.2 until set
//     light specular  -> zero unless a light supplies one
//
// The separate-specular detail is not pedantry: it is the one neutral term in
// the pipeline that is NOT tinted by the texture, so it is what dilutes a
// reflection map's colour cast. Getting it wrong is what made Lapsus's
// reflective surfaces read as too saturated and too contrasty
// (productions/lapsus/work/re/RENDER.md §10.8).
const VS = `#version 300 es
precision highp float;
in vec3 aPos;
in vec2 aUV0;
in vec2 aUV1;
in vec4 aColor;
in vec3 aNormal;
uniform mat4 uModelView;
uniform mat4 uProjection;
uniform mat4 uTexMatrix0;
uniform mat4 uTexMatrix1;
uniform float uPointSize;
uniform bool uSphereMap0;
uniform bool uSphereMap1;
uniform bool uNormalizeNormals;
uniform int uLightCount;
uniform vec4 uLightPos[${MAX_LIGHTS}];      // eye space; w = 0 for directional
uniform vec3 uLightDiffuse[${MAX_LIGHTS}];
uniform vec3 uLightSpecular[${MAX_LIGHTS}];
uniform vec3 uLightModelAmbient;
uniform vec3 uMatAmbient;
uniform vec3 uMatDiffuse;
uniform vec3 uMatSpecular;
uniform float uMatShininess;
uniform bool uColorMaterial;
uniform vec4 uLightSpot[${MAX_LIGHTS}];     // xyz direction (eye space), w = cos(cutoff) or -1
out vec2 vUV0;
out vec2 vUV1;
out vec4 vColor;
out float vEyeDist;
out vec3 vLit;
out vec3 vSpec;
void main() {
  vec4 eye = uModelView * vec4(aPos, 1.0);
  gl_Position = uProjection * eye;
  gl_PointSize = uPointSize;
  vec2 sphereUV = vec2(0.5);
  if (uSphereMap0 || uSphereMap1) {
    // GL_SPHERE_MAP consumes the current eye-space normal. Deliberately do not
    // normalise it here: old fixed-function output changes when GL_NORMALIZE is
    // disabled, and these restorations preserve that behavior.
    vec3 u = normalize(eye.xyz);
    vec3 nTex = mat3(uModelView) * aNormal;
    if (uNormalizeNormals) nTex = normalize(nTex);
    vec3 r = u - 2.0 * nTex * dot(nTex, u);
    float m = 2.0 * sqrt(max(dot(r.xy, r.xy) + (r.z + 1.0) * (r.z + 1.0), 1e-20));
    sphereUV = r.xy / m + 0.5;
  }
  vec2 uv0 = uSphereMap0 ? sphereUV : aUV0;
  vec2 uv1 = uSphereMap1 ? sphereUV : aUV1;
  vUV0 = (uTexMatrix0 * vec4(uv0, 0.0, 1.0)).xy;
  vUV1 = (uTexMatrix1 * vec4(uv1, 0.0, 1.0)).xy;
  vColor = aColor;
  vEyeDist = -eye.z;
  // With GL_COLOR_MATERIAL on (the default here) glColor supplies both the
  // ambient and diffuse material terms, so they are 1 and the FS multiplies
  // by glColor afterwards. With an explicit material they come from it.
  vec3 mAmb = uColorMaterial ? vec3(1.0) : uMatAmbient;
  vec3 mDif = uColorMaterial ? vec3(1.0) : uMatDiffuse;
  vec3 lit = uLightModelAmbient * mAmb;
  vec3 spec = vec3(0.0);
  if (uLightCount > 0) {
    vec3 n = normalize(mat3(uModelView) * aNormal);
    for (int i = 0; i < ${MAX_LIGHTS}; i++) {
      if (i >= uLightCount) break;
      vec3 toLight = uLightPos[i].xyz - eye.xyz * uLightPos[i].w;
      vec3 l = normalize(toLight);
      float d = max(dot(n, l), 0.0);
      if (uLightSpot[i].w > -1.0) {
        float c = dot(normalize(-l), normalize(uLightSpot[i].xyz));
        d *= c < uLightSpot[i].w ? 0.0 : c;
      }
      lit += uLightDiffuse[i] * d * mDif;
      if (d > 0.0) {
        // INFINITE VIEWER. GL_LIGHT_MODEL_LOCAL_VIEWER defaults to FALSE, so
        // the eye vector is the constant (0,0,1) rather than the direction to
        // each vertex — a flatter, wider highlight than a local viewer gives.
        vec3 h = normalize(l + vec3(0.0, 0.0, 1.0));
        spec += uLightSpecular[i] * uMatSpecular
              * pow(max(dot(n, h), 0.0), max(uMatShininess, 1e-6));
      }
    }
  }
  vLit = lit;
  vSpec = spec;
}`;

const FS = `#version 300 es
precision mediump float;
in vec2 vUV0;
in vec2 vUV1;
in vec4 vColor;
in float vEyeDist;
in vec3 vLit;
in vec3 vSpec;
uniform sampler2D uSampler0;
uniform sampler2D uSampler1;
uniform bool uTexEnabled0;
uniform bool uTexEnabled1;
uniform int uTexMode0;
uniform int uTexMode1;
uniform int uCombineRGB0;
uniform int uCombineRGB1;
uniform ivec4 uSourceRGB0;
uniform ivec4 uSourceRGB1;
uniform ivec4 uOperandRGB0;
uniform ivec4 uOperandRGB1;
uniform int uCombineAlpha0;
uniform int uCombineAlpha1;
uniform ivec4 uSourceAlpha0;
uniform ivec4 uSourceAlpha1;
uniform ivec4 uOperandAlpha0;
uniform ivec4 uOperandAlpha1;
uniform vec4 uEnvColor0;
uniform vec4 uEnvColor1;
uniform vec2 uCombineScale0;
uniform vec2 uCombineScale1;
uniform bool uUseVertexColor;
uniform bool uLightingEnabled;
uniform vec4 uColor;
uniform vec3 uFog; // x: enabled, y: start, z: end (linear fog, black)
// [ptct ext] rgb = fog color; a > 0.5 selects OpenGL's default GL_EXP fog:
// f = exp(-density * eyeDist), c = mix(fogColor, c, f). density is passed in
// uFog.y (uFog.z unused in this mode). a = 0 keeps the legacy linear black fog.
uniform vec4 uFogColor;
uniform bool uPointMode;
out vec4 outColor;

vec4 sourceValue(int source, vec4 currentTexture, vec4 primary, vec4 previous,
                 vec4 texture0, vec4 texture1, vec4 constantColor) {
  if (source == 0) return currentTexture;
  if (source == 1) return constantColor;
  if (source == 2) return primary;
  if (source == 3) return previous;
  if (source == 4) return texture0;
  if (source == 5) return texture1;
  return vec4(0.0);
}

vec3 rgbOperand(vec4 value, int operand) {
  if (operand == 1) return vec3(1.0) - value.rgb;
  if (operand == 2) return vec3(value.a);
  if (operand == 3) return vec3(1.0 - value.a);
  return value.rgb;
}

float alphaOperand(vec4 value, int operand) {
  return (operand == 1 || operand == 3) ? 1.0 - value.a : value.a;
}

vec3 combineRgb(int operation, vec3 a, vec3 b, vec3 c) {
  if (operation == 0) return a;                         // REPLACE
  if (operation == 1) return a * b;                     // MODULATE
  if (operation == 2) return a + b;                     // ADD
  if (operation == 3) return a + b - vec3(0.5);         // ADD_SIGNED
  if (operation == 4) return a * c + b * (1.0 - c);     // INTERPOLATE
  if (operation == 5) return a - b;                     // SUBTRACT
  float d = 4.0 * dot(a - vec3(0.5), b - vec3(0.5));    // DOT3_RGB
  return vec3(d);
}

float combineAlpha(int operation, float a, float b, float c) {
  if (operation == 0) return a;
  if (operation == 1) return a * b;
  if (operation == 2) return a + b;
  if (operation == 3) return a + b - 0.5;
  if (operation == 4) return a * c + b * (1.0 - c);
  if (operation == 5) return a - b;
  return a;
}

vec3 combine4Rgb(int operation, vec3 a, vec3 b, vec3 c, vec3 d) {
  if (operation == 2) return a * b + c * d;             // ADD
  if (operation == 3) return a * b + c * d - vec3(0.5); // ADD_SIGNED
  // NV drivers retained the ordinary two/three-source operations here too;
  // Wonder relies on MODULATE for RGB while its alpha channel uses COMBINE4.
  return combineRgb(operation, a, b, c);
}

float combine4Alpha(int operation, float a, float b, float c, float d) {
  if (operation == 2) return a * b + c * d;
  if (operation == 3) return a * b + c * d - 0.5;
  return combineAlpha(operation, a, b, c);
}

vec4 applyTextureEnv(vec4 previous, vec4 texel, vec4 primary,
                     vec4 texture0, vec4 texture1, vec4 constantColor,
                     int mode, int rgbOp, ivec4 rgbSource, ivec4 rgbOperandMode,
                     int alphaOp, ivec4 alphaSource, ivec4 alphaOperandMode,
                     vec2 scale) {
  if (mode == 0) return previous * texel;                // MODULATE
  if (mode == 1) return texel;                           // REPLACE
  if (mode == 2) return clamp(previous + texel, 0.0, 1.0); // ADD
  if (mode == 3) {                                      // DECAL
    return vec4(mix(previous.rgb, texel.rgb, texel.a), previous.a);
  }
  if (mode == 4) {                                      // BLEND
    return vec4(mix(previous.rgb, constantColor.rgb, texel.rgb), previous.a * texel.a);
  }

  vec4 rs0 = sourceValue(rgbSource.x, texel, primary, previous, texture0, texture1, constantColor);
  vec4 rs1 = sourceValue(rgbSource.y, texel, primary, previous, texture0, texture1, constantColor);
  vec4 rs2 = sourceValue(rgbSource.z, texel, primary, previous, texture0, texture1, constantColor);
  vec4 rs3 = sourceValue(rgbSource.w, texel, primary, previous, texture0, texture1, constantColor);
  vec4 as0 = sourceValue(alphaSource.x, texel, primary, previous, texture0, texture1, constantColor);
  vec4 as1 = sourceValue(alphaSource.y, texel, primary, previous, texture0, texture1, constantColor);
  vec4 as2 = sourceValue(alphaSource.z, texel, primary, previous, texture0, texture1, constantColor);
  vec4 as3 = sourceValue(alphaSource.w, texel, primary, previous, texture0, texture1, constantColor);
  vec3 rgb = mode == 6
    ? combine4Rgb(rgbOp, rgbOperand(rs0, rgbOperandMode.x),
      rgbOperand(rs1, rgbOperandMode.y), rgbOperand(rs2, rgbOperandMode.z),
      rgbOperand(rs3, rgbOperandMode.w)) * scale.x
    : combineRgb(rgbOp, rgbOperand(rs0, rgbOperandMode.x),
      rgbOperand(rs1, rgbOperandMode.y), rgbOperand(rs2, rgbOperandMode.z)) * scale.x;
  float alpha = mode == 6
    ? combine4Alpha(alphaOp, alphaOperand(as0, alphaOperandMode.x),
      alphaOperand(as1, alphaOperandMode.y), alphaOperand(as2, alphaOperandMode.z),
      alphaOperand(as3, alphaOperandMode.w)) * scale.y
    : combineAlpha(alphaOp, alphaOperand(as0, alphaOperandMode.x),
      alphaOperand(as1, alphaOperandMode.y), alphaOperand(as2, alphaOperandMode.z)) * scale.y;
  return clamp(vec4(rgb, alpha), 0.0, 1.0);
}

void main() {
  // uniform color for array draws: constant vertex attributes are
  // historically unreliable on Safari's Metal-backed WebGL
  vec4 c = uUseVertexColor ? vColor : uColor;
  if (uLightingEnabled) c.rgb *= vLit;
  vec4 primary = c;
  vec4 tex0 = texture(uSampler0, vUV0);
  vec4 tex1 = texture(uSampler1, vUV1);
  if (uTexEnabled0) {
    c = applyTextureEnv(c, tex0, primary, tex0, tex1, uEnvColor0,
      uTexMode0, uCombineRGB0, uSourceRGB0, uOperandRGB0,
      uCombineAlpha0, uSourceAlpha0, uOperandAlpha0, uCombineScale0);
  }
  if (uTexEnabled1) {
    c = applyTextureEnv(c, tex1, primary, tex0, tex1, uEnvColor1,
      uTexMode1, uCombineRGB1, uSourceRGB1, uOperandRGB1,
      uCombineAlpha1, uSourceAlpha1, uOperandAlpha1, uCombineScale1);
  }
  // GL_SEPARATE_SPECULAR_COLOR: the secondary colour is added AFTER the
  // texture stages, so the highlight is not tinted by the texture the way the
  // diffuse term is. Zero unless a caller supplies both a light specular and a
  // material specular, so this is a no-op for callers that set neither.
  if (uLightingEnabled) c.rgb += vSpec;
  if (uFog.x > 0.5) {
    if (uFogColor.a > 0.5) { // [ptct ext] exponential fog toward a color
      float f = clamp(exp(-uFog.y * vEyeDist), 0.0, 1.0);
      c.rgb = mix(uFogColor.rgb, c.rgb, f);
    } else {
      float f = clamp((uFog.z - vEyeDist) / (uFog.z - uFog.y), 0.0, 1.0);
      c.rgb *= f;
    }
  }
  if (uPointMode) {
    // GL_POINT_SMOOTH produces circular, antialiased point footprints. WebGL
    // exposes the point coordinate but not that fixed-function switch, so the
    // same coverage is reconstructed in the fragment shader.
    float pointDistance = length(gl_PointCoord - vec2(0.5));
    if (pointDistance > 0.5) discard;
    c.a *= 1.0 - smoothstep(0.42, 0.5, pointDistance);
  }
  outColor = c;
}`;

const MAX_IMM_VERTS = 65536;
const IMM_FLOATS = 14; // xyz, uv0, uv1, rgba, normal

const ENV_MODES = Object.freeze({ modulate: 0, replace: 1, add: 2, decal: 3, blend: 4, combine: 5, combine4: 6 });
const COMBINE_OPS = Object.freeze({
  replace: 0, modulate: 1, add: 2, add_signed: 3, interpolate: 4, subtract: 5, dot3: 6,
});
const COMBINE_SOURCES = Object.freeze({
  texture: 0, constant: 1, primary_color: 2, previous: 3, texture0: 4, texture1: 5, zero: 6,
});
const COMBINE_OPERANDS = Object.freeze({
  src_color: 0, one_minus_src_color: 1, src_alpha: 2, one_minus_src_alpha: 3,
});

function defaultTextureUnit() {
  return {
    enabled: false,
    boundTex: null,
    matrix: new Mat4(),
    stack: [],
    sphereMap: false,
    env: {
      mode: 'modulate',
      color: [0, 0, 0, 0],
      rgb: { operation: 'modulate', sources: ['texture', 'previous', 'constant'], operands: ['src_color', 'src_color', 'src_alpha'], scale: 1 },
      alpha: { operation: 'modulate', sources: ['texture', 'previous', 'constant'], operands: ['src_alpha', 'src_alpha', 'src_alpha'], scale: 1 },
    },
  };
}

export class MiniGL {
  constructor(canvas) {
    const attribs = { alpha: false, antialias: true, depth: true, preserveDrawingBuffer: false };
    let gl = canvas.getContext('webgl2', attribs);
    if (!gl) gl = canvas.getContext('webgl2', { ...attribs, antialias: false });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;

    this.contextLost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
    });

    // enums
    this.QUADS = 1; this.TRIANGLES = 2; this.LINES = 3; this.POINTS = 4;
    this.LINE_STRIP = 5;
    this.PROJECTION = 0; this.MODELVIEW = 1; this.TEXTURE = 2;
    this.TEXTURE0 = 0; this.TEXTURE1 = 1;
    this.SRC_ALPHA = gl.SRC_ALPHA;
    this.SRC_COLOR = gl.SRC_COLOR;
    this.ONE_MINUS_SRC_COLOR = gl.ONE_MINUS_SRC_COLOR;
    this.ONE = gl.ONE;
    this.ZERO = gl.ZERO;
    this.ONE_MINUS_SRC_ALPHA = gl.ONE_MINUS_SRC_ALPHA;
    this.FRONT = gl.FRONT;
    this.BACK = gl.BACK;
    this.LEQUAL = gl.LEQUAL;
    this.LESS = gl.LESS;

    // program
    const prog = gl.createProgram();
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        throw new Error('Shader error: ' + gl.getShaderInfoLog(sh));
      }
      gl.attachShader(prog, sh);
    };
    compile(gl.VERTEX_SHADER, VS);
    compile(gl.FRAGMENT_SHADER, FS);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error('Link error: ' + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);
    this.prog = prog;
    this.uModelView = gl.getUniformLocation(prog, 'uModelView');
    this.uProjection = gl.getUniformLocation(prog, 'uProjection');
    this.uPointSize = gl.getUniformLocation(prog, 'uPointSize');
    this.uPointMode = gl.getUniformLocation(prog, 'uPointMode');
    this.uTexMatrix = [
      gl.getUniformLocation(prog, 'uTexMatrix0'),
      gl.getUniformLocation(prog, 'uTexMatrix1'),
    ];
    this.uTexEnabled = [
      gl.getUniformLocation(prog, 'uTexEnabled0'),
      gl.getUniformLocation(prog, 'uTexEnabled1'),
    ];
    this.uSphereMap = [
      gl.getUniformLocation(prog, 'uSphereMap0'),
      gl.getUniformLocation(prog, 'uSphereMap1'),
    ];
    this.uNormalizeNormals = gl.getUniformLocation(prog, 'uNormalizeNormals');
    this.uTexMode = [
      gl.getUniformLocation(prog, 'uTexMode0'),
      gl.getUniformLocation(prog, 'uTexMode1'),
    ];
    this.uCombineRGB = [
      gl.getUniformLocation(prog, 'uCombineRGB0'),
      gl.getUniformLocation(prog, 'uCombineRGB1'),
    ];
    this.uSourceRGB = [
      gl.getUniformLocation(prog, 'uSourceRGB0'),
      gl.getUniformLocation(prog, 'uSourceRGB1'),
    ];
    this.uOperandRGB = [
      gl.getUniformLocation(prog, 'uOperandRGB0'),
      gl.getUniformLocation(prog, 'uOperandRGB1'),
    ];
    this.uCombineAlpha = [
      gl.getUniformLocation(prog, 'uCombineAlpha0'),
      gl.getUniformLocation(prog, 'uCombineAlpha1'),
    ];
    this.uSourceAlpha = [
      gl.getUniformLocation(prog, 'uSourceAlpha0'),
      gl.getUniformLocation(prog, 'uSourceAlpha1'),
    ];
    this.uOperandAlpha = [
      gl.getUniformLocation(prog, 'uOperandAlpha0'),
      gl.getUniformLocation(prog, 'uOperandAlpha1'),
    ];
    this.uEnvColor = [
      gl.getUniformLocation(prog, 'uEnvColor0'),
      gl.getUniformLocation(prog, 'uEnvColor1'),
    ];
    this.uCombineScale = [
      gl.getUniformLocation(prog, 'uCombineScale0'),
      gl.getUniformLocation(prog, 'uCombineScale1'),
    ];
    this.uUseVertexColor = gl.getUniformLocation(prog, 'uUseVertexColor');
    this.uColor = gl.getUniformLocation(prog, 'uColor');
    this.uFog = gl.getUniformLocation(prog, 'uFog');
    // [ptct ext] see fogExp()/fogExpOff() below
    this.uFogColor = gl.getUniformLocation(prog, 'uFogColor');
    gl.uniform4f(this.uFogColor, 0, 0, 0, 0);
    this.uLightingEnabled = gl.getUniformLocation(prog, 'uLightingEnabled');
    this.uLightCount = gl.getUniformLocation(prog, 'uLightCount');
    this.uLightPos = gl.getUniformLocation(prog, 'uLightPos');
    this.uLightDiffuse = gl.getUniformLocation(prog, 'uLightDiffuse');
    this.uLightSpecular = gl.getUniformLocation(prog, 'uLightSpecular');
    this.uLightModelAmbient = gl.getUniformLocation(prog, 'uLightModelAmbient');
    this.uMatAmbient = gl.getUniformLocation(prog, 'uMatAmbient');
    this.uMatDiffuse = gl.getUniformLocation(prog, 'uMatDiffuse');
    this.uMatSpecular = gl.getUniformLocation(prog, 'uMatSpecular');
    this.uMatShininess = gl.getUniformLocation(prog, 'uMatShininess');
    this.uColorMaterial = gl.getUniformLocation(prog, 'uColorMaterial');
    this.uLightSpot = gl.getUniformLocation(prog, 'uLightSpot');
    this.aPos = gl.getAttribLocation(prog, 'aPos');
    this.aUV = [gl.getAttribLocation(prog, 'aUV0'), gl.getAttribLocation(prog, 'aUV1')];
    this.aColor = gl.getAttribLocation(prog, 'aColor');
    this.aNormal = gl.getAttribLocation(prog, 'aNormal');
    this.lightingOn = false;
    this.normalizeNormals = false;
    this.nLights = 0;

    // matrix stacks
    this.matrices = [new Mat4(), new Mat4()];
    this.stacks = [[], []];
    this.textureUnits = [defaultTextureUnit(), defaultTextureUnit()];
    this.activeTextureUnit = 0;
    this.mode = this.MODELVIEW;
    this.matricesDirty = true;

    // render state
    this.curColor = [1, 1, 1, 1];
    this.pointSizeValue = 1;
    gl.activeTexture(gl.TEXTURE0);
    this._initMaterialDefaults();
    this.whiteTex = this._makeWhiteTexture();
    this.fogEnabled = false;
    this.fogStart = 0;
    this.fogEnd = 1;

    // immediate mode batch: interleaved xyz, uv0, uv1, rgba, normal
    this.immData = new Float32Array(MAX_IMM_VERTS * IMM_FLOATS);
    this.immCount = 0;
    this.immMode = 0;
    this.curUV = [[0, 0], [0, 0]];
    this.curNormal = [0, 0, 1];

    this.immVBO = gl.createBuffer();
    this.quadIBO = gl.createBuffer();
    this._quadIndexCount = 0;
    this._growQuadIndices(4096);

    // debug: render everything as line skeletons instead of filled triangles
    this.wireframe = false;
    this.quadLineIBO = gl.createBuffer();
    this._quadLineIndexCount = 0;
    this.triLineIBO = gl.createBuffer();
    this._triLineIndexCount = 0;

    // scratch buffers for array draws
    this.posVBO = gl.createBuffer();
    this.uvVBO = [gl.createBuffer(), gl.createBuffer()];
    this.nrmVBO = gl.createBuffer();
    this.idxIBO = gl.createBuffer();

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(0, 0, 0, 1);
    gl.uniform1i(gl.getUniformLocation(prog, 'uSampler0'), 0);
    gl.uniform1i(gl.getUniformLocation(prog, 'uSampler1'), 1);
  }

  _initMaterialDefaults() {
    // Defaults reproduce the pre-material behaviour exactly: colour material
    // on, GL's 0.2 global ambient, no specular anywhere.
    this.colorMaterial = true;
    this.matAmbient = [1, 1, 1];
    this.matDiffuse = [1, 1, 1];
    this.matSpecular = [0, 0, 0];
    this.matShininess = 0;
    this.lightModelAmbient_ = [0.2, 0.2, 0.2];
    this.lightSpecular = new Float32Array(MAX_LIGHTS * 3);
  }

  _makeWhiteTexture() {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]));
    return tex;
  }

  _growQuadIndices(nQuads) {
    if (this._quadIndexCount >= nQuads * 6) return;
    const idx = new Uint32Array(nQuads * 6);
    for (let q = 0; q < nQuads; q++) {
      idx[q * 6 + 0] = q * 4 + 0;
      idx[q * 6 + 1] = q * 4 + 1;
      idx[q * 6 + 2] = q * 4 + 2;
      idx[q * 6 + 3] = q * 4 + 0;
      idx[q * 6 + 4] = q * 4 + 2;
      idx[q * 6 + 5] = q * 4 + 3;
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this._quadIndexCount = nQuads * 6;
  }

  _growQuadLineIndices(nQuads) {
    if (this._quadLineIndexCount >= nQuads * 8) return;
    const idx = new Uint32Array(nQuads * 8);
    for (let q = 0; q < nQuads; q++) {
      const b = q * 4;
      idx.set([b, b + 1, b + 1, b + 2, b + 2, b + 3, b + 3, b], q * 8);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadLineIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this._quadLineIndexCount = nQuads * 8;
  }

  _growTriLineIndices(nTris) {
    if (this._triLineIndexCount >= nTris * 6) return;
    const idx = new Uint32Array(nTris * 6);
    for (let t = 0; t < nTris; t++) {
      const b = t * 3;
      idx.set([b, b + 1, b + 1, b + 2, b + 2, b], t * 6);
    }
    const gl = this.gl;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triLineIBO);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this._triLineIndexCount = nTris * 6;
  }

  // ----- texture management -----

  createTextureFromImage(image, mipmap = false, clamp = false) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    this._setTexParams(mipmap, clamp);
    this.textureUnits[this.activeTextureUnit].boundTex = tex;
    return tex;
  }

  createTextureFromData(data, width, height, mipmap = false, clamp = false) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    this._setTexParams(mipmap, clamp);
    this.textureUnits[this.activeTextureUnit].boundTex = tex;
    return tex;
  }

  // `clamp` may be false, true (both axes) or 't' (V only — D3D lets the
  // two addressing modes differ, and Nowhere's credits need exactly that:
  // U carries a scrolling offset that has to wrap, V is a single band)
  _setTexParams(mipmap, clamp = false) {
    const gl = this.gl;
    const wrapS = clamp === true ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    const wrapT = clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  bindTexture(tex) {
    const unit = this.textureUnits[this.activeTextureUnit];
    if (unit.boundTex !== tex) {
      this.gl.bindTexture(this.gl.TEXTURE_2D, tex);
      unit.boundTex = tex;
    }
  }

  activeTexture(unit) {
    // Accept the compact 0/1 API as well as the original GL_TEXTURE0_ARB enum.
    const index = unit >= 0x84c0 ? unit - 0x84c0 : unit;
    if (index !== 0 && index !== 1) throw new Error(`unsupported texture unit ${unit}`);
    this.activeTextureUnit = index;
    this.gl.activeTexture(this.gl.TEXTURE0 + index);
  }

  // ----- matrix API -----

  matrixMode(m) { this.mode = m; }
  get cur() {
    return this.mode === this.TEXTURE
      ? this.textureUnits[this.activeTextureUnit].matrix
      : this.matrices[this.mode];
  }
  loadIdentity() { this.cur.identity(); this.matricesDirty = true; }
  loadMatrix(mat) { this.cur.copy(mat); this.matricesDirty = true; }
  multMatrix(mat) { this.cur.mult(mat); this.matricesDirty = true; }
  frustum(l, r, b, t, n, f) { this.cur.frustum(l, r, b, t, n, f); this.matricesDirty = true; }
  ortho(l, r, b, t, n, f) { this.cur.ortho(l, r, b, t, n, f); this.matricesDirty = true; }
  translate(x, y, z) { this.cur.translate(x, y, z); this.matricesDirty = true; }
  rotate(a, x, y, z) { this.cur.rotate(a, x, y, z); this.matricesDirty = true; }
  scale(x, y, z) { this.cur.scale(x, y, z); this.matricesDirty = true; }
  pushMatrix() {
    const stack = this.mode === this.TEXTURE
      ? this.textureUnits[this.activeTextureUnit].stack : this.stacks[this.mode];
    stack.push(this.cur.clone());
  }
  popMatrix() {
    if (this.mode === this.TEXTURE) {
      const unit = this.textureUnits[this.activeTextureUnit];
      const matrix = unit.stack.pop();
      if (matrix) { unit.matrix = matrix; this.matricesDirty = true; }
    } else {
      const matrix = this.stacks[this.mode].pop();
      if (matrix) { this.matrices[this.mode] = matrix; this.matricesDirty = true; }
    }
  }
  getModelView() { return this.matrices[this.MODELVIEW].clone(); }

  _syncMatrices() {
    if (!this.matricesDirty) return;
    const gl = this.gl;
    gl.uniformMatrix4fv(this.uProjection, false, this.matrices[this.PROJECTION].m);
    gl.uniformMatrix4fv(this.uModelView, false, this.matrices[this.MODELVIEW].m);
    gl.uniformMatrix4fv(this.uTexMatrix[0], false, this.textureUnits[0].matrix.m);
    gl.uniformMatrix4fv(this.uTexMatrix[1], false, this.textureUnits[1].matrix.m);
    this.matricesDirty = false;
  }

  // ----- render state -----

  color4(r, g, b, a) {
    this.curColor[0] = r; this.curColor[1] = g; this.curColor[2] = b; this.curColor[3] = a;
  }

  enableTexture(on) { this.textureUnits[this.activeTextureUnit].enabled = !!on; }
  texGenSphereMap(on) { this.textureUnits[this.activeTextureUnit].sphereMap = !!on; }
  enableNormalize(on) { this.normalizeNormals = !!on; }

  /** Configure the active unit's fixed-function texture environment. */
  texEnv(config) {
    const unit = this.textureUnits[this.activeTextureUnit];
    const next = structuredClone(unit.env);
    if (config.mode !== undefined) {
      if (!(config.mode in ENV_MODES)) throw new Error(`unknown texture env mode ${config.mode}`);
      next.mode = config.mode;
    }
    if (config.color !== undefined) {
      if (!Array.isArray(config.color) || config.color.length !== 4
          || config.color.some((value) => !Number.isFinite(value))) {
        throw new Error('texture env color must contain four finite values');
      }
      next.color = config.color.slice();
    }
    for (const channel of ['rgb', 'alpha']) {
      if (!config[channel]) continue;
      const value = config[channel];
      if (value.operation !== undefined) next[channel].operation = value.operation;
      if (value.sources !== undefined) next[channel].sources = value.sources.slice();
      if (value.operands !== undefined) next[channel].operands = value.operands.slice();
      if (value.scale !== undefined) next[channel].scale = value.scale;
      if (!(next[channel].operation in COMBINE_OPS)) {
        throw new Error(`unknown ${channel} combine operation ${next[channel].operation}`);
      }
      if (![3, 4].includes(next[channel].sources.length)
          || next[channel].sources.some((source) => !(source in COMBINE_SOURCES))) {
        throw new Error(`${channel} combine requires three or four known sources`);
      }
      if (![3, 4].includes(next[channel].operands.length)
          || next[channel].operands.some((operand) => !(operand in COMBINE_OPERANDS))) {
        throw new Error(`${channel} combine requires three or four known operands`);
      }
      if (![1, 2, 4].includes(next[channel].scale)) {
        throw new Error(`${channel} combine scale must be 1, 2 or 4`);
      }
    }
    if (next.mode === 'combine4') {
      for (const channel of ['rgb', 'alpha']) {
        if (next[channel].sources.length !== 4 || next[channel].operands.length !== 4) {
          throw new Error(`${channel} combine4 requires four sources and operands`);
        }
      }
    }
    unit.env = next;
  }
  enableBlend(on) { const gl = this.gl; on ? gl.enable(gl.BLEND) : gl.disable(gl.BLEND); }
  enableDepthTest(on) { const gl = this.gl; on ? gl.enable(gl.DEPTH_TEST) : gl.disable(gl.DEPTH_TEST); }
  enableCullFace(on) { const gl = this.gl; on ? gl.enable(gl.CULL_FACE) : gl.disable(gl.CULL_FACE); }
  enableFog(on) { this.fogEnabled = on; }

  // ----- lighting -----
  //
  // `lights` is an array of { pos, diffuse, spotDir, spotCos }, all in eye
  // space, matching what ogl_light::calculate hands to glLightfv. A light
  // with spotCos < 0 is an omni.
  enableLighting(on) { this.lightingOn = !!on; }

  /**
   * Explicit material, i.e. glMaterialfv. Passing one turns GL_COLOR_MATERIAL
   * OFF for subsequent draws, because a caller that sets a material means it.
   * `material(null)` restores glColor-driven ambient+diffuse.
   *
   * `shininess` is clamped to [0,128] as GL requires. Out of range, real GL
   * raises GL_INVALID_VALUE and keeps the PREVIOUS value; clamping is what the
   * 2000-era drivers these captures came from actually did, measured against
   * one (productions/lapsus/work/re/RENDER.md §10.6).
   */
  material(m) {
    if (!m) { this.colorMaterial = true; return; }
    this.colorMaterial = false;
    this.matAmbient = m.ambient ?? [1, 1, 1];
    this.matDiffuse = m.diffuse ?? [1, 1, 1];
    this.matSpecular = m.specular ?? [0, 0, 0];
    this.matShininess = Math.max(0, Math.min(128, m.shininess ?? 0));
  }

  /** GL_LIGHT_MODEL_AMBIENT. GL's default is 0.2 grey; scenes often set 0. */
  lightModelAmbient(r, g, b) { this.lightModelAmbient_ = [r, g, b]; }

  setLights(lights) {
    const gl = this.gl;
    const n = Math.min(lights.length, MAX_LIGHTS);
    const pos = new Float32Array(MAX_LIGHTS * 4);
    const dif = new Float32Array(MAX_LIGHTS * 3);
    const spot = new Float32Array(MAX_LIGHTS * 4);
    // Per-light specular, zero unless supplied — so a caller that never sets
    // one gets no specular term at all, as before.
    const spc = new Float32Array(MAX_LIGHTS * 3);
    for (let i = 0; i < n; i++) {
      const l = lights[i];
      pos.set([l.pos[0], l.pos[1], l.pos[2], l.pos.length > 3 ? l.pos[3] : 1], i * 4);
      dif.set([l.diffuse[0], l.diffuse[1], l.diffuse[2]], i * 3);
      if (l.specular) spc.set([l.specular[0], l.specular[1], l.specular[2]], i * 3);
      const d = l.spotDir || [0, 0, -1];
      spot.set([d[0], d[1], d[2], l.spotCos === undefined ? -1 : l.spotCos], i * 4);
    }
    this.nLights = n;
    gl.uniform4fv(this.uLightPos, pos);
    gl.uniform3fv(this.uLightDiffuse, dif);
    gl.uniform3fv(this.uLightSpecular, spc);
    gl.uniform4fv(this.uLightSpot, spot);
  }
  fog(start, end) { this.fogStart = start; this.fogEnd = end; }

  // [ptct ext] OpenGL-default GL_EXP fog toward a color, as ptct's engine uses
  // (it sets GL_FOG_DENSITY = 1/fogDist and never changes GL_FOG_MODE from the
  // GL_EXP default). Enable with enableFog(true) as usual; fogExpOff() returns
  // the shader to the legacy linear black fog. Additive extension — the legacy
  // fog path is untouched when fogExp is never called.
  fogExp(density, r, g, b) {
    this.fogStart = density; this.fogEnd = 0;
    this.gl.uniform4f(this.uFogColor, r, g, b, 1);
  }
  fogExpOff() { this.gl.uniform4f(this.uFogColor, 0, 0, 0, 0); }
  blendFunc(src, dst) { this.gl.blendFunc(src, dst); }
  depthMask(on) { this.gl.depthMask(!!on); }
  depthFunc(fn) { this.gl.depthFunc(fn); }
  cullFace(face) { this.gl.cullFace(face); }
  lineWidth(width) {
    const range = this.gl.getParameter(this.gl.ALIASED_LINE_WIDTH_RANGE);
    this.gl.lineWidth(Math.max(range[0], Math.min(range[1], width)));
  }
  pointSize(size) {
    if (!Number.isFinite(size) || size <= 0) throw new Error('point size must be positive and finite');
    this.pointSizeValue = size;
  }
  viewport(x, y, width, height) { this.gl.viewport(x, y, width, height); }
  lockArrays() {} // GL_EXT_compiled_vertex_array is only a driver hint.
  unlockArrays() {}

  clear() {
    const gl = this.gl;
    gl.depthMask(true);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  _applyCommonUniforms(pointMode = false) {
    const gl = this.gl;
    this._syncMatrices();
    for (let index = 0; index < 2; index++) {
      const unit = this.textureUnits[index], env = unit.env;
      gl.activeTexture(gl.TEXTURE0 + index);
      gl.bindTexture(gl.TEXTURE_2D, unit.enabled ? (unit.boundTex || this.whiteTex) : this.whiteTex);
      gl.uniform1i(this.uTexEnabled[index], unit.enabled ? 1 : 0);
      gl.uniform1i(this.uSphereMap[index], unit.sphereMap ? 1 : 0);
      gl.uniform1i(this.uTexMode[index], ENV_MODES[env.mode]);
      gl.uniform1i(this.uCombineRGB[index], COMBINE_OPS[env.rgb.operation]);
      const rgbSources = [...env.rgb.sources, 'zero'].slice(0, 4);
      const rgbOperands = [...env.rgb.operands, 'src_color'].slice(0, 4);
      const alphaSources = [...env.alpha.sources, 'zero'].slice(0, 4);
      const alphaOperands = [...env.alpha.operands, 'src_alpha'].slice(0, 4);
      gl.uniform4iv(this.uSourceRGB[index], rgbSources.map((value) => COMBINE_SOURCES[value]));
      gl.uniform4iv(this.uOperandRGB[index], rgbOperands.map((value) => COMBINE_OPERANDS[value]));
      gl.uniform1i(this.uCombineAlpha[index], COMBINE_OPS[env.alpha.operation]);
      gl.uniform4iv(this.uSourceAlpha[index], alphaSources.map((value) => COMBINE_SOURCES[value]));
      gl.uniform4iv(this.uOperandAlpha[index], alphaOperands.map((value) => COMBINE_OPERANDS[value]));
      gl.uniform4fv(this.uEnvColor[index], env.color);
      gl.uniform2f(this.uCombineScale[index], env.rgb.scale, env.alpha.scale);
    }
    gl.activeTexture(gl.TEXTURE0 + this.activeTextureUnit);
    gl.uniform1i(this.uNormalizeNormals, this.normalizeNormals ? 1 : 0);
    gl.uniform1i(this.uLightingEnabled, this.lightingOn ? 1 : 0);
    gl.uniform1i(this.uColorMaterial, this.colorMaterial ? 1 : 0);
    gl.uniform3fv(this.uMatAmbient, this.matAmbient);
    gl.uniform3fv(this.uMatDiffuse, this.matDiffuse);
    gl.uniform3fv(this.uMatSpecular, this.matSpecular);
    gl.uniform1f(this.uMatShininess, this.matShininess);
    gl.uniform3fv(this.uLightModelAmbient, this.lightModelAmbient_);
    gl.uniform1i(this.uLightCount, this.lightingOn ? this.nLights : 0);
    gl.uniform3f(this.uFog, this.fogEnabled ? 1 : 0, this.fogStart, this.fogEnd);
    gl.uniform1f(this.uPointSize, this.pointSizeValue);
    gl.uniform1i(this.uPointMode, pointMode ? 1 : 0);
  }

  // ----- immediate mode -----

  begin(mode) {
    this.immMode = mode;
    this.immCount = 0;
  }

  texCoord2(u, v) { this.curUV[0][0] = u; this.curUV[0][1] = v; }
  multiTexCoord2(unit, u, v) {
    const index = unit >= 0x84c0 ? unit - 0x84c0 : unit;
    if (index !== 0 && index !== 1) throw new Error(`unsupported texture coordinate unit ${unit}`);
    this.curUV[index][0] = u; this.curUV[index][1] = v;
  }
  normal3(x, y, z) {
    this.curNormal[0] = x; this.curNormal[1] = y; this.curNormal[2] = z;
  }
  normal3v(v) { this.normal3(v.x ?? v[0], v.y ?? v[1], v.z ?? v[2]); }

  vertex3(x, y, z) {
    if (this.immCount >= MAX_IMM_VERTS) throw new Error('MiniGL immediate buffer overflow');
    const i = this.immCount * IMM_FLOATS;
    const d = this.immData;
    d[i] = x; d[i + 1] = y; d[i + 2] = z;
    d[i + 3] = this.curUV[0][0]; d[i + 4] = this.curUV[0][1];
    d[i + 5] = this.curUV[1][0]; d[i + 6] = this.curUV[1][1];
    d[i + 7] = this.curColor[0]; d[i + 8] = this.curColor[1];
    d[i + 9] = this.curColor[2]; d[i + 10] = this.curColor[3];
    d[i + 11] = this.curNormal[0]; d[i + 12] = this.curNormal[1]; d[i + 13] = this.curNormal[2];
    this.immCount++;
  }

  vertex3v(v) { this.vertex3(v.x, v.y, v.z); }

  end() {
    const n = this.immCount;
    if (n === 0) return;
    const gl = this.gl;
    this._applyCommonUniforms(this.immMode === this.POINTS);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.immVBO);
    gl.bufferData(gl.ARRAY_BUFFER, this.immData.subarray(0, n * IMM_FLOATS), gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, IMM_FLOATS * 4, 0);
    gl.enableVertexAttribArray(this.aUV[0]);
    gl.vertexAttribPointer(this.aUV[0], 2, gl.FLOAT, false, IMM_FLOATS * 4, 12);
    gl.enableVertexAttribArray(this.aUV[1]);
    gl.vertexAttribPointer(this.aUV[1], 2, gl.FLOAT, false, IMM_FLOATS * 4, 20);
    gl.enableVertexAttribArray(this.aColor);
    gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, IMM_FLOATS * 4, 28);
    gl.uniform1i(this.uUseVertexColor, 1);
    if (this.aNormal >= 0) {
      gl.enableVertexAttribArray(this.aNormal);
      gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, IMM_FLOATS * 4, 44);
    }

    if (this.immMode === this.QUADS) {
      const quads = n >> 2;
      if (this.wireframe) {
        this._growQuadLineIndices(quads);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadLineIBO);
        gl.drawElements(gl.LINES, quads * 8, gl.UNSIGNED_INT, 0);
      } else {
        this._growQuadIndices(quads);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.quadIBO);
        gl.drawElements(gl.TRIANGLES, quads * 6, gl.UNSIGNED_INT, 0);
      }
    } else if (this.immMode === this.TRIANGLES) {
      if (this.wireframe) {
        const tris = Math.floor(n / 3);
        this._growTriLineIndices(tris);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.triLineIBO);
        gl.drawElements(gl.LINES, tris * 6, gl.UNSIGNED_INT, 0);
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, n);
      }
    } else if (this.immMode === this.LINES) {
      gl.drawArrays(gl.LINES, 0, n);
    } else if (this.immMode === this.LINE_STRIP) {
      gl.drawArrays(gl.LINE_STRIP, 0, n);
    } else if (this.immMode === this.POINTS) {
      gl.drawArrays(gl.POINTS, 0, n);
    }
    this.immCount = 0;
  }

  // ----- vertex-array draws (glVertexPointer/glTexCoordPointer/glDrawElements) -----
  // positions: Float32Array of xyz, uvs: Float32Array of uv, indices: Uint32Array
  // colors (optional): Float32Array of rgba per vertex — the D3D-era
  // XYZ|DIFFUSE|TEX1 vertex layout; omitted, the current color applies.

  // An unindexed triangle list, for effects that expand their own indices
  // — xotrack's do, because they emit through glBegin/glVertex3f and
  // recompute each vertex as they go.
  drawArraysTri(positions, uvs, uvs1 = null) {
    const gl = this.gl;
    this._applyCommonUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVBO);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVBO[0]);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aUV[0]);
    gl.vertexAttribPointer(this.aUV[0], 2, gl.FLOAT, false, 0, 0);
    if (uvs1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVBO[1]);
      gl.bufferData(gl.ARRAY_BUFFER, uvs1, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(this.aUV[1]);
      gl.vertexAttribPointer(this.aUV[1], 2, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(this.aUV[1]);
      gl.vertexAttrib2f(this.aUV[1], 0, 0);
    }

    gl.disableVertexAttribArray(this.aColor);
    gl.uniform1i(this.uUseVertexColor, 0);
    gl.uniform4fv(this.uColor, this.curColor);
    if (this.aNormal >= 0) {
      gl.disableVertexAttribArray(this.aNormal);
      gl.vertexAttrib3f(this.aNormal, 0, 0, 1);
    }

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3);
  }

  // An unindexed line list, for showCylinder — which emits its wireframe
  // through glBegin(GL_LINES) a triangle at a time.
  drawArraysLines(positions) {
    const gl = this.gl;
    this._applyCommonUniforms();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVBO);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    for (const attribute of this.aUV) {
      gl.disableVertexAttribArray(attribute);
      gl.vertexAttrib2f(attribute, 0, 0);
    }
    gl.disableVertexAttribArray(this.aColor);
    gl.uniform1i(this.uUseVertexColor, 0);
    gl.uniform4fv(this.uColor, this.curColor);
    if (this.aNormal >= 0) {
      gl.disableVertexAttribArray(this.aNormal);
      gl.vertexAttrib3f(this.aNormal, 0, 0, 1);
    }
    gl.drawArrays(gl.LINES, 0, positions.length / 3);
  }

  // ---- retained geometry.
  //
  // The array draws above re-upload their vertices EVERY call, which is right
  // for an immediate-mode caller replaying a few hundred vertices per effect.
  // It is the wrong shape for a port with real meshes: Lapsus draws 50k
  // triangles per object at 60fps, and re-uploading that per frame is the
  // whole frame budget. These create the buffers once and draw them many
  // times, with a VAO so the attribute setup leaves the draw loop too.
  //
  // Attribute locations belong to minigl's single program, so the VAO is only
  // valid for this instance — which is also why the mesh handle is opaque and
  // must be freed through deleteMesh rather than by the caller.

  /**
   * @param {object} m  { positions, indices, normals?, uv0?, uv1? } — typed
   *                    arrays. `indices` may be Uint16Array or Uint32Array.
   */
  createMesh(m) {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const attach = (data, loc, size) => {
      if (!data || loc < 0) return null;
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      return b;
    };
    const pos = attach(m.positions, this.aPos, 3);
    const nrm = attach(m.normals, this.aNormal, 3);
    const uv0 = attach(m.uv0, this.aUV[0], 2);
    const uv1 = attach(m.uv1, this.aUV[1], 2);
    // Constant attributes for anything absent. enable/disable is VAO state, so
    // it has to be set here rather than at draw time.
    if (!m.normals && this.aNormal >= 0) gl.disableVertexAttribArray(this.aNormal);
    if (!m.uv0 && this.aUV[0] >= 0) gl.disableVertexAttribArray(this.aUV[0]);
    if (!m.uv1 && this.aUV[1] >= 0) gl.disableVertexAttribArray(this.aUV[1]);
    if (this.aColor >= 0) gl.disableVertexAttribArray(this.aColor);

    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return {
      vao, ib, pos, nrm, uv0, uv1,
      count: m.indices.length,
      type: m.indices instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT,
      bytes: m.indices instanceof Uint16Array ? 2 : 4,
    };
  }

  /** Replace positions and/or normals in place — for morph targets. */
  updateMesh(mesh, { positions = null, normals = null } = {}) {
    const gl = this.gl;
    if (positions && mesh.pos) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    }
    if (normals && mesh.nrm) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrm);
      gl.bufferData(gl.ARRAY_BUFFER, normals, gl.DYNAMIC_DRAW);
    }
  }

  /** Draw a retained mesh, or a range of it. */
  drawMesh(mesh, count = mesh.count, offset = 0) {
    const gl = this.gl;
    this._applyCommonUniforms();
    // No per-vertex colours on a retained mesh: glColor drives the primary,
    // the same as the array path's `colors === null` branch.
    gl.uniform1i(this.uUseVertexColor, 0);
    gl.uniform4fv(this.uColor, this.curColor);
    gl.bindVertexArray(mesh.vao);
    gl.drawElements(gl.TRIANGLES, count, mesh.type, offset * mesh.bytes);
    gl.bindVertexArray(null);
  }

  deleteMesh(mesh) {
    const gl = this.gl;
    for (const b of [mesh.pos, mesh.nrm, mesh.uv0, mesh.uv1, mesh.ib]) if (b) gl.deleteBuffer(b);
    gl.deleteVertexArray(mesh.vao);
  }

  drawElements(positions, uvs, indices, colors = null, normals = null, mode = null, uvs1 = null) {
    const gl = this.gl;
    this._applyCommonUniforms();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.posVBO);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

    if (normals && this.aNormal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.nrmVBO);
      gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(this.aNormal);
      gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);
    } else if (this.aNormal >= 0) {
      gl.disableVertexAttribArray(this.aNormal);
      gl.vertexAttrib3f(this.aNormal, 0, 0, 1);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVBO[0]);
    gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(this.aUV[0]);
    gl.vertexAttribPointer(this.aUV[0], 2, gl.FLOAT, false, 0, 0);
    if (uvs1) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvVBO[1]);
      gl.bufferData(gl.ARRAY_BUFFER, uvs1, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(this.aUV[1]);
      gl.vertexAttribPointer(this.aUV[1], 2, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(this.aUV[1]);
      gl.vertexAttrib2f(this.aUV[1], 0, 0);
    }

    if (colors) {
      if (!this.colVBO) this.colVBO = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colVBO);
      gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
      gl.enableVertexAttribArray(this.aColor);
      gl.vertexAttribPointer(this.aColor, 4, gl.FLOAT, false, 0, 0);
      gl.uniform1i(this.uUseVertexColor, 1);
    } else {
      gl.disableVertexAttribArray(this.aColor);
      gl.uniform1i(this.uUseVertexColor, 0);
      gl.uniform4fv(this.uColor, this.curColor);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.idxIBO);
    if (this.wireframe) {
      const tris = Math.floor(indices.length / 3);
      const lines = new Uint32Array(tris * 6);
      for (let t = 0; t < tris; t++) {
        const a = indices[t * 3], b = indices[t * 3 + 1], c = indices[t * 3 + 2];
        lines.set([a, b, b, c, c, a], t * 6);
      }
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, lines, gl.STREAM_DRAW);
      gl.drawElements(gl.LINES, lines.length, gl.UNSIGNED_INT, 0);
    } else {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STREAM_DRAW);
      gl.drawElements(mode === null ? gl.TRIANGLES : mode, indices.length, gl.UNSIGNED_INT, 0);
    }
  }
}
