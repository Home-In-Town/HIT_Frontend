'use client';
// /plots/<slug> for a project that has a plot map. Read-only and anonymous: it
// makes no authenticated request (D11), shows Available / Booked-or-Sold only,
// and keeps itself current with the /public-layout socket plus a 30 s poll.
// A layout with several sheets gets tabs; one sheet looks exactly as before.
import { useCallback, useMemo, useState } from 'react';
import { getPlotMap, pollPublicPlotMap } from '@/lib/plotmapPublic';
import { usePlotMapLive } from '@/lib/usePlotMapLive';
import { useActiveSheet } from '@/lib/useActiveSheet';
import { sheetOfPlot } from '@/lib/plotMap.mjs';
import type { PlotMapPayload } from '@/types/plotmap';
import PlotMapViewer from './PlotMapViewer';
import PlotSheet from './PlotSheet';
import SheetTabs from './SheetTabs';

export default function PublicPlotMapViewer({ slug, initial }: { slug: string; initial: PlotMapPayload }) {
  const loadFull = useCallback(async () => {
    const r = await getPlotMap(slug, { base: '/api' });
    if (r.kind !== 'ok') throw new Error('plotmap unavailable');
    return r.payload;
  }, [slug]);
  const loadPoll = useCallback((since: number) => pollPublicPlotMap(slug, since, '/api'), [slug]);
  const { payload, offline } = usePlotMapLive({ initial, loadFull, loadPoll, socketSlug: slug });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const current = payload ?? initial;
  const sheet = useActiveSheet(current);
  const selected = useMemo(() => current.plots.find((p) => p.id === selectedId) ?? null, [current.plots, selectedId]);

  const changeSheet = (idx: number) => { sheet.setActive(idx); setSelectedId(null); setFocusId(null); };
  // A search hit on another sheet: open that sheet, select the plot and centre on it once the sheet has drawn.
  const jumpTo = (hit: { plotId: string; sheet: number }) => { sheet.setActive(hit.sheet); setSelectedId(hit.plotId); setFocusId(hit.plotId); };

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3 p-3 pb-24 md:pb-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">{current.project.name}</h1>
        {current.project.city && <p className="text-sm text-gray-600">{current.project.city}</p>}
        <p className="mt-1 text-sm text-gray-700">Plot par tap karke details dekhein. Status apne aap update hota rehta hai.</p>
      </header>
      {offline && (
        <p role="status" className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
          Network nahi hai, status purana ho sakta hai. Dobara koshish ho rahi hai.
        </p>
      )}
      <SheetTabs tabs={sheet.tabs} activeIdx={sheet.activeIdx} onChange={changeSheet} />
      <PlotMapViewer
        image={sheet.image}
        plots={sheet.plots}
        role="public"
        selectedId={selectedId}
        onSelect={setSelectedId}
        focusPlotId={focusId}
        {...(sheet.multi ? { searchAll: current.plots, currentSheet: sheet.activeIdx, sheetNameOf: sheet.nameOf, onSearchPick: jumpTo } : {})}
      />
      {selected && (
        <PlotSheet
          payload={current}
          plot={selected}
          appSlug={slug}
          sheetName={sheet.multi ? sheet.nameOf(sheetOfPlot(current.plots, selected.id) ?? 0) : undefined}
          onClose={() => setSelectedId(null)}
        />
      )}
    </main>
  );
}
