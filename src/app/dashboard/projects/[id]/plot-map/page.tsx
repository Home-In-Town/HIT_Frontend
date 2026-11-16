'use client';
// Owner-side plot map (E2): the map with live status, the plot sheet (who booked
// it, Release / Mark sold) and the booking requests with Approve / Reject.
//
// All web write actions live here (addendum M12) and they are owner-side only
// (OD-5): a broker who lands here sees the map read-only with a pointer to the
// mobile app. Web has no socket for this page (the dashboard token is an
// httpOnly cookie that useSocket cannot read), so it polls every 30 s.
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { apiCode, plotmapApi } from '@/lib/plotmapApi';
import { usePlotMapLive } from '@/lib/usePlotMapLive';
import { plotmapErrorText } from '@/lib/plotMap.mjs';
import type { PlotMapPayload, PlotMapPlot } from '@/types/plotmap';
import PlotMapViewer from '@/components/plotmap/PlotMapViewer';
import PlotSheet from '@/components/plotmap/PlotSheet';
import RequestsPanel from '@/components/plotmap/RequestsPanel';

type Load =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'error'; message: string }
  | { state: 'ready'; payload: PlotMapPayload };

function Screen({ projectId, initial }: { projectId: string; initial: PlotMapPayload }) {
  const search = useSearchParams();
  const deepPlot = search.get('plot');
  const deepBooking = search.get('booking');
  const ownerSide = initial.viewer?.role === 'owner_side';

  const loadFull = useCallback(() => plotmapApi.getMap(projectId), [projectId]);
  const loadPoll = useCallback((since: number) => plotmapApi.poll(projectId, since), [projectId]);
  const hasOwnPending = !ownerSide && (initial.myRequests ?? []).some((r) => r.status === 'pending');
  const { payload, refreshFull, offline } = usePlotMapLive({ initial, loadFull, loadPoll, fullOnChange: ownerSide || hasOwnPending });
  const current = payload ?? initial;

  const [selectedId, setSelectedId] = useState<string | null>(deepPlot);
  const [requestPlotId, setRequestPlotId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = useMemo(() => current.plots.find((p) => p.id === selectedId) ?? null, [current.plots, selectedId]);
  const requestPlot = useMemo(() => current.plots.find((p) => p.id === requestPlotId) ?? null, [current.plots, requestPlotId]);
  const mineIds = useMemo(() => new Set((current.myRequests ?? []).map((r) => r.plotId)), [current.myRequests]);

  const select = (id: string | null) => { setSelectedId(id); setSheetError(null); };

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setSheetError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(okText);
    } catch (e) {
      setSheetError(plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined));
    } finally {
      setBusy(false);
      await refreshFull();
    }
  };

  const owner = ownerSide ? {
    release: (p: PlotMapPlot) => run(() => plotmapApi.release(projectId, p.id, p.statusVersion), `Plot ${p.number} ab Available hai.`),
    markSold: (p: PlotMapPlot) => run(() => plotmapApi.markSold(projectId, p.id, p.statusVersion), `Plot ${p.number} Sold mark ho gaya.`),
    reviewRequests: (p: PlotMapPlot) => setRequestPlotId(p.id),
  } : undefined;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{current.project.name}</h1>
          <p className="text-sm text-gray-600">Plot map{current.project.city ? ` · ${current.project.city}` : ''}</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Plot map links">
          <Link href={`/dashboard/projects/${projectId}/layout-editor`} className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">Layout Editor</Link>
          <Link href="/dashboard/notifications" className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">Notifications</Link>
        </nav>
      </header>

      {!ownerSide && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">Plot request bhejne ke liye HomeInTown mobile app use karein.</p>
      )}
      {offline && <p role="status" className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">Network nahi hai, status purana ho sakta hai.</p>}
      <p role="status" aria-live="polite" className="min-h-[1.25rem] text-sm text-green-800">{notice ?? ''}</p>

      <div className={`grid gap-4 ${ownerSide ? 'lg:grid-cols-[minmax(0,1fr)_380px]' : ''}`}>
        <div className="flex min-w-0 flex-col gap-3">
          <PlotMapViewer
            image={current.image}
            plots={current.plots}
            role={ownerSide ? 'owner_side' : 'broker'}
            selectedId={selectedId}
            onSelect={select}
            focusPlotId={deepPlot}
            mineIds={mineIds}
            heightClass="h-[65vh] min-h-[360px]"
          />
          {selected && (
            <PlotSheet payload={current} plot={selected} owner={owner} busy={busy} error={sheetError} onClose={() => select(null)} />
          )}
        </div>
        {ownerSide && (
          <RequestsPanel
            projectId={projectId}
            plotId={requestPlotId}
            plotNumber={requestPlot?.number}
            highlightBookingId={deepBooking}
            refreshKey={current.seq}
            onChanged={() => { void refreshFull(); }}
            onShowPlot={(id) => { select(id); }}
            onClearPlot={() => setRequestPlotId(null)}
          />
        )}
      </div>
    </div>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl p-6 text-center">
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      <div className="mt-2 text-sm text-gray-700">{children}</div>
    </div>
  );
}

function PlotMapLoader() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    plotmapApi.getMap(id)
      .then((payload) => { if (alive) setLoad({ state: 'ready', payload }); })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && (e.status === 401 || apiCode(e) === 'UNAUTHENTICATED')) { router.replace('/login'); return; }
        if (apiCode(e) === 'PLOTMAP_NOT_AVAILABLE') setLoad({ state: 'unavailable' });
        else setLoad({ state: 'error', message: plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined) });
      });
    return () => { alive = false; };
  }, [id, router, reloadKey]);

  if (load.state === 'loading') return <Message title="Plot map load ho raha hai…" />;
  if (load.state === 'unavailable') {
    return (
      <Message title="Plot map is project ke liye abhi enabled nahi hai">
        <p>Ya to feature is project par chalu nahi hua, ya abhi koi layout publish nahi hua.</p>
        <p className="mt-3"><Link className="font-semibold text-orange-800 underline" href={`/dashboard/projects/${id}/layout-editor`}>Layout Editor kholo</Link></p>
      </Message>
    );
  }
  if (load.state === 'error') {
    return (
      <Message title="Plot map nahi khul paya">
        <p>{load.message}</p>
        <button type="button" className="mt-3 min-h-[44px] rounded-lg border border-gray-300 px-4 font-semibold" onClick={() => { setLoad({ state: 'loading' }); setReloadKey((k) => k + 1); }}>Dobara try karo</button>
      </Message>
    );
  }
  return <Screen projectId={id} initial={load.payload} />;
}

export default function PlotMapPage() {
  // useSearchParams needs a Suspense boundary for the static build.
  return <Suspense fallback={<Message title="Plot map load ho raha hai…" />}><PlotMapLoader /></Suspense>;
}
