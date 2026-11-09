// PDF -> Layout_Image loader for the Layout Editor (design 3.1 "PDF handling",
// R2.1-R2.10). Browser only: pdf.js needs DOM canvases, so everything here is
// called from event handlers, never at module load, and pdfjs-dist is imported
// lazily so Next's server render of the editor page never evaluates it.
//
// The pure sizing rule (rasterScale) lives in layoutTools.mjs where node --test
// covers it; this file only does the DOM work around it.

import { rasterScale, DECODED_MAX_SIDE_PX, DECODED_MAX_PIXELS } from '@/lib/layoutTools.mjs';

type PdfjsModule = typeof import('pdfjs-dist');
type PdfDocument = import('pdfjs-dist').PDFDocumentProxy;

export type PdfLoadFailure = 'password' | 'unparsable' | 'zero-pages' | 'worker' | 'unknown';

/** Typed failure so the picker can show the right message (R2.6, R2.9, R2.10). */
export class PdfLayoutError extends Error {
  reason: PdfLoadFailure | 'canvas';
  constructor(reason: PdfLoadFailure | 'canvas', message: string) {
    super(message);
    this.reason = reason;
  }
}

/** Thumbnails are rendered for pages 1-50 only; longer PDFs use the page-number input (R2.1, R2.2). */
export const THUMBNAIL_PAGE_LIMIT = 50;
export const THUMBNAIL_MAX_SIDE_PX = 300;
const IOS_SAFARI_CANVAS_CAP = 16_777_216;

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Load pdf.js once and point it at the worker shipped by the SAME installed
 * package (R2.8). Before this the worker was a hand-copied public/ file at a
 * different version than the library, which pdf.js rejects at runtime; the
 * `new URL(..., import.meta.url)` form makes the bundler emit the matching
 * worker, and pdfjsVersion.test.mjs pins that there is only one copy.
 */
export function loadPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      return mod;
    });
    // A failed import must not be cached forever.
    pdfjsPromise.catch(() => { pdfjsPromise = null; });
  }
  return pdfjsPromise;
}

/** Map a pdf.js exception to a reason (R2.6, R2.9). Matches on `name`/message because the classes are not all exported. */
export function classifyPdfError(err: unknown): PdfLoadFailure {
  const e = err as { name?: string; message?: string } | null;
  const name = String(e?.name ?? '');
  const msg = String(e?.message ?? '');
  if (name === 'PasswordException') return 'password';
  // pdf.js throws this when the API and worker versions differ.
  if (/API version .* does not match the Worker version/i.test(msg)) return 'worker';
  if (/Setting up fake worker failed|Cannot load script|Failed to fetch dynamically imported module/i.test(msg)) return 'worker';
  if (name === 'InvalidPDFException' || name === 'FormatError' || name === 'MissingPDFException') return 'unparsable';
  return 'unknown';
}

/** Open a PDF from bytes. Throws PdfLayoutError for password, unparsable, zero pages, or a worker/version mismatch. */
export async function openPdf(data: ArrayBuffer | Uint8Array): Promise<PdfDocument> {
  const pdfjs = await loadPdfjs();
  let doc: PdfDocument;
  try {
    // pdf.js transfers the buffer to the worker; copy so the caller keeps its bytes for the Source_PDF upload.
    const bytes = data instanceof Uint8Array ? data.slice() : new Uint8Array(data.slice(0));
    doc = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (err) {
    const reason = classifyPdfError(err);
    const text: Record<PdfLoadFailure, string> = {
      password: 'This PDF is password-protected. Remove the password and try again.',
      unparsable: 'This PDF could not be read. Try exporting it again.',
      'zero-pages': 'This PDF has no pages.',
      worker: 'The PDF reader could not start (version mismatch). Reload the page and try again.',
      unknown: 'This PDF could not be opened.',
    };
    throw new PdfLayoutError(reason, text[reason]);
  }
  if (!doc.numPages || doc.numPages < 1) {
    await doc.destroy();
    throw new PdfLayoutError('zero-pages', 'This PDF has no pages.');
  }
  return doc;
}

let pixelCapPromise: Promise<number> | null = null;

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS && /WebKit/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

/** True when an s x s canvas can be allocated AND written/read back (the canvas-size method). */
function canvasWorks(side: number): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = side;
    c.height = side;
    const ctx = c.getContext('2d');
    if (!ctx) return false;
    ctx.fillStyle = '#000';
    ctx.fillRect(side - 1, side - 1, 1, 1);
    return ctx.getImageData(side - 1, side - 1, 1, 1).data[3] !== 0;
  } catch {
    return false;
  }
}

/**
 * Pixel_Cap = min(40 MP, largest square canvas this browser can really use,
 * 16,777,216 on iOS Safari). Probed once per session by trying decreasing
 * square sizes (8192, 7168, ...), because browsers silently hand back a blank
 * canvas past their limit instead of throwing.
 */
export function getPixelCap(): Promise<number> {
  if (!pixelCapPromise) {
    pixelCapPromise = Promise.resolve().then(() => {
      let maxArea = 1024 * 1024;
      for (let side = 8192; side >= 1024; side -= 1024) {
        if (canvasWorks(side)) { maxArea = side * side; break; }
      }
      return Math.min(DECODED_MAX_PIXELS, maxArea, isIosSafari() ? IOS_SAFARI_CANVAS_CAP : Infinity);
    });
  }
  return pixelCapPromise;
}

/**
 * Render a small preview of one page, longest side <= 300 px (R2.1). Returns a
 * data URL; the picker calls this lazily when a thumbnail scrolls into view.
 */
export async function renderThumbnail(doc: PdfDocument, pageNumber: number): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const scale = THUMBNAIL_MAX_SIDE_PX / Math.max(base.width, base.height);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PdfLayoutError('canvas', 'Could not create a drawing surface for the preview.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  const url = canvas.toDataURL('image/jpeg', 0.7);
  page.cleanup();
  return url;
}

export interface RasterisedPage {
  blob: Blob;
  width: number;
  height: number;
  /** True when the longest side ended up below 4096 px (R2.5): show the reduced-size notice. */
  reduced: boolean;
}

/**
 * Rasterise ONE page to a PNG on a white background (R2.3). The page's own
 * `/Rotate` is applied by the viewport, plus `extraRotationDeg` the user added
 * in the picker. Scale comes from rasterScale (8192 px / Pixel_Cap). A failed
 * canvas allocation or a null blob is reported as reason 'canvas' (R2.10).
 */
export async function rasterisePage(
  doc: PdfDocument,
  pageNumber: number,
  extraRotationDeg = 0,
): Promise<RasterisedPage> {
  const page = await doc.getPage(pageNumber);
  const rotation = (((page.rotate + extraRotationDeg) % 360) + 360) % 360;
  const base = page.getViewport({ scale: 1, rotation });
  const cap = await getPixelCap();
  const { scale, reduced } = rasterScale(base.width, base.height, cap);
  if (!(scale > 0)) throw new PdfLayoutError('canvas', 'This page has no usable size.');
  const viewport = page.getViewport({ scale, rotation });
  const width = Math.max(1, Math.floor(viewport.width));
  const height = Math.max(1, Math.floor(viewport.height));
  if (Math.max(width, height) > DECODED_MAX_SIDE_PX) {
    throw new PdfLayoutError('canvas', 'This page is too large to convert.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PdfLayoutError('canvas', 'Could not allocate a drawing surface for this page. Pick another page or a smaller PDF.');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  try {
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  } catch {
    throw new PdfLayoutError('canvas', 'This page could not be drawn. Pick another page.');
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  page.cleanup();
  if (!blob) throw new PdfLayoutError('canvas', 'This page could not be converted to an image. Pick another page.');
  return { blob, width, height, reduced };
}
