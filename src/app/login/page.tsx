'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { usersApi } from '@/lib/api';

type Role = 'admin' | 'builder' | 'agent';
type Step = 'select-role' | 'enter-name';

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoading: authLoading } = useAuth();
  
  const [step, setStep] = useState<Step>('select-role');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      redirectToDashboard(user.role);
    }
  }, [user, authLoading]);

  function redirectToDashboard(role: string) {
    switch (role) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'builder':
        router.push('/dashboard/builder');
        break;
      case 'agent':
        router.push('/dashboard/agent');
        break;
    }
  }

  async function handleRoleSelect(role: Role) {
    setSelectedRole(role);
    setError('');
    setLoading(true);
    
    try {
      const roleUsers = await usersApi.getByRole(role);
      setUsers(roleUsers);
      setStep('enter-name');
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole || !name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const user = await usersApi.loginByName(name.trim(), selectedRole);
      await login(user.id);
      redirectToDashboard(user.role);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'User not found. Check spelling.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setStep('select-role');
    setSelectedRole(null);
    setName('');
    setError('');
    setUsers([]);
  }

  const roleConfig = {
    admin: {
      title: 'Admin',
      description: 'Full access to all projects, users, and organizations',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200 hover:border-amber-400',
      textColor: 'text-amber-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    builder: {
      title: 'Builder',
      description: 'Create and manage your own projects',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200 hover:border-blue-400',
      textColor: 'text-blue-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    agent: {
      title: 'Agent',
      description: 'View projects assigned to your organizations',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200 hover:border-emerald-400',
      textColor: 'text-emerald-700',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#B45309] rounded-lg flex items-center justify-center text-white font-serif font-bold text-xl">
                H
              </div>
              <span className="text-xl sm:text-2xl font-bold text-[#2A2A2A] tracking-tight font-serif">HomeInTown</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 sm:py-20">
        {step === 'select-role' && (
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-4 font-serif">
              Welcome Back
            </h1>
            <p className="text-lg text-[#57534E] mb-12">
              Select your role to continue
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(Object.keys(roleConfig) as Role[]).map((role) => {
                const config = roleConfig[role];
                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSelect(role)}
                    disabled={loading}
                    className={`
                      group relative p-8 bg-white border-2 rounded-xl transition-all duration-300
                      ${config.borderColor}
                      hover:shadow-lg hover:-translate-y-1
                      disabled:opacity-50 disabled:cursor-wait
                      cursor-pointer
                    `}
                  >
                    {/* Gradient top bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.color} rounded-t-xl`} />
                    
                    {/* Icon */}
                    <div className={`${config.textColor} mb-4`}>
                      {config.icon}
                    </div>

                    {/* Title */}
                    <h3 className={`text-xl font-semibold ${config.textColor}`}>
                      {config.title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-sm text-[#57534E]">
                      {config.description}
                    </p>

                    {/* Arrow */}
                    <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className={`w-5 h-5 mx-auto ${config.textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'enter-name' && selectedRole && (
          <div className="max-w-md mx-auto">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-[#57534E] hover:text-[#2A2A2A] mb-8 transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to roles
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${roleConfig[selectedRole].bgColor} mb-4`}>
                <span className={roleConfig[selectedRole].textColor}>
                  {roleConfig[selectedRole].icon}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#2A2A2A] font-serif">
                Login as {roleConfig[selectedRole].title}
              </h2>
              <p className="text-[#57534E] mt-2">
                Enter your name to continue
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl border border-[#E7E5E4] shadow-sm">
              <div className="mb-6">
                <label htmlFor="name" className="block text-sm font-medium text-[#2A2A2A] mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`e.g. ${users[0]?.name || 'John Doe'}`}
                  className="w-full px-4 py-3 border border-[#E7E5E4] rounded-lg focus:ring-2 focus:ring-[#B45309] focus:border-transparent outline-none transition-all text-[#2A2A2A] placeholder-[#A8A29E]"
                  autoFocus
                />
              </div>

              {/* Available Users Hint */}
              {users.length > 0 && (
                <div className="mb-6 p-4 bg-[#FAF7F2] rounded-lg">
                  <p className="text-xs font-medium text-[#78716C] uppercase tracking-wider mb-2">
                    Available {selectedRole}s:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setName(u.name)}
                        className="px-3 py-1.5 bg-white border border-[#E7E5E4] rounded-full text-sm text-[#57534E] hover:border-[#B45309] hover:text-[#B45309] transition-colors cursor-pointer"
                      >
                        {u.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className={`
                  w-full py-3 rounded-lg font-semibold text-white transition-all
                  bg-gradient-to-r ${roleConfig[selectedRole].color}
                  hover:shadow-lg hover:scale-[1.02]
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                  cursor-pointer
                `}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Logging in...
                  </span>
                ) : (
                  'Continue'
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
