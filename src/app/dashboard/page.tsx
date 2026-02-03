'use client';

import { useEffect, useState, useMemo } from 'react';
import { Project } from '@/types/project';
import { projectsApi } from '@/lib/api';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import ProjectTable from '@/components/dashboard/ProjectTable';
import ProjectGrid from '@/components/dashboard/ProjectGrid';

// Mock data (kept for fallback)
const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Sunrise Heights',
    type: 'flat',
    builderName: 'ABC Developers',
    city: 'Mumbai',
    location: 'Andheri West',
    googleMapLink: 'https://maps.google.com',
    reraApproved: true,
    reraNumber: 'P52000012345',
    projectStatus: 'under-construction',
    startingPrice: 8500000,
    pricePerSqFt: 15000,
    priceRange: '85L - 1.5Cr',
    paymentPlan: '10:80:10',
    bankLoanAvailable: true,
    bhkOptions: ['2BHK', '3BHK'],
    carpetAreaRange: '650 - 1200 sqft',
    floorRange: '1-25',
    amenities: ['Lift', 'Parking', 'Gym', 'Swimming Pool', 'Security'],
    coverImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    galleryImages: [],
    videos: [],
    ctaButtonText: 'Book Site Visit',
    whatsappNumber: '919876543210',
    callNumber: '919876543210',
    slug: 'sunrise-heights',
    trackableLink: '/visit/sunrise-heights',
    isPublished: true,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Green Valley Plots',
    type: 'plot',
    builderName: 'XYZ Infra',
    city: 'Pune',
    location: 'Hinjewadi',
    googleMapLink: 'https://maps.google.com',
    reraApproved: true,
    reraNumber: 'P52000023456',
    projectStatus: 'ready-to-move',
    startingPrice: 2500000,
    pricePerSqFt: 3500,
    priceRange: '25L - 50L',
    paymentPlan: 'Flexible',
    bankLoanAvailable: true,
    plotSizeRange: '1000 - 2500 sqft',
    facingOptions: ['East', 'North'],
    gatedCommunity: true,
    amenities: ['Garden', 'Security', 'Club House', 'Children Play Area'],
    coverImage: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    galleryImages: [],
    videos: [],
    ctaButtonText: 'Get Price Quote',
    whatsappNumber: '919876543211',
    callNumber: '919876543211',
    slug: 'green-valley-plots',
    trackableLink: '/visit/green-valley-plots',
    isPublished: false,
    createdAt: '2024-02-20T14:30:00Z',
  },
];

interface FilterState {
    searchQuery: string;
    status: 'all' | 'published' | 'draft';
    type: string;
    city: string;
    rera: 'all' | 'verified' | 'pending';
    viewMode: 'table' | 'card';
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  
  // Action States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    status: 'all',
    type: 'all',
    city: 'all',
    rera: 'all',
    viewMode: 'table',
  });

  useEffect(() => {
    async function fetchProjects() {
      try {
        const data = await projectsApi.getAll();
        setProjects(data);
        setUseMockData(false);
      } catch {
        setProjects(MOCK_PROJECTS);
        setUseMockData(true);
        setError('Using local data');
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  // Derived Lists
  const cities = useMemo(() => Array.from(new Set(projects.map(p => p.city))).filter(Boolean).sort(), [projects]);
  const types = useMemo(() => Array.from(new Set(projects.map(p => p.type))).filter(Boolean).sort(), [projects]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Search
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch = 
        project.name.toLowerCase().includes(query) || 
        project.city.toLowerCase().includes(query) ||
        project.location.toLowerCase().includes(query);
      
      // Status
      const matchesStatus = 
        filters.status === 'all' ? true :
        filters.status === 'published' ? project.isPublished :
        filters.status === 'draft' ? !project.isPublished : true;

      // Type
      const matchesType = filters.type === 'all' ? true : project.type === filters.type;

      // City
      const matchesCity = filters.city === 'all' ? true : project.city === filters.city;

      // RERA
      const matchesRera = 
        filters.rera === 'all' ? true :
        filters.rera === 'verified' ? project.reraApproved :
        filters.rera === 'pending' ? !project.reraApproved : true;

      return matchesSearch && matchesStatus && matchesType && matchesCity && matchesRera;
    });
  }, [projects, filters]);

  // Actions
  const copyLink = (link: string) => {
    navigator.clipboard.writeText(window.location.origin + link);
    toast.success('Link copied to clipboard');
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    setDeleteLoading(true);
    try {
      await projectsApi.delete(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast.success('Project deleted successfully');
    } catch {
      if (useMockData) {
        setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
        toast.success('Project deleted (Local)');
      } else {
        toast.error('Failed to delete project');
      }
    } finally {
      setDeleteLoading(false);
      setDeleteModalOpen(false);
      setProjectToDelete(null);
    }
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <DashboardHeader projects={projects} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <DashboardFilters 
            filters={filters} 
            onFilterChange={handleFilterChange}
            cities={cities}
            types={types}
        />

        {error && (
            <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded text-amber-700 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
            </div>
        )}

        {filteredProjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-gray-200 border-dashed">
                <div className="text-4xl mb-3 grayscale opacity-30">🔍</div>
                <h3 className="text-lg font-medium text-gray-900">No projects found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters</p>
            </div>
        ) : (
            <>
                {filters.viewMode === 'table' ? (
                    <ProjectTable 
                        projects={filteredProjects} 
                        onDelete={handleDeleteClick}
                        onCopyLink={copyLink}
                    />
                ) : (
                    <ProjectGrid 
                        projects={filteredProjects}
                        onDelete={handleDeleteClick}
                        onCopyLink={copyLink}
                    />
                )}
            </>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Project?"
        message={`This will permanently delete "${projectToDelete?.name}". This action cannot be undone.`}
        confirmText="Yes, Delete"
        isLoading={deleteLoading}
      />
    </div>
  );
}
