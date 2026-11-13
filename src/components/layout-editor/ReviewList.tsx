'use client';

// ReviewList: filtered + sorted list of draft and approved plots for the
// Review tab (R16.1, R16.7). Shows classification badge, confidence, inline
// plot-number and facing edit.
//
// WHY sort by min(boundaryConfidence, ocrConfidence): showing the most
// uncertain plots first (ascending) means reviewers address the riskiest ones
// without scrolling. The old workflow had no sort and reviewers missed low-
// confidence plots buried in the middle of large layouts.

import { useCallback, useState } from 'react';
import { sortAndFilterPlots, classifyPlot, computeDuplicateFlags, REVIEW_COLORS } from './reviewState.mjs';
import { normalisePlotNumber, parseFacing, FACINGS, PLOT_STATUS_COLORS, PLOT_STATUS_LABELS, normalizePlotStatus } from '@/lib/layoutTools.mjs';

type SortDir = 'asc' | 'desc';
type Filter = 'all' | 'valid' | 'needs-check' | 'invalid' | 'approved';

interface ReviewPlot {
  id: string;
  plotNumber?: string | null;
  status?: string | null;
  facing?: string | null;
  boundaryConfidence?: number | null;
  ocrConfidence?: number | null;
  validationErrors?: string[] | null;
  saved?: boolean;
  provenance?: { approved?: boolean } | null;
  deleted?: boolean;
  [k: string]: unknown;
}

interface ReviewListProps {
  plots: ReviewPlot[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpdatePlotNumber: (id: string, newNumber: string) => void;
  onUpdateFacing: (id: string, facing: string | undefined) => void;
  canEdit: boolean;
}

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  'needs-check': 'Needs Check',
  invalid: 'Invalid',
  valid: 'Valid',
  approved: 'Approved',
};

const CLASS_COLORS: Record<string, string> = {
  invalid: 'bg-red-100 text-red-700 border border-red-200',
  'needs-check': 'bg-amber-100 text-amber-700 border border-amber-200',
  valid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
};

export default function ReviewList({ plots, selectedId, onSelect, onUpdatePlotNumber, onUpdateFacing, canEdit }: ReviewListProps) {
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<Filter>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [shakeId, setShakeId] = useState<string | null>(null);

  const duplicateIds = computeDuplicateFlags(plots);
  const sorted = sortAndFilterPlots(plots, { sortDir, filter, duplicateIds });

  const startEdit = (p: ReviewPlot) => {
    if (!canEdit) return;
    setEditingId(p.id);
    setEditValue(p.plotNumber ?? '');
  };

  const commitEdit = useCallback((id: string) => {
    const result = normalisePlotNumber(editValue);
    if (result === null) {
      // Invalid input → shake animation, revert
      setShakeId(id);
      setTimeout(() => setShakeId(null), 400);
    } else {
      onUpdatePlotNumber(id, result);
    }
    setEditingId(null);
  }, [editValue, onUpdatePlotNumber]);

  const handleFacingChange = (id: string, raw: string) => {
    const f = parseFacing(raw);
    if (f !== null) {
      // null = invalid input (keep old); undefined = 'none' (clear facing)
      onUpdateFacing(id, f);
    }
  };

  const minConf = (p: ReviewPlot) => Math.min(
    Number.isFinite(Number(p.boundaryConfidence)) ? Number(p.boundaryConfidence) : 0,
    Number.isFinite(Number(p.ocrConfidence)) ? Number(p.ocrConfidence) : 0,
  );

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 flex-wrap">
        <div className="flex gap-1" role="group" aria-label="Sort order">
          <button
            type="button"
            onClick={() => setSortDir('asc')}
            aria-pressed={sortDir === 'asc'}
            className={`px-2 py-1 rounded text-xs border ${sortDir === 'asc' ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            Confidence ↑
          </button>
          <button
            type="button"
            onClick={() => setSortDir('desc')}
            aria-pressed={sortDir === 'desc'}
            className={`px-2 py-1 rounded text-xs border ${sortDir === 'desc' ? 'bg-orange-700 text-white border-orange-700' : 'bg-white text-gray-700 border-gray-300'}`}
          >
            Confidence ↓
          </button>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Filter)}
          aria-label="Filter plots"
          className="ml-auto text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-700"
        >
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <option key={f} value={f}>{FILTER_LABELS[f]} ({
              f === 'all' ? plots.filter((p: ReviewPlot) => !p.deleted).length
              : f === 'approved' ? plots.filter((p: ReviewPlot) => !p.deleted && p.saved === true && p.provenance?.approved === true).length
              : plots.filter((p: ReviewPlot) => !p.deleted && classifyPlot(p, duplicateIds) === f).length
            })</option>
          ))}
        </select>
      </div>

      {/* Plot list */}
      <ul className="flex-1 overflow-y-auto divide-y divide-gray-100" aria-label="Plot list">
        {sorted.length === 0 && (
          <li className="px-3 py-4 text-center text-gray-500 text-xs">No plots match this filter.</li>
        )}
        {sorted.map((p: ReviewPlot) => {
          const cls = classifyPlot(p, duplicateIds);
          const isApproved = p.saved === true && p.provenance?.approved === true;
          const badgeClass = isApproved
            ? `border px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white`
            : CLASS_COLORS[cls] + ' px-1.5 py-0.5 rounded-full text-[10px] font-medium';
          const badgeStyle = isApproved
            ? { backgroundColor: PLOT_STATUS_COLORS[normalizePlotStatus(p.status)], borderColor: PLOT_STATUS_COLORS[normalizePlotStatus(p.status)] }
            : {};
          const isSelected = p.id === selectedId;
          const isEditing = editingId === p.id;
          const shaking = shakeId === p.id;

          return (
            <li
              key={p.id}
              className={`px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 ${isSelected ? 'bg-orange-50' : ''}`}
              onClick={() => onSelect(p.id)}
              aria-current={isSelected ? 'true' : undefined}
            >
              {/* Colour dot */}
              <span
                aria-hidden
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: isApproved ? PLOT_STATUS_COLORS[normalizePlotStatus(p.status)] : REVIEW_COLORS[cls as keyof typeof REVIEW_COLORS] ?? '#6b7280' }}
              />

              {/* Plot number (inline edit when canEdit) */}
              <div className="flex-1 min-w-0" onClick={(e) => { if (!isEditing && canEdit) { e.stopPropagation(); startEdit(p); } }}>
                {isEditing ? (
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(p.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(p.id); if (e.key === 'Escape') setEditingId(null); }}
                    className={`w-full text-xs border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-500 ${shaking ? 'animate-shake border-red-400' : 'border-gray-300'}`}
                    aria-label="Edit plot number"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span className={`font-medium text-xs text-gray-900 truncate block ${canEdit ? 'cursor-text' : ''}`}>
                    {p.plotNumber || <span className="text-gray-400 italic">No number</span>}
                  </span>
                )}
              </div>

              {/* Confidence badge */}
              <span className="text-[10px] text-gray-500 flex-shrink-0 tabular-nums">
                {Number.isFinite(Number(p.boundaryConfidence)) ? (Number(p.boundaryConfidence) * 100).toFixed(0) + '%' : '–'}
              </span>

              {/* Classification / status badge */}
              <span className={badgeClass} style={badgeStyle} aria-label={isApproved ? PLOT_STATUS_LABELS[normalizePlotStatus(p.status)] : cls}>
                {isApproved ? PLOT_STATUS_LABELS[normalizePlotStatus(p.status)] : cls}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
