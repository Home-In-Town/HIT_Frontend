// Wire types of the plot-map API (addendum sections 7 and 8, contract
// "plotmap/1"). Never edit these without editing the shared fixture first: the
// fixture is the one place web, mobile and backend agree on the JSON shape.

/** What a non-owner viewer can tell apart. */
export type PublicStatus = 'available' | 'booked';
/** Owner-side wire status (four values). */
export type OwnerStatus = 'available' | 'booked' | 'sold' | 'on-hold';
export type PlotWireStatus = OwnerStatus;
export type PlotKind = 'plot' | 'cp' | 'road' | 'open' | 'other';
export type ViewerRole = 'owner_side' | 'broker';

export interface PlotMapProject {
  name: string;
  city: string;
}

export interface PlotMapImage {
  url: string;
  w: number;
  h: number;
}

export interface BookingSummary {
  id: string;
  status: string;
  since: string;
  requester: { id: string; name: string; companyName: string | null; phone: string | null };
}

export interface PlotMapPlot {
  id: string;
  /** Sheet idx the plot is drawn on. Only sent with `?sheets=1`; absent = sheet 0 (legacy). */
  sheet?: number;
  key: string;
  number: string | null;
  kind: PlotKind;
  poly: [number, number][];
  labelAt: [number, number];
  area: number | null;
  areaUnit: 'sqm' | 'sqft' | 'sqyd' | null;
  areaApprox: boolean;
  /** Present for non-plot kinds ("C.P.", "30 Mt Wide Road"). */
  label?: string | null;
  /** Absent for non-plot kinds. */
  status?: PlotWireStatus;
  // owner side only
  statusVersion?: number;
  pendingCount?: number;
  booking?: BookingSummary | null;
}

export interface PlotMapCounts {
  plots: number;
  available: number;
  booked: number;
  // owner side only
  sold?: number;
  onHold?: number;
  pending?: number;
}

export interface MyRequest {
  bookingId: string;
  plotId: string;
  status: 'pending' | 'approved';
  createdAt: string;
  expiresAt: string;
}

export interface ViewerInfo {
  role: ViewerRole;
  canRequest: boolean;
  reason: string | null;
}

/** One drawing of a multi-sheet layout (viewer side). Public sheets carry only these keys. */
export interface PlotMapSheet {
  idx: number;
  name: string;
  image: PlotMapImage;
  counts: PlotMapCounts;
}
export interface PlotMapPayload {
  layoutId: string;
  version: number;
  seq: number;
  project: PlotMapProject;
  /** = sheets[0].image (kept for old readers and the share preview). */
  image: PlotMapImage;
  /** Present only when requested with `?sheets=1`; a legacy layout answers one virtual sheet. */
  sheets?: PlotMapSheet[];
  plots: PlotMapPlot[];
  counts: PlotMapCounts;
  viewer?: ViewerInfo;
  myRequests?: MyRequest[];
}

export type PollResponse =
  | { layoutId: string; version: number; seq: number; changed: false }
  | {
      layoutId: string;
      version: number;
      seq: number;
      changed: true;
      statuses: Record<string, PlotWireStatus>;
      pending?: Record<string, number>;
    };

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired' | 'released';

export interface RequesterProfile {
  id: string;
  name: string;
  phone: string | null;
  role: string | null;
  companyName: string | null;
  designation: string | null;
  reraAgentNo: string | null;
  profilePictureUrl: string | null;
  businessCity: string | null;
  verified: boolean;
  verifiedVia: string | null;
}

export interface BookingForOwner {
  id: string;
  projectId: string;
  layoutId: string;
  plotId: string;
  plotNumber: string;
  plotArea: number | null;
  status: BookingStatus;
  note: string | null;
  createdAt: string;
  expiresAt: string;
  decidedAt: string | null;
  decisionReason: string | null;
  autoRejected: boolean;
  requester: RequesterProfile;
  decidedBy: { id: string; name: string } | null;
  events: { at: string; by: string | null; type: string; reason?: string | null }[];
}

export interface PlotRef {
  id: string;
  status: OwnerStatus;
  statusVersion: number;
}

// ── Generation / editor (E4-E10) ────────────────────────────────────────────

export type LayoutState = 'generating' | 'review' | 'published' | 'failed' | 'archived';

export interface LayoutStats {
  plots: number;
  cp: number;
  roads: number;
  flagged: number;
}

export interface LayoutListItem {
  id: string;
  state: LayoutState;
  isDraft: boolean;
  isLive: boolean;
  createdAt: string;
  version: number;
  stats: LayoutStats;
  sheetCount?: number;
}

export interface Blocker {
  code: 'NO_PLOTS' | 'NO_NUMBER' | 'DUP_NUMBER' | 'SHEET_FAILED';
  plotIds: string[];
  count: number;
  /** SHEET_FAILED only: idx of every failed sheet. */
  sheets?: number[];
}

export type SheetState = 'queued' | 'generating' | 'done' | 'failed';

/** E6 `layout.sheets[]`: the owner's per-sheet progress and review data. */
export interface LayoutSheet {
  idx: number;
  name: string;
  state: SheetState;
  image: PlotMapImage;
  stats: LayoutStats;
  warnings: { code: string; message: string }[];
  failure: { code: string; message: string } | null;
  attempts: number;
}

/** One entry of the E4 body. */
export interface GenerateSheetInput {
  imageKey: string;
  pdfPage?: number;
}

export interface GenerateResponse {
  layoutId: string;
  runId: string;
  runIds?: string[];
  state: 'generating';
  sheets?: { idx: number; name: string; state: SheetState }[];
  warnings: { code: string; message: string }[];
}

export type PlotFlag =
  | 'no_number' | 'dup_number' | 'low_conf' | 'tiny' | 'area_outlier' | 'approx_geometry' | 'ocr_vlm_mismatch';

export interface DraftPlot extends PlotMapPlot {
  flags: PlotFlag[];
  conf: { geometry: number; number: number; area: number };
  provenance: 'ai' | 'edited';
}

export interface LayoutDetail {
  id: string;
  state: LayoutState;
  isDraft: boolean;
  isLive: boolean;
  version: number;
  seq: number;
  image: PlotMapImage;
  createdAt: string;
  elapsedSec?: number;
  stats: LayoutStats;
  /** Absent from an old backend; the editor then treats the layout as one sheet. */
  sheets?: LayoutSheet[];
  generation: {
    startedAt: string | null;
    finishedAt: string | null;
    provider: string | null;
    model: string | null;
    warnings: { code: string; message: string }[];
    stats: LayoutStats | null;
    failure: { code: string; message: string } | null;
  };
}

export interface LayoutDetailResponse {
  layout: LayoutDetail;
  plots?: (DraftPlot | PlotMapPlot)[];
  blockers: Blocker[];
}

export interface PlotEditResponse {
  plot: { id: string; number?: string; flags?: PlotFlag[]; provenance?: 'ai' | 'edited'; deleted?: true };
  reflagged: { id: string; flags: PlotFlag[] }[];
  layout: { version: number; blockers: Blocker[] };
}

export interface PublishResponse {
  published: boolean;
  layoutId: string;
  carried: { plots: number; bookings: number };
  changed: boolean;
}

// ── Notifications ───────────────────────────────────────────────────────────

export interface PlotNotificationData {
  projectId?: string;
  slug?: string;
  plotId?: string;
  plotNumber?: string;
  bookingId?: string;
  layoutId?: string;
  reason?: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  reference?: { model: string; id: string } | null;
  data?: PlotNotificationData | null;
  createdAt: string;
}
