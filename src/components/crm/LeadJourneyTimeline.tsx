'use client';

import React, { useState, useEffect } from 'react';
import { crmBridgeApi } from '@/lib/api';

interface TimelineEntry {
  stage: string;
  stageLabel: string;
  timestamp: string;
  notes: string;
  metadata?: Record<string, unknown>;
  movedBy?: { name: string; role: string };
}

interface JourneyData {
  currentStage: string;
  currentStageLabel: string;
  timeline: TimelineEntry[];
  stageOrder: string[];
  stageLabels: Record<string, string>;
  propertyInterest?: {
    projectName?: string;
    bhkPreference?: string;
    budgetRange?: string;
    preferredLocation?: string;
    timeline?: string;
    loanRequired?: boolean;
  };
  isConverted?: boolean;
  dealValue?: number;
}

const STAGE_ICONS: Record<string, string> = {
  lead_captured: '📥',
  contacted: '📞',
  qualified: '✅',
  site_visit_scheduled: '📅',
  site_visit_done: '🏠',
  offer_made: '💰',
  negotiation: '🤝',
  deal_closed: '🎉',
  lost: '❌',
};

const STAGE_COLORS: Record<string, { dot: string; line: string; bg: string }> = {
  lead_captured:         { dot: 'bg-slate-400', line: 'bg-slate-200', bg: 'bg-slate-50' },
  contacted:             { dot: 'bg-blue-500',  line: 'bg-blue-200',  bg: 'bg-blue-50' },
  qualified:             { dot: 'bg-emerald-500', line: 'bg-emerald-200', bg: 'bg-emerald-50' },
  site_visit_scheduled:  { dot: 'bg-amber-500', line: 'bg-amber-200', bg: 'bg-amber-50' },
  site_visit_done:       { dot: 'bg-orange-500', line: 'bg-orange-200', bg: 'bg-orange-50' },
  offer_made:            { dot: 'bg-purple-500', line: 'bg-purple-200', bg: 'bg-purple-50' },
  negotiation:           { dot: 'bg-indigo-500', line: 'bg-indigo-200', bg: 'bg-indigo-50' },
  deal_closed:           { dot: 'bg-green-600', line: 'bg-green-300', bg: 'bg-green-50' },
  lost:                  { dot: 'bg-red-500',   line: 'bg-red-200',   bg: 'bg-red-50' },
};

const ADVANCE_OPTIONS = [
  { stage: 'contacted', label: 'Mark as Contacted' },
  { stage: 'qualified', label: 'Mark as Qualified' },
  { stage: 'site_visit_scheduled', label: 'Schedule Site Visit' },
  { stage: 'site_visit_done', label: 'Visit Completed' },
  { stage: 'offer_made', label: 'Offer Made' },
  { stage: 'negotiation', label: 'In Negotiation' },
  { stage: 'deal_closed', label: 'Close Deal' },
  { stage: 'lost', label: 'Mark as Lost' },
];

interface Props {
  leadId: string;
}

export default function LeadJourneyTimeline({ leadId }: Props) {
  const [journey, setJourney] = useState<JourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [showAdvance, setShowAdvance] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchJourney = async () => {
    try {
      setLoading(true);
      const data = await crmBridgeApi.getJourney(leadId);
      setJourney(data as JourneyData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load journey');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) fetchJourney();
  }, [leadId]);

  const handleAdvance = async (stage: string) => {
    setAdvancing(true);
    try {
      await crmBridgeApi.advanceStage(leadId, { stage, notes: notes || undefined });
      setNotes('');
      setShowAdvance(false);
      await fetchJourney();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to advance stage');
    } finally {
      setAdvancing(false);
    }
  };

  // Get available next stages (only forward from current)
  const getNextStages = () => {
    if (!journey) return [];
    const stageOrder = journey.stageOrder;
    const currentIdx = stageOrder.indexOf(journey.currentStage);
    if (journey.currentStage === 'deal_closed' || journey.currentStage === 'lost') return [];
    const nextStages = stageOrder.slice(currentIdx + 1);
    return [...ADVANCE_OPTIONS.filter(o => nextStages.includes(o.stage)), { stage: 'lost', label: 'Mark as Lost' }];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !journey) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-red-500">{error}</p>
        <button onClick={fetchJourney} className="text-[10px] font-bold text-[#B45309] mt-2 hover:underline">Retry</button>
      </div>
    );
  }

  if (!journey) return null;

  const completedStages = journey.timeline.map(t => t.stage);
  const stageOrder = journey.stageOrder;

  return (
    <div className="space-y-4">
      {/* Current Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{STAGE_ICONS[journey.currentStage] || '📋'}</span>
          <div>
            <p className="text-xs font-bold text-[#2A2A2A]">{journey.currentStageLabel}</p>
            <p className="text-[10px] text-[#A8A29E]">Current Stage</p>
          </div>
        </div>
        {journey.currentStage !== 'deal_closed' && journey.currentStage !== 'lost' && (
          <button
            onClick={() => setShowAdvance(!showAdvance)}
            className="text-[10px] font-bold text-[#B45309] border border-[#B45309]/30 px-3 py-1.5 rounded-lg hover:bg-[#B45309]/5 transition-colors"
          >
            {showAdvance ? 'Cancel' : 'Advance →'}
          </button>
        )}
      </div>

      {/* Advance Panel */}
      {showAdvance && (
        <div className="bg-[#FAF7F2] rounded-xl border border-[#E7E5E4] p-4 space-y-3">
          <p className="text-[10px] font-bold text-[#57534E] uppercase tracking-wider">Move to next stage</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes (optional)..."
            className="w-full px-3 py-2 text-xs border border-[#E7E5E4] rounded-lg bg-white resize-none h-16 focus:outline-none focus:border-[#B45309]"
          />
          <div className="flex flex-wrap gap-2">
            {getNextStages().map(opt => (
              <button
                key={opt.stage}
                onClick={() => handleAdvance(opt.stage)}
                disabled={advancing}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                  opt.stage === 'lost'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-[#B45309]/30 text-[#B45309] hover:bg-[#B45309]/5'
                }`}
              >
                {STAGE_ICONS[opt.stage]} {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Deal Closed Banner */}
      {journey.isConverted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-xs font-bold text-green-800">Deal Closed!</p>
            {journey.dealValue && (
              <p className="text-[10px] text-green-600">₹{journey.dealValue.toLocaleString('en-IN')}</p>
            )}
          </div>
        </div>
      )}

      {/* Visual Pipeline Progress */}
      <div className="flex items-center gap-0.5 overflow-x-auto pb-2">
        {stageOrder.map((stage, idx) => {
          const isCompleted = completedStages.includes(stage);
          const isCurrent = journey.currentStage === stage;
          const colors = STAGE_COLORS[stage] || STAGE_COLORS.lead_captured;
          return (
            <div key={stage} className="flex items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 transition-all ${
                  isCurrent
                    ? `${colors.dot} border-white shadow-md text-white`
                    : isCompleted
                      ? `${colors.dot} border-transparent text-white`
                      : 'bg-white border-slate-200 text-slate-300'
                }`}
                title={journey.stageLabels?.[stage] || stage}
              >
                {isCompleted || isCurrent ? '✓' : (idx + 1)}
              </div>
              {idx < stageOrder.length - 1 && (
                <div className={`w-4 h-0.5 ${isCompleted ? colors.line : 'bg-slate-100'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline (Vertical — like Flipkart tracker) */}
      <div className="relative pl-6 space-y-0">
        {journey.timeline.map((entry, idx) => {
          const colors = STAGE_COLORS[entry.stage] || STAGE_COLORS.lead_captured;
          const isLast = idx === journey.timeline.length - 1;
          return (
            <div key={idx} className="relative pb-5">
              {/* Vertical line */}
              {!isLast && (
                <div className={`absolute left-[-17px] top-5 bottom-0 w-0.5 ${colors.line}`} />
              )}
              {/* Dot */}
              <div className={`absolute left-[-21px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ${colors.dot}`} />
              {/* Content */}
              <div className={`rounded-lg ${colors.bg} border border-opacity-50 p-3`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-[#2A2A2A]">
                    {STAGE_ICONS[entry.stage]} {entry.stageLabel}
                  </p>
                  <span className="text-[9px] text-[#A8A29E]">
                    {new Date(entry.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </span>
                </div>
                {entry.notes && (
                  <p className="text-[11px] text-[#57534E] mt-1">{entry.notes}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[9px] text-[#A8A29E]">
                    {new Date(entry.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {entry.movedBy?.name && (
                    <span className="text-[9px] text-[#A8A29E]">• by {entry.movedBy.name}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Property Interest (if filled) */}
      {journey.propertyInterest?.projectName && (
        <div className="bg-[#FAF7F2] rounded-xl border border-[#E7E5E4] p-4 space-y-2">
          <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Property Interest</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#57534E]">
            {journey.propertyInterest.projectName && <div><span className="text-[9px] text-[#A8A29E] block">Project</span>{journey.propertyInterest.projectName}</div>}
            {journey.propertyInterest.bhkPreference && <div><span className="text-[9px] text-[#A8A29E] block">BHK</span>{journey.propertyInterest.bhkPreference}</div>}
            {journey.propertyInterest.budgetRange && <div><span className="text-[9px] text-[#A8A29E] block">Budget</span>{journey.propertyInterest.budgetRange}</div>}
            {journey.propertyInterest.preferredLocation && <div><span className="text-[9px] text-[#A8A29E] block">Location</span>{journey.propertyInterest.preferredLocation}</div>}
            {journey.propertyInterest.timeline && <div><span className="text-[9px] text-[#A8A29E] block">Timeline</span>{journey.propertyInterest.timeline}</div>}
          </div>
        </div>
      )}

      {error && <p className="text-[10px] text-red-500 text-center">{error}</p>}
    </div>
  );
}
