'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { usersApi, projectsApi, getLeadGenUrl } from '@/lib/api';
import { Project } from '@/types/project';
import toast from 'react-hot-toast';

export default function BuilderDashboardPage() {
  const { user, status, logout } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'builder')) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchProjects();
    }
  }, [user, authLoading, router]);

  async function handleGenerateLead() {
    try {
      const { token } = await usersApi.getSsoToken();
      // Use centralized utility for environment-aware redirect
      const leadGenUrl = getLeadGenUrl();
      window.location.href = `${leadGenUrl}/sso?token=${token}`;
    } catch (error) {
      console.error('SSO Failed:', error);
      toast.error('Failed to initiate secure handover');
    }
  }

  async function fetchProjects() {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  function copyLink(link: string) {
    const fullUrl = `${window.location.origin}${link}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success('Link copied to clipboard!');
  }

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  const publishedCount = projects.filter(p => p.isPublished).length;
  const draftCount = projects.filter(p => !p.isPublished).length;

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header Section */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-6 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
              Welcome, <span className="text-[#B45309]">{user.name}</span>
            </h1>
            <p className="mt-1.5 text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] inline-block px-2.5 py-1 rounded-lg border border-[#E7E5E4]">
              Builder Dashboard — Your Property Portfolio
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/projects/new"
              className="px-6 py-3 bg-[#B45309] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Link>
            <button
              onClick={handleGenerateLead}
              className="px-6 py-3 bg-white text-[#B45309] border border-[#B45309] text-sm font-bold rounded-2xl shadow-sm hover:bg-[#FAF7F2] transition-all"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-sm text-[#A8A29E] hover:text-[#2A2A2A] font-bold uppercase tracking-widest transition-colors transition-underline-offset-4 underline decoration-[#B45309]/30"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm shadow-[#B45309]/5">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Projects</p>
            <p className="mt-2 text-4xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{projects.length}</p>
          </div>
          <div className="bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm shadow-[#B45309]/5">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Published</p>
            <p className="mt-2 text-4xl font-bold text-emerald-600 font-mono tracking-tighter">{publishedCount}</p>
          </div>
          <div className="bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm shadow-[#B45309]/5">
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Drafts</p>
            <p className="mt-2 text-4xl font-bold text-[#A8A29E] font-mono tracking-tighter">{draftCount}</p>
          </div>
        </div>

        {/* Projects List Container */}
        <div className="bg-white border border-[#E7E5E4] rounded-3xl overflow-hidden shadow-sm shadow-[#B45309]/5">
          <div className="px-8 py-6 border-b border-[#E7E5E4]/50 flex items-center justify-between bg-[#FAF7F2]/30">
            <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Portfolio Overview</h2>
            <Link href="/dashboard/projects" className="text-[10px] font-bold uppercase tracking-widest text-[#B45309] hover:underline">View All →</Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-20 text-center">
              <div className="mx-auto w-20 h-20 bg-[#FAF7F2] rounded-[2rem] flex items-center justify-center border border-[#E7E5E4] mb-6">
                <svg className="h-10 w-10 text-[#A8A29E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                </svg>
              </div>
              <p className="text-xl font-bold text-[#2A2A2A] font-serif">Empty Portfolio</p>
              <p className="text-sm text-[#57534E] mt-2 font-medium mb-8">Ready to showcase your next property developments?</p>
              <Link
                href="/dashboard/projects/new"
                className="inline-flex items-center px-8 py-3 bg-[#B45309] text-white font-bold rounded-2xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all"
              >
                Create First Project
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#E7E5E4]/50">
              {projects.slice(0, 10).map((project) => (
                <div key={project.id} className="px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#FAF7F2]/30 transition-all group">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">{project.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-[#57534E] font-medium">{project.location}, {project.city}</p>
                      <span className="w-1 h-1 rounded-full bg-[#E7E5E4]" />
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">{project.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 self-end md:self-center">
                    <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-lg border ${
                      project.isPublished 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                        : 'bg-[#FAF7F2] text-gray-500 border-[#E7E5E4]'
                    }`}>
                      {project.isPublished ? 'Published' : 'Draft'}
                    </span>
                    
                    {project.isPublished && project.trackableLink && (
                      <button
                        onClick={() => copyLink(project.trackableLink!)}
                        className="p-2 text-[#A8A29E] hover:text-[#B45309] bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl transition-all"
                        title="Copy Link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    )}
                    
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="text-xs font-bold uppercase tracking-widest text-[#B45309] bg-[#B45309]/5 px-4 py-2 rounded-xl border border-[#B45309]/10 hover:bg-[#B45309] hover:text-white transition-all"
                    >
                      Edit →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {projects.length > 10 && (
            <div className="px-10 py-6 bg-[#FAF7F2]/10 text-center border-t border-[#E7E5E4]/50">
               <Link href="/dashboard/projects" className="text-sm font-bold text-[#B45309] hover:underline">View All Full Portfolio</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
