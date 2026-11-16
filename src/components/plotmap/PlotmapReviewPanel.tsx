'use client';
// "Check & fix" (D2a) and Publish. Only two edits exist: change a plot's number,
// or remove a box that is not a plot. No drag, no draw, no resize: if the AI got
// a shape wrong, the owner regenerates. Publish is blocked until every plot has
// one unique number; the server computes the blockers and this panel shows them.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiBody, apiCode, plotmapApi } from '@/lib/plotmapApi';
import { draftStats, flagText, naturalCompare, orderForReview, plotmapErrorText, publishBlockers } from '@/lib/plotMap.mjs';
import type { Blocker, DraftPlot, LayoutDetail, PublishResponse } from '@/types/plotmap';
import PlotMapViewer, { formatArea } from './PlotMapViewer';

const BLOCKER_TEXT: Record<Blocker['code'], (n: number) => string> = {
  NO_PLOTS: () => 'Ek bhi plot nahi bacha. Naya image dekar layout dobara banao.',
  NO_NUMBER: (n) => `${n} plot ka number nahi hai`,
  DUP_NUMBER: (n) => `${n} plot ka number kisi aur plot jaisa hai`,
};

type Unmatched = { number: string; status: string; plotId: string }[];

export default function PlotmapReviewPanel({
  projectId, layoutId, hasLive, onPublished, onDiscarded,
}: {
  projectId: string;
  layoutId: string;
  hasLive: boolean;
  onPublished: (r: PublishResponse) => void;
  onDiscarded: () => void;
}) {
  const [layout, setLayout] = useState<LayoutDetail | null>(null);
  const [plots, setPlots] = useState<DraftPlot[]>([]);
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [numberInput, setNumberInput] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'publish' | 'discard' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unmatched, setUnmatched] = useState<Unmatched | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await plotmapApi.getLayout(projectId, layoutId);
      setLayout(r.layout);
      setPlots((r.plots ?? []) as DraftPlot[]);
      setBlockers(r.blockers);
      setLoadError(null);
    } catch (e) {
      setLoadError(plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined));
    }
  }, [projectId, layoutId]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(t);
  }, [load]);

  const selected = useMemo(() => plots.find((p) => p.id === selectedId) ?? null, [plots, selectedId]);
  const ordered = useMemo(() => orderForReview(plots) as DraftPlot[], [plots]);
  const others = useMemo(() => plots.filter((p) => p.kind !== 'plot').sort((a, b) => naturalCompare(a.key, b.key)), [plots]);
  const flaggedIds = useMemo(() => new Set(plots.filter((p) => (p.flags ?? []).length > 0).map((p) => p.id)), [plots]);
  const stats = useMemo(() => draftStats(plots), [plots]);
  // The server's blockers are authoritative. When it reports none but the local copy still shows a
  // problem, the local check keeps Publish disabled; the server re-checks on publish anyway.
  const activeBlockers = useMemo(() => (blockers.length ? blockers : (publishBlockers(plots) as Blocker[])), [blockers, plots]);

  const pick = (id: string | null) => {
    setSelectedId(id);
    setConfirm(null);
    setError(null);
    const p = plots.find((x) => x.id === id);
    setNumberInput(p?.number ?? '');
  };

  /** Applies the answer of one Check & fix edit to the local copy. */
  const applyEdit = (r: Awaited<ReturnType<typeof plotmapApi.editNumber>>) => {
    setPlots((prev) => {
      let next = prev;
      if (r.plot.deleted) next = next.filter((p) => p.id !== r.plot.id);
      else next = next.map((p) => (p.id === r.plot.id ? { ...p, number: r.plot.number ?? p.number, flags: r.plot.flags ?? p.flags, provenance: r.plot.provenance ?? p.provenance } : p));
      const re = new Map(r.reflagged.map((x) => [x.id, x.flags]));
      return re.size ? next.map((p) => (re.has(p.id) ? { ...p, flags: re.get(p.id)! } : p)) : next;
    });
    setLayout((l) => (l ? { ...l, version: r.layout.version } : l));
    setBlockers(r.layout.blockers);
  };

  const failed = async (e: unknown) => {
    const code = apiCode(e);
    setError(plotmapErrorText(code, e instanceof Error ? e.message : undefined));
    // A stale version or a draft that changed under us: reload the truth.
    if (code === 'LAYOUT_VERSION' || code === 'NOT_DRAFT' || code === 'PLOT_NOT_FOUND') await load();
  };

  const saveNumber = async () => {
    if (!selected || !layout) return;
    setBusy(true);
    setError(null);
    try {
      applyEdit(await plotmapApi.editNumber(projectId, layoutId, selected.id, numberInput.trim(), layout.version));
    } catch (e) { await failed(e); } finally { setBusy(false); }
  };

  const removePlot = async (p: DraftPlot) => {
    if (!layout) return;
    setBusy(true);
    setError(null);
    try {
      applyEdit(await plotmapApi.deletePlot(projectId, layoutId, p.id, layout.version));
      setConfirm(null);
      setSelectedId(null);
    } catch (e) { await failed(e); } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!layout) return;
    setBusy(true);
    setError(null);
    setUnmatched(null);
    setConfirm(null);
    try {
      onPublished(await plotmapApi.publish(projectId, layoutId, layout.version));
    } catch (e) {
      const code = apiCode(e);
      const body = apiBody<{ blockers?: Blocker[]; unmatched?: Unmatched }>(e);
      if (code === 'PUBLISH_BLOCKED' && body?.blockers) setBlockers(body.blockers);
      if (code === 'BOOKED_PLOTS_UNMATCHED' && body?.unmatched) setUnmatched(body.unmatched);
      await failed(e);
    } finally { setBusy(false); }
  };

  const discard = async () => {
    setBusy(true);
    try {
      await plotmapApi.deleteDraft(projectId, layoutId);
      onDiscarded();
    } catch (e) { await failed(e); setConfirm(null); } finally { setBusy(false); }
  };

  const btn = 'min-h-[44px] rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50';

  if (loadError) {
    return (
      <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        <p role="alert">{loadError}</p>
        <button type="button" className={`${btn} mt-2 border border-gray-300 bg-white text-gray-900`} onClick={() => void load()}>Dobara try karo</button>
      </section>
    );
  }
  if (!layout) return <p className="p-4 text-sm text-gray-700">Draft load ho raha hai…</p>;

  const warnings = layout.generation.warnings ?? [];
  const canPublish = !busy && activeBlockers.length === 0 && stats.plots > 0;

  return (
    <section aria-label="Check and fix" className="flex flex-col gap-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-bold text-gray-900">Layout check karo</h2>
        <p className="mt-1 text-sm text-gray-800" aria-live="polite">
          {stats.plots} plots mile · {stats.cp} common plot · {stats.roads} road
          {stats.flagged > 0 ? ` · ${stats.flagged} jagah check karna hai` : ''}
        </p>
        {warnings.map((w) => <p key={w.code} className="mt-1 text-sm text-yellow-900">{w.message}</p>)}
        <p className="mt-2 text-sm text-gray-600">
          Number galat ho to badlo, jo box plot nahi hai use hatao. Shape galat ho to naya image dekar layout dobara banao. Red dashed box check karne wale hain.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PlotMapViewer
          image={layout.image}
          plots={plots}
          role="public"
          selectedId={selectedId}
          onSelect={pick}
          flaggedIds={flaggedIds}
          focusPlotId={selectedId}
          heightClass="h-[60vh] min-h-[320px]"
        />

        <div className="flex min-w-0 flex-col gap-3">
          {selected && (
            <div className="rounded-xl border border-orange-300 bg-orange-50 p-3" aria-label={`Plot ${selected.number ?? ''} edit`}>
              <h3 className="font-bold text-gray-900">Plot {selected.number ?? '(number nahi)'}</h3>
              {formatArea(selected.area, selected.areaUnit, selected.areaApprox) && <p className="text-sm text-gray-700">{formatArea(selected.area, selected.areaUnit, selected.areaApprox)}</p>}
              {(selected.flags ?? []).length > 0 && <p className="text-sm text-red-800">{selected.flags.map(flagText).join(' · ')}</p>}
              <form className="mt-2 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void saveNumber(); }}>
                <label className="flex-1 text-sm text-gray-800">
                  Plot number
                  <input
                    value={numberInput}
                    maxLength={20}
                    onChange={(e) => setNumberInput(e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 text-gray-900"
                  />
                </label>
                <button type="submit" disabled={busy || !numberInput.trim() || numberInput.trim() === (selected.number ?? '')} className={`${btn} bg-orange-600 text-white`}>Save</button>
              </form>
              {confirm !== 'delete' ? (
                <button type="button" disabled={busy} onClick={() => setConfirm('delete')} className={`${btn} mt-2 border border-red-300 bg-white text-red-800`}>Ye plot nahi hai - hatao</button>
              ) : (
                <div role="alertdialog" aria-label="Hatane ka confirm" className="mt-2 rounded-lg border border-red-300 bg-white p-3 text-sm text-gray-900">
                  <p>Is box ko hatane ke baad wapas nahi la sakte. Hatao?</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={`${btn} border border-gray-300`}>Wapas</button>
                    <button type="button" disabled={busy} onClick={() => void removePlot(selected)} className={`${btn} bg-red-700 text-white`}>Haan, hatao</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <h3 className="font-bold text-gray-900">Plots ({ordered.length})</h3>
            <p className="text-xs text-gray-600">Jinko check karna hai wo upar hain.</p>
            <ul className="mt-2 max-h-72 divide-y divide-gray-100 overflow-y-auto" aria-label="Plot list">
              {ordered.map((p) => {
                const flags = p.flags ?? [];
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      aria-pressed={p.id === selectedId}
                      onClick={() => pick(p.id)}
                      className={`flex min-h-[44px] w-full flex-col items-start justify-center px-2 py-1 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${p.id === selectedId ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                    >
                      <span className="font-semibold text-gray-900">Plot {p.number ?? '(number nahi)'}</span>
                      {flags.length > 0 && <span className="text-xs text-red-800">{flags.map(flagText).join(' · ')}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {others.length > 0 && (
            <details className="rounded-xl border border-gray-200 bg-white p-3">
              <summary className="min-h-[44px] cursor-pointer font-bold text-gray-900">Plot ke alawa boxes ({others.length})</summary>
              <ul className="mt-2 divide-y divide-gray-100">
                {others.map((p) => (
                  <li key={p.id} className="flex min-h-[44px] items-center justify-between gap-2 text-sm">
                    <span className="text-gray-900">{p.label || (p.kind === 'cp' ? 'Common plot' : p.kind === 'road' ? 'Road' : 'Khula hissa')}</span>
                    <button type="button" disabled={busy} onClick={() => void removePlot(p)} className={`${btn} border border-red-300 text-red-800`} aria-label={`${p.label || p.kind} wala box hatao`}>Hatao</button>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-gray-600">Hatane ke baad wapas nahi aata.</p>
            </details>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {activeBlockers.length > 0 && (
          <ul className="mb-3 flex flex-col gap-1" aria-label="Publish se pehle theek karna hai">
            {activeBlockers.map((b) => (
              <li key={b.code} className="flex flex-wrap items-center gap-2 text-sm text-red-800">
                <span>{BLOCKER_TEXT[b.code]?.(b.count) ?? b.code}</span>
                {b.plotIds[0] && <button type="button" className="min-h-[44px] font-semibold underline" onClick={() => pick(b.plotIds[0])}>Pehla dikhao</button>}
              </li>
            ))}
          </ul>
        )}
        {unmatched && (
          <div role="alert" className="mb-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <p className="font-semibold">Ye booked plots naye layout mein nahi mile:</p>
            <ul className="list-disc pl-5">{unmatched.map((u) => <li key={u.plotId}>Plot {u.number} ({u.status})</li>)}</ul>
            <p className="mt-1">Ya to draft mein inka number theek karo, ya purane layout mein inhe Available karo / pending requests reject karo, phir publish karo.</p>
          </div>
        )}
        <p role="alert" className="min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>

        {confirm === 'publish' ? (
          <div role="alertdialog" aria-label="Publish confirm" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-gray-900">
            <p>{hasLive ? 'Naya layout publish karein? Purana layout archive ho jayega, booked plots number se jud jayenge.' : 'Layout publish karein? Iske baad ye sabko dikhega.'}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} className={`${btn} border border-gray-300 bg-white`} onClick={() => setConfirm(null)}>Wapas</button>
              <button type="button" disabled={busy} className={`${btn} bg-orange-600 text-white`} onClick={() => void publish()}>Haan, publish karo</button>
            </div>
          </div>
        ) : confirm === 'discard' ? (
          <div role="alertdialog" aria-label="Draft hatane ka confirm" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-gray-900">
            <p>Ye draft hata dein? Aapke saare changes chale jayenge.</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} className={`${btn} border border-gray-300 bg-white`} onClick={() => setConfirm(null)}>Wapas</button>
              <button type="button" disabled={busy} className={`${btn} bg-red-700 text-white`} onClick={() => void discard()}>Haan, hatao</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!canPublish} onClick={() => setConfirm('publish')} className={`${btn} flex-1 bg-orange-600 text-white`}>{busy ? 'Ho raha hai…' : 'Publish'}</button>
            <button type="button" disabled={busy} onClick={() => setConfirm('discard')} className={`${btn} border border-gray-300 text-gray-900`}>Draft hatao</button>
          </div>
        )}
        {!canPublish && activeBlockers.length === 0 && stats.plots === 0 && <p className="mt-2 text-sm text-gray-600">Publish ke liye kam se kam ek plot chahiye.</p>}
        <p className="mt-2 text-xs text-gray-500"><Link className="underline" href={`/dashboard/projects/${projectId}/plot-map`}>Published plot map dekho</Link></p>
      </div>
    </section>
  );
}
