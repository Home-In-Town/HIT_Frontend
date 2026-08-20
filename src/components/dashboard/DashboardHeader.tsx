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
    <div className="bg-white border-b border-[#E7E5E4] px-6 py-5 mb-6 shadow-sm shadow-[#B45309]/5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">Projects</h1>
          <div className="flex items-center gap-4 mt-1.5 text-xs font-medium">
            <span className="text-[#57534E]">Total: <strong className="text-[#2A2A2A]">{totalProjects}</strong></span>
            <span className="w-1.5 h-1.5 bg-[#E7E5E4] rounded-full"></span>
            <span className="text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5]">Published: <strong>{publishedCount}</strong></span>
            <span className="w-1.5 h-1.5 bg-[#E7E5E4] rounded-full"></span>
            <span className="text-[#92400E] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FEF3C7]">Draft: <strong>{draftCount}</strong></span>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block border-r border-[#E7E5E4] pr-5">
            <p className="text-[10px] text-[#A8A29E] uppercase tracking-widest font-bold">Last Updated</p>
            <p className="text-sm font-bold text-[#2A2A2A] font-mono mt-0.5">{lastUpdated}</p>
          </div>
          
          <a
            href="/dashboard/projects/new"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#B45309] hover:bg-[#92400E] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#B45309]/20 group active:scale-95"
          >
            <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </a>
        </div>
      </div>
    </div>
  );
}
