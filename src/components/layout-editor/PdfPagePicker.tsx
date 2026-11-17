'use client';

// PDF page chooser (R2.1, R2.2, R2.5, R2.7, R2.11). Thumbnails render lazily
// (only when a tile scrolls into view) for pages 1-50; a longer PDF also gets a
// page-number input. Page 1 is selected by default and nothing is rasterised
// until the user confirms.

import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderThumbnail, THUMBNAIL_PAGE_LIMIT } from '@/lib/pdfLayout';

function Thumb({ doc, page, selected, onSelect }: {
  doc: PDFDocumentProxy;
  page: number;
  selected: boolean;
  onSelect: (p: number) => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let alive = true;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      renderThumbnail(doc, page)
        .then((u) => { if (alive) setSrc(u); })
        .catch(() => { if (alive) setFailed(true); });
    }, { rootMargin: '120px' });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [doc, page]);

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      aria-label={`Page ${page}`}
      onClick={() => onSelect(page)}
      className={`min-h-[44px] min-w-[44px] border rounded-lg p-1 text-[11px] text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${selected ? 'border-orange-600 ring-2 ring-orange-300' : 'border-gray-200'}`}
    >
      <div className="h-24 flex items-center justify-center bg-gray-100 rounded">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL thumbnail
          <img src={src} alt="" className="max-h-24 max-w-full" />
        ) : (
          <span aria-hidden>{failed ? '!' : '…'}</span>
        )}
      </div>
      Page {page}
    </button>
  );
}

export default function PdfPagePicker({
  doc,
  busy,
  notice,
  onConfirm,
  onCancel,
  multi,
}: {
  doc: PDFDocumentProxy;
  busy: boolean;
  /** Rasterise progress text, or the R2.5 / R2.11 notices. */
  notice: string | null;
  onConfirm: (page: number, extraRotationDeg: 0 | 90 | 180 | 270) => void;
  onCancel: () => void;
  /**
   * Plot-map import: every selected page becomes one sheet. Previous behaviour (the default, used by the
   * overlay tool): exactly one page. All pages start selected, up to `maxSelect` (the free sheet slots).
   */
  multi?: { maxSelect: number; onConfirmPages: (pages: number[], extraRotationDeg: 0 | 90 | 180 | 270) => void };
}) {
  const total = doc.numPages;
  const [page, setPage] = useState(1);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);
  const [pageText, setPageText] = useState('1');
  const cap = multi ? Math.max(0, multi.maxSelect) : 1;
  const [picked, setPicked] = useState<number[]>(() => Array.from({ length: Math.min(total, cap) }, (_, i) => i + 1));
  const shown = Math.min(total, THUMBNAIL_PAGE_LIMIT);

  const selectPage = (p: number) => { setPage(p); setPageText(String(p)); };
  const togglePage = (p: number) => {
    setPicked((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : (cur.length < cap ? [...cur, p].sort((a, b) => a - b) : cur)));
  };
  const typed = Number(pageText);
  const typedValid = Number.isInteger(typed) && typed >= 1 && typed <= total;

  if (multi) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-gray-700">
          Is PDF mein {total} page hain. Har chuna hua page ek sheet banega.
          {total > cap && ` Sirf ${cap} aur sheet jod sakte ho, isliye ${cap} page tak chun sakte ho.`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={busy} onClick={() => setPicked(Array.from({ length: Math.min(total, cap) }, (_, i) => i + 1))} className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">Sab pages</button>
          <button type="button" disabled={busy} onClick={() => setPicked([])} className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">Koi nahi</button>
          <span className="text-gray-600" aria-live="polite">Chune hue: {picked.length} / {cap}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
          {Array.from({ length: shown }, (_, i) => (
            <Thumb key={i + 1} doc={doc} page={i + 1} selected={picked.includes(i + 1)} onSelect={togglePage} />
          ))}
        </div>
        {total > THUMBNAIL_PAGE_LIMIT && (
          <div>
            <label htmlFor="pdf-page-number" className="text-gray-500">Page {THUMBNAIL_PAGE_LIMIT} ke aage ka page number (1-{total})</label>
            <div className="mt-1 flex gap-2">
              <input
                id="pdf-page-number"
                type="number"
                min={1}
                max={total}
                value={pageText}
                onChange={(e) => setPageText(e.target.value)}
                className="border p-2 w-full rounded min-h-[44px]"
              />
              <button type="button" disabled={busy || !typedValid || picked.includes(typed) || picked.length >= cap} onClick={() => togglePage(typed)} className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">Jodo</button>
            </div>
            {!typedValid && <p className="text-red-700">1 se {total} ke beech ka page likho.</p>}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)}
            className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40"
          >
            Pages 90° ghumao
          </button>
          <span className="text-gray-500">Rotation {rotation}° (sab chune hue pages par)</span>
        </div>
        <div role="status" aria-live="polite" className="min-h-[1rem]">
          {notice && <p className="text-gray-700">{notice}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={busy} onClick={onCancel} className="min-h-[44px] border rounded-lg py-2 disabled:opacity-40">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || picked.length === 0}
            onClick={() => multi.onConfirmPages(picked, rotation)}
            className="min-h-[44px] bg-orange-600 text-white rounded-lg py-2 disabled:opacity-40"
          >
            {picked.length} page chune
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-gray-700">This PDF has {total} page{total === 1 ? '' : 's'}. Pick the page with the layout.</p>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto">
        {Array.from({ length: shown }, (_, i) => (
          <Thumb key={i + 1} doc={doc} page={i + 1} selected={page === i + 1} onSelect={selectPage} />
        ))}
      </div>
      {total > THUMBNAIL_PAGE_LIMIT && (
        <div>
          <label htmlFor="pdf-page-number" className="text-gray-500">Page number (1-{total})</label>
          <input
            id="pdf-page-number"
            type="number"
            min={1}
            max={total}
            value={pageText}
            onChange={(e) => {
              setPageText(e.target.value);
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1 && n <= total) setPage(n);
            }}
            className="border p-2 w-full rounded mt-1 min-h-[44px]"
          />
          {!typedValid && <p className="text-red-700">Enter a page between 1 and {total}.</p>}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => setRotation(((rotation + 90) % 360) as 0 | 90 | 180 | 270)}
          className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40"
        >
          Rotate page 90°
        </button>
        <span className="text-gray-500">Rotation {rotation}°</span>
      </div>
      <div role="status" aria-live="polite" className="min-h-[1rem]">
        {notice && <p className="text-gray-700">{notice}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={onCancel} className="min-h-[44px] border rounded-lg py-2 disabled:opacity-40">
          Cancel
        </button>
        <button
          type="button"
          disabled={busy || !typedValid}
          onClick={() => onConfirm(page, rotation)}
          className="min-h-[44px] bg-orange-600 text-white rounded-lg py-2 disabled:opacity-40"
        >
          {busy ? 'Converting…' : `Use page ${page}`}
        </button>
      </div>
    </div>
  );
}
