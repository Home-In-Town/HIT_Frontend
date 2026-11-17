// Anonymous plot-map reads (E1). Kept apart from plotmapApi.ts and api.ts on
// purpose: /plots/<slug> is opened from WhatsApp links on phones, so its client
// bundle must not drag in the 2000-line authenticated api module.
import type { PlotMapPayload, PollResponse } from '@/types/plotmap';

export type PublicPlotMapResult =
  | { kind: 'ok'; payload: PlotMapPayload }
  | { kind: 'notfound' }
  | { kind: 'error'; status?: number };

/** '/api' is right in the browser; server components pass an absolute base. */
const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * E1: the public payload. `404 PLOTMAP_NOT_AVAILABLE` (flag off, unknown or
 * unpublished slug, no live layout) is one body for all of them, so the page
 * falls back to the legacy viewer on `notfound`.
 */
export async function getPlotMap(
  slug: string,
  o: { base?: string; revalidate?: number; fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<PublicPlotMapResult> {
  const { base = DEFAULT_BASE, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = o;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const init: RequestInit & { next?: { revalidate: number } } = { signal: ctrl.signal };
    if (o.revalidate !== undefined) init.next = { revalidate: o.revalidate };
    const res = await fetchImpl(`${base}/public/projects/${encodeURIComponent(slug)}/plotmap?sheets=1`, init);
    if (res.status === 404) return { kind: 'notfound' };
    if (!res.ok) return { kind: 'error', status: res.status };
    return { kind: 'ok', payload: (await res.json()) as PlotMapPayload };
  } catch {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

/** Public poll: `?since=` never returns the full payload (addendum 8.1). */
export async function pollPublicPlotMap(slug: string, since: number, base: string = DEFAULT_BASE): Promise<PollResponse> {
  const res = await fetch(`${base}/public/projects/${encodeURIComponent(slug)}/plotmap?since=${since}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`plotmap poll failed (${res.status})`);
  return (await res.json()) as PollResponse;
}
