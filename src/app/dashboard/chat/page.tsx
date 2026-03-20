'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { chatApi, ChatSession, ChatMessage as ChatMsg } from '@/lib/api';
import { useSocket } from '@/hooks/useSocket';
import toast from 'react-hot-toast';

const QUALIFICATION_QUESTIONS = [
  { key: 'reach', question: 'What is your market reach?', options: ['Low (< 50 clients)', 'Average (50–200 clients)', 'High (200+ clients)'] },
  { key: 'experience', question: 'Years of experience in real estate?', options: ['0–2 years', '2–5 years', '5–10 years', '10+ years'] },
  { key: 'specialization', question: 'Primary domain?', options: ['Residential', 'Commercial', 'Plots/Land', 'Mixed'] },
  { key: 'deals_monthly', question: 'Average deals per month?', options: ['1–3', '4–10', '10–25', '25+'] },
];

export default function ChatPage() {
  const { user } = useAuth();
  const socket = useSocket();
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
      // Update session list
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
      {/* Sidebar - Sessions List */}
      <div className={`w-full sm:w-80 lg:w-96 bg-white border-r border-[#E7E5E4] flex flex-col ${activeSession ? 'hidden sm:flex' : 'flex'}`}>
        {/* Chat Header */}
        <div className="p-4 border-b border-[#E7E5E4]">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[#2A2A2A] font-serif">Messages</h1>
            <button
              onClick={loadContacts}
              className="p-2 bg-[#B45309] text-white rounded-xl hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20"
              title="New Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 p-6">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-center">No conversations yet</p>
              <button onClick={loadContacts} className="mt-3 text-sm text-[#B45309] font-medium hover:underline">
                Start a new chat
              </button>
            </div>
          ) : (
            filteredSessions.map(session => {
              const unread = session.unreadCount?.[user?.id || user?._id || ''] || 0;
              return (
                <button
                  key={session._id}
                  onClick={() => setActiveSession(session)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors border-b border-gray-50 text-left ${
                    activeSession?._id === session._id ? 'bg-[#FAF7F2] border-l-2 border-l-[#B45309]' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B45309] to-[#D97706] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitials(getPartnerName(session))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#2A2A2A] truncate">{getPartnerName(session)}</p>
                      {session.lastMessage?.timestamp && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{formatTime(session.lastMessage.timestamp)}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-gray-500 truncate">{session.lastMessage?.content || 'Start chatting...'}</p>
                      {unread > 0 && (
                        <span className="ml-2 w-5 h-5 bg-[#B45309] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeSession ? 'hidden sm:flex' : 'flex'}`}>
        {!activeSession ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <div className="w-20 h-20 bg-[#FAF7F2] rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-[#B45309]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs mt-1">or start a new chat</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-white border-b border-[#E7E5E4] flex items-center gap-3">
              <button
                onClick={() => setActiveSession(null)}
                className="sm:hidden p-1 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#B45309] to-[#D97706] flex items-center justify-center text-white text-xs font-bold">
                {getInitials(getPartnerName(activeSession))}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2A2A2A]">{getPartnerName(activeSession)}</p>
                <p className="text-[10px] text-gray-400 capitalize">{getPartnerRole(activeSession)}</p>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${socket.isConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-[10px] text-gray-400">{socket.isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF7F2]">
              {messages.map(msg => {
                const isMe = msg.sender?._id === user?.id || msg.sender?._id === user?._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? 'bg-[#B45309] text-white rounded-br-md'
                        : 'bg-white text-[#2A2A2A] border border-[#E7E5E4] rounded-bl-md shadow-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'} text-right`}>
                        {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}

              {Object.keys(typingUsers).length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white border border-[#E7E5E4] rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 bg-white border-t border-[#E7E5E4]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => handleTyping(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-[#B45309] text-white rounded-xl hover:bg-[#92400E] transition-colors disabled:opacity-40 shadow-lg shadow-[#B45309]/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Contacts Modal */}
      {showContacts && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setShowContacts(false); setShowQualification(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {!showQualification ? (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Start New Chat</h2>
                  <button onClick={() => setShowContacts(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto max-h-[60vh]">
                  {contacts.length === 0 ? (
                    <p className="text-center text-gray-400 text-sm py-8">No contacts available</p>
                  ) : (
                    contacts.map(contact => (
                      <button
                        key={contact._id}
                        onClick={() => { setSelectedPartner(contact); setShowQualification(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#FAF7F2] transition-colors border-b border-gray-50 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B45309] to-[#D97706] flex items-center justify-center text-white text-xs font-bold">
                          {getInitials(contact.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#2A2A2A]">{contact.name}</p>
                          <p className="text-xs text-gray-400 capitalize">{contact.role}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-gray-100">
                  <button onClick={() => setShowQualification(false)} className="text-sm text-[#B45309] hover:underline mb-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to contacts
                  </button>
                  <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Quick Qualification</h2>
                  <p className="text-xs text-gray-400 mt-1">Internal profiling — not shared with {selectedPartner?.name}</p>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto max-h-[55vh]">
                  {QUALIFICATION_QUESTIONS.map(q => (
                    <div key={q.key}>
                      <p className="text-sm font-medium text-[#2A2A2A] mb-2">{q.question}</p>
                      <div className="flex flex-wrap gap-2">
                        {q.options.map(opt => (
                          <button
                            key={opt}
                            onClick={() => setQualificationAnswers(prev => ({ ...prev, [q.key]: opt }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              qualificationAnswers[q.key] === opt
                                ? 'bg-[#B45309] text-white shadow-sm'
                                : 'bg-[#FAF7F2] text-gray-600 hover:bg-[#F5F1EB]'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleStartChat}
                    className="w-full mt-4 px-4 py-2.5 bg-[#B45309] text-white rounded-xl text-sm font-medium hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20"
                  >
                    Start Chat with {selectedPartner?.name}
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
