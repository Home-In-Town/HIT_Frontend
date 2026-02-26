// API Service for Dynamic Sales Website

import { Project, ProjectFormData } from '@/types/project';

//const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
export type { Project, ProjectFormData };


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

export class ApiError extends Error {
  status: number;

  constructor(message: string | null | undefined, status: number) {
    super(message ?? "Unknown error");
    this.status = status;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : `Request failed (${response.status})`;

    throw new ApiError(String(message), response.status);
  }

  return body as T;
}


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformBackendToFrontend(backendProject: any): Project {
    const id =
        backendProject?.id ??
        backendProject?._id ??
        backendProject?.projectId;

    if (!id) {
        console.error("❌ Missing project ID:", backendProject);
    }

    return {
        id: String(id),   // ✅ guaranteed string (or "undefined" logged above)
        name: backendProject.projectName || backendProject.name || '',
        type: backendProject.projectType || backendProject.type || 'flat',
        builderName: backendProject.builderName || '',
        city: backendProject.city || '',
        location: backendProject.location || '',
        latitude: backendProject.latitude,
        longitude: backendProject.longitude,
        googleMapLink: backendProject.googleMapLink || '',
        reraApproved: backendProject.reraApproved || false,
        reraNumber: backendProject.reraNumber || '',
        projectStatus: backendProject.projectStatus || 'pre-launch',
        startingPrice: backendProject.pricing?.startingPrice ?? backendProject.startingPrice ?? 0,
        pricePerSqFt: backendProject.pricing?.pricePerSqFt ?? backendProject.pricePerSqFt ?? 0,
        priceRange: backendProject.pricing?.totalPriceRange ?? backendProject.priceRange ?? '',
        paymentPlan: backendProject.pricing?.paymentPlan ?? backendProject.paymentPlan ?? '',
        bankLoanAvailable: backendProject.pricing?.bankLoanAvailable ?? backendProject.bankLoanAvailable ?? false,
        bhkOptions: backendProject.configuration?.bhkOptions ?? backendProject.bhkOptions ?? [],
        carpetAreaRange: backendProject.configuration?.carpetAreaRange ?? backendProject.carpetAreaRange ?? '',
        floorRange: backendProject.configuration?.floorRange ?? backendProject.floorRange ?? '',
        plotSizeRange: backendProject.configuration?.plotSizeRange ?? backendProject.plotSizeRange ?? '',
        facingOptions: backendProject.configuration?.facingOptions ?? backendProject.facingOptions ?? [],
        gatedCommunity: backendProject.configuration?.gatedCommunity ?? backendProject.gatedCommunity ?? false,
        amenities: backendProject.amenities || [],
        coverImage: backendProject.media?.coverImage ?? backendProject.coverImage ?? '',
        galleryImages: backendProject.media?.galleryImages ?? backendProject.galleryImages ?? [],
        videos: backendProject.media?.videos ?? backendProject.videos ?? [],
        brochureUrl: backendProject.media?.brochurePdf ?? backendProject.brochureUrl ?? '',
        ctaButtonText: backendProject.cta?.buttonText ?? backendProject.ctaButtonText ?? 'Contact Us',
        whatsappNumber: backendProject.cta?.whatsappNumber ?? backendProject.whatsappNumber ?? '',
        callNumber: backendProject.cta?.callNumber ?? backendProject.callNumber ?? '',
        slug: backendProject.slug || '',
        trackableLink: backendProject.slug ? `/visit/${backendProject.slug}` : '',
        isPublished: backendProject.status === 'published' || backendProject.isPublished,
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

   // Get projects by owner ID (Public Portfolio)
    async getProjectsByOwnerId(ownerId: string): Promise<{ owner: any, projects: Project[] }> {
        const response = await fetch(`${API_URL}/projects/public/owners/${ownerId}/projects`);
        
        const data = await handleResponse<any>(response);

        return {
            owner: data.builder, // backend still sends "builder" key
            projects: data.projects.map(transformBackendToFrontend)
        };
    },
    async getProjectsByOwnerPhone(phone: string) {
        const response = await fetch(`${API_URL}/projects/by-owner-phone/${phone}`);
        const data = await handleResponse<any>(response);

        return {
            owner: data.builder,
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


export interface Landmark {
  placeId: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string;
}


export async function saveProjectLandmarks(projectId: string, landmarks: Landmark[]) {
  const res = await fetch(`${API_URL}/projects/${projectId}/landmarks`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ landmarks }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to save landmarks');
  }

  const data = await res.json();
  return data.landmarks as Landmark[];
}
// ==============================
// Types
// ==============================

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

// ==============================
// Analytics API
// ==============================

export const analyticsApi = {
  // 🔎 Get analytics for one project
  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    const response = await fetch(
      `${API_URL}/analytics/projects/${projectId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse<ProjectAnalytics>(response);
  },

  // 📊 Get overview (role-based from backend)
  async getOverview(): Promise<ProjectAnalyticsOverview[]> {
    const response = await fetch(
      `${API_URL}/analytics/overview`,
      {
        headers: getAuthHeaders(),
      }
    );

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
  async getByRole(role: string): Promise<{ id: string; name: string; email: string; phone?: string }[]> {
    const response = await fetch(`${API_URL}/users/by-role/${role}`, {
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Get SSO token for handover
  async getSsoToken(): Promise<{ token: string }> {
    const response = await fetch(`${API_URL}/users/sso/token`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ token: string }>(response);
  

      return handleResponse(response);
  },
  async verifyUser(phone: string) {
    const response = await fetch(`${API_URL}/projects/verify-user/${phone}`);
    return handleResponse<any>(response);
},
};


/* ----------------------------------
   Organization Types & API
-----------------------------------*/


export interface OrgProject {
  _id: string;
  projectName?: string;
  projectType?: string;
  builderName?: string;
  city?: string;
  location?: string;

  latitude?: number;
  longitude?: number;
  googleMapLink?: string;

  reraApproved?: boolean;
  reraNumber?: string;
  projectStatus?: string;

  startingPrice?: number;
  pricePerSqFt?: number;
  priceRange?: string;
  paymentPlan?: string;
  bankLoanAvailable?: boolean;

  bhkOptions?: any[];
  carpetAreaRange?: string;
  floorRange?: string;

  plotSizeRange?: string;
  facingOptions?: string[];
  gatedCommunity?: boolean;

  amenities?: any[];
  landmarks?: any[];

  coverImage?: string;
  galleryImages?: string[];
  videos?: string[];
  brochureUrl?: string;

  ctaButtonText?: string;
  whatsappNumber?: string;
  callNumber?: string;

  slug?: string;
  trackableLink?: string;
  isPublished?: boolean;

  createdAt?: string;
  updatedAt?: string;

  status?: string;
}
export interface OrgAgent {
  _id: string;
  name: string;
  email: string;
  role?: string;
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  agents: OrgAgent[];
  projects?: OrgProject[];
  createdBy?: string;
  createdAt?: string;
}

// ---------- TRANSFORMERS ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformOrgBackend(org: any): Organization {
  return {
    id: org?.id ? String(org.id) : "",

    name: org?.name ?? "",
    description: org?.description ?? "",

    agents: Array.isArray(org?.agents)
      ? org.agents.map((a: any) => ({
        _id: a?._id ? String(a._id) : String(a),
        name: a?.name ?? "",
        email: a?.email ?? "",
        role: a?.role,
      }))
      : [],

   projects: Array.isArray(org?.projects)
  ? org.projects
      .map((p: any) => {
        if (typeof p === "string") {
          // 🚫 Skip or return minimal object
          return null;
        }

        return {
          ...transformBackendToFrontend(p),
          _id: p?._id ? String(p._id) : "",
        };
      })
      .filter(Boolean)
  : [],

    createdBy: org?.createdBy
      ? String(org.createdBy)
      : undefined,
  };
}
export const organizationsApi = {

  // =====================================
  // GET — Role based (backend filtered)
  // =====================================
  async getAll(type?: 'all' | 'assigned' | 'created'): Promise<Organization[]> {
    const query = type ? `?type=${type}` : '';

    const response = await fetch(`${API_URL}/organizations${query}`, {
      headers: getAuthHeaders(),
    });

    const data = await handleResponse<any[]>(response);
    return data.map(transformOrgBackend);
  },


  // =====================================
  // CREATE — Admin / Builder / Agent
  // =====================================
  async create(data: {
    name: string;
    description?: string;
    agents?: string[];
    projects?: string[];
  }): Promise<Organization> {

    const response = await fetch(`${API_URL}/organizations`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const org = await handleResponse<any>(response);
    return transformOrgBackend(org);
  },


  // =====================================
  // UPDATE — Role protected by backend
  // =====================================
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      agents: string[];
      projects: string[];
    }>
  ): Promise<Organization> {

    const response = await fetch(`${API_URL}/organizations/${id}`, {
      method: "PUT",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const org = await handleResponse<any>(response);
    return transformOrgBackend(org);
  },


  // =====================================
  // DELETE — Backend handles permission
  // =====================================
  async delete(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/organizations/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message =
        body?.message || body?.error || "Failed to delete organization";

      throw new ApiError(message, response.status);
    }
  },
};
