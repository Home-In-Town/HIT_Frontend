'use client';

// Two-point georeferencing panel (R6). The state machine is in georefState.mjs
// (tested in node); this component renders it. Image picks happen in
// LayoutPreview (pixel coordinates), map picks arrive as `mapClick` events from
// ProjectMap while `mapPickMode` is on.

import { useEffect, useRef, useState } from 'react';
import LayoutPreview from './LayoutPreview';
import {
  initialGeorefState, georefTransition, toControlPoints, alignOffsets, pointErrorM,
  metresPerPixelText, MIRROR_NOTICE,
} from './georefState.mjs';
import type { GeorefState } from './georefState.mjs';

type Geo = { lat: number; lng: number };
export type ControlPoint = { u: number; v: number; lat: number; lng: number; role: 'align' | 'check' };
type Transform = { center: Geo; widthM: number; heightM: number; rotationDeg: number };

const STEP_TEXT: Record<string, string> = {
  'pick-image-1': 'Step 1: tap a recognisable point on the layout image.',
  'pick-map-1': 'Step 2: tap the same place on the map.',
  'pick-image-2': 'Step 3: tap a second point on the image, far from the first.',
  'pick-map-2': 'Step 4: tap the same second place on the map.',
  solved: 'Placed. Fine-tune with the controls above, or add a check point.',
  'pick-image-3': 'Check point: tap a third point on the image.',
  'pick-map-3': 'Check point: tap the same place on the map.',
};

export default function GeorefPanel({
  imageSrc,
  imageBlob,
  imageSize,
  transform,
  initialControlPoints,
  mapClick,
  markerMove,
  onMapPickModeChange,
  onTransform,
  onControlPointsChange,
}: {
  imageSrc?: string;
  imageBlob?: Blob;
  imageSize: { width: number; height: number };
  /** The transform currently in the draft; kept when a solve is refused. */
  transform: Transform;
  initialControlPoints?: ControlPoint[] | null;
  /** Each map click while picking; `n` makes repeated clicks on one spot distinct. */
  mapClick: (Geo & { n: number }) | null;
  /** A map marker was dragged to a new place (R6.11). */
  markerMove?: (Geo & { index: number; n: number }) | null;
  onMapPickModeChange: (on: boolean) => void;
  onTransform: (t: Transform) => void;
  onControlPointsChange: (cps: ControlPoint[]) => void;
}) {
  const [state, setState] = useState<GeorefState>(() => initialGeorefState({ controlPoints: initialControlPoints }));
  const lastClick = useRef<number>(mapClick?.n ?? -1);

  const apply = (a: Parameters<typeof georefTransition>[1]) => {
    const r = georefTransition(state, a, imageSize);
    setState(r.state);
    if (r.transform) onTransform(r.transform);
    onControlPointsChange(toControlPoints(r.state));
  };

  // The map side of a pick: ProjectMap reports a click, we apply it once.
  useEffect(() => {
    if (!mapClick || mapClick.n === lastClick.current) return;
    lastClick.current = mapClick.n;
    if (state.step.startsWith('pick-map-')) {
      const r = georefTransition(state, { type: 'PICK_MAP', geo: { lat: mapClick.lat, lng: mapClick.lng } }, imageSize);
      setState(r.state);
      if (r.transform) onTransform(r.transform);
      onControlPointsChange(toControlPoints(r.state));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a new click only
  }, [mapClick]);

  const lastMove = useRef<number>(markerMove?.n ?? -1);
  useEffect(() => {
    if (!markerMove || markerMove.n === lastMove.current) return;
    lastMove.current = markerMove.n;
    const r = georefTransition(state, { type: 'MOVE_MAP', index: markerMove.index, geo: { lat: markerMove.lat, lng: markerMove.lng } }, imageSize);
    setState(r.state);
    if (r.transform) onTransform(r.transform);
    onControlPointsChange(toControlPoints(r.state));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to a new drag only
  }, [markerMove]);

  // Map clicks are picks only while a map step is active.
  useEffect(() => {
    onMapPickModeChange(state.step.startsWith('pick-map-'));
    return () => onMapPickModeChange(false);
  }, [state.step, onMapPickModeChange]);

  const picking = state.step.startsWith('pick-image-');
  const markers = state.points.flatMap((p, i) => (p.image ? [{ x: p.image.x, y: p.image.y, label: i < 2 ? String(i + 1) : '✓', index: i }] : []));
  const offsets = state.step === 'solved' ? alignOffsets(transform, imageSize, state) : [];
  const checkErr = state.points[2].image && state.points[2].geo ? pointErrorM(transform, imageSize, state.points[2]) : null;

  return (
    <section aria-label="Two-point alignment" className="flex flex-col gap-2 border rounded-lg p-2">
      <h3 className="font-semibold">Align with two points</h3>
      <p role="status" aria-live="polite" className="text-gray-700">{STEP_TEXT[state.step]}</p>
      {state.refusal && <p role="alert" className="text-red-700">{state.refusal.message} The current placement was kept.</p>}

      <LayoutPreview
        blob={imageBlob}
        src={imageSrc}
        fileName="layout"
        pickMode={picking}
        onPick={(pt) => apply({ type: 'PICK_IMAGE', pt })}
        markers={markers}
        onMarkerMove={(index, pt) => apply({ type: 'MOVE_IMAGE', index, pt })}
      />

      {state.step === 'solved' && (
        <div className="text-gray-700">
          <p>Scale: {metresPerPixelText(transform, imageSize)} m per pixel</p>
          {offsets.map((o, i) => (o === null ? null : <p key={i}>Point {i + 1} offset: {o.toFixed(1)} m</p>))}
          {checkErr !== null && <p>Check point error: {checkErr.toFixed(1)} m</p>}
          <p className="text-[11px] text-gray-500">{MIRROR_NOTICE}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {state.step === 'solved' && !state.points[2].image && (
          <button type="button" onClick={() => apply({ type: 'ADD_CHECK' })} className="min-h-[44px] border rounded-lg px-3">Add check point</button>
        )}
        <button type="button" onClick={() => apply({ type: 'RESTART' })} className="min-h-[44px] border rounded-lg px-3">Start again</button>
      </div>
    </section>
  );
}
