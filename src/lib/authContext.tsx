'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, usersApi } from './api';

// Realistic User type matching model
export interface User {
  id: string;
  name: string;
  email?: string;
  phone: string;
  role: 'admin' | 'builder' | 'agent' | 'unassigned';
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'unassigned';
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'unassigned'>('loading');

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      setStatus('loading');
      const userData = await usersApi.getMe();
      
      if (userData) {
        setUserState(userData as any);
        if (userData.role === 'unassigned') {
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
    <AuthContext.Provider value={{ user, status, setUser, logout, checkAuth }}>
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
