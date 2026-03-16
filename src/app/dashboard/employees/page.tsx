'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import EmployeeTrackingTab from '@/components/employees/EmployeeTrackingTab';
import { Users, ShieldCheck, MapPin } from 'lucide-react';

export default function EmployeesPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const isLoading = status === 'loading';

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== 'admin' && user.role !== 'builder' && user.role !== 'agent'))) {
      router.push('/login');
    }
  }, [user, status, router, isLoading]);

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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#B45309]/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
                Field Team <span className="text-[#B45309]">Management</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E7E5E4] flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#B45309]" />
                  Authorized Control Portal
                </span>
                <span className="text-[#57534E] font-mono text-[10px] font-bold uppercase tracking-widest bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E7E5E4] flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#B45309]" />
                  Live Tracking Enabled
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Active User</p>
              <p className="text-xs font-bold text-[#2A2A2A] font-serif">{user.name}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4] flex items-center justify-center text-[#B45309] font-bold font-serif">
               {user.name?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <EmployeeTrackingTab />
      </div>
    </div>
  );
}
