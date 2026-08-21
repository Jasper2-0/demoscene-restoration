import { uploadImageAlphaTexture, uploadRawTexture } from './shared/textures.js';

const RAW_TEXTURES = Object.freeze([
  ['LeftSideOfSecret1b.tga', { width: 256, height: 256, format: 'rgb24' }],
  ['RightSideOfSecret1b.tga', { width: 256, height: 256, format: 'rgb24' }],
  ['D1_CircleAlpha.tga', { width: 256, height: 256, mode: 'alpha' }],
  ['D1_FaceAlpha.tga', { width: 256, height: 256, mode: 'alpha' }],
  ['D1_WonderAlpha.tga', { width: 256, height: 256, mode: 'alpha' }],
  ['unrd1.raw', { width: 256, height: 256 }],
  ['unrd3.raw', { width: 256, height: 256 }],
  ['bump.raw', { width: 512, height: 256 }],
]);

const COMPOSITES = Object.freeze([
  ['wonder-title', 'd1_wonder2.jpg', 'D1_WonderAlpha.tga', 256, 256],
  ['face-title', 'd1_face.jpg', 'D1_FaceAlpha.tga', 256, 256],
  ['circle-title', 'd1_circle2.jpg', 'D1_CircleAlpha.tga', 256, 256],
  ['bump-map', 'bump.jpg', 'bump.raw', 512, 256],
]);

// Wonder NEVER mipmaps. Its uploads set only GL_LINEAR min and mag — the bump
// composite's are at 0x0040c4xx via FUN_00407c50 — and an apitrace recording of the
// whole show contains no *_MIPMAP_* filter anywhere: 70 GL_LINEAR and 5 GL_NEAREST
// across 75 filter calls.
//
// Both upload helpers default `mipmap` to TRUE, and this file passed neither, so every
// raw texture and every composite carried a mip chain. That is not a subtle difference
// for the bump card: its emboss term is a DIFFERENCE of two samples of the same texture
// about 0.005 apart in UV, so sampling a blurred level drives the difference toward
// zero and collapses the card to its flat base colour. The original samples level 0,
// keeps a large signed difference, and saturates to white — which is exactly the
// reported symptom, ours coloured where the reference is white.
const NO_MIPMAPS = { mipmap: false };

export async function uploadWonderRawAssets(mgl, assets) {
  const entries = await Promise.all([
    ...RAW_TEXTURES.map(async ([name, options]) =>
      [name, await uploadRawTexture(mgl, assets, name, { ...options, ...NO_MIPMAPS })]),
    ...COMPOSITES.map(async ([name, image, alpha, width, height]) =>
      [name, await uploadImageAlphaTexture(mgl, assets, image, alpha,
        { width, height, ...NO_MIPMAPS })]),
  ]);
  return new Map(entries);
}
