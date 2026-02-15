// API Service for Dynamic Sales Website

import { Project, ProjectFormData } from '@/types/project';

//const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'An error occurred' }));
        throw new ApiError(error.message || 'An error occurred', response.status);
    }
    return response.json();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBackendToFrontend(backendProject: any): Project {
    return {
        id: backendProject.id,
        name: backendProject.projectName || backendProject.name || '',
        type: backendProject.projectType || backendProject.type || 'flat',
        builderName: backendProject.builderName || '',
        city: backendProject.city || '',
        location: backendProject.location || '',
        latitude: backendProject.latitude,
        longitude: backendProject.longitude,
        googleMapLink: backendProject.googleMapLink || '',

        // Legal & Trust
        reraApproved: backendProject.reraApproved || false,
        reraNumber: backendProject.reraNumber || '',
        projectStatus: backendProject.projectStatus || 'pre-launch',

        // Pricing - flatten from nested object
        startingPrice: backendProject.pricing?.startingPrice ?? backendProject.startingPrice ?? 0,
        pricePerSqFt: backendProject.pricing?.pricePerSqFt ?? backendProject.pricePerSqFt ?? 0,
        priceRange: backendProject.pricing?.totalPriceRange ?? backendProject.priceRange ?? '',
        paymentPlan: backendProject.pricing?.paymentPlan ?? backendProject.paymentPlan ?? '',
        bankLoanAvailable: backendProject.pricing?.bankLoanAvailable ?? backendProject.bankLoanAvailable ?? false,

        // Configuration - flatten from nested object
        bhkOptions: backendProject.configuration?.bhkOptions ?? backendProject.bhkOptions ?? [],
        carpetAreaRange: backendProject.configuration?.carpetAreaRange ?? backendProject.carpetAreaRange ?? '',
        floorRange: backendProject.configuration?.floorRange ?? backendProject.floorRange ?? '',
        plotSizeRange: backendProject.configuration?.plotSizeRange ?? backendProject.plotSizeRange ?? '',
        facingOptions: backendProject.configuration?.facingOptions ?? backendProject.facingOptions ?? [],
        gatedCommunity: backendProject.configuration?.gatedCommunity ?? backendProject.gatedCommunity ?? false,

        // Amenities
        amenities: backendProject.amenities || [],

        // Media - flatten from nested object
        coverImage: backendProject.media?.coverImage ?? backendProject.coverImage ?? '',
        galleryImages: backendProject.media?.galleryImages ?? backendProject.galleryImages ?? [],
        videos: backendProject.media?.videos ?? backendProject.videos ?? [],
        brochureUrl: backendProject.media?.brochurePdf ?? backendProject.brochureUrl ?? '',

        // Sales CTA - flatten from nested object
        ctaButtonText: backendProject.cta?.buttonText ?? backendProject.ctaButtonText ?? 'Contact Us',
        whatsappNumber: backendProject.cta?.whatsappNumber ?? backendProject.whatsappNumber ?? '',
        callNumber: backendProject.cta?.callNumber ?? backendProject.callNumber ?? '',

        // Generated fields
        slug: backendProject.slug || '',
        trackableLink: backendProject.slug ? `/visit/${backendProject.slug}` : '',
        isPublished: backendProject.status === 'published' || backendProject.isPublished || false,
        createdAt: backendProject.createdAt,
        updatedAt: backendProject.updatedAt,
    };
}

// Transform frontend Project to backend format for sending
function transformFrontendToBackend(project: Partial<ProjectFormData>): Record<string, unknown> {
    return {
        projectName: project.name,
        projectType: project.type,
        builderName: project.builderName,
        city: project.city,
        location: project.location,
        latitude: project.latitude,
        longitude: project.longitude,
        googleMapLink: project.googleMapLink,

        reraApproved: project.reraApproved,
        reraNumber: project.reraNumber,
        projectStatus: project.projectStatus,

        pricing: {
            startingPrice: project.startingPrice,
            pricePerSqFt: project.pricePerSqFt,
            totalPriceRange: project.priceRange,
            paymentPlan: project.paymentPlan,
            bankLoanAvailable: project.bankLoanAvailable,
        },

        configuration: {
            bhkOptions: project.bhkOptions,
            carpetAreaRange: project.carpetAreaRange,
            floorRange: project.floorRange,
            plotSizeRange: project.plotSizeRange,
            facingOptions: project.facingOptions,
            gatedCommunity: project.gatedCommunity,
        },

        amenities: project.amenities,

        media: {
            coverImage: project.coverImage,
            galleryImages: project.galleryImages,
            videos: project.videos,
            brochurePdf: project.brochureUrl,
        },

        cta: {
            buttonText: project.ctaButtonText,
            whatsappNumber: project.whatsappNumber,
            callNumber: project.callNumber,
        },
    };
}

// Projects API
export const projectsApi = {
    // Get all projects
    async getAll(): Promise<Project[]> {
        const response = await fetch(`${API_URL}/projects`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any[]>(response);
        return data.map(transformBackendToFrontend);
    },

    // Get single project by ID
    async getById(id: string): Promise<Project> {
        const response = await fetch(`${API_URL}/projects/${id}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any>(response);
        return transformBackendToFrontend(data);
    },

    // Get project by slug (for public pages)
    async getBySlug(slug: string): Promise<Project> {
        const response = await fetch(`${API_URL}/public/projects/${slug}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any>(response);
        return transformBackendToFrontend(data);
    },

    // Create new project
    async create(data: ProjectFormData): Promise<Project> {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transformFrontendToBackend(data)),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await handleResponse<any>(response);
        return transformBackendToFrontend(result);
    },

    // Update project
    async update(id: string, data: Partial<ProjectFormData>): Promise<Project> {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transformFrontendToBackend(data)),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await handleResponse<any>(response);
        return transformBackendToFrontend(result);
    },

    // Delete project
    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            throw new ApiError('Failed to delete project', response.status);
        }
    },

    // Publish project and generate trackable link
    async publish(id: string): Promise<{ trackableLink: string }> {
        const response = await fetch(`${API_URL}/projects/${id}/publish`, {
            method: 'POST',
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await handleResponse<any>(response);
        return {
            trackableLink: result.publicUrl || `/visit/${result.slug}`,
        };
    },
};

// Analytics API
export interface ProjectAnalytics {
    totalVisits: number;
    uniqueLeads: number;
    totalTimeSpent: number;
    ctaClicks: {
        id: string;
        type: string;
        ctaType: string;
        projectId: string;
        source?: string;
        leadId?: string;
        timestamp: string;
    }[];
    recentVisits: {
    _id: string;
    timestamp: string;
    duration: number;
    leadId?: string;
  }[];
}

export interface ProjectAnalyticsOverview {
    id: string;
    name: string;
    totalVisits: number;
    uniqueLeads: number;
    totalTimeSpent: number;
    ctaClicks: number;
    calls: number;
    whatsapp: number;
    forms: number;
}

export const analyticsApi = {
    // Get analytics for a specific project
    async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
        const response = await fetch(`${API_URL}/analytics/projects/${projectId}`);
        return handleResponse<ProjectAnalytics>(response);
    },

    // Get analytics overview for all projects
    async getAll(): Promise<ProjectAnalyticsOverview[]> {
        const response = await fetch(`${API_URL}/analytics/overview`);
        return handleResponse<ProjectAnalyticsOverview[]>(response);
    },
};


/* ----------------------------------
   Types
-----------------------------------*/

export interface NewCallPayload {
  to: string;              // user phone
  from: string;            // AI/system identifier
  projectId: string;

  agentId?: string;
  clientId?: string;
  metadata?: Record<string, any>;
}

export interface CallStatusResponse {
  callId: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed';
  duration?: number;
  error?: string;
}

export interface CallLog {
  callId: string;
  projectId?: string;
  userNumber?: string;
  aiNumber?: string;
  status: string;
  duration?: number;
  createdAt?: string;
}


/* ----------------------------------
   Call APIs
-----------------------------------*/

export const callApi = {
  initiateCall(payload: NewCallPayload): Promise<CallStatusResponse> {
    return fetch(`${API_URL}/calls/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((res) => handleResponse<CallStatusResponse>(res));
  },

  getCallStatus(callId: string): Promise<CallStatusResponse> {
    return fetch(`${API_URL}/calls/status/${callId}`)
      .then((res) => handleResponse<CallStatusResponse>(res));
  },

  getAllLogs(): Promise<CallLog[]> {
    return fetch(`${API_URL}/calls/logs`)
      .then((res) => handleResponse<CallLog[]>(res));
  },

  getLogsByProject(projectId: string): Promise<CallLog[]> {
    return fetch(`${API_URL}/calls/logs/project/${projectId}`)
      .then((res) => handleResponse<CallLog[]>(res));
  },

  getLogsByNumber(phoneNumber: string): Promise<CallLog[]> {
    return fetch(`${API_URL}/calls/logs/number/${phoneNumber}`)
      .then((res) => handleResponse<CallLog[]>(res));
  },
};

