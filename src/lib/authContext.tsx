'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, usersApi } from './api';

// Realistic User type matching model
export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'admin' | 'builder' | 'agent' | 'unassigned' | 'user' | 'employee';
  isVerified: boolean;
  employerId?: {
    id: string;
    name: string;
    role: string;
  };
  isEmployerConfirmed?: boolean;
}

interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'unassigned';
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  skipAuthCheck: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'unassigned'>('loading');
  const [skipAuth, setSkipAuth] = useState(false);

  function skipAuthCheck() {
    setSkipAuth(true);
    setStatus('unauthenticated');
  }

  async function checkAuth() {
    try {
      setStatus('loading');
      
      const session = await authApi.getSession();
      
      if (session.authenticated && session.user) {
        setUserState(session.user as User);
        if (session.user.role === 'unassigned') {
          setStatus('unassigned');
        } else {
          setStatus('authenticated');
        }
      } else {
        setUserState(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUserState(null);
      setStatus('unauthenticated');
    }
  }

  // Check auth on mount (unless skipped)
  useEffect(() => {
    if (skipAuth) return;
    const timer = setTimeout(() => {
      checkAuth();
    }, 0);
    return () => clearTimeout(timer);
  }, [skipAuth]);

  function setUser(user: User | null) {
    setUserState(user);
    if (!user) {
      setStatus('unauthenticated');
    } else if (user.role === 'unassigned') {
      setStatus('unassigned');
    } else {
      setStatus('authenticated');
    }
  }

  async function logout() {
    try {
        await authApi.logout();
        setUserState(null);
        setStatus('unauthenticated');
    } catch (error) {
        console.error('Logout failed:', error);
    }
  }

  return (
    <AuthContext.Provider value={{ user, status, setUser, logout, checkAuth, skipAuthCheck }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
