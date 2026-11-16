'use client';
// Plot detail sheet. What it offers is decided by bookButtonState(), the same
// function (and fixture) the mobile app uses.
//
// Web is the OWNER side in v1 (OD-5): the owner gets Release / Mark sold /
// Review requests and sees which broker booked the plot (name, company, phone).
// Everyone else gets the plot's facts plus their state as text. A broker or
// anonymous visitor is told to use the mobile app instead of being given a
// button that would do nothing: web has no request or cancel call.
import { useEffect, useRef, useState } from 'react';
import { bookButtonState, statusLabel, styleForStatus } from '@/lib/plotMap.mjs';
import type { PlotMapPayload, PlotMapPlot } from '@/types/plotmap';
import { formatArea } from './PlotMapViewer';
import { formatWhen, telHref, whatsappHref } from './format';

export interface OwnerHandlers {
  release: (plot: PlotMapPlot) => Promise<void>;
  markSold: (plot: PlotMapPlot) => Promise<void>;
  reviewRequests: (plot: PlotMapPlot) => void;
}

export default function PlotSheet({
  payload, plot, owner, busy, error, onClose,
}: {
  payload: PlotMapPayload;
  plot: PlotMapPlot;
  owner?: OwnerHandlers;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
}) {
  const role = payload.viewer?.role;
  const state = bookButtonState(payload, plot.id);
  const ownerSide = role === 'owner_side';
  const status = String(plot.status ?? 'booked');
  const st = styleForStatus(status);
  const [confirm, setConfirm] = useState<'release' | 'mark_sold' | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const area = formatArea(plot.area, plot.areaUnit, plot.areaApprox);
  const b = plot.booking;
  const tel = telHref(b?.requester.phone);
  const wa = whatsappHref(b?.requester.phone, `Plot ${plot.number} ke baare mein`);

  // Move focus into the sheet when a plot is picked so keyboard and screen-reader users land on it.
  useEffect(() => { headingRef.current?.focus(); }, [plot.id]);
  // Reset the confirm step when another plot is picked, during render (not in an effect).
  const [confirmFor, setConfirmFor] = useState(plot.id);
  if (confirmFor !== plot.id) { setConfirmFor(plot.id); setConfirm(null); }

  const btn = 'min-h-[44px] rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50';

  return (
    <aside
      role="region"
      aria-label={`Plot ${plot.number} ki details`}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl md:static md:z-auto md:max-h-none md:rounded-xl md:shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold text-gray-900 outline-none">Plot {plot.number ?? '?'}</h2>
        <button type="button" className={`${btn} border border-gray-300 text-gray-800`} onClick={onClose} aria-label="Plot details band karo">Band karo</button>
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-800">
        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold" style={{ borderColor: st.stroke }}>
          <svg width="14" height="14" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2" fill={st.fill} fillOpacity="0.5" stroke={st.stroke} strokeWidth="1.5" /></svg>
          {statusLabel(status, ownerSide ? 'owner_side' : 'public')}
        </span>
        {area && <span>{area}</span>}
      </p>

      {ownerSide ? (
        <div className="mt-3 flex flex-col gap-3">
          {b && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-900">
              <p className="font-semibold">{plot.status === 'sold' ? 'Sold' : 'Booked'} by {b.requester.name}{b.requester.companyName ? ` (${b.requester.companyName})` : ''}</p>
              {b.since && <p className="text-gray-600">{formatWhen(b.since)}</p>}
              {b.requester.phone && <p className="mt-1 font-medium">{b.requester.phone}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {tel && <a href={tel} className={`${btn} inline-flex items-center border border-gray-300`}>Broker ko call</a>}
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} inline-flex items-center border border-gray-300`}>WhatsApp</a>}
              </div>
            </div>
          )}
          {!b && plot.status !== 'available' && <p className="text-sm text-gray-600">Is plot par kisi broker ki booking record nahi hai (owner ne seedha mark kiya).</p>}

          {(plot.pendingCount ?? 0) > 0 && (
            <p className="text-sm font-medium text-orange-900">{plot.pendingCount} request pending hain.</p>
          )}

          {!confirm && (
            <div className="flex flex-wrap gap-2">
              {state.ownerActions?.includes('review_requests') && (
                <button type="button" className={`${btn} bg-orange-600 text-white`} disabled={busy} onClick={() => owner?.reviewRequests(plot)}>Requests dekho ({plot.pendingCount})</button>
              )}
              {state.ownerActions?.includes('release') && (
                <button type="button" className={`${btn} border border-gray-300 text-gray-900`} disabled={busy} onClick={() => setConfirm('release')}>Available karo</button>
              )}
              {state.ownerActions?.includes('mark_sold') && (
                <button type="button" className={`${btn} border border-gray-300 text-gray-900`} disabled={busy} onClick={() => setConfirm('mark_sold')}>Sold mark karo</button>
              )}
            </div>
          )}
          {confirm && (
            <div role="alertdialog" aria-label="Confirm" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-gray-900">
              <p>
                {confirm === 'release'
                  ? `Plot ${plot.number} ko wapas Available karein? ${b ? `${b.requester.name} ko notification jayegi.` : ''}`
                  : `Plot ${plot.number} ko Sold mark karein? ${plot.status === 'available' && (plot.pendingCount ?? 0) > 0 ? 'Is plot ki pending requests apne aap reject ho jayengi.' : ''}`}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" className={`${btn} border border-gray-300 bg-white`} disabled={busy} onClick={() => setConfirm(null)}>Wapas</button>
                <button
                  type="button"
                  className={`${btn} bg-orange-600 text-white`}
                  disabled={busy}
                  onClick={async () => {
                    const action = confirm;
                    setConfirm(null);
                    if (action === 'release') await owner?.release(plot);
                    else await owner?.markSold(plot);
                  }}
                >
                  {busy ? 'Ho raha hai…' : 'Haan'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 text-sm text-gray-800">
          <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-semibold text-gray-900" aria-live="polite">
            {state.label}
          </p>
          <p className="text-gray-600">
            {role === 'broker'
              ? 'Plot request bhejne ya wapas lene ke liye HomeInTown mobile app use karein.'
              : state.action === 'login_to_book'
                ? 'Booking ke liye HomeInTown app mein login karein.'
                : 'Ye plot abhi available nahi hai.'}
          </p>
        </div>
      )}

      <p role="alert" className="mt-2 min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>
    </aside>
  );
}
