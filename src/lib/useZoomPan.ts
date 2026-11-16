'use client';
// Pointer pan, pinch and wheel zoom for the plot-map stage. Own hook instead of
// react-zoom-pan-pinch: no new dependency (a new package means an npm install
// with an unknown lockfile state, addendum 13.2). The maths is pure and tested
// in plotMap.mjs (clampTransform, zoomAround, screenToNorm, centerOn).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { centerOn, clampTransform, fitRect, screenToNorm, zoomAround } from '@/lib/plotMap.mjs';

export interface Transform { scale: number; tx: number; ty: number }
const IDENTITY: Transform = { scale: 1, tx: 0, ty: 0 };
/** A press that moves less than this is a tap, not a drag. */
const TAP_SLOP_PX = 6;

export function useZoomPan(img: { w: number; h: number }, onTap?: (norm: { x: number; y: number }, rendered: { widthPx: number; heightPx: number }) => void) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState({ w: 0, h: 0 });
  const [t, setT] = useState<Transform>(IDENTITY);
  const tRef = useRef(t);
  useEffect(() => { tRef.current = t; }, [t]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const press = useRef<{ id: number; x: number; y: number; moved: boolean; start: Transform } | null>(null);
  const pinch = useRef<{ dist: number; start: Transform; mid: { x: number; y: number } } | null>(null);

  const fit = useMemo(() => fitRect(view, img), [view, img]);
  const fitRef = useRef(fit);
  useEffect(() => { fitRef.current = fit; }, [fit]);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setView({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A resize can leave the old transform outside the new bounds.
  useEffect(() => { setT((cur) => clampTransform(cur, view, fit)); }, [view, fit]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = ref.current?.getBoundingClientRect();
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) };
  };

  const zoomBy = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    const v = viewRef.current;
    const a = anchor ?? { x: v.w / 2, y: v.h / 2 };
    setT((cur) => zoomAround(cur, cur.scale * factor, a, v, fitRef.current));
  }, []);
  const reset = useCallback(() => setT(IDENTITY), []);
  const focusOn = useCallback((point: { x: number; y: number }, scale = 4) => {
    setT(centerOn(point, scale, viewRef.current, fitRef.current));
  }, []);
  const panBy = useCallback((dx: number, dy: number) => {
    setT((cur) => clampTransform({ ...cur, tx: cur.tx + dx, ty: cur.ty + dy }, viewRef.current, fitRef.current));
  }, []);

  // Wheel needs { passive: false } to preventDefault, which React's onWheel cannot set.
  // Plain wheel keeps scrolling the page; Ctrl/Cmd+wheel (and a trackpad pinch,
  // which browsers report as Ctrl+wheel) zooms the map.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    try { ref.current?.setPointerCapture(e.pointerId); } catch { /* capture is best effort */ }
    if (pointers.current.size === 1) {
      press.current = { id: e.pointerId, x: p.x, y: p.y, moved: false, start: tRef.current };
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, start: tRef.current, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      if (press.current) press.current.moved = true; // a second finger cancels the tap
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const base = pinch.current;
      const zoomed = zoomAround(base.start, base.start.scale * (dist / base.dist), base.mid, viewRef.current, fitRef.current);
      setT(clampTransform({ ...zoomed, tx: zoomed.tx + (mid.x - base.mid.x), ty: zoomed.ty + (mid.y - base.mid.y) }, viewRef.current, fitRef.current));
      return;
    }
    const pr = press.current;
    if (!pr || pr.id !== e.pointerId) return;
    const dx = p.x - pr.x;
    const dy = p.y - pr.y;
    if (!pr.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return;
    pr.moved = true;
    setT(clampTransform({ ...pr.start, tx: pr.start.tx + dx, ty: pr.start.ty + dy }, viewRef.current, fitRef.current));
  };

  const end = (e: React.PointerEvent, cancelled: boolean) => {
    const p = pointers.current.get(e.pointerId);
    pointers.current.delete(e.pointerId);
    try { ref.current?.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    if (pointers.current.size < 2) pinch.current = null;
    const pr = press.current;
    if (pr && pr.id === e.pointerId) {
      press.current = null;
      if (!cancelled && !pr.moved && p && onTap) {
        onTap(screenToNorm(tRef.current, fitRef.current, p), {
          widthPx: fitRef.current.cw * tRef.current.scale,
          heightPx: fitRef.current.ch * tRef.current.scale,
        });
      }
    }
  };

  return {
    ref, transform: t, fit, view,
    zoomBy, reset, focusOn, panBy,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (e: React.PointerEvent) => end(e, false),
      onPointerCancel: (e: React.PointerEvent) => end(e, true),
    },
  };
}
