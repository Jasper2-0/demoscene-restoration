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

export async function uploadWonderRawAssets(mgl, assets) {
  const entries = await Promise.all([
    ...RAW_TEXTURES.map(async ([name, options]) =>
      [name, await uploadRawTexture(mgl, assets, name, options)]),
    ...COMPOSITES.map(async ([name, image, alpha, width, height]) =>
      [name, await uploadImageAlphaTexture(mgl, assets, image, alpha,
        { width, height })]),
  ]);
  return new Map(entries);
}
