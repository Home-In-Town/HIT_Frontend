'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { organizationsApi, Organization, usersApi, getLeadGenUrl } from '@/lib/api';
import toast from 'react-hot-toast';

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
      const leadGenUrl = getLeadGenUrl();
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
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-6 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
              Welcome, <span className="text-[#B45309]">{user.name}</span>
            </h1>
            <p className="mt-1.5 text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] inline-block px-2.5 py-1 rounded-lg border border-[#E7E5E4]">
              Agent Dashboard — Your Organizations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleGenerateLead}
              className="px-6 py-3 bg-[#B45309] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all active:scale-95"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-sm text-[#A8A29E] hover:text-[#2A2A2A] font-bold uppercase tracking-widest transition-colors underline decoration-[#B45309]/30 underline-offset-4"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm shadow-[#B45309]/5">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Organizations</p>
            <p className="mt-2 text-4xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{organizations.length}</p>
          </div>
          <div className="bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm shadow-[#B45309]/5">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Assigned Projects</p>
            <p className="mt-2 text-4xl font-bold text-[#B45309] font-mono tracking-tighter">{totalProjects}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[#2A2A2A] font-serif mb-4">Your Partner Network</h2>
          {organizations.length === 0 ? (
            <div className="bg-white border border-[#E7E5E4] rounded-[2.5rem] p-20 text-center shadow-sm">
              <div className="mx-auto w-20 h-20 bg-[#FAF7F2] rounded-[2rem] flex items-center justify-center border border-[#E7E5E4] mb-6">
                <svg className="h-10 w-10 text-[#A8A29E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <p className="text-xl font-bold text-[#2A2A2A] font-serif">No assignments yet</p>
              <p className="text-sm text-[#57534E] mt-2 font-medium max-w-sm mx-auto">Contact your administrator to be added to an organization and begin managing projects.</p>
            </div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="bg-white border border-[#E7E5E4] rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 transition-all duration-300">
                {/* Org Header */}
                <button
                  onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-[#FAF7F2]/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#B45309]/10 text-[#B45309] rounded-xl flex items-center justify-center text-lg font-bold font-serif shadow-inner border border-[#B45309]/10">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-[#2A2A2A] font-serif tracking-tight">{org.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E7E5E4]">
                          {org.projects?.length || 0} projects
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl transition-all ${expandedOrg === org.id ? 'bg-[#B45309] text-white shadow-lg shadow-[#B45309]/30' : 'bg-[#FAF7F2] text-[#A8A29E]'}`}>
                    <svg 
                      className={`w-6 h-6 transform transition-transform ${expandedOrg === org.id ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Projects */}
                {expandedOrg === org.id && (
                  <div className="border-t border-[#E7E5E4] bg-[#FAF7F2]/30 p-4">
                    {org.projects && org.projects.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {org.projects.map((project: { id?: string; _id?: string; name?: string; projectName?: string; status?: string }) => (
                          <div key={project.id || project._id} className="p-5 bg-white border border-[#E7E5E4] rounded-2xl flex items-center justify-between shadow-sm hover:border-[#B45309] transition-all group">
                            <div className="flex items-center gap-4">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#B45309]/40 group-hover:bg-[#B45309] transition-colors shadow-sm" />
                              <span className="text-sm font-bold text-[#2A2A2A] font-serif tracking-tight">{project.name || project.projectName}</span>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border ${
                              project.status === 'published' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' 
                                : 'bg-gray-50 text-gray-500 border-gray-100'
                            }`}>
                              {project.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center bg-white rounded-2xl border border-[#E7E5E4] border-dashed">
                        <p className="text-sm text-[#A8A29E] font-bold uppercase tracking-widest">No projects assigned yet</p>
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
