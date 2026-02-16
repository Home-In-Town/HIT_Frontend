//dashboard\analytics\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { analyticsApi, ProjectAnalyticsOverview } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ---------------- Helpers ----------------
const formatDuration = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '-';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

// ---------------- Mini Stat ----------------
function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

// ---------------- Page ----------------
export default function AnalyticsPage() {
  const router = useRouter();

  const [data, setData] = useState<ProjectAnalyticsOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------- Initial fetch ----------------
  useEffect(() => {
    async function fetchData() {
      try {
        const result = await analyticsApi.getAll();
        setData(result);
      } catch {
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // ---------------- Loading / Error ----------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-red-500 mb-2">⚠️ {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ---------------- Aggregates ----------------
  const totalVisits = data.reduce((a, c) => a + c.totalVisits, 0);
  const totalLeads = data.reduce((a, c) => a + c.uniqueLeads, 0);
  const totalCalls = data.reduce((a, c) => a + c.calls, 0);
  const totalWhatsapp = data.reduce((a, c) => a + c.whatsapp, 0);
  const totalForms = data.reduce((a, c) => a + c.forms, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-serif">Analytics Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Performance metrics across all projects</p>
      </div>

      {/* Compact Aggregate Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <MiniStat label="Visits" value={totalVisits} />
        <MiniStat label="Leads" value={totalLeads} />
        <MiniStat label="Calls" value={totalCalls} />
        <MiniStat label="WhatsApp" value={totalWhatsapp} />
        <MiniStat label="Forms" value={totalForms} />
      </div>

      {/* Project Overview Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Visits</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Call</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">WA</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Form</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/dashboard/analytics/${row.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 font-medium">{row.name}</td>
                  <td className="px-6 py-4 text-right">{row.totalVisits}</td>
                  <td className="px-6 py-4 text-right text-emerald-700">{row.uniqueLeads}</td>
                  <td className="px-6 py-4 text-right">{formatDuration(row.totalTimeSpent)}</td>
                  <td className="px-6 py-4 text-center">{row.calls || '-'}</td>
                  <td className="px-6 py-4 text-center">{row.whatsapp || '-'}</td>
                  <td className="px-6 py-4 text-center">{row.forms || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

