'use client';

// "Link plots ↔ units": POST /projects/:id/layout/link-units. Preview first
// (writes nothing), then Apply. Matching is on the trimmed plot number, only
// when the plot units have a single block (or none) and the number is unique
// on both sides (D6). On apply a unit that was ever updated keeps its status
// and the plot takes it; otherwise the plot's status is copied to the unit.
//
// Before this the drawn plots and the unit inventory were two unrelated lists:
// marking plot 12 sold on the map left unit "12" available in the grid and in
// chat, and the other way round.

import { useEffect, useState } from 'react';
import { ApiError, linkUnits } from '@/lib/api';
import type { LinkUnitsReport } from '@/lib/api';
import { PLOT_STATUS_LABELS } from '@/lib/layoutTools.mjs';
import LayoutDialog from './LayoutDialog';

const REASONS: Record<string, string> = {
  'duplicate-plot-number': 'Do plots ka same number',
  'duplicate-unit': 'Do units ka same label',
};

export function apiErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Is project ke units badalne ki permission nahi';
    const body = err.body as { blocks?: unknown; conflicts?: unknown } | null;
    const blocks = Array.isArray(body?.blocks) ? ` (blocks: ${body.blocks.join(', ')})` : '';
    return `${err.message}${blocks}`;
  }
  return err instanceof Error ? err.message : 'Kuch galat ho gaya';
}

export function LinkReportView({ report }: { report: LinkUnitsReport }) {
  return (
    <div className="space-y-3">
      <p className="text-gray-700">
        <strong>{report.linked.length}</strong> linked ·{' '}
        <strong>{report.ambiguous.length}</strong> ambiguous ·{' '}
        <strong>{report.unmatchedPlots.length}</strong> plots without unit ·{' '}
        <strong>{report.unmatchedUnits.length}</strong> units without plot
      </p>
      {report.error && (
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
          Link skip hua: {report.error}{report.blocks?.length ? ` (blocks: ${report.blocks.join(', ')})` : ''}
        </p>
      )}

      {report.linked.length > 0 && (
        <div className="max-h-48 overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <caption className="sr-only">Plots linked to units</caption>
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th scope="col" className="text-left px-2 py-1">Plot</th>
                <th scope="col" className="text-left px-2 py-1">Unit</th>
                <th scope="col" className="text-left px-2 py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {report.linked.map((l) => (
                <tr key={l.plotId} className="border-t">
                  <td className="px-2 py-1">{l.plotNumber}</td>
                  <td className="px-2 py-1">{l.label}</td>
                  <td className="px-2 py-1">{PLOT_STATUS_LABELS[l.status] ?? l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.ambiguous.length > 0 && (
        <div>
          <h3 className="font-medium text-xs text-gray-600">Ambiguous (link nahi honge)</h3>
          <ul className="text-xs list-disc pl-5">
            {report.ambiguous.map((a, i) => (
              <li key={`${a.plotNumber}-${i}`}>Plot {a.plotNumber}: {REASONS[a.reason] ?? a.reason}</li>
            ))}
          </ul>
        </div>
      )}
      {report.unmatchedPlots.length > 0 && (
        <p className="text-xs text-gray-600">
          <span className="font-medium">Plots without unit:</span> {report.unmatchedPlots.join(', ')}
        </p>
      )}
      {report.unmatchedUnits.length > 0 && (
        <p className="text-xs text-gray-600">
          <span className="font-medium">Units without plot:</span> {report.unmatchedUnits.join(', ')}
        </p>
      )}
    </div>
  );
}

// Mounted only while open, so the preview request starts on mount and every
// state update happens in its promise callbacks.
export default function LinkUnitsDialog({
  projectId,
  onClose,
  onApplied,
}: {
  projectId: string;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [preview, setPreview] = useState<LinkUnitsReport | null>(null);
  const [result, setResult] = useState<LinkUnitsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>('preview');

  useEffect(() => {
    let alive = true;
    linkUnits(projectId, 'preview')
      .then((r) => { if (alive) setPreview(r); })
      .catch((err) => { if (alive) setError(apiErrorText(err)); })
      .finally(() => { if (alive) setBusy(null); });
    return () => { alive = false; };
  }, [projectId]);

  const apply = async () => {
    setBusy('apply');
    setError(null);
    try {
      const r = await linkUnits(projectId, 'apply');
      setResult(r);
      onApplied();
    } catch (err) {
      setError(apiErrorText(err));
    }
    // Not in `finally`: React Compiler skips components with try/finally,
    // which would switch off the hooks lint for this file.
    setBusy(null);
  };

  const shown = result ?? preview;

  return (
    <LayoutDialog
      title="Link plots ↔ units"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="border rounded-lg px-4 py-2 text-sm">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <button
              type="button"
              onClick={apply}
              disabled={busy !== null || !preview || preview.linked.length === 0}
              className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
            >
              {busy === 'apply' ? 'Applying…' : `Apply (${preview?.linked.length ?? 0} links)`}
            </button>
          )}
        </>
      }
    >
      <div role="status" aria-live="polite">
        {busy === 'preview' && <p className="text-gray-600">Preview load ho raha hai…</p>}
        {result && <p className="text-green-700 mb-2">Link apply ho gaya. Map reload ho raha hai.</p>}
        {error && <p className="text-red-700 mb-2">{error}</p>}
      </div>
      {!result && preview && (
        <p className="text-xs text-gray-500 mb-2">
          Preview: abhi kuch save nahi hua. Apply pe, jis unit ka status kabhi update hua hai uska status plot pe
          aayega; baaki units plot ka status lenge.
        </p>
      )}
      {shown && <LinkReportView report={shown} />}
    </LayoutDialog>
  );
}
