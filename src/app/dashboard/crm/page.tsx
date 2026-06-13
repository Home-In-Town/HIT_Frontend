'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { crmBridgeApi } from '@/lib/api';
import CrmConnectCard from '@/components/crm/CrmConnectCard';
import CrmDashboard from '@/components/crm/CrmDashboard';

type CrmPageState = 'loading' | 'unlinked' | 'linked';

export default function CrmPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pageState, setPageState] = useState<CrmPageState>('loading');

  useEffect(() => {
    // Role guard: only admin, builder, agent may access this page
    if (!user) return;

    if (user.role !== 'admin' && user.role !== 'builder' && user.role !== 'agent') {
      router.replace('/dashboard');
      return;
    }

    // Fetch CRM link status on mount
    crmBridgeApi.getStatus()
      .then((status) => {
        setPageState(status.linked ? 'linked' : 'unlinked');
      })
      .catch(() => {
        // On error default to unlinked so user can attempt to connect
        setPageState('unlinked');
      });
  }, [user, router]);

  // Loading skeleton
  if (pageState === 'loading') {
    return (
      <div className="p-6 lg:p-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  // Unlinked state: show connect card
  if (pageState === 'unlinked') {
    return (
      <div className="p-6 lg:p-8">
        <CrmConnectCard onSuccess={() => setPageState('linked')} />
      </div>
    );
  }

  // Linked state: show full CRM dashboard
  return (
    <div className="p-6 lg:p-8">
      <CrmDashboard />
    </div>
  );
}
