'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usersApi, getLeadGenUrl, analyticsApi, GlobalAnalytics } from '@/lib/api';
import toast from 'react-hot-toast';
import UserApprovals from '@/components/dashboard/UserApprovals';
import { useState } from 'react';

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
          // Don't toast error to avoid annoying user if it fails silently
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

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* New User Approvals Section */}
         <div>
            <div className="flex items-center justify-between mb-4">
               <h2 className="text-lg font-bold text-[#2A2A2A] font-serif tracking-tight">
                 New User <span className="text-[#B45309]">Approvals</span>
               </h2>
            </div>
            <UserApprovals />
         </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="group relative p-6 bg-white border border-[#E7E5E4] rounded-3xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Active Projects</p>
            {isStatsLoading ? (
              <div className="h-10 w-16 bg-gray-100 animate-pulse mt-2 rounded-lg" />
            ) : (
              <p className="mt-2 text-4xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{stats?.activeProjects ?? 0}</p>
            )}
            <div className="mt-3 flex items-center text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
              <span>Real-time</span>
            </div>
          </div>
 
          {/* Card 2 */}
          <div className="group relative p-6 bg-white border border-[#E7E5E4] rounded-3xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Leads</p>
            {isStatsLoading ? (
              <div className="h-10 w-24 bg-gray-100 animate-pulse mt-2 rounded-lg" />
            ) : (
              <p className="mt-2 text-4xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{stats?.totalLeads.toLocaleString() ?? 0}</p>
            )}
            <div className="mt-3 flex items-center text-[10px] font-bold text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
              <span>System Total</span>
            </div>
          </div>
 
          {/* Card 3 */}
          <div className="group relative p-6 bg-white border border-[#E7E5E4] rounded-3xl hover:border-[#B45309] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 overflow-hidden">
             <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Total Views</p>
            {isStatsLoading ? (
              <div className="h-10 w-20 bg-gray-100 animate-pulse mt-2 rounded-lg" />
            ) : (
              <p className="mt-2 text-4xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{formatNumber(stats?.totalViews ?? 0)}</p>
            )}
            <div className="mt-3 flex items-center text-[10px] font-medium text-[#065F46] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#D1FAE5] w-fit">
              <span>Live Traffic</span>
            </div>
          </div>
        </div>




        <div>
            <h2 className="text-lg font-bold text-[#2A2A2A] font-serif mb-4">Quick Actions</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/dashboard/projects/new" className="group flex items-center justify-between p-6 bg-white border border-[#E7E5E4] hover:border-[#B45309] transition-all duration-300 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 cursor-pointer">
                  <div>
                      <h3 className="font-bold text-lg text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">Add New Project</h3>
                      <p className="text-xs text-[#57534E] mt-1">Launch a new property page</p>
                  </div>
                  <div className="w-10 h-10 bg-[#B45309]/5 rounded-xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </div>
              </Link>
              
              <Link href="/dashboard/projects" className="group flex items-center justify-between p-6 bg-white border border-[#E7E5E4] hover:border-[#B45309] transition-all duration-300 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 cursor-pointer">
                  <div>
                      <h3 className="font-bold text-lg text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">Manage Projects</h3>
                      <p className="text-xs text-[#57534E] mt-1">View and edit existing listings</p>
                  </div>
                  <div className="w-10 h-10 bg-[#B45309]/5 rounded-xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" /></svg>
                  </div>
              </Link>
 
              <Link href="/dashboard/organizations" className="group flex items-center justify-between p-6 bg-white border border-[#E7E5E4] hover:border-[#B45309] transition-all duration-300 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 cursor-pointer">
                  <div>
                      <h3 className="font-bold text-lg text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">Organizations</h3>
                      <p className="text-xs text-[#57534E] mt-1">Manage agents and access</p>
                  </div>
                  <div className="w-10 h-10 bg-[#B45309]/5 rounded-xl flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all duration-300">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
                  </div>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
