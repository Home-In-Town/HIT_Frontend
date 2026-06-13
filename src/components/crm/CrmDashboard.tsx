'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { crmBridgeApi, CrmAnalytics, CrmLead, CrmLeadsParams, CrmLeadsResponse, ApiError } from '@/lib/api';
import CrmMetricsBar from './CrmMetricsBar';
import CrmLeadTable from './CrmLeadTable';
import CrmLeadDrawer from './CrmLeadDrawer';

type Tab = 'leads' | 'campaigns' | 'whatsapp';

const TABS: { key: Tab; label: string; redirectPath: string }[] = [
  { key: 'leads',     label: 'Leads',              redirectPath: '' },
  { key: 'campaigns', label: 'Campaigns',           redirectPath: '/campaigns' },
  { key: 'whatsapp',  label: 'WhatsApp Templates',  redirectPath: '/whatsapp-templates' },
];

const DEFAULT_ANALYTICS: CrmAnalytics = {
  total: 0,
  hot: 0,
  warm: 0,
  cold: 0,
  engagementRate: 0,
  avgScore: 0,
  recentActivity: [],
};

const DEFAULT_LEADS: CrmLeadsResponse = {
  leads: [],
  total: 0,
  page: 1,
  pages: 1,
};

export default function CrmDashboard() {
  const [analytics, setAnalytics] = useState<CrmAnalytics>(DEFAULT_ANALYTICS);
  const [leadsData, setLeadsData] = useState<CrmLeadsResponse>(DEFAULT_LEADS);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [ssoLoadingTab, setSsoLoadingTab] = useState<Tab | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Drawer state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Current lead filter state
  const [currentParams, setCurrentParams] = useState<CrmLeadsParams>({ page: 1 });

  // On mount: fetch analytics + first page of leads
  useEffect(() => {
    const init = async () => {
      setAnalyticsLoading(true);
      setLeadsLoading(true);
      setError(null);
      try {
        const [analyticsResult, leadsResult] = await Promise.all([
          crmBridgeApi.getAnalytics(),
          crmBridgeApi.getLeads({ page: 1 }),
        ]);
        setAnalytics(analyticsResult);
        setLeadsData(leadsResult);
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load CRM data';
        setError(msg);
      } finally {
        setAnalyticsLoading(false);
        setLeadsLoading(false);
      }
    };
    init();
  }, []);

  // Re-fetch leads when params change
  const fetchLeads = useCallback(async (params: CrmLeadsParams) => {
    setLeadsLoading(true);
    try {
      const result = await crmBridgeApi.getLeads(params);
      setLeadsData(result);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'Failed to fetch leads';
      setError(msg);
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const handleFilterChange = (params: CrmLeadsParams) => {
    setCurrentParams(params);
    fetchLeads(params);
  };

  // SSO flow for Campaigns / WhatsApp Templates tabs
  const handleSsoTab = async (tab: Tab, redirectPath: string) => {
    setSsoLoadingTab(tab);
    setSsoError(null);
    try {
      const { token } = await crmBridgeApi.getSsoToken(redirectPath);
      const redirectBase = await crmBridgeApi.getRedirectBase();
      const validateUrl = `${redirectBase}/api/sso/validate?token=${encodeURIComponent(token)}&redirect=${encodeURIComponent(redirectPath)}`;
      window.open(validateUrl, '_blank');
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : 'SSO failed. Please try again.';
      setSsoError(msg);
    } finally {
      setSsoLoadingTab(null);
    }
  };

  const handleTabClick = (tab: Tab, redirectPath: string) => {
    if (tab === 'leads') {
      setActiveTab('leads');
      setSsoError(null);
      return;
    }
    handleSsoTab(tab, redirectPath);
  };

  // Lead drawer
  const handleLeadClick = async (leadId: string) => {
    setSelectedLeadId(leadId);
    setDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedLead(null);
    try {
      const lead = await crmBridgeApi.getLeadById(leadId);
      setSelectedLead(lead);
    } catch {
      // Keep drawer open; show partial data
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedLeadId(null);
    setSelectedLead(null);
  };

  if (error) {
    return (
      <div className="p-6 bg-[#FAF7F2] min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#2A2A2A]">{error}</p>
          <button
            onClick={() => { setError(null); fetchLeads(currentParams); }}
            className="text-xs font-bold text-[#B45309] hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-[#FAF7F2] min-h-screen">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">CRM Dashboard</h1>
          <p className="text-sm text-[#A8A29E] mt-0.5">Live lead intelligence from OneEmployee</p>
        </div>
      </div>

      {/* Metrics bar */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E7E5E4] p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <CrmMetricsBar analytics={analytics} />
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="flex border-b border-[#E7E5E4] bg-[#FAF7F2]">
          {TABS.map(({ key, label, redirectPath }) => {
            const isLeads = key === 'leads';
            const isActive = activeTab === key;
            const isLoading = ssoLoadingTab === key;

            return (
              <button
                key={key}
                onClick={() => handleTabClick(key, redirectPath)}
                disabled={isLoading}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-bold border-b-2 transition-all disabled:opacity-50 disabled:cursor-wait ${
                  isActive && isLeads
                    ? 'border-[#B45309] text-[#B45309] bg-white'
                    : 'border-transparent text-[#A8A29E] hover:text-[#57534E] hover:bg-white/60'
                }`}
              >
                {isLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-[#B45309]/40 border-t-[#B45309] rounded-full animate-spin" />
                )}
                {label}
                {!isLeads && (
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* SSO error */}
        {ssoError && (
          <div className="flex items-center gap-2 px-5 py-3 bg-red-50 border-b border-red-100 text-sm text-red-700">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span className="font-medium">{ssoError}</span>
            <button onClick={() => setSsoError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Tab content */}
        <div className="p-5">
          {activeTab === 'leads' && (
            <CrmLeadTable
              leads={leadsData.leads}
              total={leadsData.total}
              page={leadsData.page}
              pages={leadsData.pages}
              loading={leadsLoading}
              onFilterChange={handleFilterChange}
              onLeadClick={handleLeadClick}
            />
          )}
        </div>
      </div>

      {/* Lead detail drawer */}
      <CrmLeadDrawer
        lead={drawerLoading ? null : selectedLead}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />
    </div>
  );
}
