// API Service for Dynamic Sales Website

export function getLeadGenUrl() {
  if (typeof window === 'undefined') return "https://www.oneemployee.in";
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? "http://localhost:5173" : "https://www.oneemployee.in";
}

import { Project, ProjectFormData, FileData, LayoutEntity, Landmark, Captain, Agent } from '@/types/project';
export type { Project, ProjectFormData, FileData, LayoutEntity, Captain, Agent };

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
type MediaType = "cover" | "gallery" | "video" | "brochure" | "layout";


// Get headers with auth
function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  return headers;
}

const COMMON_FETCH_OPTIONS: RequestInit = {
  credentials: 'include'
};

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
    city: backendProject.city || '',
    location: backendProject.location || '',
    latitude: backendProject.latitude,
    longitude: backendProject.longitude,
    googleMapLink: backendProject.googleMapLink || '',
    category: backendProject.category || '',
    propertyType: backendProject.propertyType || '',
    reraApproved: backendProject.reraApproved || false,
    reraNumber: backendProject.reraNumber || '',
    projectStatus: backendProject.projectStatus || 'pre-launch',
    startingPrice: backendProject.pricing?.startingPrice ?? backendProject.startingPrice ?? 0,
    pricePerSqFt: backendProject.pricing?.pricePerSqFt ?? backendProject.pricePerSqFt ?? 0,
    priceRange: backendProject.pricing?.totalPriceRange ?? backendProject.priceRange ?? '',
    paymentPlan: backendProject.pricing?.paymentPlan ?? backendProject.paymentPlan ?? '',
    bankLoanAvailable: backendProject.pricing?.bankLoanAvailable ?? backendProject.bankLoanAvailable ?? false,
    gstPercentage: backendProject.pricing?.gstPercentage ?? backendProject.gstPercentage ?? undefined,
    stampDutyPercentage: backendProject.pricing?.stampDutyPercentage ?? backendProject.stampDutyPercentage ?? undefined,
    registrationCharges: backendProject.pricing?.registrationCharges ?? backendProject.registrationCharges ?? undefined,
    maintenanceCharges: backendProject.pricing?.maintenanceCharges ?? backendProject.maintenanceCharges ?? '',
    otherCharges: backendProject.pricing?.otherCharges ?? backendProject.otherCharges ?? '',
    bhkOptions: backendProject.configuration?.bhkOptions ?? backendProject.bhkOptions ?? [],
    carpetAreaRange: backendProject.configuration?.carpetAreaRange ?? backendProject.carpetAreaRange ?? '',
    floorRange: backendProject.configuration?.floorRange ?? backendProject.floorRange ?? '',
    plotSizeRange: backendProject.configuration?.plotSizeRange ?? backendProject.plotSizeRange ?? '',
    facingOptions: backendProject.configuration?.facingOptions ?? backendProject.facingOptions ?? [],
    gatedCommunity: backendProject.configuration?.gatedCommunity ?? backendProject.gatedCommunity ?? false,
    amenities: backendProject.amenities || [],
    coverImage: backendProject.media?.coverImage ?? null,
    galleryImages: backendProject.media?.galleryImages ?? [],
    videos: backendProject.media?.videos ?? [],
    brochureUrl: backendProject.media?.brochurePdf ?? null,
    layoutImage: backendProject.media?.layoutImage ?? null,
    ctaButtonText: backendProject.cta?.buttonText ?? backendProject.ctaButtonText ?? 'Contact Us',
    whatsappNumber: backendProject.cta?.whatsappNumber ?? backendProject.whatsappNumber ?? '',
    callNumber: backendProject.cta?.callNumber ?? backendProject.callNumber ?? '',
    slug: backendProject.slug || '',
    trackableLink: backendProject.slug ? `/visit/${backendProject.slug}` : '',
    isPublished: backendProject.status === 'published' || backendProject.isPublished,
    landmarks: backendProject.landmarks || [],
    layoutEntities: backendProject.layoutEntities || [],
    owner: backendProject.owner ? {
      ...backendProject.owner,
      id: String(backendProject.owner.id || backendProject.owner._id || ''),
    } : undefined,
    assignedAgent: backendProject.assignedAgent ? {
      ...backendProject.assignedAgent,
      id: String(backendProject.assignedAgent.id || backendProject.assignedAgent._id || ''),
    } : null,
  };
}

// Transform frontend Project to backend format for sending
function transformFrontendToBackend(project: Partial<ProjectFormData>): Record<string, unknown> {
  return {
    projectName: project.name,
    projectType: project.type,
    city: project.city,
    location: project.location,
    latitude: project.latitude,
    longitude: project.longitude,
    googleMapLink: project.googleMapLink,

    // Classification
    category: project.category,
    propertyType: project.propertyType,

    reraApproved: project.reraApproved,
    reraNumber: project.reraNumber,
    projectStatus: project.projectStatus,

    pricing: {
      startingPrice: project.startingPrice,
      pricePerSqFt: project.pricePerSqFt,
      totalPriceRange: project.priceRange,
      paymentPlan: project.paymentPlan,
      bankLoanAvailable: project.bankLoanAvailable,
      gstPercentage: project.gstPercentage,
      stampDutyPercentage: project.stampDutyPercentage,
      registrationCharges: project.registrationCharges,
      maintenanceCharges: project.maintenanceCharges,
      otherCharges: project.otherCharges,
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
      // Only include media if it's a valid {url, key} object (not a blob:/data: string)
      // Do NOT send empty arrays — that would wipe media already saved via proxy-upload
      ...(project.coverImage && typeof project.coverImage === 'object' && { coverImage: project.coverImage }),
      ...(project.layoutImage && typeof project.layoutImage === 'object' && { layoutImage: project.layoutImage }),
      ...(project.galleryImages?.length && {
        galleryImages: project.galleryImages.filter((img: any) => typeof img === 'object' && img?.url)
      }),
      ...(project.videos?.length && {
        videos: project.videos.filter((vid: any) => typeof vid === 'object' && vid?.url)
      }),
      ...(project.brochureUrl && typeof project.brochureUrl === 'object' && { brochurePdf: project.brochureUrl }),
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
    const response = await fetch(`${API_URL}/public/projects`, {
      ...COMMON_FETCH_OPTIONS, credentials: 'include'
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any[]>(response);
    return data.map(transformBackendToFrontend);
  },

  // Get all projects (filtered by role on backend)
  async getAll(): Promise<Project[]> {
    const response = await fetch(`${API_URL}/projects`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any[]>(response);
    return data.map(transformBackendToFrontend);
  },

  // Get single project by ID
  async getById(id: string): Promise<Project> {
    const response = await fetch(`${API_URL}/projects/${id}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any>(response);
    return transformBackendToFrontend(data);
  },

  // Get project by slug (for public pages)
  async getBySlug(slug: string): Promise<Project> {
    const response = await fetch(`${API_URL}/public/projects/${slug}`, COMMON_FETCH_OPTIONS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any>(response);
    return transformBackendToFrontend(data);
  },

  // Get projects by owner ID (Public Portfolio)
  async getProjectsByOwnerId(ownerId: string): Promise<{ owner: any, projects: Project[] }> {
    const response = await fetch(`${API_URL}/projects/public/owners/${ownerId}/projects`, COMMON_FETCH_OPTIONS);

    const data = await handleResponse<any>(response);

    return {
      owner: data.builder, // backend still sends "builder" key
      projects: data.projects.map(transformBackendToFrontend)
    };
  },
  async getProjectsByOwnerPhone(phone: string) {
    const response = await fetch(`${API_URL}/projects/by-owner-phone/${phone}`, COMMON_FETCH_OPTIONS);
    const data = await handleResponse<any>(response);

    return {
      owner: data.builder,
      projects: data.projects.map(transformBackendToFrontend)
    };
  },

  // Create new project
  async create(data: ProjectFormData): Promise<Project> {
    const response = await fetch(`${API_URL}/projects`, {
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleResponse<any>(response);
    return {
      trackableLink: result.publicUrl || `/visit/${result.slug}`,
    };
  },

  // Get all available captains
  async getCaptains(): Promise<Captain[]> {
    const response = await fetch(`${API_URL}/projects/captains`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any[]>(response);
    return data.map(c => ({
      id: String(c._id || c.id),
      name: c.name || '',
    }));
  },

  // Assign or unassign a captain to a project
  async assignCaptain(projectId: string, captainId: string | null): Promise<Project> {
    const response = await fetch(`${API_URL}/projects/${projectId}/assign-captain`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ captainId }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any>(response);
    return transformBackendToFrontend(data);
  },

  // Get agents under the logged-in captain
  async getMyAgents(): Promise<{ id: string; name: string }[]> {
    const response = await fetch(`${API_URL}/projects/my-agents`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any[]>(response);
    return data.map(a => ({
      id: String(a._id || a.id),
      name: a.name || '',
    }));
  },

  // Assign or unassign an agent to a project (captain only)
  async assignAgent(projectId: string, agentId: string | null): Promise<Project> {
    const response = await fetch(`${API_URL}/projects/${projectId}/assign-agent`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ agentId }),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await handleResponse<any>(response);
    return transformBackendToFrontend(data);
  },
};

export const mediaApi = {
  // ================= 1. GET SIGNED URL =================
  async getUploadUrl(params: {
    fileName: string;
    fileType: string;
    projectId: string;
    type: MediaType;
  }): Promise<{
    uploadUrl: string;
    key: string;
    url: string;
  }> {
    const res = await fetch(`${API_URL}/files/get-upload-url`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    const data = await handleResponse<{
      uploadUrl: string;
      fileKey: string;
      fileUrl: string;
    }>(res);

    return {
      uploadUrl: data.uploadUrl,
      key: data.fileKey,
      url: data.fileUrl,
    };
  },

  // ================= 2. DIRECT UPLOAD =================
  async uploadToR2(uploadUrl: string, file: File) {
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    });

    if (!res.ok) {
      throw new Error("R2 upload failed");
    }
  },

  // ================= 3. SAVE FILE =================
  async saveFile(params: {
    projectId: string;
    type: MediaType;
    file: FileData;
    fileSize: number;
  }) {
    const res = await fetch(`${API_URL}/files/save-file`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    return handleResponse(res);
  },

  // ================= 4. PROXY UPLOAD (NO CORS — USE THIS EVERYWHERE) =================
  async uploadAndSave(params: {
    file: File;
    projectId: string;
    type: MediaType;
  }): Promise<FileData> {
    const { file, projectId, type } = params;

    // Single request: browser → backend → R2 (no CORS issue)
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", projectId);
    formData.append("type", type);

    const res = await fetch(`${API_URL}/files/proxy-upload`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      body: formData,
      // Do NOT set Content-Type — browser sets multipart boundary automatically
    });

    const data = await handleResponse<{ fileUrl: string; fileKey: string }>(res);

    return { url: data.fileUrl, key: data.fileKey };
  },

  // ================= 5. DELETE =================
  async deleteFile(params: {
    projectId: string;
    type: MediaType;
    key: string;
  }) {
    const res = await fetch(`${API_URL}/files/delete-file`, {
      ...COMMON_FETCH_OPTIONS,
      method: "DELETE",
      headers: getAuthHeaders(),
      body: JSON.stringify(params),
    });

    return handleResponse(res);
  },

  // ================= 7. LOGO UPLOAD (no projectId) =================
  async uploadLogo(file: File): Promise<{ url: string; key: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_URL}/files/upload-logo`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      body: formData,
    });

    const data = await handleResponse<{ fileUrl: string; fileKey: string }>(res);
    return { url: data.fileUrl, key: data.fileKey };
  },

  // ================= 6. REPLACE (proxy-based) =================
  async replaceFile(params: {
    projectId: string;
    type: "cover" | "brochure" | "layout";
    oldKey: string;
    file: File;
  }): Promise<FileData> {
    const { projectId, type, oldKey, file } = params;

    // Step 1: Upload the new file via proxy
    const newFile = await this.uploadAndSave({ file, projectId, type });

    // Step 2: Delete the old file from R2 + DB
    if (oldKey) {
      const res = await fetch(`${API_URL}/files/replace-file`, {
        ...COMMON_FETCH_OPTIONS,
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          projectId,
          type,
          oldKey,
          newFile,
        }),
      });
      await handleResponse(res);
    }

    return newFile;
  },
};


export async function saveProjectLandmarks(projectId: string, landmarks: Landmark[]) {
  const res = await fetch(`${API_URL}/projects/${projectId}/landmarks`, {
    ...COMMON_FETCH_OPTIONS,
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

export async function saveLayoutEntities(projectId: string, layoutEntities: LayoutEntity[]) {
  const res = await fetch(`${API_URL}/projects/${projectId}/layout-entities`, {
    ...COMMON_FETCH_OPTIONS,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    },
    body: JSON.stringify({ layoutEntities }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to save layout entities');
  }

  const data = await res.json();
  return data.layoutEntities as LayoutEntity[];
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

export interface GlobalAnalytics {
  activeProjects: number;
  totalLeads: number;
  totalViews: number;
}

// ==============================
// Analytics API
// ==============================

export const analyticsApi = {
  // 🔎 Get analytics for one project
  async getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
    const response = await fetch(
      `${API_URL}/analytics/projects/${projectId}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    }
    );

    return handleResponse<ProjectAnalytics>(response);
  },

  // 📊 Get overview (role-based from backend)
  async getOverview(): Promise<ProjectAnalyticsOverview[]> {
    const response = await fetch(
      `${API_URL}/analytics/overview`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    }
    );

    return handleResponse<ProjectAnalyticsOverview[]>(response);
  },

  // 🌍 Get global overview (Admin only)
  async getGlobalOverview(): Promise<GlobalAnalytics> {
    const response = await fetch(
      `${API_URL}/analytics/global-overview`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    }
    );

    return handleResponse<GlobalAnalytics>(response);
  },
};




/* ----------------------------------
   User Types & API
-----------------------------------*/

export interface AuthUser {
  id: string;
  _id?: string;
  name: string;
  email?: string;
  role: 'admin' | 'builder' | 'agent' | 'unassigned' | 'user' | 'employee' | 'captain';
  companyName?: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  isEmployerConfirmed?: boolean;
  employerId?: string | { id?: string; _id?: string; name: string; phone?: string; role?: string };
  isAlreadyAssigned?: boolean;
  businessLogoUrl?: string;
  profilePictureUrl?: string;
  businessAddress?: string;
  businessCity?: string;
  businessState?: string;
  rating?: number;
  ratingCount?: number;
  verificationStatus?: { builder?: string; agent?: string };
}    

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function transformUserBackendToFrontend(backendUser: any): AuthUser {
  return {
    ...backendUser,
    id: String(backendUser.id || backendUser._id || ''),
  };
}

export const employeeApi = {
  async search(phone: string): Promise<AuthUser & { isAlreadyAssigned: boolean }> {
    const response = await fetch(`${API_URL}/employee/search?phone=${encodeURIComponent(phone)}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<any>(response);
    return {
      ...transformUserBackendToFrontend(data),
      isAlreadyAssigned: data.isAlreadyAssigned
    };
  },


  async requestAssignment(employeeId: string): Promise<any> {
    const response = await fetch(`${API_URL}/employee/request-assignment`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId }),
    });
    return handleResponse(response);
  },

  async confirmAssignment(): Promise<any> {
    const response = await fetch(`${API_URL}/employee/confirm-assignment`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async submitLocation(latitude: number, longitude: number, placeName?: string | null): Promise<any> {
    const response = await fetch(`${API_URL}/employee/location`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude, placeName }),
    });
    return handleResponse(response);
  },

  async logMeeting(data: { 
    withWhom: string; 
    description: string; 
    latitude?: number; 
    longitude?: number; 
    placeName?: string | null;
    projectName?: string;
    projectLocation?: string;
    projectPrice?: string;
  }): Promise<any> {
    const response = await fetch(`${API_URL}/employee/meeting`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getMyEmployees(): Promise<AuthUser[]> {
    const response = await fetch(`${API_URL}/employee/my-employees`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<any[]>(response);
    return data.map(transformUserBackendToFrontend);
  },

  async getHistory(employeeId: string): Promise<any> {
    const response = await fetch(`${API_URL}/employee/history/${employeeId}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },
};


export const usersApi = {
  // Get current user based on mock header
  async getMe(): Promise<AuthUser | null> {
    try {
      const response = await fetch(`${API_URL}/users/me`, {
        ...COMMON_FETCH_OPTIONS,
        headers: getAuthHeaders(),
      });
      if (!response.ok) return null;
      return handleResponse<AuthUser>(response);
    } catch {
      return null;
    }
  },


  // Get all users (admin only)
  async getAll(role?: string): Promise<AuthUser[]> {
    const url = role
      ? `${API_URL}/users?role=${role}`
      : `${API_URL}/users`;
    const response = await fetch(url, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<AuthUser[]>(response);
  },

  // Get users by role (for login dropdown)
  async getByRole(role: string): Promise<{ id: string; name: string; email: string; phone?: string }[]> {
    const response = await fetch(`${API_URL}/users/by-role/${role}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });

    return handleResponse(response);
  },

  // Update user role (admin only)
  async assignRole(userId: string, role: string): Promise<AuthUser> {
    const response = await fetch(`${API_URL}/users/${userId}/role`, {
      ...COMMON_FETCH_OPTIONS,
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    return handleResponse(response);
  },

  // Get SSO token for handover
  async getSsoToken(): Promise<{ token: string }> {
    const response = await fetch(`${API_URL}/users/sso/token`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<{ token: string }>(response);
  },
  async verifyUser(phone: string) {
    const response = await fetch(`${API_URL}/projects/verify-user/${phone}`, COMMON_FETCH_OPTIONS);
    return handleResponse<any>(response);
  },

  // Set rating for a captain (admin only)
  async setRating(userId: string, rating: number): Promise<{ message: string; user: { id: string; name: string; rating: number; ratingCount: number } }> {
    const response = await fetch(`${API_URL}/users/${userId}/rating`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating }),
    });
    return handleResponse(response);
  },

  // Set verification status for a captain (admin only)
  async setVerification(userId: string, status: 'verified' | 'pending' | 'unverified'): Promise<{ message: string; user: any }> {
    const response = await fetch(`${API_URL}/users/${userId}/verify`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return handleResponse(response);
  },
};

/* ----------------------------------
   Real Authentication API
-----------------------------------*/

export const authApi = {

  // Start Registration
  async register(data: {
    name: string;
    phone: string;
    mpin: string;
    email?: string;
    role?: string;
    companyName?: string;
    businessAddress?: string;
    businessCity?: string;
    businessState?: string;
    businessPinCode?: string;
    businessLogoUrl?: string;
  }): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/register`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  // Verify OTP
  async verifyOtp(phone: string, code: string): Promise<{ user: AuthUser }> {
    const response = await fetch(`${API_URL}/auth/verify-otp`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    return handleResponse(response);
  },

  // Login with Phone + MPIN
  async login(phone: string, mpin: string): Promise<{ user: AuthUser }> {
    const response = await fetch(`${API_URL}/auth/login`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, mpin }),
    });
    return handleResponse(response);
  },

  // Forgot MPIN
  async forgotMpin(phone: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/forgot-mpin`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    return handleResponse(response);
  },

  // Reset MPIN
  async resetMpin(phone: string, code: string, newMpin: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/auth/reset-mpin`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code, newMpin }),
    });
    return handleResponse(response);
  },

  // Logout
  async logout(): Promise<void> {
    const response = await fetch(`${API_URL}/auth/logout`, {
      ...COMMON_FETCH_OPTIONS,
      method: "POST"
    });
    await handleResponse(response);
  },

  // Silent session check (no 401 errors)
  async getSession(): Promise<{ authenticated: boolean; user: AuthUser | null }> {
    try {
      const response = await fetch(`${API_URL}/auth/session`, COMMON_FETCH_OPTIONS);
      if (!response.ok) return { authenticated: false, user: null };
      return handleResponse<{ authenticated: boolean; user: AuthUser | null }>(response);
    } catch {
      return { authenticated: false, user: null };
    }
  }
};


/* ----------------------------------
   Organization Types & API
-----------------------------------*/


export interface OrgProject {
  _id: string;
  name?: string;
  projectName?: string;
  projectType?: string;
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
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
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
      ...COMMON_FETCH_OPTIONS,
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

/* ----------------------------------
   Chat API
-----------------------------------*/

export interface ChatSession {
  _id: string;
  participants: { _id: string; name: string; role: string }[];
  project?: { _id: string; projectName: string };
  lastMessage?: { content: string; sender: string; timestamp: string };
  unreadCount?: Record<string, number>;
  isActive: boolean;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  session: string;
  sender: { _id: string; name: string; role: string };
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachment?: { url: string; name: string; size: number };
  readBy: string[];
  createdAt: string;
}

export const chatApi = {
  async getContacts(): Promise<{ _id: string; name: string; role: string; phone: string }[]> {
    const response = await fetch(`${API_URL}/chat/contacts`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ contacts: any[] }>(response);
    return data.contacts;
  },

  async qualifyAndConnect(data: {
    partnerId: string;
    projectId?: string;
    qualificationData: Record<string, string>;
  }): Promise<ChatSession> {
    const response = await fetch(`${API_URL}/chat/qualify`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ session: ChatSession }>(response);
    return result.session;
  },

  async getSessions(): Promise<ChatSession[]> {
    const response = await fetch(`${API_URL}/chat/sessions`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ sessions: ChatSession[] }>(response);
    return data.sessions;
  },

  async getMessages(sessionId: string, page = 1): Promise<ChatMessage[]> {
    const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/messages?page=${page}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ messages: ChatMessage[] }>(response);
    return data.messages;
  },

  async markRead(sessionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/chat/sessions/${sessionId}/read`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },
};

/* ----------------------------------
   Builders Network API (FOMO Chat)
-----------------------------------*/

export interface BuilderNetworkItem {
  _id: string;
  name: string;
  companyName: string | null;
  businessLogoUrl: string | null;
  businessCity: string | null;
  isVerified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  rating: number;
  ratingCount: number;
  lastSeen: string | null;
  isOnline: boolean;
  joinedAt: string;
  projectCount: number;
  projectLocations: string[];
  agentInterestCount: number;
  dealsClosedCount: number;
  newProjectsThisWeek: number;
}

export interface PlatformPulse {
  totalBuilders: number;
  onlineNow: number;
  activeLeadsToday: number;
  dealsClosedToday: number;
  newProjectsToday: number;
}

export interface BuildersNetworkResponse {
  builders: BuilderNetworkItem[];
  total: number;
  page: number;
  limit: number;
  pulse: PlatformPulse;
}

export const buildersNetworkApi = {
  async getBuilders(params?: { search?: string; city?: string; page?: number; limit?: number }): Promise<BuildersNetworkResponse> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.city) query.set('city', params.city);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_URL}/chat/builders-network${qs}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<BuildersNetworkResponse>(response);
  },
};

/* ----------------------------------
   CRM API
-----------------------------------*/

export interface CrmLead {
  _id: string;
  project: { _id: string; projectName: string } | string;
  owner: { _id: string; name: string; role: string } | string;
  leadContact: {
    name: string;
    phone: string;
    email?: string;
    notes?: string;
  };
  stage: 'new' | 'contacted' | 'qualified' | 'negotiation' | 'closed_won' | 'closed_lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  estimatedValue?: number;
  notes: string[];
  tags: string[];
  stageHistory: { stage: string; changedBy: string; timestamp: string; note?: string }[];
  followUpDate?: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const crmApi = {
  async getLeads(filters?: { stage?: string; priority?: string; search?: string }): Promise<CrmLead[]> {
    const params = new URLSearchParams();
    if (filters?.stage) params.set('stage', filters.stage);
    if (filters?.priority) params.set('priority', filters.priority);
    if (filters?.search) params.set('search', filters.search);

    const response = await fetch(`${API_URL}/crm/leads?${params.toString()}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ leads: CrmLead[] }>(response);
    return data.leads;
  },

  async createLead(data: {
    project?: string;
    leadContact: { name: string; phone: string; email?: string; notes?: string };
    stage?: string;
    priority?: string;
    source?: string;
    estimatedValue?: number;
    tags?: string[];
  }): Promise<CrmLead> {
    const response = await fetch(`${API_URL}/crm/leads`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ lead: CrmLead }>(response);
    return result.lead;
  },

  async updateLead(id: string, data: Partial<CrmLead>): Promise<CrmLead> {
    const response = await fetch(`${API_URL}/crm/leads/${id}`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ lead: CrmLead }>(response);
    return result.lead;
  },

  async updateStage(id: string, stage: string, note?: string): Promise<CrmLead> {
    const response = await fetch(`${API_URL}/crm/leads/${id}/stage`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, note }),
    });
    const result = await handleResponse<{ lead: CrmLead }>(response);
    return result.lead;
  },

  async getPipelineStats(): Promise<Record<string, number>> {
    const response = await fetch(`${API_URL}/crm/pipeline-stats`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ pipeline: { _id: string; count: number }[] }>(response);
    const result: Record<string, number> = {};
    if (data.pipeline) {
      data.pipeline.forEach(stat => {
        result[stat._id] = stat.count;
      });
    }
    return result;
  },

  async deleteLead(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/crm/leads/${id}`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new ApiError('Failed to delete lead', response.status);
  },
};

/* ----------------------------------
   Marketplace API
-----------------------------------*/

export interface MarketplaceListing {
  _id: string;
  project: { _id: string; projectName: string; city?: string; location?: string; pricing?: { startingPrice?: number; pricePerSqFt?: number }; media?: { coverImage?: { url: string } }; configuration?: { carpetAreaRange?: string } } | string;
  listedBy: { _id: string; name: string; companyName?: string; role: string } | string;
  listingType: 'selling' | 'buying';
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
  description: string;
  status: 'Active' | 'Paused' | 'Closed' | 'Sold';
  expectedValue: number;
  tags: string[];
  viewsCount: number;
  createdAt: string;
}

export interface MarketplaceAction {
  _id: string;
  listing: string;
  performedBy: { _id: string; name: string } | string;
  actionType: 'viewed' | 'inquired' | 'shared' | 'claimed' | 'deal_closed';
  commissionEarned?: number;
  status: 'pending' | 'approved' | 'paid';
  createdAt: string;
}

export const marketplaceApi = {
  async getListings(filters?: { listingType?: string; status?: string; search?: string }): Promise<MarketplaceListing[]> {
    const params = new URLSearchParams();
    if (filters?.listingType) params.set('listingType', filters.listingType);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);

    const response = await fetch(`${API_URL}/marketplace/listings?${params.toString()}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ listings: MarketplaceListing[] }>(response);
    return data.listings;
  },

  async getMyListings(): Promise<MarketplaceListing[]> {
    const response = await fetch(`${API_URL}/marketplace/listings/my`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ listings: MarketplaceListing[] }>(response);
    return data.listings;
  },

  async createListing(data: {
    project?: string;
    listingType: 'selling' | 'buying';
    commissionType: 'percentage' | 'fixed';
    commissionValue: number;
    description?: string;
    expectedValue?: number;
    tags?: string[];
  }): Promise<MarketplaceListing> {
    const response = await fetch(`${API_URL}/marketplace/listings`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const data2 = await handleResponse<{ listing: MarketplaceListing }>(response);
    return data2.listing;
  },

  async updateListing(id: string, data: Partial<MarketplaceListing>): Promise<MarketplaceListing> {
    const response = await fetch(`${API_URL}/marketplace/listings/${id}`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const res = await handleResponse<{ listing: MarketplaceListing }>(response);
    return res.listing;
  },

  async trackAction(listingId: string, actionType: string): Promise<MarketplaceAction> {
    const response = await fetch(`${API_URL}/marketplace/listings/${listingId}/action`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ actionType }),
    });
    const data = await handleResponse<{ action: MarketplaceAction }>(response);
    return data.action;
  },

  async getMyCommissions(): Promise<{ actions: MarketplaceAction[]; totalEarned: number; totalPending: number }> {
    const response = await fetch(`${API_URL}/marketplace/commissions`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAllActions(): Promise<MarketplaceAction[]> {
    const response = await fetch(`${API_URL}/marketplace/admin/actions`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ actions: MarketplaceAction[] }>(response);
    return data.actions;
  },

  async updateActionStatus(actionId: string, status: string): Promise<MarketplaceAction> {
    const response = await fetch(`${API_URL}/marketplace/admin/actions/${actionId}/status`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await handleResponse<{ action: MarketplaceAction }>(response);
    return data.action;
  },
};

/* ----------------------------------
   Notification API
-----------------------------------*/

export interface AppNotification {
  _id: string;
  recipient: string;
  type: 'lead_stage_change' | 'new_lead_assigned' | 'new_chat_message' | 'marketplace_action' | 'commission_update' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  async getAll(unreadOnly = false): Promise<AppNotification[]> {
    const params = unreadOnly ? '?unread=true' : '';
    const response = await fetch(`${API_URL}/notifications${params}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async markAsRead(ids: string[]): Promise<void> {
    const response = await fetch(`${API_URL}/notifications/read`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: ids }),
    });
    await handleResponse(response);
  },
};

/* ----------------------------------
   CRM Bridge Types
-----------------------------------*/

export interface CrmStatus {
  linked: boolean;
  oneEmployeeOwnerId?: string;
  connectedEmail?: string;
  connectedPhone?: string;
  degraded?: boolean;
}

export interface CrmLead {
  id: string;
  first_name: string;
  last_name?: string;
  phone_number: string;
  email?: string;
  status: 'HOT' | 'WARM' | 'COLD' | 'CREATED';
  score: number;
  source: string;
  linkActivity: {
    visitCount: number;
    lastVisitAt?: string;
    ctaClicks: Array<{ type: string; timestamp: string; projectId: string }>;
  };
  // Full lead detail fields (only present in getLeadById response)
  callHistory?: Array<{
    callId?: string;
    callNumber: number;
    startTime?: string;
    endTime?: string;
    duration?: number;
    transcript?: string;
    summary?: unknown;
    sentiment?: string;
    interest?: string;
    budget?: string;
    timeline?: string;
    status?: string;
  }>;
  whatsappData?: {
    status?: string;
    sentAt?: string;
    lastReply?: string;
    replyAt?: string;
    conversationStage?: string;
  };
  voiceCallData?: {
    status?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    transcript?: string;
    callSummary?: unknown;
  };
  aiCallResult?: {
    interest?: string;
    budget?: string;
    timeline?: string;
    sentiment?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CrmAnalytics {
  total: number;
  hot: number;
  warm: number;
  cold: number;
  engagementRate: number;
  avgScore: number;
  recentActivity: Array<Pick<CrmLead, 'id' | 'first_name' | 'last_name' | 'status' | 'score' | 'updatedAt'>>;
}

export interface CrmLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface CrmLeadsResponse {
  leads: CrmLead[];
  total: number;
  page: number;
  pages: number;
}

/* ----------------------------------
   CRM Bridge API
-----------------------------------*/

export const crmBridgeApi = {
  async getStatus(): Promise<CrmStatus> {
    const response = await fetch(`${API_URL}/crm-bridge/status`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<CrmStatus>(response);
  },

  async link(phoneOrEmail: string): Promise<{
    linked: boolean;
    ownerEmail?: string;
    ownerPhone?: string;
    alreadyLinked?: boolean;
    switched?: boolean;
  }> {
    const response = await fetch(`${API_URL}/crm-bridge/link`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail }),
    });
    return handleResponse(response);
  },

  async unlink(): Promise<{ unlinked: boolean; partialUnlink?: boolean }> {
    const response = await fetch(`${API_URL}/crm-bridge/unlink`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getLeads(params?: CrmLeadsParams): Promise<CrmLeadsResponse> {
    const query = new URLSearchParams();
    if (params?.page)      query.set('page', String(params.page));
    if (params?.limit)     query.set('limit', String(params.limit));
    if (params?.status)    query.set('status', params.status);
    if (params?.search)    query.set('search', params.search);
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate)   query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_URL}/crm-bridge/leads${qs}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<CrmLeadsResponse>(response);
  },

  async getLeadById(leadId: string): Promise<CrmLead> {
    const response = await fetch(`${API_URL}/crm-bridge/leads/${encodeURIComponent(leadId)}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<CrmLead>(response);
  },

  async getAnalytics(params?: { startDate?: string; endDate?: string }): Promise<CrmAnalytics> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate)   query.set('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_URL}/crm-bridge/analytics${qs}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse<CrmAnalytics>(response);
  },

  async getSsoToken(redirectPath: string): Promise<{ token: string; expiresIn: number }> {
    const response = await fetch(`${API_URL}/crm-bridge/sso-token`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirectPath }),
    });
    return handleResponse<{ token: string; expiresIn: number }>(response);
  },

  async autoLink(): Promise<{
    linked: boolean;
    autoLinked?: boolean;
    alreadyLinked?: boolean;
    ownerEmail?: string;
    ownerPhone?: string;
    oneEmployeeOwnerId?: string;
    connectedEmail?: string;
    connectedPhone?: string;
    degraded?: boolean;
  }> {
    const response = await fetch(`${API_URL}/crm-bridge/auto-link`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getRedirectBase(): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/crm-bridge/redirect-base`, {
        ...COMMON_FETCH_OPTIONS,
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<{ redirectBase: string }>(response);
      return data.redirectBase;
    } catch {
      return 'https://lead-filteration-backend-624770114041.asia-south1.run.app';
    }
  },

  // ── Lead Journey / Sales Funnel ──────────────────────────────────────────

  async getJourney(leadId: string) {
    const response = await fetch(`${API_URL}/crm-bridge/journey/${encodeURIComponent(leadId)}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async advanceStage(leadId: string, data: { stage: string; notes?: string; metadata?: Record<string, unknown> }) {
    const response = await fetch(`${API_URL}/crm-bridge/journey/${encodeURIComponent(leadId)}/advance`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePropertyInterest(leadId: string, data: Record<string, unknown>) {
    const response = await fetch(`${API_URL}/crm-bridge/journey/${encodeURIComponent(leadId)}/property-interest`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getFunnel() {
    const response = await fetch(`${API_URL}/crm-bridge/journey/funnel`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getRecentActivity(limit = 20) {
    const response = await fetch(`${API_URL}/crm-bridge/journey/recent?limit=${limit}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createAccount() {
    const response = await fetch(`${API_URL}/crm-bridge/create-account`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async linkByIdentifier(phoneOrEmail: string) {
    const response = await fetch(`${API_URL}/crm-bridge/link-by-identifier`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneOrEmail }),
    });
    return handleResponse(response);
  },
};

/* ----------------------------------
   Group Chat API (Module 1: Smart Chat + Auto-Match)
-----------------------------------*/

export interface GroupRoom {
  _id: string;
  name: string;
  roomType: 'project' | 'area' | 'universal';
  project?: { _id: string; projectName: string; city?: string; location?: string; slug?: string; pricing?: { startingPrice?: number }; media?: { coverImage?: { url: string } }; configuration?: { bhkOptions?: string[] }; reraNumber?: string; projectStatus?: string };
  area?: { city: string; location: string };
  createdBy: { _id: string; name: string };
  members: Array<{ user: { _id: string; name: string; role: string; companyName?: string }; role: string; joinedAt: string }>;
  description: string;
  active: boolean;
  isUniversal?: boolean;
  canLeave?: boolean;
  isAutoCreated?: boolean;
  lastActivity: string;
  createdAt: string;
}

export interface InventoryCard {
  project?: string;
  bhkOptions: string[];
  priceRange: { min: number; max: number };
  area: string;
  city: string;
  possessionStatus: string;
  bankLoanAvailable: boolean;
  commissionPercent: number;
  description: string;
}

export interface RequirementCard {
  bhkType: string;
  budget: number; // in lakhs
  area: string;
  city: string;
  possessionNeeded: string;
  loanRequired: boolean;
  urgency: 'normal' | 'urgent' | 'very_urgent';
  clientNotes: string;
}

export interface MatchResult {
  project: {
    _id: string;
    projectName: string;
    city?: string;
    location?: string;
    pricing?: { startingPrice?: number; bankLoanAvailable?: boolean };
    configuration?: { bhkOptions?: string[] };
    owner?: { _id: string; name: string; companyName?: string; verificationStatus?: { builder: string } };
    slug?: string;
    media?: { coverImage?: { url: string } };
  };
  score: number;
  matchedOn: string[];
}

export interface GroupMessage {
  _id: string;
  room: string;
  sender: { _id: string; name: string; role: string; companyName?: string };
  messageType: 'text' | 'inventory_card' | 'requirement_card' | 'system';
  content: string;
  inventoryCard?: InventoryCard;
  requirementCard?: RequirementCard;
  matchResults?: MatchResult[];
  createdAt: string;
}

export interface DealRoom {
  _id: string;
  agent: { _id: string; name: string; role: string; companyName?: string; phone?: string };
  builder: { _id: string; name: string; role: string; companyName?: string; phone?: string };
  project: { _id: string; projectName: string; city?: string; location?: string; pricing?: { startingPrice?: number }; media?: { coverImage?: { url: string } }; slug?: string };
  clientBudget: number;
  projectPrice: number;
  commissionPercent: number;
  commissionAmount: number;
  status: 'initiated' | 'in_discussion' | 'site_visit_scheduled' | 'negotiation' | 'closed_won' | 'closed_lost';
  chatSession?: string;
  notes: Array<{ content: string; addedBy: { _id: string; name: string }; addedAt: string }>;
  statusHistory: Array<{ from: string; to: string; changedBy: string; changedAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export const groupChatApi = {
  // ── Rooms ──────────────────────────────────────────────
  async createRoom(data: {
    name: string;
    roomType: 'project' | 'area';
    projectId?: string;
    area?: { city: string; location: string };
    description?: string;
  }): Promise<GroupRoom> {
    const response = await fetch(`${API_URL}/group-chat/rooms`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ room: GroupRoom }>(response);
    return result.room;
  },

  async getRooms(params?: { type?: string; search?: string }): Promise<{ myRooms: GroupRoom[]; discoverRooms: GroupRoom[] }> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const response = await fetch(`${API_URL}/group-chat/rooms${qs}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async joinRoom(roomId: string): Promise<GroupRoom> {
    const response = await fetch(`${API_URL}/group-chat/rooms/${roomId}/join`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const result = await handleResponse<{ room: GroupRoom }>(response);
    return result.room;
  },

  async leaveRoom(roomId: string): Promise<void> {
    const response = await fetch(`${API_URL}/group-chat/rooms/${roomId}/leave`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  async deleteRoom(roomId: string): Promise<void> {
    const response = await fetch(`${API_URL}/group-chat/rooms/${roomId}`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },

  // ── Messages ───────────────────────────────────────────
  async getMessages(roomId: string, page = 1): Promise<GroupMessage[]> {
    const response = await fetch(`${API_URL}/group-chat/rooms/${roomId}/messages?page=${page}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ messages: GroupMessage[] }>(response);
    return data.messages;
  },

  async postMessage(roomId: string, data: {
    messageType: 'text' | 'inventory_card' | 'requirement_card';
    content?: string;
    inventoryCard?: InventoryCard;
    requirementCard?: RequirementCard;
  }): Promise<GroupMessage> {
    const response = await fetch(`${API_URL}/group-chat/rooms/${roomId}/messages`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ message: GroupMessage }>(response);
    return result.message;
  },

  // ── Deal Rooms ─────────────────────────────────────────
  async showInterest(data: {
    projectId: string;
    messageId?: string;
    roomId?: string;
  }): Promise<{ dealRoom: DealRoom; chatSession: string; message: string }> {
    const response = await fetch(`${API_URL}/group-chat/interested`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getDeals(status?: string): Promise<DealRoom[]> {
    const params = status ? `?status=${status}` : '';
    const response = await fetch(`${API_URL}/group-chat/deals${params}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ deals: DealRoom[] }>(response);
    return data.deals;
  },

  async updateDealStatus(dealId: string, data: {
    status: string;
    note?: string;
    commissionPercent?: number;
  }): Promise<DealRoom> {
    const response = await fetch(`${API_URL}/group-chat/deals/${dealId}/status`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<{ deal: DealRoom }>(response);
    return result.deal;
  },
};

/* ----------------------------------
   Profile API
-----------------------------------*/

export const profileApi = {
  async update(data: {
    name?: string;
    email?: string;
    companyName?: string;
    businessLogoUrl?: string;
    profilePictureUrl?: string;
  }): Promise<AuthUser> {
    const response = await fetch(`${API_URL}/users/profile`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await handleResponse<{ user: any }>(response);
    return transformUserBackendToFrontend(result.user);
  },

  async uploadProfilePicture(file: File): Promise<AuthUser> {
    // Reuse the logo upload endpoint for profile pictures (same R2 bucket, same format)
    const uploaded = await mediaApi.uploadLogo(file);
    // Then update the user profile with the new URL
    return profileApi.update({ profilePictureUrl: uploaded.url });
  },
};

/* ----------------------------------
   Share API — Personalized sharing with contact details
-----------------------------------*/

export interface ShareContactInfo {
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  businessLogoUrl: string | null;
  businessAddress: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessPinCode?: string | null;
  role: string;
}

export interface ShareTokenResponse {
  token: string;
  shareUrl: string;
  type: 'link' | 'pdf' | 'qr';
  projectId: string;
}

export interface ResolvedShareData {
  project: any;
  sharedBy: ShareContactInfo;
  type: string;
  viewCount: number;
}

export interface ShareRecord {
  _id: string;
  token: string;
  project: { _id: string; projectName: string; slug: string; city?: string; media?: { coverImage?: { url: string } } };
  type: 'link' | 'pdf' | 'qr';
  viewCount: number;
  lastViewedAt?: string;
  createdAt: string;
}

export const shareApi = {
  /**
   * Generate a personalized share token for a project.
   * The authenticated user's contact details are tied to this token.
   */
  async generateToken(projectId: string, type: 'link' | 'pdf' | 'qr'): Promise<ShareTokenResponse> {
    const response = await fetch(`${API_URL}/share/generate`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, type }),
    });
    return handleResponse<ShareTokenResponse>(response);
  },

  /**
   * Resolve a share token (public — no auth).
   * Returns the project data + sharer's contact info.
   */
  async resolveToken(token: string): Promise<ResolvedShareData> {
    const response = await fetch(`${API_URL}/public/share/${token}`, COMMON_FETCH_OPTIONS);
    return handleResponse<ResolvedShareData>(response);
  },

  /**
   * Get the authenticated user's contact info for PDF embedding.
   */
  async getMyContact(): Promise<ShareContactInfo> {
    const response = await fetch(`${API_URL}/share/my-contact`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ contactInfo: ShareContactInfo }>(response);
    return data.contactInfo;
  },

  /**
   * Get all share tokens created by the current user (for analytics).
   */
  async getMyShares(): Promise<ShareRecord[]> {
    const response = await fetch(`${API_URL}/share/my-shares`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ shares: ShareRecord[] }>(response);
    return data.shares;
  },

  /**
   * Download all project media with contact details watermarked on images.
   * Images get a branded contact strip at the bottom.
   * Videos download as-is. Brochures are excluded from gallery download.
   */
  async downloadGallery(projectId: string, projectName?: string): Promise<void> {
    // Fetch project details
    const project = await projectsApi.getById(projectId);
    if (!project) throw new Error('Project not found');

    // Fetch user's contact info
    const contact = await this.getMyContact();

    const name = (project as any).projectName || (project as any).name || projectName || 'Project';
    const safeName = name.replace(/[^a-zA-Z0-9\s-]/g, '').trim();

    // Helper to get URL from file object
    const getUrl = (fileObj: any): string | null => {
      if (!fileObj) return null;
      if (typeof fileObj === 'string') return fileObj;
      return fileObj.url || null;
    };

    // Collect media
    const images: { url: string; filename: string }[] = [];
    const others: { url: string; filename: string }[] = [];

    const coverUrl = getUrl((project as any).media?.coverImage) || getUrl((project as any).coverImage);
    if (coverUrl) images.push({ url: coverUrl, filename: `${safeName}_Cover.jpg` });

    const gallery = (project as any).media?.galleryImages || (project as any).galleryImages || [];
    gallery.forEach((img: any, i: number) => {
      const url = getUrl(img);
      if (url) images.push({ url, filename: `${safeName}_Gallery_${i + 1}.jpg` });
    });

    const layoutUrl = getUrl((project as any).media?.layoutImage) || getUrl((project as any).layoutImage);
    if (layoutUrl) images.push({ url: layoutUrl, filename: `${safeName}_Layout.jpg` });

    const videos = (project as any).media?.videos || (project as any).videos || [];
    videos.forEach((vid: any, i: number) => {
      const url = getUrl(vid);
      if (url) others.push({ url, filename: `${safeName}_Video_${i + 1}.mp4` });
    });

    if (images.length === 0 && others.length === 0) throw new Error('No media found for this project');

    // Watermark helper: draws contact info strip at bottom of image
    const R2_HOST = 'pub-daa9113fecb449cfb19044d3d822effd.r2.dev';
    const watermarkImage = async (imgUrl: string): Promise<Blob> => {
      // Proxy R2 URLs to avoid CORS
      let fetchUrl = imgUrl;
      if (imgUrl.includes(R2_HOST)) {
        const path = imgUrl.split(R2_HOST)[1];
        fetchUrl = `/r2-assets${path}`;
      }

      // Fetch image as blob to bypass CORS
      const response = await fetch(fetchUrl);
      const imgBlob = await response.blob();
      const objectUrl = URL.createObjectURL(imgBlob);

      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const stripHeight = Math.max(48, Math.round(img.height * 0.07));
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height + stripHeight;
          const ctx = canvas.getContext('2d')!;

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Draw contact strip background
          ctx.fillStyle = '#1C1917';
          ctx.fillRect(0, img.height, canvas.width, stripHeight);

          // Accent line
          ctx.fillStyle = '#B45309';
          ctx.fillRect(0, img.height, canvas.width, 3);

          // Contact text
          const fontSize = Math.max(12, Math.round(stripHeight * 0.32));
          const smallFont = Math.max(10, Math.round(stripHeight * 0.24));
          const padding = Math.round(canvas.width * 0.02);
          const textY = img.height + stripHeight * 0.55;
          const subTextY = img.height + stripHeight * 0.82;

          // Name + Company
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          const displayName = contact.companyName
            ? `${contact.name} | ${contact.companyName}`
            : contact.name;
          ctx.fillText(displayName, padding, textY);

          // Phone + Role
          ctx.font = `${smallFont}px sans-serif`;
          ctx.fillStyle = '#A8A29E';
          const subText = [contact.phone, contact.role?.charAt(0).toUpperCase() + contact.role?.slice(1)]
            .filter(Boolean).join(' • ');
          ctx.fillText(subText, padding, subTextY);

          // HomeInTown branding on right
          ctx.font = `bold ${smallFont}px sans-serif`;
          ctx.fillStyle = '#B45309';
          const brand = 'HomeInTown';
          const brandWidth = ctx.measureText(brand).width;
          ctx.fillText(brand, canvas.width - padding - brandWidth, textY);

          URL.revokeObjectURL(objectUrl);

          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
            'image/jpeg',
            0.92
          );
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
      });
    };

    // Download watermarked images
    for (let i = 0; i < images.length; i++) {
      try {
        const blob = await watermarkImage(images[i].url);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = images[i].filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        // Small delay between downloads
        if (i < images.length - 1) await new Promise(r => setTimeout(r, 600));
      } catch (err) {
        console.error(`Failed to watermark ${images[i].filename}:`, err);
      }
    }

    // Download videos as blobs to force download instead of opening in new tab
    const R2_HOST_CHECK = 'pub-daa9113fecb449cfb19044d3d822effd.r2.dev';
    for (let i = 0; i < others.length; i++) {
      try {
        await new Promise(r => setTimeout(r, 500));
        let fetchUrl = others[i].url;
        if (fetchUrl.includes(R2_HOST_CHECK)) {
          const path = fetchUrl.split(R2_HOST_CHECK)[1];
          fetchUrl = `/r2-assets${path}`;
        }
        const response = await fetch(fetchUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = others[i].filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(`Failed to download ${others[i].filename}:`, err);
        // Fallback: open in new tab if blob fetch fails
        const link = document.createElement('a');
        link.href = others[i].url;
        link.download = others[i].filename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  },

  /**
   * Deactivate a share token (disables the shared link).
   */
  async deactivateToken(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/share/${token}`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    await handleResponse(response);
  },
};

/* ----------------------------------
   Lead Matching API (Admin Intelligence)
-----------------------------------*/

export interface ExtractedLeadParams {
  bhkType?: string | null;
  budget?: number | null;
  budgetMax?: number | null;
  location?: string | null;
  locationRaw?: string | null;
  locationCanonical?: string | null;
  city?: string | null;
  propertyType?: string | null;
  transactionType?: 'buy' | 'rent' | null;
  possessionNeeded?: string | null;
  loanRequired?: boolean;
  urgency?: 'normal' | 'urgent' | 'very_urgent';
  area?: number | null;
  areaUnit?: 'sqft' | 'acres' | null;
}

export interface ExtractedLeadMatch {
  project: {
    _id: string;
    projectName: string;
    city?: string;
    location?: string;
    pricing?: { startingPrice?: number };
    configuration?: { bhkOptions?: string[] };
    slug?: string;
  };
  score: number;
  confidence: number;
  matchedOn: string[];
}

export interface ExtractedLead {
  _id: string;
  source: 'group_chat' | 'direct_chat';
  originalText: string;
  extractedBy: { _id: string; name: string; role: string; companyName?: string };
  extractedByRole: string;
  params: ExtractedLeadParams;
  intent: 'requirement' | 'implicit_requirement' | 'follow_up_requirement' | 'inventory';
  extractionConfidence: number;
  paramCount: number;
  matches: ExtractedLeadMatch[];
  matchCount: number;
  bestMatchScore: number;
  crossMatches?: { lead: { _id: string; originalText?: string; params?: ExtractedLeadParams; extractedBy?: { _id: string; name: string; role: string } }; score: number; matchedOn: string[]; matchType: string }[];
  crossMatchCount?: number;
  bestCrossMatchScore?: number;
  status: 'auto_detected' | 'confirmed' | 'rejected' | 'converted' | 'expired';
  adminNotified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadMatchingStats {
  total: number;
  withMatches: number;
  matchRate: string;
  avgConfidence: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export interface LeadMatchingPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const leadMatchingApi = {
  async getLeads(params?: {
    page?: number;
    limit?: number;
    status?: string;
    minConfidence?: number;
    source?: string;
  }): Promise<{ leads: ExtractedLead[]; pagination: LeadMatchingPagination }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);
    if (params?.minConfidence) query.set('minConfidence', String(params.minConfidence));
    if (params?.source) query.set('source', params.source);
    const qs = query.toString() ? `?${query.toString()}` : '';

    const response = await fetch(`${API_URL}/lead-matching/leads${qs}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getLeadById(id: string): Promise<{ lead: ExtractedLead }> {
    const response = await fetch(`${API_URL}/lead-matching/leads/${id}`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateLeadStatus(id: string, status: string, convertedTo?: string): Promise<{ lead: ExtractedLead }> {
    const response = await fetch(`${API_URL}/lead-matching/leads/${id}/status`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'PATCH',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, convertedTo }),
    });
    return handleResponse(response);
  },

  async getStats(): Promise<LeadMatchingStats> {
    const response = await fetch(`${API_URL}/lead-matching/stats`, {
      ...COMMON_FETCH_OPTIONS,
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async testExtract(text: string): Promise<any> {
    const response = await fetch(`${API_URL}/lead-matching/extract`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },

  async testMatch(text: string): Promise<any> {
    const response = await fetch(`${API_URL}/lead-matching/test-match`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },

  async confirm(payload: LeadConfirmPayload): Promise<LeadConfirmResult> {
    const response = await fetch(`${API_URL}/lead-matching/confirm`, {
      ...COMMON_FETCH_OPTIONS,
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse(response);
  },

  // Count live buyer leads matching each project (for the "N buyers match" card signal).
  // Returns a map of projectId -> count. Never throws for the caller's convenience;
  // returns an empty map on failure so cards can degrade gracefully.
  async getMatchCounts(projectIds: string[]): Promise<Record<string, number>> {
    const ids = (projectIds || []).filter(Boolean);
    if (ids.length === 0) return {};
    try {
      const response = await fetch(`${API_URL}/lead-matching/match-counts`, {
        ...COMMON_FETCH_OPTIONS,
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectIds: ids }),
      });
      const data = await handleResponse<{ counts: Record<string, number> }>(response);
      return data.counts || {};
    } catch {
      return {};
    }
  },
};

// ── Lead Matching: Confirm (user-reviewed params) ──────────────────────────
export interface LeadConfirmPayload {
  originalText: string;
  messageId?: string;
  roomId: string;
  source: 'group_chat';
  intent: 'requirement' | 'inventory';
  params: ExtractedLeadParams;
}

export interface LeadConfirmResult {
  success: boolean;
  lead: ExtractedLead | null;
  matches: ExtractedLeadMatch[];
  matchCount: number;
}
