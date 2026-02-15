import React from 'react';
import { Project } from '@/types/project';

interface DashboardHeaderProps {
  projects: Project[];
}

export default function DashboardHeader({ projects }: DashboardHeaderProps) {
  const totalProjects = projects.length;
  const publishedCount = projects.filter(p => p.isPublished).length;
  const draftCount = totalProjects - publishedCount;
  
  // Calculate latest update from projects
  const lastUpdated = projects.length > 0 
    ? new Date(Math.max(...projects.map(p => new Date(p.createdAt || 0).getTime()))).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5 mb-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Projects</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>Total: <strong className="text-gray-900">{totalProjects}</strong></span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Published: <strong className="text-emerald-700">{publishedCount}</strong></span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Draft: <strong className="text-amber-700">{draftCount}</strong></span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Last Updated</p>
            <p className="text-sm font-medium text-gray-900">{lastUpdated}</p>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
          <a
            href="/dashboard/projects/new"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded hover:bg-black transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </a>
        </div>
      </div>
    </div>
  );
}
