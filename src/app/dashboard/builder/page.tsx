'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { usersApi, projectsApi } from '@/lib/api';
import { Project } from '@/types/project';
import toast, { Toaster } from 'react-hot-toast';

export default function BuilderDashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'builder')) {
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchProjects();
    }
  }, [user, authLoading, router]);

  async function handleGenerateLead() {
    try {
      const { token } = await usersApi.getSsoToken();
      // Use window.location.href for external redirect
      // In production you might want to use an env variable for the leadgen URL
      const leadGenUrl = "https://www.oneemployee.in/"; 
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
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
          <div>
            <h1 className="text-2xl font-light text-gray-900">
              Welcome, <span className="font-semibold">{user.name}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">Builder Dashboard — Your Projects</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard/projects/new"
              className="px-4 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              + New Project
            </Link>
            <button
              onClick={handleGenerateLead}
              className="px-4 py-2 bg-black text-white text-sm font-medium border border-black hover:bg-white hover:text-black transition-all duration-300"
            >
              Generate Lead
            </button>
            <button
              onClick={() => { logout(); router.push('/dashboard'); }}
              className="text-sm text-gray-500 hover:text-gray-900 underline"
            >
              Switch Role
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Total Projects</p>
            <p className="text-3xl font-light mt-2">{projects.length}</p>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Published</p>
            <p className="text-3xl font-light mt-2 text-emerald-600">{publishedCount}</p>
          </div>
          <div className="bg-white p-4 border border-gray-200">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Drafts</p>
            <p className="text-3xl font-light mt-2 text-gray-400">{draftCount}</p>
          </div>
        </div>

        {/* Projects List */}
        <div className="bg-white border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">My Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
              </svg>
              <p className="text-gray-500">No projects yet</p>
              <Link
                href="/dashboard/projects/new"
                className="inline-block mt-4 px-4 py-2 bg-black text-white text-sm"
              >
                Create Your First Project
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {projects.map((project) => (
                <div key={project.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-500">{project.location}, {project.city}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      project.isPublished 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {project.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {project.isPublished && project.trackableLink && (
                      <button
                        onClick={() => copyLink(project.trackableLink!)}
                        className="text-gray-400 hover:text-blue-600"
                        title="Copy Link"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </button>
                    )}
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="text-sm text-gray-600 hover:text-black underline"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
