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
