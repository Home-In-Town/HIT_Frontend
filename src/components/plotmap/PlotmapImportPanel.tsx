'use client';
// The one input of the new editor: pick an image or PDF, press "Layout generate
// karo". Reuses the existing file picker, PDF page picker and upload progress
// list; everything about placing, aligning or drawing is gone.
//
// A PDF is rasterised here in the browser (pdf.js, one chosen page) and only the
// PNG is uploaded; the PDF itself is never sent (addendum 10.3). If the PNG is
// too heavy for the 25 MB upload limit it is re-rendered at 60 % of the pixel
// cap, up to three times.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import OverlayFilePicker from '@/components/layout-editor/OverlayFilePicker';
import PdfPagePicker from '@/components/layout-editor/PdfPagePicker';
import UploadProgress from '@/components/layout-editor/UploadProgress';
import type { UploadItem } from '@/components/layout-editor/UploadProgress';
import { IMAGE_MAX_BYTES } from '@/lib/layoutTools.mjs';
import { LayoutUploadError, uploadLayoutFile } from '@/lib/api';
import { getPixelCap, openPdf, PdfLayoutError, rasterisePage } from '@/lib/pdfLayout';
import { apiCode, plotmapApi } from '@/lib/plotmapApi';
import { plotmapErrorText } from '@/lib/plotMap.mjs';

/** Below this the server answers 422 IMAGE_TOO_SMALL; checked here first to save the upload. */
export const MIN_LONG_SIDE_PX = 600;
/** Under this numbers are hard to read; allowed, with a warning (server adds LOW_RESOLUTION). */
export const SOFT_LONG_SIDE_PX = 1500;
/** PNG of a PDF page must fit the 25 MB upload limit with a little room. */
const MAX_PAGE_BYTES = 24 * 1024 * 1024;
const MAX_RASTER_RETRIES = 3;

type Source = { blob: Blob; name: string; pdfPage: number | null };
type Dims = { w: number; h: number };

export interface StartedRun { layoutId: string; imageKey: string; pdfPage: number | null }

export default function PlotmapImportPanel({
  projectId, hasLive, onStarted, onConflict,
}: {
  projectId: string;
  /** A published layout exists: this is a regenerate, bookings carry over by plot number (D8a). */
  hasLive: boolean;
  onStarted: (run: StartedRun) => void;
  /** 409 ALREADY_RUNNING: the page should reload and show the running or draft layout. */
  onConflict: () => void;
}) {
  const [source, setSource] = useState<Source | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<Dims | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfName, setPdfName] = useState('');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [rasterBusy, setRasterBusy] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Object URLs hold the whole image in memory until revoked.
  useEffect(() => {
    if (!source) { setPreviewUrl(null); setDims(null); return; }
    const url = URL.createObjectURL(source.blob);
    setPreviewUrl(url);
    let alive = true;
    const img = new Image();
    img.onload = () => { if (alive) setDims({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { if (alive) { setDims(null); setError('Ye image padhi nahi ja saki. PNG ya JPG mein dobara save karke dekhein.'); } };
    img.src = url;
    return () => { alive = false; URL.revokeObjectURL(url); };
  }, [source]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const reset = useCallback(() => {
    setSource(null);
    setPdfDoc(null);
    setPdfNotice(null);
    setItems([]);
    setError(null);
  }, []);

  const onPicked = async (file: File, kind: 'image' | 'pdf') => {
    reset();
    if (file.size > IMAGE_MAX_BYTES) {
      setError(plotmapErrorText('TOO_LARGE'));
      return;
    }
    if (kind === 'image') {
      setSource({ blob: file, name: file.name, pdfPage: null });
      return;
    }
    try {
      setPdfDoc(await openPdf(await file.arrayBuffer()));
      setPdfName(file.name.replace(/\.pdf$/i, ''));
    } catch (e) {
      setError(e instanceof PdfLayoutError ? e.message : 'Ye PDF khul nahi paya.');
    }
  };

  const onConfirmPage = async (page: number, extraRotationDeg: 0 | 90 | 180 | 270) => {
    if (!pdfDoc) return;
    setRasterBusy(true);
    setPdfNotice('Page ko image mein badla ja raha hai…');
    try {
      let cap = await getPixelCap();
      for (let attempt = 0; attempt <= MAX_RASTER_RETRIES; attempt++) {
        const r = await rasterisePage(pdfDoc, page, extraRotationDeg, attempt === 0 ? undefined : cap);
        if (r.blob.size <= MAX_PAGE_BYTES) {
          setSource({ blob: r.blob, name: `${pdfName || 'layout'}-page-${page}.png`, pdfPage: page });
          setPdfDoc(null);
          setPdfNotice(null);
          return;
        }
        cap = Math.floor(cap * 0.6);
      }
      setPdfNotice('PDF page bahut bhaari hai, kam resolution wala PDF ya image dein.');
    } catch (e) {
      setPdfNotice(e instanceof PdfLayoutError ? e.message : 'Is page ko image mein nahi badla ja saka.');
    } finally {
      setRasterBusy(false);
    }
  };

  const longSide = dims ? Math.max(dims.w, dims.h) : 0;
  const tooSmall = !!dims && longSide < MIN_LONG_SIDE_PX;
  const lowRes = !!dims && !tooSmall && longSide < SOFT_LONG_SIDE_PX;

  const generate = async () => {
    if (!source || busy || tooSmall) return;
    setBusy(true);
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setItems([{ id: 'image', label: 'Layout image', percent: 0, status: 'uploading' }]);
    let imageKey: string;
    try {
      const up = await uploadLayoutFile(source.blob, source.name, projectId, 'plotmap-image',
        (percent) => setItems([{ id: 'image', label: 'Layout image', percent, status: 'uploading' }]), ctrl.signal);
      imageKey = up.fileKey;
      setItems([{ id: 'image', label: 'Layout image', percent: 100, status: 'done' }]);
    } catch (e) {
      const text = e instanceof LayoutUploadError
        ? (e.code ? plotmapErrorText(e.code, e.message) : e.message)
        : 'Upload nahi ho paya.';
      setItems([{ id: 'image', label: 'Layout image', percent: 0, status: 'failed', error: text }]);
      setBusy(false);
      return;
    }
    try {
      const run = await plotmapApi.generate(projectId, imageKey, source.pdfPage ?? undefined);
      onStarted({ layoutId: run.layoutId, imageKey, pdfPage: source.pdfPage });
    } catch (e) {
      const code = apiCode(e);
      setError(plotmapErrorText(code, e instanceof Error ? e.message : undefined));
      if (code === 'ALREADY_RUNNING') onConflict();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Layout import" className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">{hasLive ? 'Layout dobara banao (Regenerate)' : 'Plot layout banao'}</h2>
      {hasLive && (
        <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Naya layout publish karne par booked/sold plots purane layout se plot number ke hisaab se jod diye jayenge. Koi booked plot ka number naye layout mein na mile to publish ruk jayega.
        </p>
      )}

      {pdfDoc ? (
        <PdfPagePicker doc={pdfDoc} busy={rasterBusy} notice={pdfNotice} onConfirm={onConfirmPage} onCancel={() => { setPdfDoc(null); setPdfNotice(null); }} />
      ) : (
        <>
          <OverlayFilePicker hasImage={!!source} disabled={busy} onPicked={onPicked} />
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>Seedha scan ya CAD export karo, photo mat khicho.</li>
            <li>Image seedha rakho (rotate nahi), text zoom karke padhne layak ho.</li>
            <li>White background, dark lines. Plot numbers aur area drawing mein likhe hon.</li>
            <li>3000 se 5000 px lambai sabse achhi rehti hai.</li>
          </ul>
          <p className="text-xs text-gray-500">Layout banane ke liye image HomeInTown ke AI se process hoti hai.</p>
        </>
      )}

      {source && previewUrl && !pdfDoc && (
        <div className="flex items-start gap-3 rounded-lg border border-gray-200 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          <img src={previewUrl} alt="Chuni hui layout image ka preview" className="max-h-40 max-w-[50%] rounded object-contain" />
          <div className="min-w-0 text-sm text-gray-800">
            <p className="truncate font-semibold">{source.name}</p>
            <p>{dims ? `${dims.w} x ${dims.h} px` : 'Size check ho raha hai…'}{source.pdfPage ? ` · PDF page ${source.pdfPage}` : ''}</p>
            {tooSmall && <p role="alert" className="mt-1 text-red-700">Image bahut chhoti hai. Kam se kam {MIN_LONG_SIDE_PX} px chahiye.</p>}
            {lowRes && <p className="mt-1 text-yellow-800">Image chhoti hai ({SOFT_LONG_SIDE_PX} px se kam). Plot numbers padhne mein galti ho sakti hai.</p>}
          </div>
        </div>
      )}

      <UploadProgress items={items} onRetry={() => { void generate(); }} />
      <p role="alert" className="min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!source || busy || tooSmall || !dims}
          onClick={() => void generate()}
          className="min-h-[44px] flex-1 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-40"
        >
          {busy ? 'Bhej raha hai…' : 'Layout generate karo'}
        </button>
        {busy && (
          <button type="button" onClick={() => abortRef.current?.abort()} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">
            Rok do
          </button>
        )}
      </div>
    </section>
  );
}
