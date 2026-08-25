'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { groupChatApi, leadMatchingApi, GroupRoom, GroupMessage as GMsg, RequirementCard, InventoryCard, MatchResult } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';
import LeadsTab from './LeadsTab';
import StatsTab from './StatsTab';
import LeadConfirmModal from './LeadConfirmModal';

type ActiveTab = 'rooms' | 'deals' | 'leads' | 'stats';
type PostMode = 'text' | 'inventory' | 'requirement';

export default function GroupChatPage() {
  const { user } = useAuth();
  const socket = useSocket();

  // Room state
  const [myRooms, setMyRooms] = useState<GroupRoom[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<GroupRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<GroupRoom | null>(null);
  const [messages, setMessages] = useState<GMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('rooms');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showRoomMenu, setShowRoomMenu] = useState(false);

  // Message input state
  const [postMode, setPostMode] = useState<PostMode>('text');
  const [textMsg, setTextMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Requirement card form
  const [reqForm, setReqForm] = useState<RequirementCard>({
    bhkType: '2BHK', budget: 0, area: '', city: '',
    possessionNeeded: 'immediate', loanRequired: false,
    urgency: 'normal', clientNotes: ''
  });

  // Inventory card form
  const [invForm, setInvForm] = useState<InventoryCard>({
    bhkOptions: [], priceRange: { min: 0, max: 0 }, area: '', city: '',
    possessionStatus: 'ready', bankLoanAvailable: false,
    commissionPercent: 2, description: ''
  });

  // Create room form
  const [roomForm, setRoomForm] = useState({
    name: '', roomType: 'area' as 'project' | 'area',
    city: '', location: '', description: ''
  });

  // Lead confirmation modal state
  const [leadModal, setLeadModal] = useState<{
    extraction: { intent: 'requirement' | 'inventory'; confidence: number; params: any; extractedFrom: string };
    messageId?: string;
  } | null>(null);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await groupChatApi.getRooms({ search: searchTerm || undefined });
      setMyRooms(data.myRooms);
      setDiscoverRooms(data.discoverRooms);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Hide the layout's mobile header on this page (full-screen chat experience)
  useEffect(() => {
    const layoutHeader = document.querySelector('header.lg\\:hidden') as HTMLElement | null;
    if (layoutHeader) layoutHeader.style.display = 'none';
    return () => {
      if (layoutHeader) layoutHeader.style.display = '';
    };
  }, []);

  // Load messages when room changes
  useEffect(() => {
    setShowRoomMenu(false);
    if (!activeRoom) return;
    const load = async () => {
      try {
        const msgs = await groupChatApi.getMessages(activeRoom._id);
        setMessages(msgs);
        socket.joinGroup(activeRoom._id);
      } catch (err: any) {
        toast.error('Failed to load messages');
      }
    };
    load();
    return () => { if (activeRoom) socket.leaveGroup(activeRoom._id); };
  }, [activeRoom?._id]);

  // Listen for real-time group messages
  useEffect(() => {
    const cleanup = socket.onGroupMessage((msg: GMsg) => {
      if (msg.room === activeRoom?._id || (msg as any).roomId === activeRoom?._id) {
        setMessages(prev => [...prev, msg]);
      }
    });
    return cleanup;
  }, [activeRoom?._id, socket.onGroupMessage]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join a room
  const handleJoinRoom = async (roomId: string) => {
    try {
      const room = await groupChatApi.joinRoom(roomId);
      setMyRooms(prev => [...prev, room]);
      setDiscoverRooms(prev => prev.filter(r => r._id !== roomId));
      setActiveRoom(room);
      toast.success('Joined room!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join');
    }
  };

  // Create a room
  const handleCreateRoom = async () => {
    if (!roomForm.name || !roomForm.city || !roomForm.location) {
      toast.error('Please fill name, city and location');
      return;
    }
    try {
      const room = await groupChatApi.createRoom({
        name: roomForm.name,
        roomType: roomForm.roomType,
        area: { city: roomForm.city, location: roomForm.location },
        description: roomForm.description
      });
      setMyRooms(prev => [room, ...prev]);
      setShowCreateRoom(false);
      setActiveRoom(room);
      setRoomForm({ name: '', roomType: 'area', city: '', location: '', description: '' });
      toast.success('Room created!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create room');
    }
  };

  // Send text message
  const handleSendText = async () => {
    if (!textMsg.trim() || !activeRoom) return;
    try {
      const message = await groupChatApi.postMessage(activeRoom._id, { messageType: 'text', content: textMsg.trim() });
      setTextMsg('');

      // After message sent, try NLP extraction for confirmation modal
      try {
        const extraction = await leadMatchingApi.testExtract(textMsg.trim());
        if (extraction?.detected) {
          setLeadModal({ extraction, messageId: message._id });
        }
      } catch {
        // Extraction failure is non-blocking — message already sent
      }
    } catch (err: any) { toast.error('Failed to send'); }
  };

  // Post requirement card (Agent)
  const handlePostRequirement = async () => {
    if (!activeRoom || !reqForm.budget || !reqForm.area) {
      toast.error('Budget and Area are required'); return;
    }
    try {
      const message = await groupChatApi.postMessage(activeRoom._id, {
        messageType: 'requirement_card', requirementCard: reqForm
      });

      // Build extraction from the structured form and show modal
      const budgetInLakhs = reqForm.budget > 10000 ? Math.round(reqForm.budget / 100000) : reqForm.budget;
      setLeadModal({
        extraction: {
          intent: 'requirement',
          confidence: 1.0,
          extractedFrom: `${reqForm.bhkType} ${reqForm.area} ${reqForm.city} ${budgetInLakhs}L ${reqForm.possessionNeeded}`,
          params: {
            bhkType: reqForm.bhkType,
            budget: budgetInLakhs,
            budgetMax: null,
            location: reqForm.area,
            locationRaw: reqForm.area,
            locationCanonical: null,
            locationConfidence: 0,
            city: reqForm.city,
            propertyType: 'flat',
            possessionNeeded: reqForm.possessionNeeded,
            loanRequired: reqForm.loanRequired,
            urgency: reqForm.urgency,
          }
        },
        messageId: message._id,
      });

      setReqForm({ bhkType: '2BHK', budget: 0, area: '', city: '', possessionNeeded: 'immediate', loanRequired: false, urgency: 'normal', clientNotes: '' });
      setPostMode('text');
    } catch (err: any) { toast.error(err.message || 'Failed to post'); }
  };

  // Post inventory card (Builder)
  const handlePostInventory = async () => {
    if (!activeRoom || !invForm.area || !invForm.priceRange.min) {
      toast.error('Area and Price are required'); return;
    }
    try {
      const message = await groupChatApi.postMessage(activeRoom._id, {
        messageType: 'inventory_card', inventoryCard: invForm
      });

      // Build extraction from structured form and show modal
      const invBudgetInLakhs = invForm.priceRange.min > 10000 ? Math.round(invForm.priceRange.min / 100000) : invForm.priceRange.min;
      const invBudgetMaxInLakhs = invForm.priceRange.max > 10000 ? Math.round(invForm.priceRange.max / 100000) : (invForm.priceRange.max || null);
      setLeadModal({
        extraction: {
          intent: 'inventory',
          confidence: 1.0,
          extractedFrom: `I have ${invForm.bhkOptions?.join('/')} flat ${invForm.area} ${invForm.city} ${invBudgetInLakhs}L`,
          params: {
            bhkType: invForm.bhkOptions?.[0] || null,
            budget: invBudgetInLakhs,
            budgetMax: invBudgetMaxInLakhs,
            location: invForm.area,
            locationRaw: invForm.area,
            locationCanonical: null,
            locationConfidence: 0,
            city: invForm.city,
            propertyType: 'flat',
            possessionNeeded: invForm.possessionStatus === 'ready' ? 'immediate' : null,
            loanRequired: invForm.bankLoanAvailable,
            urgency: 'normal',
          }
        },
        messageId: message._id,
      });

      setInvForm({ bhkOptions: [], priceRange: { min: 0, max: 0 }, area: '', city: '', possessionStatus: 'ready', bankLoanAvailable: false, commissionPercent: 2, description: '' });
      setPostMode('text');
    } catch (err: any) { toast.error(err.message || 'Failed to post'); }
  };

  // Interested button click
  const handleInterested = async (projectId: string, messageId: string) => {
    try {
      const result = await groupChatApi.showInterest({ projectId, messageId, roomId: activeRoom?._id });
      toast.success(result.message || 'Builder notified! Deal room created.');
    } catch (err: any) {
      if (err.message?.includes('already exists')) toast.error('Deal already exists for this project');
      else toast.error(err.message || 'Failed');
    }
  };

  const formatPrice = (val: number) => {
    if (!val) return '—';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(0)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="h-[100dvh] lg:h-screen flex bg-[#FAF7F2] -mt-16 lg:mt-0">
      {/* Left Sidebar — Room List */}
      <div className={`w-full sm:w-80 lg:w-96 bg-white border-r border-[#E7E5E4] flex flex-col ${activeRoom ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-3 py-2.5 sm:p-4 bg-[#075E54]">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <a href="/dashboard" className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </a>
              <h1 className="text-lg sm:text-xl font-bold text-white font-serif">Groups</h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <a href="/dashboard/lead-matching?tab=chats" className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all">
                Chat
              </a>
              <span className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-[11px] font-bold rounded-full bg-white text-[#075E54]">
                Groups
              </span>
              <button onClick={() => setShowCreateRoom(true)} className="p-1.5 sm:p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors" title="Create Room">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </button>
            </div>
          </div>

          {/* Tab buttons — admin only (Chats / Leads / Stats) */}
          {user?.role === 'admin' && (
            <div className="flex gap-0.5 sm:gap-1 mb-2 sm:mb-3 p-0.5 sm:p-1 bg-white/10 rounded-lg sm:rounded-xl">
              <button onClick={() => setActiveTab('rooms')} className={`flex-1 px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md sm:rounded-lg transition-all ${activeTab === 'rooms' ? 'bg-white text-[#075E54] shadow-sm' : 'text-white/70 hover:text-white'}`}>
                Chats
              </button>
              <button onClick={() => setActiveTab('leads')} className={`flex-1 px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md sm:rounded-lg transition-all ${activeTab === 'leads' ? 'bg-white text-[#075E54] shadow-sm' : 'text-white/70 hover:text-white'}`}>
                Leads
              </button>
              <button onClick={() => setActiveTab('stats')} className={`flex-1 px-2 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md sm:rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white text-[#075E54] shadow-sm' : 'text-white/70 hover:text-white'}`}>
                Stats
              </button>
            </div>
          )}

          {activeTab === 'rooms' && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search groups..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-1.5 sm:py-2 bg-white/10 border border-white/20 rounded-full text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30" />
          </div>
          )}
        </div>

        {/* Tab content */}
        {activeTab === 'leads' && user?.role === 'admin' && (
          <LeadsTab />
        )}

        {activeTab === 'stats' && user?.role === 'admin' && (
          <StatsTab />
        )}

        {activeTab === 'rooms' && (
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <>
              {myRooms.length > 0 && (
                <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">My Groups</div>
              )}
              {[...myRooms].sort((a, b) => {
                if (a.isUniversal) return -1;
                if (b.isUniversal) return 1;
                return 0;
              }).map(room => (
                <button key={room._id} onClick={() => setActiveRoom(room)} className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-[#FAF7F2] active:bg-[#F0EDE8] transition-colors border-b border-gray-50 text-left ${activeRoom?._id === room._id ? 'bg-[#FAF7F2] border-l-2 border-l-[#B45309]' : ''}`}>
                  <div className={`w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${room.isUniversal ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : room.roomType === 'project' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-[#B45309] to-[#D97706]'}`}>
                    {room.isUniversal ? '🌐' : room.roomType === 'project' ? '🏗️' : '📍'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-[#2A2A2A] truncate">{room.name}</p>
                      {room.isUniversal && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">ALL</span>}
                      {room.isAutoCreated && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">MATCH</span>}
                    </div>
                    <p className="text-[10px] text-gray-400">{room.members?.length || 0} members{room.roomType === 'project' && room.project?.location ? ` · ${room.project.location}` : room.area?.city ? ` · ${room.area.city}` : ''}</p>
                  </div>
                </button>
              ))}

              {discoverRooms.length > 0 && (
                <div className="px-3 pt-4 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Discover</div>
              )}
              {discoverRooms.map(room => (
                <div key={room._id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm flex-shrink-0">
                    {room.roomType === 'area' ? '📍' : '🏗️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2A2A2A] truncate">{room.name}</p>
                    <p className="text-[10px] text-gray-400">{room.members?.length || 0} members</p>
                  </div>
                  <button onClick={() => handleJoinRoom(room._id)} className="px-3 py-1 text-xs font-bold text-[#B45309] border border-[#B45309]/30 rounded-lg hover:bg-[#B45309] hover:text-white transition-all">
                    Join
                  </button>
                </div>
              ))}

              {myRooms.length === 0 && discoverRooms.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-gray-400 p-6">
                  <p className="text-sm text-center">No groups yet</p>
                  <button onClick={() => setShowCreateRoom(true)} className="mt-3 text-sm text-[#B45309] font-medium hover:underline">Create first group</button>
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-x-hidden ${!activeRoom ? 'hidden sm:flex' : 'flex'}`}>
        {!activeRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center" style={{ backgroundColor: '#ECE5DD' }}>
            <div className="w-20 h-20 bg-white/80 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
              <svg className="w-10 h-10 text-[#075E54]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <p className="text-sm font-medium text-[#111B21]">Select a group</p>
            <p className="text-xs mt-1 text-[#667781]">Post requirements & get instant matches</p>
          </div>
        ) : (
          <>
            {/* Room Header */}
            <div className="px-2 py-2 sm:px-4 sm:py-2.5 bg-[#075E54] flex items-center gap-2 sm:gap-3">
              <button onClick={() => setActiveRoom(null)} className="p-1 hover:bg-white/10 rounded-lg sm:hidden">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${activeRoom.isUniversal ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : activeRoom.roomType === 'project' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-[#25D366] to-[#128C7E]'}`}>
                {activeRoom.isUniversal ? '🌐' : activeRoom.roomType === 'project' ? '🏗️' : '📍'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-sm font-semibold text-white truncate">{activeRoom.name}</p>
                <p className="text-[9px] sm:text-[10px] text-white/60 truncate">{activeRoom.members?.length || 0} members{activeRoom.area?.city ? ` · ${activeRoom.area.city}` : ''}{activeRoom.project?.location ? ` · ${activeRoom.project.location}` : ''}</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                <span className={`w-2 h-2 rounded-full hidden sm:block ${socket.isConnected ? 'bg-[#25D366]' : 'bg-white/30'}`} />
                <span className="text-[9px] text-white/60 hidden sm:block">{socket.isConnected ? 'Live' : 'Offline'}</span>

                {(() => {
                  const canLeave = activeRoom.canLeave !== false && !activeRoom.isUniversal;
                  const canDelete = !activeRoom.isUniversal && (user?.role === 'admin' || user?.role === 'captain' || activeRoom.createdBy?._id === user?.id || activeRoom.createdBy?._id === (user as any)?._id);
                  if (!canLeave && !canDelete) return null;
                  return (
                    <div className="relative">
                      <button
                        onClick={() => setShowRoomMenu(v => !v)}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                        title="Options"
                      >
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8a2 2 0 100-4 2 2 0 000 4zm0 2a2 2 0 100 4 2 2 0 000-4zm0 6a2 2 0 100 4 2 2 0 000-4z" />
                        </svg>
                      </button>
                      {showRoomMenu && (
                        <>
                          {/* Click-away backdrop */}
                          <div className="fixed inset-0 z-40" onClick={() => setShowRoomMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-50 overflow-hidden">
                            {canLeave && (
                              <button
                                onClick={async () => {
                                  setShowRoomMenu(false);
                                  if (!confirm('Leave this group?')) return;
                                  try { await groupChatApi.leaveRoom(activeRoom._id); toast.success('Left group'); setActiveRoom(null); fetchRooms(); } catch (err: any) { toast.error(err.message || 'Failed'); }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-[#2A2A2A] hover:bg-[#FAF7F2] transition-colors"
                              >
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                Leave group
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={async () => {
                                  setShowRoomMenu(false);
                                  if (!confirm('Delete this group? (Property sold)')) return;
                                  try { await groupChatApi.deleteRoom(activeRoom._id); toast.success('Group deleted'); setActiveRoom(null); fetchRooms(); } catch (err: any) { toast.error(err.message || 'Failed'); }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                Delete group
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Project Details Banner */}
            {activeRoom.roomType === 'project' && activeRoom.project && (
              <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-blue-50 border-b border-blue-100 overflow-hidden">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-blue-800 truncate">{activeRoom.project.projectName}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {activeRoom.project.location && <span className="text-[10px] text-blue-600 truncate max-w-full">📍 {activeRoom.project.location}{activeRoom.project.city ? `, ${activeRoom.project.city}` : ''}</span>}
                      {activeRoom.project.pricing?.startingPrice && <span className="text-[10px] text-blue-600 whitespace-nowrap">💰 ₹{(activeRoom.project.pricing.startingPrice / 100000).toFixed(0)}L+</span>}
                      {activeRoom.project.configuration?.bhkOptions && activeRoom.project.configuration.bhkOptions.length > 0 && <span className="text-[10px] text-blue-600 whitespace-nowrap">🏠 {activeRoom.project.configuration.bhkOptions.join(', ')}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
              {messages.map(msg => (
                <MessageBubble key={msg._id} msg={msg} userId={user?.id || user?._id || ''} onInterested={handleInterested} formatPrice={formatPrice} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="px-2 py-1.5 sm:px-3 sm:py-2 bg-[#F0F2F5]">
              {/* Mode switcher */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 overflow-x-auto scrollbar-hide">
                <button onClick={() => setPostMode('text')} className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-all whitespace-nowrap ${postMode === 'text' ? 'bg-[#075E54] text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Text</button>
                {(user?.role === 'agent' || user?.role === 'admin' || user?.role === 'captain') && (
                  <button onClick={() => setPostMode('requirement')} className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-all whitespace-nowrap ${postMode === 'requirement' ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>🔍 Requirement</button>
                )}
                {(user?.role === 'builder' || user?.role === 'admin' || user?.role === 'captain' || user?.role === 'agent') && (
                  <button onClick={() => setPostMode('inventory')} className={`px-2.5 py-1 text-[10px] sm:text-xs font-bold rounded-full transition-all whitespace-nowrap ${postMode === 'inventory' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>🏠 Inventory</button>
                )}
              </div>

              {postMode === 'text' && (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-1 min-w-0 flex items-center bg-white rounded-full px-3 sm:px-4 py-2 shadow-sm">
                    <input type="text" value={textMsg} onChange={e => setTextMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSendText()} placeholder="Type a message" className="flex-1 min-w-0 text-sm text-[#111B21] placeholder-[#667781] bg-transparent focus:outline-none" />
                  </div>
                  <button onClick={handleSendText} disabled={!textMsg.trim()} className="w-9 h-9 sm:w-10 sm:h-10 bg-[#075E54] text-white rounded-full flex items-center justify-center hover:bg-[#064E46] transition-colors disabled:opacity-40 shadow-sm flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              )}

              {postMode === 'requirement' && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-orange-800">🔍 Post Client Requirement</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={reqForm.bhkType} onChange={e => setReqForm(p => ({...p, bhkType: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                      <option value="1BHK">1 BHK</option><option value="2BHK">2 BHK</option><option value="3BHK">3 BHK</option><option value="4BHK">4 BHK</option><option value="Plot">Plot</option><option value="Shop">Shop</option>
                    </select>
                    <input type="number" placeholder="Budget (Lakhs)" value={reqForm.budget || ''} onChange={e => setReqForm(p => ({...p, budget: Number(e.target.value)}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="text" placeholder="Area (e.g., Manish Nagar)" value={reqForm.area} onChange={e => setReqForm(p => ({...p, area: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="text" placeholder="City" value={reqForm.city} onChange={e => setReqForm(p => ({...p, city: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <select value={reqForm.possessionNeeded} onChange={e => setReqForm(p => ({...p, possessionNeeded: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                      <option value="immediate">Immediate</option><option value="6months">6 Months</option><option value="1year">1 Year</option>
                    </select>
                    <select value={reqForm.urgency} onChange={e => setReqForm(p => ({...p, urgency: e.target.value as any}))} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                      <option value="normal">Normal</option><option value="urgent">Urgent</option><option value="very_urgent">Very Urgent</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={reqForm.loanRequired} onChange={e => setReqForm(p => ({...p, loanRequired: e.target.checked}))} className="rounded" /> Loan Required</label>
                    <input type="text" placeholder="Client notes..." value={reqForm.clientNotes} onChange={e => setReqForm(p => ({...p, clientNotes: e.target.value}))} className="flex-1 px-2 py-1.5 text-xs border rounded-lg" />
                  </div>
                  <button onClick={handlePostRequirement} className="w-full py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 transition-colors">Post & Auto-Match 🚀</button>
                </div>
              )}

              {postMode === 'inventory' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold text-emerald-800">🏠 Post Inventory Card</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="BHK Options (e.g., 2BHK,3BHK)" value={invForm.bhkOptions.join(',')} onChange={e => setInvForm(p => ({...p, bhkOptions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="number" placeholder="Min Price (Lakhs)" value={invForm.priceRange.min || ''} onChange={e => setInvForm(p => ({...p, priceRange: {...p.priceRange, min: Number(e.target.value)}}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="text" placeholder="Area/Location" value={invForm.area} onChange={e => setInvForm(p => ({...p, area: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="number" placeholder="Max Price (Lakhs)" value={invForm.priceRange.max || ''} onChange={e => setInvForm(p => ({...p, priceRange: {...p.priceRange, max: Number(e.target.value)}}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="text" placeholder="City" value={invForm.city} onChange={e => setInvForm(p => ({...p, city: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg" />
                    <select value={invForm.possessionStatus} onChange={e => setInvForm(p => ({...p, possessionStatus: e.target.value}))} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                      <option value="ready">Ready to Move</option><option value="6months">6 Months</option><option value="1year">1 Year</option><option value="2year+">2+ Years</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={invForm.bankLoanAvailable} onChange={e => setInvForm(p => ({...p, bankLoanAvailable: e.target.checked}))} className="rounded" /> Bank Loan</label>
                    <input type="number" placeholder="Commission %" value={invForm.commissionPercent || ''} onChange={e => setInvForm(p => ({...p, commissionPercent: Number(e.target.value)}))} className="w-20 px-2 py-1.5 text-xs border rounded-lg" />
                    <input type="text" placeholder="Description..." value={invForm.description} onChange={e => setInvForm(p => ({...p, description: e.target.value}))} className="flex-1 px-2 py-1.5 text-xs border rounded-lg" />
                  </div>
                  <button onClick={handlePostInventory} className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">Post Inventory 📢</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lead Confirmation Modal */}
      {leadModal && activeRoom && (
        <LeadConfirmModal
          extraction={leadModal.extraction}
          messageId={leadModal.messageId}
          roomId={activeRoom._id}
          onConfirm={({ matchCount, topScore }) => {
            setLeadModal(null);
            if (matchCount > 0) {
              toast.success(`✓ Lead saved — ${matchCount} match${matchCount > 1 ? 'es' : ''} found (${topScore}%)`, { duration: 4000 });
            } else {
              toast.success('✓ Lead saved — No matches yet, will check when new inventory arrives', { duration: 4000 });
            }
          }}
          onDismiss={() => setLeadModal(null)}
        />
      )}

      {/* Create Room Modal */}
      {showCreateRoom && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateRoom(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Create Group Room</h2>
              <p className="text-xs text-gray-400 mt-1">Area-wise or Project-wise group for builders & agents</p>
            </div>
            <div className="p-5 space-y-3">
              <input type="text" placeholder="Room Name (e.g., Manish Nagar Builders)" value={roomForm.name} onChange={e => setRoomForm(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20" />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="City" value={roomForm.city} onChange={e => setRoomForm(p => ({...p, city: e.target.value}))} className="px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20" />
                <input type="text" placeholder="Area/Location" value={roomForm.location} onChange={e => setRoomForm(p => ({...p, location: e.target.value}))} className="px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20" />
              </div>
              <input type="text" placeholder="Description (optional)" value={roomForm.description} onChange={e => setRoomForm(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowCreateRoom(false)} className="flex-1 py-2.5 border border-[#E7E5E4] text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleCreateRoom} className="flex-1 py-2.5 bg-[#B45309] text-white text-sm font-bold rounded-xl hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20">Create Room</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Message Bubble Component
// ═══════════════════════════════════════════════════════════

function MessageBubble({ msg, userId, onInterested, formatPrice }: {
  msg: GMsg; userId: string;
  onInterested: (projectId: string, messageId: string) => void;
  formatPrice: (val: number) => string;
}) {
  const isMe = msg.sender?._id === userId;
  const time = new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // System message
  if (msg.messageType === 'system') {
    // Hide the auto-generated project-details system message — it duplicates the blue banner
    if (msg.content?.startsWith('📋 Project:')) {
      return null;
    }
    return (
      <div className="flex justify-center px-2">
        <span className="text-[10px] text-gray-500 bg-gray-100 px-3 py-1 rounded-full text-center max-w-[85%]">{msg.content}</span>
      </div>
    );
  }

  // Inventory Card (Builder)
  if (msg.messageType === 'inventory_card' && msg.inventoryCard) {
    const inv = msg.inventoryCard;
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">🏠 Inventory</span>
            <span className="text-[10px] text-gray-400">{msg.sender?.name} · {msg.sender?.companyName || msg.sender?.role}</span>
          </div>
          <div className="space-y-1">
            {inv.bhkOptions?.length > 0 && <p className="text-sm font-semibold text-[#2A2A2A]">{inv.bhkOptions.join(', ')}</p>}
            <p className="text-xs text-gray-600">📍 {inv.area}{inv.city ? `, ${inv.city}` : ''}</p>
            <p className="text-xs text-gray-600">💰 {formatPrice(inv.priceRange?.min * 100000)} — {formatPrice(inv.priceRange?.max * 100000)}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {inv.bankLoanAvailable && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🏦 Loan</span>}
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{inv.possessionStatus}</span>
              {inv.commissionPercent > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">💵 {inv.commissionPercent}% Commission</span>}
            </div>
            {inv.description && <p className="text-[11px] text-gray-500 mt-1">{inv.description}</p>}
          </div>
          <p className="text-[10px] text-gray-400 text-right mt-2">{time}</p>
        </div>
      </div>
    );
  }

  // Requirement Card (Agent) + Match Results
  if (msg.messageType === 'requirement_card' && msg.requirementCard) {
    const req = msg.requirementCard;
    const matches = msg.matchResults || [];
    return (
      <div className="flex justify-start">
        <div className="max-w-[90%] space-y-2">
          {/* Requirement Card */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">🔍 Requirement</span>
              <span className="text-[10px] text-gray-400">{msg.sender?.name}</span>
              {req.urgency === 'urgent' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">⚡ URGENT</span>}
              {req.urgency === 'very_urgent' && <span className="text-[10px] bg-red-200 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">🔥 VERY URGENT</span>}
            </div>
            <p className="text-sm font-semibold text-[#2A2A2A]">{req.bhkType} · ₹{req.budget}L · {req.area}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {req.city && <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{req.city}</span>}
              <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">🕐 {req.possessionNeeded}</span>
              {req.loanRequired && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">🏦 Loan Needed</span>}
            </div>
            {req.clientNotes && <p className="text-[11px] text-gray-500 mt-1">📝 {req.clientNotes}</p>}
            <p className="text-[10px] text-gray-400 text-right mt-2">{time}</p>
          </div>

          {/* Match Results */}
          {matches.length > 0 && (
            <div className="bg-white border border-[#B45309]/20 rounded-2xl p-3 shadow-sm">
              <p className="text-xs font-bold text-[#B45309] mb-2">⚡ {matches.length} Matches Found</p>
              <div className="space-y-2">
                {matches.map((match, idx) => (
                  <MatchCard key={idx} match={match} onInterested={() => onInterested(match.project._id, msg._id)} formatPrice={formatPrice} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: text message
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${isMe ? 'bg-[#DCF8C6] text-[#111B21] rounded-tr-none' : 'bg-white text-[#111B21] rounded-tl-none'}`}>
        {!isMe && <p className="text-[10px] font-bold text-[#075E54] mb-0.5">{msg.sender?.name} <span className="text-[#667781] font-normal">· {msg.sender?.role}</span></p>}
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className="text-[11px] mt-0.5 text-[#667781] text-right">{time}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Match Card Component
// ═══════════════════════════════════════════════════════════

function MatchCard({ match, onInterested, formatPrice }: {
  match: MatchResult; onInterested: () => void; formatPrice: (val: number) => string;
}) {
  const project = match.project;
  const scoreColor = match.score >= 70 ? 'text-green-700 bg-green-100' : match.score >= 50 ? 'text-amber-700 bg-amber-100' : 'text-gray-600 bg-gray-100';

  return (
    <div className="flex items-center gap-3 p-2 bg-[#FAF7F2] rounded-xl border border-[#E7E5E4]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-[#2A2A2A] truncate">{project.projectName}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>{match.score}%</span>
        </div>
        <p className="text-[10px] text-gray-500 truncate">📍 {project.location || project.city} · {formatPrice(project.pricing?.startingPrice || 0)}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {match.matchedOn.map(tag => (
            <span key={tag} className="text-[9px] bg-[#B45309]/10 text-[#B45309] px-1.5 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
        {project.owner?.companyName && <p className="text-[10px] text-gray-400 mt-0.5">by {project.owner.companyName}</p>}
      </div>
      <button onClick={onInterested} className="px-3 py-2 bg-[#B45309] text-white text-[10px] font-bold rounded-xl hover:bg-[#92400E] transition-all shadow-md shadow-[#B45309]/20 whitespace-nowrap">
        Interested ✋
      </button>
    </div>
  );
}
