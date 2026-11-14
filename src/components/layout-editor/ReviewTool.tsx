'use client';

// ReviewTool: Review tab for the Layout Editor (Phase 2, R11.1, R11.5, R11.6,
// R11.8, R12.6, R15.2, R15.3, R15.6, R16.1–R16.15, R19.13, R19.15, R19.17,
// R20.9, R23.5).
//
// Responsibilities:
//   - Detection run panel: start/cancel, ROI, min-area, 3s polling, history.
//   - Three-colour review map layer wired through ProjectMap (approved = status
//     colours; draft = invalid/needs-check/valid).
//   - Approve/un-approve actions with 409 LAYOUT_STALE handling.
//   - Pricing section: priceMode select + per-plot price fields (B8/B9).
//   - Responsive: sidebar ≥768px, bottom sheet 360–767px.
//
// WHY ReviewTool is separate from OverlayAlignTool: the review workflow needs
// its own independent undo stack (cleared only on review-save), its own
// detection-run polling loop, and its own list/map mode; mixing them into the
// existing overlay tool would have made both untestable. The Plan §32.10 and
// design §4.5 agree on this split.

import { useCallback, useEffect, useRef, useState } from 'react';
import ReviewList from './ReviewList';
import {
  classifyPlot,
  computeDuplicateFlags,
  makeUndoStack,
  REVIEW_COLORS,
} from './reviewState.mjs';
import {
  PLOT_STATUS_COLORS,
  PLOT_STATUS_LABELS,
  normalizePlotStatus,
} from '@/lib/layoutTools.mjs';
import {
  startDetectionRun,
  getDetectionRun,
  listDetectionRuns,
  cancelDetectionRun,
  reviewSave,
  updatePriceSettings,
  updatePlotPrice,
  type DetectionRun,
  type ReviewSavePlot,
  ApiError,
  layoutConflictCode,
} from '@/lib/api';

// ── Shared button style ───────────────────────────────────────────────────
const btn = 'min-h-[36px] px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600';
const btnPrimary = `${btn} bg-orange-700 text-white border-orange-700 hover:bg-orange-800`;
const btnSecondary = `${btn} bg-white text-gray-700 border-gray-300 hover:bg-gray-50`;
const btnDanger = `${btn} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`;

type PriceMode = 'hidden' | 'per-sqft' | 'per-plot';

interface DraftPlot {
  id: string;
  plotNumber?: string | null;
  status?: string | null;
  facing?: string | null;
  path?: { lat: number; lng: number }[];
  boundaryConfidence?: number | null;
  ocrConfidence?: number | null;
  validationErrors?: string[] | null;
  saved?: boolean;
  provenance?: { approved?: boolean } | null;
  deleted?: boolean;
  area?: number | null;
  price?: number | null;
  [k: string]: unknown;
}

interface ReviewToolProps {
  projectId: string;
  layoutVersion: string | null | undefined;
  onLayoutVersionChange: (v: string | null) => void;
  plots: DraftPlot[];
  onPlotsChange: (plots: DraftPlot[]) => void;
  onSelectPlot: (id: string | null) => void;
  selectedPlotId: string | null;
  hasTransform: boolean; // false when no overlay.center — approval disabled
  canEdit: boolean;      // false in status-only or read-only modes (R8.12)
  initialPriceMode?: PriceMode;
  pricePerSqFt?: number | null;
}

export default function ReviewTool({
  projectId,
  layoutVersion,
  onLayoutVersionChange,
  plots,
  onPlotsChange,
  onSelectPlot,
  selectedPlotId,
  hasTransform,
  canEdit,
  initialPriceMode = 'hidden',
  pricePerSqFt,
}: ReviewToolProps) {
  // ── Detection state ────────────────────────────────────────────────────
  const [activeRun, setActiveRun] = useState<DetectionRun | null>(null);
  const [history, setHistory] = useState<DetectionRun[]>([]);
  const [roi, setRoi] = useState<[number, number, number, number] | null>(null);
  const [minArea, setMinArea] = useState(400);
  const [runError, setRunError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Review / approval state ────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [undoStack] = useState(() => makeUndoStack());

  // ── Pricing state ──────────────────────────────────────────────────────
  const [priceMode, setPriceMode] = useState<PriceMode>(initialPriceMode);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceSaving, setPriceSaving] = useState<Record<string, boolean>>({});
  const [plotPriceErrors, setPlotPriceErrors] = useState<Record<string, string>>({});

  // Load run history on mount
  useEffect(() => {
    if (!canEdit) return;
    listDetectionRuns(projectId)
      .then(({ active, history: h }) => {
        if (active) setActiveRun(active);
        setHistory(h.slice(0, 20));
      })
      .catch(() => {/* non-critical */});
  }, [projectId, canEdit]);

  // 3-second polling while a run is queued/processing
  useEffect(() => {
    if (!activeRun || (activeRun.state !== 'queued' && activeRun.state !== 'processing')) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const { run } = await getDetectionRun(projectId, activeRun.runId);
        setActiveRun(run);
        if (run.state === 'done' || run.state === 'failed' || run.state === 'cancelled') {
          setHistory((prev) => [run, ...prev.filter((r) => r.runId !== run.runId)].slice(0, 20));
        }
      } catch {/* ignore transient errors */}
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [projectId, activeRun]);

  const handleDetect = async () => {
    if (detecting) return;
    setDetecting(true);
    setRunError(null);
    try {
      const params: { roi?: [number, number, number, number]; minAreaPx?: number } = {};
      if (roi) params.roi = roi;
      if (minArea !== 400) params.minAreaPx = minArea;
      const { run } = await startDetectionRun(projectId, params);
      setActiveRun(run);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Detection failed to start';
      setRunError(msg);
    } finally {
      setDetecting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeRun) return;
    try {
      const { run } = await cancelDetectionRun(projectId, activeRun.runId);
      setActiveRun(run);
    } catch {/* show no error — user can try again */}
  };

  // ── Approval ──────────────────────────────────────────────────────────
  const duplicateIds = computeDuplicateFlags(plots);

  const approvable = (p: DraftPlot) =>
    !p.deleted &&
    hasTransform &&
    classifyPlot(p, duplicateIds) !== 'invalid' &&
    String(p.plotNumber ?? '').trim() !== '';

  const doApprove = useCallback(async (toApprove: DraftPlot[]) => {
    if (!canEdit || saving) return;
    setSaving(true);
    setSaveError(null);
    setStale(false);
    try {
      const updated = plots.map((p) => {
        const shouldApprove = toApprove.some((a) => a.id === p.id);
        if (!shouldApprove) return p;
        return { ...p, provenance: { ...(p.provenance ?? {}), approved: true } };
      });
      const payload: ReviewSavePlot[] = updated
        .filter((p) => !p.deleted)
        .map((p) => ({
          id: p.id,
          path: p.path ?? [],
          plotNumber: p.plotNumber ?? '',
          status: p.status ?? 'available',
          facing: p.facing ?? undefined,
          provenance: p.provenance ?? null,
        }));
      const result = await reviewSave(projectId, { layoutVersion: layoutVersion ?? null, plots: payload });
      onLayoutVersionChange(result.layoutVersion);
      undoStack.clear();
      onPlotsChange(updated);
    } catch (e) {
      const code = layoutConflictCode(e);
      if (code === 'LAYOUT_STALE') {
        setStale(true);
        setSaveError('Layout changed since you opened it. Click Reload to refresh.');
      } else {
        setSaveError(e instanceof ApiError ? e.message : 'Could not save approvals');
      }
    } finally {
      setSaving(false);
    }
  }, [canEdit, saving, plots, layoutVersion, projectId, onLayoutVersionChange, onPlotsChange, undoStack]);

  const handleApproveSelected = () => {
    const p = plots.find((p) => p.id === selectedPlotId);
    if (p && approvable(p)) void doApprove([p]);
  };

  const handleApproveAllValid = () => {
    const valid = plots.filter((p) => approvable(p) && classifyPlot(p, duplicateIds) === 'valid');
    if (valid.length) void doApprove(valid);
  };

  const handleUnApprove = useCallback(async () => {
    if (!canEdit || saving) return;
    const p = plots.find((p) => p.id === selectedPlotId);
    if (!p) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = plots.map((pp) =>
        pp.id === p.id ? { ...pp, provenance: { ...(pp.provenance ?? {}), approved: false } } : pp,
      );
      const payload: ReviewSavePlot[] = updated
        .filter((pp) => !pp.deleted)
        .map((pp) => ({
          id: pp.id,
          path: pp.path ?? [],
          plotNumber: pp.plotNumber ?? '',
          status: pp.status ?? 'available',
          facing: pp.facing ?? undefined,
          provenance: pp.provenance ?? null,
        }));
      const result = await reviewSave(projectId, { layoutVersion: layoutVersion ?? null, plots: payload });
      onLayoutVersionChange(result.layoutVersion);
      undoStack.clear();
      onPlotsChange(updated);
    } catch (e) {
      const code = layoutConflictCode(e);
      if (code === 'LAYOUT_STALE') setStale(true);
      setSaveError(e instanceof ApiError ? e.message : 'Could not un-approve');
    } finally {
      setSaving(false);
    }
  }, [canEdit, saving, plots, selectedPlotId, layoutVersion, projectId, onLayoutVersionChange, onPlotsChange, undoStack]);

  // ── Plot-number / facing updates ───────────────────────────────────────
  const handleUpdatePlotNumber = useCallback((id: string, newNumber: string) => {
    const prev = plots.find((p) => p.id === id);
    if (!prev) return;
    undoStack.apply({ id, field: 'plotNumber', old: prev.plotNumber });
    onPlotsChange(plots.map((p) => p.id === id ? { ...p, plotNumber: newNumber } : p));
  }, [plots, onPlotsChange, undoStack]);

  const handleUpdateFacing = useCallback((id: string, facing: string | undefined) => {
    const prev = plots.find((p) => p.id === id);
    if (!prev) return;
    undoStack.apply({ id, field: 'facing', old: prev.facing });
    onPlotsChange(plots.map((p) => p.id === id ? { ...p, facing: facing ?? null } : p));
  }, [plots, onPlotsChange, undoStack]);

  // ── Pricing ───────────────────────────────────────────────────────────
  const handlePriceModeChange = async (mode: PriceMode) => {
    setPriceError(null);
    try {
      await updatePriceSettings(projectId, mode);
      // B8 does NOT return layoutVersion; never update the editor's layoutVersion.
      setPriceMode(mode);
    } catch (e) {
      setPriceError(e instanceof ApiError ? e.message : 'Could not update price mode');
    }
  };

  const handlePlotPriceChange = async (entityId: string, raw: string) => {
    const price = raw.trim() === '' ? null : Number(raw.replace(/[^0-9.]/g, ''));
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1e10)) {
      setPlotPriceErrors((prev) => ({ ...prev, [entityId]: 'Enter a valid price (0 – 10,00,00,00,000)' }));
      return;
    }
    setPlotPriceErrors((prev) => { const n = { ...prev }; delete n[entityId]; return n; });
    setPriceSaving((prev) => ({ ...prev, [entityId]: true }));
    try {
      // B9 does NOT return layoutVersion; never update the editor's layoutVersion.
      const result = await updatePlotPrice(projectId, entityId, price);
      onPlotsChange(plots.map((p) => p.id === entityId ? { ...p, price: result.price } : p));
    } catch (e) {
      setPlotPriceErrors((prev) => ({ ...prev, [entityId]: e instanceof ApiError ? e.message : 'Could not save price' }));
    } finally {
      setPriceSaving((prev) => { const n = { ...prev }; delete n[entityId]; return n; });
    }
  };

  const approvedPlots = plots.filter((p) => !p.deleted && p.saved === true && p.provenance?.approved === true);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden text-sm">
      {/* ─── Detection panel ─────────────────────────────────────────── */}
      {canEdit && (
        <section aria-label="Detection" className="border-b border-gray-200 p-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Auto-Detect Plots</h3>

          {!hasTransform && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Align the overlay first to enable approval. Detection still works.
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs text-gray-600">
              Min area (px²)
              <input
                type="number"
                min={1} max={1000000} step={1}
                value={minArea}
                onChange={(e) => setMinArea(Math.max(1, Math.min(1000000, Number(e.target.value) || 400)))}
                className="ml-1 w-24 border border-gray-300 rounded px-2 py-0.5 text-xs"
                aria-label="Minimum plot area in pixels squared"
              />
            </label>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => void handleDetect()}
              disabled={detecting || (activeRun?.state === 'queued' || activeRun?.state === 'processing')}
              className={btnPrimary}
              aria-busy={detecting}
            >
              {detecting ? 'Starting…' : 'Detect plots'}
            </button>
            {(activeRun?.state === 'queued' || activeRun?.state === 'processing') && (
              <button type="button" onClick={() => void handleCancel()} className={btnDanger}>Cancel</button>
            )}
          </div>

          {/* Active run status */}
          {activeRun && (
            <div role="status" aria-live="polite" className="text-xs text-gray-700">
              {activeRun.state === 'queued' && <span className="animate-pulse">Queued…</span>}
              {activeRun.state === 'processing' && <span className="animate-pulse">Detecting…</span>}
              {activeRun.state === 'done' && activeRun.plotCount === 0 && (
                <p className="text-amber-700">
                  No plots were found. Try drawing plots manually or using the Grid tool.
                </p>
              )}
              {activeRun.state === 'done' && (activeRun.plotCount ?? 0) > 0 && (
                <p className="text-emerald-700">{activeRun.plotCount} plots detected.</p>
              )}
              {activeRun.state === 'failed' && (
                <p className="text-red-700">Detection failed: {activeRun.reason ?? 'unknown error'}</p>
              )}
            </div>
          )}

          {runError && <p role="alert" className="text-xs text-red-700">{runError}</p>}

          {/* History */}
          {history.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Run history ({history.length})
              </summary>
              <ul className="mt-1 space-y-0.5 max-h-40 overflow-y-auto">
                {history.map((r) => (
                  <li key={r.runId} className="flex justify-between text-gray-600 py-0.5 border-b border-gray-100">
                    <span className="font-mono">{r.runId.slice(-6)}</span>
                    <span>{r.state}{r.plotCount != null ? ` · ${r.plotCount} plots` : ''}</span>
                    <span className="text-gray-400">{r.endedAt ? new Date(r.endedAt).toLocaleTimeString() : ''}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ─── Legend ──────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-3 py-2 border-b border-gray-200 flex-wrap text-xs">
        {Object.entries(REVIEW_COLORS).map(([cls, col]) => (
          <span key={cls} className="flex items-center gap-1 text-gray-600">
            <span aria-hidden className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
            {cls}
          </span>
        ))}
        <span className="flex items-center gap-1 text-gray-600">
          <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          approved
        </span>
      </div>

      {/* ─── Approval actions ────────────────────────────────────────── */}
      {canEdit && (
        <div className="flex gap-2 px-3 py-2 border-b border-gray-200 flex-wrap">
          <button
            type="button"
            onClick={() => void handleApproveSelected()}
            disabled={saving || !selectedPlotId || !approvable(plots.find((p) => p.id === selectedPlotId) ?? {} as DraftPlot) || !hasTransform}
            className={btnSecondary}
            title={!hasTransform ? 'Align the overlay first' : undefined}
          >
            Approve selected
          </button>
          <button
            type="button"
            onClick={() => void handleApproveAllValid()}
            disabled={saving || !hasTransform || plots.filter((p) => approvable(p) && classifyPlot(p, duplicateIds) === 'valid').length === 0}
            className={btnPrimary}
            title={!hasTransform ? 'Align the overlay first' : undefined}
          >
            Approve all valid
          </button>
          <button
            type="button"
            onClick={() => void handleUnApprove()}
            disabled={saving || !selectedPlotId}
            className={btnDanger}
          >
            Un-approve
          </button>
          {stale && (
            <button type="button" onClick={() => window.location.reload()} className={`${btn} bg-yellow-50 text-yellow-800 border-yellow-300`}>
              Reload
            </button>
          )}
          {saveError && <p role="alert" className="w-full text-xs text-red-700">{saveError}</p>}
        </div>
      )}

      {/* ─── Plot list ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <ReviewList
          plots={plots}
          selectedId={selectedPlotId}
          onSelect={(id) => onSelectPlot(id)}
          onUpdatePlotNumber={handleUpdatePlotNumber}
          onUpdateFacing={handleUpdateFacing}
          canEdit={canEdit}
        />
      </div>

      {/* ─── Pricing ─────────────────────────────────────────────────── */}
      {canEdit && (
        <section aria-label="Pricing" className="border-t border-gray-200 p-3 space-y-2">
          <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Pricing</h3>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 flex-shrink-0">Price mode</label>
            <select
              value={priceMode}
              onChange={(e) => void handlePriceModeChange(e.target.value as PriceMode)}
              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs bg-white text-gray-700"
              aria-label="Price display mode"
            >
              <option value="hidden">Hidden from customers</option>
              <option value="per-sqft">Per sq ft (indicative)</option>
              <option value="per-plot">Per plot (fixed)</option>
            </select>
          </div>

          {priceError && <p role="alert" className="text-xs text-red-700">{priceError}</p>}

          {priceMode === 'per-sqft' && (
            <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-2 py-1">
              Indicative price = pricePerSqFt × plot area in sq ft
              {pricePerSqFt ? ` (₹ ${pricePerSqFt.toLocaleString('en-IN')} / sq ft)` : ' — set pricePerSqFt in project settings'}
            </p>
          )}

          {priceMode === 'hidden' && (
            <p className="text-xs text-gray-500">Prices are hidden from customers.</p>
          )}

          {priceMode === 'per-plot' && approvedPlots.length > 0 && (
            <ul className="space-y-1 max-h-48 overflow-y-auto" aria-label="Per-plot prices">
              {approvedPlots.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-700 w-16 truncate">{p.plotNumber || '–'}</span>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      defaultValue={p.price != null ? String(p.price) : ''}
                      onBlur={(e) => void handlePlotPriceChange(p.id, e.target.value)}
                      disabled={priceSaving[p.id]}
                      aria-label={`Price for plot ${p.plotNumber || p.id}`}
                      className={`w-full border rounded pl-6 pr-2 py-0.5 text-xs ${plotPriceErrors[p.id] ? 'border-red-400' : 'border-gray-300'}`}
                    />
                  </div>
                  {priceSaving[p.id] && <span className="text-xs text-gray-400">Saving…</span>}
                  {plotPriceErrors[p.id] && <span className="text-xs text-red-600">{plotPriceErrors[p.id]}</span>}
                </li>
              ))}
            </ul>
          )}

          {priceMode === 'per-plot' && approvedPlots.length === 0 && (
            <p className="text-xs text-gray-500">Approve plots first to set individual prices.</p>
          )}
        </section>
      )}
    </div>
  );
}
