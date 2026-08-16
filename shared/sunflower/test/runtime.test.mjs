import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { envelopeTimes, parseEnvelope, sampleEnvelope } from '../js/envelope.js';
import { ExpFormatError, parseExp } from '../js/exp.js';
import { wonderEnvironmentTexcoords } from '../js/exp-renderer.js';
import { buildMeshGeometry, buildWonderVertexNormals } from '../js/mesh-geometry.js';
import { Mat4 } from '../js/mathlib.js';
import {
  lookAtMatrix, matrixFromQuaternion, perspectiveMatrix, sampleScene, sampleTrack,
} from '../js/scene.js';
import { LayeredTimeline } from '../js/timeline.js';
import { combineRgbAlpha, decodeGray8, decodeRgb24 } from '../js/textures.js';
import { MediaShowClock, StaticShowClock } from '../js/audio-clock.js';
import { XmPlayer } from '../js/xm.js';
import {
  WONDER_EFFECT_CLIPS, WONDER_EFFECT_SCHEDULE_END, WONDER_SHOW_END,
} from '../../../productions/wonder/web/js/show-data.js';
import {
  WONDER_NATIVE_MIX_AHEAD_SECONDS, WonderShowClock,
} from '../../../productions/wonder/web/js/wonder-clock.js';
import {
  ENERGIA_PHASE_CLIPS, ENERGIA_SCENE_CLIPS, ENERGIA_SHOW_END,
} from '../../../productions/energia/web/js/show-data.js';
import { energiaDotSources } from '../../../productions/energia/web/js/effects/dot-field.js';
import {
  buildEnergiaHardcodedCylinder, deformEnergiaHardcodedCylinder,
  energiaHardcodedCylinderState,
} from '../../../productions/energia/web/js/effects/hardcoded-cylinder.js';
import {
  buildEnergiaLateCylinderTriangles, deformEnergiaLateCylinder,
  energiaLateCylinderState,
} from '../../../productions/energia/web/js/effects/late-cylinder.js';
import {
  buildEnergiaMainEffectTriangles, energiaMainEffectCamera,
  energiaMainEffectFade, energiaMainEffectPasses,
} from '../../../productions/energia/web/js/effects/main-triangles.js';
import {
  ENERGIA_LATE_OVERLAY_COLORS, buildEnergiaLateOverlay,
  buildEnergiaLateOverlayLineQuads,
  energiaLateOverlayControlPoints, energiaLateOverlaySceneState,
} from '../../../productions/energia/web/js/effects/late-overlay.js';
import {
  ENERGIA_MODE2_CAMERA_KEYS, buildEnergiaMode2LineQuads,
  energiaMode2Camera, energiaMode2State,
} from '../../../productions/energia/web/js/effects/mode2-particles.js';
import {
  ENERGIA_MODE3_CAMERA_KEYS, buildEnergiaMode3LatticeTriangles,
  buildEnergiaMode3SurfaceTriangles, energiaMode3Camera, energiaMode3State,
} from '../../../productions/energia/web/js/effects/mode3-lattice.js';
import {
  ENERGIA_MODE4_CAMERA_KEYS, buildEnergiaMode4MetaballMesh,
  energiaMode4Camera, energiaMode4State, energiaMode4TextureCoordinate,
} from '../../../productions/energia/web/js/effects/mode4-metaballs.js';
import { ENERGIA_MODE4_TRI_TABLE } from '../../../productions/energia/web/js/effects/mode4-marching-table.js';
import {
  energiaWaveCamera, energiaWaveDimensions,
} from '../../../productions/energia/web/js/effects/wave-field.js';
import {
  ENERGIA_OPENING_DOT_GROUPS, ENERGIA_OPENING_DOTS_ORTHO, energiaOpeningDotsState,
} from '../../../productions/energia/web/js/effects/opening-dots.js';
import { energiaSunflowerLogoState } from '../../../productions/energia/web/js/effects/sunflower-logo.js';
import {
  buildWonderBubbleSurface, wonderBubbleControlPoint,
} from '../../../productions/wonder/web/js/effects/bubble.js';
import {
  BeginningEffect,
  WONDER_BEGINNING_ENVIRONMENT_MAP_UNITS, WONDER_BEGINNING_MATERIAL_COLORS,
} from '../../../productions/wonder/web/js/effects/beginning.js';
import { wonderDarkHorizonState } from '../../../productions/wonder/web/js/effects/dark-horizon.js';
import { wonderBubblebathFrame } from '../../../productions/wonder/web/js/effects/bubblebath.js';
import {
  wonderMaxTextureAlpha, wonderMaxTextureCards,
} from '../../../productions/wonder/web/js/effects/max-texture-tunnel.js';
import { wonderBoxicalState } from '../../../productions/wonder/web/js/effects/boxical.js';
import { wonderBoxical4State } from '../../../productions/wonder/web/js/effects/boxical4.js';
import { wonderCheckState } from '../../../productions/wonder/web/js/effects/check.js';
import { WONDER_BACKDROP_QUAD } from '../../../productions/wonder/web/js/effects/wonder-backdrop.js';
import { wonderDustTunnelState } from '../../../productions/wonder/web/js/effects/dust-tunnel.js';
import { Woah3Effect, wonderWoah3State } from '../../../productions/wonder/web/js/effects/woah3.js';
import { wonderCreditsDesignState } from '../../../productions/wonder/web/js/effects/credits-design.js';
import { wonderClockFrames } from '../../../productions/wonder/web/js/effects/clock.js';
import { FacetedEffect, wonderFacetedState } from '../../../productions/wonder/web/js/effects/faceted.js';
import {
  buildWonderDesignTunnelSurface, wonderDesignTunnelControlGrid,
  wonderDesignTunnelFade, wonderDesignTunnelState,
} from '../../../productions/wonder/web/js/effects/design-tunnel.js';
import { wonderEndFade, wonderEndState } from '../../../productions/wonder/web/js/effects/end.js';
import { wonderEnergyState } from '../../../productions/wonder/web/js/effects/energy.js';
import {
  buildWonderShiteGeometry, wonderShiteDesignState,
} from '../../../productions/wonder/web/js/effects/shite-design.js';
import { wonderSceneMaskState } from '../../../productions/wonder/web/js/effects/scene-mask.js';
import { wonderSphericalState } from '../../../productions/wonder/web/js/effects/spherical.js';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const envDir = path.join(repo, 'productions/wonder/work', 'unpacked', 'won_der');

test('restored EXP perspective treats the exported camera FOV as horizontal', () => {
  const projection = perspectiveMatrix(Math.PI / 2, 4 / 3, 1, 10000).m;
  assert.ok(Math.abs(projection[0] - 1) < 1e-6);
  assert.ok(Math.abs(projection[5] - (4 / 3)) < 1e-6);
  assert.ok(Math.abs(projection[10] - (-10001 / 9999)) < 1e-6);
});

test('Wonder camera roll retains the native final basis layout', () => {
  const view = lookAtMatrix([0, -10, 0], [0, 0, 0], Math.PI / 2).m;
  const expected = [
    0, -1, 0, 0,
    0, 0, -1, 0,
    1, 0, 0, 0,
    0, 0, -10, 1,
  ];
  expected.forEach((value, index) => {
    assert.ok(Math.abs(view[index] - value) < 1e-6,
      `camera roll matrix[${index}] expected ${value}, got ${view[index]}`);
  });
});

test('generic matrices retain OpenGL Y while 2D effects choose their own bounds', () => {
  const generic = new Mat4().ortho(0, 1, 0, 1, -1, 1).m;
  assert.ok(Math.abs(generic[5] * 0 + generic[13] + 1) < 1e-6);
  assert.ok(Math.abs(generic[5] * 1 + generic[13] - 1) < 1e-6);

  const [left, right, bottom, top, near, far] = ENERGIA_OPENING_DOTS_ORTHO;
  const topLeft = new Mat4().ortho(left, right, bottom, top, near, far).m;
  assert.ok(Math.abs(topLeft[5] * 0 + topLeft[13] - 1) < 1e-6);
  assert.ok(Math.abs(topLeft[5] * 768 + topLeft[13] + 1) < 1e-6);
});

const expSnapshots = {
  wonder: [
    ['beginning.exp', 'SUNF', 450, 342848, 9, 5, 1, 0, 1, 2, 54],
    ['boxical.exp', 'KEXP', 100, 1517, 5, 1, 1, 1, 1, 1, 14],
    ['boxical4.exp', 'KEXP', 100, 33005, 4, 1, 1, 0, 1, 1, 13],
    ['bubblebath.exp', 'SUNF', 64, 65236, 6, 2, 1, 0, 1, 2, 14],
    ['check.exp', 'SUNF', 100, 62754, 4, 1, 1, 0, 1, 1, 13],
    ['clock.exp', 'SUNF', 500, 8422, 4, 1, 1, 0, 1, 1, 17],
    ['credits.exp', 'SUNF', 600, 113618, 16, 7, 1, 0, 1, 7, 65],
    ['design_bw.exp', 'SUNF', 500, 24572, 11, 7, 1, 0, 1, 2, 25],
    ['design_bw2.exp', 'SUNF', 500, 5322, 19, 16, 1, 0, 1, 1, 52],
    ['end.exp', 'SUNF', 200, 15252, 16, 7, 1, 1, 1, 6, 42],
    ['energy.exp', 'SUNF', 100, 100530, 10, 7, 1, 0, 1, 1, 31],
    ['faceted.exp', 'SUNF', 300, 4666, 8, 5, 1, 0, 1, 1, 53],
    ['faceted2.exp', 'SUNF', 300, 4666, 8, 5, 1, 0, 1, 1, 53],
    ['scene.exp', 'SUNF', 500, 24928, 12, 7, 1, 1, 1, 2, 35],
    ['shite1.exp', 'SUNF', 200, 72028, 10, 6, 1, 0, 1, 2, 26],
    ['speedy.exp', 'SUNF', 500, 702, 4, 1, 1, 0, 1, 1, 7],
    ['spherical.exp', 'KEXP', 100, 37167, 9, 4, 1, 0, 1, 3, 26],
    ['stars.exp', 'SUNF', 500, 54730, 19, 14, 1, 0, 1, 3, 46],
    ['woah3.exp', 'SUNF', 400, 483354, 14, 9, 1, 0, 1, 3, 83],
  ],
  energia: [
    ['freak.exp', 'SUNF', 500, 124230, 57, 54, 1, 0, 1, 1, 662],
    ['krap2.exp', 'SUNF', 600, 1000356, 28, 24, 1, 0, 1, 2, 146],
    ['kurwa.exp', 'SUNF', 300, 155998, 14, 10, 1, 1, 1, 1, 112],
    ['kurwa2.exp', 'SUNF', 500, 62498, 30, 27, 1, 0, 1, 1, 341],
    ['kurwa2_.exp', 'SUNF', 300, 154334, 14, 10, 1, 1, 1, 1, 54],
    ['nowheretorun.exp', 'SUNF', 100, 125546, 260, 256, 1, 1, 1, 1, 1036],
    ['scene6.EXP', 'SUNF', 300, 140278, 13, 9, 1, 1, 1, 1, 95],
  ],
};

test('all Wonder and Energia EXP streams match their structural snapshots', () => {
  for (const [variant, snapshots] of Object.entries(expSnapshots)) {
    const directory = variant === 'wonder'
      ? path.join(repo, 'productions/wonder/work', 'unpacked', 'won_der')
      : path.join(repo, 'productions/energia/work', 'unpacked', 'demo_dat');
    for (const expected of snapshots) {
      const [name] = expected;
      const scene = parseExp(fs.readFileSync(path.join(directory, name)), { variant, source: name });
      const tracks = scene.records.flatMap((record) => Object.values(record.tracks ?? {}));
      const keyCount = tracks.reduce((sum, track) => sum + track.keys.length, 0);
      const actual = [
        name, scene.magic, scene.frameEnd, scene.byteLength, scene.records.length,
        scene.meshes.length, scene.cameras.length, scene.lights.length,
        scene.targets.length, scene.materials.length, keyCount,
      ];
      assert.deepEqual(actual, expected);
    }
  }
});

test('EXP reader rejects truncation and the wrong material variant with offsets', () => {
  const source = fs.readFileSync(path.join(envDir, 'beginning.exp'));
  assert.throws(
    () => parseExp(source.subarray(0, source.length - 1), { variant: 'wonder', source: 'cut.exp' }),
    (error) => error instanceof ExpFormatError && /cut\.exp: unexpected end/.test(error.message),
  );
  assert.throws(
    () => parseExp(source, { variant: 'energia', source: 'wrong.exp' }),
    (error) => error instanceof ExpFormatError && /wrong\.exp:/.test(error.message),
  );
});

test('EXP TCB sampling reproduces native key values and smooth two-key motion', () => {
  const scalar = {
    kind: 'scalar',
    keys: [
      { time: 0, value: 0, tension: 0, continuity: 0, bias: 0 },
      { time: 10, value: 10, tension: 0, continuity: 0, bias: 0 },
    ],
  };
  assert.equal(sampleTrack(scalar, -1), 0);
  assert.equal(sampleTrack(scalar, 5), 5);
  assert.equal(sampleTrack(scalar, 11), 10);

  const multiplyQuaternion = (a, b) => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
  const scene = parseExp(fs.readFileSync(path.join(envDir, 'scene.exp')), { variant: 'wonder' });
  for (const record of scene.records) {
    for (const track of Object.values(record.tracks ?? {})) {
      let accumulatedQuaternion = [1, 0, 0, 0];
      for (const key of track.keys) {
        const actual = sampleTrack(track, key.time);
        if (track.kind === 'quaternion') {
          // FUN_00404290 consumes disk values as rotation deltas.
          accumulatedQuaternion = multiplyQuaternion(accumulatedQuaternion, key.value);
          const dot = actual.reduce((sum, value, i) => (
            sum + value * accumulatedQuaternion[i]
          ), 0);
          assert.ok(Math.abs(Math.abs(dot) - 1) < 1e-5, `${record.name} quaternion at ${key.time}`);
        } else if (Array.isArray(key.value)) {
          key.value.forEach((value, i) => assert.ok(Math.abs(actual[i] - value) < 1e-5));
        } else {
          assert.ok(Math.abs(actual - key.value) < 1e-5);
        }
      }
    }
  }
});

test('Wonder TCB final endpoint preserves the native vector/scalar split', () => {
  const keys = [
    { time: 0, value: 0, tension: 0, continuity: 0, bias: 0 },
    { time: 10, value: 10, tension: 0, continuity: 0, bias: 0 },
    { time: 30, value: 30, tension: 0, continuity: 0, bias: 0 },
  ];
  const scalar = { kind: 'scalar', keys };
  const vector = {
    kind: 'vector3',
    keys: keys.map((key) => ({ ...key, value: [key.value, 0, 0] })),
  };

  // FUN_00405820 gives the scalar endpoint a 0.5 time bias; FUN_004053c0
  // adds the 0.25 loaded at 0x4332f0 for vectors. At the segment midpoint
  // those produce 20.9375 and 20 respectively.
  assert.equal(sampleTrack(scalar, 20), 20.9375);
  assert.deepEqual(sampleTrack(vector, 20), [20, 0, 0]);
});

test('EXP rotation keys accumulate and use Wonder native matrix storage', () => {
  const quarterTurn = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  const rotation = {
    kind: 'quaternion',
    keys: [
      { time: 0, value: [1, 0, 0, 0], tension: 0, continuity: 0, bias: 0 },
      { time: 10, value: quarterTurn, tension: 0, continuity: 0, bias: 0 },
      { time: 20, value: quarterTurn, tension: 0, continuity: 0, bias: 0 },
    ],
  };
  const final = sampleTrack(rotation, 20);
  assert.ok(Math.abs(final[0]) < 1e-6);
  assert.ok(Math.abs(final[3] - 1) < 1e-6);

  const matrix = matrixFromQuaternion(quarterTurn).m;
  const expected = [
    0, -1, 0, 0,
    1, 0, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  expected.forEach((value, index) => assert.ok(Math.abs(matrix[index] - value) < 1e-6));
});

test('scene sampling resolves matrices, cameras, hierarchy and mesh geometry', () => {
  const scene = parseExp(fs.readFileSync(path.join(envDir, 'scene.exp')), { variant: 'wonder' });
  const sampled = sampleScene(scene, 50);
  assert.equal(sampled.meshes.length, 7);
  assert.ok(sampled.camera);
  assert.ok(sampled.camera.fov > 0);
  for (const node of sampled.nodes.values()) assert.ok([...node.world.m].every(Number.isFinite));
  assert.ok([...sampled.camera.viewMatrix.m].every(Number.isFinite));

  const mesh = scene.meshes[0];
  const geometry = buildMeshGeometry(mesh);
  assert.equal(geometry.positions.length, mesh.faceCount * 9);
  assert.equal(geometry.texcoords.length, mesh.faceCount * 6);
  assert.equal(geometry.normals.length, mesh.faceCount * 9);
  assert.equal(geometry.indices.length, mesh.faceCount * 3);
  const firstTextureVertex = mesh.texcoordIndices[0];
  assert.deepEqual([...geometry.texcoords.subarray(0, 2)], [
    mesh.texcoords[firstTextureVertex * 2],
    1 - mesh.texcoords[firstTextureVertex * 2 + 1],
  ]);
  for (let i = 0; i < geometry.normals.length; i += 3) {
    const length = Math.hypot(geometry.normals[i], geometry.normals[i + 1], geometry.normals[i + 2]);
    assert.ok(Math.abs(length - 1) < 1e-5);
  }
});

test('Wonder native normals ignore EXP smoothing-group splits', () => {
  const mesh = {
    vertexCount: 4,
    faceCount: 2,
    positions: new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
      0, 0, 1,
    ]),
    indices: new Uint32Array([0, 1, 2, 0, 2, 3]),
    faceFlags: new Uint32Array([1, 2]),
    texcoordIndices: new Uint32Array(),
    texcoords: new Float32Array(),
  };
  const vertexNormals = buildWonderVertexNormals(mesh);
  const diagonal = Math.fround(1 / Math.sqrt(2));
  assert.deepEqual([...vertexNormals.subarray(0, 3)], [-diagonal, 0, -diagonal]);

  const geometry = buildMeshGeometry(mesh, { wonderNormals: true });
  assert.deepEqual([...geometry.normals.subarray(0, 3)], [0, 0, 1]);
  assert.deepEqual([...geometry.normals.subarray(9, 12)], [1, 0, 0]);
  assert.deepEqual([...geometry.nativeNormals.subarray(0, 3)], [-diagonal, 0, -diagonal]);
  assert.deepEqual([...geometry.nativeNormals.subarray(9, 12)], [-diagonal, 0, -diagonal]);
});

test('Wonder and Energia material payloads expose renderer state', () => {
  const wonder = parseExp(fs.readFileSync(path.join(envDir, 'beginning.exp')), { variant: 'wonder' });
  assert.equal(wonder.materials[0].mapMode, 3);
  assert.equal(typeof wonder.materials[0].doubleSided, 'boolean');
  assert.equal(wonder.materials[0].ambient.length, 3);
  assert.equal(wonder.materials[0].diffuse.length, 3);
  assert.equal(wonder.materials[0].specular.length, 3);
  assert.ok(Number.isFinite(wonder.materials[0].opacity));
  assert.equal(wonder.materials[1].blendMode, 1);

  const energiaPath = path.join(repo, 'productions/energia/work', 'unpacked', 'demo_dat', 'nowheretorun.exp');
  const energia = parseExp(fs.readFileSync(energiaPath), { variant: 'energia' });
  const sampled = sampleScene(energia, 0);
  assert.equal(sampled.materials[0].textureOffset.length, 2);
  assert.equal(sampled.materials[0].diffuse.length, 3);
  assert.ok(Number.isFinite(sampled.materials[0].opacity));
});

test('Wonder shite/design state retains the 0x40ee50 split clocks and passes', () => {
  const start = wonderShiteDesignState(0);
  assert.deepEqual(start.designTextureOffsets, [0, 16]);
  assert.equal(start.designProjectionX, 200);
  assert.equal(start.designProjectionTilt, 0);
  assert.equal(start.shiteAlpha, 0);
  assert.equal(start.shiteCameraFrame, 64);
  assert.equal(start.shiteObjectFrame, 0);
  assert.equal(start.shiteProjectionX, 3000);
  assert.deepEqual(start.shitePasses.map((pass) => pass.meshIndex), [1, 2, 3, 0]);
  assert.deepEqual(start.shitePasses.map((pass) => pass.textureOffset[1]),
    [0, Math.fround(0.01), Math.fround(0.04), Math.fround(0.08)]);

  const later = wonderShiteDesignState(2);
  assert.equal(later.shiteAlpha, 1);
  assert.equal(later.shiteObjectFrame, 20);
  assert.deepEqual(later.shitePasses.map((pass) => pass.textureOffset[0]),
    [1.2, 1.4, 0.6, 1.8].map(Math.fround));

  const wrapped = wonderShiteDesignState(21);
  assert.equal(wrapped.shiteObjectFrame, 10);
  assert.equal(wrapped.designProjectionX, Math.fround(200 - Math.sin(Math.fround(3.14) * 0.5) * 200));
});

test('Wonder shite modifier retains the timed 0x40e490 normal squash', () => {
  const scene = parseExp(fs.readFileSync(path.join(envDir, 'shite1.exp')),
    { variant: 'wonder' });
  const mesh = scene.meshes[0];
  const original = buildMeshGeometry(mesh);
  const deformed = buildWonderShiteGeometry(mesh);
  assert.equal(deformed.positions.length, original.positions.length);
  assert.equal(deformed.normals.length, original.normals.length);
  assert.ok([...deformed.positions].every(Number.isFinite));
  assert.notDeepEqual([...deformed.positions.subarray(0, 12)],
    [...original.positions.subarray(0, 12)]);
  assert.deepEqual([...deformed.positions.subarray(0, 3)],
    [-0.00005722085552406497, -0.0001172915508504957, 597.1497802734375]);
  const later = buildWonderShiteGeometry(mesh, 4);
  assert.notDeepEqual([...later.positions.subarray(0, 12)],
    [...deformed.positions.subarray(0, 12)]);
  assert.deepEqual([...later.positions.subarray(0, 3)],
    [-0.00006777716043870896, -0.00014188083878252655, 597.1497802734375]);
});

test('Wonder scene mask retains the 0x40f3b0 immediate-mode layout', () => {
  const start = wonderSceneMaskState(0);
  assert.deepEqual(start.ortho, [4, 9, -1, 1, -1, 1]);
  assert.equal(start.bars.length, 64);
  assert.equal(start.strips.length, 6);
  assert.deepEqual(start.bars[0], {
    index: 0,
    x: 0,
    yTopLeft: Math.fround(-0.911),
    yTopRight: Math.fround(-0.91),
    yBottom: -1,
  });
  assert.deepEqual(start.strips[0], {
    index: 0, phase: 0, phaseEnd: 1, alpha: 0,
    left: Math.fround(1.91), right: Math.fround(2.2),
  });
  assert.equal(start.strips[5].alpha, Math.fround(Math.fround(5 * 0.25012) * 0.1));

  const capped = wonderSceneMaskState(4);
  assert.ok(Math.abs(capped.ortho[0] + 1) < 1e-6);
  assert.ok(Math.abs(capped.ortho[1] - 4) < 1e-6);
  const stripMotion = Math.sin(Math.fround(2));
  const stripWave = Math.fround(stripMotion ** 5);
  const moving = wonderSceneMaskState(2).strips[0];
  assert.equal(moving.left, Math.fround(stripWave + 1.91));
  assert.equal(moving.right, Math.fround(stripWave + 2.2));
  for (const bar of capped.bars) {
    for (const value of Object.values(bar)) assert.ok(Number.isFinite(value));
  }
});

test('Wonder spherical class retains the 0x4101f0 alpha, clocks and scrolls', () => {
  const start = wonderSphericalState(0);
  assert.equal(start.alpha, 0);
  assert.equal(start.frame, 0);
  assert.deepEqual(start.textureOffsets.get(0), [0, 0]);
  assert.deepEqual(start.textureOffsets.get(1), [0, -0]);
  assert.deepEqual(start.textureOffsets.get(2), [-0, 0]);

  const entered = wonderSphericalState(1.5);
  assert.equal(entered.alpha, Math.fround(Math.sin(1.832) ** 2));
  assert.equal(entered.frame, 12);
  assert.deepEqual(entered.textureOffsets.get(0), [Math.fround(0.3), 0]);
  assert.deepEqual(entered.textureOffsets.get(1), [0, Math.fround(-0.3)]);
  assert.deepEqual(entered.textureOffsets.get(2), [Math.fround(-0.45), 0]);

  assert.equal(wonderSphericalState(13).frame, 4);
});

test('Wonder boxical4 class retains the 0x40cf90 two-pass scene state', () => {
  assert.deepEqual(wonderBoxical4State(0), {
    alpha: 0,
    frames: [0, 4],
    textureOffset: [-0, 0],
  });
  assert.deepEqual(wonderBoxical4State(0.5), {
    alpha: 0.5,
    frames: [4, 8],
    textureOffset: [Math.fround(-0.1), 0],
  });
  assert.deepEqual(wonderBoxical4State(13), {
    alpha: 1,
    frames: [4, 8],
    textureOffset: [Math.fround(-2.6), 0],
  });
});

test('Wonder check class retains the 0x40cdb0 two-pass scene state', () => {
  assert.deepEqual(wonderCheckState(0), {
    frames: [0, 4],
    textureOffset: [0, 0],
  });
  assert.deepEqual(wonderCheckState(2), {
    frames: [6, 10],
    textureOffset: [3, 0],
  });
});

test('Wonder backg pass retains the 0x40ff40 immediate-mode quad', () => {
  assert.deepEqual(WONDER_BACKDROP_QUAD, [
    { uv: [0, 0], position: [-1, 1, 0] },
    { uv: [1, 0], position: [1, 1, 0] },
    { uv: [1, 1], position: [1, -1, 0] },
    { uv: [0, 1], position: [-1, -1, 0] },
  ]);
});

test('Wonder dust tunnel retains the 0x40db40 two-strand card transforms', () => {
  const start = wonderDustTunnelState(0);
  assert.equal(start.alpha, 1);
  assert.equal(start.drawAlpha, Math.fround(0.19));
  assert.equal(start.cards.length, 16);
  assert.deepEqual(start.cards[0], {
    strand: 0, index: 0, translation: [0, 0, -100], roll: 0, pitch: 90,
  });
  assert.deepEqual(start.cards[7], {
    strand: 0, index: 7, translation: [0, 0, -660], roll: 112, pitch: 90,
  });
  assert.deepEqual(start.cards[8], {
    strand: 1, index: 0, translation: [0, 50, 0], roll: 0, pitch: 90,
  });
  assert.deepEqual(start.cards[15], {
    strand: 1, index: 7, translation: [0, 50, -238], roll: 112, pitch: 90,
  });

  const fading = wonderDustTunnelState(30.490999221801758);
  assert.equal(fading.alpha, 0.5);
  assert.equal(fading.drawAlpha, Math.fround(0.5 * 0.19));
});

test('Wonder woah3 class retains the 0x410410 split clocks, scrolls and pulse alphas', () => {
  const envelope = parseEnvelope(
    fs.readFileSync(path.join(envDir, 'napierdalanie.env'), 'utf8'),
    'napierdalanie.env',
  );
  const start = wonderWoah3State(0, envelope);
  assert.equal(start.envelopeTime, Math.fround(69.753));
  assert.equal(start.pulse, 1);
  assert.equal(start.cameraFrame, 0);
  assert.equal(start.objectFrame, 0);
  assert.deepEqual(start.materialOffsets.get(0), [Math.fround(0.3), 0.5]);
  assert.deepEqual(start.materialOffsets.get(1), [0, 0]);
  assert.deepEqual(start.lwoAlphas, [0, 0, 0, 0]);

  const dropped = wonderWoah3State(0.2, envelope);
  assert.equal(dropped.cameraFrame, 2);
  assert.equal(dropped.objectFrame, 3);
  assert.deepEqual(dropped.materialOffsets.get(0),
    [Math.fround(0.3), 0.7800000309944153]);
  assert.deepEqual(dropped.materialOffsets.get(1), [0, Math.fround(0.28)]);
  assert.ok(dropped.lwoAlphas[0] > 0.69);
  assert.ok(dropped.lwoAlphas[3] > 0.19);
});

test('Wonder woah3 dark LWO passes retain their exported ordinary alpha blend', () => {
  const scene = parseExp(fs.readFileSync(path.join(envDir, 'woah3.exp')), {
    variant: 'wonder',
    source: 'woah3.exp',
  });
  const renderCalls = [];
  const renderer = {
    scene,
    mgl: { gl: { canvas: { width: 640, height: 480 } } },
    render(frame, options) { renderCalls.push({ frame, options }); },
  };
  const envelope = parseEnvelope(
    fs.readFileSync(path.join(envDir, 'napierdalanie.env'), 'utf8'),
    'napierdalanie.env',
  );
  const effect = new Woah3Effect({}, renderer, envelope);
  effect.render(33.747);

  assert.equal(renderCalls.length, 6);
  assert.equal(scene.materials[2].opacity, 0.5);
  assert.deepEqual(scene.materials[2].diffuse, [0, 0, 0]);
  assert.equal(scene.materials[2].blendMode, 0);
  for (const { options } of renderCalls.slice(-4)) {
    assert.equal(options.depthTest, false);
    assert.equal(options.blendFuncOverride, undefined);
  }
});

test('Wonder credits/design class retains the 0x40fb10 split clocks and material scroll', () => {
  assert.deepEqual(wonderCreditsDesignState(0), {
    designFrame: 0,
    creditsFrame: 0,
    creditsMaterial6Offset: [0, 0],
  });
  assert.deepEqual(wonderCreditsDesignState(2), {
    designFrame: 20,
    creditsFrame: 30,
    creditsMaterial6Offset: [0, 8],
  });
});

test('Wonder clock class retains the 0x40fcb0 six linear/reverse-fmod clocks', () => {
  assert.deepEqual(wonderClockFrames(0), [0, 15, 45, 65, 0, 446]);
  assert.deepEqual(wonderClockFrames(2), [26, 49, 87, 135, 474, 408]);
  assert.deepEqual(wonderClockFrames(30), [390, 525, 675, 1115, 110, -124]);
});

test('Wonder faceted class retains the 0x40cb20 pulse, split clocks and exit fade', () => {
  const envelope = parseEnvelope(
    fs.readFileSync(path.join(envDir, 'napierdalanie2.env'), 'utf8'),
    'napierdalanie2.env',
  );
  const start = wonderFacetedState(0, envelope);
  assert.equal(start.envelopeTime, Math.fround(69.753));
  assert.equal(start.pulse, 1);
  assert.equal(start.firstAlpha, Math.fround(0.2));
  assert.equal(start.secondAlpha, Math.fround(0.2));
  assert.equal(start.firstFrame, 0);
  assert.equal(start.secondFrame, 30);
  assert.deepEqual(start.firstTextureOffset, [0, 0]);
  assert.deepEqual(start.secondTextureOffset, [8, 0]);
  assert.equal(start.drawSecond, true);

  const fading = wonderFacetedState(15.137999534606934 + 5 / 6, envelope);
  assert.ok(Math.abs(fading.secondAlpha - 0.5) < 1e-6);
  const gone = wonderFacetedState(17, envelope);
  assert.equal(gone.secondAlpha, 0);
  assert.equal(gone.drawSecond, false);
});

test('Wonder faceted constructor applies its native opacity to every material', () => {
  const renderer = (count) => ({ scene: { materials: Array.from({ length: count }) } });
  const effect = new FacetedEffect({}, renderer(5), renderer(5), {});
  assert.deepEqual([...effect.firstMaterialOpacities.values()],
    Array(5).fill(Math.fround(0.23965999484062195)));
  assert.deepEqual([...effect.secondMaterialOpacities.values()],
    Array(5).fill(Math.fround(0.4966000020503998)));
});

test('Wonder design tunnel retains the 0x40b470 fades, crossfade and ENV pulse', () => {
  const envelope = parseEnvelope(
    fs.readFileSync(path.join(envDir, 'napierdalanie2.env'), 'utf8'),
    'napierdalanie2.env',
  );
  assert.equal(wonderDesignTunnelFade(0), 0);
  assert.equal(wonderDesignTunnelFade(1), 0.5);
  assert.equal(wonderDesignTunnelFade(2), 1);
  assert.equal(wonderDesignTunnelFade(15.137999534606934), 1);
  // Both the time argument and 15.138 boundary are stored floats; their
  // subtraction retains this one-ulp asymmetry from the executable.
  assert.equal(wonderDesignTunnelFade(16.137999534606934), 0.4999995231628418);
  assert.equal(wonderDesignTunnelFade(18), 0);

  const start = wonderDesignTunnelState(0, envelope);
  assert.equal(start.envelopeTime, Math.fround(69.753));
  assert.equal(start.fade, 0);
  assert.equal(start.mix, 0.5);
  assert.deepEqual(start.textureOffsets, [[0, 0], [-0, 0], [0, -0]]);
  assert.deepEqual(start.overlayAlphas, [0, 0]);

  const entered = wonderDesignTunnelState(2, envelope);
  assert.equal(entered.fade, 1);
  assert.deepEqual(entered.textureOffsets, [
    [Math.fround(0.3), 0], [Math.fround(-0.3), 0], [0, -2],
  ]);
  assert.ok(entered.overlayAlphas[0] >= 0 && entered.overlayAlphas[0] <= 1);
  assert.ok(entered.overlayAlphas[1] >= 0 && entered.overlayAlphas[1] <= 1);
  assert.ok(Math.abs(entered.overlayAlphas[0] + entered.overlayAlphas[1] - 1) < 1e-6);
});

test('Wonder design tunnel retains the 0x40b860 16x6 lattice and native 5x2 axis order', () => {
  const grid = wonderDesignTunnelControlGrid(0);
  assert.equal(grid.length, 16);
  assert.ok(grid.every((row) => row.length === 6));
  assert.deepEqual(grid[0][0].uv, [0, -0]);
  assert.deepEqual(grid[15][5].color, [0.9375, 0.9375, 0.9375, 1]);
  assert.equal(grid[1][0].uv[1], Math.fround(0.15000000596046448));
  assert.equal(grid[0][0].position[2], -960);
  assert.equal(grid[15][0].position[2], 0);
  for (const row of grid) {
    for (const vertex of row) {
      assert.ok([...vertex.position, ...vertex.uv, ...vertex.color].every(Number.isFinite));
      assert.ok(vertex.environmentUv.every(Number.isFinite));
    }
  }
  const surface = buildWonderDesignTunnelSurface(1);
  assert.equal(surface.length, 15 * 1 * 6 * 4 * 6);
  // Native seedU=5 inserts quarter samples across a cyclic column patch;
  // seedV=2 uses only the depth-row endpoints. Its first triangle ends at the
  // next depth row and therefore uses the top-right/bottom-left diagonal.
  assert.deepEqual(surface[0].position, wonderDesignTunnelControlGrid(1)[0][0].position);
  assert.deepEqual(surface[2].position, wonderDesignTunnelControlGrid(1)[1][0].position);
  for (const vertex of surface) {
    assert.ok([...vertex.position, ...vertex.normal, ...vertex.environmentUv,
      ...vertex.uv, ...vertex.color]
      .every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...vertex.normal) - 1) < 1e-9);
  }
});

test('Wonder end class retains the 0x40c380 bump offsets, scene clock and fades', () => {
  assert.equal(wonderEndFade(0), 0);
  assert.equal(wonderEndFade(1), 0.5);
  assert.equal(wonderEndFade(2), 1);
  assert.equal(wonderEndFade(5), 1);
  assert.equal(wonderEndFade(6), 0.5);
  assert.equal(wonderEndFade(7), 0);
  assert.deepEqual(wonderEndState(0), {
    time: 0,
    fade: 0,
    bumpOffset: [0, Math.fround(0.005)],
    sceneFrame: 60,
  });
  const later = wonderEndState(2);
  assert.equal(later.sceneFrame, 90);
  assert.ok(Math.abs(later.bumpOffset[0]) < 1e-8);
  assert.ok(Math.abs(later.bumpOffset[1] - 0.005) < 1e-8);
});

test('Wonder energy class retains the 0x40eae0 scene clock, scroll and late fade', () => {
  assert.deepEqual(wonderEnergyState(0), {
    time: 0, alpha: 1, frame: 0, textureOffset: [0, 0],
  });
  assert.deepEqual(wonderEnergyState(7), {
    time: 7, alpha: 1, frame: 70, textureOffset: [Math.fround(4.2), 0],
  });
  const fading = wonderEnergyState(8);
  assert.equal(fading.frame, 80);
  assert.equal(fading.textureOffset[0], Math.fround(4.8));
  assert.ok(Math.abs(fading.alpha - 0.7) < 1e-6);
  assert.equal(wonderEnergyState(11).alpha, 0);
});

test('all shipped Wonder envelopes parse with stable dimensions', () => {
  const expected = {
    'alpha_circle.env': 1,
    'bubble.env': 3,
    'koniec_intra.env': 1,
    'mystified.env': 1,
    'napierdalanie.env': 1,
    'napierdalanie2.env': 1,
    'wondertext_pos.env': 3,
  };
  for (const [name, dimensions] of Object.entries(expected)) {
    const envelope = parseEnvelope(fs.readFileSync(path.join(envDir, name), 'utf8'), name);
    assert.equal(envelope.dimensions, dimensions, name);
    assert.ok(envelope.keys.length > 1, name);
  }
});

test('mystified order map retains all 23 boundaries', () => {
  const envelope = parseEnvelope(fs.readFileSync(path.join(envDir, 'mystified.env'), 'utf8'));
  const times = envelopeTimes(envelope);
  assert.equal(times.length, 23);
  assert.equal(times[0], 0);
  assert.equal(times.at(-1), Math.fround(181.035));
});

test('envelope sampling clamps and uses the native cubic scalar/vector curves', () => {
  const scalar = parseEnvelope('s\nt 0 v 0\nt 2 v 10\nEND\n');
  assert.equal(sampleEnvelope(scalar, -1), 0);
  assert.equal(sampleEnvelope(scalar, 1), 5);
  assert.equal(sampleEnvelope(scalar, 3), 10);
  const vector = parseEnvelope('v\nt 0 v 0 2 4\nt 2 v 2 4 8\nEND\n');
  assert.deepEqual(sampleEnvelope(vector, 1), [1, 3, 6]);

  const cubic = parseEnvelope('cubic\nt 0 v 0\nt 1 v 1\nt 2 v 0\nEND\n');
  assert.equal(sampleEnvelope(cubic, 0.5), 0.6875);
  assert.equal(sampleEnvelope(cubic, 1.5), 0.6875);

  const tcb = parseEnvelope('tcb\nt 0 v 0 0.25 -0.5 0.75\nt 1 v 1 0 0 0\nEND\n');
  assert.equal(tcb.keys[0].tension, 0.25);
  assert.equal(tcb.keys[0].continuity, -0.5);
  assert.equal(tcb.keys[0].bias, 0.75);

  // Wonder uses a duplicate 70.557 key to make an instantaneous pulse drop.
  // The native search keeps the first duplicate at equality and advances to
  // the second immediately afterwards.
  const stepped = parseEnvelope(
    'stepped\nt 0 v 0\nt 1 v 1\nt 1 v 0\nt 2 v 0\nEND\n',
  );
  assert.equal(sampleEnvelope(stepped, stepped.keys[1].time), 1);
  assert.ok(Math.abs(sampleEnvelope(stepped, stepped.keys[1].time + 1e-6)) < 1e-5);

  const rounded = parseEnvelope('rounded\nt 69.753 v 0.7\nt 70 v 1\nEND\n');
  assert.equal(rounded.keys[0].time, Math.fround(69.753));
  assert.equal(rounded.keys[0].value, Math.fround(0.7));
});

test('layered timeline preserves overlaps and layer order', () => {
  const seen = [];
  const timeline = new LayeredTimeline([
    { id: 'upper', start: 1, end: 3, layer: 2, render: (t) => seen.push(['upper', t]) },
    { id: 'lower', start: 0, end: 2, layer: 0, render: (t) => seen.push(['lower', t]) },
  ]);
  assert.deepEqual(timeline.active(1.5).map((clip) => clip.id), ['lower', 'upper']);
  timeline.render(1.5);
  assert.deepEqual(seen, [['lower', 1.5], ['upper', 0.5]]);
  assert.deepEqual(timeline.active(3), []);

  const native = new LayeredTimeline([
    { id: 'old', start: 0, end: 69.753 },
    { id: 'new', start: 69.753, end: 70 },
  ], { inclusiveEnd: true, float32Time: true });
  assert.deepEqual(native.active(69.753).map((clip) => clip.id), ['old', 'new']);
  assert.equal(native.clips[0].end, Math.fround(69.753));

  const mixed = new LayeredTimeline([
    { id: 'strict', start: 1, end: 2, inclusiveStart: false },
    { id: 'inclusive', start: 1, end: 2, inclusiveEnd: true },
  ]);
  assert.deepEqual(mixed.active(1).map((clip) => clip.id), ['inclusive']);
  assert.deepEqual(mixed.active(2).map((clip) => clip.id), ['inclusive']);
});

test('recovered master schedules retain compiled intervals and overlaps', () => {
  assert.equal(WONDER_EFFECT_CLIPS.length, 22);
  assert.equal(WONDER_EFFECT_SCHEDULE_END, 195);
  assert.equal(WONDER_SHOW_END, 186.5);
  const wonder = new LayeredTimeline(WONDER_EFFECT_CLIPS, {
    inclusiveEnd: true,
    float32Time: true,
  });
  assert.deepEqual(wonder.active(10).map((clip) => clip.id),
    ['effect_4106a0', 'effect_40d790', 'effect_40de00']);
  assert.deepEqual(wonder.active(195).map((clip) => clip.id), ['effect_40ea30']);
  assert.deepEqual(wonder.active(195.001), []);
  const manifest = JSON.parse(fs.readFileSync(path.join(repo, 'productions/wonder/web', 'assets-manifest.json')));
  const paths = new Set(manifest.assets.map((asset) => asset.path));
  for (const clip of WONDER_EFFECT_CLIPS) {
    assert.ok(clip.data?.assets?.length, `${clip.id} has recovered asset associations`);
    for (const asset of clip.data.assets) assert.ok(paths.has(asset), `${clip.id}: ${asset}`);
  }

  assert.equal(ENERGIA_SCENE_CLIPS.length, 4);
  assert.equal(ENERGIA_PHASE_CLIPS.length, 17);
  assert.equal(ENERGIA_SHOW_END, 290);
  const energia = new LayeredTimeline(
    [...ENERGIA_PHASE_CLIPS, ...ENERGIA_SCENE_CLIPS],
    { float32Time: true },
  );
  assert.deepEqual(energia.active(60).map((clip) => clip.id), [
    'main_effect_410f90', 'kurwa2_scene', 'freak_scene', 'compositor_mode_2',
  ]);
  assert.ok(energia.active(128).some((clip) => clip.id === 'effect_40f070'));
  assert.ok(energia.active(12).some((clip) => clip.id === 'effect_40f070_opening'));

  // THE FOUR EXPECTATIONS BELOW WERE STALE AND THIS TEST HAD BEEN RED FOR A
  // LONG TIME. Each is re-derived from the compiled gate table in
  // productions/energia/work/re/TIMELINE.md — the ranges read out of the frame
  // callback at 0x40eb50 — rather than from what the code happens to return.
  // Every one of the 16 phase clips in show-data.js matches that table gate for
  // gate, so the DATA is the authority here and the test was the drift.
  //
  // Starts are inclusive, ends exclusive, which is what the passing active(60)
  // case above already implies.

  // t=0: three separate gates are documented as 0--56 — the early renderer
  // (0x411e10/0x410470), the timed 0x40f070 call, and 0x40c6f0 plus the logo
  // overlay 0x412750. A show with four clips defined to start at 0 cannot also
  // render nothing at 0, which is what `[]` claimed.
  assert.deepEqual(energia.active(0).map((clip) => clip.id), [
    'early_renderer_411e10_410470', 'effect_40f070_opening',
    'opening_dots_40c6f0', 'opening_logo_412750',
  ]);
  // t=56: every 0--56 gate has ended, and 56--157 (0x410f90) begins here.
  assert.deepEqual(energia.active(56).map((clip) => clip.id), [
    'main_effect_410f90', 'kurwa2_scene', 'freak_scene', 'compositor_mode_2',
  ]);
  // t=82: 44--82 (mode 2) and both 56--82 scenes have ended; 82--136
  // (the 0x411e10(0) reuse) begins, alongside the 82--122 scene.
  assert.deepEqual(energia.active(82).map((clip) => clip.id), [
    'main_effect_410f90', 'kurwa_scene', 'transition_wave_dot',
  ]);
  // t=157: 56--157, 132--157 and the 136--157 scene have all ended; only the
  // 156--182 overlay is still running.
  assert.deepEqual(energia.active(157).map((clip) => clip.id), ['overlay_413050']);

  // The native master clock is float32: a sub-ULP debug seek remains exactly on
  // the boundary, just as it does in Energia_FIXED.exe. Asserted as
  // INDISTINGUISHABILITY, which is the actual claim — the previous form said
  // main_effect_410f90 was inactive at 56+ULP while the line above has it
  // active at 56, so it could only ever have passed if the boundary were
  // exclusive. It is also worth noting 56 + Number.EPSILON === 56 in double
  // before float32 is even reached, so this pins the collapse rather than
  // measuring a step across it.
  assert.equal(56 + Number.EPSILON, 56);
  assert.deepEqual(
    energia.active(56 + Number.EPSILON).map((clip) => clip.id),
    energia.active(56).map((clip) => clip.id),
  );
  assert.ok(energia.active(56.00001)
    .some((clip) => clip.id === 'main_effect_410f90'));
  assert.deepEqual(energia.active(290), []);
});

test('Energia opening procedural constants retain their executable values', () => {
  assert.deepEqual(energiaWaveDimensions(0), [24, 24]);
  assert.deepEqual(energiaWaveDimensions(0, true), [40, 40]);
  assert.deepEqual(energiaWaveCamera(0), {
    eye: [700, 860, 1800],
    target: [0, 1100, 0],
  });
  assert.deepEqual(energiaWaveCamera(82, 82), {
    eye: [700 + Math.sin(82 * 0.4) * 50, Math.sin(82 * 0.3) * 600 + 860, 1800],
    target: [0, 1100, 0],
  });
  const sources = energiaDotSources(0);
  assert.deepEqual(sources[0], {
    x: 0, y: 40, z: 0, radius: 40, strength: 48,
  });
  assert.equal(sources[2].radius, 40);
  assert.equal(sources[2].strength, 38);
  assert.equal(sources[3].radius, 30);
  assert.equal(sources[3].strength, 48);
  for (const source of sources) {
    for (const value of Object.values(source)) assert.ok(Number.isFinite(value));
  }
});

test('Energia 0x40f070 retains its native cylinder and linked height modifiers', () => {
  const geometry = buildEnergiaHardcodedCylinder();
  assert.equal(geometry.positions.length, 150 * 151 * 3);
  assert.equal(geometry.normals.length, geometry.positions.length);
  assert.equal(geometry.texcoords.length, 150 * 151 * 2);
  assert.equal(geometry.indices.length, 149 * 150 * 6);
  assert.deepEqual([...geometry.positions.slice(0, 3)], [
    -248.3333282470703, 0, 80,
  ]);
  assert.deepEqual([...geometry.texcoords.slice(-2)], [1, 1]);
  assert.deepEqual([...geometry.indices.slice(0, 6)], [0, 151, 152, 0, 152, 1]);

  const empty = new Uint8Array(256 * 256);
  const unchanged = deformEnergiaHardcodedCylinder(geometry, empty, empty, 12);
  assert.deepEqual([...unchanged.slice(0, 9)], [...geometry.positions.slice(0, 9)]);
  const full = new Uint8Array(256 * 256).fill(255);
  const displaced = deformEnergiaHardcodedCylinder(geometry, full, empty, 12);
  assert.ok(Math.hypot(...displaced.slice(0, 3))
    > Math.hypot(...geometry.positions.slice(0, 3)) + 222.9);

  const opening = energiaHardcodedCylinderState(12, 4);
  assert.equal(opening.phase, 1);
  assert.equal(opening.placements.length, 3);
  assert.deepEqual(opening.placements[0].translation, [
    Math.sin(12) * 30, 501, -700,
  ]);
  const returnPass = energiaHardcodedCylinderState(127, 122);
  assert.equal(returnPass.phase, Math.fround(0.8));
});

test('Energia 0x40f570 retains its 40x40 DISP2/wave cylinder and six-pass channels', () => {
  const geometry = buildEnergiaHardcodedCylinder({
    lengthSegments: 40,
    radialSegments: 40,
  });
  assert.equal(geometry.positions.length, 40 * 41 * 3);
  assert.equal(geometry.texcoords.length, 40 * 41 * 2);
  assert.equal(geometry.indices.length, 39 * 40 * 6);
  assert.deepEqual([...geometry.positions.slice(0, 3)], [-243.75, 0, 80]);
  assert.deepEqual([...geometry.indices.slice(0, 6)], [0, 41, 42, 0, 42, 1]);

  const state = energiaLateCylinderState(250);
  assert.equal(state.rotation, 8000);
  assert.equal(state.wave.offsetU, 8000);
  assert.equal(state.wave.offsetV, 13250);
  assert.equal(state.disp.amplitude, 64);
  assert.equal(state.wave.amplitude, 114);
  assert.equal(state.disp.scaleU, Math.fround(Math.abs(Math.sin(25) * 10)));
  assert.equal(state.wave.scaleV, Math.fround(Math.abs(Math.cos(40) * 10)));

  const empty = new Uint8Array(256 * 256);
  const full = new Uint8Array(256 * 256).fill(255);
  const deformed = deformEnergiaLateCylinder(geometry, empty, full, 250);
  assert.equal(deformed.weights[0], 1);
  assert.ok(Math.hypot(...deformed.positions.slice(0, 3))
    > Math.hypot(...geometry.positions.slice(0, 3)) + 113.9);
  const triangles = buildEnergiaLateCylinderTriangles(
    geometry, deformed.positions, deformed.weights,
  );
  assert.equal(triangles.positions.length, geometry.indices.length * 3);
  assert.equal(triangles.colors.length, geometry.indices.length * 4);
  assert.deepEqual([...triangles.colors.slice(0, 12)], [
    1, 1, 1, Math.fround(0.9),
    1, 1, 1, Math.fround(0.31),
    0.5, 0.5, 0.5, Math.fround(0.531),
  ]);
});

test('Energia 0x412750 retains its two-texture sunflower logo envelope', () => {
  assert.equal(energiaSunflowerLogoState(6).envelope, 0);
  assert.deepEqual(energiaSunflowerLogoState(12), {
    local: 6,
    envelope: 1,
    mix: 0.4,
    alpha: 0.054,
    blurredAlpha: 0.0324,
    width: 648,
    height: 90,
  });
  assert.deepEqual(energiaSunflowerLogoState(13.5), {
    local: 7.5,
    envelope: 1,
    mix: 1,
    alpha: 0.135,
    blurredAlpha: 0,
    width: 420,
    height: 75,
  });
  assert.equal(energiaSunflowerLogoState(18).envelope, 0);
});

test('Energia 0x40c6f0 retains its compiled dot-mark layout and staggered fades', () => {
  assert.deepEqual(ENERGIA_OPENING_DOTS_ORTHO, [0, 1024, 768, 0, -1, 1]);
  assert.equal(ENERGIA_OPENING_DOT_GROUPS.length, 8);
  const full = energiaOpeningDotsState(18);
  assert.equal(full.local, 12);
  assert.equal(full.fadePhase, 0);
  assert.deepEqual(full.fades, {
    0.5: 1, 0.45: 1, 0.4: 1, 0.35: 1, 0.3: 1,
  });
  assert.equal(full.quads.length, 43);
  assert.deepEqual(full.quads[0], {
    x: 320,
    y: 240,
    halfSize: 29.323789596557617,
    color: [110, 61, 48],
  });
  assert.deepEqual(full.quads.slice(5, 10).map(({ x, y }) => [x, y]), [
    [247, 93], [247, 157], [247, 221], [247, 285], [247, 349],
  ]);
  assert.deepEqual(full.quads.at(-1), {
    x: 508,
    y: 253,
    halfSize: 6.85260534286499,
    color: [127, 126, 125],
  });

  const fading = energiaOpeningDotsState(20);
  assert.deepEqual(fading.fades, {
    0.5: 0,
    0.45: 0.10000002384185791,
    0.4: 0.19999998807907104,
    0.35: 0.30000001192092896,
    0.3: 0.3999999761581421,
  });
  assert.deepEqual(fading.quads[0].color, [44, 24, 19]);
  assert.ok(energiaOpeningDotsState(22).quads.every(
    ({ color }) => color.every((channel) => channel === 0),
  ));
});

test('Energia compositor mode 2 retains its executable camera and emission density', () => {
  assert.equal(ENERGIA_MODE2_CAMERA_KEYS.length, 7);
  assert.deepEqual(energiaMode2Camera(0), {
    translation: [0, 0, 0],
    rotation: [7.000000953674316, 55],
    distance: 120,
  });
  assert.deepEqual(energiaMode2Camera(10), {
    translation: [12.296725273132324, 0, 145.8953857421875],
    rotation: [62.66667175292969, 17.666662216186523],
    distance: 120,
  });
  const started = energiaMode2State(44);
  assert.equal(started.localSeconds, 0);
  assert.equal(started.particleCount, 2);
  assert.deepEqual(started.center, [
    40.557979583740234, 50, 57.92279815673828,
  ]);
  const oneSecond = energiaMode2State(45);
  assert.equal(oneSecond.particleCount, 482);
  assert.equal(oneSecond.simulatedSeconds, 1);
  assert.equal(oneSecond.particles[0].born, 44.003997802734375);
  assert.equal(oneSecond.particles[1].born, 44.007999420166016);
  assert.notDeepEqual(oneSecond.particles[0].velocity, oneSecond.particles[1].velocity);
  assert.ok(oneSecond.particles.every((value) => [
    ...value.position, ...value.velocity, value.born, value.mass,
  ].every(Number.isFinite)));
});

test('Energia compositor mode 3 retains its executable camera and spring lattice', () => {
  assert.equal(ENERGIA_MODE3_CAMERA_KEYS.length, 10);
  assert.deepEqual(energiaMode3Camera(0), {
    translation: [-176.74708557128906, 0, 306.0207214355469],
    rotation: [7.666667938232422, -108],
    distance: 120,
  });
  assert.deepEqual(energiaMode3Camera(9), {
    translation: [-55.99953842163086, 0, 188.7382049560547],
    rotation: [23.000001907348633, -30.333332061767578],
    distance: 120,
  });

  const start = energiaMode3State(182);
  assert.equal(start.particleCount, 13 ** 3);
  assert.deepEqual(start.particles[0].position, [-300, 300, -300]);
  assert.deepEqual(start.particles.at(-1).position, [
    253.84613037109375, -253.84613037109375, 253.84613037109375,
  ]);
  assert.deepEqual(start.fields[0], {
    center: [-199.87130737304688, -162.7361297607422, 182.81533813476562],
    strength: 23308.5,
  });

  const oneSecond = energiaMode3State(183);
  assert.equal(oneSecond.simulatedSeconds, 1);
  assert.deepEqual(oneSecond.particles[1098].position, [
    4.407775402069092, 76.66974639892578, -48.46658706665039,
  ]);
  assert.deepEqual(oneSecond.particles[1098].velocity, [
    36.348758697509766, 31.31067657470703, 38.90912628173828,
  ]);
  assert.ok(oneSecond.particles.every((particle) => (
    [...particle.position, ...particle.velocity, ...particle.acceleration, particle.field]
      .every(Number.isFinite)
    && particle.field >= 0 && particle.field <= 1
  )));
});

test('Energia mode-3 native strips expand to stable lattice and skymap triangles', () => {
  const particles = energiaMode3State(182).particles;
  const lattice = buildEnergiaMode3LatticeTriangles(particles);
  const surface = buildEnergiaMode3SurfaceTriangles(particles);
  assert.equal(lattice.length / 3, 3549);
  assert.equal(surface.length / 3, 242);
  assert.deepEqual(lattice[0], {
    position: [-300, 300, -300],
    color: [1, 0.3, 0.12, 0.2],
  });
  assert.deepEqual(surface[2], {
    position: [-253.84616088867188, 253.84616088867188, -300],
    normal: [0, -0, 2130.1767578125],
  });
  assert.ok(lattice.every(({ position, color }) => (
    [...position, ...color].every(Number.isFinite)
  )));
  assert.ok(surface.every(({ position, normal }) => (
    [...position, ...normal].every(Number.isFinite)
  )));
});

test('Energia compositor mode 4 retains its executable camera and particle simulation', () => {
  assert.equal(ENERGIA_MODE4_CAMERA_KEYS.length, 7);
  assert.deepEqual(energiaMode4Camera(0), {
    translation: [-4.3333330154418945, 0, 23.33333396911621],
    rotation: [-45, 0],
    distance: 120,
  });
  assert.deepEqual(energiaMode4Camera(4), {
    translation: [13.624480247497559, 0, 64.63258361816406],
    rotation: [-45, -70],
    distance: 120,
  });
  assert.deepEqual(energiaMode4Camera(24), {
    translation: [303.2231140136719, 53.333335876464844, 171.9003448486328],
    rotation: [-55.999996185302734, -323.6666564941406],
    distance: 120,
  });
  assert.deepEqual(
    energiaMode4TextureCoordinate([0, 0, 1], energiaMode4Camera(4)),
    [-0.19537252187728882, 0.678965151309967],
  );

  const start = energiaMode4State(132);
  assert.equal(start.particleCount, 0);
  const oneSecond = energiaMode4State(133);
  assert.equal(oneSecond.particleCount, 10);
  assert.equal(oneSecond.bounceIndex, 1);
  assert.deepEqual(oneSecond.particles[0], {
    position: [36.99936294555664, -46.16754913330078, -23.52741050720215],
    velocity: [50.145355224609375, 160.00099182128906, -19.693056106567383],
    acceleration: [0, -150, 0],
    born: 132.10000610351562,
    remaining: 4.100006103515625,
    mass: 10,
  });
  assert.equal(energiaMode4State(136).particleCount, 40);
  assert.equal(energiaMode4State(144).particleCount, 50);
});

test('Energia compositor mode 4 uses its native marching-cubes topology', () => {
  assert.equal(ENERGIA_MODE4_TRI_TABLE.length, 256);
  assert.deepEqual(ENERGIA_MODE4_TRI_TABLE[0], Array(16).fill(-1));
  assert.deepEqual(ENERGIA_MODE4_TRI_TABLE[1].slice(0, 4), [0, 8, 3, -1]);
  assert.deepEqual(ENERGIA_MODE4_TRI_TABLE[3].slice(0, 7), [1, 8, 3, 9, 8, 1, -1]);
  const mesh = buildEnergiaMode4MetaballMesh([
    { position: [0, 0, 0] },
    { position: [18, 0, 0] },
  ], { resolution: 12 });
  assert.equal(mesh.triangleCount, 60);
  assert.deepEqual(Array.from(mesh.positions.slice(0, 9)), [
    -10.454545021057129, -10.454545021057129, -15.984609603881836,
    -15.984609603881836, -10.454545021057129, -10.454545021057129,
    -10.454545021057129, -15.984609603881836, -10.454545021057129,
  ]);
  assert.equal(mesh.positions.length, mesh.triangleCount * 9);
  assert.equal(mesh.normals.length, mesh.positions.length);
  for (const value of mesh.positions) assert.ok(Number.isFinite(value));
  for (const value of mesh.normals) assert.ok(Number.isFinite(value));
  for (let index = 0; index < mesh.normals.length; index += 3) {
    const length = Math.hypot(
      mesh.normals[index], mesh.normals[index + 1], mesh.normals[index + 2],
    );
    // A perfectly symmetric field point has the native zero gradient;
    // every other vertex is normalized.
    assert.ok(length < 1e-6 || Math.abs(length - 1) < 1e-5);
  }
  for (let index = 0; index < mesh.positions.length; index += 9) {
    const ab = [0, 1, 2].map((axis) => (
      mesh.positions[index + 3 + axis] - mesh.positions[index + axis]
    ));
    const ac = [0, 1, 2].map((axis) => (
      mesh.positions[index + 6 + axis] - mesh.positions[index + axis]
    ));
    const cross = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const outward = [0, 1, 2].map((axis) => (
      mesh.normals[index + axis] + mesh.normals[index + 3 + axis]
        + mesh.normals[index + 6 + axis]
    ));
    // FUN_004043e0 swaps table edges 1 and 2. That makes object-space
    // triangles face inward; the compositor's native Z reflection reverses
    // them before GL's default back-face culling.
    assert.ok(cross[0] * outward[0] + cross[1] * outward[1] + cross[2] * outward[2]
      <= 1e-5);
  }
});

test('Energia mode-2 wide lines retain paired endpoints and pixel widths', () => {
  const identity = new Mat4();
  const values = [
    { position: [-0.5, 0, 0], color: [0.8, 0.8, 0.8, 0.161] },
    { position: [0.5, 0, 0], color: [0.8, 0.28, 0.18, 0.08] },
  ];
  const vertices = buildEnergiaMode2LineQuads(values, identity, identity, 12, 800, 600);
  assert.equal(vertices.length, 4);
  assert.deepEqual(vertices.map((value) => value.position), [
    [-0.5, 0.02, 0], [-0.5, -0.02, 0],
    [0.5, -0.02, 0], [0.5, 0.02, 0],
  ]);
  assert.deepEqual(vertices.map((value) => value.color), [
    values[0].color, values[0].color, values[1].color, values[1].color,
  ]);
});

test('Energia 0x410f90 retains its deterministic triangle fans, camera and six passes', () => {
  assert.equal(energiaMainEffectFade(56), 0);
  assert.equal(energiaMainEffectFade(62 + 2 / 3), 1);
  assert.equal(energiaMainEffectFade(182), Math.fround(0.21));
  assert.equal(energiaMainEffectFade(194.5), 1);

  const camera = energiaMainEffectCamera(0);
  assert.equal(camera.phase, 0);
  assert.deepEqual(camera.eye, [0, 0, -360]);
  assert.deepEqual(camera.target, [0, -30, 0]);
  assert.deepEqual(camera.translation, [0, -100, 0]);
  assert.deepEqual(camera.rotation, [0, 1, 0, 0]);
  assert.ok([...camera.viewMatrix.m].every(Number.isFinite));

  const triangles = buildEnergiaMainEffectTriangles(60);
  assert.equal(triangles.length, 300 * 3);
  assert.deepEqual(triangles.slice(0, 3), [
    [-299.6246337890625, -337.1092834472656, 472.7225646972656],
    [-299.6246337890625, -337.1092834472656, -21.92424774169922],
    [-299.6246337890625, -328.2375793457031, -21.92424774169922],
  ]);
  assert.ok(triangles.flat().every(Number.isFinite));

  const passes = energiaMainEffectPasses(60);
  assert.equal(passes.length, 6);
  assert.deepEqual(passes[0], [
    Math.fround(0.7411764860153198), Math.fround(0.3137255012989044),
    Math.fround(0.11372549086809158), Math.fround(0.6),
  ]);
  assert.deepEqual(passes.slice(1), Array.from({ length: 5 }, () => [
    0, 0, 0, Math.fround(0.5099999904632568),
  ]));
});

test('Energia 0x413db0 retains its native gradient, Hermite strands and jitter stream', () => {
  assert.deepEqual(ENERGIA_LATE_OVERLAY_COLORS[0], [
    0.3019607961177826, 0.04313725605607033, 0.003921568859368563,
  ]);
  assert.deepEqual(ENERGIA_LATE_OVERLAY_COLORS[31], [
    0.9781862497329712, 0.3432598114013672, 0.04571078345179558,
  ]);
  assert.deepEqual(ENERGIA_LATE_OVERLAY_COLORS[32], [
    1, 0.3529411852359772, 0.0470588244497776,
  ]);
  assert.deepEqual(ENERGIA_LATE_OVERLAY_COLORS[62], [
    0.6323529481887817, 0.720588207244873, 0.8191176652908325,
  ]);

  const points = energiaLateOverlayControlPoints(0, 0);
  assert.deepEqual(points, [
    [-99.67955017089844, -98.38028717041016, 0],
    [-99.54666137695312, 101.5297622680664, 0],
    [100.58889770507812, 101.43980407714844, 0],
    [100.72713470458984, -98.65016174316406, 0],
    [-99.1319580078125, -98.7401351928711, 0],
  ]);

  const state = buildEnergiaLateOverlay(0);
  assert.equal(state.rotationX, 360);
  assert.equal(state.rotationY, 365.910400390625);
  assert.equal(state.strands.length, 32);
  assert.equal(state.vertices.length, 6528);
  assert.ok(state.strands.every((strand) => (
    strand.segmentCount === 34 && strand.vertexCount === 204
  )));
  assert.deepEqual(state.vertices[0].position, [
    -118.0130615234375, -138.21742248535156, 0,
  ]);
  assert.deepEqual(state.vertices.at(-1).position, [
    -141.9477081298828, -16.683834075927734, -720,
  ]);
  assert.ok(state.vertices.every(({ position, color }) => (
    [...position, ...color].every(Number.isFinite)
  )));
  const quads = buildEnergiaLateOverlayLineQuads(
    state,
    new Mat4().translate(0, 0, -350).rotate(360, 1, 0, 0).rotate(state.rotationY, 0, 1, 0),
    new Mat4().frustum(-0.5, 0.5, -0.375, 0.375, 1, 5000),
    640,
    480,
  );
  assert.ok(quads.length > 20_000);
  assert.equal(quads.length % 4, 0);
  assert.ok(quads.every(({ position, color }) => (
    [...position, ...color].every(Number.isFinite)
  )));
});

test('Energia 0x4133e0 retains its 256-box transform and material controls', () => {
  const start = energiaLateOverlaySceneState(0, 1);
  assert.equal(start.frame, 0);
  assert.equal(start.texture, 'yellowshitred.jpg');
  assert.equal(start.opacityScale, Math.fround(0.24300000071525574));
  assert.equal(start.scale, 0);
  assert.deepEqual(start.textureOffset, [0, 0]);
  assert.equal(start.textureRotationRate, 24);
  assert.equal(start.matrices.length, 256);
  assert.deepEqual([...start.matrices[0].m].map((value) => Object.is(value, -0) ? 0 : value), [
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 1,
  ]);

  const later = energiaLateOverlaySceneState(4, 3);
  assert.equal(later.frame, 40);
  assert.equal(later.texture, 'sc2.jpg');
  assert.equal(later.opacityScale, Math.fround(0.34299999475479126));
  assert.equal(later.scale, 1);
  assert.deepEqual(later.textureOffset, [Math.fround(0.88), 0]);
  assert.equal(later.phaseStep, 4.128557205200195);
  assert.deepEqual([...later.matrices[0].m], [
    -0.7373937964439392, 0.6754631400108337, 0, 0,
    -0.6754631400108337, -0.7373937964439392, 0, 0,
    0, 0, 1, 0,
    0, 0, -189.20062255859375, 1,
  ]);
  assert.ok(later.matrices.every((matrix) => [...matrix.m].every(Number.isFinite)));
});

test('Wonder beginning textures retain native white intensity and environment units', () => {
  assert.deepEqual([...WONDER_BEGINNING_MATERIAL_COLORS], [
    [0, [1, 1, 1]],
    [1, [1, 1, 1]],
  ]);
  assert.deepEqual([...WONDER_BEGINNING_ENVIRONMENT_MAP_UNITS]
    .map(([material, units]) => [material, [...units]]), [
    [0, [1]],
    [1, [1]],
  ]);
});

test('Wonder beginning preserves its native background/foreground depth split', () => {
  const renderCalls = [];
  const mgl = new Proxy({
    SRC_ALPHA: 0x302,
    ONE_MINUS_SRC_ALPHA: 0x303,
    TEXTURE0: 0,
    TEXTURE1: 1,
    TEXTURE: 2,
    PROJECTION: 3,
    MODELVIEW: 4,
    QUADS: 7,
  }, {
    get(target, property) {
      return property in target ? target[property] : () => {};
    },
  });
  const beginning = new BeginningEffect(
    mgl,
    { render(frame, options) { renderCalls.push({ frame, options }); } },
    new Map(),
    {
      circleAlpha: parseEnvelope(fs.readFileSync(path.join(envDir, 'alpha_circle.env'), 'utf8')),
      exit: parseEnvelope(fs.readFileSync(path.join(envDir, 'koniec_intra.env'), 'utf8')),
    },
  );
  const state = beginning.render(10);

  assert.equal(renderCalls.length, 2);
  assert.equal(renderCalls[0].frame, 200);
  assert.deepEqual(renderCalls[0].options.meshIndices, [1]);
  assert.equal(renderCalls[0].options.depthTest, false);
  assert.deepEqual(renderCalls[1].options.meshIndices, [0, 4]);
  assert.equal(renderCalls[1].options.depthTest, true);
  assert.equal(renderCalls[1].options.clear, false);
  for (const { options } of renderCalls) {
    assert.equal(options.cullFaceOverride, false);
    assert.equal(options.opacityScale, state.commonAlpha);
    assert.equal(options.blendFuncOverride, undefined);
  }
});

test('Wonder environment coordinates use its native normal projection', () => {
  const normals = new Float32Array([
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
  ]);
  assert.deepEqual([...wonderEnvironmentTexcoords(normals, new Mat4())], [
    1, -0.5,
    0.5, -1,
    0.5, -0.5,
  ]);

  // Wonder divides matrix rows by the corresponding sampled local scale.
  const scaled = new Mat4().scale(2, 3, 4);
  assert.deepEqual([...wonderEnvironmentTexcoords(normals, scaled, [2, 3, 4])], [
    1, -0.5,
    0.5, -1,
    0.5, -0.5,
  ]);
});

test('Wonder Dark Horizon retains the 0x40d820 eight-plane transforms', () => {
  const start = wonderDarkHorizonState(0);
  assert.equal(start.planes.length, 8);
  assert.deepEqual(start.planes[0], {
    index: 0,
    translationZ: -100,
    zRotation: 0,
    tilt: 90,
    pivotRotation: 0,
  });
  assert.deepEqual(start.planes.at(-1), {
    index: 7,
    translationZ: -660,
    zRotation: 112,
    tilt: 90,
    pivotRotation: 0,
  });

  const moving = wonderDarkHorizonState(1);
  assert.equal(moving.time, 1);
  assert.deepEqual(moving.planes[0], {
    index: 0,
    translationZ: -64.95234680175781,
    zRotation: 25,
    tilt: 110.68639373779297,
    pivotRotation: 26,
  });
  assert.equal(moving.planes.at(-1).zRotation, 137);
});

test('Wonder bubble lattice retains its executable dimensions and end caps', () => {
  const start = wonderBubbleControlPoint(0, 0, 0);
  assert.deepEqual(start.position, [73.60000610351562, 0, -230.00001525878906]);
  assert.equal(start.color[3], 0);
  assert.equal(wonderBubbleControlPoint(1, 1, 0).color[3], Math.fround(0.26));
  assert.equal(wonderBubbleControlPoint(10, 3, 4).color[3], 1);
  const surface = buildWonderBubbleSurface(1);
  assert.equal(surface.length, 5 * 5 * 6 * 3 * 6);
  for (const vertex of surface) {
    assert.equal(vertex.position.length, 3);
    assert.equal(vertex.normal.length, 3);
    assert.equal(vertex.uv.length, 2);
    assert.equal(vertex.color.length, 4);
    assert.ok([...vertex.position, ...vertex.normal, ...vertex.uv, ...vertex.color]
      .every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...vertex.normal) - 1) < 1e-9);
  }
});

test('Wonder bubblebath scene uses its compiled 1.53 fps wrapping clock', () => {
  assert.equal(wonderBubblebathFrame(0), 0);
  assert.equal(wonderBubblebathFrame(10), Math.fround(15.3));
  assert.equal(wonderBubblebathFrame(50), Math.fround(12.5));
});

test('Wonder max-texture tunnel retains its compiled card layout and fades', () => {
  assert.equal(wonderMaxTextureAlpha(0), 0);
  assert.equal(wonderMaxTextureAlpha(1), 0.19);
  assert.equal(wonderMaxTextureAlpha(2), 0.19);
  assert.ok(Math.abs(wonderMaxTextureAlpha(17.1) - 0.076) < 1e-12);
  const cards = wonderMaxTextureCards(0);
  assert.equal(cards.length, 16);
  assert.deepEqual(cards[0].translation, [0, 0, -100]);
  assert.deepEqual(cards[7].translation, [0, 0, -660]);
  assert.deepEqual(cards[8].translation, [0, 70, -100]);
  assert.equal(cards[7].rotationZ, 112);
  assert.equal(cards[0].tilt, 90);
});

test('Wonder boxical class retains its two compiled scene clocks and scroll', () => {
  assert.deepEqual(wonderBoxicalState(0), {
    alpha: 1,
    frames: [0, 4],
    textureOffset: [-0, 0],
  });
  assert.deepEqual(wonderBoxicalState(10), {
    alpha: 0.37,
    frames: [80, 84],
    textureOffset: [-36, 0],
  });
  assert.equal(wonderBoxicalState(11.5).alpha, 0);
});

test('Wonder module retains its terminal F00 hold before the executable exit cut', () => {
  const player = new XmPlayer(fs.readFileSync(path.join(envDir, 'mystified.xm')), 48000);
  const terminal = [];
  for (let position = 0; position < player.order.length; position++) {
    const patternIndex = player.order[position];
    const pattern = player.patterns[patternIndex];
    for (let row = 0; row < pattern.rows; row++) {
      for (let channel = 0; channel < player.channels; channel++) {
        const offset = (row * player.channels + channel) * 5;
        if (pattern.cells[offset + 3] === 0x0f && pattern.cells[offset + 4] === 0) {
          terminal.push({ position, pattern: patternIndex, row, channel });
        }
      }
    }
  }
  assert.deepEqual(terminal, [{ position: 21, pattern: 13, row: 63, channel: 3 }]);
  player.skip(Math.floor(181.1 * player.sampleRate));
  assert.equal(player.position, 21);
  assert.equal(player.row, 63);
  assert.equal(player.speed, 256);
  player.skip(Math.floor((WONDER_SHOW_END - 181.1) * player.sampleRate));
  assert.equal(player.position, 21, 'F00 still holds the terminal order at the exit cut');
});

test('Wonder live visuals retain FMOD native 30 ms mix-ahead phase', () => {
  const context = {
    sampleRate: 48000,
    currentTime: 10,
    createScriptProcessor() {
      return { onaudioprocess: null, connect() {}, disconnect() {} };
    },
  };
  const clock = new WonderShowClock(
    context,
    fs.readFileSync(path.join(envDir, 'mystified.xm')),
    [0],
  );
  clock.lastAudibleTag = { time: 9, showTime: 5 };

  assert.equal(WONDER_NATIVE_MIX_AHEAD_SECONDS, 0.03);
  assert.ok(Math.abs(clock.timeSeconds() - 6.03) < 1e-12);
});

test('raw texture decoders preserve channels and reject wrong sizes', () => {
  assert.deepEqual([...decodeRgb24(Uint8Array.of(1, 2, 3), 1, 1).rgba], [1, 2, 3, 255]);
  assert.deepEqual([...decodeGray8(Uint8Array.of(7), 1, 1, 'alpha').rgba], [255, 255, 255, 7]);
  assert.deepEqual([...combineRgbAlpha(Uint8Array.of(1, 2, 3), Uint8Array.of(4), 1, 1).rgba],
    [1, 2, 3, 4]);
  assert.throws(() => decodeRgb24(Uint8Array.of(1), 1, 1), /expected 3 bytes/);
});

test('static and media clocks expose the common seek/time contract', async () => {
  const fixed = new StaticShowClock(2);
  await fixed.seek(7.5);
  assert.equal(fixed.timeSeconds(), 7.5);

  const media = {
    currentTime: 4,
    duration: 10,
    readyState: 1,
    ended: false,
    play: async () => {},
    pause: () => {},
  };
  const clock = new MediaShowClock(media, { offsetSeconds: 0.25 });
  assert.equal(clock.timeSeconds(), 4.25);
  await clock.seek(8.25);
  assert.equal(media.currentTime, 8);
});
