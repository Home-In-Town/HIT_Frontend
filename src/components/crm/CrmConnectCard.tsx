'use client';

import React, { useState } from 'react';
import { crmBridgeApi, ApiError } from '@/lib/api';

interface CrmConnectCardProps {
  onSuccess: () => void;
}

export default function CrmConnectCard({ onSuccess }: CrmConnectCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'OWNER_ALREADY_LINKED' | 'NO_MATCHING_OWNER' | 'GENERIC' | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await crmBridgeApi.link(inputValue.trim());
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('OWNER_ALREADY_LINKED');
        } else if (err.status === 404) {
          setError('NO_MATCHING_OWNER');
        } else {
          setError('GENERIC');
        }
      } else {
        setError('GENERIC');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => {
    window.open('https://www.oneemployee.in/register', '_blank');
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[#FAF7F2]">
      <div className="max-w-2xl w-full">
        {/* Hero Card */}
        <div className="bg-white rounded-3xl border border-[#E7E5E4] shadow-sm overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-[#B45309] to-[#92400E]" />

          <div className="p-8 md:p-12">
            {/* Icon + Title */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-[#B45309]/10 rounded-2xl flex items-center justify-center border border-[#B45309]/20">
                <svg className="w-7 h-7 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">
                  Connect OneEmployee CRM
                </h1>
                <p className="text-sm text-[#A8A29E] font-medium mt-0.5">
                  Unify your HomeInTown and OneEmployee workspaces
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {[
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  ),
                  title: 'Live Lead Intelligence',
                  desc: 'HOT, WARM & COLD leads with scores right inside your dashboard',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  ),
                  title: 'Instant Notifications',
                  desc: 'Get alerted when leads engage with your projects',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  ),
                  title: 'WhatsApp & Call History',
                  desc: 'View full conversation transcripts and AI call summaries',
                },
                {
                  icon: (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
                  ),
                  title: 'One-Click Deep Links',
                  desc: 'Jump to any lead in OneEmployee without re-logging in',
                },
              ].map((benefit, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4]"
                >
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-[#E7E5E4] flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {benefit.icon}
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#2A2A2A]">{benefit.title}</p>
                    <p className="text-[11px] text-[#A8A29E] mt-0.5 leading-relaxed">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Inline Connect Form */}
            {showForm ? (
              <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-6 mb-4">
                <p className="text-xs font-bold text-[#57534E] uppercase tracking-widest mb-3">
                  Enter your OneEmployee phone or email
                </p>
                <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setError(null);
                    }}
                    placeholder="Phone number or email address"
                    className="flex-1 px-4 py-2.5 bg-white border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                    disabled={loading}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading || !inputValue.trim()}
                      className="px-5 py-2.5 bg-[#B45309] hover:bg-[#92400E] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#B45309]/20 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Linking…
                        </>
                      ) : (
                        'Link Account'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); setError(null); setInputValue(''); }}
                      className="px-3 py-2.5 text-[#57534E] hover:text-[#2A2A2A] text-sm font-medium rounded-xl border border-[#E7E5E4] hover:bg-white transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>

                {/* Error states */}
                {error === 'OWNER_ALREADY_LINKED' && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-xs text-red-700 font-medium">
                      This OneEmployee account is already connected to another HomeInTown user. Please try a different account.
                    </p>
                  </div>
                )}

                {error === 'NO_MATCHING_OWNER' && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-amber-800 font-medium">
                      No OneEmployee account found matching those details.{' '}
                      <button
                        type="button"
                        onClick={handleCreateAccount}
                        className="underline font-bold hover:text-[#B45309] transition-colors"
                      >
                        Create a new account
                      </button>{' '}
                      to get started.
                    </p>
                  </div>
                )}

                {error === 'GENERIC' && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                    <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-xs text-red-700 font-medium">
                      Something went wrong. Please try again in a moment.
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => { setShowForm(true); setError(null); }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#B45309] hover:bg-[#92400E] text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#B45309]/20 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect OneEmployee Account
              </button>

              <button
                onClick={handleCreateAccount}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-[#FAF7F2] text-[#B45309] text-sm font-bold rounded-xl transition-all border border-[#B45309]/30 hover:border-[#B45309]/60 active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Create OneEmployee Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
