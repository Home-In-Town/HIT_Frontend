'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { organizationsApi, Organization, usersApi } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

export default function AgentDashboardPage() {
  const { user, status, logout } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'agent')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchOrganizations();
    }
  }, [user, authLoading, router]);

  async function handleGenerateLead() {
    try {
      const { token } = await usersApi.getSsoToken();
      const leadGenUrl = "https://www.oneemployee.in"; 
      window.location.href = `${leadGenUrl}/sso?token=${token}`;
    } catch (error) {
      console.error('SSO Failed:', error);
      toast.error('Failed to initiate secure handover');
    }
  }

  async function fetchOrganizations() {
    try {
      const data = await organizationsApi.getAll();
      setOrganizations(data);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
      toast.error('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  const totalProjects = organizations.reduce((acc, org) => acc + (org.projects?.length || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
          <div>
            <h1 className="text-2xl font-light text-gray-900">
              Welcome, <span className="font-semibold">{user.name}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Agent Dashboard — Your Organizations</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleGenerateLead}
              className="px-4 py-2 bg-black text-white text-sm font-medium border border-black hover:bg-white hover:text-black transition-all duration-300"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-sm text-gray-500 hover:text-gray-900 underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Organizations</p>
            <p className="text-3xl font-light mt-2">{organizations.length}</p>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Assigned Projects</p>
            <p className="text-3xl font-light mt-2 text-emerald-600">{totalProjects}</p>
          </div>
        </div>

        {/* Organizations List */}
        <div className="space-y-4">
          {organizations.length === 0 ? (
            <div className="bg-white border border-gray-200 p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              <p className="text-gray-500">You&apos;re not assigned to any organizations yet.</p>
              <p className="text-sm text-gray-400 mt-2">Contact your admin to be added to an organization.</p>
            </div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="bg-white border border-gray-200">
                {/* Org Header */}
                <button
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center font-semibold">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-500">
                        {org.projects?.length || 0} projects
                      </p>
                    </div>
                  </div>
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedOrg === org.id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded Projects */}
                {expandedOrg === org.id && (
                  <div className="border-t border-gray-100">
                    {org.projects && org.projects.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {org.projects.map((project: { id?: string; _id?: string; name?: string; projectName?: string; status?: string }) => (
                          <div key={project.id || project._id} className="px-6 py-3 flex items-center justify-between bg-gray-50">
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-sm text-gray-700">{project.name || project.projectName}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded ${
                              project.status === 'published' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-4 text-sm text-gray-400">
                        No projects assigned to this organization yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
