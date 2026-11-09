'use client';

// Overlay tool for the Layout Editor: pick a layout plan (image or PDF), preview
// it, upload it with two reduced copies, place it on the satellite map, align it
// (drag / corner handles / rotate handle / pinch-twist / keys / two-point), and
// save it with PUT /projects/:id/layout-overlay.
//
// This file stays the ONLY overlay component and is split internally into
// OverlayAlignLayer (on the map), OverlayAlignPanel (the flow), AlignControls
// and SaveBar. The rules about when things may happen live in
// overlayEditorState.mjs; the maths in layoutTools.mjs.
//
// Before: the tool took an image file, uploaded it with a plain fetch (the
// server wrote layoutOverlay.image at once), offered only a bottom-right scale
// handle and keyboard nudges, and Reset PUT the old image back. Now an upload
// writes nothing until Save (R7.8), so Reset is local.

import { useCallback, useEffect, useId, useReducer, useRef, useState } from 'react';
import { MarkerF, OverlayView, useGoogleMap } from '@react-google-maps/api';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { ApiError, layoutConflictCode, saveLayoutOverlayVersioned } from '@/lib/api';
import type { LayoutOverlay } from '@/types/project';
import {
  overlayGeometry, moveOverlay, resizeFromCorner, rotateByHandle, pinchTwist, pointerAngleDeg,
  nudgeOverlay, firstPlacement, overlaySavePayloadV2, normalizeBearing, clampOpacity, clampDraft,
  parseRotationInput, isNullIsland, outsideIndia, IMAGE_MAX_BYTES, OVERLAY_MIN_M, OVERLAY_MAX_M,
} from '@/lib/layoutTools.mjs';
import type { OverlayDraft } from '@/lib/layoutTools.mjs';
import { openPdf, rasterisePage, PdfLayoutError } from '@/lib/pdfLayout';
import { getSourcePdfUrl } from '@/lib/api';
import OverlayFilePicker from './OverlayFilePicker';
import PdfPagePicker from './PdfPagePicker';
import LayoutPreview from './LayoutPreview';
import UploadProgress from './UploadProgress';
import GeorefPanel from './GeorefPanel';
import type { ControlPoint } from './GeorefPanel';
import { useOverlayUploads } from './useOverlayUploads';
import { overlayEditorReducer, initialEditorState, canSave, isDirty, SAVE_TIMEOUT_MS } from './overlayEditorState.mjs';

type LatLng = { lat: number; lng: number };
export type EditorAccess = 'edit' | 'status-only' | 'read-only';

/** Saved server value → draft, or null when it cannot be drawn yet. */
export function overlayToDraft(o: LayoutOverlay | null | undefined): OverlayDraft | null {
  if (!o?.image?.url || !o.image.key || !o.center) return null;
  if (!(Number(o.widthM) > 0) || !(Number(o.heightM) > 0)) return null;
  const sp = o.sourcePdf as ({ key?: string; page: number; extraRotationDeg: number } | null | undefined);
  return {
    image: { url: o.image.url, key: o.image.key },
    center: { lat: o.center.lat, lng: o.center.lng },
    widthM: Number(o.widthM),
    heightM: Number(o.heightM),
    rotationDeg: normalizeBearing(Number(o.rotationDeg) || 0),
    opacity: clampOpacity(o.opacity),
    ...(o.preview?.key ? { preview: { key: o.preview.key, url: o.preview.url } } : {}),
    ...(o.detail?.key ? { detail: { key: o.detail.key, url: o.detail.url } } : {}),
    ...(o.imageSize ? { imageSize: o.imageSize } : {}),
    ...(o.controlPoints?.length ? { controlPoints: o.controlPoints } : {}),
    ...(sp?.key ? { sourcePdf: { key: sp.key, page: sp.page, extraRotationDeg: sp.extraRotationDeg } } : {}),
  };
}

// ─── Map layer (rendered inside <GoogleMap>) ─────────────────────────────────

type Gesture =
  | { kind: 'move'; pointerId: number; x: number; y: number; start: OverlayDraft; mPerPx: number }
  | { kind: 'corner'; pointerId: number; index: number; x: number; y: number; start: OverlayDraft; mPerPx: number }
  | { kind: 'rotate'; pointerId: number; centre: { x: number; y: number }; startAngle: number; start: OverlayDraft }
  | { kind: 'pinch'; ids: [number, number]; startPair: [{ x: number; y: number }, { x: number; y: number }]; start: OverlayDraft };

// Visible handle dot is 16 px; its hit area is 44x44 (R4.13).
const HIT = 44;
const CORNER_POS = [
  { left: 0, top: 0, cursor: 'nwse-resize' },
  { left: '100%', top: 0, cursor: 'nesw-resize' },
  { left: '100%', top: '100%', cursor: 'nwse-resize' },
  { left: 0, top: '100%', cursor: 'nesw-resize' },
] as const;
const CORNER_NAMES = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

export function OverlayAlignLayer({
  draft, editable, lockAspect, locked = false, controlPoints, onControlPointMove, onChange,
}: {
  draft: OverlayDraft;
  editable: boolean;
  lockAspect: boolean;
  /** Lock (R4.8): handles hidden, map gestures restored, keys ignored. */
  locked?: boolean;
  controlPoints?: ControlPoint[];
  onControlPointMove?: (index: number, geo: LatLng) => void;
  onChange: (next: OverlayDraft) => void;
}) {
  const map = useGoogleMap();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const mapWasDraggable = useRef(true);
  const raf = useRef<number | null>(null);
  const pending = useRef<OverlayDraft | null>(null);
  const g = overlayGeometry(draft);
  const active = editable && !locked;

  // One redraw per animation frame: pointer events only record the latest
  // draft, so a 120 Hz pointer cannot queue more React renders than frames.
  const push = (next: OverlayDraft) => {
    pending.current = next;
    if (raf.current !== null) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = null;
      if (pending.current) onChange(pending.current);
      pending.current = null;
    });
  };
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);

  const freezeMap = () => {
    if (gesture.current) return;
    mapWasDraggable.current = map ? map.get('draggable') !== false : true;
    // stopPropagation is not enough on touch; dragging is off until pointer-up.
    map?.setOptions({ draggable: false });
  };
  const releaseMap = () => map?.setOptions({ draggable: mapWasDraggable.current });

  const widthPx = () => boxRef.current?.offsetWidth ?? 0;

  const down = (e: React.PointerEvent, kind: 'move' | 'corner' | 'rotate', index = 0) => {
    if (!active || !boxRef.current) return;
    e.stopPropagation();
    e.preventDefault();
    const wpx = widthPx();
    if (!(wpx > 0)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    boxRef.current.setPointerCapture(e.pointerId);
    // A second finger that lands on the overlay starts pinch-twist (R4.5).
    if (gesture.current && pointers.current.size === 2) {
      const ids = [...pointers.current.keys()] as [number, number];
      gesture.current = {
        kind: 'pinch', ids, start: draft,
        startPair: [pointers.current.get(ids[0])!, pointers.current.get(ids[1])!],
      };
      return;
    }
    freezeMap();
    const mPerPx = draft.widthM / wpx;
    if (kind === 'rotate') {
      const r = boxRef.current.getBoundingClientRect();
      const centre = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      gesture.current = { kind, pointerId: e.pointerId, centre, startAngle: pointerAngleDeg(centre, { x: e.clientX, y: e.clientY }), start: draft };
    } else if (kind === 'corner') {
      gesture.current = { kind, pointerId: e.pointerId, index, x: e.clientX, y: e.clientY, start: draft, mPerPx };
    } else {
      gesture.current = { kind, pointerId: e.pointerId, x: e.clientX, y: e.clientY, start: draft, mPerPx };
    }
  };

  const move = (e: React.PointerEvent) => {
    const gs = gesture.current;
    if (!gs) return;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.stopPropagation();
    if (gs.kind === 'pinch') {
      const a = pointers.current.get(gs.ids[0]);
      const b = pointers.current.get(gs.ids[1]);
      if (a && b) push(pinchTwist(gs.start, gs.startPair, [a, b]));
      return;
    }
    if (gs.pointerId !== e.pointerId) return;
    if (gs.kind === 'move') push(moveOverlay(gs.start, e.clientX - gs.x, e.clientY - gs.y, gs.mPerPx));
    else if (gs.kind === 'corner') push(resizeFromCorner(gs.start, gs.index, e.clientX - gs.x, e.clientY - gs.y, gs.mPerPx, lockAspect));
    else push(rotateByHandle(gs.start, gs.startAngle, pointerAngleDeg(gs.centre, { x: e.clientX, y: e.clientY })));
  };

  const up = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const gs = gesture.current;
    if (!gs) return;
    const ends = gs.kind === 'pinch' ? gs.ids.includes(e.pointerId) : gs.pointerId === e.pointerId;
    if (!ends) return;
    gesture.current = null;
    pointers.current.clear();
    boxRef.current?.releasePointerCapture?.(e.pointerId);
    releaseMap();
  };

  return (
    <>
      <OverlayView
        bounds={g.bounds}
        // Mouse-target pane only while aligning; otherwise the image sits under
        // the plots and lets every click through to them.
        mapPaneName={active ? OverlayView.OVERLAY_MOUSE_TARGET : OverlayView.OVERLAY_LAYER}
      >
        <div
          ref={boxRef}
          tabIndex={active ? 0 : -1}
          role={active ? 'group' : undefined}
          aria-label={active
            ? 'Layout overlay. Drag to move, drag a corner to scale, drag the top handle to rotate. Keys: arrows move 1 m (Shift 10 m), plus and minus scale 1 percent, [ and ] rotate 0.1 degrees, { and } rotate 1 degree.'
            : undefined}
          aria-hidden={active ? undefined : true}
          onPointerDown={(e) => down(e, 'move')}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={(e) => {
            if (!active) return;
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
            pointerEvents: active ? 'auto' : 'none',
            cursor: active ? 'move' : undefined,
            outline: active ? '2px dashed #f97316' : 'none',
            touchAction: active ? 'none' : undefined,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- R2 image positioned in map pixels; next/image cannot size to an OverlayView */}
          <img
            src={draft.image.url}
            alt={active ? 'Layout plan overlay' : ''}
            draggable={false}
            style={{ width: '100%', height: '100%', display: 'block', opacity: draft.opacity, userSelect: 'none', pointerEvents: 'none' }}
          />
          {active && CORNER_POS.map((pos, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Scale from the ${CORNER_NAMES[i]} corner`}
              onPointerDown={(e) => down(e, 'corner', i)}
              onKeyDown={(e) => {
                // Keyboard: + / - on a focused handle scales like the body.
                const next = nudgeOverlay(draft, e.key, e.shiftKey);
                if (next && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '_')) { e.preventDefault(); e.stopPropagation(); onChange(next); }
              }}
              style={{
                position: 'absolute', left: pos.left, top: pos.top, width: HIT, height: HIT,
                transform: 'translate(-50%, -50%)', background: 'transparent', border: 0, padding: 0,
                cursor: pos.cursor, touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ width: 16, height: 16, borderRadius: 4, background: '#f97316', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
            </button>
          ))}
          {active && (
            <button
              type="button"
              aria-label="Rotate overlay"
              onPointerDown={(e) => down(e, 'rotate')}
              onKeyDown={(e) => {
                const next = nudgeOverlay(draft, e.key, e.shiftKey);
                if (next && ['[', ']', '{', '}'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); onChange(next); }
              }}
              style={{
                position: 'absolute', left: '50%', top: -36, width: HIT, height: HIT,
                transform: 'translate(-50%, -50%)', background: 'transparent', border: 0, padding: 0,
                cursor: 'grab', touchAction: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <span style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', border: '2px solid #f97316', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
            </button>
          )}
        </div>
      </OverlayView>
      {controlPoints?.map((cp, i) => (
        <MarkerF
          key={`${i}-${cp.role}`}
          position={{ lat: cp.lat, lng: cp.lng }}
          label={{ text: cp.role === 'check' ? '✓' : String(i + 1), color: '#fff', fontWeight: '600' }}
          draggable={!!onControlPointMove && active}
          title={`Control point ${cp.role === 'check' ? 'check' : i + 1}`}
          onDragEnd={(ev) => { if (ev.latLng) onControlPointMove?.(i, { lat: ev.latLng.lat(), lng: ev.latLng.lng() }); }}
        />
      ))}
    </>
  );
}

// ─── Align controls ──────────────────────────────────────────────────────────

function AlignControls({
  draft, lockAspect, locked, disabled, onLockAspectChange, onLockedChange, onDraftChange,
}: {
  draft: OverlayDraft;
  lockAspect: boolean;
  locked: boolean;
  disabled: boolean;
  onLockAspectChange: (v: boolean) => void;
  onLockedChange: (v: boolean) => void;
  onDraftChange: (next: OverlayDraft) => void;
}) {
  const uid = useId();
  const [rotText, setRotText] = useState<string | null>(null);
  const off = disabled || locked;

  const setSize = (field: 'widthM' | 'heightM', raw: string) => {
    const v = Number(raw);
    if (!Number.isFinite(v) || v <= 0) return;
    if (lockAspect) {
      const k = v / draft[field];
      onDraftChange(clampDraft({ ...draft, widthM: draft.widthM * k, heightM: draft.heightM * k }, true));
    } else {
      onDraftChange(clampDraft({ ...draft, [field]: v }, false));
    }
  };

  const commitRotation = () => {
    if (rotText === null) return;
    const r = parseRotationInput(rotText);
    // A non-numeric entry is rejected and the previous value comes back (R4.12).
    if (r.ok) onDraftChange({ ...draft, rotationDeg: r.value });
    setRotText(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-gray-700 min-h-[44px]">
        <input type="checkbox" checked={locked} onChange={(e) => onLockedChange(e.target.checked)} disabled={disabled} className="w-5 h-5" />
        Lock overlay (map gestures pan and zoom the map)
      </label>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`${uid}-w`} className="text-gray-500">Width (m)</label>
          <input id={`${uid}-w`} type="number" min={OVERLAY_MIN_M} max={OVERLAY_MAX_M} step={0.5} disabled={off}
            value={Math.round(draft.widthM * 10) / 10} onChange={(e) => setSize('widthM', e.target.value)}
            className="border p-2 w-full rounded mt-1 min-h-[44px]" />
        </div>
        <div>
          <label htmlFor={`${uid}-h`} className="text-gray-500">Height (m)</label>
          <input id={`${uid}-h`} type="number" min={OVERLAY_MIN_M} max={OVERLAY_MAX_M} step={0.5} disabled={off}
            value={Math.round(draft.heightM * 10) / 10} onChange={(e) => setSize('heightM', e.target.value)}
            className="border p-2 w-full rounded mt-1 min-h-[44px]" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-gray-700 min-h-[44px]">
        <input type="checkbox" checked={lockAspect} onChange={(e) => onLockAspectChange(e.target.checked)} disabled={off} className="w-5 h-5" />
        Lock aspect ratio
      </label>

      <div>
        <label htmlFor={`${uid}-rot`} className="text-gray-500">Rotation (degrees)</label>
        <input id={`${uid}-rot`} type="range" min={0} max={359.9} step={0.1} disabled={off}
          value={draft.rotationDeg} aria-valuetext={`${draft.rotationDeg.toFixed(1)} degrees`}
          onChange={(e) => onDraftChange({ ...draft, rotationDeg: normalizeBearing(Number(e.target.value)) })}
          className="w-full accent-orange-600 min-h-[44px]" />
        <input aria-label="Rotation in degrees" type="text" inputMode="decimal" disabled={off}
          value={rotText ?? draft.rotationDeg.toFixed(1)}
          onChange={(e) => setRotText(e.target.value)} onBlur={commitRotation}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRotation(); if (e.key === 'Escape') setRotText(null); }}
          className="border p-2 w-28 rounded min-h-[44px]" />
      </div>

      <div>
        <label htmlFor={`${uid}-op`} className="text-gray-500 flex justify-between">
          <span>Opacity</span><span aria-hidden>{Math.round(draft.opacity * 100)}%</span>
        </label>
        <input id={`${uid}-op`} type="range" min={0} max={1} step={0.05} disabled={disabled}
          value={draft.opacity} aria-valuetext={`${Math.round(draft.opacity * 100)} percent`}
          onChange={(e) => onDraftChange({ ...draft, opacity: clampOpacity(e.target.value) })}
          className="w-full accent-orange-600 min-h-[44px]" />
      </div>
    </div>
  );
}

// ─── Save bar ────────────────────────────────────────────────────────────────

function SaveBar({
  saving, canSaveNow, canReset, canRemove, confirmingRemove, conflict, notice,
  onSave, onReset, onRemoveRequest, onRemoveCancel, onRemoveConfirm, onReload,
}: {
  saving: boolean;
  canSaveNow: boolean;
  canReset: boolean;
  canRemove: boolean;
  confirmingRemove: boolean;
  conflict: string | null;
  notice: { kind: string; message: string } | null;
  onSave: () => void;
  onReset: () => void;
  onRemoveRequest: () => void;
  onRemoveCancel: () => void;
  onRemoveConfirm: () => void;
  onReload: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <button type="button" disabled={!canRemove || saving} onClick={onRemoveRequest}
          className="min-h-[44px] border border-red-200 text-red-700 rounded-lg py-2 disabled:opacity-40">Remove</button>
        <button type="button" disabled={!canReset || saving} onClick={onReset}
          className="min-h-[44px] border rounded-lg py-2 disabled:opacity-40">Reset</button>
        <button type="button" disabled={!canSaveNow} onClick={onSave}
          className="min-h-[44px] bg-orange-600 text-white rounded-lg py-2 disabled:opacity-40">{saving ? 'Saving…' : 'Save Overlay'}</button>
      </div>

      {confirmingRemove && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="remove-title" className="border border-red-200 bg-red-50 rounded-lg p-3">
          <p id="remove-title" className="font-medium text-red-900">Remove the overlay from the map?</p>
          <p className="text-red-800 text-[11px]">Plots stay as they are. The uploaded files are deleted after saving.</p>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button type="button" autoFocus onClick={onRemoveCancel} className="min-h-[44px] border rounded-lg bg-white">Cancel</button>
            <button type="button" onClick={onRemoveConfirm} className="min-h-[44px] rounded-lg bg-red-700 text-white">Remove</button>
          </div>
        </div>
      )}

      <div role="status" aria-live="polite" className="min-h-[1rem]">
        {notice && <p className={notice.kind === 'error' ? 'text-red-700' : notice.kind === 'success' ? 'text-green-700' : 'text-gray-600'}>{notice.message}</p>}
        {conflict === 'LAYOUT_STALE' && (
          <button type="button" onClick={onReload} className="min-h-[44px] border rounded-lg px-3 mt-1">Reload layout</button>
        )}
        {conflict === 'LAYOUT_CONFLICT' && (
          <button type="button" onClick={onSave} className="min-h-[44px] border rounded-lg px-3 mt-1">Try saving again</button>
        )}
      </div>
    </div>
  );
}

// ─── Panel (the flow) ────────────────────────────────────────────────────────

type Flow = 'idle' | 'pdf' | 'preview' | 'uploading';

const pdfBase = (name: string) => name.replace(/\.pdf$/i, '');

export function OverlayAlignPanel({
  projectId, draft, savedDraft, editing, lockAspect, locked, access, layoutVersion,
  onDraftChange, onEditingChange, onLockAspectChange, onLockedChange, onSaved, onLayoutVersion,
  onReload, onAccessLost, onDirtyChange, onControlPointsChange, getPlacementHints,
  mapClick, markerMove, onMapPickModeChange,
}: {
  projectId: string;
  draft: OverlayDraft | null;
  savedDraft: OverlayDraft | null;
  editing: boolean;
  lockAspect: boolean;
  locked: boolean;
  access: EditorAccess;
  /** undefined = unknown (older backend): saves go out without a token. null = legacy project. */
  layoutVersion: string | null | undefined;
  onDraftChange: (next: OverlayDraft | null) => void;
  onEditingChange: (editing: boolean) => void;
  onLockAspectChange: (v: boolean) => void;
  onLockedChange: (v: boolean) => void;
  onSaved: (saved: OverlayDraft | null) => void;
  onLayoutVersion: (v: string | null) => void;
  onReload: () => void;
  onAccessLost: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onControlPointsChange: (cps: ControlPoint[]) => void;
  getPlacementHints: () => { boundaryPath: LatLng[] | null; fallbackCenter: LatLng | null; mapCenter?: LatLng | null };
  mapClick: (LatLng & { n: number }) | null;
  markerMove?: (LatLng & { index: number; n: number }) | null;
  onMapPickModeChange: (on: boolean) => void;
}) {
  const [state, dispatch] = useReducer(overlayEditorReducer, undefined, () => initialEditorState({ saved: savedDraft, access }));
  const uploads = useOverlayUploads(projectId);
  const [flow, setFlow] = useState<Flow>('idle');
  const [source, setSource] = useState<{ blob: Blob; name: string; pdf: { file: File; page: number; extraRotationDeg: 0 | 90 | 180 | 270 } | null } | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);
  const [rasterBusy, setRasterBusy] = useState(false);
  const [georef, setGeoref] = useState(false);
  const [cps, setCps] = useState<ControlPoint[]>(savedDraft?.controlPoints ?? []);
  const appliedUpload = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The page owns the draft/saved copies (the map draws them); the reducer owns
  // everything about WHEN things may happen. Combine for the rules.
  const view = { ...state, draft, saved: savedDraft, access, controlPoints: cps, pending: uploads.pending };
  const dirty = isDirty(view) || (flow === 'uploading' && uploads.items.length > 0);
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { dispatch({ type: 'SET_ACCESS', access }); }, [access]);

  const setControlPoints = useCallback((next: ControlPoint[]) => {
    setCps(next);
    onControlPointsChange(next);
  }, [onControlPointsChange]);

  const notify = (kind: 'success' | 'error' | 'info', message: string) => dispatch({ type: 'NOTICE', notice: { kind, message } });

  // ── pick ──
  const onPicked = async (file: File, kind: 'image' | 'pdf') => {
    dispatch({ type: 'NOTICE', notice: null });
    uploads.reset();
    appliedUpload.current = false;
    if (kind === 'image') {
      setSource({ blob: file, name: file.name, pdf: null });
      setFlow('preview');
      return;
    }
    try {
      const doc = await openPdf(await file.arrayBuffer());
      setPdfDoc(doc);
      setPdfFile(file);
      setPdfNotice(null);
      setFlow('pdf');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'This PDF could not be opened.');
    }
  };

  const onConfirmPage = async (page: number, extraRotationDeg: 0 | 90 | 180 | 270) => {
    if (!pdfDoc || !pdfFile) return;
    setRasterBusy(true);
    setPdfNotice('Converting the page to an image…');
    try {
      const r = await rasterisePage(pdfDoc, page, extraRotationDeg);
      if (r.blob.size > IMAGE_MAX_BYTES) {
        setPdfNotice(`This page becomes a ${(r.blob.size / 1048576).toFixed(1)} MB image, over the ${Math.round(IMAGE_MAX_BYTES / 1048576)} MB limit. Pick another page or a simpler PDF.`);
        setRasterBusy(false);
        return;
      }
      setPdfNotice(r.reduced ? 'This page was converted at a reduced size (under 4096 px on the long side), so small text may look soft.' : null);
      setSource({ blob: r.blob, name: `${pdfBase(pdfFile.name)}-page-${page}.png`, pdf: { file: pdfFile, page, extraRotationDeg } });
      setFlow('preview');
    } catch (err) {
      setPdfNotice(err instanceof PdfLayoutError ? err.message : 'This page could not be converted.');
    }
    setRasterBusy(false);
  };

  // "Choose a different page" for a saved PDF (R2.14, R2.16).
  const reopenSourcePdf = async () => {
    dispatch({ type: 'NOTICE', notice: null });
    try {
      const { url } = await getSourcePdfUrl(projectId);
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch');
      const buf = await res.arrayBuffer();
      const file = new File([buf], 'source.pdf', { type: 'application/pdf' });
      setPdfDoc(await openPdf(buf));
      setPdfFile(file);
      setPdfNotice(null);
      setFlow('pdf');
    } catch {
      notify('error', 'The saved PDF could not be loaded. Your overlay is unchanged. You can upload the PDF again.');
    }
  };

  const onConfirmPreview = (r: { blob: Blob; width: number; height: number }) => {
    if (!source) return;
    appliedUpload.current = false;
    setFlow('uploading');
    void uploads.start({
      image: r.blob,
      imageName: source.name,
      imageSize: { width: r.width, height: r.height },
      pdf: source.pdf ?? undefined,
    });
  };

  // All uploads done: place the image (First_Placement) and move on to aligning.
  useEffect(() => {
    if (flow !== 'uploading' || !uploads.allDone || appliedUpload.current) return;
    const p = uploads.pending;
    if (!p.image || !p.preview || !p.detail || !p.imageSize) return;
    appliedUpload.current = true;
    const hints = getPlacementHints();
    const url = p.image.url ?? '';
    const placed = firstPlacement({
      existing: draft ?? savedDraft,
      image: { url, key: p.image.key },
      boundaryPath: hints.boundaryPath,
      fallbackCenter: hints.fallbackCenter,
      mapCenter: hints.mapCenter ?? null,
      aspect: p.imageSize.height / p.imageSize.width,
    });
    if (!placed.draft) {
      notify('error', 'Draw the boundary or set the project location first, or pan the map to your site.');
      appliedUpload.current = false;
      return;
    }
    // The new picture has new pixels, so points picked on the old one no longer apply.
    setCps([]);
    onControlPointsChange([]);
    const next: OverlayDraft = {
      ...placed.draft,
      preview: { key: p.preview.key, url: p.preview.url },
      detail: { key: p.detail.key, url: p.detail.url },
      imageSize: p.imageSize,
      controlPoints: null,
      sourcePdf: p.sourcePdf ? { key: p.sourcePdf.key, page: p.sourcePdf.page, extraRotationDeg: p.sourcePdf.extraRotationDeg } : null,
    };
    onDraftChange(next);
    onEditingChange(true);
    setFlow('idle');
    setSource(null);
    setGeoref(false);
    const warn = outsideIndia(next.center) ? ' This position is outside India. You can still save it.' : '';
    dispatch({ type: 'UPLOADED', pending: p, notice: null });
    dispatch({ type: 'NOTICE', notice: { kind: 'info', message: `${placed.hint ? placed.hint + ' ' : 'Image uploaded. '}Align it on the map, then Save Overlay.${warn}` } });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per finished upload batch
  }, [flow, uploads.allDone, uploads.pending]);

  // ── save / reset / remove ──
  const startSaveTimer = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => dispatch({ type: 'SAVE_TIMEOUT' }), SAVE_TIMEOUT_MS);
  };
  const clearSaveTimer = () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  useEffect(() => clearSaveTimer, []);

  const failSave = (err: unknown) => {
    clearSaveTimer();
    const status = err instanceof ApiError ? err.status : 0;
    const code = layoutConflictCode(err);
    dispatch({ type: 'SAVE_FAIL', status, code, message: err instanceof Error ? err.message : undefined });
    if (status === 401 || status === 403) onAccessLost();
  };

  const handleSave = async () => {
    if (!draft || !canSave(view, { uploading: uploads.uploading })) return;
    const p = overlaySavePayloadV2({ ...draft, controlPoints: cps }, projectId);
    if (!p.ok) { notify('error', p.message); return; }
    if (isNullIsland(draft.center)) { notify('error', 'The overlay is at 0, 0. Move it to your site first.'); return; }
    dispatch({ type: 'SAVE_START' });
    startSaveTimer();
    try {
      const r = await saveLayoutOverlayVersioned(projectId, p.body as never, layoutVersion);
      clearSaveTimer();
      const next = overlayToDraft(r.layoutOverlay);
      dispatch({ type: 'SAVE_OK', saved: next, layoutVersion: r.layoutVersion, message: 'Overlay saved' });
      onLayoutVersion(r.layoutVersion);
      onSaved(next);
      setCps(next?.controlPoints ?? []);
      uploads.reset();
      onEditingChange(false);
    } catch (err) {
      failSave(err);
    }
  };

  // Local only (R7.4): no request.
  const handleReset = () => {
    uploads.reset();
    setFlow('idle');
    setSource(null);
    setGeoref(false);
    setCps(savedDraft?.controlPoints ?? []);
    onControlPointsChange(savedDraft?.controlPoints ?? []);
    onDraftChange(savedDraft);
    onEditingChange(false);
    dispatch({ type: 'RESET' });
  };

  const handleRemove = async () => {
    dispatch({ type: 'SAVE_START' });
    startSaveTimer();
    try {
      const r = await saveLayoutOverlayVersioned(projectId, null, layoutVersion);
      clearSaveTimer();
      dispatch({ type: 'REMOVE_OK', layoutVersion: r.layoutVersion });
      onLayoutVersion(r.layoutVersion);
      onSaved(null);
      setCps([]);
      onControlPointsChange([]);
      onEditingChange(false);
    } catch (err) {
      failSave(err);
    }
  };

  // ── render ──
  const readOnly = access !== 'edit';
  const busy = state.saving || uploads.uploading || rasterBusy;
  const hasImage = !!(draft ?? savedDraft);
  const imageSize = draft?.imageSize ?? null;

  if (readOnly) {
    return (
      <div className="text-xs text-gray-600" role="note">
        {access === 'status-only'
          ? 'You can change plot status. Only the project team can edit the overlay.'
          : 'View only. You do not have permission to edit the overlay.'}
        {state.notice && <p className="text-red-700 mt-1">{state.notice.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 text-xs">
      {flow === 'idle' && (
        <>
          <OverlayFilePicker hasImage={hasImage} disabled={busy} onPicked={onPicked} />
          {savedDraft?.sourcePdf && (
            <button type="button" onClick={reopenSourcePdf} disabled={busy} className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">
              Choose a different PDF page
            </button>
          )}
        </>
      )}

      {flow === 'pdf' && pdfDoc && (
        <PdfPagePicker doc={pdfDoc} busy={rasterBusy} notice={pdfNotice} onConfirm={onConfirmPage}
          onCancel={() => { setFlow('idle'); setPdfDoc(null); setPdfNotice(null); }} />
      )}

      {flow === 'preview' && source && (
        <LayoutPreview blob={source.blob} fileName={source.name} onConfirm={onConfirmPreview}
          onCancel={() => { setSource(null); setFlow(pdfDoc && source.pdf ? 'pdf' : 'idle'); }} />
      )}

      {flow === 'uploading' && (
        <div className="flex flex-col gap-2">
          {uploads.preparing && <p role="status">Preparing smaller copies…</p>}
          {uploads.prepError && <p role="alert" className="text-red-700">{uploads.prepError}</p>}
          <UploadProgress items={uploads.items} onRetry={() => void uploads.retry()} />
          <button type="button" onClick={() => { uploads.cancel(); uploads.reset(); setFlow('preview'); }}
            className="min-h-[44px] border rounded-lg disabled:opacity-40">Back to preview</button>
        </div>
      )}

      {flow === 'idle' && draft && (
        <>
          <button type="button" aria-pressed={editing} onClick={() => onEditingChange(!editing)} disabled={busy}
            className={`min-h-[44px] w-full rounded-lg font-medium border ${editing ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-200'}`}>
            {editing ? 'Aligning on map (click to stop)' : 'Align on map'}
          </button>

          <AlignControls draft={draft} lockAspect={lockAspect} locked={locked} disabled={busy}
            onLockAspectChange={onLockAspectChange} onLockedChange={onLockedChange} onDraftChange={(d) => onDraftChange(d)} />

          {imageSize && (
            <>
              <button type="button" aria-pressed={georef} onClick={() => setGeoref((v) => !v)} disabled={busy || locked}
                className="min-h-[44px] border rounded-lg px-3 disabled:opacity-40">
                {georef ? 'Hide two-point alignment' : 'Align with two points'}
              </button>
              {georef && !locked && (
                <GeorefPanel
                  key={draft.image.key}
                  imageSrc={draft.image.url}
                  imageSize={imageSize}
                  transform={{ center: draft.center, widthM: draft.widthM, heightM: draft.heightM, rotationDeg: draft.rotationDeg }}
                  initialControlPoints={cps}
                  mapClick={mapClick}
                  markerMove={markerMove}
                  onMapPickModeChange={onMapPickModeChange}
                  onTransform={(t) => onDraftChange({ ...draft, ...t })}
                  onControlPointsChange={setControlPoints}
                />
              )}
            </>
          )}

          <p className="text-[11px] text-gray-500">
            Drag the image to move, the orange corners to scale, the round handle to rotate. Two fingers pinch and twist.
          </p>
        </>
      )}

      {flow === 'idle' && (draft || savedDraft) && (
        <SaveBar
          saving={state.saving}
          canSaveNow={canSave(view, { uploading: uploads.uploading })}
          canReset={dirty}
          canRemove={!!savedDraft}
          confirmingRemove={state.confirmingRemove}
          conflict={state.conflict}
          notice={state.notice}
          onSave={handleSave}
          onReset={handleReset}
          onRemoveRequest={() => dispatch({ type: 'REMOVE_REQUEST' })}
          onRemoveCancel={() => dispatch({ type: 'REMOVE_CANCEL' })}
          onRemoveConfirm={handleRemove}
          onReload={onReload}
        />
      )}
      {(flow !== 'idle' || !(draft || savedDraft)) && (
        <div role="status" aria-live="polite" className="min-h-[1rem]">
          {state.notice && <p className={state.notice.kind === 'error' ? 'text-red-700' : 'text-gray-600'}>{state.notice.message}</p>}
        </div>
      )}
    </div>
  );
}
