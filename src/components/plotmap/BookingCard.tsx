'use client';
// One booking request as the OWNER side sees it (D6b): the requester's profile
// and phone (call / WhatsApp), the note, how long is left, and Approve / Reject
// for a pending request. Never rendered for brokers: the phone is only in the
// owner-side payload.
import { useState } from 'react';
import type { BookingForOwner } from '@/types/plotmap';
import { formatWhen, telHref, timeLeft, whatsappHref } from './format';

const STATUS_TEXT: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Reject hui',
  cancelled: 'Broker ne wapas li',
  expired: 'Expire ho gayi',
  released: 'Release hui',
};
const REASON_TEXT: Record<string, string> = {
  AUTO_PLOT_ALLOTTED: 'Plot kisi aur ko allot ho gaya',
  PLOT_SOLD: 'Plot sold mark ho gaya',
  EXPIRED: 'Request expire ho gayi',
  RELEASED_BY_OWNER: 'Owner ne plot available kar diya',
  CANCELLED_BY_REQUESTER: 'Broker ne request wapas li',
  LAYOUT_REPLACED: 'Layout badal gaya',
  LAYOUT_CONFLICT: 'Plot do baar approve ho gaya',
};

export default function BookingCard({
  booking, busy, highlighted, onApprove, onReject, onShowPlot,
}: {
  booking: BookingForOwner;
  busy: boolean;
  highlighted?: boolean;
  onApprove?: (b: BookingForOwner) => void;
  onReject?: (b: BookingForOwner, reason: string) => void;
  onShowPlot?: (plotId: string) => void;
}) {
  const r = booking.requester;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);
  const tel = telHref(r.phone);
  const wa = whatsappHref(r.phone, `Plot ${booking.plotNumber} ki request ke baare mein`);
  const pending = booking.status === 'pending';
  const reasonText = booking.decisionReason ? (REASON_TEXT[booking.decisionReason] ?? booking.decisionReason) : '';
  const btn = 'min-h-[44px] rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 disabled:opacity-50';

  return (
    <article
      id={`booking-${booking.id}`}
      className={`rounded-xl border bg-white p-3 ${highlighted ? 'border-orange-500 ring-2 ring-orange-200' : 'border-gray-200'}`}
      aria-label={`Plot ${booking.plotNumber} ki request, ${r.name}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-[44px] text-left text-base font-bold text-gray-900 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500"
          onClick={() => onShowPlot?.(booking.plotId)}
        >
          Plot {booking.plotNumber}
        </button>
        <span className="rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-800">{STATUS_TEXT[booking.status] ?? booking.status}</span>
      </header>

      <div className="mt-2 flex items-start gap-3">
        {r.profilePictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary profile host
          <img src={r.profilePictureUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-lg font-bold text-orange-800" aria-hidden="true">
            {(r.name || '?').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 text-sm text-gray-800">
          <p className="flex flex-wrap items-center gap-2 font-semibold text-gray-900">
            {r.name}
            {r.verified && <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">✔ Verified</span>}
          </p>
          <p className="text-gray-600">{[r.role, r.designation].filter(Boolean).join(' · ')}</p>
          {r.companyName && <p>{r.companyName}</p>}
          {r.reraAgentNo && <p className="text-gray-600">RERA {r.reraAgentNo}</p>}
          {r.businessCity && <p className="text-gray-600">{r.businessCity}</p>}
          {r.phone && <p className="mt-1 font-medium text-gray-900">{r.phone}</p>}
        </div>
      </div>

      {(tel || wa) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {tel && <a href={tel} className={`${btn} inline-flex items-center border border-gray-300 text-gray-800`}>Call</a>}
          {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} inline-flex items-center border border-gray-300 text-gray-800`}>WhatsApp</a>}
        </div>
      )}

      {booking.note && <p className="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-800">Note: “{booking.note}”</p>}

      <p className="mt-2 text-xs text-gray-600">
        Request: {formatWhen(booking.createdAt)}
        {pending && <> · Expire hone mein {timeLeft(booking.expiresAt)}</>}
        {!pending && booking.decidedAt && <> · {formatWhen(booking.decidedAt)}{booking.decidedBy ? ` · ${booking.decidedBy.name}` : ''}</>}
        {reasonText && !pending && <> · {reasonText}</>}
      </p>

      {pending && onApprove && onReject && (
        <div className="mt-3">
          {!rejecting && !confirmApprove && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} className={`${btn} border border-gray-300 text-gray-800`} onClick={() => setRejecting(true)}>Reject</button>
              <button type="button" disabled={busy} className={`${btn} bg-orange-600 text-white`} onClick={() => setConfirmApprove(true)}>Approve</button>
            </div>
          )}
          {confirmApprove && (
            <div role="alertdialog" aria-label="Approve confirm" className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-gray-900">
              <p>Plot {booking.plotNumber} {r.name} ko approve karein? Is plot ki baaki saari pending requests apne aap reject ho jayengi.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} className={`${btn} border border-gray-300 bg-white`} onClick={() => setConfirmApprove(false)}>Wapas</button>
                <button type="button" disabled={busy} className={`${btn} bg-orange-600 text-white`} onClick={() => { setConfirmApprove(false); onApprove(booking); }}>Haan, approve</button>
              </div>
            </div>
          )}
          {rejecting && (
            <div className="rounded-lg border border-gray-300 p-3">
              <label className="block text-sm text-gray-700">
                Reject ka karan (optional, max 300 akshar)
                <textarea
                  value={reason}
                  maxLength={300}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-2 text-sm text-gray-900"
                  rows={2}
                />
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} className={`${btn} border border-gray-300`} onClick={() => { setRejecting(false); setReason(''); }}>Wapas</button>
                <button type="button" disabled={busy} className={`${btn} bg-red-700 text-white`} onClick={() => { setRejecting(false); onReject(booking, reason.trim()); setReason(''); }}>Reject karo</button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
