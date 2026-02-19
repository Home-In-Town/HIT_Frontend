'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { organizationsApi, Organization, projectsApi, usersApi, Project, ApiError } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function OrganizationsPage() {
  const { user, isLoading: authLoading } = useAuth();
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
      setAvailableProjects(projects);
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

    setOrganizations(prev =>
      prev.filter(org => org.id !== id)
    );

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

      // ✅ Replace updated org in state
      setOrganizations(prev =>
        prev.map(org =>
          org.id === result.id ? result : org
        )
      );

      toast.success("Organization updated");
    } else {
      // CREATE
      result = await organizationsApi.create({
        name: trimmedName,
        description: trimmedDescription,
        projects: selectedProjects,
        agents: selectedAgents,
      });

      // ✅ Add new org to top (no refetch needed)
      setOrganizations(prev => [result, ...prev]);

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

  setSelectedProjects(org.projects?.map(p => p._id) ?? []);
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{user.name} Organizations</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your agency partners and teams</p>
            </div>
            
            <button
              onClick={openCreateModal}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-200"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Organization
            </button>
          </div>
        </div>
      </div>
      <div className='mt-4 ml-25'>
        {user.role === 'agent' && (
          <div className="flex gap-2 mb-6">
            {[
              { key: 'all', label: 'View All' },
              { key: 'assigned', label: 'Assigned' },
              { key: 'created', label: 'Created' },
            ].map(btn => (
              <button
                key={btn.key}
                onClick={() => setFilter(btn.key as any)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                  filter === btn.key
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-white rounded-xl border border-gray-200 animate-pulse shadow-sm" />
            ))}
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
              <svg className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No organizations yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-sm mx-auto">
              Get started by creating your first organization to structure your teams and projects.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-6 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {organizations.map((org) => (
              <div 
                key={org.id} 
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-lg">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Agents Avatar Stack - Real Data Only */}
                    {org.agents && org.agents.length > 0 && (
                        <div className="flex -space-x-2 overflow-hidden">
                        {org.agents.slice(0, 3).map((agent, idx) => (
                            <div key={idx} className="inline-block h-6 w-6 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-[10px] font-medium text-gray-600" title={agent.name}>
                                {agent.name.charAt(0)}
                            </div>
                        ))}
                        {org.agents.length > 3 && (
                            <div className="inline-block h-6 w-6 rounded-full bg-gray-50 ring-2 ring-white flex items-center justify-center text-[10px] text-gray-500">
                            +{org.agents.length - 3}
                            </div>
                        )}
                        </div>
                    )}
                  </div>
                  
                  <h3 className="mt-4 text-lg font-semibold text-gray-900  transition-colors">
                    {org.name}
                  </h3>
                  
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {org.description || 'No description provided.'}
                  </p>

                  <div className="mt-6 flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                      {org.agents?.length || 0} Agents
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      {org.projects?.length || 0} Projects
                    </div>
                  </div>
                </div>
                
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 font-mono">
                    ID: {org.id.substring(0, 8)}...
                  </span>
                  <div className="flex items-center gap-3">

                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteTarget({ id: org.id, name: org.name })}

                      disabled={deletingId === org.id}
                      className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                    >
                      {deletingId === org.id ? "Deleting..." : "Delete"}
                    </button>

                    <button 
                    onClick={() => openEditModal(org)}
                    className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      Manage &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-center justify-center min-h-screen px-4 py-6 text-center sm:block sm:p-0">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm" 
              aria-hidden="true"
              onClick={() => setIsModalOpen(false)}
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-middle bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-xl sm:w-full relative z-50">
              <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                    </div>
                    <h3 className="text-lg leading-6 font-semibold text-gray-900">
                      {editingOrg ? 'Edit Organization' : 'Create New Organization'}

                    </h3>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="px-6 py-6 overflow-y-auto">
                    {isDataLoading ? (
                         <div className="flex justify-center py-8">
                             <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
                         </div>
                    ) : ( 
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">Organization Name *</label>
                        <input
                          type="text"
                          name="org-name"
                          id="org-name"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border"
                          placeholder="e.g. Acme Realty Group"
                          value={formData.name}
                          onChange={(e) => handleNameChange(e.target.value)}

                          required
                        />
                         <p className='text-red-700'>{nameError}</p>
                      </div>
                      
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          name="description"
                          id="description"
                          rows={2}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-sm px-3 py-2 border"
                          placeholder="Brief description..."
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-6"></div>

                    {/* Add Projects Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                             <label className="block text-sm font-medium text-gray-700">Projects</label>
                             <button
                                type="button" 
                                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                Add Project
                             </button>
                        </div>
                        
                        {/* Selected Projects Chips */}
                        {selectedProjects.map(id => {
                            const apiProject = availableProjects.find(p => p.id === id);
                            const orgProject = editingOrg?.projects?.find(p => p._id === id);

                            let name = "Unknown";

                            if (apiProject) {
                              name = apiProject.name;
                            } else if (orgProject) {
                              name = orgProject.projectName;
                            }


                            return (
                              <span key={id}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                              {name}
                                <button
                                  type="button"
                                  onClick={() => toggleProject(id)}
                                  className="ml-1.5"
                                >
                                  ✕
                                </button>
                              </span>
                            );
                          })}


                        {/* Projects Dropdown */}
                        {showProjectDropdown && (
                            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-gray-50 p-2">
                                {availableProjects.length === 0 ? (
                                    <p className="text-xs text-gray-500 p-2">No projects found.</p>
                                ) : availableProjects.map(project => (
                                    <label key={project.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                                            checked={selectedProjects.includes(project.id)}
                                            onChange={() => toggleProject(project.id)}
                                        />
                                        <span className="ml-3 text-sm text-gray-700">{project.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Agents Section */}
                    <div>
                         <div className="flex items-center justify-between mb-2">
                             <label className="block text-sm font-medium text-gray-700">Agents</label>
                             <button
                                type="button" 
                                onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                             >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                Add Agent
                             </button>
                        </div>

                         {/* Selected Agents Chips */}
                         {selectedAgents.length > 0 && (
  <div className="flex flex-wrap gap-2 mb-2">
    {selectedAgents.map(id => {
      const apiAgent = availableAgents.find(a => a.id === id);
      const orgAgent = editingOrg?.agents?.find(a => a._id === id);

      const agentName = apiAgent?.name || orgAgent?.name || "Unknown";

      const isCurrentUser = user?.id === id;

      return (
        <span
          key={id}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isCurrentUser
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {isCurrentUser ? "You" : agentName}

          <button
            type="button"
            onClick={() => handleRemoveAgent(id)}
            className="ml-1.5 inline-flex items-center justify-center hover:opacity-70"
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
                            <div className="mt-1 max-h-48 overflow-y-auto border border-gray-200 rounded-md bg-gray-50 p-2">
                                {availableAgents.length === 0 ? (
                                    <p className="text-xs text-gray-500 p-2">No agents found.</p>
                                ) : availableAgents.map(agent => (
                                    <label key={agent.id} className="flex items-center p-2 hover:bg-white rounded cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-black focus:ring-black border-gray-300 rounded"
                                            checked={selectedAgents.includes(agent.id)}
                                             disabled={
                                                !editingOrg &&
                                                user?.role === "agent" &&
                                                user.id === agent.id
                                              }
                                            onChange={() => toggleAgent(agent.id)}
                                        />
                                        <div className="ml-3">
                                            <span className="text-sm font-medium text-gray-700 block">{agent.name}</span>
                                            <span className="text-xs text-gray-500 block">{agent.email}</span>
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
                <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                    onClick={() => 
                      setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDataLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in">

            <h3 className="text-lg font-semibold text-gray-900">
              Delete Organization
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget.name}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>

            <button
                onClick={() => handleDelete(deleteTarget.id)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selfRemoveTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Leave Organization?
            </h3>

            <p className="mt-2 text-sm text-gray-600">
              Do you want to remove this organization for yourself?
              You will lose access to its projects.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSelfRemoveTarget(null)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  toggleAgent(selfRemoveTarget);
                  setSelfRemoveTarget(null);
                }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
              >
                Yes, Remove Me
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
