// Shapes of GET /api/public/projects/:slug/layout (design A6, R10.2) as the
// Public_Plot_Page reads them. Read-only: nothing here describes a write.

export interface LatLngLit { lat: number; lng: number }
export type PlotStatus = 'available' | 'booked' | 'sold' | 'on-hold';

export interface LayoutCounts { available: number; booked: number; sold: number; onHold: number; total: number }

export interface LayoutPlot {
  id: string;
  plotNumber: string;
  path: LatLngLit[];
  status: PlotStatus;
  areaSqm: number | null;
  facing: string | null;
  label: string | null;
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
}
