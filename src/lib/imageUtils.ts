/**
 * Utility functions for client-side image reading, circular/square cropping, and compression.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Reads a File or Blob and returns a base64 Data URL string.
 */
export function readFileAsDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image as string data URL'));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image from a URL or Data URL safely.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Crops and compresses an image into a smooth square/circular avatar.
 * Generates an optimized WebP (or JPEG fallback) data URL ~15-30KB in size.
 */
export async function cropAndCompressImage(
  imageSource: string | HTMLImageElement,
  cropArea?: CropArea,
  outputDimension = 320,
  quality = 0.85
): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;

  const canvas = document.createElement('canvas');
  canvas.width = outputDimension;
  canvas.height = outputDimension;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Smooth image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  let sx = 0;
  let sy = 0;
  let sWidth = img.naturalWidth || img.width;
  let sHeight = img.naturalHeight || img.height;

  if (cropArea) {
    sx = Math.max(0, cropArea.x);
    sy = Math.max(0, cropArea.y);
    sWidth = Math.min(cropArea.width, img.naturalWidth - sx);
    sHeight = Math.min(cropArea.height, img.naturalHeight - sy);
  } else {
    // Default: Center-crop to a square
    const minDim = Math.min(sWidth, sHeight);
    sx = (sWidth - minDim) / 2;
    sy = (sHeight - minDim) / 2;
    sWidth = minDim;
    sHeight = minDim;
  }

  ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputDimension, outputDimension);

  // Try WebP first, fallback to JPEG
  try {
    const webpUrl = canvas.toDataURL('image/webp', quality);
    if (webpUrl.startsWith('data:image/webp')) {
      return webpUrl;
    }
  } catch {
    // Continue to fallback
  }

  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Resizes and compresses an uploaded image file while maintaining aspect ratio.
 * Fits within maxDimension (e.g. 1200px) and outputs a compact WebP or JPEG string (~50KB-180KB).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<string> {
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return rawDataUrl;
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  try {
    const webp = canvas.toDataURL('image/webp', quality);
    if (webp.startsWith('data:image/webp')) {
      return webp;
    }
  } catch {
    // Fallback
  }

  return canvas.toDataURL('image/jpeg', quality);
}
