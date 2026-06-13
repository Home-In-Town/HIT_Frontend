'use client';

import React, { useState, useEffect } from 'react';
import { CrmLead, crmBridgeApi, ApiError } from '@/lib/api';

interface CrmLeadDrawerProps {
  lead: CrmLead | null;
  open: boolean;
  onClose: () => void;
}

function maskPhone(phone: string): string {
  const last4 = phone.slice(-4);
  return `••••${last4}`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

function StatusBadge({ status }: { status: CrmLead['status'] }) {
  const map: Record<CrmLead['status'], { bg: string; text: string; border: string }> = {
    HOT:     { bg: 'bg-red-50',   text: 'text-red-700',   border: 'border-red-100'   },
    WARM:    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' },
    COLD:    { bg: 'bg-blue-50',  text: 'text-blue-700',  border: 'border-blue-100'  },
    CREATED: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' },
  };
  const s = map[status] ?? map['CREATED'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${s.bg} ${s.text} ${s.border}`}>
      {status}
    </span>
  );
}

export default function CrmLeadDrawer({ lead, open, onClose }: CrmLeadDrawerProps) {
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Reset SSO error when a new lead is shown
  useEffect(() => {
    setSsoError(null);
  }, [lead?.id]);

  const handleOpenInOneEmployee = async () => {
    if (!lead) return;
    setSsoLoading(true);
    setSsoError(null);
    try {
      const { token } = await crmBridgeApi.getSsoToken(`/leads/${lead.id}`);
      const redirectBase = await crmBridgeApi.getRedirectBase();
      const validateUrl = `${redirectBase}/api/sso/validate?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(`/leads/${lead.id}`)}`;
      window.open(validateUrl, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to open. Try again.';
      setSsoError(msg);
    } finally {
      setSsoLoading(false);
    }
  };

  // Derived data
  const callHistory = lead?.callHistory ?? [];
  const whatsapp = lead?.whatsappData;
  const aiResult = lead?.aiCallResult;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Lead detail"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7E5E4] bg-[#FAF7F2] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#B45309]/10 border border-[#B45309]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-[#2A2A2A] text-sm font-serif">
                {lead ? `${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ''}` : 'Lead Details'}
              </h2>
              {lead && (
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={lead.status} />
                  <span className="text-[10px] text-[#A8A29E]">Score: {lead.score}</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-[#A8A29E] hover:text-[#2A2A2A] hover:bg-[#E7E5E4] rounded-lg transition-all"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!lead ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#A8A29E]">
              <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading lead…</p>
            </div>
          ) : (
            <>
              {/* Contact Info */}
              <section>
                <SectionTitle>Contact Information</SectionTitle>
                <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-sm font-mono text-[#57534E]">{maskPhone(lead.phone_number)}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-[#57534E]">{lead.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs text-[#A8A29E]">Added {formatDate(lead.createdAt)}</span>
                  </div>
                  {lead.source && (
                    <div className="flex items-center gap-3">
                      <svg className="w-4 h-4 text-[#A8A29E] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-[#A8A29E]">Source: <strong className="text-[#57534E]">{lead.source}</strong></span>
                    </div>
                  )}
                </div>
              </section>

              {/* Score breakdown */}
              <section>
                <SectionTitle>Lead Score</SectionTitle>
                <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#57534E]">Overall Score</span>
                    <span className="text-2xl font-bold font-mono text-[#B45309]">{lead.score}</span>
                  </div>
                  <div className="h-2 bg-[#E7E5E4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#B45309] to-[#92400E] rounded-full transition-all"
                      style={{ width: `${Math.min(100, lead.score)}%` }}
                    />
                  </div>
                  {aiResult && (
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      {[
                        { label: 'Interest', value: aiResult.interest },
                        { label: 'Budget',   value: aiResult.budget },
                        { label: 'Timeline', value: aiResult.timeline },
                        { label: 'Sentiment', value: aiResult.sentiment },
                      ].filter(item => item.value).map((item) => (
                        <div key={item.label} className="bg-white rounded-xl border border-[#E7E5E4] px-3 py-2">
                          <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest mb-0.5">{item.label}</p>
                          <p className="text-xs font-semibold text-[#2A2A2A] capitalize">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Link Activity */}
              {lead.linkActivity && (
                <section>
                  <SectionTitle>Link Activity</SectionTitle>
                  <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold font-mono text-[#2A2A2A]">{lead.linkActivity.visitCount}</p>
                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest">Visits</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold font-mono text-[#2A2A2A]">{lead.linkActivity.ctaClicks?.length ?? 0}</p>
                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest">CTA Clicks</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#2A2A2A]">{formatDate(lead.linkActivity.lastVisitAt)}</p>
                        <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest">Last Visit</p>
                      </div>
                    </div>
                    {lead.linkActivity.ctaClicks && lead.linkActivity.ctaClicks.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">Timeline</p>
                        {lead.linkActivity.ctaClicks.slice(-5).reverse().map((click, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-[#57534E]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#B45309] flex-shrink-0" />
                            <span className="font-medium capitalize">{click.type}</span>
                            <span className="text-[#A8A29E]">·</span>
                            <span className="text-[#A8A29E]">{formatDate(click.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* WhatsApp history */}
              {whatsapp && (
                <section>
                  <SectionTitle>WhatsApp History</SectionTitle>
                  <div className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4 space-y-2">
                    {[
                      { label: 'Status',   value: whatsapp.status },
                      { label: 'Sent At',  value: formatDate(whatsapp.sentAt) },
                      { label: 'Stage',    value: whatsapp.conversationStage },
                      { label: 'Last Reply', value: whatsapp.lastReply },
                    ].filter(row => row.value && row.value !== '—').map((row) => (
                      <div key={row.label} className="flex justify-between text-xs">
                        <span className="text-[#A8A29E] font-medium">{row.label}</span>
                        <span className="text-[#2A2A2A] font-semibold">{row.value}</span>
                      </div>
                    ))}
                    {!whatsapp.status && (
                      <p className="text-xs text-[#A8A29E]">No WhatsApp data available.</p>
                    )}
                  </div>
                </section>
              )}

              {/* Call Transcripts */}
              {callHistory.length > 0 && (
                <section>
                  <SectionTitle>Call Transcripts ({callHistory.length})</SectionTitle>
                  <div className="space-y-3">
                    {callHistory.map((call, i) => (
                      <div
                        key={call.callId ?? i}
                        className="bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">
                            Call #{call.callNumber}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-[#A8A29E]">
                            {call.duration && <span>{formatDuration(call.duration)}</span>}
                            {call.sentiment && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                                call.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-100' :
                                call.sentiment === 'negative' ? 'bg-red-50 text-red-600 border-red-100' :
                                'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>{call.sentiment}</span>
                            )}
                          </div>
                        </div>
                        {call.transcript ? (
                          <p className="text-xs text-[#57534E] leading-relaxed line-clamp-4">
                            {call.transcript}
                          </p>
                        ) : (
                          <p className="text-xs text-[#A8A29E] italic">No transcript available</p>
                        )}
                        {(call.interest || call.budget || call.timeline) && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {call.interest && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-white text-[#B45309] rounded border border-[#E7E5E4] uppercase tracking-widest">Interest: {call.interest}</span>}
                            {call.budget && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-white text-[#B45309] rounded border border-[#E7E5E4] uppercase tracking-widest">Budget: {call.budget}</span>}
                            {call.timeline && <span className="text-[8px] font-bold px-1.5 py-0.5 bg-white text-[#B45309] rounded border border-[#E7E5E4] uppercase tracking-widest">Timeline: {call.timeline}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* AI Call Summary */}
              {aiResult && (
                <section>
                  <SectionTitle>AI Call Summary</SectionTitle>
                  <div className="bg-gradient-to-br from-[#FAF7F2] to-white rounded-2xl border border-[#E7E5E4] p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-6 h-6 bg-[#B45309]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-1.5 text-xs text-[#57534E]">
                        {aiResult.interest && <p><strong>Interest:</strong> {aiResult.interest}</p>}
                        {aiResult.budget && <p><strong>Budget:</strong> {aiResult.budget}</p>}
                        {aiResult.timeline && <p><strong>Timeline:</strong> {aiResult.timeline}</p>}
                        {aiResult.sentiment && <p><strong>Sentiment:</strong> <span className="capitalize">{aiResult.sentiment}</span></p>}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer — Open in OneEmployee */}
        <div className="px-6 py-4 border-t border-[#E7E5E4] bg-[#FAF7F2] flex-shrink-0">
          {ssoError && (
            <p className="text-xs text-red-600 mb-2 font-medium">{ssoError}</p>
          )}
          <button
            onClick={handleOpenInOneEmployee}
            disabled={!lead || ssoLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#B45309] hover:bg-[#92400E] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-[#B45309]/20 active:scale-95"
          >
            {ssoLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Opening…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Open in OneEmployee
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
