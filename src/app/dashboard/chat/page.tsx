'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useAuth } from '@/lib/authContext';
import { chatApi, ChatSession, ChatMessage as ChatMsg, buildersNetworkApi, BuilderNetworkItem, PlatformPulse } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const { user } = useAuth();

  // Builders, captains, agents, and employees see the Builder Network view
  if (user?.role === 'builder' || user?.role === 'captain' || user?.role === 'agent' || user?.role === 'employee') {
    return <BuilderNetworkView />;
  }

  // Admin/agents see the existing 1:1 chat
  return <AdminChatView />;
}

// ═══════════════════════════════════════════════════════════
// BUILDER NETWORK VIEW — WhatsApp-like FOMO builder list (Light Theme)
// ═══════════════════════════════════════════════════════════

function BuilderNetworkView() {
  const { user } = useAuth();
  const [builders, setBuilders] = useState<BuilderNetworkItem[]>([]);
  const [pulse, setPulse] = useState<PlatformPulse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuilder, setSelectedBuilder] = useState<BuilderNetworkItem | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const fetchBuilders = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const data = await buildersNetworkApi.getBuilders({ search, limit: 50 });
      setBuilders(data.builders);
      setPulse(data.pulse);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load builders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuilders();
  }, [fetchBuilders]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchBuilders(value || undefined);
    }, 400);
  };

  const formatLastSeen = (lastSeen: string | null, isOnline: boolean) => {
    if (isOnline) return 'online';
    if (!lastSeen) return '';
    const diff = Date.now() - new Date(lastSeen).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg key={i} className={`w-3 h-3 ${i <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const getFomoLine = (builder: BuilderNetworkItem) => {
    if (builder.agentInterestCount > 0) {
      return { icon: '🔥', text: `${builder.agentInterestCount} agents interested this month`, color: 'text-orange-600' };
    }
    if (builder.newProjectsThisWeek > 0) {
      return { icon: '⚡', text: `Listed ${builder.newProjectsThisWeek} new project${builder.newProjectsThisWeek > 1 ? 's' : ''} this week`, color: 'text-blue-600' };
    }
    if (builder.dealsClosedCount > 0) {
      return { icon: '🤝', text: `${builder.dealsClosedCount} deal${builder.dealsClosedCount > 1 ? 's' : ''} closed`, color: 'text-green-600' };
    }
    if (builder.projectCount > 0) {
      return { icon: '🏗️', text: `${builder.projectCount} project${builder.projectCount > 1 ? 's' : ''} listed`, color: 'text-[#57534E]' };
    }
    return { icon: '👋', text: 'New on platform', color: 'text-gray-400' };
  };

  return (
    <div className="h-[calc(100vh-0px)] lg:h-screen flex bg-[#FAF7F2]">
      {/* Left Panel — Builder List */}
      <div className={`w-full sm:w-[420px] flex flex-col bg-white border-r border-[#E7E5E4] ${selectedBuilder ? 'hidden sm:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#E7E5E4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'B'}
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#2A2A2A] font-serif">Builders Network</h1>
              <p className="text-[11px] text-[#57534E]">{pulse?.onlineNow || 0} builders online now</p>
            </div>
          </div>
        </div>

        {/* Platform Pulse Stats */}
        {pulse && (
          <div className="px-3 py-2.5 bg-[#FAF7F2] border-b border-[#E7E5E4]">
            <div className="grid grid-cols-4 gap-1">
              <div className="text-center py-1.5 bg-white rounded-lg">
                <p className="text-sm font-bold text-emerald-600">{pulse.onlineNow}</p>
                <p className="text-[9px] text-[#57534E]">Online</p>
              </div>
              <div className="text-center py-1.5 bg-white rounded-lg">
                <p className="text-sm font-bold text-amber-600">{pulse.activeLeadsToday}</p>
                <p className="text-[9px] text-[#57534E]">Leads Today</p>
              </div>
              <div className="text-center py-1.5 bg-white rounded-lg">
                <p className="text-sm font-bold text-blue-600">{pulse.newProjectsToday}</p>
                <p className="text-[9px] text-[#57534E]">New Projects</p>
              </div>
              <div className="text-center py-1.5 bg-white rounded-lg">
                <p className="text-sm font-bold text-green-600">{pulse.dealsClosedToday}</p>
                <p className="text-[9px] text-[#57534E]">Deals Today</p>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#57534E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search builders..."
              className="w-full pl-10 pr-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm text-[#2A2A2A] placeholder-[#57534E] focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
            />
          </div>
        </div>

        {/* Builder List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : builders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#57534E]">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p className="text-sm">No builders found</p>
            </div>
          ) : (
            builders.map(builder => {
              const fomo = getFomoLine(builder);
              const lastSeenText = formatLastSeen(builder.lastSeen, builder.isOnline);
              return (
                <div
                  key={builder._id}
                  onClick={() => setSelectedBuilder(builder)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAF7F2] transition-colors border-b border-[#E7E5E4]/50 ${selectedBuilder?._id === builder._id ? 'bg-[#FAF7F2]' : ''}`}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {builder.businessLogoUrl ? (
                      <img src={builder.businessLogoUrl} alt={builder.name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-semibold text-lg">
                        {builder.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Online indicator */}
                    {builder.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="text-[15px] font-medium text-[#2A2A2A] truncate">
                          {builder.companyName || builder.name}
                        </h3>
                        {builder.isVerified && (
                          <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-[11px] flex-shrink-0 ${builder.isOnline ? 'text-emerald-500 font-medium' : 'text-[#57534E]'}`}>
                        {lastSeenText}
                      </span>
                    </div>

                    {/* Subtitle line 1: Location + Projects */}
                    <div className="flex items-center gap-1 mt-0.5">
                      {builder.businessCity && (
                        <span className="text-[13px] text-[#57534E] truncate">
                          {builder.businessCity}
                          {builder.projectLocations.length > 0 && ` · ${builder.projectLocations[0]}`}
                        </span>
                      )}
                      {!builder.businessCity && builder.projectLocations.length > 0 && (
                        <span className="text-[13px] text-[#57534E] truncate">
                          {builder.projectLocations.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* Subtitle line 2: FOMO signal */}
                    <p className={`text-[12px] mt-0.5 truncate ${fomo.color}`}>
                      {fomo.icon} {fomo.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Builder Profile Card / Empty State */}
      <div className={`flex-1 flex flex-col ${selectedBuilder ? 'flex' : 'hidden sm:flex'}`}>
        {selectedBuilder ? (
          <BuilderProfilePanel
            builder={selectedBuilder}
            onBack={() => setSelectedBuilder(null)}
            renderStars={renderStars}
            formatLastSeen={formatLastSeen}
          />
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF7F2]">
            <div className="w-[320px] text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#B45309]/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#2A2A2A] font-serif mb-2">Builders Network</h2>
              <p className="text-sm text-[#57534E] leading-relaxed">
                See who&apos;s active on the platform. Tap on a builder to view their profile, projects, and activity.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// BUILDER PROFILE PANEL (Direction A — View Only, Light Theme)
// ═══════════════════════════════════════════════════════════

function BuilderProfilePanel({ builder, onBack, renderStars, formatLastSeen }: {
  builder: BuilderNetworkItem;
  onBack: () => void;
  renderStars: (rating: number) => React.ReactNode;
  formatLastSeen: (lastSeen: string | null, isOnline: boolean) => string;
}) {
  return (
    <div className="flex-1 flex flex-col bg-[#FAF7F2]">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-[#E7E5E4] flex items-center gap-3">
        <button onClick={onBack} className="sm:hidden p-1 text-[#57534E] hover:text-[#2A2A2A]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="relative">
          {builder.businessLogoUrl ? (
            <img src={builder.businessLogoUrl} alt={builder.name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-semibold">
              {builder.name.charAt(0).toUpperCase()}
            </div>
          )}
          {builder.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-[#2A2A2A] truncate">{builder.companyName || builder.name}</h2>
            {builder.isVerified && (
              <svg className="w-4 h-4 flex-shrink-0 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            )}
          </div>
          <p className="text-[12px] text-[#57534E]">
            {builder.isOnline ? 'online' : formatLastSeen(builder.lastSeen, false)}
          </p>
        </div>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-lg mx-auto space-y-5">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-[#E7E5E4] shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {builder.businessLogoUrl ? (
                <img src={builder.businessLogoUrl} alt={builder.name} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-2xl">
                  {builder.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#2A2A2A]">{builder.companyName || builder.name}</h3>
                  {builder.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-medium rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                {builder.companyName && (
                  <p className="text-[13px] text-[#57534E] mt-0.5">{builder.name}</p>
                )}
                {/* Rating */}
                {builder.rating > 0 && (
                  <div className="flex items-center gap-2 mt-1.5">
                    {renderStars(builder.rating)}
                    <span className="text-[11px] text-[#57534E]">{builder.rating.toFixed(1)} ({builder.ratingCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {builder.businessCity && (
              <div className="flex items-center gap-2 text-[13px] text-[#57534E] mb-3">
                <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{builder.businessCity}</span>
                {builder.projectLocations.length > 0 && (
                  <span>· {builder.projectLocations.join(', ')}</span>
                )}
              </div>
            )}

            {/* Joined */}
            <div className="flex items-center gap-2 text-[12px] text-[#57534E]">
              <svg className="w-4 h-4 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Joined {new Date(builder.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Activity Stats */}
          <div className="bg-white rounded-2xl p-5 border border-[#E7E5E4] shadow-sm">
            <h4 className="text-[13px] font-semibold text-[#57534E] uppercase tracking-wide mb-4">Activity</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAF7F2] rounded-xl p-3 text-center border border-[#E7E5E4]">
                <p className="text-xl font-bold text-[#2A2A2A]">{builder.projectCount}</p>
                <p className="text-[11px] text-[#57534E] mt-0.5">Projects</p>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-3 text-center border border-[#E7E5E4]">
                <p className="text-xl font-bold text-amber-600">{builder.agentInterestCount}</p>
                <p className="text-[11px] text-[#57534E] mt-0.5">Agent Interest</p>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-3 text-center border border-[#E7E5E4]">
                <p className="text-xl font-bold text-emerald-600">{builder.dealsClosedCount}</p>
                <p className="text-[11px] text-[#57534E] mt-0.5">Deals Closed</p>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-3 text-center border border-[#E7E5E4]">
                <p className="text-xl font-bold text-blue-600">{builder.newProjectsThisWeek}</p>
                <p className="text-[11px] text-[#57534E] mt-0.5">New This Week</p>
              </div>
            </div>
          </div>

          {/* FOMO Banner */}
          {builder.agentInterestCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-[#B45309]/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#B45309]/10 flex items-center justify-center">
                  <span className="text-lg">🔥</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#B45309]">High Demand Builder</p>
                  <p className="text-[12px] text-[#57534E]">{builder.agentInterestCount} agents showed interest in their projects this month</p>
                </div>
              </div>
            </div>
          )}

          {/* Chat CTA — Direction B placeholder (disabled for now) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E7E5E4] opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FAF7F2] flex items-center justify-center border border-[#E7E5E4]">
                <svg className="w-5 h-5 text-[#57534E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-[#57534E]">Direct messaging coming soon</p>
                <p className="text-[11px] text-gray-400">You&apos;ll be able to message builders directly</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ADMIN/AGENT CHAT VIEW — Original 1:1 messaging
// ═══════════════════════════════════════════════════════════

const QUALIFICATION_QUESTIONS = [
  { key: 'reach', question: 'What is your market reach?', options: ['Low (< 50 clients)', 'Average (50–200 clients)', 'High (200+ clients)'] },
  { key: 'experience', question: 'Years of experience in real estate?', options: ['0–2 years', '2–5 years', '5–10 years', '10+ years'] },
  { key: 'specialization', question: 'Primary domain?', options: ['Residential', 'Commercial', 'Plots/Land', 'Mixed'] },
  { key: 'deals_monthly', question: 'Average deals per month?', options: ['1–3', '4–10', '10–25', '25+'] },
];

function AdminChatView() {
  const { user } = useAuth();
  const socket = useSocket();
  const searchParams = useSearchParams();
  const partnerIdUrl = searchParams.get('partnerId');
  const projectIdUrl = searchParams.get('projectId');
  const [hasProcessedUrlId, setHasProcessedUrlId] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const [showQualification, setShowQualification] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [qualificationAnswers, setQualificationAnswers] = useState<Record<string, string>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load sessions
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await chatApi.getSessions();
      setSessions(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Handle direct partner chat from URL params
  useEffect(() => {
    if (partnerIdUrl && sessions.length > 0 && !hasProcessedUrlId && !loading) {
      const existing = sessions.find(s =>
        s.participants.some(p => p._id === partnerIdUrl) &&
        (!projectIdUrl || s.project?._id === projectIdUrl)
      );

      if (existing) {
        setActiveSession(existing);
        setHasProcessedUrlId(true);
      } else {
        const initNewChatFromUrl = async () => {
          try {
            const data = await chatApi.getContacts();
            setContacts(data);
            const target = data.find((c: any) => c._id === partnerIdUrl);
            if (target) {
              setSelectedPartner(target);
              setShowQualification(true);
            }
            setHasProcessedUrlId(true);
          } catch (err) {
            console.error('Err starting chat from URL:', err);
            setHasProcessedUrlId(true);
          }
        };
        initNewChatFromUrl();
      }
    } else if (!partnerIdUrl) {
      setHasProcessedUrlId(true);
    }
  }, [partnerIdUrl, sessions, projectIdUrl, hasProcessedUrlId, loading]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSession) return;

    const loadMessages = async () => {
      try {
        const msgs = await chatApi.getMessages(activeSession._id);
        setMessages(msgs.reverse());
        socket.joinChat(activeSession._id);
        socket.markRead(activeSession._id);
      } catch (err: any) {
        toast.error('Failed to load messages');
      }
    };

    loadMessages();

    return () => {
      if (activeSession) {
        socket.leaveChat(activeSession._id);
      }
    };
  }, [activeSession?._id]);

  // Listen for incoming messages
  useEffect(() => {
    const cleanup = socket.onMessage((msg: ChatMsg) => {
      if (msg.session === activeSession?._id) {
        setMessages(prev => [...prev, msg]);
        socket.markRead(activeSession._id);
      }
      setSessions(prev => prev.map(s => {
        if (s._id === msg.session) {
          return {
            ...s,
            lastMessage: { content: msg.content, sender: msg.sender._id, timestamp: msg.createdAt }
          };
        }
        return s;
      }));
    });
    return cleanup;
  }, [activeSession?._id, socket.onMessage]);

  // Listen for typing
  useEffect(() => {
    const cleanup = socket.onTyping((data) => {
      if (data.isTyping) {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.name }));
      } else {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
      }
    });
    return cleanup;
  }, [socket.onTyping]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeSession) return;
    socket.sendMessage({
      sessionId: activeSession._id,
      content: newMessage.trim(),
    });
    setNewMessage('');
    socket.sendTyping(activeSession._id, false);
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (!activeSession) return;

    socket.sendTyping(activeSession._id, true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.sendTyping(activeSession._id, false);
    }, 2000);
  };

  const handleStartChat = async () => {
    if (!selectedPartner) return;
    const unanswered = QUALIFICATION_QUESTIONS.filter(q => !qualificationAnswers[q.key]);
    if (unanswered.length > 0) {
      toast.error('Please answer all questions');
      return;
    }

    try {
      const session = await chatApi.qualifyAndConnect({
        partnerId: selectedPartner._id,
        projectId: projectIdUrl || undefined,
        qualificationData: qualificationAnswers,
      });
      setSessions(prev => [session, ...prev]);
      setActiveSession(session);
      setShowQualification(false);
      setShowContacts(false);
      setSelectedPartner(null);
      setQualificationAnswers({});
      toast.success('Chat started!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start chat');
    }
  };

  const loadContacts = async () => {
    try {
      const data = await chatApi.getContacts();
      setContacts(data);
      setShowContacts(true);
    } catch (err: any) {
      toast.error('Failed to load contacts');
    }
  };

  const getPartnerName = (session: ChatSession) => {
    const partner = session.participants?.find(p => p._id !== user?.id && p._id !== user?._id);
    return partner?.name || 'Unknown';
  };

  const getPartnerRole = (session: ChatSession) => {
    const partner = session.participants?.find(p => p._id !== user?.id && p._id !== user?._id);
    return partner?.role || '';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const filteredSessions = sessions.filter(s => {
    if (!searchTerm) return true;
    const name = getPartnerName(s).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-[calc(100vh-0px)] lg:h-screen flex bg-[#FAF7F2]">
      {/* Left Sidebar — Session List */}
      <div className={`w-full sm:w-80 lg:w-96 bg-white border-r border-[#E7E5E4] flex flex-col ${activeSession ? 'hidden sm:flex' : 'flex'}`}>
        <div className="p-4 border-b border-[#E7E5E4]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#2A2A2A] font-serif">Chat</h1>
            <button onClick={loadContacts} className="p-2 bg-[#B45309] text-white rounded-xl hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20" title="New Chat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </button>
          </div>
          <input type="text" placeholder="Search conversations..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20" />
        </div>

        {/* Sessions */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No conversations yet</p>
              <button onClick={loadContacts} className="mt-2 text-[#B45309] text-sm font-medium hover:underline">Start a chat</button>
            </div>
          ) : (
            filteredSessions.map(session => (
              <div
                key={session._id}
                onClick={() => setActiveSession(session)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FAF7F2] transition-colors border-b border-[#E7E5E4]/50 ${activeSession?._id === session._id ? 'bg-[#FAF7F2]' : ''}`}
              >
                <div className="w-11 h-11 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-sm">
                  {getInitials(getPartnerName(session))}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#2A2A2A] truncate">{getPartnerName(session)}</h3>
                    {session.lastMessage?.timestamp && (
                      <span className="text-[10px] text-gray-400">{formatTime(session.lastMessage.timestamp)}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-xs text-gray-400 truncate">{session.lastMessage?.content || 'No messages yet'}</p>
                    <span className="text-[10px] bg-[#B45309]/10 text-[#B45309] px-1.5 py-0.5 rounded-full capitalize">{getPartnerRole(session)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — Messages */}
      <div className={`flex-1 flex flex-col ${activeSession ? 'flex' : 'hidden sm:flex'}`}>
        {activeSession ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white border-b border-[#E7E5E4] flex items-center gap-3">
              <button onClick={() => setActiveSession(null)} className="sm:hidden p-1 text-gray-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="w-10 h-10 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-sm">
                {getInitials(getPartnerName(activeSession))}
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#2A2A2A]">{getPartnerName(activeSession)}</h2>
                {Object.keys(typingUsers).length > 0 ? (
                  <p className="text-[11px] text-emerald-500">typing...</p>
                ) : (
                  <p className="text-[11px] text-gray-400 capitalize">{getPartnerRole(activeSession)}</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#FAF7F2] space-y-3">
              {messages.map(msg => {
                const isMe = msg.sender._id === user?.id || msg.sender._id === user?._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-[#B45309] text-white rounded-br-md' : 'bg-white text-[#2A2A2A] border border-[#E7E5E4] rounded-bl-md shadow-sm'}`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'} text-right`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 bg-white border-t border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                />
                <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="p-2.5 bg-[#B45309] text-white rounded-xl hover:bg-[#92400E] transition-colors disabled:opacity-40 shadow-lg shadow-[#B45309]/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#FAF7F2]">
            <div className="w-16 h-16 mb-4 rounded-full bg-[#B45309]/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">Select a conversation to start chatting</p>
          </div>
        )}
      </div>

      {/* Contacts Modal */}
      {showContacts && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setShowContacts(false); setShowQualification(false); setSelectedPartner(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {!showQualification ? (
              <>
                <div className="p-4 border-b border-[#E7E5E4]">
                  <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">New Chat</h2>
                  <p className="text-xs text-gray-400">Select a contact to start chatting</p>
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                  {contacts.map(contact => (
                    <div key={contact._id} onClick={() => { setSelectedPartner(contact); setShowQualification(true); }} className="flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F2] cursor-pointer border-b border-[#E7E5E4]/50">
                      <div className="w-10 h-10 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-sm">
                        {contact.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#2A2A2A]">{contact.name}</p>
                        <p className="text-[11px] text-gray-400 capitalize">{contact.role} · {contact.companyName || contact.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-[#E7E5E4]">
                  <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Quick Qualification</h2>
                  <p className="text-xs text-gray-400">Answer these before connecting with {selectedPartner?.name}</p>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                  {QUALIFICATION_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <p className="text-sm font-medium text-[#2A2A2A] mb-1.5">{q.question}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt => (
                          <button key={opt} onClick={() => setQualificationAnswers(p => ({ ...p, [q.key]: opt }))} className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${qualificationAnswers[q.key] === opt ? 'bg-[#B45309] text-white border-[#B45309]' : 'bg-white text-gray-600 border-[#E7E5E4] hover:border-[#B45309]'}`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={handleStartChat} className="w-full py-2.5 bg-[#B45309] text-white font-bold rounded-xl hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20">
                    Start Chat
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
