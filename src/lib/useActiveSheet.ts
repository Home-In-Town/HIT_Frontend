'use client';
// Which sheet of a multi-sheet plot map is open, and what to draw for it.
// Previous behaviour: one image and every plot in one viewer. For a single-sheet
// or legacy payload this hook returns that same image and ALL plots, so those
// screens render exactly as before; only a payload with 2+ sheets filters.
import { useCallback, useMemo, useState } from 'react';
import { countStatuses, plotsForSheet, sheetOfPlot, sheetsOf } from '@/lib/plotMap.mjs';
import type { PlotMapImage, PlotMapPayload, PlotMapPlot } from '@/types/plotmap';
import type { SheetTab } from '@/components/plotmap/SheetTabs';

export function useActiveSheet(payload: PlotMapPayload, initialPlotId?: string | null) {
  const sheets = useMemo(() => sheetsOf(payload), [payload]);
  const multi = sheets.length > 1;
  const [wanted, setWanted] = useState<number>(() => (initialPlotId ? (sheetOfPlot(payload.plots, initialPlotId) ?? 0) : 0));
  // The wanted sheet can disappear (a regenerated layout has fewer sheets): fall back to the first.
  const active = sheets.find((s) => s.idx === wanted) ?? sheets[0];

  const plots = useMemo<PlotMapPlot[]>(
    () => (multi ? plotsForSheet(payload.plots, active.idx) : payload.plots),
    [multi, payload.plots, active.idx],
  );
  const image: PlotMapImage = multi ? active.image : payload.image;

  // Counts are taken from the live plots, not the sheet's stored counts, so a status poll updates the tab text.
  const tabs = useMemo<SheetTab[]>(() => sheets.map((s) => ({
    idx: s.idx,
    name: s.name,
    badge: `${countStatuses(plotsForSheet(payload.plots, s.idx)).available} available`,
  })), [sheets, payload.plots]);

  const nameOf = useCallback((idx: number) => sheets.find((s) => s.idx === idx)?.name ?? `Sheet ${idx + 1}`, [sheets]);
  /** Switch to the sheet that holds this plot (no-op for an unknown plot). */
  const showPlot = useCallback((plotId: string) => {
    const s = sheetOfPlot(payload.plots, plotId);
    if (s !== null) setWanted(s);
  }, [payload.plots]);

  return { sheets, multi, active, activeIdx: active.idx, setActive: setWanted, image, plots, tabs, nameOf, showPlot };
}
