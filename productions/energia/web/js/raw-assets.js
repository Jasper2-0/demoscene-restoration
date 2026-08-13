import { uploadRawTexture } from './shared/textures.js';

const RAW_TEXTURES = Object.freeze([
  ['s.raw', { width: 512, height: 128, format: 'rgb24' }],
  ['sb.raw', { width: 512, height: 128, format: 'rgb24' }],
  ['ADDICT1.raw', { width: 256, height: 256 }],
  ['DISP2.raw', { width: 256, height: 256 }],
  ['twirlB.raw', { width: 256, height: 256 }],
  ['wave1.raw', { width: 256, height: 256 }],
  ['yellowshit4.raw', { width: 256, height: 256 }],
  ['shit.raw', { width: 2, height: 2, format: 'rgb24', mipmap: false }],
]);

export async function uploadEnergiaRawAssets(mgl, assets) {
  const entries = await Promise.all(RAW_TEXTURES.map(async ([name, options]) =>
    [name, await uploadRawTexture(mgl, assets, name, options)]));
  return new Map(entries);
}
