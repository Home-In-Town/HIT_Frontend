'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getLeadGenUrl, analyticsApi, projectsApi, crmBridgeApi } from '@/lib/api';
import {
  Zap,
  ShoppingBag,
  Users,
  BarChart3,
  PlusCircle,
  Menu,
  TrendingUp,
  Eye,
  UserCheck,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

export default function BuilderDashboardPage() {
  const { user, status } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Dynamic stats
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalViews: 0,
    totalLeads: 0,
    crmHot: 0,
    crmTotal: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'builder')) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [user, authLoading, router]);

  // Fetch real stats
  useEffect(() => {
    if (!user) return;
    setStatsLoading(true);

    const fetchStats = async () => {
      try {
        const [projects, overview, crm] = await Promise.allSettled([
          projectsApi.getAll(),
          analyticsApi.getOverview(),
          crmBridgeApi.getAnalytics(),
        ]);

        const projectCount = projects.status === 'fulfilled' ? projects.value.length : 0;
        const analyticsData = overview.status === 'fulfilled' ? overview.value : [];
        const crmData = crm.status === 'fulfilled' ? crm.value : null;

        const totalViews = analyticsData.reduce((sum, p) => sum + (p.totalVisits || 0), 0);
        const totalLeads = analyticsData.reduce((sum, p) => sum + (p.uniqueLeads || 0), 0);

        setStats({
          totalProjects: projectCount,
          totalViews,
          totalLeads,
          crmHot: crmData?.hot || 0,
          crmTotal: crmData?.total || 0,
        });
      } catch {
        // Silently fail — stats will show 0
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  function handleGenerateLead() {
    const leadGenUrl = getLeadGenUrl();
    window.location.href = leadGenUrl;
  }

  function handleOpenSidebar() {
    const btn = document.querySelector('header button[aria-label="Toggle menu"]') as HTMLButtonElement | null;
    if (btn) btn.click();
  }

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-10">
      {/* Custom Mobile Navbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E7E5E4] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSidebar}
              className="p-1.5 text-[#57534E] hover:text-[#B45309] transition-colors rounded-lg hover:bg-[#FAF7F2]"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#B45309] rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md shadow-[#B45309]/20">
                H
              </div>
              <span className="text-base font-bold text-[#2A2A2A] font-serif tracking-tight">
                HomeInTown
              </span>
            </Link>
          </div>
          <Link
            href="/dashboard/projects/new"
            className="flex items-center gap-1.5 bg-[#B45309] text-white px-3 py-2 rounded-xl text-sm font-semibold shadow-md shadow-[#B45309]/20 active:scale-95 transition-transform"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 lg:pt-0 px-4 lg:px-8 py-5 lg:py-8 max-w-5xl mx-auto space-y-6 lg:space-y-8">

        {/* Welcome Hero */}
        <div className="relative mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-6 lg:p-8 shadow-2xl shadow-black/10">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#B45309]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#B45309]/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-4 right-6 opacity-10">
            <Sparkles className="w-20 h-20 text-[#B45309]" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="text-[#B45309] text-xs font-bold uppercase tracking-[0.2em] mb-1">{greeting}</p>
              <h1 className="text-2xl lg:text-3xl font-bold text-white font-serif tracking-tight">
                {user.name}
              </h1>
              <p className="text-sm text-stone-400 mt-1.5 max-w-md">
                Your dashboard is ready. Manage leads, track performance, and grow your real estate business.
              </p>
            </div>
            <Link
              href="/dashboard/projects/new"
              className="hidden lg:flex items-center gap-2 bg-[#B45309] text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-[#B45309]/30 hover:shadow-xl hover:shadow-[#B45309]/40 hover:-translate-y-0.5 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Upload New Project</span>
            </Link>
          </div>

          {/* Quick Stats Row */}
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-6 lg:mt-8">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 lg:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Eye className="w-3.5 h-3.5 text-[#B45309]" />
                <span className="text-[9px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest">Views</span>
              </div>
              {statsLoading ? (
                <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-lg lg:text-2xl font-black text-white font-serif">{stats.totalViews.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 lg:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <UserCheck className="w-3.5 h-3.5 text-[#B45309]" />
                <span className="text-[9px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest">Leads</span>
              </div>
              {statsLoading ? (
                <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-lg lg:text-2xl font-black text-white font-serif">{stats.totalLeads.toLocaleString()}</p>
              )}
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3 lg:p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-[#B45309]" />
                <span className="text-[9px] lg:text-[10px] font-bold text-stone-400 uppercase tracking-widest">Projects</span>
              </div>
              {statsLoading ? (
                <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
              ) : (
                <p className="text-lg lg:text-2xl font-black text-white font-serif">{stats.totalProjects}</p>
              )}
            </div>
          </div>
        </div>

        {/* 4 Action Cards - Interactive 3D-style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Lead Matching */}
          <button
            onClick={handleGenerateLead}
            className="group relative bg-white rounded-2xl lg:rounded-3xl border border-[#E7E5E4] p-4 lg:p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden text-left [perspective:800px]"
          >
            {/* 3D tilt background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-2xl lg:rounded-3xl" />
            {/* Floating icon bg */}
            <div className="absolute -top-3 -right-3 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

            <div className="relative z-10">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#B45309] mb-3 lg:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                <Zap className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h3 className="text-sm lg:text-base font-bold text-[#1C1917] font-serif leading-tight group-hover:text-[#B45309] transition-colors">
                Lead Matching
              </h3>
              <p className="text-[9px] lg:text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">
                Generate Leads
              </p>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-[9px] lg:text-[10px] font-bold">Open</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </button>

          {/* Sell & Earn */}
          <Link
            href="/dashboard/marketplace"
            className="group relative bg-white rounded-2xl lg:rounded-3xl border border-[#E7E5E4] p-4 lg:p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden [perspective:800px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-2xl lg:rounded-3xl" />
            <div className="absolute -top-3 -right-3 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

            <div className="relative z-10">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#B45309] mb-3 lg:mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h3 className="text-sm lg:text-base font-bold text-[#1C1917] font-serif leading-tight group-hover:text-[#B45309] transition-colors">
                Sell & Earn
              </h3>
              <p className="text-[9px] lg:text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">
                Marketplace
              </p>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-[9px] lg:text-[10px] font-bold">Open</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </Link>

          {/* CRM */}
          <Link
            href="/dashboard/crm"
            className="group relative bg-white rounded-2xl lg:rounded-3xl border border-[#E7E5E4] p-4 lg:p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden [perspective:800px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-2xl lg:rounded-3xl" />
            <div className="absolute -top-3 -right-3 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

            <div className="relative z-10">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#B45309] mb-3 lg:mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h3 className="text-sm lg:text-base font-bold text-[#1C1917] font-serif leading-tight group-hover:text-[#B45309] transition-colors">
                CRM
              </h3>
              <p className="text-[9px] lg:text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">
                Pipeline
              </p>
              {!statsLoading && stats.crmHot > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-100 rounded-full">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[8px] lg:text-[9px] font-bold text-red-600">{stats.crmHot} Hot</span>
                </div>
              )}
              <div className="mt-2 lg:mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-[9px] lg:text-[10px] font-bold">Open</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </Link>

          {/* One Employee */}
          <Link
            href="/dashboard/employees"
            className="group relative bg-white rounded-2xl lg:rounded-3xl border border-[#E7E5E4] p-4 lg:p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden [perspective:800px]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-transparent to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-2xl lg:rounded-3xl" />
            <div className="absolute -top-3 -right-3 w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />

            <div className="relative z-10">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-xl lg:rounded-2xl flex items-center justify-center text-[#B45309] mb-3 lg:mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                <Users className="w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <h3 className="text-sm lg:text-base font-bold text-[#1C1917] font-serif leading-tight group-hover:text-[#B45309] transition-colors">
                One Employee
              </h3>
              <p className="text-[9px] lg:text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">
                Team
              </p>
              <div className="mt-2 lg:mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                <span className="text-[9px] lg:text-[10px] font-bold">Open</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
            </div>
          </Link>
        </div>

        {/* CRM Quick Insight Banner */}
        {!statsLoading && stats.crmTotal > 0 && (
          <Link
            href="/dashboard/crm"
            className="group block relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#B45309] to-[#92400E] p-4 lg:p-5 shadow-lg shadow-[#B45309]/15 hover:shadow-xl hover:shadow-[#B45309]/25 hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-1/2 w-40 h-20 bg-white/5 rounded-full blur-xl translate-y-1/2" />

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest">CRM Pipeline</p>
                  <p className="text-white text-sm lg:text-base font-bold">
                    {stats.crmTotal} leads total &middot; {stats.crmHot} hot leads
                  </p>
                </div>
              </div>
              <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                <ArrowUpRight className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              </div>
            </div>
          </Link>
        )}

        {/* Bottom Tip */}
        <div className="flex items-center gap-3 p-3 lg:p-4 bg-white border border-[#E7E5E4] rounded-2xl shadow-sm">
          <div className="w-8 h-8 bg-[#B45309]/5 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#B45309]" />
          </div>
          <p className="text-xs lg:text-sm text-[#57534E]">
            <span className="font-bold text-[#1C1917]">Tip:</span> Upload projects with complete details and images to attract more leads and improve visibility on the marketplace.
          </p>
        </div>

      </div>
    </div>
  );
}
