'use client';

import { useState, useEffect, useCallback } from 'react';
import { crmApi, CrmLead } from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Trello, MoreHorizontal, Phone, Building2 } from 'lucide-react';

const STAGES = [
  { key: 'new', label: 'New', color: '#6366F1', bg: '#EEF2FF' },
  { key: 'contacted', label: 'Contacted', color: '#F59E0B', bg: '#FFFBEB' },
  { key: 'qualified', label: 'Qualified', color: '#10B981', bg: '#ECFDF5' },
  { key: 'negotiation', label: 'Negotiation', color: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'closed_won', label: 'Closed Won', color: '#059669', bg: '#D1FAE5' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#EF4444', bg: '#FEF2F2' },
];

const PRIORITIES: Record<string, { label: string; dot: string }> = {
  low: { label: 'Low', dot: '#94A3B8' },
  medium: { label: 'Medium', dot: '#F59E0B' },
  high: { label: 'High', dot: '#EF4444' },
  urgent: { label: 'Urgent', dot: '#DC2626' },
};

interface CrmPipelineProps {
  embedded?: boolean;
}

export default function CrmPipeline({ embedded = false }: CrmPipelineProps) {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const [leadsData, statsData] = await Promise.all([
        crmApi.getLeads(searchQuery ? { search: searchQuery } : undefined),
        crmApi.getPipelineStats(),
      ]);
      setLeads(leadsData);
      setStats(statsData);
    } catch (err: any) {
      // toast.error(err.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleDragStart = (leadId: string) => {
    setDraggedLead(leadId);
  };

  const handleDrop = async (targetStage: string) => {
    if (!draggedLead) return;
    const lead = leads.find(l => l._id === draggedLead);
    if (!lead || lead.stage === targetStage) {
      setDraggedLead(null);
      return;
    }

    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l._id === draggedLead ? { ...l, stage: targetStage as any } : l));
      
      await crmApi.updateStage(draggedLead, targetStage);
      toast.success(`Lead moved to ${STAGES.find(s => s.key === targetStage)?.label}`);
      
      // Refresh stats
      const newStats = await crmApi.getPipelineStats();
      setStats(newStats);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update stage');
      fetchLeads(); // Rollback
    }
    setDraggedLead(null);
  };

  const getLeadsByStage = (stage: string) => leads.filter(l => l.stage === stage);

  const formatValue = (val?: number) => {
    if (!val) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-6 bg-[#FAF7F2] min-h-screen'}`}>
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E7E5E4] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#B45309]/5 rounded-lg border border-[#B45309]/10">
            <Trello className="w-5 h-5 text-[#B45309]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2A2A2A] font-serif tracking-tight">CRM Pipeline</h2>
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">{leads.length} total active leads</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] w-full sm:w-64 transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B45309] text-white rounded-xl text-sm font-bold hover:bg-[#92400E] transition-all shadow-lg shadow-[#B45309]/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {STAGES.map(stage => (
          <div
            key={stage.key}
            className="flex flex-col gap-1 px-4 py-3 bg-white border border-[#E7E5E4] rounded-2xl min-w-[140px] shadow-sm transform transition-all hover:translate-y-[-2px] hover:shadow-md cursor-default flex-1"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest">{stage.label}</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold font-mono tracking-tighter" style={{ color: stage.color }}>{stats[stage.key] || 0}</span>
              <span className="text-[10px] text-gray-400 font-medium">leads</span>
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 bg-white/50 rounded-3xl border border-dashed border-[#E7E5E4]">
            <div className="w-8 h-8 border-3 border-[#B45309] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-[#57534E]">Synchronizing pipeline data...</p>
          </div>
        ) : (
          <div className="flex gap-5 px-1 min-w-max">
            {STAGES.map(stage => (
              <div
                key={stage.key}
                className="w-80 flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage.key)}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="text-sm font-bold text-[#2A2A2A] font-serif">{stage.label}</h3>
                  </div>
                  <div className="text-[10px] font-bold text-[#B45309] bg-[#B45309]/5 px-2 py-0.5 rounded-full border border-[#B45309]/10 font-mono">
                    {getLeadsByStage(stage.key).length}
                  </div>
                </div>

                {/* Cards Container */}
                <div className={`space-y-4 min-h-[500px] p-4 rounded-3xl transition-colors duration-300 border-2 border-dashed ${draggedLead ? 'bg-[#B45309]/5 border-[#B45309]/20' : 'bg-white/40 border-transparent'}`}>
                  {getLeadsByStage(stage.key).map(lead => (
                    <div
                      key={lead._id}
                      draggable
                      onDragStart={() => handleDragStart(lead._id)}
                      className={`group bg-white rounded-2xl p-5 border border-[#E7E5E4] shadow-sm hover:shadow-xl hover:shadow-[#B45309]/5 hover:border-[#B45309]/30 transition-all cursor-grab active:cursor-grabbing relative overflow-hidden ${
                        draggedLead === lead._id ? 'opacity-50 scale-95 grayscale' : ''
                      }`}
                    >
                      {/* Priority Indicator */}
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: PRIORITIES[lead.priority]?.dot || '#94A3B8' }} />
                      
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-[#2A2A2A] font-serif truncate group-hover:text-[#B45309] transition-colors">
                            {lead.leadContact?.name || 'Unknown Contact'}
                          </h4>
                          <span className={`mt-1 inline-block text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${
                            lead.priority === 'high' || lead.priority === 'urgent' 
                              ? 'bg-red-50 text-red-600 border-red-100' 
                              : lead.priority === 'medium'
                                ? 'bg-amber-50 text-amber-600 border-amber-100'
                                : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {lead.priority}
                          </span>
                        </div>
                        <button className="p-1.5 text-gray-300 hover:text-[#B45309] transition-colors rounded-lg hover:bg-[#B45309]/5 flex-shrink-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-2.5 mb-4">
                        {lead.leadContact?.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-[#57534E] font-medium">
                            <Phone className="w-3 h-3 text-[#A8A29E]" />
                            {lead.leadContact.phone}
                          </div>
                        )}

                        {typeof lead.project === 'object' && lead.project?.projectName && (
                          <div className="flex items-center gap-2 text-[11px] text-[#B45309] font-bold">
                            <Building2 className="w-3 h-3 text-[#B45309]/50" />
                            <span className="truncate">{lead.project.projectName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-[#FAF7F2]">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-wider mb-0.5">Value</span>
                          <span className="text-xs font-bold font-mono text-[#2A2A2A]">{formatValue(lead.estimatedValue)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-wider mb-0.5">Created</span>
                          <span className="text-[10px] font-medium text-[#57534E]">
                            {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      {lead.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4">
                          {lead.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 bg-[#FAF7F2] text-[#B45309] rounded border border-[#E7E5E4] uppercase tracking-widest">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {getLeadsByStage(stage.key).length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-300 space-y-3">
                      <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-[#E7E5E4] flex items-center justify-center">
                        <Plus className="w-5 h-5 opacity-30" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-center max-w-[120px]">Ready for leads</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Lead Modal */}
      {showCreateModal && (
        <CreateLeadModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); fetchLeads(); }}
        />
      )}
    </div>
  );
}

function CreateLeadModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    stage: 'new',
    priority: 'medium',
    source: 'direct',
    estimatedValue: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      setSaving(true);
      await crmApi.createLead({
        leadContact: {
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          notes: form.notes || undefined,
        },
        stage: form.stage,
        priority: form.priority,
        source: form.source,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : undefined,
      });
      toast.success('Lead created successfully');
      onCreated();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-8 py-6 border-b border-[#FAF7F2]">
          <div>
            <h2 className="text-xl font-bold text-[#2A2A2A] font-serif tracking-tight">Onboard New Lead</h2>
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mt-0.5">CRM Pipeline Acceleration</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Contact Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                placeholder="Full Name"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Phone Number *</label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                placeholder="+91 00000 00000"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Email Address</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
              placeholder="lead@example.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Pipeline Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm({ ...form, stage: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-bold text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Priority Level</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-bold text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Lead Source</label>
              <select
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-bold text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                <option value="direct">Direct Traffic</option>
                <option value="referral">Network Referral</option>
                <option value="website">Landing Page</option>
                <option value="social_media">Social Media</option>
                <option value="cold_call">Outreach/Cold Call</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Est. Deal Value (₹)</label>
              <input
                type="number"
                value={form.estimatedValue}
                onChange={e => setForm({ ...form, estimatedValue: e.target.value })}
                className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-bold text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all"
                placeholder="50,00,000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#57534E] uppercase tracking-widest ml-1">Observation Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-3 bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] resize-none transition-all"
              rows={3}
              placeholder="Mention specific requirements or interaction history..."
            />
          </div>

          <div className="flex gap-4 pt-4 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border border-[#E7E5E4] text-gray-500 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#FAF7F2] hover:text-[#2A2A2A] transition-all"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-3 px-10 py-4 bg-[#B45309] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-[#92400E] transition-all disabled:opacity-50 shadow-xl shadow-[#B45309]/20 active:scale-95 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : 'Confirm & Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
