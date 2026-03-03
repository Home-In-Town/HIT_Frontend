'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usersApi } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';
import UserApprovals from '@/components/dashboard/UserApprovals';

export default function AdminDashboardPage() {
  const { user, status, logout } = useAuth();
  const isLoading = status === 'loading';
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, status, router, isLoading]);

  async function handleGenerateLead() {
    try {
      const { token } = await usersApi.getSsoToken();
      const leadGenUrl = "https://www.oneemployee.in"; 
      window.location.href = `${leadGenUrl}/sso?token=${token}`;
    } catch (error) {
      console.error('SSO Failed:', error);
      toast.error('Failed to initiate secure handover');
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-right" />
      {/* Header Section */}
      <div className="border-b border-gray-100 bg-white px-8 py-8">
        <div className="max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-0">
          <div>
            <h1 className="text-3xl font-light text-gray-900 tracking-tight">
              Welcome back, <span className="font-semibold">{user.name}</span>
            </h1>
            <p className="mt-2 text-gray-500 font-mono text-sm">
              Admin Dashboard — Full Access
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={handleGenerateLead}
              className="px-4 py-2 bg-black text-white text-sm font-medium border border-black hover:bg-white hover:text-black transition-all duration-300"
            >
              Generate Lead
            </button>
            <button
              onClick={async () => { await logout(); router.push('/login'); }}
              className="text-sm text-gray-500 hover:text-gray-900 underline"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl px-8 py-10 space-y-12">
        {/* New User Approvals Section */}
        <div>
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-light text-gray-900 tracking-tight">
                New User <span className="font-semibold">Approvals</span>
              </h2>
           </div>
           <UserApprovals />
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group relative p-6 border border-gray-200 hover:border-black transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active Projects</p>
            <p className="mt-4 text-5xl font-light text-gray-900">12</p>
            <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
              <span>+2 this month</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative p-6 border border-gray-200 hover:border-black transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Leads</p>
            <p className="mt-4 text-5xl font-light text-gray-900">1,248</p>
            <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
              <span>+12% vs last week</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative p-6 border border-gray-200 hover:border-black transition-colors duration-300">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total Views</p>
            <p className="mt-4 text-5xl font-light text-gray-900">85.2k</p>
            <div className="mt-4 flex items-center text-xs font-medium text-gray-400">
              <span>Stable</span>
            </div>
          </div>
        </div>




        {/* Quick Actions */}
        <div>
           <h2 className="text-lg font-medium text-gray-900 mb-6">Quick Actions</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/dashboard/projects/new" className="group flex items-center justify-between p-6 bg-gray-50 hover:bg-black hover:text-white transition-colors duration-300 rounded-none border border-transparent">
                  <div>
                      <h3 className="font-semibold text-lg">Add New Project</h3>
                      <p className="text-sm text-gray-500 group-hover:text-gray-400">Launch a new property page</p>
                  </div>
                  <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              
              <Link href="/dashboard/projects" className="group flex items-center justify-between p-6 bg-white border border-gray-200 hover:border-black transition-colors duration-300">
                  <div>
                      <h3 className="font-semibold text-lg text-gray-900">Manage Projects</h3>
                      <p className="text-sm text-gray-500">View and edit existing listings</p>
                  </div>
                  <svg className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
              </Link>

              <Link href="/dashboard/organizations" className="group flex items-center justify-between p-6 bg-white border border-gray-200 hover:border-black transition-colors duration-300">
                  <div>
                      <h3 className="font-semibold text-lg text-gray-900">Organizations</h3>
                      <p className="text-sm text-gray-500">Manage agents and access</p>
                  </div>
                  <svg className="w-6 h-6 text-gray-300 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" /></svg>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
