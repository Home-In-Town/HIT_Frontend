// API Service for Dynamic Sales Website

export type { Project, ProjectFormData };
import { Project, ProjectFormData } from '@/types/project';

const API_URL = '/api';

// Get mock user ID from localStorage (for RBAC)
function getMockUserId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('mock_user_id');
}

// Get headers with auth
function getAuthHeaders(): HeadersInit {
    const userId = getMockUserId();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (userId) {
        headers['x-mock-user-id'] = userId;
    }
    return headers;
}

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
    // Get all public projects (for projects list page)
    async getAllPublic(): Promise<Project[]> {
        const response = await fetch(`${API_URL}/public/projects`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any[]>(response);
        return data.map(transformBackendToFrontend);
    },

    // Get all projects (filtered by role on backend)
    async getAll(): Promise<Project[]> {
        const response = await fetch(`${API_URL}/projects`, {
            headers: getAuthHeaders(),
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any[]>(response);
        return data.map(transformBackendToFrontend);
    },

    // Get single project by ID
    async getById(id: string): Promise<Project> {
        const response = await fetch(`${API_URL}/projects/${id}`, {
            headers: getAuthHeaders(),
        });
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

    // Get projects by builder ID (Public Portfolio)
    async getProjectsByBuilderId(builderId: string): Promise<{ builder: any, projects: Project[] }> {
        const response = await fetch(`${API_URL}/public/builders/${builderId}/projects`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await handleResponse<any>(response);
        return {
            builder: data.builder,
            projects: data.projects.map(transformBackendToFrontend)
        };
    },

    // Create new project
    async create(data: ProjectFormData): Promise<Project> {
        const response = await fetch(`${API_URL}/projects`, {
            method: 'POST',
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new ApiError('Failed to delete project', response.status);
        }
    },

    // Publish project and generate trackable link
    async publish(id: string): Promise<{ trackableLink: string }> {
        const response = await fetch(`${API_URL}/projects/${id}/publish`, {
            method: 'POST',
            headers: getAuthHeaders(),
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
   User Types & API
-----------------------------------*/

export interface MockUser {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'builder' | 'agent';
    companyName?: string;
    phone?: string;
}

export const usersApi = {
    // Get current user based on mock header
    async getMe(): Promise<MockUser | null> {
        try {
            const response = await fetch(`${API_URL}/users/me`, {
                headers: getAuthHeaders(),
            });
            if (!response.ok) return null;
            return handleResponse<MockUser>(response);
        } catch {
            return null;
        }
    },

    // Get available mock accounts for role switcher
    async getMockAccounts(): Promise<MockUser[]> {
        const response = await fetch(`${API_URL}/users/mock-accounts`);
        return handleResponse<MockUser[]>(response);
    },

    // Get all users (admin only)
    async getAll(role?: string): Promise<MockUser[]> {
        const url = role
            ? `${API_URL}/users?role=${role}`
            : `${API_URL}/users`;
        const response = await fetch(url, {
            headers: getAuthHeaders(),
        });
        return handleResponse<MockUser[]>(response);
    },

    // Login by name and role (for mock login flow)
    async loginByName(name: string, role: string, phone: string): Promise<MockUser> {
        const response = await fetch(`${API_URL}/users/login-by-name`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role, phone }),
        });
        return handleResponse<MockUser>(response);
    },

    // Get users by role (for login dropdown)
    async getByRole(role: string): Promise<{ id: string; name: string; email: string }[]> {
        const response = await fetch(`${API_URL}/users/by-role/${role}`);
        return handleResponse<{ id: string; name: string; email: string }[]>(response);
    },
};


/* ----------------------------------
   Organization Types & API
-----------------------------------*/

export interface Organization {
    id: string;
    name: string;
    description?: string;
    agents: { id: string; name: string; email: string }[];
    projects: { id: string; projectName: string; status: string }[];
    createdAt?: string;
}

export const organizationsApi = {
    // Get organizations (filtered by role on backend)
    async getAll(): Promise<Organization[]> {
        const response = await fetch(`${API_URL}/organizations`, {
            headers: getAuthHeaders(),
        });
        return handleResponse<Organization[]>(response);
    },

    // Create organization (admin only)
    async create(data: { name: string; description?: string; agents?: string[]; projects?: string[] }): Promise<Organization> {
        const response = await fetch(`${API_URL}/organizations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<Organization>(response);
    },

    // Update organization (admin only)
    async update(id: string, data: Partial<{ name: string; description: string; agents: string[]; projects: string[] }>): Promise<Organization> {
        const response = await fetch(`${API_URL}/organizations/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse<Organization>(response);
    },

    // Delete organization (admin only)
    async delete(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/organizations/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new ApiError('Failed to delete organization', response.status);
        }
    },
};
