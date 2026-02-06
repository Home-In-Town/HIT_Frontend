'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { organizationsApi, Organization, projectsApi, usersApi, Project } from '@/lib/api';
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

  // Auth Protection
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Initial Fetch
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchOrganizations();
    }
  }, [user]);

  // Fetch Modal Data when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchModalData();
    }
  }, [isModalOpen]);

  const fetchOrganizations = async () => {
    try {
      setIsLoading(true);
      const data = await organizationsApi.getAll();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to fetch organizations', error);
      toast.error('Failed to load organizations');
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Organization name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      await organizationsApi.create({
        name: formData.name,
        description: formData.description,
        projects: selectedProjects,
        agents: selectedAgents
      });
      
      toast.success('Organization created successfully');
      
      // Reset Form
      setFormData({ name: '', description: '' });
      setSelectedProjects([]);
      setSelectedAgents([]);
      setIsModalOpen(false);
      
      fetchOrganizations(); // Refresh list
    } catch (error) {
      console.error('Failed to create organization', error);
      toast.error('Failed to create organization');
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organizations</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your agency partners and teams</p>
            </div>
            
            <button
              onClick={() => setIsModalOpen(true)}
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
              onClick={() => setIsModalOpen(true)}
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
                  
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
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
                
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">
                    ID: {org.id.substring(0, 8)}...
                  </span>
                  <button className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                    Manage &rarr;
                  </button>
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
              <form onSubmit={handleCreate} className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-white px-6 py-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-50 text-blue-600">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                      </svg>
                    </div>
                    <h3 className="text-lg leading-6 font-semibold text-gray-900">
                      Create New Organization
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
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
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
                        {selectedProjects.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                                {selectedProjects.map(id => {
                                    const proj = availableProjects.find(p => p.id === id);
                                    return (
                                        <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                            {proj?.name}
                                            <button type="button" onClick={() => toggleProject(id)} className="ml-1.5 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-600">
                                                <span className="sr-only">Remove</span>
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                            </button>
                                        </span>
                                    );
                                })}
                            </div>
                        )}

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
                                    const agent = availableAgents.find(a => a.id === id);
                                    return (
                                        <span key={id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            {agent?.name}
                                            <button type="button" onClick={() => toggleAgent(id)} className="ml-1.5 inline-flex items-center justify-center text-green-400 hover:text-green-600">
                                                <span className="sr-only">Remove</span>
                                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
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
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || isDataLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-black text-base font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Organization'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
