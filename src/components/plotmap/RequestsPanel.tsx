'use client';
// Owner-side request list (E17) with Approve / Reject (E13, E14). Reloads when
// `refreshKey` changes (the map's poll saw a new seq), so a request that arrives
// while the owner is looking at the page shows up without a manual refresh.
import { useCallback, useEffect, useRef, useState } from 'react';
import { plotmapApi, apiCode } from '@/lib/plotmapApi';
import { plotmapErrorText } from '@/lib/plotMap.mjs';
import type { BookingForOwner, BookingStatus } from '@/types/plotmap';
import BookingCard from './BookingCard';

type Tab = 'pending' | 'approved' | 'all';
const PAGE = 20;
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'all', label: 'Sab' },
];

export default function RequestsPanel({
  projectId, plotId, plotNumber, highlightBookingId, refreshKey, onChanged, onShowPlot, onClearPlot,
}: {
  projectId: string;
  /** Only requests for this plot (opened from the plot sheet). */
  plotId?: string | null;
  plotNumber?: string | null;
  highlightBookingId?: string | null;
  refreshKey: number;
  /** A decision changed plot statuses: refresh the map now. */
  onChanged: () => void;
  onShowPlot: (plotId: string) => void;
  onClearPlot: () => void;
}) {
  const [tab, setTab] = useState<Tab>(highlightBookingId ? 'all' : 'pending');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<BookingForOwner[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [extra, setExtra] = useState<BookingForOwner | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (p: number, append: boolean) => {
    const my = ++seq.current;
    setLoading(true);
    try {
      const r = await plotmapApi.listBookings(projectId, { status: tab as BookingStatus | 'all', plotId: plotId ?? undefined, page: p, limit: PAGE });
      if (my !== seq.current) return;
      setItems((prev) => (append ? [...prev, ...r.bookings] : r.bookings));
      setTotal(r.total);
      setCounts(r.counts);
      setPage(p);
    } catch (e) {
      if (my === seq.current) setNotice({ kind: 'error', text: plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined) });
    } finally {
      if (my === seq.current) setLoading(false);
    }
  }, [projectId, tab, plotId]);

  useEffect(() => { void load(1, false); }, [load, refreshKey]);

  // A notification can point at a request that is not on the first page.
  useEffect(() => {
    if (!highlightBookingId || loading || items.some((b) => b.id === highlightBookingId)) { setExtra(null); return; }
    let alive = true;
    plotmapApi.getBooking(projectId, highlightBookingId).then((r) => { if (alive) setExtra(r.booking); }).catch(() => { if (alive) setExtra(null); });
    return () => { alive = false; };
  }, [highlightBookingId, loading, items, projectId]);

  useEffect(() => {
    if (!highlightBookingId || loading) return;
    document.getElementById(`booking-${highlightBookingId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlightBookingId, loading, items, extra]);

  const afterChange = async () => {
    await load(1, false);
    onChanged();
  };

  const approve = async (b: BookingForOwner) => {
    setBusyId(b.id);
    setNotice(null);
    try {
      const r = await plotmapApi.approve(projectId, b.id);
      setNotice({
        kind: 'ok',
        text: `Plot ${b.plotNumber} ${b.requester.name} ko approve ho gaya.${r.rejectedCount > 0 ? ` Baaki ${r.rejectedCount} request(s) apne aap reject ho gayi.` : ''}`,
      });
    } catch (e) {
      setNotice({ kind: 'error', text: plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined) });
    } finally {
      setBusyId(null);
      await afterChange();
    }
  };

  const reject = async (b: BookingForOwner, reason: string) => {
    setBusyId(b.id);
    setNotice(null);
    try {
      await plotmapApi.reject(projectId, b.id, reason || undefined);
      setNotice({ kind: 'ok', text: `Plot ${b.plotNumber} ki request reject kar di.` });
    } catch (e) {
      setNotice({ kind: 'error', text: plotmapErrorText(apiCode(e), e instanceof Error ? e.message : undefined) });
    } finally {
      setBusyId(null);
      await afterChange();
    }
  };

  const tabBtn = (t: { id: Tab; label: string }) => {
    const n = t.id === 'pending' ? counts.pending : t.id === 'approved' ? counts.approved : null;
    return (
      <button
        key={t.id}
        type="button"
        role="tab"
        aria-selected={tab === t.id}
        onClick={() => { setTab(t.id); setPage(1); }}
        className={`min-h-[44px] flex-1 rounded-lg border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${tab === t.id ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-gray-300 bg-white text-gray-800'}`}
      >
        {t.label}{n !== null ? ` (${n})` : ''}
      </button>
    );
  };

  return (
    <section aria-label="Booking requests" className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-gray-900">Booking requests</h2>
      {plotId && (
        <p className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-2 text-sm text-gray-900">
          <span>Sirf Plot {plotNumber ?? ''} ki requests</span>
          <button type="button" className="min-h-[44px] font-semibold text-orange-800 underline" onClick={onClearPlot}>Sab dikhao</button>
        </p>
      )}
      <div role="tablist" aria-label="Request filter" className="flex gap-2">{TABS.map(tabBtn)}</div>
      <div role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
        {notice && <p className={notice.kind === 'ok' ? 'text-green-800' : 'text-red-700'}>{notice.text}</p>}
      </div>
      {extra && (
        <BookingCard booking={extra} busy={busyId === extra.id} highlighted onApprove={approve} onReject={reject} onShowPlot={onShowPlot} />
      )}
      {items.map((b) => (
        <BookingCard key={b.id} booking={b} busy={busyId === b.id} highlighted={b.id === highlightBookingId} onApprove={approve} onReject={reject} onShowPlot={onShowPlot} />
      ))}
      {!loading && items.length === 0 && !extra && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
          {tab === 'pending' ? 'Abhi koi pending request nahi hai.' : 'Is filter mein koi request nahi hai.'}
        </p>
      )}
      {loading && <p className="text-sm text-gray-600">Load ho raha hai…</p>}
      {items.length < total && !loading && (
        <button type="button" className="min-h-[44px] rounded-lg border border-gray-300 text-sm font-semibold text-gray-800" onClick={() => void load(page + 1, true)}>
          Aur dikhao ({total - items.length} baaki)
        </button>
      )}
    </section>
  );
}
