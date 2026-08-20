'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { organizationsApi, Organization, projectsApi, usersApi, Project, ApiError, transformBackendToFrontend } from '@/lib/api';
import { toast } from 'react-hot-toast';
import ProjectGrid from '@/components/dashboard/ProjectGrid';

export default function OrganizationsPage() {
  const { user, status } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false); // For modal data

  // Form Data
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Available Data (Fetched when modal opens)
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [availableAgents, setAvailableAgents] = useState<{ id: string; name: string; email: string }[]>([]);

  // Logic: Show dropdowns
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  const [nameError, setNameError] = useState<string | null>(null);
   const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selfRemoveTarget, setSelfRemoveTarget] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'created'>('all');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);
  // Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Initial Fetch
  useEffect(() => {
    if (user) {
      fetchOrganizations(filter);
    }
  }, [user, filter]);

  // Fetch Modal Data when modal opens
  useEffect(() => {
    if (isModalOpen && availableProjects.length === 0) {
      fetchModalData();
    }
  }, [isModalOpen]);
  useEffect(() => {
  if (!selectedOrg && organizations.length > 0) {
    setSelectedOrg(organizations[0]);
  }
}, [organizations, selectedOrg]);
useEffect(() => {
  setShowAllProjects(false);
}, [selectedOrg?.id]);
useEffect(() => {
  if (pendingSelectId && organizations.length > 0) {
    const found = organizations.find(o => o.id === pendingSelectId);
    if (found) {
      setSelectedOrg(found);
      setPendingSelectId(null);
    }
  }
}, [organizations, pendingSelectId]);
 const fetchOrganizations = async (type?: 'all' | 'assigned' | 'created') => {
  if (!user) return;

  try {
    setIsLoading(true);

    const data = await organizationsApi.getAll(type);

    setOrganizations(data);
  } catch (error) {
    console.error('Failed to fetch organizations', error);

    if (error instanceof ApiError) {
      toast.error(error.message);
    } else {
      toast.error('Failed to load organizations');
    }
  } finally {
    setIsLoading(false);
  }
};


  const fetchModalData = async () => {
    try {
      setIsDataLoading(true);
      const [projects, agents] = await Promise.all([
        projectsApi.getAll(),
        usersApi.getByRole('agent')
      ]);
      
      const normalizedProjects: Project[] = projects.map((p: any) => ({
        ...p,
        id: p.id ?? p._id,   // always ensure id exists
      }));
      setAvailableProjects(normalizedProjects);
      setAvailableAgents(agents);
    } catch (error) {
      console.error('Failed to fetch data for form', error);
      toast.error('Could not load projects or agents');
    } finally {
      setIsDataLoading(false);
    }
  };
const handleDelete = async (id: string) => {
  try {
    setIsDeleting(true);

    await organizationsApi.delete(id);

    await fetchOrganizations(filter);

    setSelectedOrg(prev => {
      if (prev?.id === id) return null;
      return prev;
    });
    toast.success('Organization deleted');

    setDeleteTarget(null);

  } catch (error) {
    if (error instanceof ApiError) {
      toast.error(error.message);
    } else {
      toast.error('Failed to delete organization');
    }
  } finally {
    setIsDeleting(false);
  }
};


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  const trimmedName = formData.name.trim();
  const trimmedDescription = formData.description.trim();

  if (!trimmedName) {
    setNameError("Organization name is required");
    return;
  }

  try {
    setIsSubmitting(true);
    setNameError(null);

    let result: Organization;

    if (editingOrg) {
      // UPDATE
      result = await organizationsApi.update(editingOrg.id, {
        name: trimmedName,
        description: trimmedDescription,
        projects: selectedProjects,
        agents: selectedAgents,
      });

      await fetchOrganizations(filter);

      // keep selected org updated
      setSelectedOrg(result);

      toast.success("Organization updated");
    } else {
      // CREATE
      result = await organizationsApi.create({
        name: trimmedName,
        description: trimmedDescription,
        projects: selectedProjects,
        agents: selectedAgents,
      });

     setPendingSelectId(result.id);
      await fetchOrganizations(filter);

      toast.success("Organization created");
    }

    resetModal();
    setIsModalOpen(false);

  } catch (error) {
    if (
      error instanceof ApiError &&
      error.message.toLowerCase().includes("exist")
    ) {
      setNameError("Organization name already exists");
      return;
    }

    toast.error(editingOrg ? "Update failed" : "Create failed");
  } finally {
    setIsSubmitting(false);
  }
};


  // Toggle Selection Helpers
  const toggleProject = (id: string) => {
    setSelectedProjects(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

const openEditModal = (org: Organization) => {
  resetModal();
  setEditingOrg(org);

  setFormData({
    name: org.name,
    description: org.description || '',
  });

  setSelectedProjects(
  (org.projects ?? [])
    .map((p: any) => (p.id ?? p._id)?.toString())
    .filter(Boolean)
);
  setSelectedAgents(org.agents?.map(a => a._id) ?? []);

  setIsModalOpen(true);
};


const resetModal = () => {
  setEditingOrg(null);
  setFormData({ name: '', description: '' });
  setSelectedProjects([]);
  setSelectedAgents([]);
  setShowProjectDropdown(false);
  setShowAgentDropdown(false);
  setNameError(null);
};


 const openCreateModal = () => {
  resetModal();

  // If logged in user is agent → auto add himself
  if (user?.role === "agent" && user.id) {
    setSelectedAgents([user.id]);
  }

  setIsModalOpen(true);
};

const handleNameChange = (value: string) => {
  setFormData(prev => ({ ...prev, name: value }));
  setNameError(null);
};


const handleRemoveAgent = (id: string) => {
  const isCurrentUser = user?.id === id;

  // 🚫 Prevent removing self during CREATE
  if (!editingOrg && isCurrentUser && user?.role === "agent") {
    toast.error("You must remain part of the organization.");
    return;
  }

  // Allow self removal only during edit
  if (editingOrg && isCurrentUser && user?.role === "agent") {
    setSelfRemoveTarget(id);
    return;
  }

  toggleAgent(id);
};

const mappedProjects: Project[] = (selectedOrg?.projects ?? []).map((p: any) =>
  transformBackendToFrontend(p)
);
  return (
    <div className="h-screen overflow-hidden bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E5E4] sticky top-0 z-30 mb-4 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-5">
          <div className="flex items-center justify-between md:flex-row md:items-center md:justify-between gap-3">
            {/* LEFT */}
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight truncate">
                {user.name} <span className="text-[#B45309]">Organizations</span>
              </h1>
              <p className="hidden md:block mt-0.5 text-xs text-[#57534E] font-medium tracking-wide">
                Manage your agency partners and teams
              </p>
            </div>

            {/* RIGHT BUTTON */}
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold text-white bg-[#B45309] hover:bg-[#92400E] transition-all duration-200 shadow-lg shadow-[#B45309]/20"
            >
              <svg className="h-4 w-4 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden md:inline">Create Organization</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 sm:px-6 lg:px-8">
        {user.role === 'agent' && (
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'View All' },
              { key: 'assigned', label: 'Assigned' },
              { key: 'created', label: 'Created' },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                  filter === btn.key
                    ? 'bg-[#B45309] text-white border-transparent shadow-md shadow-[#B45309]/20'
                    : 'bg-white text-[#57534E] border-[#E7E5E4] hover:border-[#B45309] hover:text-[#B45309]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 h-[calc(100vh-140px)]">
        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-[2rem] border border-[#E7E5E4] animate-pulse shadow-sm shadow-[#B45309]/5" />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] border border-[#E7E5E4] shadow-sm shadow-[#B45309]/5 max-w-2xl mx-auto mt-12">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-[2rem] bg-[#FAF7F2] mb-6 border border-[#E7E5E4]">
              <svg className="h-10 w-10 text-[#A8A29E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">No organizations yet</h3>
            <p className="mt-2 text-sm text-[#57534E] font-medium max-w-sm mx-auto">
              Get started by creating your first organization to structure your teams and projects.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-8 inline-flex items-center px-6 py-3 border border-[#E7E5E4] shadow-sm text-sm font-bold rounded-2xl text-[#2A2A2A] bg-white hover:border-[#B45309] hover:text-[#B45309] focus:outline-none transition-all"
            >
              Create Now
            </button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row h-full bg-white shadow-2xl shadow-[#B45309]/5 rounded-3xl border border-[#E7E5E4] overflow-hidden">
            <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r overflow-y-auto max-h-[40%] md:max-h-full">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className={`p-4 pl-6 cursor-pointer hover:bg-[#FAF7F2] transition-colors border-l-4 ${
                    selectedOrg?.id === org.id 
                      ? "bg-[#FAF7F2] border-[#B45309]" 
                      : "border-transparent"
                  }`}
                >
                  <h3 className="font-bold text-base">{org.name}</h3>
                  <p className="text-xs text-gray-500 truncate">
                    {org.description || "No description"}
                  </p>

                  <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] mt-3">
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#B45309]/20" />{org.projects?.length || 0} Projects</span>
                    <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#B45309]/20" />{org.agents?.length || 0} Agents</span>
                  </div>
                </div>
              ))}
            </div>
           <div className="flex-1 p-4 md:p-5 overflow-y-auto">
              {!selectedOrg ? (
                  <div className="hidden md:block text-[#A8A29E] font-medium text-center mt-20">
                    Select an organization from the list to view its details.
                  </div>
                ) : (
                <>
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-[#2A2A2A] font-serif tracking-tight">{selectedOrg.name}</h2>
                      <p className="text-xs text-[#57534E] font-medium mt-1">
                        {selectedOrg.description || "No description provided."}
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2">
  
                      {/* DELETE BUTTON */}
                      <button
                        onClick={() =>
                          selectedOrg &&
                          setDeleteTarget({ id: selectedOrg.id, name: selectedOrg.name })
                        }
                        disabled={deletingId === selectedOrg?.id}
                        className="text-xs md:text-sm px-4 py-2 rounded-xl bg-red-50 text-red-800 hover:bg-red-100 border border-red-100 transition-all font-bold disabled:opacity-50"
                      >
                        {deletingId === selectedOrg?.id ? "..." : "Delete"}
                      </button>

                      {/* MANAGE BUTTON */}
                      <button
                        onClick={() => openEditModal(selectedOrg)}
                        className="text-xs md:text-sm px-4 py-2 rounded-xl bg-[#B45309] text-white hover:bg-[#92400E] transition-all font-bold shadow-md shadow-[#B45309]/20"
                      >
                        Manage →
                      </button>
                    </div>         
                  </div>

                  {/* Projects */}
                  <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-[#2A2A2A] font-serif">
                        Associated Projects ({selectedOrg.projects?.length || 0})
                      </h3>
                    </div>

                    {mappedProjects.length === 0 ? (
                      <div className="text-sm text-[#A8A29E] font-medium bg-[#FAF7F2] p-6 rounded-2xl border border-[#E7E5E4] border-dashed text-center">
                        No projects have been assigned to this organization.
                      </div>
                    ) : (
                     <div className="rounded-2xl overflow-hidden border border-[#E7E5E4] bg-white shadow-sm">
                        {(showAllProjects ? mappedProjects : mappedProjects.slice(0, 5)).map((project, index) => (
                          
                          <div
                            key={project.id}
                              className={`
                                p-5 grid grid-cols-2 grid-rows-2 md:grid-cols-[2fr_auto_auto_auto_auto] 
                                gap-4 items-center
                               ${index !== 0 ? "border-t border-[#E7E5E4]/50" : ""}
                                hover:bg-[#FAF7F2]/50 transition-colors
                              `}
                          >
                            <div className="col-start-1 row-start-1">
                              <h4 className="font-bold text-[#2A2A2A] text-sm font-serif">
                                {project.name}
                              </h4>
                              <p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-wider">
                                {project.city}
                              </p>
                            </div>

                            <div className="col-start-2 row-start-1 text-[10px] font-bold uppercase tracking-wider bg-[#FAF7F2] text-[#57534E] px-2 py-1 rounded border border-[#E7E5E4] w-fit">
                              {project.type}
                            </div>

                            <div className="col-start-1 row-start-2 text-[10px] font-bold uppercase tracking-wider bg-[#B45309]/5 text-[#B45309] px-2 py-1 rounded border border-[#B45309]/10 w-fit">
                              {project.projectStatus}
                            </div>

                            <div className="col-start-2 row-start-2 text-xs font-bold text-[#2A2A2A] font-mono text-right md:text-left">
                              {project.startingPrice > 0
                                ? `₹${(project.startingPrice / 100000).toFixed(1)}L+`
                                : "-"}
                            </div>

                            <div className="col-span-2 md:col-span-1">
                              <button
                                onClick={async () => {
                                  try {
                                    if (!project.trackableLink) {
                                      toast.error("Link not available");
                                      return;
                                    }
                                    const fullLink = `${window.location.origin}${project.trackableLink}`;
                                    await navigator.clipboard.writeText(fullLink);
                                    toast.success("Link copied");
                                  } catch (err) {
                                    toast.error("Failed to copy");
                                  }
                                }}
                                className="text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-[#E7E5E4] rounded-lg hover:bg-white hover:border-[#B45309] hover:text-[#B45309] transition-all w-full text-center"
                              >
                                Copy Link
                              </button>
                            </div>
                          </div>

                        ))}
                      </div>
                    )}
                   
                   {mappedProjects.length > 5 && (
                      <button
                        onClick={() => setShowAllProjects(prev => !prev)}
                        className="text-[#B45309] text-xs font-bold uppercase tracking-widest mt-4 hover:underline"
                      >
                        {showAllProjects ? "Show less ↑" : "See more →"}
                      </button>
                    )}
                  </div>

                  {/* Agents */}
                  <div className="mt-8">
                    <h3 className="font-bold text-[#2A2A2A] font-serif mb-3">Assigned Agents</h3>
                    <div className="flex flex-wrap gap-3">
                      {(selectedOrg.agents || []).map((a) => (
                        <div key={a._id} className="flex items-center gap-2 bg-[#FAF7F2] border border-[#E7E5E4] px-3 py-1.5 rounded-xl">
                          <div className="w-6 h-6 rounded-lg bg-[#B45309]/10 flex items-center justify-center text-[#B45309] text-[10px] font-bold uppercase">
                            {a.name.charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-[#57534E]">{a.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto " aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" 
              aria-hidden="true"
              onClick={() => setIsModalOpen(false)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-middle bg-white rounded-[2.5rem] text-left overflow-hidden shadow-[0_20px_50px_rgba(180,83,9,0.15)] transform transition-all sm:my-8 sm:max-w-xl sm:w-full relative z-50 border border-[#E7E5E4]">
              <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white px-10 py-8 border-b border-[#E7E5E4] relative">
                  <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">
                    {editingOrg ? 'Edit Organization' : 'Create New Organization'}
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="absolute right-8 top-8 text-[#A8A29E] hover:text-[#B45309] transition-colors p-2"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="px-10 py-10 overflow-y-auto">
                    {isDataLoading ? (
                         <div className="flex justify-center py-8">
                             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
                         </div>
                    ) : (                    <div className="space-y-6">
                      <div className="bg-[#FAF7F2] p-8 rounded-[2rem] border border-[#E7E5E4] space-y-6">
                        <div>
                          <label htmlFor="org-name" className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-1">
                            Organization Name <span className="text-[#B45309] ml-1">*</span>
                          </label>
                          <input
                            type="text"
                            name="org-name"
                            id="org-name"
                            className={`block w-full rounded-2xl border-[#E7E5E4] bg-white text-[#2A2A2A] shadow-sm focus:border-[#B45309] focus:ring-[#B45309] sm:text-base px-6 py-4 transition-all placeholder-[#A8A29E] font-serif ${
                              nameError ? 'border-red-500 ring-red-500' : ''
                            }`}
                            placeholder="e.g. Acme Realty Group"
                            value={formData.name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            required
                          />
                          {nameError && <p className='mt-2 text-xs font-bold text-red-600 px-2'>{nameError}</p>}
                        </div>
                        
                        <div>
                          <label htmlFor="description" className="block text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mb-3 px-1">
                            Description
                          </label>
                          <textarea
                            name="description"
                            id="description"
                            rows={3}
                            className="block w-full rounded-2xl border-[#E7E5E4] bg-white text-[#2A2A2A] shadow-sm focus:border-[#B45309] focus:ring-[#B45309] sm:text-base px-6 py-4 transition-all placeholder-[#A8A29E]"
                            placeholder="Share a brief overview of your group..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>
                      </div>
                    
                    <div className="border-t border-[#E7E5E4]/50 my-10"></div>

                    {/* Add Projects Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                             <label className="block text-sm font-bold text-[#2A2A2A] font-serif">Assigned Projects</label>
                             <button
                                type="button" 
                                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest hover:text-[#92400E] flex items-center gap-1.5 transition-colors"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                Manage Projects
                             </button>
                        </div>
                        
                        {/* Selected Projects Chips */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {selectedProjects.map(id => {
                            const apiProject = availableProjects.find(
                              p => (p.id ?? (p as any)._id)?.toString() === id
                            );

                            const orgProject = editingOrg?.projects?.find(
                              (p: any) => (p.id ?? p._id)?.toString() === id
                            );

                            let name = apiProject?.name || orgProject?.projectName || (orgProject as any)?.name || "Unknown";

                            return (
                              <span key={`project-${id}`}
                                className="inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/20 shadow-sm"
                              >
                                {name}
                                <button
                                  type="button"
                                  onClick={() => toggleProject(id)}
                                  className="ml-2 hover:text-[#2A2A2A] transition-colors"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}
                        </div>


                        {/* Projects Dropdown */}
                        {showProjectDropdown && (
                            <div className="mt-2 max-h-48 overflow-y-auto border border-[#E7E5E4] rounded-2xl bg-[#FAF7F2] p-4 shadow-inner space-y-1">
                               {availableProjects.map((project, index) => {
                                const safeId = project.id ?? (project as any)._id ?? index;

                                return (
                                  <label
                                    key={safeId}
                                    className="flex items-center p-3 hover:bg-white rounded-xl cursor-pointer transition-colors group"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedProjects.includes(safeId)}
                                      onChange={() => toggleProject(safeId)}
                                      className="h-4 w-4 text-[#B45309] focus:ring-[#B45309] border-[#E7E5E4] rounded"
                                    />
                                    <span className="ml-3 text-sm font-bold text-[#57534E] group-hover:text-[#2A2A2A]">
                                      {project.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-[#E7E5E4]/30 my-6"></div>

                    {/* Add Agents Section */}
                    <div className="mt-6">
                         <div className="flex items-center justify-between mb-4">
                             <label className="block text-sm font-bold text-[#2A2A2A] font-serif">Collaborating Agents</label>
                             <button
                                type="button" 
                                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                                className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest hover:text-[#92400E] flex items-center gap-1.5 transition-colors"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                Assign Agents
                             </button>
                        </div>

                         {/* Selected Agents Chips */}
                         {selectedAgents.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {selectedAgents.map(id => {
                                const apiAgent = availableAgents.find(a => a.id === id);
                                const orgAgent = editingOrg?.agents?.find(a => (a as any)._id === id);

                                const agentName = apiAgent?.name || orgAgent?.name || "Unknown";
                                const isCurrentUser = user?.id === id;

                                return (
                                  <span
                                    key={`agent-${id}`}
                                    className={`inline-flex items-center px-4 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                      isCurrentUser
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm"
                                        : "bg-[#FAF7F2] text-[#B45309] border-[#B45309]/20 shadow-sm"
                                    }`}
                                  >
                                    {isCurrentUser ? "You (Owner)" : agentName}

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAgent(id)}
                                      className="ml-2 hover:opacity-70 transition-opacity"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          )}

                        {/* Agents Dropdown */}
                        {showAgentDropdown && (
                            <div className="mt-2 max-h-48 overflow-y-auto border border-[#E7E5E4] rounded-2xl bg-[#FAF7F2] p-4 shadow-inner space-y-1">
                                {availableAgents.length === 0 ? (
                                    <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest p-4 text-center">No agents found.</p>
                                ) : availableAgents.map(agent => (
                                    <label key={agent.id} className="flex items-center p-3 hover:bg-white rounded-xl cursor-pointer transition-colors group">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-[#B45309] focus:ring-[#B45309] border-[#E7E5E4] rounded"
                                            checked={selectedAgents.includes(agent.id)}
                                             disabled={
                                                !editingOrg &&
                                                user?.role === "agent" &&
                                                user.id === agent.id
                                              }
                                            onChange={() => toggleAgent(agent.id)}
                                        />
                                        <div className="ml-3">
                                            <span className="text-sm font-bold text-[#2A2A2A] block group-hover:text-[#B45309]">{agent.name}</span>
                                            <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest block">{agent.email}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                  </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-[#FAF7F2] px-10 py-6 flex flex-col sm:flex-row sm:justify-end gap-4 border-t border-[#E7E5E4]">
                  <button
                    type="button"
                    className="w-full sm:w-auto px-8 py-3 bg-white border border-[#E7E5E4] text-[#57534E] font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-white hover:border-[#B45309] hover:text-[#B45309] transition-all"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDataLoading}
                    className="w-full sm:w-auto px-8 py-3 bg-[#B45309] text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-[#92400E] shadow-lg shadow-[#B45309]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting
                    ? editingOrg
                      ? 'Updating...'
                      : 'Creating...'
                    : editingOrg
                      ? 'Update Organization'
                      : 'Create Organization'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in fade-in zoom-in duration-300 border border-[#E7E5E4]">
            <div className="w-16 h-16 bg-red-50 rounded-[1.5rem] flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif">Delete Organization</h3>
            <p className="mt-4 text-[#57534E] leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-[#2A2A2A]">{deleteTarget.name}</span>? 
              This action is permanent and cannot be undone.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#57534E] bg-white border border-[#E7E5E4] rounded-2xl hover:bg-[#FAF7F2] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={isDeleting}
                className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest bg-red-600 text-white rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selfRemoveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in fade-in zoom-in duration-300 border border-[#E7E5E4]">
             <div className="w-16 h-16 bg-amber-50 rounded-[1.5rem] flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-[#B45309]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif">Leave Organization?</h3>
            <p className="mt-4 text-[#57534E] leading-relaxed">
              Do you want to remove yourself from this organization? 
              You will <span className="font-bold text-[#2A2A2A]">lose access</span> to all its projects and collaborations.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setSelfRemoveTarget(null)}
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-[#57534E] bg-white border border-[#E7E5E4] rounded-2xl hover:bg-[#FAF7F2] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleAgent(selfRemoveTarget);
                  setSelfRemoveTarget(null);
                }}
                className="px-8 py-3 text-[10px] font-bold uppercase tracking-widest bg-[#B45309] text-white rounded-2xl hover:bg-[#92400E] shadow-lg shadow-[#B45309]/20 transition-all active:scale-95"
              >
                Yes, Leave Organization
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
