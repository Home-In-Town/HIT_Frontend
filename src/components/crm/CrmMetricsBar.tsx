'use client';

import React from 'react';
import { CrmAnalytics } from '@/lib/api';

interface CrmMetricsBarProps {
  analytics: CrmAnalytics;
}

interface StatBox {
  label: string;
  value: string;
  subLabel: string;
  bg: string;
  border: string;
  textValue: string;
  textLabel: string;
  icon: React.ReactNode;
}

export default function CrmMetricsBar({ analytics }: CrmMetricsBarProps) {
  const engagementDisplay = `${(analytics.engagementRate * 100).toFixed(1)}%`;

  const stats: StatBox[] = [
    {
      label: 'Total Leads',
      value: String(analytics.total),
      subLabel: 'all time',
      bg: 'bg-white',
      border: 'border-[#E7E5E4]',
      textValue: 'text-[#2A2A2A]',
      textLabel: 'text-[#A8A29E]',
      icon: (
        <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'HOT Leads',
      value: String(analytics.hot),
      subLabel: 'high priority',
      bg: 'bg-red-50',
      border: 'border-red-100',
      textValue: 'text-red-700',
      textLabel: 'text-red-400',
      icon: (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      ),
    },
    {
      label: 'WARM Leads',
      value: String(analytics.warm),
      subLabel: 'needs nurturing',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      textValue: 'text-amber-700',
      textLabel: 'text-amber-400',
      icon: (
        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Engagement Rate',
      value: engagementDisplay,
      subLabel: 'leads with CTA clicks',
      bg: 'bg-white',
      border: 'border-[#E7E5E4]',
      textValue: 'text-[#B45309]',
      textLabel: 'text-[#A8A29E]',
      icon: (
        <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <div
          key={i}
          className={`${stat.bg} border ${stat.border} rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${stat.textLabel}`}>
              {stat.label}
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg === 'bg-white' ? 'bg-[#FAF7F2]' : 'bg-white/60'}`}>
              {stat.icon}
            </div>
          </div>
          <div className={`text-3xl font-bold font-mono tracking-tight ${stat.textValue}`}>
            {stat.value}
          </div>
          <p className={`text-[10px] font-medium mt-1 ${stat.textLabel}`}>
            {stat.subLabel}
          </p>
        </div>
      ))}
    </div>
  );
}
