'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
   const router = useRouter();
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
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]"></div>
      </div>
    );
  }

  if (!project && error !== 'Using mock data (backend unavailable)') {
    return (
      <div className="text-center py-24 bg-white rounded-[2rem] border border-[#E7E5E4] shadow-sm">
        <div className="text-6xl mb-6 grayscale opacity-30">😕</div>
        <h2 className="text-2xl font-bold text-[#2A2A2A] font-serif mb-2">Project Not Found</h2>
        <p className="text-[#57534E] font-medium">{error}</p>
        <button 
           onClick={() => router.push('/dashboard/projects')}
           className="mt-8 px-6 py-2 bg-white border border-[#E7E5E4] text-[#2A2A2A] font-bold rounded-xl hover:bg-[#FAF7F2] transition-all"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight">
          Edit <span className="text-[#B45309]">Project</span>
        </h1>
        <p className="mt-3 text-lg text-[#57534E] max-w-2xl font-medium leading-relaxed">
          Update your property details. Changes will be reflected once you save or publish.
        </p>
        
        {error && (
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm flex items-center gap-3 font-medium">
            <span className="text-xl">⚠️</span> {error}
          </div>
        )}
        
        <div className="mt-8 border-b border-[#E7E5E4]"></div>
      </div>

      {project && <ProjectForm mode="edit" initialData={project} />}
    </div>
  );
}
