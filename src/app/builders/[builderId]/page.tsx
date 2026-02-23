'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { projectsApi } from '@/lib/api';
import { Project } from '@/types/project';
import { MapPin, ArrowRight, Building2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sales-website-backend-624770114041.asia-south1.run.app/api';
const TRACKING_INTERVAL = 30; // seconds

function BuilderPortfolioContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');
  const builderId = params.builderId as string;
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [builder, setBuilder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tracking state
  const startTimeRef = useRef<number>(Date.now());
  const lastTrackedTimeRef = useRef<number>(0);
  const [visitId] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  });

  // Track page view and time spent when leadId is present
  useEffect(() => {
    if (!leadId) return;

    const trackPageView = async () => {
      try {
        await fetch(`${API_URL}/track/pageview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `builder-portfolio-${builderId}`,
            leadId,
            visitId,
            timestamp: Date.now(),
          }),
        });
        console.log('📡 Builder portfolio page view tracked for lead:', leadId);
      } catch (error) {
        console.error('Failed to track page view:', error);
      }
    };

    trackPageView();
    startTimeRef.current = Date.now();
    lastTrackedTimeRef.current = 0;

    // Track time spent periodically
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > lastTrackedTimeRef.current) {
        const duration = elapsed - lastTrackedTimeRef.current;
        fetch(`${API_URL}/track/time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `builder-portfolio-${builderId}`,
            leadId,
            visitId,
            duration,
            timestamp: Date.now(),
          }),
          keepalive: true,
        }).catch(() => {});
        lastTrackedTimeRef.current = elapsed;
      }
    }, TRACKING_INTERVAL * 1000);

    // Track time on page unload
    const handleUnload = () => {
      const totalTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newDuration = totalTime - lastTrackedTimeRef.current;
      if (newDuration > 0) {
        fetch(`${API_URL}/track/time`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: `builder-portfolio-${builderId}`,
            leadId,
            visitId,
            duration: newDuration,
            timestamp: Date.now(),
          }),
          keepalive: true,
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [leadId, visitId, builderId]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await projectsApi.getProjectsByOwnerId(builderId);
        setBuilder(data.builder);
        setProjects(data.projects);
      } catch (err) {
        console.error('Failed to fetch builder portfolio:', err);
        setError('Builder portfolio not found.');
      } finally {
        setLoading(false);
      }
    };

    if (builderId) {
        fetchPortfolio();
    }
  }, [builderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading portfolio...</p>
        </div>
      </div>
    );
  }

  if (error || !builder) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <h3 className="text-xl font-bold text-gray-900">Portfolio Not Found</h3>
                <p className="mt-2 text-gray-600">The requested builder portfolio does not exist.</p>
                <Link href="/projects" className="mt-4 inline-block text-emerald-600 hover:underline">
                    Browse all projects
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header / Profile Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
            <div className="mx-auto h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                <Building2 className="h-12 w-12" />
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                {builder.companyName || builder.name}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
                Official Project Portfolio
            </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Current Projects ({projects.length})</h2>

        {projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-medium text-gray-900">No active projects</h3>
            <p className="mt-2 text-gray-500">This builder has no listed projects at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} leadId={leadId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, leadId }: { project: Project; leadId: string | null }) {
  const href = leadId 
    ? `/visit/${project.slug}?leadId=${leadId}`
    : `/visit/${project.slug}`;

  // Formatting price (simple heuristic)
  const formatPrice = (price: any) => {
    if (!price) return 'On Request';
    const val = Number(price);
    if (isNaN(val)) return price;
    if (val >= 10000000) return `₹ ${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹ ${(val / 100000).toFixed(2)} L`;
    return `₹ ${val.toLocaleString('en-IN')}`;
  };

  return (
    <Link href={href} className="group block bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow duration-300 border border-gray-100">
      {/* Image Container */}
      <div className="relative h-64 w-full overflow-hidden bg-gray-200">
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt={project.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/90 text-gray-900 shadow-sm backdrop-blur-sm">
            {project.projectStatus?.replace('-', ' ').toUpperCase() || 'NEW'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{project.builderName || 'BuildConnect'}</p>
          </div>
        </div>

        <div className="flex items-center text-gray-600 text-sm mb-4">
          <MapPin className="w-4 h-4 mr-1 text-emerald-500" />
          <span className="truncate">{project.location}, {project.city}</span>
        </div>

        <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Starting From</p>
            <p className="text-lg font-bold text-emerald-700">
              {project.priceRange || formatPrice(project.startingPrice)}
            </p>
          </div>
          <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function BuilderPortfolioPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BuilderPortfolioContent />
    </Suspense>
  );
}
