//dashboard\analytics\page.tsx
'use client';

import { useEffect, useState } from 'react';
<<<<<<< HEAD
import { analyticsApi, callApi, ProjectAnalyticsOverview } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ---------------- Types ----------------
type LogMode = 'none' | 'all' | 'number';

// ---------------- Helpers ----------------
const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  return new Date(iso).toLocaleString();
};

=======
import { analyticsApi, ProjectAnalyticsOverview } from '@/lib/api';
import { useRouter } from 'next/navigation';

// ---------------- Helpers ----------------
>>>>>>> 42e32dee571af049641cafa7122d400b63cf0e14
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

<<<<<<< HEAD
  // Logs state
  const [logMode, setLogMode] = useState<LogMode>('none');
  const [logs, setLogs] = useState<any[]>([]);
  const [phoneFilter, setPhoneFilter] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);

=======
>>>>>>> 42e32dee571af049641cafa7122d400b63cf0e14
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

<<<<<<< HEAD
  // ---------------- Log fetchers ----------------
  async function fetchAllLogs() {
    setLoadingLogs(true);
    setLogMode('all');
    try {
      const res = await callApi.getAllLogs();
      setLogs(res);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function fetchLogsByNumber() {
    if (!phoneFilter) return;
    setLoadingLogs(true);
    setLogMode('number');
    try {
      const res = await callApi.getLogsByNumber(phoneFilter);
      setLogs(res);
    } finally {
      setLoadingLogs(false);
    }
  }

=======
>>>>>>> 42e32dee571af049641cafa7122d400b63cf0e14
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

<<<<<<< HEAD
      {/* Filters */}
      <section className="bg-white border rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={fetchAllLogs}
            className="px-3 py-1.5 text-sm rounded-md bg-gray-900 text-white"
          >
            Get All Logs
          </button>

          <div className="flex gap-2 items-center">
            <input
              value={phoneFilter}
              onChange={e => setPhoneFilter(e.target.value)}
              placeholder="Phone number"
              className="border rounded-md px-2 py-1 text-sm"
            />
            <button
              onClick={fetchLogsByNumber}
              className="px-3 py-1.5 text-sm rounded-md border"
            >
              Get Logs by Number
            </button>
          </div>
        </div>
      </section>

      {/* Logs Table (replaces detail table) */}
      {logMode !== 'none' ? (
        <section className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 border-b font-medium">
            {logMode === 'all' ? 'All Call Logs' : `Logs for ${phoneFilter}`}
          </div>

          {loadingLogs ? (
            <div className="p-6 text-center text-sm text-gray-500">Loading logs…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Call ID</th>
                    <th className="px-3 py-2">Project</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">AI</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">End</th>
                    <th className="px-3 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                        No logs found
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.callId} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{log.callId}</td>
                        <td className="px-3 py-2">{log.projectId || '-'}</td>
                        <td className="px-3 py-2">{log.userNumber}</td>
                        <td className="px-3 py-2">{log.aiNumber}</td>
                        <td className="px-3 py-2 capitalize">{log.status}</td>
                        <td className="px-3 py-2">{formatDateTime(log.startTime)}</td>
                        <td className="px-3 py-2">{formatDateTime(log.endTime)}</td>
                        <td className="px-3 py-2">{formatDuration(log.duration)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* Default Project Overview Table */
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
      )}
=======
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
>>>>>>> 42e32dee571af049641cafa7122d400b63cf0e14
    </div>
  );
}

