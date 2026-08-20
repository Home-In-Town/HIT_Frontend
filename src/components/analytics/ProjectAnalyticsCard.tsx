'use client';

import { useEffect, useState } from 'react';
import { analyticsApi, ProjectAnalytics } from '@/lib/api';

interface ProjectAnalyticsCardProps {
  projectId: string;
  isPublished: boolean;
  className?: string;
  customLabel?: string;
  showIcon?: boolean;
}

export default function ProjectAnalyticsCard({ 
  projectId, 
  isPublished, 
  className = '',
  customLabel,
  showIcon = true
}: ProjectAnalyticsCardProps) {
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!isPublished) {
      setLoading(false);
      return;
    }

    if (showModal && !analytics) {
      fetchAnalytics();
    }
  }, [showModal, isPublished]);

  async function fetchAnalytics() {
     setLoading(true);
      try {
        const data = await analyticsApi.getProjectAnalytics(projectId);
        setAnalytics(data);
      } catch {
        setError('Could not load analytics');
      } finally {
        setLoading(false);
      }
  }

  const formatTime = (seconds: number | undefined | null) => {
    if (seconds === undefined || seconds === null) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  // Calculate CTA clicks by type
  const callClicks = analytics?.ctaClicks.filter(c => c.ctaType === 'call').length || 0;
  const whatsappClicks = analytics?.ctaClicks.filter(c => c.ctaType === 'whatsapp').length || 0;
  const formClicks = analytics?.ctaClicks.filter(c => c.ctaType === 'form').length || 0;

  // Render the button
  const renderButton = () => {
    if (!isPublished) return null;

    return (
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-[#D6D3D1] hover:bg-[#F5F5F4] text-[#2A2A2A] text-sm font-medium rounded-lg transition-colors group ${className}`}
          title={customLabel || "View Analytics"}
        >
          {showIcon && <span>📊</span>}
          {customLabel && <span>{customLabel}</span>}
        </button>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Analytics Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          
          {/* Modal Card */}
          <div 
            className="relative w-full max-w-sm bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#E7E5E4]">
              <h3 className="text-lg font-bold text-[#2A2A2A] flex items-center gap-2 font-serif">
                <span>📊</span> Analytics
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-[#F5F5F4] rounded-lg transition-colors text-[#57534E] hover:text-[#2A2A2A]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">{error}</div>
              ) : analytics ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {/* Total Visits */}
                  <div className="bg-[#FAF7F2] rounded-xl p-4 text-center border border-[#E7E5E4]">
                    <p className="text-2xl font-bold text-[#B45309]">{analytics.totalVisits}</p>
                    <p className="text-xs text-[#57534E] uppercase tracking-wide mt-1">Total Visits</p>
                  </div>
                  
                  {/* Unique Leads */}
                  <div className="bg-[#FAF7F2] rounded-xl p-4 text-center border border-[#E7E5E4]">
                    <p className="text-2xl font-bold text-[#3F6212]">{analytics.uniqueLeads}</p>
                    <p className="text-xs text-[#57534E] uppercase tracking-wide mt-1">Unique Leads</p>
                  </div>
                  
                  {/* Time Spent */}
                  <div className="bg-[#FAF7F2] rounded-xl p-4 text-center border border-[#E7E5E4]">
                    <p className="text-2xl font-bold text-[#0F766E]">{formatTime(analytics.totalTimeSpent)}</p>
                    <p className="text-xs text-[#57534E] uppercase tracking-wide mt-1">Time Spent</p>
                    <p className="text-[10px] text-[#78716C] mt-0.5">(30s+ only)</p>
                  </div>
                  
                  {/* CTA Clicks */}
                  <div className="bg-[#FAF7F2] rounded-xl p-4 text-center border border-[#E7E5E4]">
                    <p className="text-2xl font-bold text-[#B45309]">{analytics.ctaClicks.length}</p>
                    <p className="text-xs text-[#57534E] uppercase tracking-wide mt-1">CTA Clicks</p>
                  </div>
                </div>
                
                {/* CTA Breakdown */}
                {analytics.ctaClicks.length > 0 && (
                  <div className="mt-4 p-3 bg-[#FAF7F2] rounded-xl border border-[#E7E5E4]">
                    <p className="text-xs text-[#57534E] mb-2 font-bold">CTA Breakdown</p>
                    <div className="flex justify-around">
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#2A2A2A]">📞 {callClicks}</p>
                        <p className="text-xs text-[#57534E]">Calls</p>
                      </div>
                      <div className="w-px bg-[#D6D3D1]"></div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#15803d]">💬 {whatsappClicks}</p>
                        <p className="text-xs text-[#57534E]">WhatsApp</p>
                      </div>
                      <div className="w-px bg-[#D6D3D1]"></div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-[#7E22CE]">📋 {formClicks}</p>
                        <p className="text-xs text-[#57534E]">Enquiries</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 pt-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-[#F5F5F4] hover:bg-[#E7E5E4] rounded-lg 
                           text-sm text-[#57534E] font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
