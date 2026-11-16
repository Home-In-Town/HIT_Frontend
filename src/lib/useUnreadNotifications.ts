'use client';
// Unread count for the dashboard bell: GET /notifications?limit=1 every 30 s
// (the response carries unreadCount). Polling only, because the web dashboard
// token is an httpOnly cookie the socket hook cannot read (addendum 11.1).
// Pages that change the count (mark read) call announceNotificationsChanged()
// so the badge updates without waiting for the next tick.
import { useCallback, useEffect, useState } from 'react';
import { notificationsApi } from '@/lib/api';

const EVENT = 'hit-notifications-changed';
const POLL_MS = 30_000;

export function announceNotificationsChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function useUnreadNotifications(enabled: boolean) {
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const r = await notificationsApi.list({ limit: 1 });
      setUnread(r.unreadCount);
    } catch {
      // A failed poll keeps the last count; the next tick tries again.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const first = setTimeout(() => { void refresh(); }, 0);
    const id = setInterval(() => { if (!document.hidden) void refresh(); }, POLL_MS);
    const onChange = () => { void refresh(); };
    window.addEventListener(EVENT, onChange);
    return () => { clearTimeout(first); clearInterval(id); window.removeEventListener(EVENT, onChange); };
  }, [enabled, refresh]);

  return { unread, refresh };
}
