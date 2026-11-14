// Shapes of GET /api/public/projects/:slug/layout (design A6, R10.2) as the
// Public_Plot_Page reads them. Read-only: nothing here describes a write.
//
// Finding 9 (design-review MEDIUM): the backend `toPublicPlot` in
// PlotLayoutService.js renames the internal `e.area` field to `areaSqm` in
// the public response. So all client code must read `plot.areaSqm` (m²).
// The old draft type had `area` as primary — that was wrong and is now fixed.

export interface LatLngLit { lat: number; lng: number }
export type PlotStatus = 'available' | 'booked' | 'sold' | 'on-hold';

export interface LayoutCounts { available: number; booked: number; sold: number; onHold: number; total: number }

export interface LayoutPlot {
  id: string;
  plotNumber: string;
  path: LatLngLit[];
  status: PlotStatus;
  /** Area in square metres. Backend public field name is 'areaSqm' (toPublicPlot). */
  areaSqm: number | null;
  /** @deprecated Alias kept for backward compat — use `areaSqm`. */
  area?: number | null;
  facing: string | null;
  label: string | null;
  price?: number | null;
  unit?: { corner?: string | null; dimensions?: string | null } | null;
}

/** corners = NW, NE, SE, SW. previewUrl / detailUrl / imageSize are null for overlays saved before v2. */
export interface PublicOverlay {
  image: { url: string };
  previewUrl: string | null;
  detailUrl: string | null;
  imageSize: { width: number; height: number } | null;
  center: LatLngLit;
  widthM: number;
  heightM: number;
  rotationDeg: number;
  opacity: number;
  corners: LatLngLit[];
}

export interface LayoutRoad { id: string; geometryType: 'polygon' | 'polyline'; path: LatLngLit[]; roadName: string | null; roadType: string | null }
export interface LayoutOpenSpace { id: string; path: LatLngLit[]; label: string | null; category: string | null }

export interface PublicLayout {
  id: string;
  slug: string;
  projectName: string;
  city: string;
  location: string;
  lat: number | null;
  lng: number | null;
  cta: { buttonText: string | null; whatsappNumber: string | null; callNumber: string | null };
  media: { coverImage: string | null; galleryImages: string[]; brochurePdf: string | null; videos: string[] };
  overlay: PublicOverlay | null;
  plots: LayoutPlot[];
  roads: LayoutRoad[];
  openSpaces: LayoutOpenSpace[];
  boundary: { id: string; path: LatLngLit[] }[];
  counts: LayoutCounts;
  priceMode?: 'per-sqft' | 'per-plot' | 'hidden' | null;
  pricePerSqFt?: number | null;
}
