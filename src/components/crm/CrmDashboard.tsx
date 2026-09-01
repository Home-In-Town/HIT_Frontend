'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { crmBridgeApi, CrmLead, CrmLeadsParams, CrmLeadsResponse, ApiError } from '@/lib/api';
import CrmLeadTable from './CrmLeadTable';
import CrmLeadDrawer from './CrmLeadDrawer';
import HumanLeadManager from './HumanLeadManager';
import LeadCourse from './LeadCourse';

type Tab = 'leads' | 'campaigns' | 'whatsapp';

const TABS: { key: Tab; label: string; redirectPath: string }[] = [
  { key: 'leads',     label: 'Leads',              redirectPath: '' },
  { key: 'campaigns', label: 'Campaigns',           redirectPath: '/campaigns' },
  { key: 'whatsapp',  label: 'WhatsApp Templates',  redirectPath: '/whatsapp-templates' },
];

const DEFAULT_LEADS: CrmLeadsResponse = {
  leads: [],
  total: 0,
  page: 1,
  pages: 1,
};

export default function CrmDashboard() {
  const [leadsData, setLeadsData] = useState<CrmLeadsResponse>(DEFAULT_LEADS);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('leads');
  const [ssoLoadingTab, setSsoLoadingTab] = useState<Tab | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);

  // Manager mode: 'ai', 'human', or the 'course'
  const [managerMode, setManagerMode] = useState<'ai' | 'human' | 'course'>('ai');

  // Drawer state
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Current lead filter state
  const [currentParams, setCurrentParams] = useState<CrmLeadsParams>({ page: 1 });

  // On mount: fetch first page of leads
  useEffect(() => {
    const init = async () => {
      setLeadsLoading(true);
      setError(null);
      try {
        const leadsResult = await crmBridgeApi.getLeads({ page: 1 });
        setLeadsData(leadsResult);
      } catch (err: unknown) {
        const msg = err instanceof ApiError ? err.message : 'Failed to load CRM data';
        setError(msg);
      } finally {
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
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6 bg-[#FAF7F2] min-h-screen">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">CRM Dashboard</h1>
          <p className="text-sm text-[#A8A29E] mt-0.5">Live lead intelligence from OneEmployee</p>
        </div>
      </div>

      {/* Manager Mode Toggle — wraps on mobile, sits inline on larger screens */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button
          onClick={() => setManagerMode('ai')}
          className={`flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex-1 sm:flex-none min-w-[calc(50%-0.25rem)] sm:min-w-0 ${
            managerMode === 'ai'
              ? 'bg-[#B45309] text-white shadow-lg shadow-[#B45309]/25'
              : 'bg-white text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40 hover:text-[#B45309]'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          AI Leads Manager
        </button>
        <button
          onClick={() => setManagerMode('human')}
          className={`flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex-1 sm:flex-none min-w-[calc(50%-0.25rem)] sm:min-w-0 ${
            managerMode === 'human'
              ? 'bg-[#B45309] text-white shadow-lg shadow-[#B45309]/25'
              : 'bg-white text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40 hover:text-[#B45309]'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Human Lead Manager
        </button>
        <button
          onClick={() => setManagerMode('course')}
          className={`flex items-center justify-center gap-2 sm:gap-2.5 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 flex-1 sm:flex-none ${
            managerMode === 'course'
              ? 'bg-[#B45309] text-white shadow-lg shadow-[#B45309]/25'
              : 'bg-white text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40 hover:text-[#B45309]'
          }`}
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Earn 1 Cr Per Year
        </button>
      </div>

      {/* AI Leads Manager Content */}
      {managerMode === 'ai' && (
        <>
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
        </>
      )}

      {/* Human Lead Manager Content */}
      {managerMode === 'human' && (
        <HumanLeadManager />
      )}

      {/* Earn 1 Cr Per Year — landing page + locked course */}
      {managerMode === 'course' && (
        <LeadCourse />
      )}
    </div>
  );
}
