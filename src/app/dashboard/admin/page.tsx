'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usersApi, getLeadGenUrl, analyticsApi, GlobalAnalytics } from '@/lib/api';
import toast from 'react-hot-toast';
import UserApprovals from '@/components/dashboard/UserApprovals';
import { UserPlus, PlusCircle, Activity, Settings, LayoutGrid, Users, Navigation } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, status, logout } = useAuth();
  const [stats, setStats] = useState<GlobalAnalytics | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const isLoading = status === 'loading';
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, status, router, isLoading]);

  useEffect(() => {
    async function fetchStats() {
      if (user?.role === 'admin') {
        try {
          const data = await analyticsApi.getGlobalOverview();
          setStats(data);
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        } finally {
          setIsStatsLoading(false);
        }
      }
    }
    fetchStats();
  }, [user]);

  async function handleGenerateLead() {
    try {
      const { token } = await usersApi.getSsoToken();
      const leadGenUrl = getLeadGenUrl();
      window.location.href = `${leadGenUrl}/sso?token=${token}`;
    } catch (error) {
      console.error('SSO Failed:', error);
      toast.error('Failed to initiate secure handover');
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header Section */}
      <div className="border-b border-[#E7E5E4] bg-white px-6 py-6 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
              Welcome back, <span className="text-[#B45309]">{user.name}</span>
            </h1>
            <p className="mt-1.5 text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] inline-block px-2.5 py-1 rounded-lg border border-[#E7E5E4]">
              Admin Dashboard — Full Access
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleGenerateLead}
              className="px-6 py-3 bg-[#B45309] text-white text-sm font-bold rounded-2xl shadow-lg shadow-[#B45309]/20 hover:bg-[#92400E] transition-all active:scale-95 cursor-pointer"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-sm text-gray-500 hover:text-gray-900 underline cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* New User Approvals Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs font-black text-[#2A2A2A] uppercase tracking-[0.2em]">
                New User <span className="text-[#B45309]">Approvals</span>
              </h2>
              <div className="h-px bg-[#E7E5E4] flex-1" />
            </div>
            <UserApprovals />
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="group relative p-4.5 bg-white border border-[#E7E5E4] rounded-2xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Active Projects</p>
              {isStatsLoading ? (
                <div className="h-8 w-12 bg-gray-100 animate-pulse mt-1.5 rounded-lg" />
              ) : (
                <p className="mt-1.5 text-2xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{stats?.activeProjects ?? 0}</p>
              )}
              <div className="mt-2.5 flex items-center text-[9px] font-bold text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
                <span>Real-time</span>
              </div>
            </div>

            <div className="group relative p-4.5 bg-white border border-[#E7E5E4] rounded-2xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Leads</p>
              {isStatsLoading ? (
                <div className="h-8 w-20 bg-gray-100 animate-pulse mt-1.5 rounded-lg" />
              ) : (
                <p className="mt-1.5 text-2xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{stats?.totalLeads.toLocaleString() ?? 0}</p>
              )}
              <div className="mt-2.5 flex items-center text-[9px] font-bold text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
                <span>System Total</span>
              </div>
            </div>

            <div className="group relative p-4.5 bg-white border border-[#E7E5E4] rounded-2xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
                <Activity className="w-4 h-4" />
              </div>
              <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Views</p>
              {isStatsLoading ? (
                <div className="h-8 w-16 bg-gray-100 animate-pulse mt-1.5 rounded-lg" />
              ) : (
                <p className="mt-1.5 text-2xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{formatNumber(stats?.totalViews ?? 0)}</p>
              )}
              <div className="mt-2.5 flex items-center text-[9px] font-medium text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
                <span>Live Traffic</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div>
            <h2 className="text-lg font-bold text-[#2A2A2A] font-serif mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/projects/new" className="bg-white border border-[#E7E5E4] rounded-2xl p-4.5 hover:border-[#B45309] transition-all group shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#B45309]/5 text-[#B45309] rounded-xl flex items-center justify-center border border-[#B45309]/10 transition-transform group-hover:scale-110">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2A2A2A] font-serif tracking-tight text-sm">New Project</h3>
                    <p className="text-[10px] text-[#57534E] font-medium leading-tight mt-0.5">Create listing</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/projects" className="bg-white border border-[#E7E5E4] rounded-2xl p-4.5 hover:border-[#B45309] transition-all group shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#B45309]/5 text-[#B45309] rounded-xl flex items-center justify-center border border-[#B45309]/10 transition-transform group-hover:scale-110">
                    <LayoutGrid className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2A2A2A] font-serif tracking-tight text-sm">Inventory</h3>
                    <p className="text-[10px] text-[#57534E] font-medium leading-tight mt-0.5">Manage listings</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/organizations" className="bg-white border border-[#E7E5E4] rounded-2xl p-4.5 hover:border-[#B45309] transition-all group shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#B45309]/5 text-[#B45309] rounded-xl flex items-center justify-center border border-[#B45309]/10 transition-transform group-hover:scale-110">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2A2A2A] font-serif tracking-tight text-sm">Organizations</h3>
                    <p className="text-[10px] text-[#57534E] font-medium leading-tight mt-0.5">Manage partners</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/employees" className="bg-white border border-[#E7E5E4] rounded-2xl p-4.5 hover:border-[#B45309] transition-all group shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#B45309]/5 text-[#B45309] rounded-xl flex items-center justify-center border border-[#B45309]/10 transition-transform group-hover:scale-110">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#2A2A2A] font-serif tracking-tight text-sm">Field Team</h3>
                    <p className="text-[10px] text-[#57534E] font-medium leading-tight mt-0.5">Live tracking</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
