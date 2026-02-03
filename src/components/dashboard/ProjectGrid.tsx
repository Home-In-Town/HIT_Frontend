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
        <div key={project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
          {/* Header Section: Name & Location (Priority 1 & 2) */}
          <div className="p-4 pb-2">
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{project.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {project.location}, {project.city}
            </p>
          </div>

          {/* Image (Secondary) */}
          <div className="h-32 w-full bg-gray-100 relative grayscale hover:grayscale-0 transition-all duration-300">
             {project.coverImage ? (
                <img src={project.coverImage} alt={project.name} className="w-full h-full object-cover opacity-90" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
             )}
          </div>

          {/* Details (Status, Price, Metadata) */}
          <div className="p-4 flex-1 flex flex-col gap-3">
             <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs font-semibold border ${
                  project.isPublished 
                    ? 'bg-green-50 text-green-700 border-green-100' 
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                }`}>
                  {project.isPublished ? 'Published' : 'Draft'}
                </span>
                <span className="text-lg font-bold text-gray-900 font-mono">
                  {formatPrice(project.startingPrice)}
                </span>
             </div>

             <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
               <div className="bg-gray-50 p-2 rounded">
                  <span className="block text-gray-400 text-[10px] uppercase">Type</span>
                  {project.type === 'flat' ? 'Apartment' : 'Plot'}
               </div>
               <div className="bg-gray-50 p-2 rounded">
                  <span className="block text-gray-400 text-[10px] uppercase">Status</span>
                  {project.projectStatus === 'ready-to-move' ? 'Ready' : 'Under Const.'}
               </div>
             </div>

             {project.reraApproved && (
                <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                  ✓ RERA Verified
                </div>
             )}
          </div>

          {/* Actions (Bottom) */}
          <div className="p-3 border-t border-gray-100 flex gap-2">
             <Link
                href={`/dashboard/projects/${project.id}/edit`}
                className="flex-1 py-1.5 flex items-center justify-center text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Edit
              </Link>
             {project.isPublished && (
               <button
                onClick={() => router.push(`/dashboard/analytics/${project.id}`)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded"
              >
                Analytics
              </button>

             )}
             {project.isPublished && project.trackableLink && (
                <button
                  onClick={() => onCopyLink(project.trackableLink!)}
                  className="px-3 py-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Copy Trackable Link"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </button>
             )}
             <button
                onClick={() => onDelete(project)}
                className="px-3 py-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
          </div>
        </div>
      ))}
    </div>
  );
}
