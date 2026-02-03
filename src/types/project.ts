// Project Types for Dynamic Sales Website
//sales-website-private-dev\frontend\src\types\project.ts
export type ProjectType = 'flat' | 'plot';

export type ProjectStatus = 'pre-launch' | 'under-construction' | 'ready-to-move';

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  builderName: string;
  city: string;
  location: string;
  latitude?: number;
  longitude?: number;
  googleMapLink: string;

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

  // Media
  coverImage: string;
  galleryImages: string[];
  videos: string[];
  brochureUrl?: string;

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
] as const;

export type Amenity = typeof AMENITIES[number];
