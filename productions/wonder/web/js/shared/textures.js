function bytesOf(input) {
  return input instanceof Uint8Array
    ? input
    : new Uint8Array(input.buffer ?? input, input.byteOffset ?? 0, input.byteLength);
}

function requireLength(bytes, expected, label) {
  if (bytes.byteLength !== expected) {
    throw new Error(`${label}: expected ${expected} bytes, found ${bytes.byteLength}`);
  }
}

export function decodeRgb24(input, width, height) {
  const bytes = bytesOf(input);
  requireLength(bytes, width * height * 3, 'RGB24 texture');
  const rgba = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < bytes.length; source += 3, target += 4) {
    rgba[target] = bytes[source];
    rgba[target + 1] = bytes[source + 1];
    rgba[target + 2] = bytes[source + 2];
    rgba[target + 3] = 255;
  }
  return { width, height, rgba };
}

export function decodeGray8(input, width, height, mode = 'luminance') {
  const bytes = bytesOf(input);
  requireLength(bytes, width * height, 'gray8 texture');
  const rgba = new Uint8Array(width * height * 4);
  for (let source = 0, target = 0; source < bytes.length; source++, target += 4) {
    const value = bytes[source];
    if (mode === 'alpha') {
      rgba[target] = rgba[target + 1] = rgba[target + 2] = 255;
      rgba[target + 3] = value;
    } else if (mode === 'luminance') {
      rgba[target] = rgba[target + 1] = rgba[target + 2] = value;
      rgba[target + 3] = 255;
    } else {
      throw new Error(`unknown gray8 mode ${mode}`);
    }
  }
  return { width, height, rgba };
}

export function combineRgbAlpha(rgbInput, alphaInput, width, height) {
  const rgb = bytesOf(rgbInput), alpha = bytesOf(alphaInput);
  requireLength(rgb, width * height * 3, 'RGB24 texture');
  requireLength(alpha, width * height, 'alpha texture');
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < alpha.length; pixel++) {
    const source = pixel * 3, target = pixel * 4;
    rgba[target] = rgb[source];
    rgba[target + 1] = rgb[source + 1];
    rgba[target + 2] = rgb[source + 2];
    rgba[target + 3] = alpha[pixel];
  }
  return { width, height, rgba };
}

export async function uploadRawTexture(mgl, assets, name, {
  width, height, format = 'gray8', mode = 'luminance', mipmap = true, clamp = false,
} = {}) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw new Error(`${name}: raw texture requires positive integer dimensions`);
  }
  const bytes = new Uint8Array(await assets.loadBytes(name));
  const decoded = format === 'rgb24'
    ? decodeRgb24(bytes, width, height)
    : format === 'gray8'
      ? decodeGray8(bytes, width, height, mode)
      : (() => { throw new Error(`${name}: unknown raw texture format ${format}`); })();
  return mgl.createTextureFromData(decoded.rgba, width, height, mipmap, clamp);
}

export async function uploadImageAlphaTexture(mgl, assets, imageName, alphaName, {
  width, height, mipmap = true, clamp = false,
} = {}) {
  const [image, alphaBuffer] = await Promise.all([
    assets.loadImage(imageName), assets.loadBytes(alphaName),
  ]);
  if (image.naturalWidth !== width || image.naturalHeight !== height) {
    throw new Error(`${imageName}: expected ${width}x${height}, found ${image.naturalWidth}x${image.naturalHeight}`);
  }
  const alpha = new Uint8Array(alphaBuffer);
  requireLength(alpha, width * height, `${alphaName} alpha texture`);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height);
  for (let pixel = 0; pixel < alpha.length; pixel++) pixels.data[pixel * 4 + 3] = alpha[pixel];
  return mgl.createTextureFromData(pixels.data, width, height, mipmap, clamp);
}
