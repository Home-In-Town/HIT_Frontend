'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Project } from '@/types/project';
import Link from 'next/link';
import ProjectAnalyticsCard from '@/components/analytics/ProjectAnalyticsCard';
import { useRouter } from 'next/navigation';

interface ProjectTableProps {
  projects: Project[];
  onDelete: (project: Project) => void;
  onCopyLink: (link: string) => void;
}

export default function ProjectTable({ projects, onDelete, onCopyLink }: ProjectTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatPrice = (price: number | undefined | null) => {
    if (price === undefined || price === null) return 'POA';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)}Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)}L`;
    return `₹${price.toLocaleString()}`;
  };

  const getAdminStatus = (project: Project) => {
    if (project.isPublished) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
          Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
        Draft
      </span>
    );
  };

  const getPropertyAttribute = (status: string | undefined) => {
    if (!status) return null;
    const labels: Record<string, string> = {
      'pre-launch': 'Pre-Launch',
      'under-construction': 'Under Const.',
      'ready-to-move': 'Ready',
    };
    return (
      <span className="text-xs text-gray-500">
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="bg-white border border-[#E7E5E4] shadow-2xl shadow-[#B45309]/5 rounded-3xl overflow-hidden mb-8">
      <div className="overflow-x-auto min-h-[400px]"> 
        <table className="min-w-full divide-y divide-[#E7E5E4]">
          <thead className="bg-[#FAF7F2]">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Project Name</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Location</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Type</th>
              <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Price</th>
              <th scope="col" className="relative px-6 py-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-[#E7E5E4]/50">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-[#FAF7F2]/30 transition-colors group">
                {/* Project Name & Meta */}
                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">{project.name}</div>
                      <div className="text-[10px] text-[#A8A29E] mt-1 flex items-center gap-2 font-bold uppercase tracking-wider">
                         {/* RERA Indicator */}
                         {project.reraApproved && (
                           <span className="text-[#B45309] flex items-center gap-1 bg-[#B45309]/5 px-1.5 py-0.5 rounded border border-[#B45309]/10" title="RERA Verified">
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                             RERA
                           </span>
                         )}
                         <span className="text-[#E7E5E4]">|</span>
                         <span className="font-mono">UPD • {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-3.5 whitespace-nowrap">
                  <div className="text-sm font-bold text-[#2A2A2A]">{project.city}</div>
                  <div className="text-xs text-[#57534E] font-medium">{project.location}</div>
                </td>

                <td className="px-6 py-3.5 whitespace-nowrap">
                  <span className="px-3 py-1 inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4]">
                    {project.type === 'flat' ? 'Apartment' : 'Plot'}
                  </span>
                </td>

                <td className="px-6 py-3.5 whitespace-nowrap">
                   <div className="flex flex-col items-start gap-1">
                      {project.isPublished ? (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5]">
                           Published
                         </span>
                      ) : (
                         <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]">
                           Draft
                         </span>
                      )}
                      <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest pl-1">
                        {getPropertyAttribute(project.projectStatus)}
                      </span>
                   </div>
                </td>

                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-bold text-[#2A2A2A] font-mono">
                  {formatPrice(project.startingPrice)}
                </td>

                <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="text-[#A8A29E] hover:text-[#B45309] p-2 rounded-xl hover:bg-[#B45309]/5 transition-all"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {openMenuId === project.id && (
                      <div 
                        ref={menuRef}
                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl bg-white border border-[#E7E5E4] z-50 focus:outline-none overflow-hidden"
                      >
                        <div className="py-1">
                          <Link 
                            href={`/dashboard/projects/${project.id}/edit`}
                            className="text-[#57534E] block px-4 py-3 text-sm font-bold hover:bg-[#FAF7F2] hover:text-[#B45309] w-full text-left transition-colors"
                          >
                            Edit Details
                          </Link>

                          <button
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/dashboard/projects/${project.id}/layout-editor`);
                            }}
                            className="text-[#57534E] block px-4 py-3 text-sm font-bold hover:bg-[#FAF7F2] hover:text-[#B45309] w-full text-left transition-colors"
                          >
                            Layout Editor
                          </button>
                          {project.isPublished && (
                            <button
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/dashboard/analytics/${project.id}`);
                            }}
                            className="text-[#57534E] block px-4 py-3 text-sm font-bold hover:bg-[#FAF7F2] hover:text-[#B45309] w-full text-left transition-colors"
                          >
                            View Analytics
                          </button>

                          )}
                          <div className="border-t border-[#E7E5E4] my-1"></div>
                            <button
                              onClick={() => {
                                onDelete(project);
                                setOpenMenuId(null);
                              }}
                              className="text-red-500 block px-4 py-3 text-sm font-bold hover:bg-red-50 w-full text-left transition-colors"
                            >
                              Delete Project
                            </button>
                          </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
