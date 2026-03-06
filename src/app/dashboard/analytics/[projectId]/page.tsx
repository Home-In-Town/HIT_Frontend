//\dashboard\analytics\[projectId]\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { analyticsApi, projectsApi} from '@/lib/api';
import ProjectAnalytics, {
  VisitLog,
 

} from '@/components/analytics/ProjectAnalytics';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';


export default function ProjectAnalyticsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analyticsData, setAnalyticsData] = useState<{
    projectId: string;
    projectName: string;
    totalVisits: number;
    totalLeads: number;
    totalCalls: number;
    whatsappClicks: number;
    formClicks: number;
    visitLogs: VisitLog[];
  } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push("/login");
      return;
    }

    async function fetchAnalytics() {
      try {
        setLoading(true);
        const data = await analyticsApi.getProjectAnalytics(projectId);
        const project = await projectsApi.getById(projectId);

        // ---- CTA counts ----
        const totalCalls = data.ctaClicks.filter(c => c.ctaType === 'call').length;
        const whatsappClicks = data.ctaClicks.filter(c => c.ctaType === 'whatsapp').length;
        const formClicks = data.ctaClicks.filter(c => c.ctaType === 'form').length;


        // ---- Visit timeline ----
        const visitLogs: VisitLog[] = (data.recentVisits || []).map(v => ({
          id: v._id,
          visitedAt: v.timestamp,
          durationSeconds: v.duration || 0,
          // form tracking future-ready
        }));

        setAnalyticsData({
          projectId,
          projectName: project.name,
          totalVisits: data.totalVisits,
          totalLeads: data.uniqueLeads,
          totalCalls,
          whatsappClicks,
          formClicks,
          visitLogs,
        });
        setError(null);
      } catch (err: any) {
        console.error("Project analytics fetch error:", err);
        if (err.status === 401 || err.message?.includes("Authentication required") || err.message?.includes("401")) {
          router.push("/login");
          return;
        }

        if (err.status === 403 || err.message?.includes("403")) {
          setError("You do not have access to this project.");
          return;
        }

        setError("Failed to load project analytics");
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, [projectId, status, router]);

  if (status === 'loading' || (loading && !error)) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <ProjectAnalytics {...analyticsData} />
    </div>
  );
}
