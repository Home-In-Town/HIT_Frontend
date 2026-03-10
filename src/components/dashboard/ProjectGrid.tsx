'use client';

import React from 'react';
import { Project } from '@/types/project';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ProjectGridProps {
  projects: Project[];
  onDelete: (project: Project) => void;
  onCopyLink: (link: string) => void;
}

export default function ProjectGrid({ projects, onDelete, onCopyLink }: ProjectGridProps) {
  const router = useRouter()
  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return 'POA';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
      {projects.map((project) => (
        <div key={project.id} className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 transition-all duration-300 flex flex-col h-full overflow-hidden group">
          {/* Header Section: Name & Location */}
          <div className="p-5 pb-3">
            <h3 className="text-lg font-bold text-[#2A2A2A] font-serif leading-tight mb-1.5 group-hover:text-[#B45309] transition-colors">{project.name}</h3>
            <p className="text-xs text-[#57534E] flex items-center gap-2 font-medium">
              <svg className="w-3.5 h-3.5 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {project.location}, {project.city}
            </p>
          </div>

          {/* Image */}
          <div className="h-36 w-full bg-[#FAF7F2] relative overflow-hidden">
             {project.coverImage ? (
                <img 
                  src={typeof project.coverImage === 'string' ? project.coverImage : (project.coverImage as any)?.url} 
                  alt={project.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-[#A8A29E] text-[10px] font-mono uppercase tracking-widest">No Image</div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Details */}
          <div className="p-5 flex-1 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                  project.isPublished 
                    ? 'bg-[#ECFDF5] text-[#065F46] border-[#D1FAE5]' 
                    : 'bg-[#FAF7F2] text-[#57534E] border-[#E7E5E4]'
                }`}>
                  {project.isPublished ? 'Published' : 'Draft'}
                </span>
                <span className="text-lg font-bold text-[#2A2A2A] font-mono tracking-tighter">
                  {formatPrice(project.startingPrice)}
                </span>
             </div>

             <div className="grid grid-cols-2 gap-2">
               <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E5E4]/50">
                  <span className="block text-[#A8A29E] text-[9px] font-bold uppercase tracking-widest mb-0.5">Type</span>
                  <span className="text-xs font-bold text-[#2A2A2A] truncate block">{project.type === 'flat' ? 'Apartment' : 'Plot'}</span>
               </div>
               <div className="bg-[#FAF7F2] p-2.5 rounded-xl border border-[#E7E5E4]/50">
                  <span className="block text-[#A8A29E] text-[9px] font-bold uppercase tracking-widest mb-0.5">Status</span>
                  <span className="text-xs font-bold text-[#2A2A2A] truncate block">{project.projectStatus === 'ready-to-move' ? 'Ready' : 'In Progress'}</span>
               </div>
             </div>

             {project.reraApproved && (
                <div className="text-[10px] text-[#B45309] font-bold uppercase tracking-[0.2em] flex items-center gap-2 bg-[#B45309]/5 py-2 px-3 rounded-lg border border-[#B45309]/10">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                  RERA Verified
                </div>
             )}
          </div>

          {/* Actions */}
          <div className="p-4 bg-[#FAF7F2]/50 border-t border-[#E7E5E4] flex gap-2 flex-wrap group-hover:bg-[#FAF7F2] transition-colors">
              <Link
                href={`/dashboard/projects/${project.id}/edit`}
                className="flex-1 py-2 flex items-center justify-center text-xs font-bold text-[#2A2A2A] bg-white border border-[#E7E5E4] rounded-xl hover:border-[#B45309] hover:text-[#B45309] transition-all shadow-sm"
              >
                Edit
              </Link>
              <button
                onClick={() => router.push(`/dashboard/projects/${project.id}/layout-editor`)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#B45309] rounded-xl hover:bg-[#92400E] transition-all shadow-md shadow-[#B45309]/10"
              >
                Layout
              </button>
             {project.isPublished && (
                <button
                onClick={() => router.push(`/dashboard/analytics/${project.id}`)}
                className="px-4 py-2 text-xs font-bold text-[#B45309] hover:bg-white rounded-xl transition-all"
              >
                Analytics
              </button>
             )}
             <div className="flex gap-1 ml-auto">
                <button
                  onClick={() => onDelete(project)}
                  className="p-2 text-[#A8A29E] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
             </div>
          </div>
        </div>
      ))}
    </div>
  );
}
