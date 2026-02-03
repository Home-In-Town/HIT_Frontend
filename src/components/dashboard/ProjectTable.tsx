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
    <div className="bg-white border border-gray-200 shadow-sm rounded-lg overflow-hidden mb-8">
      <div className="overflow-x-auto min-h-[400px]"> 
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                {/* Project Name & Meta */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                         {/* RERA Indicator */}
                         {project.reraApproved && (
                           <span className="text-blue-600 flex items-center gap-0.5" title="RERA Verified">
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                             RERA
                           </span>
                         )}
                         <span className="text-gray-300">|</span>
                         <span>Upd. {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{project.city}</div>
                  <div className="text-xs text-gray-500">{project.location}</div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                    {project.type === 'flat' ? 'Apartment' : 'Plot'}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap">
                   <div className="flex flex-col items-start gap-1">
                      {getAdminStatus(project)}
                      {getPropertyAttribute(project.projectStatus)}
                   </div>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                  {formatPrice(project.startingPrice)}
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="relative inline-block text-left">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {openMenuId === project.id && (
                      <div 
                        ref={menuRef}
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 focus:outline-none"
                      >
                        <div className="py-1">
                          <Link 
                            href={`/dashboard/projects/${project.id}/edit`}
                            className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-50 w-full text-left"
                          >
                            Edit Details
                          </Link>
                          {project.isPublished && (
                            <button
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/dashboard/analytics/${project.id}`);
                            }}
                            className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-50 w-full text-left"
                          >
                            View Analytics
                          </button>

                          )}
                          {project.isPublished && project.trackableLink && (
                            <button
                              onClick={() => {
                                onCopyLink(project.trackableLink!);
                                setOpenMenuId(null);
                              }}
                              className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-50 w-full text-left"
                            >
                              Copy Public Link
                            </button>
                          )}
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              onDelete(project);
                              setOpenMenuId(null);
                            }}
                            className="text-red-600 block px-4 py-2 text-sm hover:bg-red-50 w-full text-left"
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
