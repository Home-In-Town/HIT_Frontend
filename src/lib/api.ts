// API Service for Dynamic Sales Website

export function getLeadGenUrl() {
  if (typeof window === 'undefined') return "https://www.oneemployee.in";
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? "http://localhost:5173" : "https://www.oneemployee.in";
}

import { Project, ProjectFormData, FileData } from '@/types/project';
export type { Project, ProjectFormData, FileData };

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
type MediaType = "cover" | "gallery" | "video" | "brochure";


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
    coverImage: backendProject.media?.coverImage ?? null,
    galleryImages: backendProject.media?.galleryImages ?? [],
    videos: backendProject.media?.videos ?? [],
    brochureUrl: backendProject.media?.brochurePdf ?? null,
    ctaButtonText: backendProject.cta?.buttonText ?? backendProject.ctaButtonText ?? 'Contact Us',
    whatsappNumber: backendProject.cta?.whatsappNumber ?? backendProject.whatsappNumber ?? '',
    callNumber: backendProject.cta?.callNumber ?? backendProject.callNumber ?? '',
    slug: backendProject.slug || '',
    trackableLink: backendProject.slug ? `/visit/${backendProject.slug}` : '',
    isPublished: backendProject.status === 'published' || backendProject.isPublished,
    landmarks: backendProject.landmarks || [],
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
      // Only include media if it's a valid {url, key} object (not a blob:/data: string)
      ...(project.coverImage && typeof project.coverImage === 'object' && { coverImage: project.coverImage }),
      ...(project.galleryImages?.length && { galleryImages: project.galleryImages.filter((img: any) => typeof img === 'object' && img?.url) }),
      ...(project.videos?.length && { videos: project.videos.filter((vid: any) => typeof vid === 'object' && vid?.url) }),
      ...(project.brochureUrl && typeof project.brochureUrl === 'object' && { brochurePdf: project.brochureUrl })
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

  async uploadBrochure(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("brochure", file);

    const headers = getAuthHeaders ? getAuthHeaders() : {};

    // ❌ REMOVE content-type if present
    delete (headers as any)["Content-Type"];

    const response = await fetch(`${API_URL}/upload/brochure`, {
      method: "POST",
      body: formData,
      headers,
    });

    if (!response.ok) {
      let errorMessage = "Upload failed";
      try {
        const err = await response.json();
        errorMessage = err.message || errorMessage;
      } catch { }
      throw new Error(errorMessage);
    }

    return response.json();
  }
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

  // ================= 6. REPLACE (proxy-based) =================
  async replaceFile(params: {
    projectId: string;
    type: "cover" | "brochure";
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
  role: 'admin' | 'builder' | 'agent' | 'unassigned' | 'user' | 'employee';
  companyName?: string;
  phone: string;
  isActive: boolean;
  isVerified: boolean;
  isEmployerConfirmed?: boolean;
  employerId?: string | { id?: string; _id?: string; name: string; phone?: string; role?: string };
  isAlreadyAssigned?: boolean;
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
};

/* ----------------------------------
   Real Authentication API
-----------------------------------*/

export const authApi = {

  // Start Registration
  async register(data: { name: string; phone: string; mpin: string; email?: string; role?: string }): Promise<{ message: string }> {
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
  commissionPercentage: number;
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
    project: string;
    listingType: 'selling' | 'buying';
    commissionPercentage: number;
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
