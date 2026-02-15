//components\analytics\ProjectAnalytics.tsx
import { useMemo } from 'react';
import { Phone, Eye, MessageCircle, FileText, Clock } from 'lucide-react';

// ---- Types ----
export interface VisitLog {
  id: string;
  visitedAt: string; // ISO time
  durationSeconds: number;
  formStatus?: 'opened' | 'submitted';
}

export interface CallLog {
  id: string;
  startedAt: string; // ISO time
  endedAt?: string;
  durationSeconds: number;
  status: 'completed' | 'missed' | 'failed';
}

export interface ProjectAnalyticsProps {
  projectId: string;
  projectName: string;
  totalVisits: number;
  totalLeads: number;
  totalCalls: number;
  whatsappClicks: number;
  formClicks: number;
  visitLogs: VisitLog[];
  callLogs: CallLog[];
}

// ---- Helpers ----
const formatTime = (iso: string) =>
  new Date(iso).toLocaleString();

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
};

// ---- Component ----
export default function ProjectAnalytics({
  projectId,
  projectName,
  totalVisits,
  totalLeads,
  totalCalls,
  whatsappClicks,
  formClicks,
  visitLogs = [],
  callLogs = [],
}: ProjectAnalyticsProps) {
 
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">{projectName}</h1>
        <p className="text-sm text-gray-500">Project Analytics Overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Site Visits" value={totalVisits} icon={<Eye />} />
        <StatCard title="Leads" value={totalLeads} icon={<FileText />} />
        <StatCard title="Calls" value={totalCalls} icon={<Phone />} />
        <StatCard title="WhatsApp" value={whatsappClicks} icon={<MessageCircle />} />
        <StatCard title="Forms" value={formClicks} icon={<FileText />} />

      </div>

      {/* Visit Logs */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-medium mb-4">Visit Timeline</h2>
        <div className="space-y-3">
          {visitLogs.map(log => (
            <div
              key={log.id}
              className="flex items-center justify-between border rounded-xl p-3"
            >
              <div>
                <p className="text-sm font-medium">Visited at</p>
                <p className="text-xs text-gray-500">{formatTime(log.visitedAt)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm flex items-center gap-1 justify-end">
                  <Clock className="w-4 h-4" />
                  {formatDuration(log.durationSeconds)}
                </p>
                {log.formStatus && (
                  <p className="text-xs text-gray-500 capitalize">
                    Form {log.formStatus}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---- Reusable Stat Card ----
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-semibold">{value}</p>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="text-gray-400">{icon}</div>
    </div>
  );
}
