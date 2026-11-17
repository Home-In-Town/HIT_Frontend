'use client';
// Interactive plot map: the drawing as an <image> with one <polygon> per plot,
// all in one SVG whose viewBox is the image size, panned and zoomed by a CSS
// transform on the wrapper (so 600 polygons are not re-rendered per frame).
//
// Status is never colour alone: each plot has a fill colour, a pattern (hatch =
// booked/sold, dots = on hold) and the text status in its aria-label, the sheet
// and the list view. A tap is resolved by hitTest() with a 12 px slop so a small
// plot is still easy to hit on a phone; the polygons themselves are focusable
// for keyboard users, and the list view is the full-keyboard alternative.
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useZoomPan } from '@/lib/useZoomPan';
import {
  countStatuses, hitTest, naturalCompare, NON_PLOT_STYLE, searchAcrossSheets, searchPlots, statusLabel, styleForStatus,
} from '@/lib/plotMap.mjs';
import type { PlotMapImage, PlotMapPlot } from '@/types/plotmap';

type ViewerRole = 'owner_side' | 'broker' | 'public';
type ShapePlot = PlotMapPlot & { flags?: string[] };

const AREA_UNIT: Record<string, string> = { sqm: 'sq m', sqft: 'sq ft', sqyd: 'sq yd' };
export function formatArea(area: number | null | undefined, unit: string | null | undefined, approx = false): string {
  if (typeof area !== 'number' || !(area > 0)) return '';
  const n = Number.isInteger(area) ? String(area) : area.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${approx ? '~' : ''}${n} ${AREA_UNIT[unit ?? 'sqm'] ?? 'sq m'}`;
}

/** Spoken name of a plot, also the aria-label of its polygon. */
export function plotAriaLabel(p: ShapePlot, role: ViewerRole): string {
  if (p.kind !== 'plot') return p.label ? String(p.label) : 'Common area';
  const parts = [`Plot ${p.number ?? '?'}`];
  const area = formatArea(p.area, p.areaUnit, p.areaApprox);
  if (area) parts.push(area);
  parts.push(statusLabel(String(p.status), role === 'owner_side' ? 'owner_side' : 'public'));
  if ((p.flags ?? []).length) parts.push('check karna hai');
  return parts.join(', ');
}

const pointsOf = (p: PlotMapPlot, W: number, H: number) => p.poly.map(([x, y]) => `${(x * W).toFixed(1)},${(y * H).toFixed(1)}`).join(' ');

const Shape = memo(function Shape({
  p, W, H, role, selected, matched, flagged, mine, onActivate,
}: {
  p: ShapePlot; W: number; H: number; role: ViewerRole; selected: boolean; matched: boolean; flagged: boolean; mine: boolean;
  onActivate: (id: string) => void;
}) {
  const isPlot = p.kind === 'plot';
  const st = isPlot ? styleForStatus(p.status) : NON_PLOT_STYLE;
  const fill = isPlot ? (st.pattern === 'hatch' ? 'url(#pm-hatch)' : st.pattern === 'dots' ? 'url(#pm-dots)' : st.fill) : st.fill;
  return (
    <polygon
      data-plot-id={p.id}
      points={pointsOf(p, W, H)}
      fill={fill}
      fillOpacity={isPlot ? (st.pattern === 'none' ? 0.35 : 0.55) : 0.25}
      stroke={selected ? '#f97316' : matched ? '#ea580c' : flagged ? '#b91c1c' : mine ? '#1d4ed8' : st.stroke}
      strokeWidth={selected ? 4 : matched || flagged || mine ? 3 : 1.5}
      strokeDasharray={matched && !selected ? '6 3' : flagged && !selected ? '4 2' : undefined}
      vectorEffect="non-scaling-stroke"
      role={isPlot ? 'button' : undefined}
      tabIndex={isPlot ? 0 : undefined}
      aria-label={isPlot ? plotAriaLabel(p, role) : undefined}
      aria-pressed={isPlot ? selected : undefined}
      aria-hidden={isPlot ? undefined : true}
      className="outline-none focus-visible:stroke-orange-500 focus-visible:[stroke-width:4px]"
      style={{ cursor: isPlot ? 'pointer' : 'default' }}
      onKeyDown={isPlot ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onActivate(p.id); }
      } : undefined}
    />
  );
});

const Labels = memo(function Labels({ plots, W, H, k, showArea }: { plots: ShapePlot[]; W: number; H: number; k: number; showArea: boolean }) {
  // k = screen pixels per SVG unit; font sizes are chosen in screen px.
  const fs = 12 / k;
  return (
    <g pointerEvents="none" aria-hidden="true" fontFamily="system-ui, sans-serif" textAnchor="middle">
      {plots.map((p) => {
        const xs = p.poly.map((q) => q[0]);
        const ys = p.poly.map((q) => q[1]);
        const bw = (Math.max(...xs) - Math.min(...xs)) * W * k;
        const bh = (Math.max(...ys) - Math.min(...ys)) * H * k;
        // Hidden when the plot is too small on screen to carry text (plan 5.5).
        if (bw < 24 || bh < 14) return null;
        const text = p.kind === 'plot' ? (p.number ?? '') : (p.label ?? '');
        if (!text) return null;
        const area = showArea && p.kind === 'plot' && bh > 34 ? formatArea(p.area, p.areaUnit, p.areaApprox) : '';
        const x = p.labelAt[0] * W;
        const y = p.labelAt[1] * H;
        return (
          <text key={p.id} x={x} y={y} fontSize={fs} fontWeight={p.kind === 'plot' ? 700 : 500} fill="#111827"
            stroke="#fff" strokeWidth={fs * 0.25} paintOrder="stroke" dominantBaseline="middle">
            {text}
            {area && <tspan x={x} dy={fs * 1.2} fontSize={fs * 0.85} fontWeight={500}>{area}</tspan>}
          </text>
        );
      })}
    </g>
  );
});

const LEGEND: { status: string; role?: 'owner_side' }[] = [
  { status: 'available' }, { status: 'booked' }, { status: 'sold', role: 'owner_side' }, { status: 'on-hold', role: 'owner_side' },
];

export default function PlotMapViewer({
  image, plots, role = 'public', selectedId = null, onSelect, flaggedIds, mineIds, focusPlotId, heightClass = 'h-[60vh] min-h-[320px]',
  searchAll, currentSheet = 0, sheetNameOf, onSearchPick,
}: {
  image: PlotMapImage;
  plots: ShapePlot[];
  /**
   * Multi-sheet layouts: the plots of EVERY sheet (`plots` is only the visible sheet). Search then
   * looks in all of them and a hit on another sheet is reported through `onSearchPick`, so the page
   * can switch the tab. Previous behaviour: search only saw the drawn sheet, so a plot on sheet 2 was
   * "not found" while sheet 1 was open. Leave unset for a single-sheet layout (nothing changes).
   */
  searchAll?: ShapePlot[];
  currentSheet?: number;
  sheetNameOf?: (idx: number) => string;
  onSearchPick?: (hit: { plotId: string; sheet: number }) => void;
  role?: ViewerRole;
  selectedId?: string | null;
  onSelect: (id: string | null) => void;
  /** Check & fix: draw these plots with a red dashed outline. */
  flaggedIds?: Set<string>;
  /** Broker: plots with the caller's own request. */
  mineIds?: Set<string>;
  /** Centre and zoom on this plot when it changes. */
  focusPlotId?: string | null;
  heightClass?: string;
}) {
  const W = image.w;
  const H = image.h;
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [query, setQuery] = useState('');
  const [hint, setHint] = useState('');
  const byId = useMemo(() => new Map(plots.map((p) => [p.id, p])), [plots]);
  const matches = useMemo(() => searchPlots(plots, query), [plots, query]);
  const matchIds = useMemo(() => new Set(matches.map((m) => m.id)), [matches]);
  const crossHits = useMemo(() => (searchAll ? searchAcrossSheets(searchAll, query) : null), [searchAll, query]);
  const otherSheetHits = useMemo(() => (crossHits ?? []).filter((h) => h.sheet !== currentSheet), [crossHits, currentSheet]);
  const numberOf = useMemo(() => new Map((searchAll ?? []).map((p) => [p.id, p.number])), [searchAll]);
  const counts = useMemo(() => countStatuses(plots), [plots]);
  const plotsOnly = useMemo(() => plots.filter((p) => p.kind === 'plot'), [plots]);
  const imgSize = useMemo(() => ({ w: W, h: H }), [W, H]);

  const activate = (id: string) => {
    const p = byId.get(id);
    if (!p) return;
    if (p.kind !== 'plot') {
      setHint(`${p.label || 'Ye hissa'} · booking ke liye nahi hai`);
      return;
    }
    setHint('');
    onSelect(id);
  };

  const zp = useZoomPan(imgSize, (norm, rendered) => {
    const id = hitTest(plots, norm.x, norm.y, { ...rendered, slopPx: 12 });
    if (id) activate(id);
    else { setHint(''); onSelect(null); }
  });

  const focusOnPlot = (id: string) => {
    const p = byId.get(id);
    if (p) zp.focusOn({ x: p.labelAt[0], y: p.labelAt[1] }, 4);
  };
  const focusRef = useRef(focusOnPlot);
  useEffect(() => { focusRef.current = focusOnPlot; });
  // A different sheet is a different drawing: the old zoom and pan point at nothing. Declared before the
  // focus effect so a jump to a plot on another sheet resets first, then centres on the plot.
  useEffect(() => { zp.reset(); }, [image.url, zp.reset]);
  useEffect(() => { if (focusPlotId) focusRef.current(focusPlotId); }, [focusPlotId, image.url]);

  // Screen px per SVG unit, with the zoom rounded to half steps so labels re-render per step, not per frame.
  const kBucket = Math.max(0.0001, (zp.fit.cw / W) * (Math.round(zp.transform.scale * 2) / 2));
  const labelScale = zp.fit.cw > 0 ? kBucket : 0;

  const pickOtherSheet = (hit: { plotId: string; sheet: number }) => {
    setHint(`Plot ${numberOf.get(hit.plotId) ?? ''} ${sheetNameOf?.(hit.sheet) ?? `Sheet ${hit.sheet + 1}`} par hai`);
    onSearchPick?.(hit);
  };

  const submitSearch = () => {
    // Nothing on the open sheet: jump to the best hit elsewhere. A hit on the open sheet always wins over
    // one on another sheet (the other-sheet hits stay listed under the search box for a manual pick).
    const top = crossHits?.[0];
    if (matches.length === 0 && top && top.sheet !== currentSheet && onSearchPick) { pickOtherSheet(top); return; }
    const first = matches[0];
    if (!first) { setHint(query.trim() ? 'Is number ka plot nahi mila' : ''); return; }
    setHint('');
    onSelect(first.id);
    focusOnPlot(first.id);
  };

  const onStageKey = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const step = 60;
    if (e.key === '+' || e.key === '=') zp.zoomBy(1.4);
    else if (e.key === '-' || e.key === '_') zp.zoomBy(1 / 1.4);
    else if (e.key === '0') zp.reset();
    else if (e.key === 'ArrowLeft') zp.panBy(step, 0);
    else if (e.key === 'ArrowRight') zp.panBy(-step, 0);
    else if (e.key === 'ArrowUp') zp.panBy(0, step);
    else if (e.key === 'ArrowDown') zp.panBy(0, -step);
    else return;
    e.preventDefault();
  };

  const sortedList = useMemo(() => [...plotsOnly].sort((a, b) => naturalCompare(String(a.number ?? ''), String(b.number ?? ''))), [plotsOnly]);
  const btn = 'min-h-[44px] min-w-[44px] px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-800 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500';

  return (
    <section aria-label="Plot map" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submitSearch(); }} role="search">
          <label className="flex flex-col text-xs text-gray-600">
            Plot number dhoondho
            <input
              type="search"
              inputMode="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHint(''); }}
              placeholder="jaise 12 ya 12A"
              className="min-h-[44px] w-40 rounded-lg border border-gray-300 px-3 text-sm text-gray-900"
            />
          </label>
          <button type="submit" className={btn}>Dhoondho</button>
        </form>
        <div className="flex items-center gap-1" role="group" aria-label="Map ya list">
          <button type="button" className={`${btn} ${mode === 'map' ? 'bg-orange-50 border-orange-400' : ''}`} aria-pressed={mode === 'map'} onClick={() => setMode('map')}>Map</button>
          <button type="button" className={`${btn} ${mode === 'list' ? 'bg-orange-50 border-orange-400' : ''}`} aria-pressed={mode === 'list'} onClick={() => setMode('list')}>List</button>
        </div>
        {mode === 'map' && (
          <div className="flex items-center gap-1" role="group" aria-label="Zoom">
            <button type="button" className={btn} aria-label="Zoom in" onClick={() => zp.zoomBy(1.4)}>+</button>
            <button type="button" className={btn} aria-label="Zoom out" onClick={() => zp.zoomBy(1 / 1.4)}>-</button>
            <button type="button" className={btn} aria-label="Zoom reset" onClick={zp.reset}>Reset</button>
          </div>
        )}
      </div>

      {/* Legend with live counts: swatch + text + number, never colour alone. */}
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-800" aria-label="Plot status legend">
        {LEGEND.filter((l) => !l.role || role === 'owner_side').map((l) => {
          const st = styleForStatus(l.status);
          const n = l.status === 'available' ? counts.available : l.status === 'booked' ? counts.booked : l.status === 'sold' ? counts.sold : counts.onHold;
          const text = role === 'owner_side' ? statusLabel(l.status, 'owner_side') : statusLabel(l.status);
          return (
            <li key={l.status} className="flex items-center gap-1.5">
              <svg width="18" height="18" aria-hidden="true">
                <rect x="1" y="1" width="16" height="16" rx="3" fill={st.fill} fillOpacity={0.45} stroke={st.stroke} strokeWidth="1.5" />
                {st.pattern === 'hatch' && <path d="M1 17 L17 1 M1 11 L11 1 M7 17 L17 7" stroke={st.stroke} strokeWidth="1.5" />}
                {st.pattern === 'dots' && <><circle cx="6" cy="6" r="1.5" fill={st.stroke} /><circle cx="12" cy="12" r="1.5" fill={st.stroke} /></>}
              </svg>
              <span>{text} {n}</span>
            </li>
          );
        })}
        {role !== 'owner_side' && <li className="text-gray-500">Kul plots {counts.plots}</li>}
      </ul>

      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm text-gray-700">
        {hint || (query && matches.length > 0 ? `${matches.length} plot mile` : '')}
      </p>
      {onSearchPick && otherSheetHits.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Dusri sheet par mile plots">
          {otherSheetHits.slice(0, 8).map((h) => (
            <li key={h.plotId}>
              <button type="button" className={btn} onClick={() => pickOtherSheet(h)}>
                Plot {numberOf.get(h.plotId) ?? '?'} · {sheetNameOf?.(h.sheet) ?? `Sheet ${h.sheet + 1}`}
              </button>
            </li>
          ))}
        </ul>
      )}

      {mode === 'map' ? (
        <div
          ref={zp.ref}
          tabIndex={0}
          role="group"
          aria-label="Plot map. Plus aur minus se zoom, arrow keys se hilayein. Har plot par Tab karke Enter dabayein, ya List dekhein."
          onKeyDown={onStageKey}
          {...zp.handlers}
          className={`relative ${heightClass} w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 touch-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500`}
        >
          <div
            style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${zp.transform.tx}px, ${zp.transform.ty}px) scale(${zp.transform.scale})`, willChange: 'transform' }}
          >
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" role="presentation" style={{ display: 'block' }}>
              <defs>
                <pattern id="pm-hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width="14" height="14" fill="#dc2626" fillOpacity="0.25" />
                  <line x1="0" y1="0" x2="0" y2="14" stroke="#7f1d1d" strokeWidth="5" />
                </pattern>
                <pattern id="pm-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                  <rect width="16" height="16" fill="#d97706" fillOpacity="0.25" />
                  <circle cx="8" cy="8" r="3.5" fill="#92400e" />
                </pattern>
              </defs>
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG <image>, not an <img> */}
              <image href={image.url} x="0" y="0" width={W} height={H} preserveAspectRatio="none" />
              <g>
                {plots.map((p) => (
                  <Shape
                    key={p.id}
                    p={p}
                    W={W}
                    H={H}
                    role={role}
                    selected={p.id === selectedId}
                    matched={matchIds.has(p.id)}
                    flagged={!!flaggedIds?.has(p.id)}
                    mine={!!mineIds?.has(p.id)}
                    onActivate={activate}
                  />
                ))}
              </g>
              {labelScale > 0 && <Labels plots={plots} W={W} H={H} k={labelScale} showArea={zp.transform.scale >= 2.5} />}
            </svg>
          </div>
        </div>
      ) : (
        <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white" aria-label="Plot list">
          {(query ? matches : sortedList).map((p) => {
            const label = statusLabel(String(p.status), role === 'owner_side' ? 'owner_side' : 'public');
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  aria-pressed={p.id === selectedId}
                  className={`flex min-h-[44px] w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${p.id === selectedId ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                >
                  <span className="font-semibold text-gray-900">Plot {p.number ?? '?'}</span>
                  <span className="text-gray-600">{formatArea(p.area, p.areaUnit, p.areaApprox)}</span>
                  <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-gray-800" style={{ borderColor: styleForStatus(p.status).stroke }}>{label}</span>
                </button>
              </li>
            );
          })}
          {(query ? matches : sortedList).length === 0 && <li className="px-3 py-4 text-sm text-gray-600">Koi plot nahi mila</li>}
        </ul>
      )}
    </section>
  );
}
