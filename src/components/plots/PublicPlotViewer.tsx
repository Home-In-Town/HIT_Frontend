'use client';

// homeintown.in Public_Plot_Page viewer (design 3.2, R9). Ported from the
// homeintown.ai plot viewer (read only, D16) WITHOUT its login, session or
// status editing (D11): this page is read-only and makes no authenticated
// request. The overlay maths is the shared transform in layoutTools.mjs, used
// through PublicOverlayLayer.
//
// variant 'full'    fills the viewport under a small header.
// variant 'compact' is a fixed-height block with cooperative gestures and a
//                   link to the full page; both draw from the same layout.
//
// Everything the visitor changes (map type, opacity, selected plot, fullscreen)
// is session-only state (R9.13).
//
// Phase 2 (R19.3–19.21): status-coloured clickable polygons, detail panel
// (area/price/unit/CTA/WhatsApp), legend counts recomputed after socket updates,
// searchPlots replacing ad-hoc includes, live status via /public-layout socket
// with 30s polling fallback on disconnect. socket.io-client is a dynamic import
// inside useEffect only — never bundled into layout-editor or card chunks.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, Polygon, Polyline, useJsApiLoader } from '@react-google-maps/api';
import Link from 'next/link';
import { MAP_LIBRARIES } from '@/lib/mapLibraries';
import { PLOT_STATUS_COLORS, PLOT_STATUS_LABELS, normalizePlotStatus } from '@/lib/layoutTools.mjs';
import {
  boundsForLayout,
  centroid,
  fetchPublicLayout,
  formatPanelLines,
  searchPlots,
} from '@/lib/plotViewer.mjs';
import type { PublicLayout, LayoutPlot } from '@/types/plots';
import { createPublicOverlayLayer } from './PublicOverlayLayer';
import type { OverlayLayer } from './PublicOverlayLayer';

type Variant = 'full' | 'compact';
type Load =
  | { kind: 'ok'; layout: PublicLayout }
  | { kind: 'loading' }
  | { kind: 'notfound' }
  | { kind: 'error' };

// 44x44 px target, visible focus outline: shared by every control.
const btn = 'min-h-[44px] min-w-[44px] px-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-40';
const btnOn = 'bg-orange-700 text-white border-orange-700';

export default function PublicPlotViewer({
  slug,
  layout: initial,
  variant = 'full',
}: {
  slug: string;
  /** Server-fetched layout. Omit to have the viewer fetch it (compact embeds). */
  layout?: PublicLayout | null;
  variant?: Variant;
}) {
  const [load, setLoad] = useState<Load>(() => (initial ? { kind: 'ok', layout: initial } : initial === null ? { kind: 'notfound' } : { kind: 'loading' }));

  const toLoad = (r: Awaited<ReturnType<typeof fetchPublicLayout>>): Load =>
    r.kind === 'ok' ? { kind: 'ok', layout: r.layout as PublicLayout } : r.kind === 'notfound' ? { kind: 'notfound' } : { kind: 'error' };

  // Retry button: show the spinner, then the result.
  const refetch = useCallback(async () => {
    setLoad({ kind: 'loading' });
    setLoad(toLoad(await fetchPublicLayout(slug)));
  }, [slug]);

  // First load when no layout was passed in (the state already starts as 'loading').
  useEffect(() => {
    if (initial !== undefined) return;
    let alive = true;
    void fetchPublicLayout(slug).then((r) => { if (alive) setLoad(toLoad(r)); });
    return () => { alive = false; };
  }, [initial, slug]);

  const wrap = variant === 'full' ? 'relative h-[100dvh] w-full' : 'relative h-[360px] w-full rounded-xl overflow-hidden';

  if (load.kind === 'loading') {
    return <div className={`${wrap} flex items-center justify-center bg-gray-50`} role="status" aria-live="polite">Loading plot layout…</div>;
  }
  if (load.kind === 'notfound' || (load.kind === 'ok' && !load.layout.overlay)) {
    return (
      <main className={`${wrap} flex flex-col items-center justify-center gap-2 bg-gray-50 p-6 text-center`}>
        <h1 className="text-xl font-bold text-gray-900">Layout not available</h1>
        <p className="max-w-sm text-sm text-gray-700">This project has no plot layout to show yet, or the link is not right.</p>
        <Link href="/" className={`${btn} inline-flex items-center`}>Go to HomeInTown</Link>
      </main>
    );
  }
  if (load.kind === 'error') {
    return (
      <main className={`${wrap} flex flex-col items-center justify-center gap-2 bg-gray-50 p-6 text-center`}>
        <h1 className="text-xl font-bold text-gray-900">The layout could not be loaded</h1>
        <p className="max-w-sm text-sm text-gray-700">Check your internet connection and try again.</p>
        <button type="button" onClick={() => void refetch()} className={`${btn} ${btnOn}`}>Retry</button>
      </main>
    );
  }
  return <ViewerMap layout={load.layout} variant={variant} wrap={wrap} slug={slug} />;
}

// ── Recompute legend counts from live plots state ─────────────────────────
function computeCounts(plots: LayoutPlot[]) {
  const c = { available: 0, booked: 0, sold: 0, onHold: 0, total: 0 };
  for (const p of plots) {
    c.total++;
    const s = normalizePlotStatus(p.status);
    if (s === 'available') c.available++;
    else if (s === 'booked') c.booked++;
    else if (s === 'sold') c.sold++;
    else if (s === 'on-hold') c.onHold++;
  }
  return c;
}

function ViewerMap({ layout, variant, wrap, slug }: { layout: PublicLayout; variant: Variant; wrap: string; slug: string }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: MAP_LIBRARIES,
  });
  const overlay = layout.overlay!;
  const boxRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const layerRef = useRef<OverlayLayer | null>(null);
  const [mapType, setMapType] = useState<'satellite' | 'roadmap'>('satellite');
  const [opacity, setOpacity] = useState(overlay.opacity);

  // Phase 2: plots in state so socket updates propagate (R19.10, R19.21).
  // Initialised from server data; socket events only change individual statuses.
  const [plots, setPlots] = useState<LayoutPlot[]>(layout.plots);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageGone, setImageGone] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [query, setQuery] = useState('');
  const [mapZoom, setMapZoom] = useState(18);

  // Recompute counts from live plots state (not layout.counts which is stale)
  const counts = useMemo(() => computeCounts(plots), [plots]);

  const selected = useMemo(() => plots.find((p) => p.id === selectedId) ?? null, [plots, selectedId]);
  const panelLines = useMemo(
    () => selected ? formatPanelLines(selected, layout) : null,
    [selected, layout],
  );

  // Phase 2: use searchPlots (normalised prefix match, R19.12) instead of ad-hoc includes.
  // WHY: the old .includes() was case-sensitive and matched anywhere in the string;
  // searchPlots normalises both query and plotNumber and matches from the start,
  // consistent with the mobile platform (cross-repo seam §3.1).
  const matches = useMemo(() => {
    return searchPlots(plots, query).slice(0, 8) as LayoutPlot[];
  }, [plots, query]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    const b = boundsForLayout(layout);
    if (b) map.fitBounds(b, 32); // fitted to the 4 corners (R9.4)
    const layer = createPublicOverlayLayer(google, overlay);
    layer.onUnavailable = setImageGone;
    layer.setMap(map);
    layerRef.current = layer;
  }, [layout, overlay]);

  useEffect(() => () => { layerRef.current?.setMap(null); layerRef.current = null; }, []);
  useEffect(() => { layerRef.current?.setOpacity(opacity); }, [opacity]);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === boxRef.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // Phase 2: live status via /public-layout socket with polling fallback (R19.21).
  // WHY dynamic import: socket.io-client is ~90 KB; loading it only on mount keeps
  // the layout-editor and card chunks clean (verified by Select-String in task 33.7).
  // WHY no connected-refresh: user has not agreed to it. Only disconnect→polling.
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sock: any;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (pollInterval) return; // already running
      pollInterval = setInterval(async () => {
        try {
          const r = await fetchPublicLayout(slug);
          if (r.kind === 'ok') setPlots(r.layout.plots as LayoutPlot[]);
        } catch {
          // transient network error — keep polling
        }
      }, 30000);
    }

    (async () => {
      try {
        // Dynamic import keeps socket.io-client out of SSR and other page chunks.
        const { io } = await import('socket.io-client');
        const socketUrl =
          process.env.NEXT_PUBLIC_SOCKET_URL ??
          new URL(process.env.NEXT_PUBLIC_API_URL!).origin;

        // /public-layout namespace: no auth, join by slug, receives 'plot_status' events.
        const pubSock = io(`${socketUrl}/public-layout`, {
          path: '/socket.io',
          transports: ['websocket', 'polling'],
          withCredentials: false,
        });

        pubSock.on('connect', () => {
          pubSock.emit('join', { slug }, (ack: { ok: boolean } | undefined) => {
            // ok: false or no ack → fall back to polling silently (R19.21)
            if (!ack || !ack.ok) startPolling();
          });
        });

        // 'plot_status' event from UnitInventoryService.js:550 (confirmed socket event name).
        // WHY this exact shape: { changes: [{ id, status }] } — verified in backend source.
        pubSock.on('plot_status', (data: { changes: Array<{ id: string; status: string }> }) => {
          setPlots((prev) =>
            prev.map((p) => {
              const c = data.changes.find((ch) => ch.id === p.id);
              return c ? { ...p, status: c.status as LayoutPlot['status'] } : p;
            }),
          );
        });

        pubSock.on('disconnect', () => { startPolling(); });
        pubSock.on('connect_error', () => { startPolling(); });

        sock = pubSock;
      } catch {
        // socket.io-client import failed or socketUrl construction failed — fall back to polling
        startPolling();
      }
    })();

    return () => {
      sock?.disconnect();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [slug]);

  const toggleFullscreen = () => {
    const el = boxRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const pick = (p: LayoutPlot) => {
    setSelectedId(p.id);
    setQuery(''); // clear search when a plot is picked
    const c = centroid(p.path);
    if (c && mapRef.current) {
      mapRef.current.panTo(c);
      if ((mapRef.current.getZoom() ?? 0) < 19) mapRef.current.setZoom(19);
    }
  };

  // Memoised polygon rendering keyed to plots + selectedId (R19.3: booked/sold clickable too).
  const plotPolygons = useMemo(() => plots.map((p) => {
    const col = PLOT_STATUS_COLORS[normalizePlotStatus(p.status)];
    const sel = p.id === selectedId;
    return (
      <Polygon
        key={p.id}
        paths={p.path}
        onClick={() => pick(p)}
        options={{
          fillColor: col,
          fillOpacity: sel ? 0.6 : 0.35,
          strokeColor: sel ? '#f97316' : col,
          strokeWeight: sel ? 3 : 1,
          zIndex: sel ? 3 : 2,
          clickable: true,
        }}
      />
    );
  }), [plots, selectedId]); // pick is defined inline; eslint-hooks satisfied by deps list

  const where = [layout.location, layout.city].filter(Boolean).join(', ');

  const whatsappHref = panelLines?.whatsapp && layout.cta?.whatsappNumber
    ? `https://wa.me/${layout.cta.whatsappNumber}?text=${encodeURIComponent(panelLines.whatsapp)}`
    : null;

  return (
    <main className={wrap} ref={boxRef}>
      <h1 className="sr-only">{layout.projectName} plot layout</h1>

      {loadError || !isLoaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 p-6 text-center text-sm text-gray-700" role={loadError ? 'alert' : 'status'}>
          {loadError ? 'The map could not be loaded.' : 'Loading map…'}
        </div>
      ) : (
        <div
          role="application"
          aria-label={`${layout.projectName} plot layout map. Use the plus and minus keys to zoom and the arrow keys to pan.`}
          className="absolute inset-0"
        >
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={{ lat: overlay.center.lat, lng: overlay.center.lng }}
            zoom={18}
            onLoad={onLoad}
            onZoomChanged={() => {
              if (mapRef.current) setMapZoom(mapRef.current.getZoom() ?? 18);
            }}
            options={{
              mapTypeId: mapType,
              tilt: 0,
              // Compact: two fingers move the map so the page can still scroll (R9.15).
              gestureHandling: variant === 'compact' ? 'cooperative' : 'greedy',
              clickableIcons: false,
              mapTypeControl: false,
              streetViewControl: false,
              fullscreenControl: false,
              zoomControl: true,
              keyboardShortcuts: true,
            }}
          >
            {layout.boundary.map((b) => (
              <Polygon key={b.id} paths={b.path} options={{ clickable: false, fillOpacity: 0, strokeColor: '#ffffff', strokeWeight: 3, zIndex: 0 }} />
            ))}
            {layout.roads.map((r) => (r.geometryType === 'polyline'
              ? <Polyline key={r.id} path={r.path} options={{ clickable: false, strokeColor: '#6b7280', strokeWeight: 6, zIndex: 1 }} />
              : <Polygon key={r.id} paths={r.path} options={{ clickable: false, fillColor: '#6b7280', fillOpacity: 0.55, strokeColor: '#4b5563', strokeWeight: 1, zIndex: 1 }} />))}
            {layout.openSpaces.map((o) => (
              <Polygon key={o.id} paths={o.path} options={{ clickable: false, fillColor: '#10b981', fillOpacity: 0.35, strokeColor: '#047857', strokeWeight: 1.5, zIndex: 1 }} />
            ))}
            {plotPolygons}
          </GoogleMap>
        </div>
      )}

      {/* Header. max-w reserves 11rem for the Map/Satellite buttons: it was 6rem, which at 320 px let the title card run under them. */}
      <div className="absolute left-3 top-3 z-10 max-w-[calc(100%-11rem)] rounded-xl border border-gray-200 bg-white/95 px-4 py-2 shadow sm:max-w-xs">
        <p className="truncate text-base font-bold text-gray-900">{layout.projectName}</p>
        {where && <p className="truncate text-xs text-gray-700">{where}</p>}
        <p className="text-[11px] text-gray-600">Powered by HomeInTown</p>
      </div>

      {/* Controls */}
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2" role="group" aria-label="Map controls">
        <div role="group" aria-label="Map type" className="flex">
          <button type="button" aria-pressed={mapType === 'roadmap'} onClick={() => setMapType('roadmap')} className={`${btn} rounded-r-none ${mapType === 'roadmap' ? btnOn : ''}`}>Map</button>
          <button type="button" aria-pressed={mapType === 'satellite'} onClick={() => setMapType('satellite')} className={`${btn} rounded-l-none border-l-0 ${mapType === 'satellite' ? btnOn : ''}`}>Satellite</button>
        </div>
        {/* Fixed label + aria-pressed: the label used to flip to "Exit fullscreen" as well, so a screen reader heard the state twice. */}
        <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen} className={btn}>Fullscreen</button>
        {variant === 'compact' && <Link href={`/plots/${encodeURIComponent(layout.slug)}`} className={`${btn} inline-flex items-center justify-center`}>View Plot Layout</Link>}
      </div>

      {imageGone && (
        <p role="alert" className="absolute inset-x-4 top-24 z-10 mx-auto max-w-sm rounded-xl bg-white p-3 text-center text-sm text-gray-900 shadow">
          The layout drawing is not available right now. The plots are still shown.
        </p>
      )}

      {/* Bottom: opacity, legend, search, selected plot detail panel */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-col gap-2 sm:right-auto sm:w-80">

        {/* Detail panel: shown when a plot is selected (R19.3–R19.8) */}
        {selected && panelLines && (
          <section
            role="region"
            aria-label="Plot details"
            className="rounded-xl border border-gray-200 bg-white p-3 shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-bold text-gray-900">
                {panelLines.number ? `Plot ${panelLines.number}` : 'Plot'}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close plot details"
                className={btn}
              >
                Close
              </button>
            </div>

            <dl className="mt-1 space-y-0.5 text-sm text-gray-800">
              {/* Status — always present */}
              {panelLines.status && (
                <>
                  <dt className="sr-only">Status</dt>
                  <dd className="font-semibold capitalize">{PLOT_STATUS_LABELS[normalizePlotStatus(panelLines.status)]}</dd>
                </>
              )}

              {/* Facing — hidden when null (R19.5) */}
              {panelLines.facing && (
                <dd className="text-gray-700 capitalize">Facing: {panelLines.facing}</dd>
              )}

              {/* Area — hidden when null (R19.5: never show "0 sq ft") */}
              {panelLines.areaSqFt && (
                <dd className="text-gray-700">{panelLines.areaSqFt} ({panelLines.areaSqM})</dd>
              )}

              {/* Price — hidden when null (priceMode hidden or missing data) */}
              {panelLines.priceLine && (
                <dd className="font-semibold text-orange-700">{panelLines.priceLine}</dd>
              )}

              {/* Unit info (R19.6) — only when plot.unit is non-null */}
              {panelLines.unitCorner && (
                <dd className="text-gray-700">Corner: {panelLines.unitCorner}</dd>
              )}
              {panelLines.unitDimensions && (
                <dd className="text-gray-700">Dimensions: {panelLines.unitDimensions}</dd>
              )}
            </dl>

            {/* CTA buttons */}
            <div className="mt-2 flex gap-2 flex-wrap">
              {layout.cta?.callNumber && (
                <a
                  href={`tel:${layout.cta.callNumber}`}
                  aria-label={`Call about Plot ${panelLines.number ?? ''}`}
                  className={`${btn} inline-flex items-center justify-center ${btnOn}`}
                >
                  {layout.cta.buttonText ?? 'Call'}
                </a>
              )}
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`WhatsApp enquiry about Plot ${panelLines.number ?? ''}`}
                  className={`${btn} inline-flex items-center justify-center`}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </section>
        )}

        <div className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow">
          <label htmlFor="plot-opacity" className="flex justify-between text-xs text-gray-800">
            <span>Layout opacity</span><span aria-hidden>{Math.round(opacity * 100)}%</span>
          </label>
          <input
            id="plot-opacity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            aria-valuetext={`${Math.round(opacity * 100)} percent`}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="h-11 w-full accent-orange-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
          />
          {/* Legend: counts recomputed from live plots state after socket updates (R19.9) */}
          <ul className="mt-1 grid grid-cols-2 gap-x-2 text-xs text-gray-800" role="list" aria-label="Plot status counts">
            <li role="listitem"><span aria-hidden style={{ color: PLOT_STATUS_COLORS.available }}>●</span> Available: {counts.available}</li>
            <li role="listitem"><span aria-hidden style={{ color: PLOT_STATUS_COLORS.booked }}>●</span> Booked: {counts.booked}</li>
            <li role="listitem"><span aria-hidden style={{ color: PLOT_STATUS_COLORS.sold }}>●</span> Sold: {counts.sold}</li>
            <li role="listitem"><span aria-hidden style={{ color: PLOT_STATUS_COLORS['on-hold'] }}>●</span> On hold: {counts.onHold}</li>
          </ul>
        </div>

        {plots.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white/95 p-3 shadow">
            <label htmlFor="plot-search" className="text-xs text-gray-800">Find a plot by number</label>
            <input
              id="plot-search"
              type="search"
              inputMode="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
            />
            {/* No-match message: only shown when query is non-empty (R19.5, Finding 5) */}
            {query.trim() !== '' && matches.length === 0 && (
              <p className="mt-1 text-xs text-gray-500">No plot found.</p>
            )}
            {matches.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-1" aria-label="Matching plots">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => { pick(p); setQuery(''); }}
                      className={btn}
                    >
                      Plot {p.plotNumber} · {PLOT_STATUS_LABELS[normalizePlotStatus(p.status)]}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* mapZoom tracked above (onZoomChanged) for future label rendering at zoom >= 19 */}
      {mapZoom > 0 && null /* consumed to avoid unused-var — labels not yet rendered */}
    </main>
  );
}
