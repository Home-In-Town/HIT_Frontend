'use client';
// The one input of the editor: add images and/or PDFs, press "Layout generate
// karo". Every image and every chosen PDF page becomes ONE sheet and all sheets
// are generated in one action. Reuses the existing file picker and PDF page
// picker; everything about placing, aligning or drawing is gone.
//
// Previous behaviour: exactly one image or one PDF page per layout. A site with
// several drawings (phase 1, phase 2, ...) needed one layout per drawing, which
// cannot be published together.
//
// A PDF page is rasterised here in the browser (pdf.js) and only the PNG is
// uploaded; the PDF itself is never sent (addendum 10.3). Pages are rasterised
// ONE AT A TIME right before their upload and the blob is dropped afterwards, so
// ten pages never sit in memory together. If a PNG is too heavy for the 25 MB
// upload limit it is re-rendered at 60 % of the pixel cap, up to three times.
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import OverlayFilePicker from '@/components/layout-editor/OverlayFilePicker';
import PdfPagePicker from '@/components/layout-editor/PdfPagePicker';
import { LayoutUploadError, uploadLayoutFile } from '@/lib/api';
import { getPixelCap, openPdf, PdfLayoutError, rasterisePage } from '@/lib/pdfLayout';
import { apiCode, plotmapApi } from '@/lib/plotmapApi';
import { plotmapErrorText, tooManySheetsText } from '@/lib/plotMap.mjs';
import type { GenerateSheetInput } from '@/types/plotmap';

/** Below this the server answers 422 IMAGE_TOO_SMALL; checked here first to save the upload. */
export const MIN_LONG_SIDE_PX = 600;
/** Under this numbers are hard to read; allowed, with a warning (server adds LOW_RESOLUTION). */
export const SOFT_LONG_SIDE_PX = 1500;
/** PNG of a PDF page must fit the 25 MB upload limit with a little room. */
const MAX_PAGE_BYTES = 24 * 1024 * 1024;
const MAX_RASTER_RETRIES = 3;
/** Parallel uploads. Rasterising is serialised separately (one page at a time). */
const UPLOAD_PARALLEL = 2;
/** Used until E5 tells us the real limit (or when the backend is an older one without `limits`). */
export const DEFAULT_MAX_SHEETS = 10;

type Rotation = 0 | 90 | 180 | 270;
type SheetSource =
  | { id: string; kind: 'image'; file: File; name: string }
  | { id: string; kind: 'pdf'; doc: PDFDocumentProxy; page: number; rotation: Rotation; name: string };
type RowState = { status: 'idle' | 'rasterising' | 'uploading' | 'done' | 'failed'; percent: number; imageKey?: string; error?: string };
type Dims = { w: number; h: number };

/** What the page keeps for "Dobara try": the uploaded keys, so the images need not be uploaded again. */
export interface StartedRun { layoutId: string; sheets: GenerateSheetInput[] }

let idSeq = 0;
const nextId = () => `src-${Date.now().toString(36)}-${idSeq++}`;

function Preview({ file, onDims }: { file: File; onDims: (d: Dims | null) => void }) {
  const ref = useRef<HTMLImageElement | null>(null);
  // The <img> gets its blob URL imperatively: no state to set from an effect, and the URL is revoked when
  // the file changes or the row goes away (object URLs hold the whole image in memory until revoked).
  useEffect(() => {
    const u = URL.createObjectURL(file);
    if (ref.current) ref.current.src = u;
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- local blob preview
    <img
      ref={ref}
      alt=""
      className="h-16 w-16 shrink-0 rounded bg-gray-100 object-cover"
      onLoad={(e) => onDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
      onError={() => onDims(null)}
    />
  );
}

export default function PlotmapImportPanel({
  projectId, hasLive, maxSheets = DEFAULT_MAX_SHEETS, onStarted, onConflict,
}: {
  projectId: string;
  /** A published layout exists: this is a regenerate, bookings carry over by plot number (D8a). */
  hasLive: boolean;
  /** `limits.maxSheets` of E5. */
  maxSheets?: number;
  onStarted: (run: StartedRun) => void;
  /** 409 ALREADY_RUNNING: the page should reload and show the running or draft layout. */
  onConflict: () => void;
}) {
  const [sources, setSources] = useState<SheetSource[]>([]);
  const sourcesRef = useRef<SheetSource[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const rowsRef = useRef<Record<string, RowState>>({});
  const [dims, setDims] = useState<Record<string, Dims | null>>({});
  const [pdfCurrent, setPdfCurrent] = useState<{ doc: PDFDocumentProxy; name: string } | null>(null);
  const pdfCurrentRef = useRef<{ doc: PDFDocumentProxy; name: string } | null>(null);
  const pdfQueue = useRef<File[]>([]);
  const opening = useRef(false);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const setRow = (id: string, patch: Partial<RowState>) => {
    const prev: RowState = rowsRef.current[id] ?? { status: 'idle', percent: 0 };
    rowsRef.current = { ...rowsRef.current, [id]: { ...prev, ...patch } };
    setRows(rowsRef.current);
  };
  const commitSources = (next: SheetSource[]) => { sourcesRef.current = next; setSources(next); };

  /** Free slots, read from the ref so several files picked in one tick are counted correctly. */
  const freeSlots = () => Math.max(0, maxSheets - sourcesRef.current.length);

  const addSources = (add: SheetSource[]) => {
    const room = freeSlots();
    if (add.length > room) setError(tooManySheetsText(maxSheets));
    else setError(null);
    if (room > 0) commitSources([...sourcesRef.current, ...add.slice(0, room)]);
  };

  const removeSource = (id: string) => {
    commitSources(sourcesRef.current.filter((s) => s.id !== id));
    const { [id]: _gone, ...rest } = rowsRef.current;
    void _gone;
    rowsRef.current = rest;
    setRows(rest);
    setError(null);
  };

  /** Opens queued PDFs one after another; the page picker shows the current one. */
  const nextPdf = () => {
    if (pdfCurrentRef.current || opening.current || pdfQueue.current.length === 0) return;
    const file = pdfQueue.current.shift() as File;
    opening.current = true;
    file.arrayBuffer()
      .then((buf) => openPdf(buf))
      .then((doc) => {
        const cur = { doc, name: file.name.replace(/\.pdf$/i, '') };
        pdfCurrentRef.current = cur;
        setPdfCurrent(cur);
      })
      .catch((e) => { setError(`${file.name}: ${e instanceof PdfLayoutError ? e.message : 'Ye PDF khul nahi paya.'}`); })
      .finally(() => { opening.current = false; nextPdf(); });
  };

  const closePdf = () => {
    pdfCurrentRef.current = null;
    setPdfCurrent(null);
    setPdfNotice(null);
    nextPdf();
  };

  const onPicked = (file: File, kind: 'image' | 'pdf') => {
    if (kind === 'image') {
      addSources([{ id: nextId(), kind: 'image', file, name: file.name }]);
      return;
    }
    pdfQueue.current.push(file);
    nextPdf();
  };

  const onConfirmPages = (pages: number[], rotation: Rotation) => {
    const cur = pdfCurrentRef.current;
    if (!cur) return;
    addSources(pages.map((page) => ({ id: nextId(), kind: 'pdf' as const, doc: cur.doc, page, rotation, name: `${cur.name || 'layout'}-page-${page}.png` })));
    closePdf();
  };

  // dims[id] === null means the browser could not decode the image; undefined means "still measuring".
  const unreadableIds = sources.filter((s) => s.kind === 'image' && dims[s.id] === null).map((s) => s.id);
  const tooSmallIds = sources.filter((s) => {
    const d = dims[s.id];
    return s.kind === 'image' && !!d && Math.max(d.w, d.h) < MIN_LONG_SIDE_PX;
  }).map((s) => s.id);
  const blocked = tooSmallIds.length > 0 || unreadableIds.length > 0;

  /** Rasterise (PDF) and upload one sheet; resolves true when its image key is stored. */
  const processOne = async (s: SheetSource, ctrl: AbortController, withRasterLock: <T>(fn: () => Promise<T>) => Promise<T>): Promise<boolean> => {
    try {
      let blob: Blob;
      if (s.kind === 'image') {
        blob = s.file;
      } else {
        setRow(s.id, { status: 'rasterising', percent: 0, error: undefined });
        blob = await withRasterLock(async () => {
          let cap = await getPixelCap();
          for (let attempt = 0; attempt <= MAX_RASTER_RETRIES; attempt++) {
            const r = await rasterisePage(s.doc, s.page, s.rotation, attempt === 0 ? undefined : cap);
            if (Math.max(r.width, r.height) < MIN_LONG_SIDE_PX) throw new PdfLayoutError('canvas', `Page ${s.page} bahut chhota hai (kam se kam ${MIN_LONG_SIDE_PX} px chahiye).`);
            if (r.blob.size <= MAX_PAGE_BYTES) return r.blob;
            cap = Math.floor(cap * 0.6);
          }
          throw new PdfLayoutError('canvas', `Page ${s.page} bahut bhaari hai, kam resolution wala PDF ya image dein.`);
        });
      }
      setRow(s.id, { status: 'uploading', percent: 0, error: undefined });
      const up = await uploadLayoutFile(blob, s.name, projectId, 'plotmap-image', (percent) => setRow(s.id, { status: 'uploading', percent }), ctrl.signal);
      setRow(s.id, { status: 'done', percent: 100, imageKey: up.fileKey });
      return true;
    } catch (e) {
      const text = e instanceof LayoutUploadError
        ? (e.code ? plotmapErrorText(e.code, e.message) : e.message)
        : e instanceof PdfLayoutError ? e.message : 'Upload nahi ho paya.';
      setRow(s.id, { status: 'failed', percent: 0, error: text });
      return false;
    }
  };

  const generate = async () => {
    if (busy || sourcesRef.current.length === 0 || blocked) return;
    setBusy(true);
    setError(null);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const order = sourcesRef.current;
    // Sheets already uploaded (an earlier try) are skipped, so "Dobara try" only redoes the failed ones.
    const todo = order.filter((s) => rowsRef.current[s.id]?.status !== 'done');
    let lock: Promise<unknown> = Promise.resolve();
    const withRasterLock = <T,>(fn: () => Promise<T>): Promise<T> => {
      const p = lock.then(fn);
      lock = p.catch(() => undefined);
      return p;
    };
    let cursor = 0;
    let allOk = true;
    const worker = async () => {
      for (;;) {
        const s = todo[cursor++];
        if (!s || ctrl.signal.aborted) return;
        if (!(await processOne(s, ctrl, withRasterLock))) allOk = false;
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_PARALLEL, todo.length) }, () => worker()));
    if (ctrl.signal.aborted) { setBusy(false); return; }
    if (!allOk) {
      setError('Kuch sheets upload nahi ho payi. Neeche us sheet par "Dobara try karo" dabao.');
      setBusy(false);
      return;
    }
    try {
      const sheets: GenerateSheetInput[] = order.map((s) => ({
        imageKey: rowsRef.current[s.id].imageKey as string,
        ...(s.kind === 'pdf' ? { pdfPage: s.page } : {}),
      }));
      const run = await plotmapApi.generate(projectId, sheets);
      onStarted({ layoutId: run.layoutId, sheets });
    } catch (e) {
      const code = apiCode(e);
      setError(plotmapErrorText(code, e instanceof Error ? e.message : undefined));
      if (code === 'ALREADY_RUNNING') onConflict();
    } finally {
      setBusy(false);
    }
  };

  const free = Math.max(0, maxSheets - sources.length);
  const limitReached = free === 0;

  return (
    <section aria-label="Layout import" className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-bold text-gray-900">{hasLive ? 'Layout dobara banao (Regenerate)' : 'Plot layout banao'}</h2>
      {hasLive && (
        <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Naya layout publish karne par booked/sold plots purane layout se plot number ke hisaab se jod diye jayenge. Koi booked plot ka number naye layout mein na mile to publish ruk jayega.
        </p>
      )}
      {pdfCurrent ? (
        <PdfPagePicker
          doc={pdfCurrent.doc}
          busy={false}
          notice={pdfNotice}
          onConfirm={() => undefined}
          onCancel={closePdf}
          multi={{ maxSelect: free, onConfirmPages }}
        />
      ) : (
        <>
          <OverlayFilePicker
            hasImage={sources.length > 0}
            disabled={busy || limitReached}
            onPicked={onPicked}
            multiple
            label={sources.length > 0 ? 'Aur image ya PDF jodo' : 'Image ya PDF chuno (ek se zyada bhi chalega)'}
          />
          <ul className="list-disc pl-5 text-sm text-gray-700">
            <li>Har image ya PDF ka har page ek alag sheet banta hai (jaise Phase 1, Phase 2).</li>
            <li>Seedha scan ya CAD export karo, photo mat khicho.</li>
            <li>Image seedha rakho (rotate nahi), text zoom karke padhne layak ho.</li>
            <li>White background, dark lines. Plot numbers aur area drawing mein likhe hon.</li>
            <li>3000 se 5000 px lambai sabse achhi rehti hai.</li>
          </ul>
          <p className="text-xs text-gray-500">Layout banane ke liye image HomeInTown ke AI se process hoti hai.</p>
        </>
      )}

      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-gray-900" aria-live="polite">Sheets: {sources.length} / {maxSheets}</p>
          {limitReached && <p className="text-sm text-yellow-900">{tooManySheetsText(maxSheets)}</p>}
          <ul className="flex flex-col gap-2" aria-label="Chuni hui sheets">
            {sources.map((s, i) => {
              const row = rows[s.id];
              const d = dims[s.id];
              const long = d ? Math.max(d.w, d.h) : 0;
              const small = tooSmallIds.includes(s.id);
              const low = !!d && !small && long < SOFT_LONG_SIDE_PX;
              return (
                <li key={s.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-2">
                  {s.kind === 'image'
                    ? <Preview file={s.file} onDims={(v) => setDims((cur) => (cur[s.id] === v ? cur : { ...cur, [s.id]: v }))} />
                    : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-gray-100 text-xs text-gray-600" aria-hidden>PDF {s.page}</div>}
                  <div className="min-w-0 flex-1 text-sm text-gray-800">
                    <p className="truncate font-semibold">Sheet {i + 1} · {s.name}</p>
                    <p>
                      {s.kind === 'pdf' ? `PDF page ${s.page}` : (d ? `${d.w} x ${d.h} px` : d === null ? '' : 'Size check ho raha hai…')}
                    </p>
                    {d === null && <p role="alert" className="text-red-700">Ye image padhi nahi ja saki. PNG ya JPG mein dobara save karke dekhein.</p>}
                    {small && <p role="alert" className="text-red-700">Image bahut chhoti hai. Kam se kam {MIN_LONG_SIDE_PX} px chahiye.</p>}
                    {low && <p className="text-yellow-800">Image chhoti hai ({SOFT_LONG_SIDE_PX} px se kam). Plot numbers padhne mein galti ho sakti hai.</p>}
                    {row?.status === 'rasterising' && <p role="status">Page {s.kind === 'pdf' ? s.page : ''} ko image mein badla ja raha hai…</p>}
                    {row?.status === 'uploading' && (
                      <div role="progressbar" aria-label={`Sheet ${i + 1} upload`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={row.percent} className="mt-1 h-2 overflow-hidden rounded bg-gray-200">
                        <div className="h-full bg-orange-500" style={{ width: `${row.percent}%` }} />
                      </div>
                    )}
                    {row?.status === 'done' && <p className="text-green-800">Upload ho gayi</p>}
                    {row?.status === 'failed' && (
                      <p role="alert" className="text-red-700">
                        {row.error}{' '}
                        <button type="button" disabled={busy} onClick={() => void generate()} className="min-h-[44px] font-semibold underline disabled:opacity-40">Dobara try karo</button>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeSource(s.id)}
                    aria-label={`Sheet ${i + 1} hatao`}
                    className="min-h-[44px] shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-semibold text-gray-800 disabled:opacity-40"
                  >
                    Hatao
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p role="alert" className="min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={sources.length === 0 || busy || blocked || !!pdfCurrent}
          onClick={() => void generate()}
          className="min-h-[44px] flex-1 rounded-lg bg-orange-600 px-4 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-40"
        >
          {busy ? 'Bhej raha hai…' : sources.length > 1 ? `${sources.length} sheets ka layout generate karo` : 'Layout generate karo'}
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
