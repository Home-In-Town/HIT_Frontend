// Project Types for Dynamic Sales Website
//sales-website-private-dev\frontend\src\types\project.ts
export type ProjectType = 'flat' | 'plot';

export type ProjectStatus = 'pre-launch' | 'under-construction' | 'ready-to-move';
export interface Landmark {
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string;
  placeId: string;
}

export type PlotStatus = 'available' | 'booked' | 'sold' | 'on-hold';
export type OpenSpaceCategory = 'park' | 'clubhouse' | 'temple' | 'amenity' | 'open-space' | 'other';

export interface LayoutEntity {
  id: string;
  // 'open-space' (park, clubhouse, ...) is new: before, a garden could only be
  // drawn as a plot or a road, so it showed up as a plot for sale.
  type: 'project-boundary' | 'subplot' | 'road' | 'ai-boundary' | 'open-space';
  geometryType: 'polygon' | 'polyline';
  path: { lat: number; lng: number }[];
  aiBoundaryId?: string;
  deleted?: boolean;
  roadType?: 'lane' | 'internal' | 'main';
  // Server-managed on the full PUT (stored value wins): change it only via
  // PATCH /projects/:id/plots/:entityId/status.
  status?: PlotStatus;
  plotNumber?: string;
  area?: number;
  facing?: 'north' | 'south' | 'east' | 'west';
  roadName?: string;
  // open-space only
  label?: string;
  category?: OpenSpaceCategory;
  // Server-managed (link-units / status PATCH). Read-only here; the full PUT ignores them.
  unitId?: string | null;
  updatedAt?: string | null;
  saved?: boolean;
}

// Rotated layout-plan image placed on the map (PUT /projects/:id/layout-overlay).
// Separate from `layoutImage`, which is the legacy html2canvas map screenshot.
export interface LayoutOverlay {
  image?: FileData | null;
  center?: { lat: number; lng: number } | null;
  widthM?: number | null;
  heightM?: number | null;
  rotationDeg?: number | null;
  opacity?: number | null;
  // Overlay v2 (design A4). All optional: overlays saved before v2 have none.
  preview?: FileData | null;
  detail?: FileData | null;
  imageSize?: { width: number; height: number } | null;
  controlPoints?: { u: number; v: number; lat: number; lng: number; role: 'align' | 'check' }[] | null;
  sourcePdf?: { page: number; extraRotationDeg: number } | null;
  savedAt?: string | null;
}

export type FileData = {
  url: string;
  key: string;
};

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  city: string;
  location: string;
  latitude?: number;
  longitude?: number;
  googleMapLink: string;

  // Classification
  category?: string;
  propertyType?: string;

  // Legal & Trust
  reraApproved: boolean;
  reraNumber?: string;
  projectStatus: ProjectStatus;

  // Pricing
  startingPrice: number;
  pricePerSqFt: number;
  priceRange: string;
  paymentPlan: string;
  bankLoanAvailable: boolean;

  // Additional charges (optional)
  gstPercentage?: number;
  stampDutyPercentage?: number;
  registrationCharges?: number;
  maintenanceCharges?: string;
  otherCharges?: string;

  // Flat-specific fields
  bhkOptions?: string[];
  carpetAreaRange?: string;
  floorRange?: string;

  // Plot-specific fields
  plotSizeRange?: string;
  facingOptions?: string[];
  gatedCommunity?: boolean;

  // Amenities
  amenities: string[];
  landmarks?: Landmark[];

  // Media
  coverImage: string | FileData;
  galleryImages: (string | FileData)[];
  videos: (string | FileData)[];
  brochureUrl?: string | FileData;
  layoutImage?: string | FileData;

  // Layout entities (map polygons, plots, roads, boundaries)
  layoutEntities?: LayoutEntity[];
  layoutOverlay?: LayoutOverlay | null;
  // From GET /projects/:id (backend task 3.2 / 4.1): role flags and the
  // Layout_Version token. Absent on older backends and on public routes.
  canEdit?: boolean;
  canEditStatus?: boolean;
  layoutVersion?: string | null;

  // Sales CTA
  ctaButtonText: string;
  whatsappNumber: string;
  callNumber: string;

  // Generated fields
  slug?: string;
  trackableLink?: string;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
  owner?: {
    id: string;
    _id: string;
    name: string;
    companyName?: string;
    role: string;
  };
  // Additional captains co-managing this project alongside the primary owner
  coCaptains?: {
    id: string;
    _id: string;
    name: string;
    companyName?: string;
    role: string;
  }[];
  assignedAgent?: {
    id: string;
    _id: string;
    name: string;
    phone?: string;
  } | null;
}

export interface Captain {
  id: string;
  name: string;
}

export interface Agent {
  id: string;
  name: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'slug' | 'trackableLink' | 'createdAt' | 'updatedAt'>;

// Tracking Types
export interface TrackingEvent {
  projectId: string;
  source?: string;
  leadId?: string;
  timestamp: number;
}

export interface PageViewEvent extends TrackingEvent {
  type: 'pageview';
}

export interface TimeSpentEvent extends TrackingEvent {
  type: 'time';
  duration: number; // in seconds
}

export interface CTAClickEvent extends TrackingEvent {
  type: 'cta';
  ctaType: 'call' | 'whatsapp' | 'form';
}

// Amenity options
export const AMENITIES = [
  'Lift',
  'Parking',
  'Power Backup',
  'Gym',
  'Swimming Pool',
  'Garden',
  'Club House',
  'Security',
  'Children Play Area',
  'Jogging Track',
  'Community Hall',
  'Fire Safety',
  'CCTV Surveillance',
  'Gated Community',
  'Visitor Parking',
  'Intercom Facility',
  '24x7 Water Supply',
  'Rain Water Harvesting',
  'Sewage Treatment Plant',
  'Waste Management',
  'Solar Power',
  'EV Charging Station',
  'Indoor Games Room',
  'Outdoor Sports Court',
  'Tennis Court',
  'Basketball Court',
  'Badminton Court',
  'Cricket Pitch',
  'Multipurpose Hall',
  'Amphitheatre',
  'Yoga Deck',
  'Meditation Area',
  'Senior Citizen Zone',
  'Pet Park',
  'Library',
  'Business Center',
  'Conference Room',
  'Co-working Space',
  'High-Speed Internet',
  'Shopping Complex',
  'ATM',
  'Restaurant / Cafeteria',
  'Pharmacy',
  'Medical Center',
  'School / Day Care',
  'Guest Rooms',
  'Terrace Garden',
  'Landscape Garden',
  'Water Features',
  'BBQ Area',
  'Open Air Theatre',
  'Golf Course',
  'Lake View',
  'Temple / Prayer Hall',
  'Banquet Hall',
  'Concierge Services',
  'Car Wash Area',
  'Salon / Spa',
  'Music Room',
  'Dance Studio',
  'Virtual Reality Room',
  'Game Zone',
  'Arcade',
  'Karaoke Room',
] as const;

export type Amenity = typeof AMENITIES[number];
