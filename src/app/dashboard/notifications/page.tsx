'use client';
// Notifications: list, mark one or all read, and open the plot map at the plot
// and request a booking notification is about (addendum 11.3). Polls every 30 s.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, notificationsApi } from '@/lib/api';
import { announceNotificationsChanged } from '@/lib/useUnreadNotifications';
import { plotNotificationHref } from '@/lib/plotMap.mjs';
import type { AppNotification } from '@/types/plotmap';
import { formatWhen } from '@/components/plotmap/format';

const PAGE = 20;
const TYPE_LABEL: Record<string, string> = {
  plot_booking_request: 'Booking request',
  plot_booking_approved: 'Approved',
  plot_booking_rejected: 'Reject',
  plot_booking_cancelled: 'Request wapas li',
  plot_booking_expired: 'Expire',
  plot_booking_reminder: 'Yaad dilana',
  plot_booking_released: 'Plot available',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, append: boolean) => {
    try {
      const r = await notificationsApi.list({ page: p, limit: PAGE, unreadOnly });
      setItems((prev) => (append ? [...prev, ...r.notifications] : r.notifications));
      setUnreadCount(r.unreadCount);
      setHasMore(r.notifications.length === PAGE);
      setPage(p);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { router.replace('/login'); return; }
      setError('Notifications load nahi hui. Dobara try karein.');
    } finally {
      setLoading(false);
    }
  }, [unreadOnly, router]);

  useEffect(() => {
    const first = setTimeout(() => { void load(1, false); }, 0);
    // The poll refreshes the first page only: "Aur dikhao" pages are not thrown away mid-read.
    const id = setInterval(() => { if (!document.hidden && page === 1) void load(1, false); }, 30_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, [load, page]);

  const open = async (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      try { await notificationsApi.markRead(n.id); } catch { /* the next poll shows the real state */ }
      announceNotificationsChanged();
    }
    const href = plotNotificationHref(n);
    if (href) router.push(href);
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
      announceNotificationsChanged();
    } catch {
      setError('Sab ko read mark nahi ho paya. Dobara try karein.');
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 p-3 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Notifications{unreadCount > 0 ? ` (${unreadCount} nayi)` : ''}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            aria-pressed={unreadOnly}
            onClick={() => { setLoading(true); setUnreadOnly((v) => !v); }}
            className={`min-h-[44px] rounded-lg border px-4 text-sm font-semibold ${unreadOnly ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-gray-300 text-gray-800'}`}
          >
            Sirf nayi
          </button>
          <button type="button" disabled={unreadCount === 0} onClick={() => void markAll()} className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800 disabled:opacity-50">
            Sab read karo
          </button>
        </div>
      </header>

      <p role="alert" className="min-h-[1.25rem] text-sm text-red-700">{error ?? ''}</p>

      <ul className="flex flex-col gap-2" aria-label="Notifications">
        {items.map((n) => {
          const href = plotNotificationHref(n);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void open(n)}
                aria-label={`${n.read ? '' : 'Nayi: '}${n.title}. ${n.message}`}
                className={`flex min-h-[44px] w-full flex-col gap-1 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${n.read ? 'border-gray-200 bg-white' : 'border-orange-300 bg-orange-50'}`}
              >
                <span className="flex items-center justify-between gap-2 text-xs text-gray-600">
                  <span className="rounded-full border border-gray-300 px-2 py-0.5 font-medium text-gray-800">{TYPE_LABEL[n.type] ?? 'System'}</span>
                  <span>{formatWhen(n.createdAt)}</span>
                </span>
                <span className="text-sm font-semibold text-gray-900">{!n.read && <span aria-hidden="true">● </span>}{n.title}</span>
                {n.message && <span className="text-sm text-gray-700">{n.message}</span>}
                {href && <span className="text-xs font-semibold text-orange-800">Plot map kholo →</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {!loading && items.length === 0 && !error && (
        <p className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">{unreadOnly ? 'Koi nayi notification nahi hai.' : 'Abhi koi notification nahi hai.'}</p>
      )}
      {loading && <p className="text-sm text-gray-600">Load ho raha hai…</p>}
      {hasMore && !loading && (
        <button type="button" className="min-h-[44px] rounded-lg border border-gray-300 text-sm font-semibold text-gray-800" onClick={() => void load(page + 1, true)}>Aur dikhao</button>
      )}
    </div>
  );
}
