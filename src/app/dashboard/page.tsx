'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      // Not logged in, redirect to login
      router.replace('/login');
      return;
    }

    // Logged in, redirect to role-specific dashboard
    switch (user.role) {
      case 'admin':
        router.replace('/dashboard/admin');
        break;
      case 'builder':
        router.replace('/dashboard/builder');
        break;
      case 'agent':
        router.replace('/dashboard/agent');
        break;
      default:
        router.replace('/login');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
