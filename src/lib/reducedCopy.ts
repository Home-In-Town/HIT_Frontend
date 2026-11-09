// Preview_Copy / Detail_Copy maker (design 3.1 "Preview_Copy and Detail_Copy",
// D10, R21.2). Browser only (createImageBitmap + canvas). The target size comes
// from reducedCopyTarget in layoutTools.mjs so the sizing rule is tested in
// bare Node; this file does the encoding loop.

import { reducedCopyTarget } from '@/lib/layoutTools.mjs';

export interface ReducedCopy {
  blob: Blob;
  width: number;
  height: number;
  mime: 'image/webp' | 'image/jpeg';
}

const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45, 0.4];
const SIDE_SHRINK = 0.85; // 15 % per retry when even q=0.4 is too big

function encode(canvas: HTMLCanvasElement, mime: string, q: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, q));
}

/**
 * Make a reduced copy of `source` whose longest side is <= `maxSide` and whose
 * encoded size is <= `maxBytes`. Never upscales (a smaller source keeps its
 * size). Tries WEBP at quality 0.85 down to 0.4; if the browser cannot encode
 * WEBP it falls back to JPEG; if 0.4 is still too big the side shrinks by 15 %
 * and the steps repeat. Returns null only when the canvas cannot be created.
 *
 * `kind` picks the cap pair; `maxSide`/`maxBytes` come from reducedCopyTarget
 * for the real source size, so a caller passes the Detail_Copy output as the
 * source of the Preview_Copy and only one full-size decode ever happens.
 */
export async function makeReducedCopy(
  source: Blob | ImageBitmap,
  kind: 'preview' | 'detail',
): Promise<ReducedCopy | null> {
  const bitmap = source instanceof Blob ? await createImageBitmap(source) : source;
  const target = reducedCopyTarget({ width: bitmap.width, height: bitmap.height }, kind);
  if (!target) return null;
  let { width, height } = target;
  const { maxBytes } = target;

  // Hard stop so a pathological input cannot loop forever.
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const resized = await createImageBitmap(bitmap, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { resized.close(); return null; }
    ctx.drawImage(resized, 0, 0);
    resized.close();

    for (const q of QUALITY_STEPS) {
      let mime: 'image/webp' | 'image/jpeg' = 'image/webp';
      let blob = await encode(canvas, mime, q);
      // A browser without WEBP encode silently returns PNG (or null).
      if (!blob || blob.type !== 'image/webp') {
        mime = 'image/jpeg';
        blob = await encode(canvas, mime, q);
      }
      if (blob && blob.size <= maxBytes) return { blob, width, height, mime };
    }
    // Derive height from the SOURCE aspect, not from the previous rounded
    // height, so repeated shrinking cannot accumulate drift past 0.5 % (R21.2).
    width = Math.max(1, Math.round(width * SIDE_SHRINK));
    height = Math.max(1, Math.round((width * bitmap.height) / bitmap.width));
  }
  return null;
}
