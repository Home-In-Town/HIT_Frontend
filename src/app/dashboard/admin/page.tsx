'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getLeadGenUrl } from '@/lib/api';
import { LayoutGrid, PlusCircle, Users, Zap, FilePlus, Settings } from 'lucide-react';
import CrmPipeline from '@/components/dashboard/CrmPipeline';

export default function BuilderAdminDashboardPage() {
  const { user, status } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [user, authLoading, router]);

  function handleGenerateLead() {
    const leadGenUrl = getLeadGenUrl();
    window.location.href = leadGenUrl;
  }

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20">
      {/* Header Section */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-6 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
              Admin <span className="text-[#B45309]">Control Center</span>
            </h1>
            <p className="mt-1 text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] inline-block px-2.5 py-1 rounded-lg border border-[#E7E5E4]">
              Executive Overview — System-wide Performance & Pipeline
            </p>
          </div>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Actions Grid */}
        <section>
          <div className="flex items-center gap-2 mb-4 opacity-60">
            <Zap className="w-3.5 h-3.5 text-[#B45309]" />
            <h2 className="text-[10px] font-bold text-[#57534E] uppercase tracking-[0.2em]">Administrative Workflows</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/employees"
              className="group bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 hover:border-[#B45309]/30 transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-5 group-hover:opacity-20 transition-opacity">
                <Users className="w-12 h-12" />
              </div>
              <div className="w-12 h-12 bg-[#B45309]/5 rounded-2xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all shadow-inner">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors leading-tight">Field Team</h3>
                <p className="text-[10px] text-[#A8A29E] mt-0.5 font-bold uppercase tracking-widest">Management</p>
              </div>
            </Link>

            <Link
              href="/dashboard/projects/new"
              className="group bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 hover:border-[#B45309]/30 transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-5 group-hover:opacity-20 transition-opacity">
                <FilePlus className="w-12 h-12" />
              </div>
              <div className="w-12 h-12 bg-[#B45309]/5 rounded-2xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all shadow-inner">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors leading-tight">New Project</h3>
                <p className="text-[10px] text-[#A8A29E] mt-0.5 font-bold uppercase tracking-widest">Stock Entry</p>
              </div>
            </Link>

            <button
              onClick={handleGenerateLead}
              className="group bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 hover:border-[#B45309]/30 transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden text-left w-full"
            >
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-5 group-hover:opacity-20 transition-opacity">
                <Zap className="w-12 h-12" />
              </div>
              <div className="w-12 h-12 bg-[#B45309]/5 rounded-2xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all shadow-inner">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors leading-tight">Generate Lead</h3>
                <p className="text-[10px] text-[#A8A29E] mt-0.5 font-bold uppercase tracking-widest">Sales Handover</p>
              </div>
            </button>

            <Link
              href="/dashboard/organizations"
              className="group bg-white p-6 border border-[#E7E5E4] rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 hover:border-[#B45309]/30 transition-all active:scale-[0.98] flex items-center gap-5 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-5 group-hover:opacity-20 transition-opacity">
                <Settings className="w-12 h-12" />
              </div>
              <div className="w-12 h-12 bg-[#B45309]/5 rounded-2xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all shadow-inner">
                <Settings className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors leading-tight">Market Settings</h3>
                <p className="text-[10px] text-[#A8A29E] mt-0.5 font-bold uppercase tracking-widest">Global Config</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Embedded CRM Pipeline */}
        <div className="mt-8">
          <CrmPipeline embedded={true} />
        </div>
      </div>
    </div>
  );
}
