// Plot-map REST client (addendum section 8). Web is the OWNER side only in v1
// (OD-5): E2, E4-E10, E13-E17, E19 and E20 are called from here; the broker
// calls (E11 request, E12 cancel, E18 my requests) live in the mobile app, so
// they are deliberately not written here.
//
// Every route answers { error, code } on failure; ApiError.body carries it, and
// `apiCode(e)` reads the code so screens branch on the contract, not on text.
import {
  API_URL, ApiError, COMMON_FETCH_OPTIONS, getAuthHeaders, handleResponse,
} from '@/lib/api';
import type {
  BookingForOwner, BookingStatus, LayoutDetailResponse, LayoutListItem, PlotEditResponse, PlotMapPayload, PlotRef,
  PollResponse, PublishResponse,
} from '@/types/plotmap';

export { getPlotMap, pollPublicPlotMap } from '@/lib/plotmapPublic';
export type { PublicPlotMapResult } from '@/lib/plotmapPublic';

/** The contract error code of a failed call, or null. */
export function apiCode(e: unknown): string | null {
  if (e instanceof ApiError) {
    const code = (e.body as { code?: unknown } | null)?.code;
    return typeof code === 'string' ? code : null;
  }
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : null;
}

/** Details object of a failed call (blockers, unmatched, conflictPlotId). */
export function apiBody<T = Record<string, unknown>>(e: unknown): T | null {
  return e instanceof ApiError && e.body && typeof e.body === 'object' ? (e.body as T) : null;
}

const base = (projectId: string) => `${API_URL}/projects/${encodeURIComponent(projectId)}/plotmap`;

async function send<T>(url: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown, extra?: HeadersInit): Promise<T> {
  const res = await fetch(url, {
    ...COMMON_FETCH_OPTIONS,
    method,
    cache: 'no-store',
    headers: { ...getAuthHeaders(), ...(extra ?? {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return handleResponse<T>(res);
}

export const plotmapApi = {
  /** E2: caller's view. Without `since` the full payload, with it the poll answer. */
  getMap(projectId: string): Promise<PlotMapPayload> {
    return send(base(projectId), 'GET');
  },
  poll(projectId: string, since: number): Promise<PollResponse> {
    return send(`${base(projectId)}?since=${since}`, 'GET');
  },

  // generation (E4-E10)
  generate(projectId: string, imageKey: string, pdfPage?: number): Promise<{ layoutId: string; runId: string; state: 'generating'; warnings: { code: string; message: string }[] }> {
    return send(`${base(projectId)}/generate`, 'POST', pdfPage ? { imageKey, pdfPage } : { imageKey });
  },
  listLayouts(projectId: string): Promise<{ layouts: LayoutListItem[] }> {
    return send(`${base(projectId)}/layouts`, 'GET');
  },
  getLayout(projectId: string, layoutId: string): Promise<LayoutDetailResponse> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}`, 'GET');
  },
  cancel(projectId: string, layoutId: string): Promise<{ changed: boolean }> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}/cancel`, 'POST', {});
  },
  /** Check & fix: change the number of one plot. */
  editNumber(projectId: string, layoutId: string, plotId: string, number: string, expectedVersion?: number): Promise<PlotEditResponse> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}/plots/${encodeURIComponent(plotId)}`, 'PATCH',
      expectedVersion === undefined ? { number } : { number, expectedVersion });
  },
  /** Check & fix: remove a false box. No undo. */
  deletePlot(projectId: string, layoutId: string, plotId: string, expectedVersion?: number): Promise<PlotEditResponse> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}/plots/${encodeURIComponent(plotId)}`, 'PATCH',
      expectedVersion === undefined ? { deleted: true } : { deleted: true, expectedVersion });
  },
  publish(projectId: string, layoutId: string, expectedVersion: number): Promise<PublishResponse> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}/publish`, 'POST', { expectedVersion });
  },
  deleteDraft(projectId: string, layoutId: string): Promise<{ deleted: boolean }> {
    return send(`${base(projectId)}/layouts/${encodeURIComponent(layoutId)}`, 'DELETE');
  },

  // booking decisions, owner side (E13-E17, E19)
  approve(projectId: string, bookingId: string): Promise<{ booking: BookingForOwner; plot: PlotRef; rejectedCount: number; changed: boolean }> {
    return send(`${base(projectId)}/bookings/${encodeURIComponent(bookingId)}/approve`, 'POST', {});
  },
  reject(projectId: string, bookingId: string, reason?: string): Promise<{ booking: BookingForOwner; changed: boolean }> {
    return send(`${base(projectId)}/bookings/${encodeURIComponent(bookingId)}/reject`, 'POST', reason ? { reason } : {});
  },
  release(projectId: string, plotId: string, expectedStatusVersion?: number): Promise<{ plot: PlotRef; changed: boolean; releasedBookingId: string | null }> {
    return send(`${base(projectId)}/plots/${encodeURIComponent(plotId)}/release`, 'POST',
      expectedStatusVersion === undefined ? {} : { expectedStatusVersion });
  },
  markSold(projectId: string, plotId: string, expectedStatusVersion?: number): Promise<{ plot: PlotRef; changed: boolean; rejectedCount: number }> {
    return send(`${base(projectId)}/plots/${encodeURIComponent(plotId)}/mark-sold`, 'POST',
      expectedStatusVersion === undefined ? {} : { expectedStatusVersion });
  },
  listBookings(projectId: string, o: { status?: BookingStatus | 'all'; plotId?: string; page?: number; limit?: number } = {}): Promise<{
    bookings: BookingForOwner[]; page: number; limit: number; total: number; counts: { pending: number; approved: number };
  }> {
    const q = new URLSearchParams();
    if (o.status) q.set('status', o.status);
    if (o.plotId) q.set('plotId', o.plotId);
    if (o.page) q.set('page', String(o.page));
    if (o.limit) q.set('limit', String(o.limit));
    const qs = q.toString();
    return send(`${base(projectId)}/bookings${qs ? `?${qs}` : ''}`, 'GET');
  },
  getBooking(projectId: string, bookingId: string): Promise<{ booking: BookingForOwner }> {
    return send(`${base(projectId)}/bookings/${encodeURIComponent(bookingId)}`, 'GET');
  },

  /** E20, admin only. No UI in v1; kept so an admin console can call it. */
  setEnabled(projectId: string, enabled: boolean): Promise<{ enabled: boolean }> {
    return send(`${base(projectId)}/enabled`, 'PUT', { enabled });
  },
};
