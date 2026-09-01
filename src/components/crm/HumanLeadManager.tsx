'use client';

import React, { useState, useEffect, useCallback } from 'react';
import LeadDetailView from './LeadDetailView';
import CaptainTeamPanel from './CaptainTeamPanel';
import { projectsApi, humanLeadsApi, HumanLead } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Site Visit Scheduled',
  'Site Visit Done',
  'Negotiation',
  'Booking',
  'Won',
  'Lost',
];

// Lead type: inbound = client raised their own enquiry, outbound = manually sourced / cold
type LeadType = 'inbound' | 'outbound';

// Leads are now real, team-scoped records from the backend (with ownership info)
type DemoLead = HumanLead;

// Small badge for lead type — used in the list and detail views
const leadTypeBadge = (type: LeadType) =>
  type === 'inbound'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-violet-50 text-violet-700 border-violet-200';

// A shareable/downloadable project asset (photo, video or PDF)
export interface ProjectAsset {
  type: 'image' | 'video' | 'pdf';
  url: string;
  name: string;
}

// A media entry may be a plain URL string or a { url, key } object
type MediaEntry = string | { url?: string } | null | undefined;

// Pull the URL out of a media entry that may be a string or { url, key }
const mediaUrl = (m: MediaEntry): string | null => {
  if (!m) return null;
  if (typeof m === 'string') return m.startsWith('blob:') || m.startsWith('data:') ? null : m;
  return m.url || null;
};

// Loosely-typed project shape (fields come from the API transform or raw backend)
interface ProjectMediaSource {
  name?: string;
  projectName?: string;
  coverImage?: MediaEntry;
  galleryImages?: MediaEntry[];
  layoutImage?: MediaEntry;
  videos?: MediaEntry[];
  brochureUrl?: MediaEntry;
  media?: {
    coverImage?: MediaEntry;
    galleryImages?: MediaEntry[];
    layoutImage?: MediaEntry;
    videos?: MediaEntry[];
    brochurePdf?: MediaEntry;
  };
}

// Collect all uploaded assets for a project into a flat, shareable list
export function collectProjectAssets(project: ProjectMediaSource | null | undefined): ProjectAsset[] {
  if (!project) return [];
  const name = project.name || project.projectName || 'Project';
  const assets: ProjectAsset[] = [];

  const cover = mediaUrl(project.coverImage ?? project.media?.coverImage);
  if (cover) assets.push({ type: 'image', url: cover, name: `${name} - Cover` });

  const gallery = project.galleryImages ?? project.media?.galleryImages ?? [];
  gallery.forEach((g, i) => {
    const u = mediaUrl(g);
    if (u) assets.push({ type: 'image', url: u, name: `${name} - Photo ${i + 1}` });
  });

  const layout = mediaUrl(project.layoutImage ?? project.media?.layoutImage);
  if (layout) assets.push({ type: 'image', url: layout, name: `${name} - Layout` });

  const videos = project.videos ?? project.media?.videos ?? [];
  videos.forEach((v, i) => {
    const u = mediaUrl(v);
    if (u) assets.push({ type: 'video', url: u, name: `${name} - Video ${i + 1}` });
  });

  const brochure = mediaUrl(project.brochureUrl ?? project.media?.brochurePdf);
  if (brochure) assets.push({ type: 'pdf', url: brochure, name: `${name} - Brochure` });

  return assets;
}

export default function HumanLeadManager() {
  const { user } = useAuth();
  // Only captains can (re)assign leads to their team agents
  const canAssign = user?.role === 'captain';

  const [selectedLead, setSelectedLead] = useState<DemoLead | null>(null);
  const [leads, setLeads] = useState<DemoLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('All');
  const [saving, setSaving] = useState(false);

  // Team agents available for assignment (captain only) — includes partner captains
  const [teamAgents, setTeamAgents] = useState<{ id: string; name: string; role: string }[]>([]);
  // Captain team-up panel
  const [showTeamPanel, setShowTeamPanel] = useState(false);

  const loadTeamAgents = useCallback(() => {
    humanLeadsApi.teamAgents().then(setTeamAgents).catch(() => {});
  }, []);

  // Load leads from the backend (team-scoped by role)
  const loadLeads = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await humanLeadsApi.list();
      // Guard against any records missing an id and drop accidental duplicates
      const seen = new Set<string>();
      const clean = (data || [])
        .filter((l) => l && l.id && !seen.has(l.id) && seen.add(l.id))
        .map((l) => ({ ...l, id: String(l.id) }));
      setLeads(clean);
    } catch {
      setLoadError('Could not load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Load team agents for the assign dropdown
  useEffect(() => {
    if (!canAssign) return;
    loadTeamAgents();
  }, [canAssign, loadTeamAgents]);

  // Site visit scheduling modal
  const [schedulingLead, setSchedulingLead] = useState<DemoLead | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');

  // Add Lead modal
  const [showAddLead, setShowAddLead] = useState(false);
  const [newLead, setNewLead] = useState({
    name: '', phone: '', altPhone: '', email: '', budget: '',
    homeType: '', buyingType: '', location: '', project: '',
    source: 'Meta Ad', customSource: '', stage: 'New Lead',
    leadType: 'inbound' as LeadType,
  });

  // Projects list for dropdown (id + name for the form)
  const [projectsList, setProjectsList] = useState<{ id: string; name: string }[]>([]);
  // Full projects (with media) keyed by name — used to resolve a lead's assets
  const [projectsByName, setProjectsByName] = useState<Record<string, ProjectAsset[]>>({});

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const projects = (await projectsApi.getAllPublic()) as unknown as (ProjectMediaSource & { id?: string; _id?: string })[];
        setProjectsList(projects.map((p) => ({ id: p.id || p._id || '', name: p.name || p.projectName || 'Untitled' })));
        const byName: Record<string, ProjectAsset[]> = {};
        projects.forEach((p) => {
          const nm = p.name || p.projectName || 'Untitled';
          byName[nm] = collectProjectAssets(p);
        });
        setProjectsByName(byName);
      } catch {
        // Silently fail — user can still type project name
      }
    };
    fetchProjects();
  }, []);

  const stageColor = (stage: string) => {
    switch (stage) {
      case 'New Lead': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Contacted': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Qualified': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Site Visit Scheduled': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Site Visit Done': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Negotiation': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Booking': return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'Won': return 'bg-green-50 text-green-700 border-green-200';
      case 'Lost': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  // Check if site visit info is missing or schedule is close (within 2 days)
  const getSiteVisitAlert = (lead: DemoLead): 'missing' | 'close' | null => {
    if (lead.stage !== 'Site Visit Scheduled') return null;
    if (!lead.siteVisitDate || !lead.siteVisitTime) return 'missing';
    const visitDateTime = new Date(lead.siteVisitDate);
    const now = new Date();
    const diffMs = visitDateTime.getTime() - now.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 2 && diffDays >= 0) return 'close';
    return null;
  };

  const handleScheduleVisit = async () => {
    if (!schedulingLead || !visitDate || !visitTime) return;
    try {
      const updated = await humanLeadsApi.update(schedulingLead.id, { siteVisitDate: visitDate, siteVisitTime: visitTime });
      setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
    } catch {
      // keep the modal state; surface nothing fancy — leads reload will correct
    }
    setSchedulingLead(null);
    setVisitDate('');
    setVisitTime('');
  };

  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone || saving) return;
    setSaving(true);
    try {
      const created = await humanLeadsApi.create({
        name: newLead.name,
        phone: newLead.phone,
        altPhone: newLead.altPhone,
        email: newLead.email,
        budget: newLead.budget,
        homeType: newLead.homeType,
        buyingType: newLead.buyingType,
        location: newLead.location,
        projectName: newLead.project === '__other__' ? '' : newLead.project,
        source: newLead.source === 'Other' ? newLead.customSource || 'Other' : newLead.source,
        leadType: newLead.leadType,
        stage: newLead.stage,
      });
      setLeads(prev => [created, ...prev]);
      setNewLead({ name: '', phone: '', altPhone: '', email: '', budget: '', homeType: '', buyingType: '', location: '', project: '', source: 'Meta Ad', customSource: '', stage: 'New Lead', leadType: 'inbound' });
      setShowAddLead(false);
    } catch {
      // leave the form open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  // Reassign a lead to an agent (captain/admin)
  const handleAssign = async (leadId: string, agentId: string | null) => {
    try {
      const updated = await humanLeadsApi.assign(leadId, agentId);
      setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
      if (selectedLead?.id === updated.id) setSelectedLead(updated);
    } catch {
      loadLeads();
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.project.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery);
    const matchesStage = filterStage === 'All' || lead.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  // If a lead is selected, show detail view
  if (selectedLead) {
    const handleStageChange = async (newStage: string) => {
      // Optimistic update, then persist
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, stage: newStage } : l));
      setSelectedLead({ ...selectedLead, stage: newStage });
      try {
        const updated = await humanLeadsApi.updateStage(selectedLead.id, newStage);
        setLeads(prev => prev.map(l => (l.id === updated.id ? updated : l)));
        setSelectedLead(updated);
      } catch {
        loadLeads();
      }
    };
    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden" style={{ minHeight: '520px' }}>
        <LeadDetailView
          lead={selectedLead}
          onBack={() => setSelectedLead(null)}
          stages={PIPELINE_STAGES}
          stageColor={stageColor}
          onStageChange={handleStageChange}
          projectAssets={projectsByName[selectedLead.project] || []}
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-[#E7E5E4]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-[#2A2A2A] font-serif">Leads</h3>
            <p className="text-xs text-[#A8A29E] mt-0.5">{filteredLeads.length} total leads</p>
          </div>
          <div className="flex items-center gap-2">
            {user?.role === 'captain' && (
              <button onClick={() => setShowTeamPanel(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87" />
                </svg>
                Captain Team
              </button>
            )}
            <a href="https://sales.homeintown.in" target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg border border-[#E7E5E4] text-[10px] font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all">
              Advanced
            </a>
            <button onClick={() => setShowAddLead(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#B45309] text-white rounded-lg text-xs font-bold shadow-sm hover:shadow-md hover:bg-[#92400E] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add lead
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm placeholder:text-[#A8A29E] focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all"
          />
        </div>

        {/* Stage filter pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setFilterStage('All')}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
              filterStage === 'All'
                ? 'bg-[#B45309] text-white'
                : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'
            }`}
          >
            All
          </button>
          {PIPELINE_STAGES.map(stage => (
            <button
              key={stage}
              onClick={() => setFilterStage(stage)}
              className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                filterStage === stage
                  ? 'bg-[#B45309] text-white'
                  : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Lead list */}
      <div className="divide-y divide-[#E7E5E4] max-h-[500px] overflow-y-auto">
        {loading && (
          <div className="py-12 text-center">
            <span className="inline-block w-6 h-6 border-2 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" />
          </div>
        )}
        {!loading && loadError && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#A8A29E]">{loadError}</p>
            <button onClick={loadLeads} className="mt-2 text-xs font-bold text-[#B45309] hover:underline">Try again</button>
          </div>
        )}
        {!loading && !loadError && filteredLeads.map((lead, idx) => {
          const alert = getSiteVisitAlert(lead);
          return (
            <div
              key={lead.id || `lead-${idx}`}
              onClick={() => setSelectedLead(lead)}
              className={`flex items-center gap-3 px-5 py-4 hover:bg-[#FAF7F2] transition-colors cursor-pointer group ${
                alert ? 'bg-red-50/50' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B45309]/15 to-[#B45309]/5 flex items-center justify-center text-sm font-bold text-[#B45309] shrink-0">
                {lead.name.split(' ').map(n => n[0]).join('')}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[#2A2A2A] truncate group-hover:text-[#B45309] transition-colors">{lead.name}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 ${stageColor(lead.stage)}`}>
                    {lead.stage}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0 uppercase ${leadTypeBadge(lead.leadType)}`}>
                    {lead.leadType}
                  </span>
                </div>
                <p className="text-xs text-[#57534E] truncate mt-0.5">{lead.project}</p>

                {/* Ownership — who brought the lead and who it's assigned to */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                  {lead.createdBy && (
                    <span className="text-[10px] text-[#A8A29E]">
                      Added by <span className="font-semibold text-[#57534E]">{lead.createdBy.name}</span>
                      <span className="text-[#A8A29E]"> ({lead.createdBy.role})</span>
                    </span>
                  )}
                  <span className="text-[10px] text-[#A8A29E]">
                    Assigned to{' '}
                    <span className={`font-semibold ${lead.assignedAgent ? 'text-[#B45309]' : 'text-[#A8A29E]'}`}>
                      {lead.assignedAgent ? lead.assignedAgent.name : 'Unassigned'}
                    </span>
                  </span>
                </div>

                {/* Assign dropdown — captain only */}
                {canAssign && (
                  <select
                    value={lead.assignedAgent?.id || ''}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); handleAssign(lead.id, e.target.value || null); }}
                    className="mt-1.5 text-[10px] font-bold text-[#57534E] bg-[#FAF7F2] border border-[#E7E5E4] rounded-lg px-2 py-1 focus:outline-none focus:border-[#B45309]/40"
                  >
                    <option value="">Unassigned</option>
                    {teamAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                )}

                {/* Site Visit Alert */}
                {alert === 'missing' && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-bold text-red-600">Site visit date/time not set!</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSchedulingLead(lead); }}
                      className="ml-1 px-1.5 py-0.5 rounded bg-red-100 text-[9px] font-bold text-red-700 hover:bg-red-200 transition-colors"
                    >
                      Schedule
                    </button>
                  </div>
                )}
                {alert === 'close' && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-[10px] font-bold text-red-600">Visit soon: {lead.siteVisitDate} at {lead.siteVisitTime}</span>
                  </div>
                )}
                {lead.stage === 'Site Visit Scheduled' && !alert && lead.siteVisitDate && (
                  <div className="flex items-center gap-1 mt-1">
                    <svg className="w-3 h-3 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-medium text-cyan-700">{lead.siteVisitDate} at {lead.siteVisitTime}</span>
                  </div>
                )}
              </div>

              {/* Date + Arrow */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-[#A8A29E]">{lead.date}</span>
                <svg className="w-4 h-4 text-[#A8A29E] group-hover:text-[#B45309] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          );
        })}

        {!loading && !loadError && filteredLeads.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-[#A8A29E]">No leads found</p>
            <p className="text-xs text-[#A8A29E] mt-1">Add a lead to get started.</p>
          </div>
        )}
      </div>

      {/* Site Visit Scheduling Modal */}
      {schedulingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2A2A2A] font-serif">Schedule Site Visit</h3>
              <button
                onClick={() => { setSchedulingLead(null); setVisitDate(''); setVisitTime(''); }}
                className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#A8A29E] hover:text-[#2A2A2A] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
              <div className="w-9 h-9 rounded-full bg-[#B45309]/10 flex items-center justify-center text-xs font-bold text-[#B45309]">
                {schedulingLead.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <p className="text-sm font-bold text-[#2A2A2A]">{schedulingLead.name}</p>
                <p className="text-[10px] text-[#A8A29E]">{schedulingLead.project}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Visit Date</label>
                <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Visit Time</label>
                <input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => { setSchedulingLead(null); setVisitDate(''); setVisitTime(''); }} className="flex-1 py-2.5 rounded-xl border border-[#E7E5E4] text-sm font-bold text-[#57534E] hover:bg-[#FAF7F2] transition-colors">Cancel</button>
              <button onClick={handleScheduleVisit} disabled={!visitDate || !visitTime} className="flex-1 py-2.5 rounded-xl bg-[#B45309] text-white text-sm font-bold shadow-sm hover:bg-[#92400E] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-white pb-2">
              <h3 className="text-base font-bold text-[#2A2A2A] font-serif">Add New Lead</h3>
              <button onClick={() => setShowAddLead(false)} className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#A8A29E] hover:text-[#2A2A2A] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Name *</label>
                <input type="text" placeholder="Client name" value={newLead.name} onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>

              {/* Phone + Alt Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#57534E] mb-1 block">Phone *</label>
                  <input type="tel" placeholder="+91 XXXXX XXXXX" value={newLead.phone} onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#57534E] mb-1 block">Alt. Number <span className="text-[#A8A29E] font-normal">(optional)</span></label>
                  <input type="tel" placeholder="+91 XXXXX XXXXX" value={newLead.altPhone} onChange={(e) => setNewLead(prev => ({ ...prev, altPhone: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Email</label>
                <input type="email" placeholder="client@email.com" value={newLead.email} onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Budget</label>
                <input type="text" placeholder="e.g. 50L - 80L" value={newLead.budget} onChange={(e) => setNewLead(prev => ({ ...prev, budget: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>

              {/* Home Type */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Home Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK+', 'Villa', 'Row House', 'Duplex', 'Penthouse', 'Plot', 'Shop', 'Office'].map(type => (
                    <button key={type} type="button" onClick={() => setNewLead(prev => ({ ...prev, homeType: type }))} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${newLead.homeType === type ? 'bg-[#B45309] text-white' : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buying Type */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Buying Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Self-use', 'Investment', 'Rental income', 'Upgrade', 'Second home', 'NRI purchase'].map(type => (
                    <button key={type} type="button" onClick={() => setNewLead(prev => ({ ...prev, buyingType: type }))} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${newLead.buyingType === type ? 'bg-[#B45309] text-white' : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'}`}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Location</label>
                <input type="text" placeholder="Area / City" value={newLead.location} onChange={(e) => setNewLead(prev => ({ ...prev, location: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
              </div>

              {/* Project Interest */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Project Interest</label>
                <select value={newLead.project} onChange={(e) => setNewLead(prev => ({ ...prev, project: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all">
                  <option value="">Select project...</option>
                  {projectsList.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  <option value="__other__">Other (type below)</option>
                </select>
                {newLead.project === '__other__' && (
                  <input type="text" placeholder="Type project name" className="w-full mt-2 px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" onChange={(e) => setNewLead(prev => ({ ...prev, project: e.target.value }))} />
                )}
              </div>

              {/* Lead Type — Inbound (client enquiry) vs Outbound (cold / manually sourced) */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Lead Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewLead(prev => ({ ...prev, leadType: 'inbound' }))}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${newLead.leadType === 'inbound' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-[#FAF7F2] text-[#57534E] border-[#E7E5E4] hover:border-emerald-400'}`}
                  >
                    Inbound
                    <span className="block text-[9px] font-medium opacity-80 mt-0.5">Client ne khud enquiry ki</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewLead(prev => ({ ...prev, leadType: 'outbound' }))}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${newLead.leadType === 'outbound' ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#FAF7F2] text-[#57534E] border-[#E7E5E4] hover:border-violet-400'}`}
                  >
                    Outbound
                    <span className="block text-[9px] font-medium opacity-80 mt-0.5">Cold / manually sourced</span>
                  </button>
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Source</label>
                <select value={newLead.source} onChange={(e) => setNewLead(prev => ({ ...prev, source: e.target.value, customSource: '' }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all">
                  <option value="Meta Ad">Meta Ad</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Website">Website</option>
                  <option value="Google Ad">Google Ad</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Referral">Referral</option>
                  <option value="Broker">Broker</option>
                  <option value="Cold Database">Cold Database</option>
                  <option value="Cold Call">Cold Call</option>
                  <option value="Other">Other (write your own)</option>
                </select>
                {newLead.source === 'Other' && (
                  <input type="text" placeholder="Enter custom source" value={newLead.customSource} onChange={(e) => setNewLead(prev => ({ ...prev, customSource: e.target.value }))} className="w-full mt-2 px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all" />
                )}
              </div>

              {/* Stage */}
              <div>
                <label className="text-xs font-bold text-[#57534E] mb-1 block">Stage</label>
                <select value={newLead.stage} onChange={(e) => setNewLead(prev => ({ ...prev, stage: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-sm bg-white focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all">
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-white pt-3">
              <button onClick={() => setShowAddLead(false)} className="flex-1 py-2.5 rounded-xl border border-[#E7E5E4] text-sm font-bold text-[#57534E] hover:bg-[#FAF7F2] transition-colors">Cancel</button>
              <button onClick={handleAddLead} disabled={!newLead.name || !newLead.phone} className="flex-1 py-2.5 rounded-xl bg-[#B45309] text-white text-sm font-bold shadow-sm hover:bg-[#92400E] disabled:opacity-40 disabled:cursor-not-allowed transition-all">Add Lead</button>
            </div>
          </div>
        </div>
      )}

      {/* Captain team-up panel */}
      {showTeamPanel && (
        <CaptainTeamPanel
          onClose={() => setShowTeamPanel(false)}
          onChanged={() => { loadTeamAgents(); loadLeads(); }}
        />
      )}
    </div>
  );
}
