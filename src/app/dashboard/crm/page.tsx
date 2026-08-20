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
  const [autoLinkAttempted, setAutoLinkAttempted] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Role guard
    if (user.role !== 'admin' && user.role !== 'builder' && user.role !== 'agent') {
      router.replace('/dashboard');
      return;
    }

    const init = async () => {
      try {
        const status = await crmBridgeApi.getStatus();

        if (status.linked) {
          setPageState('linked');
          return;
        }

        // Not linked — try auto-link by phone/email before showing connect card
        if (!autoLinkAttempted) {
          setAutoLinkAttempted(true);
          try {
            const autoResult = await crmBridgeApi.autoLink();
            if (autoResult.linked) {
              setPageState('linked');
              return;
            }
          } catch {
            // Auto-link failed (no match or conflict) — show connect card
          }
        }

        setPageState('unlinked');
      } catch {
        setPageState('unlinked');
      }
    };

    init();
  }, [user, router, autoLinkAttempted]);

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

  // Unlinked state
  if (pageState === 'unlinked') {
    return (
      <div className="p-6 lg:p-8">
        <CrmConnectCard onSuccess={() => setPageState('linked')} />
      </div>
    );
  }

  // Linked state
  return (
    <div className="p-6 lg:p-8">
      <CrmDashboard />
    </div>
  );
}
