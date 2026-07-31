'use client';

import { useState, useEffect } from 'react';
import { leadMatchingApi, LeadMatchingStats } from '@/lib/api';
import toast from 'react-hot-toast';

export default function StatsTab() {
  const [stats, setStats] = useState<LeadMatchingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await leadMatchingApi.getStats();
        setStats(data);
      } catch (err: any) {
        toast.error(err.message || 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm">
        No stats available yet
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Lead Matching Stats</h2>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Leads</p>
          <p className="text-2xl font-bold text-[#2A2A2A] mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">With Matches</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.withMatches}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Match Rate</p>
          <p className="text-2xl font-bold text-[#B45309] mt-1">{stats.matchRate}</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg Confidence</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{(Number(stats.avgConfidence) * 100).toFixed(0)}%</p>
        </div>
      </div>

      {/* By Status */}
      <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">By Status</p>
        <div className="space-y-2">
          {Object.entries(stats.byStatus || {}).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{status.replace('_', ' ')}</span>
              <span className="text-sm font-bold text-[#2A2A2A]">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* By Source */}
      <div className="bg-white rounded-xl border border-[#E7E5E4] p-4 shadow-sm">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">By Source</p>
        <div className="space-y-2">
          {Object.entries(stats.bySource || {}).map(([source, count]) => (
            <div key={source} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 capitalize">{source.replace('_', ' ')}</span>
              <span className="text-sm font-bold text-[#2A2A2A]">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
