'use client';

import { useState, useEffect, useCallback } from 'react';
import { leadMatchingApi, ExtractedLead } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

interface LeadsTabProps {
  onSelectLead?: (lead: ExtractedLead) => void;
}

export default function LeadsTab({ onSelectLead }: LeadsTabProps) {
  const [leads, setLeads] = useState<ExtractedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const socket = useSocket();

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leadMatchingApi.getLeads({
        page, limit: 15,
        status: statusFilter || undefined,
      });
      setLeads(data.leads);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Real-time: listen for new lead notifications from socket
  useEffect(() => {
    if (!socket.isConnected) return;

    const cleanup = socket.onNotification((notification: any) => {
      if (notification.type === 'lead_match' || notification.type === 'reverse_match') {
        // New lead detected — refresh the list if on page 1
        if (page === 1) {
          fetchLeads();
        }
        toast.success(notification.title || 'New lead detected', { duration: 4000, icon: '🎯' });
      }
    });

    return cleanup;
  }, [socket.isConnected, page, fetchLeads]);

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      await leadMatchingApi.updateLeadStatus(leadId, newStatus);
      toast.success(`Lead ${newStatus}`);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-emerald-600 bg-emerald-50';
    if (conf >= 0.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-500 bg-red-50';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'auto_detected': 'bg-blue-50 text-blue-700 border-blue-200',
      'confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'rejected': 'bg-red-50 text-red-600 border-red-200',
      'converted': 'bg-purple-50 text-purple-700 border-purple-200',
      'expired': 'bg-gray-50 text-gray-500 border-gray-200',
    };
    return styles[status] || 'bg-gray-50 text-gray-500 border-gray-200';
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Lead Intelligence</h2>
            <p className="text-xs text-gray-400">{total} leads captured from chats</p>
          </div>
        </div>
        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {['', 'auto_detected', 'confirmed', 'rejected', 'converted'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all ${
                statusFilter === s
                  ? 'bg-[#B45309] text-white border-[#B45309]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#B45309]/30'
              }`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Lead List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <svg className="w-12 h-12 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm">No leads found</p>
          </div>
        ) : (
          leads.map(lead => (
            <div
              key={lead._id}
              onClick={() => onSelectLead?.(lead)}
              className="px-4 py-3 border-b border-gray-50 hover:bg-[#FAF7F2] cursor-pointer transition-colors"
            >
              {/* Top row: agent name + time */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#2A2A2A]">{lead.extractedBy?.name}</span>
                <span className="text-[10px] text-gray-400">{formatTimeAgo(lead.createdAt)}</span>
              </div>

              {/* Extracted params */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {lead.params.bhkType && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FAF7F2] text-[#B45309] rounded-md border border-[#B45309]/10">
                    {lead.params.bhkType}
                  </span>
                )}
                {lead.params.budget && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FAF7F2] text-[#B45309] rounded-md border border-[#B45309]/10">
                    {lead.params.budgetMax ? `${lead.params.budget}-${lead.params.budgetMax}L` : `${lead.params.budget}L`}
                  </span>
                )}
                {lead.params.locationRaw && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FAF7F2] text-[#B45309] rounded-md border border-[#B45309]/10">
                    {lead.params.locationRaw}
                  </span>
                )}
                {lead.params.propertyType && (
                  <span className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-md">
                    {lead.params.propertyType}
                  </span>
                )}
              </div>

              {/* Bottom row: confidence + matches + status */}
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${getConfidenceColor(lead.extractionConfidence)}`}>
                  {Math.round(lead.extractionConfidence * 100)}%
                </span>
                {lead.matchCount > 0 && (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    {lead.matchCount} match{lead.matchCount > 1 ? 'es' : ''} ({lead.bestMatchScore}%)
                  </span>
                )}
                <span className={`ml-auto px-1.5 py-0.5 text-[9px] font-semibold rounded border ${getStatusBadge(lead.status)}`}>
                  {lead.status.replace('_', ' ')}
                </span>
              </div>

              {/* Actions (only for auto_detected) */}
              {lead.status === 'auto_detected' && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(lead._id, 'confirmed'); }}
                    className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStatusUpdate(lead._id, 'rejected'); }}
                    className="px-2.5 py-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[#E7E5E4] flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:border-[#B45309]/30 transition-colors"
          >
            Prev
          </button>
          <span className="text-[10px] text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded-lg disabled:opacity-40 hover:border-[#B45309]/30 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
