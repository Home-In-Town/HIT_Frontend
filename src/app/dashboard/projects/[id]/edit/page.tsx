'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Project } from '@/types/project';
import { projectsApi } from '@/lib/api';
import ProjectForm from '@/components/forms/ProjectForm';

// Mock data for development
const MOCK_PROJECTS: Record<string, Project> = {
  '1': {
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
  },
};

export default function EditProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProject() {
      try {
        const data = await projectsApi.getById(id);
        setProject(data);
      } catch {
        // Use mock data for development
        if (MOCK_PROJECTS[id]) {
          setProject(MOCK_PROJECTS[id]);
          setError('Using mock data (backend unavailable)');
        } else {
          setError('Project not found');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProject();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!project && error !== 'Using mock data (backend unavailable)') {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-xl font-semibold text-[#2A2A2A] mb-2">Project Not Found</h2>
        <p className="text-[#57534E]">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] font-serif">Edit Project</h1>
        <p className="text-[#57534E] mt-1 text-sm sm:text-base">
          Update the project details below.
        </p>
        {error && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {project && <ProjectForm mode="edit" initialData={project} />}
    </div>
  );
}
