'use client';

// Preview of the layout image before it is uploaded (R3.1-R3.3, R3.6), and the
// image side of two-point georeferencing (R6.1).
//
// Zoom (100-800 %, 100 % = fit) and pan are CSS transforms only, so the pixels
// that get uploaded are never resampled by the preview. Rotate 90 keeps a
// quarter-turn count; on confirm the image is re-encoded ONCE with that
// rotation applied (same MIME as the input), and with 0 turns the original blob
// is passed through untouched. Cancel discards everything.

import { useCallback, useEffect, useRef, useState } from 'react';
import { checkDecodedDims, rotate90 } from '@/lib/layoutTools.mjs';

export interface PreviewMarker { x: number; y: number; label: string; index: number }

const MIN_ZOOM = 100;
const MAX_ZOOM = 800;

/** Re-encode `blob` rotated by `turns` quarter-turns clockwise, same MIME. */
async function rotateBlob(blob: Blob, turns: number): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(blob);
  let w = bmp.width;
  let h = bmp.height;
  if (turns % 4 === 0) { bmp.close(); return { blob, width: w, height: h }; }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not allocate a drawing surface');
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  let px: Uint8ClampedArray = ctx.getImageData(0, 0, w, h).data;
  for (let i = 0; i < turns % 4; i += 1) {
    const r = rotate90(px, w, h);
    px = r.pixels; w = r.width; h = r.height;
  }
  canvas.width = w;
  canvas.height = h;
  ctx.putImageData(new ImageData(px as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  const mime = blob.type || 'image/png';
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, 0.95));
  if (!out) throw new Error('Could not re-encode the rotated image');
  return { blob: out, width: w, height: h };
}

export default function LayoutPreview({
  blob,
  src,
  fileName,
  busy,
  onConfirm,
  onCancel,
  pickMode,
  onPick,
  markers,
  onMarkerMove,
}: {
  /** The picked file (new upload). Exactly one of blob / src is given. */
  blob?: Blob;
  /** A URL of a saved image (reopening control points). */
  src?: string;
  fileName: string;
  busy?: boolean;
  onConfirm?: (result: { blob: Blob; width: number; height: number }) => void;
  onCancel?: () => void;
  /** When set, a click reports the image pixel under it instead of panning (georeferencing). */
  pickMode?: boolean;
  onPick?: (pt: { x: number; y: number }) => void;
  markers?: PreviewMarker[];
  /** Drag a marker to a new image pixel (R6.11). */
  onMarkerMove?: (index: number, pt: { x: number; y: number }) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [turns, setTurns] = useState(0);
  const [working, setWorking] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ id: number; x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const u = blob ? URL.createObjectURL(blob) : (src ?? null);
    setUrl(u);
    setNatural(null);
    setError(null);
    setZoom(MIN_ZOOM);
    setPan({ x: 0, y: 0 });
    setTurns(0);
    return () => { if (blob && u) URL.revokeObjectURL(u); };
  }, [blob, src]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Dimensions shown/used after the quarter-turns.
  const dims = natural ? (turns % 2 ? { w: natural.h, h: natural.w } : natural) : null;
  // Fit scale for the (possibly rotated) image inside the box; 100 % zoom = fit.
  const fit = dims && box.w && box.h ? Math.min(box.w / dims.w, box.h / dims.h) : 1;
  const scale = fit * (zoom / 100);

  const clampPan = useCallback((p: { x: number; y: number }) => {
    if (!dims) return p;
    const limX = Math.max(0, (dims.w * scale - box.w) / 2);
    const limY = Math.max(0, (dims.h * scale - box.h) / 2);
    return { x: Math.min(limX, Math.max(-limX, p.x)), y: Math.min(limY, Math.max(-limY, p.y)) };
  }, [dims, scale, box.w, box.h]);

  const setZoomClamped = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z)));
    setZoom(next);
    if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
  };

  const onLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const dimsCheck = checkDecodedDims(w, h);
    if (!dimsCheck.ok) {
      setError(dimsCheck.reason === 'side'
        ? `This image is larger than ${dimsCheck.limit} px on its longest side. Reduce it and try again.`
        : `This image has more than ${dimsCheck.limit / 1_000_000} megapixels. Reduce it and try again.`);
      return;
    }
    setNatural({ w, h });
  };

  const confirm = async () => {
    if (!onConfirm) return;
    setWorking(true);
    setError(null);
    try {
      if (!blob) throw new Error('Nothing to confirm');
      onConfirm(await rotateBlob(blob, turns));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the image');
    }
    setWorking(false);
  };

  const pointerDown = (e: React.PointerEvent) => {
    dragRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const pointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!pickMode || d.moved) setPan(clampPan({ x: d.px + dx, y: d.py + dy }));
  };
  const pointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || d.moved || !pickMode || !onPick || !natural || !imgRef.current || turns % 4 !== 0) return;
    const r = imgRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * natural.w;
    const y = ((e.clientY - r.top) / r.height) * natural.h;
    if (x >= 0 && y >= 0 && x <= natural.w && y <= natural.h) onPick({ x, y });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={boxRef}
        role="application"
        aria-label={`Preview of ${fileName}. Drag to pan, use the zoom buttons to zoom.`}
        tabIndex={0}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onKeyDown={(e) => {
          if (e.key === '+' || e.key === '=') setZoomClamped(zoom + 50);
          else if (e.key === '-') setZoomClamped(zoom - 50);
          else if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            const s = 40;
            setPan(clampPan({
              x: pan.x + (e.key === 'ArrowLeft' ? s : e.key === 'ArrowRight' ? -s : 0),
              y: pan.y + (e.key === 'ArrowUp' ? s : e.key === 'ArrowDown' ? -s : 0),
            }));
          }
        }}
        className="relative h-72 bg-gray-100 border rounded-lg overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
        style={{ touchAction: 'none', cursor: pickMode ? 'crosshair' : 'grab' }}
      >
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- local blob preview, transformed with CSS only
          <img
            ref={imgRef}
            src={url}
            alt={`Layout plan ${fileName}`}
            draggable={false}
            onLoad={onLoad}
            onError={() => setError('This image could not be opened. Pick another file.')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: natural ? natural.w : undefined,
              height: natural ? natural.h : undefined,
              maxWidth: 'none',
              transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale}) rotate(${turns * 90}deg)`,
              transformOrigin: 'center center',
              userSelect: 'none',
              visibility: natural ? 'visible' : 'hidden',
            }}
          />
        )}
        {natural && markers?.map((m) => {
          // Marker position in box pixels from its image pixel (only valid unrotated).
          const mx = (m.x - natural.w / 2) * scale + pan.x + box.w / 2;
          const my = (m.y - natural.h / 2) * scale + pan.y + box.h / 2;
          // The visible dot is 24 px; the wrapper is the 44x44 touch target.
          return (
            <span
              key={`${m.index}-${m.label}`}
              role="img"
              aria-label={`Control point ${m.label}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center"
              style={{ left: mx, top: my, pointerEvents: onMarkerMove && !pickMode ? 'auto' : 'none', touchAction: 'none', cursor: 'grab' }}
              onPointerDown={(e) => {
                if (!onMarkerMove) return;
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!onMarkerMove || !(e.buttons & 1) || !imgRef.current) return;
                const r = imgRef.current.getBoundingClientRect();
                const x = Math.min(natural.w, Math.max(0, ((e.clientX - r.left) / r.width) * natural.w));
                const y = Math.min(natural.h, Math.max(0, ((e.clientY - r.top) / r.height) * natural.h));
                onMarkerMove(m.index, { x, y });
              }}
            >
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white text-[11px] flex items-center justify-center border-2 border-white">
                {m.label}
              </span>
            </span>
          );
        })}
      </div>

      {natural && (
        <p className="text-gray-600" role="status" aria-live="polite">
          {dims?.w} × {dims?.h} px · zoom {zoom}%
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Zoom out" disabled={zoom <= MIN_ZOOM} onClick={() => setZoomClamped(zoom - 50)} className="min-h-[44px] min-w-[44px] border rounded-lg disabled:opacity-40">−</button>
        <button type="button" aria-label="Zoom in" disabled={zoom >= MAX_ZOOM} onClick={() => setZoomClamped(zoom + 50)} className="min-h-[44px] min-w-[44px] border rounded-lg disabled:opacity-40">+</button>
        {onConfirm && (
          <button type="button" onClick={() => setTurns((t) => (t + 1) % 4)} disabled={busy || working || !natural} className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">
            Rotate 90°
          </button>
        )}
      </div>

      <div role="alert" className="min-h-[1rem]">{error && <p className="text-red-700">{error}</p>}</div>

      {onConfirm && (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancel} disabled={busy || working} className="min-h-[44px] border rounded-lg py-2 disabled:opacity-40">Cancel</button>
          <button type="button" onClick={confirm} disabled={busy || working || !natural || !!error} className="min-h-[44px] bg-orange-600 text-white rounded-lg py-2 disabled:opacity-40">
            {working ? 'Preparing…' : 'Use this image'}
          </button>
        </div>
      )}
    </div>
  );
}
