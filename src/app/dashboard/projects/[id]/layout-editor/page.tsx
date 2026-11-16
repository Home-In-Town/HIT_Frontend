'use client';
// Layout Editor, rewritten. Before: a ~1500-line editor with Boundary / Roads /
// Plots / AI tabs, manual drawing, a grid tool, overlay drag/rotate/scale and
// two-point georeferencing on a satellite map. Now: import an image or PDF,
// press "Layout generate karo", check and fix (plot number, remove a false
// box), publish. Nothing here places or draws anything.
//
// The page renders exactly one of four states, decided by E5 (addendum 13.2):
//  1. E5 404 PLOTMAP_NOT_AVAILABLE: only "enabled nahi hai". No import panel and
//     NO legacy editor: the old manual editor is gone for every project, also
//     where the flag is off. Rolling the flag back restores the legacy VIEWERS,
//     not this editor (that needs a code revert).
//  2. no draft, no run: import panel (plus a note when a legacy overlay exists).
//  3. a layout is generating: indeterminate progress + Cancel.
//  4. a draft in review: Check & fix + Publish.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { apiCode, plotmapApi } from '@/lib/plotmapApi';
import { plotmapErrorText } from '@/lib/plotMap.mjs';
import type { LayoutListItem } from '@/types/plotmap';
import PlotmapImportPanel from '@/components/plotmap/PlotmapImportPanel';
import type { StartedRun } from '@/components/plotmap/PlotmapImportPanel';
import PlotmapProgressPanel from '@/components/plotmap/PlotmapProgressPanel';
import PlotmapReviewPanel from '@/components/plotmap/PlotmapReviewPanel';

type View =
  | { state: 'loading' }
  | { state: 'unavailable' }
  | { state: 'forbidden' }
  | { state: 'error'; message: string }
  | { state: 'ready'; layouts: LayoutListItem[] };

function Shell({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Plot Layout</h1>
        <nav className="flex flex-wrap gap-2" aria-label="Links">
          <Link href="/dashboard/projects" className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">Projects</Link>
          <Link href={`/dashboard/projects/${projectId}/plot-map`} className="inline-flex min-h-[44px] items-center rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800">Plot Map</Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

export default function LayoutEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<View>({ state: 'loading' });
  // Kept only for this session so "Dobara try" can reuse the uploaded image.
  const [lastRun, setLastRun] = useState<StartedRun | null>(null);
  const [forceImport, setForceImport] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await plotmapApi.listLayouts(id);
      setView({ state: 'ready', layouts: r.layouts });
    } catch (e) {
      const code = apiCode(e);
      if (e instanceof ApiError && e.status === 401) { router.replace('/login'); return; }
      if (code === 'PLOTMAP_NOT_AVAILABLE') setView({ state: 'unavailable' });
      else if (code === 'FORBIDDEN') setView({ state: 'forbidden' });
      else setView({ state: 'error', message: plotmapErrorText(code, e instanceof Error ? e.message : undefined) });
    }
  }, [id, router]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (view.state === 'loading') return <Shell projectId={id}><p className="text-sm text-gray-700">Load ho raha hai…</p></Shell>;

  if (view.state === 'unavailable') {
    return (
      <Shell projectId={id}>
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-800">
          <p className="font-semibold">Plot map abhi is project ke liye enabled nahi hai.</p>
          <p className="mt-1 text-gray-600">Ye feature sirf plot projects par aur chalu karne ke baad dikhta hai.</p>
          <Link href="/dashboard/projects" className="mt-3 inline-flex min-h-[44px] items-center font-semibold text-orange-800 underline">Projects par wapas jao</Link>
        </div>
      </Shell>
    );
  }
  if (view.state === 'forbidden') {
    return <Shell projectId={id}><p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{plotmapErrorText('FORBIDDEN')}</p></Shell>;
  }
  if (view.state === 'error') {
    return (
      <Shell projectId={id}>
        <p role="alert" className="text-sm text-red-700">{view.message}</p>
        <button type="button" className="min-h-[44px] self-start rounded-lg border border-gray-300 px-4 font-semibold" onClick={() => { setView({ state: 'loading' }); void load(); }}>Dobara try karo</button>
      </Shell>
    );
  }

  const generating = view.layouts.find((l) => l.state === 'generating');
  const review = view.layouts.find((l) => l.state === 'review');
  const live = view.layouts.find((l) => l.isLive);
  const newest = view.layouts[0];
  const failedLatest = !generating && !review && newest?.state === 'failed' ? newest : null;

  if (generating) {
    return (
      <Shell projectId={id}>
        <PlotmapProgressPanel
          projectId={id}
          layoutId={generating.id}
          onFinished={() => { void load(); }}
          onNewImage={() => { void load(); }}
        />
      </Shell>
    );
  }

  if (review) {
    return (
      <Shell projectId={id}>
        <PlotmapReviewPanel
          projectId={id}
          layoutId={review.id}
          hasLive={!!live}
          onPublished={() => { setLastRun(null); void load(); }}
          onDiscarded={() => { void load(); }}
        />
      </Shell>
    );
  }

  const retry = lastRun ? async () => {
    setRetryError(null);
    try {
      await plotmapApi.generate(id, lastRun.imageKey, lastRun.pdfPage ?? undefined);
      void load();
    } catch (e) {
      setRetryError(plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined));
    }
  } : undefined;

  return (
    <Shell projectId={id}>
      {failedLatest && !forceImport && (
        <PlotmapProgressPanel
          projectId={id}
          layoutId={failedLatest.id}
          onFinished={() => { void load(); }}
          onFailedRetry={retry}
          onNewImage={() => setForceImport(true)}
        />
      )}
      {retryError && <p role="alert" className="text-sm text-red-700">{retryError}</p>}
      {live && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Ek layout publish ho chuka hai ({live.stats.plots} plots).{' '}
          <Link className="font-semibold underline" href={`/dashboard/projects/${id}/plot-map`}>Plot map kholo</Link>
        </div>
      )}
      {(!failedLatest || forceImport) && (
        <PlotmapImportPanel
          projectId={id}
          hasLive={!!live}
          onStarted={(run) => { setLastRun(run); setForceImport(false); void load(); }}
          onConflict={() => { void load(); }}
        />
      )}
    </Shell>
  );
}
