'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { usersApi, projectsApi, getLeadGenUrl } from '@/lib/api';
import { Project } from '@/types/project';
import toast from 'react-hot-toast';
import EmployeeTrackingTab from '@/components/employees/EmployeeTrackingTab';
import { PlusCircle, LayoutGrid, FileText, Globe, ExternalLink, Edit3, Copy, Users, Activity } from 'lucide-react';

export default function BuilderDashboardPage() {
  const { user, status, logout } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'portfolio' | 'employees'>('portfolio');

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
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-4 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">
              Welcome, <span className="text-[#B45309]">{user.name}</span>
            </h1>
            <p className="mt-1 text-[#57534E] font-mono text-[9px] font-bold uppercase tracking-widest bg-[#FAF7F2] inline-block px-2 py-0.5 rounded-lg border border-[#E7E5E4]">
              Builder Dashboard — Portfolio Management
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/projects/new"
              className="px-5 py-2.5 bg-[#B45309] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              New Project
            </Link>
            <button
              onClick={handleGenerateLead}
              className="px-5 py-2.5 bg-white text-[#B45309] border border-[#B45309]/30 text-xs font-bold rounded-xl shadow-sm hover:bg-[#FAF7F2] transition-all active:scale-95"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-xs text-[#A8A29E] hover:text-[#2A2A2A] font-bold uppercase tracking-widest transition-colors underline decoration-[#B45309]/30 underline-offset-4"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Tab Switcher */}
        <div className="flex gap-3 mb-6">
           <button 
             onClick={() => setActiveTab('portfolio')}
             className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'portfolio' ? 'bg-[#B45309] text-white shadow-md shadow-[#B45309]/20' : 'bg-white text-[#A8A29E] border border-[#E7E5E4] hover:border-[#B45309]/30'}`}
           >
             Portfolio
           </button>
           <button 
             onClick={() => setActiveTab('employees')}
             className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'employees' ? 'bg-[#B45309] text-white shadow-md shadow-[#B45309]/20' : 'bg-white text-[#A8A29E] border border-[#E7E5E4] hover:border-[#B45309]/30'}`}
           >
             Field Team
           </button>
        </div>

        {activeTab === 'portfolio' ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white p-5 border border-[#E7E5E4] rounded-2xl shadow-sm shadow-[#B45309]/5 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Inventory</p>
                <p className="mt-1 text-3xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{projects.length}</p>
              </div>
              <div className="bg-white p-5 border border-[#E7E5E4] rounded-2xl shadow-sm shadow-[#B45309]/5 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                  <Globe className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Live Listings</p>
                <p className="mt-1 text-3xl font-bold text-emerald-600 font-mono tracking-tighter">{publishedCount}</p>
              </div>
              <div className="bg-white p-5 border border-[#E7E5E4] rounded-2xl shadow-sm shadow-[#B45309]/5 group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                  <FileText className="w-4 h-4" />
                </div>
                <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Pending Drafts</p>
                <p className="mt-1 text-3xl font-bold text-[#A8A29E] font-mono tracking-tighter">{draftCount}</p>
              </div>
            </div>

            {/* Projects List Container */}
            <div className="bg-white border border-[#E7E5E4] rounded-2xl overflow-hidden shadow-sm shadow-[#B45309]/5">
              <div className="px-5 py-3.5 border-b border-[#E7E5E4]/50 flex items-center justify-between bg-[#FAF7F2]/30">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-[#2A2A2A] font-serif">Portfolio Overview</h2>
                  <span className="text-[8px] font-bold text-[#B45309] bg-[#B45309]/5 px-1.5 py-0.5 rounded border border-[#B45309]/10 uppercase tracking-widest">Master List</span>
                </div>
                <Link href="/dashboard/projects" className="text-[9px] font-bold uppercase tracking-widest text-[#B45309] hover:underline flex items-center gap-1">View Full Inventory <ExternalLink className="w-2.5 h-2.5" /></Link>
              </div>

              {projects.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="mx-auto w-16 h-16 bg-[#FAF7F2] rounded-2xl flex items-center justify-center border border-[#E7E5E4] mb-4">
                    <LayoutGrid className="h-8 w-8 text-[#A8A29E] opacity-50" />
                  </div>
                  <p className="text-lg font-bold text-[#2A2A2A] font-serif">Empty Portfolio</p>
                  <p className="text-xs text-[#57534E] mt-1.5 font-medium mb-6">Ready to showcase your next property developments?</p>
                  <Link
                    href="/dashboard/projects/new"
                    className="inline-flex items-center px-6 py-2.5 bg-[#B45309] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all"
                  >
                    Create First Project
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-[#E7E5E4]/30">
                  {projects.slice(0, 10).map((project) => (
                    <div key={project.id} className="px-5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#FAF7F2]/30 transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors leading-tight">{project.name}</h3>
                          {project.isPublished && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-[#57534E] font-medium">{project.location}, {project.city}</p>
                          <span className="w-0.5 h-0.5 rounded-full bg-[#E7E5E4]" />
                          <p className="text-[8px] font-bold text-[#A8A29E] uppercase tracking-widest">{project.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                        <span className={`px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded border ${
                          project.isPublished 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm' 
                            : 'bg-[#FAF7F2] text-gray-500 border-[#E7E5E4]'
                        }`}>
                          {project.isPublished ? 'Published' : 'Draft'}
                        </span>
                        
                        {project.isPublished && project.trackableLink && (
                          <button
                            onClick={() => copyLink(project.trackableLink!)}
                            className="p-1.5 text-[#A8A29E] hover:text-[#B45309] bg-white border border-[#E7E5E4] rounded-lg transition-all hover:border-[#B45309]/30"
                            title="Copy Link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        
                        <Link
                          href={`/dashboard/projects/${project.id}/edit`}
                          className="text-[9px] font-bold uppercase tracking-widest text-[#B45309] bg-[#B45309]/5 px-3 py-1.5 rounded-lg border border-[#B45309]/10 hover:bg-[#B45309] hover:text-white transition-all flex items-center gap-1.5"
                        >
                          <Edit3 className="w-3 h-3" /> Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {projects.length > 10 && (
                <div className="px-6 py-4 bg-[#FAF7F2]/20 text-center border-t border-[#E7E5E4]/50">
                   <Link href="/dashboard/projects" className="text-xs font-bold text-[#B45309] hover:underline flex items-center justify-center gap-2">View All Portfolio Assets <LayoutGrid className="w-3 h-3" /></Link>
                </div>
              )}
            </div>
          </>
        ) : (
          <EmployeeTrackingTab />
        )}
      </div>
    </div>
  );
}
