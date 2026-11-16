'use client';
// Keeps a plot-map payload fresh (D10a): a 30 s poll with ?since=<seq> that
// follows the client rules of addendum 8.1, plus (public page only) the
// /public-layout socket, whose events merely trigger the same poll earlier.
//
// WHY the socket only triggers a poll and never writes statuses itself: the
// socket emit does not cross Cloud Run instances, so an event can be missing or
// out of order. The poll answer is the one source of truth; the socket just
// makes it arrive sooner. socket.io-client is imported dynamically so it stays
// out of every other route's chunks.
import { useCallback, useEffect, useRef, useState } from 'react';
import { applyStatuses, decidePoll } from '@/lib/plotMap.mjs';
import type { PlotMapPayload, PollResponse } from '@/types/plotmap';

export const POLL_INTERVAL_MS = 30_000;

export interface PlotMapLiveOptions {
  initial: PlotMapPayload | null;
  loadFull: () => Promise<PlotMapPayload>;
  loadPoll: (since: number) => Promise<PollResponse>;
  /** Public slug: also listen on the unauthenticated /public-layout socket. */
  socketSlug?: string;
  /** Owner side (booking identity is not in the poll) -> fetch the full payload once after a change. */
  fullOnChange?: boolean;
  intervalMs?: number;
}

export function usePlotMapLive(o: PlotMapLiveOptions) {
  const [payload, setPayloadState] = useState<PlotMapPayload | null>(o.initial);
  const [failures, setFailures] = useState(0);
  const ref = useRef(payload);
  const opts = useRef(o);
  opts.current = o;
  const generation = useRef(0);
  const inFlight = useRef(false);

  const setPayload = useCallback((next: PlotMapPayload | null) => {
    ref.current = next;
    setPayloadState(next);
  }, []);

  const refreshFull = useCallback(async () => {
    const gen = ++generation.current;
    try {
      const full = await opts.current.loadFull();
      if (gen !== generation.current) return;
      setPayload(full);
      setFailures(0);
    } catch {
      if (gen === generation.current) setFailures((n) => n + 1);
    }
  }, [setPayload]);

  const poll = useCallback(async () => {
    const have = ref.current;
    if (!have || inFlight.current) return;
    inFlight.current = true;
    const gen = generation.current;
    try {
      const resp = await opts.current.loadPoll(have.seq);
      // A full payload that landed while this poll was in flight is newer.
      if (gen !== generation.current) return;
      const d = decidePoll(have, resp, { fullOnChange: opts.current.fullOnChange });
      if (d.action === 'full') {
        await refreshFull();
      } else if (d.action === 'repaint') {
        setPayload({ ...have, seq: d.seq as number, plots: applyStatuses(have.plots, d.statuses, d.pending) });
        if (d.thenFull) await refreshFull();
      }
      setFailures(0);
    } catch {
      setFailures((n) => n + 1);
    } finally {
      inFlight.current = false;
    }
  }, [refreshFull, setPayload]);

  // 30 s poll, paused while the tab is hidden, immediate on return.
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) void poll(); }, o.intervalMs ?? POLL_INTERVAL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [poll, o.intervalMs]);

  // Public socket: any plotmap_* event just polls sooner.
  useEffect(() => {
    const slug = o.socketSlug;
    if (!slug) return;
    let alive = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sock: any = null;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => { void poll(); }, 250);
    };
    (async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!alive) return;
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? new URL(process.env.NEXT_PUBLIC_API_URL!).origin;
        const s = io(`${socketUrl}/public-layout`, { path: '/socket.io', transports: ['websocket', 'polling'], withCredentials: false });
        s.on('connect', () => { s.emit('join', { slug }); });
        s.on('plotmap_status', soon);
        s.on('plotmap_layout', soon);
        sock = s;
      } catch {
        // No socket URL (relative API base) or the import failed: polling alone is enough.
      }
    })();
    return () => {
      alive = false;
      if (debounce) clearTimeout(debounce);
      sock?.disconnect();
    };
  }, [o.socketSlug, poll]);

  return { payload, setPayload, refreshFull, pollNow: poll, offline: failures >= 2 };
}
