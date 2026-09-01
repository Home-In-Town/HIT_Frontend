'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { captainTeamApi, CaptainTeamState, CaptainPartner } from '@/lib/api';

interface Props {
  onClose: () => void;
  // Called after any change so the parent can refresh the assign dropdown / leads
  onChanged?: () => void;
}

export default function CaptainTeamPanel({ onClose, onChanged }: Props) {
  const [team, setTeam] = useState<CaptainTeamState>({ partners: [], incoming: [], outgoing: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'team' | 'find'>('team');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CaptainPartner[]>([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await captainTeamApi.getMyTeam());
    } catch {
      // leave empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTeam(); }, [loadTeam]);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      setResults(await captainTeamApi.listCaptains(q));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Load captain list when switching to Find tab / on search change (debounced)
  useEffect(() => {
    if (tab !== 'find') return;
    const t = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(t);
  }, [tab, search, runSearch]);

  const act = async (action: 'request' | 'accept' | 'decline' | 'remove', id: string) => {
    setBusyId(id);
    try {
      await captainTeamApi[action](id);
      await loadTeam();
      if (tab === 'find') await runSearch(search);
      onChanged?.();
    } catch {
      // ignore — state reload will reflect reality
    } finally {
      setBusyId(null);
    }
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const Avatar = ({ name }: { name: string }) => (
    <div className="w-9 h-9 rounded-full bg-[#B45309]/10 flex items-center justify-center text-xs font-bold text-[#B45309] shrink-0">
      {initials(name)}
    </div>
  );

  const meta = (c: CaptainPartner) => [c.companyName, c.businessCity].filter(Boolean).join(' · ') || c.phone || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-2xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#E7E5E4]">
          <div>
            <h3 className="text-base font-bold text-[#2A2A2A] font-serif">Captain Team-up</h3>
            <p className="text-[10px] text-[#A8A29E] mt-0.5">Partner with other captains to share &amp; assign leads</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FAF7F2] text-[#A8A29E] hover:text-[#2A2A2A] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-5 pt-4">
          {(['team', 'find'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? 'bg-[#B45309] text-white' : 'bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4] hover:border-[#B45309]/40'}`}
            >
              {t === 'team'
                ? `My Team${team.partners.length ? ` (${team.partners.length})` : ''}`
                : 'Find Captains'}
              {t === 'team' && team.incoming.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[9px]">{team.incoming.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto">
          {tab === 'team' ? (
            <div className="space-y-5">
              {loading && (
                <div className="py-8 text-center"><span className="inline-block w-5 h-5 border-2 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" /></div>
              )}

              {!loading && (
                <>
                  {/* Incoming requests */}
                  {team.incoming.length > 0 && (
                    <section>
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Requests received</p>
                      <div className="space-y-2">
                        {team.incoming.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                            <Avatar name={c.name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#2A2A2A] truncate">{c.name}</p>
                              <p className="text-[11px] text-[#A8A29E] truncate">{meta(c)}</p>
                            </div>
                            <button disabled={busyId === c.id} onClick={() => act('accept', c.id)} className="px-3 py-1.5 rounded-lg bg-[#B45309] text-white text-[11px] font-bold hover:bg-[#92400E] disabled:opacity-50 transition-all">Accept</button>
                            <button disabled={busyId === c.id} onClick={() => act('decline', c.id)} className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-[11px] font-bold text-[#57534E] hover:bg-white disabled:opacity-50 transition-all">Decline</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Sent requests */}
                  {team.outgoing.length > 0 && (
                    <section>
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Requests sent</p>
                      <div className="space-y-2">
                        {team.outgoing.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                            <Avatar name={c.name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#2A2A2A] truncate">{c.name}</p>
                              <p className="text-[11px] text-[#A8A29E] truncate">{meta(c)}</p>
                            </div>
                            <span className="text-[10px] font-bold text-amber-600">Pending</span>
                            <button disabled={busyId === c.id} onClick={() => act('decline', c.id)} className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-[11px] font-bold text-[#57534E] hover:bg-white disabled:opacity-50 transition-all">Cancel</button>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Partners */}
                  <section>
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Your partner captains</p>
                    {team.partners.length === 0 ? (
                      <p className="text-xs text-[#A8A29E] italic py-4 text-center">No partners yet. Use “Find Captains” to team up.</p>
                    ) : (
                      <div className="space-y-2">
                        {team.partners.map((c) => (
                          <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E7E5E4]">
                            <Avatar name={c.name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-[#2A2A2A] truncate">{c.name}</p>
                              <p className="text-[11px] text-[#A8A29E] truncate">{meta(c)}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">Teamed up</span>
                            <button disabled={busyId === c.id} onClick={() => act('remove', c.id)} className="px-3 py-1.5 rounded-lg border border-[#E7E5E4] text-[11px] font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all">Remove</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          ) : (
            <div>
              {/* Search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search captains by name, company or city..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm placeholder:text-[#A8A29E] focus:outline-none focus:border-[#B45309]/40 focus:ring-1 focus:ring-[#B45309]/20 transition-all"
                />
              </div>

              {searching ? (
                <div className="py-8 text-center"><span className="inline-block w-5 h-5 border-2 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" /></div>
              ) : results.length === 0 ? (
                <p className="text-xs text-[#A8A29E] italic py-6 text-center">No captains found.</p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                  {results.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                      <Avatar name={c.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#2A2A2A] truncate">{c.name}</p>
                        <p className="text-[11px] text-[#A8A29E] truncate">{meta(c)}</p>
                      </div>
                      {c.status === 'partner' && <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">Teamed up</span>}
                      {c.status === 'outgoing' && <span className="text-[10px] font-bold text-amber-600">Requested</span>}
                      {c.status === 'incoming' && (
                        <button disabled={busyId === c.id} onClick={() => act('accept', c.id)} className="px-3 py-1.5 rounded-lg bg-[#B45309] text-white text-[11px] font-bold hover:bg-[#92400E] disabled:opacity-50 transition-all">Accept</button>
                      )}
                      {(!c.status || c.status === 'none') && (
                        <button disabled={busyId === c.id} onClick={() => act('request', c.id)} className="px-3 py-1.5 rounded-lg bg-[#B45309] text-white text-[11px] font-bold hover:bg-[#92400E] disabled:opacity-50 transition-all">Team up</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
