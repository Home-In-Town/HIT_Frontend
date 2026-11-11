'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, status } = useAuth();
  const isLoading = status === 'loading';

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
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
        router.replace('/dashboard/employee');
        break;
      case 'employee':
        if (user.isEmployerConfirmed) {
          router.replace('/dashboard/employee');
        } else {
          router.replace('/dashboard/employee/assignment');
        }
        break;
      case 'unassigned':
        if (user.employerId) {
          router.replace('/dashboard/employee/assignment');
        } else {
          router.replace('/dashboard/pending');
        }
        break;
      case 'captain':
        router.replace('/dashboard/captain');
        break;
      case 'user':
        // The mobile app registers every new account as role 'user' (backend
        // register defaults to it). This switch had no case for it, so the
        // default branch below sent a successfully logged-in user straight back
        // to /login: "Welcome back!" toast, then the login page again. There is
        // no web dashboard for plain users, so land them on the profile page,
        // which works for every role and has Sign Out in the dashboard layout.
        router.replace('/dashboard/profile');
        break;
      default:
        router.replace('/login');
    }
  }, [user, status, router, isLoading]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Redirecting...</p>
      </div>
    </div>
  );
}
