'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CrmLead, CrmLeadsParams } from '@/lib/api';

interface CrmLeadTableProps {
  leads: CrmLead[];
  total: number;
  page: number;
  pages: number;
  loading?: boolean;
  onFilterChange: (params: CrmLeadsParams) => void;
  onLeadClick: (leadId: string) => void;
}

const STATUS_OPTIONS = ['', 'HOT', 'WARM', 'COLD', 'CREATED'] as const;

function StatusBadge({ status }: { status: CrmLead['status'] }) {
  const map: Record<CrmLead['status'], { bg: string; text: string; border: string; label: string }> = {
    HOT:     { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-100',    label: 'HOT'     },
    WARM:    { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-100',  label: 'WARM'    },
    COLD:    { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-100',   label: 'COLD'    },
    CREATED: { bg: 'bg-slate-50',  text: 'text-slate-600',  border: 'border-slate-100',  label: 'NEW'     },
  };

  const style = map[status] ?? map['CREATED'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `••••${last4}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CrmLeadTable({
  leads,
  total,
  page,
  pages,
  loading = false,
  onFilterChange,
  onLeadClick,
}: CrmLeadTableProps) {
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search — triggers re-fetch 300ms after last keystroke
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFilterChange({ page: 1, status: status || undefined, startDate: startDate || undefined, endDate: endDate || undefined, search: value || undefined });
    }, 300);
  };

  // Immediate filter changes (status, dates)
  const handleImmediateChange = (overrides: Partial<{ status: string; startDate: string; endDate: string }>) => {
    const next = {
      status: 'status' in overrides ? overrides.status! : status,
      startDate: 'startDate' in overrides ? overrides.startDate! : startDate,
      endDate: 'endDate' in overrides ? overrides.endDate! : endDate,
    };
    if ('status' in overrides)    setStatus(next.status);
    if ('startDate' in overrides) setStartDate(next.startDate);
    if ('endDate' in overrides)   setEndDate(next.endDate);
    onFilterChange({ page: 1, status: next.status || undefined, startDate: next.startDate || undefined, endDate: next.endDate || undefined, search: search || undefined });
  };

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handlePrev = () => {
    if (page > 1) onFilterChange({ page: page - 1, status: status || undefined, startDate: startDate || undefined, endDate: endDate || undefined, search: search || undefined });
  };

  const handleNext = () => {
    if (page < pages) onFilterChange({ page: page + 1, status: status || undefined, startDate: startDate || undefined, endDate: endDate || undefined, search: search || undefined });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-[#E7E5E4] bg-[#FAF7F2]">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or phone…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
          />
        </div>

        {/* Status select */}
        <select
          value={status}
          onChange={(e) => handleImmediateChange({ status: e.target.value })}
          className="px-3 py-2 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={startDate}
          onChange={(e) => handleImmediateChange({ startDate: e.target.value })}
          className="px-3 py-2 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => handleImmediateChange({ endDate: e.target.value })}
          className="px-3 py-2 bg-white border border-[#E7E5E4] rounded-xl text-sm text-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAF7F2] border-b border-[#E7E5E4]">
              {['Name', 'Phone', 'Status', 'Score', 'Last Activity', 'Source'].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-[#E7E5E4] last:border-0">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-[#E7E5E4] rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-[#A8A29E]">
                    <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium">No leads found</p>
                    <p className="text-xs">Try adjusting your filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => onLeadClick(lead.id)}
                  className="border-b border-[#E7E5E4] last:border-0 hover:bg-[#FAF7F2] cursor-pointer transition-colors group"
                >
                  {/* Name */}
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[#2A2A2A] group-hover:text-[#B45309] transition-colors">
                      {lead.first_name}{lead.last_name ? ` ${lead.last_name}` : ''}
                    </span>
                  </td>

                  {/* Masked phone */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-[#57534E] text-xs tracking-wide">
                      {maskPhone(lead.phone_number)}
                    </span>
                  </td>

                  {/* Status badge */}
                  <td className="px-4 py-3">
                    <StatusBadge status={lead.status} />
                  </td>

                  {/* Score */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[#E7E5E4] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#B45309] rounded-full"
                          style={{ width: `${Math.min(100, lead.score)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-[#57534E]">{lead.score}</span>
                    </div>
                  </td>

                  {/* Last activity */}
                  <td className="px-4 py-3 text-xs text-[#57534E]">
                    {formatDate(lead.linkActivity?.lastVisitAt || lead.updatedAt)}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-[#A8A29E] font-medium">
                      {lead.source || '—'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E7E5E4] bg-[#FAF7F2]">
          <p className="text-xs text-[#A8A29E] font-medium">
            Page <strong className="text-[#57534E]">{page}</strong> of <strong className="text-[#57534E]">{pages}</strong>
            {' '}·{' '}
            <strong className="text-[#57534E]">{total}</strong> total leads
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              disabled={page <= 1}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#57534E] bg-white border border-[#E7E5E4] rounded-lg hover:border-[#B45309]/40 hover:text-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Prev
            </button>
            <button
              onClick={handleNext}
              disabled={page >= pages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#57534E] bg-white border border-[#E7E5E4] rounded-lg hover:border-[#B45309]/40 hover:text-[#B45309] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
