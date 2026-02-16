'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// User type matching backend
export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'builder' | 'agent';
}

interface AuthContextType {
  user: MockUser | null;
  isLoading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  getUserId: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'mock_user_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount, check if there's a stored user
  useEffect(() => {
    const storedUserId = localStorage.getItem(STORAGE_KEY);
    if (storedUserId) {
      fetchUser(storedUserId);
    } else {
      setIsLoading(false);
    }
  }, []);

  async function fetchUser(userId: string) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
      const response = await fetch(`${API_URL}/users/me`, {
        headers: {
          'x-mock-user-id': userId,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem(STORAGE_KEY, userId);
      } else {
        // Invalid user, clear storage
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(userId: string) {
    setIsLoading(true);
    await fetchUser(userId);
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  function getUserId(): string | null {
    return user?.id || localStorage.getItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, getUserId }}>
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

// Helper to get the mock user ID for API calls
export function getMockUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
