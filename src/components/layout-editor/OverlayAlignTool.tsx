'use client';

// Overlay align tool for the Layout Editor: put the builder's layout-plan
// image on the satellite map, then drag / scale / rotate / fade it until the
// drawn plots line up, and save it with PUT /projects/:id/layout-overlay.
//
// Before this the only "layout image" was media.layoutImage, an html2canvas
// screenshot of the map itself drawn by a GroundOverlay stretched over the
// boundary bbox. A GroundOverlay cannot rotate, and a scanned plan is almost
// never north-up, so the plan could not be aligned at all. The legacy capture
// stays untouched; this is a separate slot (layoutOverlay, media type 'overlay').
//
// The map layer is an OverlayView sized to the UNROTATED bounds from
// overlayGeometry(); the <img> inside is CSS-rotated about its centre by the
// bearing. That is exactly how the homeintown.ai viewer draws it, so what is
// saved here is what buyers see.

import { useCallback, useId, useRef, useState } from 'react';
import { OverlayView, useGoogleMap } from '@react-google-maps/api';
import { ApiError, mediaApi, saveLayoutOverlay } from '@/lib/api';
import type { LayoutOverlay } from '@/types/project';
import {
  overlayGeometry,
  moveOverlay,
  resizeOverlay,
  nudgeOverlay,
  initialOverlayDraft,
  overlaySavePayload,
  overlayResetRestoreBody,
  normalizeBearing,
  clampOpacity,
  OVERLAY_MIN_M,
  OVERLAY_MAX_M,
} from '@/lib/layoutTools.mjs';
import type { OverlayDraft } from '@/lib/layoutTools.mjs';

type LatLng = { lat: number; lng: number };

/** Saved server value → draft, or null when it cannot be drawn yet. */
export function overlayToDraft(o: LayoutOverlay | null | undefined): OverlayDraft | null {
  if (!o?.image?.url || !o.image.key || !o.center) return null;
  if (!(Number(o.widthM) > 0) || !(Number(o.heightM) > 0)) return null;
  return {
    image: { url: o.image.url, key: o.image.key },
    center: { lat: o.center.lat, lng: o.center.lng },
    widthM: Number(o.widthM),
    heightM: Number(o.heightM),
    rotationDeg: normalizeBearing(Number(o.rotationDeg) || 0),
    opacity: clampOpacity(o.opacity),
  };
}

// ─── Map layer (rendered inside <GoogleMap>) ─────────────────────────────────

type DragState = {
  mode: 'move' | 'resize';
  pointerId: number;
  x: number;
  y: number;
  start: OverlayDraft;
  mPerPx: number;
  mapWasDraggable: boolean;
};

export function OverlayAlignLayer({
  draft,
  editable,
  lockAspect,
  onChange,
}: {
  draft: OverlayDraft;
  editable: boolean;
  lockAspect: boolean;
  onChange: (next: OverlayDraft) => void;
}) {
  const map = useGoogleMap();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const g = overlayGeometry(draft);

  const begin = (e: React.PointerEvent, mode: DragState['mode']) => {
    if (!editable || !boxRef.current) return;
    // Stop the map from panning under the drag. stopPropagation alone is not
    // enough on touch, so dragging is switched off until pointer-up and then
    // restored to whatever it was (Lock To Boundary may have it off already).
    e.stopPropagation();
    e.preventDefault();
    const widthPx = boxRef.current.offsetWidth; // layout width, unaffected by the CSS rotate
    if (!(widthPx > 0)) return;
    const mapWasDraggable = map ? map.get('draggable') !== false : true;
    map?.setOptions({ draggable: false });
    boxRef.current.setPointerCapture(e.pointerId);
    dragRef.current = {
      mode,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      start: draft,
      mPerPx: draft.widthM / widthPx,
      mapWasDraggable,
    };
  };

  const move = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    onChange(d.mode === 'move'
      ? moveOverlay(d.start, dx, dy, d.mPerPx)
      : resizeOverlay(d.start, dx, dy, d.mPerPx, lockAspect));
  };

  const end = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    boxRef.current?.releasePointerCapture?.(e.pointerId);
    map?.setOptions({ draggable: d.mapWasDraggable });
  };

  return (
    <OverlayView
      bounds={g.bounds}
      // Mouse-target pane only while aligning; otherwise the image sits under
      // the plots and lets every click through to them.
      mapPaneName={editable ? OverlayView.OVERLAY_MOUSE_TARGET : OverlayView.OVERLAY_LAYER}
    >
      <div
        ref={boxRef}
        tabIndex={editable ? 0 : -1}
        role={editable ? 'group' : undefined}
        aria-label={editable
          ? 'Layout overlay. Drag to move, drag the corner to scale. Keys: arrows move 1 m (Shift 10 m), plus/minus scale, [ and ] rotate.'
          : undefined}
        aria-hidden={editable ? undefined : true}
        onPointerDown={(e) => begin(e, 'move')}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onKeyDown={(e) => {
          if (!editable) return;
          const next = nudgeOverlay(draft, e.key, e.shiftKey);
          if (next) {
            e.preventDefault();
            e.stopPropagation();
            onChange(next);
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transform: `rotate(${g.bearing}deg)`,
          transformOrigin: '50% 50%',
          pointerEvents: editable ? 'auto' : 'none',
          cursor: editable ? 'move' : undefined,
          outline: editable ? '2px dashed #f97316' : 'none',
          touchAction: editable ? 'none' : undefined,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- R2 image positioned in map pixels; next/image cannot size to an OverlayView */}
        <img
          src={draft.image.url}
          alt={editable ? 'Layout plan overlay' : ''}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            opacity: draft.opacity,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
        {editable && (
          <div
            aria-hidden
            title="Drag to scale"
            onPointerDown={(e) => begin(e, 'resize')}
            style={{
              position: 'absolute',
              right: -8,
              bottom: -8,
              width: 16,
              height: 16,
              borderRadius: 4,
              background: '#f97316',
              border: '2px solid white',
              boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
              cursor: 'nwse-resize',
            }}
          />
        )}
      </div>
    </OverlayView>
  );
}

// ─── Side panel (controls) ───────────────────────────────────────────────────

type Notice = { kind: 'success' | 'error' | 'info'; message: string } | null;

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Is project ka overlay badalne ki permission nahi';
    return err.message;
  }
  return err instanceof Error ? err.message : 'Kuch galat ho gaya';
}

/** naturalHeight / naturalWidth of a picked file, read locally (no network). */
function readAspect(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const a = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : null;
      URL.revokeObjectURL(url);
      resolve(a);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

export function OverlayAlignPanel({
  projectId,
  draft,
  savedDraft,
  editing,
  lockAspect,
  onDraftChange,
  onEditingChange,
  onLockAspectChange,
  onSaved,
  getPlacementHints,
}: {
  projectId: string;
  draft: OverlayDraft | null;
  savedDraft: OverlayDraft | null;
  editing: boolean;
  lockAspect: boolean;
  onDraftChange: (next: OverlayDraft | null) => void;
  onEditingChange: (editing: boolean) => void;
  onLockAspectChange: (v: boolean) => void;
  // Called with the server's copy after save / clear.
  onSaved: (saved: OverlayDraft | null) => void;
  getPlacementHints: () => { boundaryPath: LatLng[] | null; fallbackCenter: LatLng | null };
}) {
  const uid = useId();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<null | 'upload' | 'save' | 'clear' | 'reset'>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(savedDraft);

  const handleFile = useCallback(async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice({ kind: 'error', message: 'Sirf image file (PNG / JPG / WebP) chalegi' });
      return;
    }
    setBusy('upload');
    setNotice(null);
    try {
      const aspect = await readAspect(file);
      // The server also stores this as layoutOverlay.image right away; the
      // placement is only written on Save.
      const image = await mediaApi.uploadAndSave({ file, projectId, type: 'overlay' });
      const hints = getPlacementHints();
      const next = initialOverlayDraft({
        existing: draft ?? savedDraft,
        image,
        boundaryPath: hints.boundaryPath,
        fallbackCenter: hints.fallbackCenter,
        aspect,
      });
      if (!next) {
        setNotice({ kind: 'error', message: 'Pehle boundary draw karo ya project ka location set karo' });
        return;
      }
      onDraftChange(next);
      onEditingChange(true);
      setNotice({ kind: 'info', message: 'Image upload ho gayi. Map pe align karo, phir Save Overlay dabao.' });
    } catch (err) {
      setNotice({ kind: 'error', message: errorText(err) });
    }
    // Not in a `finally`: React Compiler (eslint react-hooks) skips any
    // component that contains try/finally, which would silently switch off
    // the hooks lint for this file.
    setBusy(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [draft, savedDraft, getPlacementHints, onDraftChange, onEditingChange, projectId]);

  const handleSave = async () => {
    const p = overlaySavePayload(draft, projectId);
    if (!p.ok) {
      setNotice({ kind: 'error', message: p.message });
      return;
    }
    setBusy('save');
    setNotice(null);
    try {
      const saved = await saveLayoutOverlay(projectId, p.body);
      const next = overlayToDraft(saved);
      onSaved(next);
      onEditingChange(false);
      setNotice({ kind: 'success', message: 'Overlay save ho gaya' });
    } catch (err) {
      setNotice({ kind: 'error', message: errorText(err) });
    }
    setBusy(null);
  };

  // Reset used to be draft-only (onDraftChange(savedDraft)). After a
  // replacement upload the server already holds the new image (proxy-upload
  // $sets layoutOverlay.image), so that left the server and the public viewers
  // on the unsaved image while the editor looked reverted with Save disabled.
  // Now the saved overlay is PUT back first; the old R2 file is never deleted.
  const handleReset = async () => {
    const restoreBody = overlayResetRestoreBody(draft, savedDraft, projectId);
    if (!restoreBody) {
      onDraftChange(savedDraft);
      onEditingChange(false);
      setNotice(null);
      return;
    }
    setBusy('reset');
    setNotice(null);
    try {
      const saved = await saveLayoutOverlay(projectId, restoreBody);
      onSaved(overlayToDraft(saved));
      onEditingChange(false);
      setNotice({ kind: 'success', message: 'Purani overlay image wapas lag gayi' });
    } catch (err) {
      // Draft stays on the new image so it still matches the server; the
      // user can retry Reset or Save the new placement.
      setNotice({ kind: 'error', message: `Reset nahi hua: ${errorText(err)}` });
    }
    setBusy(null);
  };

  const handleClear = async () => {
    if (!window.confirm('Overlay map se hata dein? (Image file R2 pe rahegi)')) return;
    setBusy('clear');
    setNotice(null);
    try {
      await saveLayoutOverlay(projectId, null);
      onSaved(null);
      onEditingChange(false);
      setNotice({ kind: 'success', message: 'Overlay hata diya' });
    } catch (err) {
      setNotice({ kind: 'error', message: errorText(err) });
    }
    setBusy(null);
  };

  const set = (patch: Partial<OverlayDraft>) => {
    if (draft) onDraftChange({ ...draft, ...patch });
  };
  const setSize = (field: 'widthM' | 'heightM', raw: string) => {
    if (!draft) return;
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    if (lockAspect) {
      const k = v / draft[field];
      onDraftChange({ ...draft, widthM: draft.widthM * k, heightM: draft.heightM * k });
    } else {
      set({ [field]: v });
    }
  };

  const disabled = busy !== null;

  return (
    <div className="flex flex-col gap-3 text-xs">
      {/* Input inside the label so the keyboard focus ring shows on the visible button. */}
      <label
        className={`w-full text-center py-2 rounded-lg font-medium cursor-pointer border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100 focus-within:ring-2 focus-within:ring-orange-400 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {busy === 'upload' ? 'Uploading…' : draft ? 'Replace layout image' : 'Upload layout image'}
      </label>

      {draft && (
        <>
          <button
            type="button"
            aria-pressed={editing}
            onClick={() => onEditingChange(!editing)}
            className={`w-full py-2 rounded-lg font-medium border ${editing ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-200'}`}
          >
            {editing ? 'Aligning on map (click to stop)' : 'Align on map'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor={`${uid}-w`} className="text-gray-500">Width (m)</label>
              <input
                id={`${uid}-w`}
                type="number"
                min={OVERLAY_MIN_M}
                max={OVERLAY_MAX_M}
                step={0.5}
                value={Math.round(draft.widthM * 10) / 10}
                onChange={(e) => setSize('widthM', e.target.value)}
                className="border p-2 w-full rounded mt-1"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-h`} className="text-gray-500">Height (m)</label>
              <input
                id={`${uid}-h`}
                type="number"
                min={OVERLAY_MIN_M}
                max={OVERLAY_MAX_M}
                step={0.5}
                value={Math.round(draft.heightM * 10) / 10}
                onChange={(e) => setSize('heightM', e.target.value)}
                className="border p-2 w-full rounded mt-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-gray-600">
            <input type="checkbox" checked={lockAspect} onChange={(e) => onLockAspectChange(e.target.checked)} />
            Lock aspect ratio
          </label>

          <div>
            <label htmlFor={`${uid}-rot`} className="text-gray-500 flex justify-between">
              <span>Rotation</span>
              <span aria-hidden>{draft.rotationDeg.toFixed(1)}°</span>
            </label>
            <input
              id={`${uid}-rot`}
              type="range"
              min={0}
              max={359.5}
              step={0.5}
              value={draft.rotationDeg}
              aria-valuetext={`${draft.rotationDeg.toFixed(1)} degrees`}
              onChange={(e) => set({ rotationDeg: normalizeBearing(Number(e.target.value)) })}
              className="w-full accent-orange-600"
            />
          </div>

          <div>
            <label htmlFor={`${uid}-op`} className="text-gray-500 flex justify-between">
              <span>Opacity</span>
              <span aria-hidden>{Math.round(draft.opacity * 100)}%</span>
            </label>
            <input
              id={`${uid}-op`}
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.opacity}
              aria-valuetext={`${Math.round(draft.opacity * 100)} percent`}
              onChange={(e) => set({ opacity: clampOpacity(e.target.value) })}
              className="w-full accent-orange-600"
            />
          </div>

          <p className="text-[11px] text-gray-500">
            Map pe image drag karo (move), orange corner drag karo (scale). Keyboard: image select karke
            arrows = 1 m, Shift = 10 m, + / − = scale, [ / ] = rotate.
          </p>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={disabled || !savedDraft}
              onClick={handleClear}
              className="border border-red-200 text-red-700 rounded-lg py-2 disabled:opacity-40"
            >
              {busy === 'clear' ? '…' : 'Remove'}
            </button>
            <button
              type="button"
              disabled={disabled || !dirty}
              onClick={handleReset}
              className="border rounded-lg py-2 disabled:opacity-40"
            >
              {busy === 'reset' ? '…' : 'Reset'}
            </button>
            <button
              type="button"
              disabled={disabled || !dirty}
              onClick={handleSave}
              className="bg-orange-600 text-white rounded-lg py-2 disabled:opacity-40"
            >
              {busy === 'save' ? 'Saving…' : 'Save Overlay'}
            </button>
          </div>
        </>
      )}

      <div role="status" aria-live="polite" className="min-h-[1rem]">
        {notice && (
          <p className={notice.kind === 'error' ? 'text-red-700' : notice.kind === 'success' ? 'text-green-700' : 'text-gray-600'}>
            {notice.message}
          </p>
        )}
      </div>
    </div>
  );
}
