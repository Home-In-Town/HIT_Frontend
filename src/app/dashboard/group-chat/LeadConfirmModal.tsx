'use client';

import { useState } from 'react';
import { leadMatchingApi, ExtractedLeadParams, LeadConfirmPayload } from '@/lib/api';
import toast from 'react-hot-toast';

interface LeadConfirmModalProps {
  // The detected extraction to review
  extraction: {
    intent: 'requirement' | 'inventory';
    confidence: number;
    params: ExtractedLeadParams;
    extractedFrom: string;
  };
  // Context for saving
  messageId?: string;
  roomId: string;
  onConfirm: (result: { matchCount: number; topScore?: number }) => void;
  onDismiss: () => void;
}

const BHK_OPTIONS = ['1RK', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK'];
const PROPERTY_TYPES = ['flat', 'plot', 'villa', 'row_house', 'penthouse', 'shop', 'office', 'farm', 'farmhouse'];
const BHK_PROPERTY_TYPES = ['flat', 'villa', 'row_house', 'penthouse', 'farmhouse'];
const SQFT_PROPERTY_TYPES = ['plot', 'shop', 'office'];
const ACRE_PROPERTY_TYPES = ['farm'];
const POSSESSION_OPTIONS = ['immediate', '6months', '1year', '2year'];
const URGENCY_OPTIONS = ['normal', 'urgent', 'very_urgent'];

export default function LeadConfirmModal({
  extraction,
  messageId,
  roomId,
  onConfirm,
  onDismiss,
}: LeadConfirmModalProps) {
  const [intent, setIntent] = useState<'requirement' | 'inventory'>(extraction.intent);
  const [params, setParams] = useState<ExtractedLeadParams>({ ...extraction.params });
  const [saving, setSaving] = useState(false);

  const updateParam = (key: keyof ExtractedLeadParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleConfirm = async () => {
    try {
      setSaving(true);
      const payload: LeadConfirmPayload = {
        originalText: extraction.extractedFrom,
        messageId,
        roomId,
        source: 'group_chat',
        intent,
        params,
      };
      const result = await leadMatchingApi.confirm(payload);
      if (result.success) {
        onConfirm({ matchCount: result.matchCount, topScore: result.matches[0]?.score });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const confidencePct = Math.round(extraction.confidence * 100);
  const confidenceColor = confidencePct >= 80 ? 'text-emerald-600' : confidencePct >= 50 ? 'text-amber-600' : 'text-red-500';
  const confidenceBg = confidencePct >= 80 ? 'bg-emerald-50 border-emerald-200' : confidencePct >= 50 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E7E5E4] overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-[#E7E5E4]">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-[#2A2A2A]">
                {intent === 'inventory' ? '📦 Detected Inventory' : '🔍 Detected Requirement'}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Check the details and confirm to save</p>
            </div>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${confidenceBg} ${confidenceColor}`}>
              {confidencePct}% confident
            </span>
          </div>

          {/* Original message */}
          <div className="mt-3 px-3 py-2 bg-[#FAF7F2] rounded-xl border border-[#E7E5E4]">
            <p className="text-[11px] text-gray-400 mb-0.5">From your message</p>
            <p className="text-xs text-gray-700 italic">&ldquo;{extraction.extractedFrom}&rdquo;</p>
          </div>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">

          {/* Intent toggle */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</label>
            <div className="flex gap-2 mt-1.5">
              {(['requirement', 'inventory'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setIntent(t)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all ${
                    intent === t
                      ? t === 'inventory'
                        ? 'bg-purple-500 text-white border-purple-500'
                        : 'bg-[#B45309] text-white border-[#B45309]'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t === 'requirement' ? '🔍 Requirement' : '📦 Inventory'}
                </button>
              ))}
            </div>
          </div>

          {/* BHK / Area + Property Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              {(!params.propertyType || BHK_PROPERTY_TYPES.includes(params.propertyType)) ? (
                <>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">BHK</label>
                  <select
                    value={params.bhkType || ''}
                    onChange={e => updateParam('bhkType', e.target.value || null)}
                    className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                  >
                    <option value="">Not specified</option>
                    {BHK_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </>
              ) : ACRE_PROPERTY_TYPES.includes(params.propertyType!) ? (
                <>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Area (acres)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    step="0.5"
                    value={params.area || ''}
                    onChange={e => {
                      updateParam('area', e.target.value ? Number(e.target.value) : null);
                      updateParam('areaUnit', 'acres');
                    }}
                    className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                  />
                </>
              ) : (
                <>
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Area (sq.ft)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1200"
                    value={params.area || ''}
                    onChange={e => {
                      updateParam('area', e.target.value ? Number(e.target.value) : null);
                      updateParam('areaUnit', 'sqft');
                    }}
                    className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                  />
                </>
              )}
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Property Type</label>
              <select
                value={params.propertyType || ''}
                onChange={e => updateParam('propertyType', e.target.value || null)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                <option value="">Not specified</option>
                {PROPERTY_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Budget</label>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Min"
                  value={params.budget || ''}
                  onChange={e => updateParam('budget', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                />
              </div>
              <span className="text-gray-400 text-sm font-medium">—</span>
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="Max (optional)"
                  value={params.budgetMax || ''}
                  onChange={e => updateParam('budgetMax', e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                />
              </div>
              <span className="text-xs font-bold text-gray-400 shrink-0">Lakhs</span>
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                Location
                {params.locationCanonical && (
                  <span className="ml-1.5 text-emerald-500 font-normal">✓ recognized</span>
                )}
              </label>
              <input
                type="text"
                placeholder="e.g. Manish Nagar"
                value={params.locationRaw || ''}
                onChange={e => updateParam('locationRaw', e.target.value)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">City</label>
              <input
                type="text"
                placeholder="e.g. Nagpur"
                value={params.city || ''}
                onChange={e => updateParam('city', e.target.value || null)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              />
            </div>
          </div>

          {/* Possession + Urgency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Possession</label>
              <select
                value={params.possessionNeeded || ''}
                onChange={e => updateParam('possessionNeeded', e.target.value || null)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                <option value="">Not specified</option>
                {POSSESSION_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Urgency</label>
              <select
                value={params.urgency || 'normal'}
                onChange={e => updateParam('urgency', e.target.value as any)}
                className="mt-1.5 w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
              >
                {URGENCY_OPTIONS.map(u => <option key={u} value={u}>{u.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Loan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => updateParam('loanRequired', !params.loanRequired)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                params.loanRequired
                  ? 'bg-[#B45309] text-white border-[#B45309]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              }`}
            >
              <span>{params.loanRequired ? '✓' : '+'}</span>
              Loan Required
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E7E5E4] flex gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#B45309] rounded-xl hover:bg-[#92400E] disabled:opacity-50 transition-colors shadow-lg shadow-[#B45309]/20"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : 'Confirm & Find Matches'}
          </button>
        </div>
      </div>
    </div>
  );
}
