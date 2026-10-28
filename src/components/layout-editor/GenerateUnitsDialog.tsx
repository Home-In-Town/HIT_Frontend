'use client';

// "Generate units from plots": POST /projects/:id/layout/generate-units with
// a plot-mode unit setup (one unnamed block, from..to), then the same linking
// as LinkUnitsDialog. The range is prefilled from the min..max numeric plot
// numbers on the drawn layout (D5: generateUnits only builds one contiguous
// range). Preview writes nothing; Apply merges by label, so existing units
// keep their status, and the server refuses (409) to remove a booked or sold
// unit — that list is shown instead of a bare error.
//
// Before this, units for a plotted project had to be typed again by hand in
// the unit grid, with nothing tying them to the drawn plots.

import { useState } from 'react';
import { ApiError, generateUnits } from '@/lib/api';
import type { GenerateUnitsResult } from '@/lib/api';
import { validateUnitRange } from '@/lib/layoutTools.mjs';
import type { unitRangePrefill } from '@/lib/layoutTools.mjs';
import LayoutDialog from './LayoutDialog';
import { LinkReportView, apiErrorText } from './LinkUnitsDialog';

type Prefill = ReturnType<typeof unitRangePrefill>;

export default function GenerateUnitsDialog({
  projectId,
  prefill,
  onClose,
  onApplied,
}: {
  projectId: string;
  prefill: Prefill;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [from, setFrom] = useState(prefill.from != null ? String(prefill.from) : '1');
  const [to, setTo] = useState(prefill.to != null ? String(prefill.to) : '');
  const [preview, setPreview] = useState<GenerateUnitsResult | null>(null);
  const [result, setResult] = useState<GenerateUnitsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [busy, setBusy] = useState<'preview' | 'apply' | null>(null);

  const rangeError = validateUnitRange(from, to);

  const run = async (mode: 'preview' | 'apply') => {
    if (rangeError) return;
    setBusy(mode);
    setError(null);
    setConflicts([]);
    try {
      const r = await generateUnits(projectId, mode, { from: Number(from), to: Number(to) });
      if (mode === 'preview') {
        setPreview(r);
      } else {
        setResult(r);
        onApplied();
      }
    } catch (err) {
      setError(apiErrorText(err));
      if (err instanceof ApiError) {
        const body = err.body as { conflicts?: unknown } | null;
        if (Array.isArray(body?.conflicts)) setConflicts(body.conflicts.map(String));
      }
    }
    // Not in `finally`: React Compiler skips components with try/finally,
    // which would switch off the hooks lint for this file.
    setBusy(null);
  };

  // Changing the range invalidates the preview: Apply must never write a
  // different range from the one the user just looked at.
  const edit = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setPreview(null);
    setError(null);
    setConflicts([]);
  };

  const shown = result ?? preview;

  return (
    <LayoutDialog
      title="Generate units from plots"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className="border rounded-lg px-4 py-2 text-sm">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result && (
            <>
              <button
                type="button"
                onClick={() => run('preview')}
                disabled={busy !== null || !!rangeError}
                className="border border-orange-300 text-orange-800 rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                {busy === 'preview' ? 'Checking…' : 'Preview'}
              </button>
              <button
                type="button"
                onClick={() => run('apply')}
                disabled={busy !== null || !!rangeError || !preview}
                className="bg-orange-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-40"
              >
                {busy === 'apply' ? 'Applying…' : 'Apply'}
              </button>
            </>
          )}
        </>
      }
    >
      <p className="text-xs text-gray-600 mb-3">
        Drawn plots: <strong>{prefill.plotCount}</strong> saved
        {prefill.numericCount !== prefill.plotCount && ` (${prefill.numericCount} numbered)`}.
        {prefill.from != null && ` Range ${prefill.from}–${prefill.to} prefill kiya hai.`}
        {prefill.missing > 0 && ` ${prefill.missing} number beech me missing hain; unke units bhi banenge (plot ke bina).`}
      </p>
      {prefill.nonNumeric.length > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          Ye plot numbers number nahi hain, auto-link nahi honge: {prefill.nonNumeric.slice(0, 20).join(', ')}
          {prefill.nonNumeric.length > 20 && ` +${prefill.nonNumeric.length - 20}`}
        </p>
      )}
      {prefill.duplicates.length > 0 && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-3">
          Duplicate plot numbers (link nahi honge): {prefill.duplicates.join(', ')}
        </p>
      )}

      <fieldset className="grid grid-cols-2 gap-3 mb-2" disabled={!!result}>
        <legend className="sr-only">Plot number range</legend>
        <div>
          <label htmlFor="gen-from" className="text-xs text-gray-500">First plot number</label>
          <input
            id="gen-from"
            type="number"
            inputMode="numeric"
            min={1}
            value={from}
            onChange={edit(setFrom)}
            aria-invalid={!!rangeError}
            aria-describedby={rangeError ? 'gen-range-err' : undefined}
            className="border p-2 w-full rounded text-sm mt-1"
          />
        </div>
        <div>
          <label htmlFor="gen-to" className="text-xs text-gray-500">Last plot number</label>
          <input
            id="gen-to"
            type="number"
            inputMode="numeric"
            min={1}
            value={to}
            onChange={edit(setTo)}
            aria-invalid={!!rangeError}
            aria-describedby={rangeError ? 'gen-range-err' : undefined}
            className="border p-2 w-full rounded text-sm mt-1"
          />
        </div>
      </fieldset>
      {rangeError && <p id="gen-range-err" className="text-xs text-red-700 mb-2">{rangeError}</p>}

      <div role="status" aria-live="polite">
        {result && <p className="text-green-700 mb-2">Units ban gaye aur link ho gaye. Map reload ho raha hai.</p>}
        {error && <p className="text-red-700 mb-2">{error}</p>}
      </div>
      {conflicts.length > 0 && (
        <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded p-2 mb-2">
          <p className="font-medium">Ye booked / sold units range ke bahar hain, isliye hata nahi sakte:</p>
          <p>{conflicts.join(', ')}</p>
          <p className="mt-1">Range badhao ya pehle in units ka status badlo.</p>
        </div>
      )}

      {shown && (
        <div className="space-y-2">
          <p className="text-gray-700">
            {result ? 'Result' : 'Preview (abhi save nahi hua)'}: <strong>{shown.units.total}</strong> units ·{' '}
            <strong>{shown.units.added}</strong> naye · <strong>{shown.units.kept}</strong> pehle se
          </p>
          <p className="text-xs text-gray-600">
            Available {shown.counts.available} · Booked {shown.counts.booked} · Sold {shown.counts.sold} · On hold {shown.counts.onHold}
          </p>
          <LinkReportView report={shown.link} />
        </div>
      )}
    </LayoutDialog>
  );
}
