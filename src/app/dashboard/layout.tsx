'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Lock } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // ── Role helpers ──────────────────────────────────────────────
  const isAdmin   = user?.role === 'admin';
  const isCaptain = user?.role === 'builder';   // "Captain" maps to builder role
  const isUser    = user?.role === 'user';
  const isAgent   = user?.role === 'agent';
  const isEmployee = user?.role === 'employee';

  // Admin sees everything; builder/agent see most things except CRM & group-chat
  const canSeeMarketplace  = isAdmin || isCaptain || isAgent;
  const canSeeAnalytics    = isAdmin || isCaptain || isAgent;
  const canSeeOrgs         = isAdmin || isCaptain || isAgent;
  const canSeeEmployees    = isAdmin || isCaptain || isAgent;
  const canSeeChat         = isAdmin || isCaptain || isAgent;
  const canSeeGroupChat    = isAdmin;             // Captain & User locked
  const canSeeCRM          = isAdmin;             // Captain & User locked
  const canSeeUserSections = isAdmin || isCaptain || isAgent; // not for user/employee

  // ── Active state ─────────────────────────────────────────────
  const isActive = (path: string) => {
    if (!pathname) return false;
    if (path === '/dashboard') {
      return (
        pathname === '/dashboard' ||
        pathname.startsWith('/dashboard/admin') ||
        pathname.startsWith('/dashboard/builder') ||
        pathname.startsWith('/dashboard/agent') ||
        pathname.startsWith('/dashboard/user') ||
        pathname === '/dashboard/employee'
      );
    }
    if (path === '/dashboard/employee/history') return pathname.startsWith('/dashboard/employee/history');
    return pathname.startsWith(path);
  };

  const orgPath = user ? '/dashboard/organizations' : '/login';

  // ── Shared nav link styles ────────────────────────────────────
  const linkCls = (path: string) =>
    `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
      isActive(path)
        ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
        : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
    } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`;

  // Locked nav item — visible but disabled with a lock badge
  const LockedItem = ({ icon, label, title }: { icon: React.ReactNode; label: string; title?: string }) => (
    <div
      title={title ?? `${label} — not available for your role`}
      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl opacity-40 cursor-not-allowed select-none ${
        isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''
      }`}
    >
      {icon}
      {!isCollapsed && (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          {label}
          <Lock className="w-3 h-3 text-[#A8A29E]" />
        </span>
      )}
    </div>
  );

  // ── Icons (inline SVG kept identical to original) ────────────
  const icons = {
    home: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    marketplace: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    analytics: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    orgs: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
      </svg>
    ),
    employees: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    history: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    chat: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    groupChat: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    crm: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    profile: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    signout: (
      <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    collapse: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
      </svg>
    ),
    expand: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  };

  // ── Role badge shown under the logo ──────────────────────────
  const roleBadge = isAdmin
    ? { label: 'Admin', color: '#B45309', bg: '#B4530912' }
    : isCaptain
    ? { label: 'Captain', color: '#0369A1', bg: '#0369A112' }
    : isUser
    ? { label: 'User', color: '#3F6212', bg: '#3F621212' }
    : isAgent
    ? { label: 'Agent', color: '#7C3AED', bg: '#7C3AED12' }
    : isEmployee
    ? { label: 'Field Staff', color: '#0369A1', bg: '#0369A112' }
    : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#2A2A2A]">

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E7E5E4] px-4 py-3 shadow-sm shadow-[#B45309]/5">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#B45309] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-[#B45309]/20">H</div>
            <span className="text-lg font-bold text-[#2A2A2A] font-serif tracking-tight">HomeInTown</span>
          </Link>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-500 hover:text-gray-900 transition-colors" aria-label="Toggle menu">
            {sidebarOpen
              ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`
        fixed left-0 h-full bg-white border-r border-[#E7E5E4] p-3 z-50 shadow-2xl shadow-[#B45309]/5
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        flex flex-col
        top-14 lg:top-0
        h-[calc(100dvh-3.5rem)] lg:h-full
      `}>

        {/* Logo row — desktop only */}
        <div className={`hidden lg:flex items-center ${isCollapsed ? 'flex-col gap-4 text-center' : 'justify-between'} mb-6 px-2 mt-2 transition-all duration-300`}>
          <Link href="/" className={`flex items-center gap-3 group cursor-pointer overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-full'}`}>
            <div className="flex-shrink-0 w-10 h-10 bg-[#B45309] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#B45309]/20 transition-transform duration-300 hover:scale-105">H</div>
            {!isCollapsed && <span className="text-xl font-bold text-[#2A2A2A] font-serif tracking-tight group-hover:opacity-80 whitespace-nowrap">HomeInTown</span>}
          </Link>
          <button onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-2 rounded-xl border border-transparent hover:border-[#B45309]/10 hover:bg-[#FAF7F2] text-gray-400 hover:text-[#B45309] transition-all duration-300 ${isCollapsed ? 'mt-2' : ''}`}
            title={isCollapsed ? 'Expand' : 'Collapse'}>
            {isCollapsed ? icons.expand : icons.collapse}
          </button>
        </div>

        {/* Role badge */}
        {roleBadge && !isCollapsed && (
          <div className="mx-2 mb-4 px-3 py-2 rounded-xl flex items-center gap-2" style={{ backgroundColor: roleBadge.bg }}>
            <span className="text-xs font-bold" style={{ color: roleBadge.color }}>
              {roleBadge.label}
            </span>
            {user?.name && <span className="text-xs text-[#78716C] truncate">· {user.name}</span>}
          </div>
        )}

        {/* Nav */}
        <nav className="space-y-1 flex-1 overflow-y-auto">

          {/* ── Section: Overview (all roles) ── */}
          {!isCollapsed && <p className="px-2 mb-1 mt-1 text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Overview</p>}

          <Link href="/dashboard" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard')} title={isCollapsed ? 'Overview' : ''}>
            {icons.home}
            {!isCollapsed && <span className="whitespace-nowrap">Overview</span>}
          </Link>

          {/* ── Section: Features (admin / captain / agent only) ── */}
          {canSeeUserSections && (
            <>
              {!isCollapsed && <p className="px-2 mb-1 mt-3 text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Features</p>}

              {canSeeMarketplace && (
                <Link href="/dashboard/marketplace" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/marketplace')} title={isCollapsed ? 'Marketplace' : ''}>
                  {icons.marketplace}
                  {!isCollapsed && <span className="whitespace-nowrap">Marketplace</span>}
                </Link>
              )}

              {canSeeAnalytics && (
                <Link href="/dashboard/analytics" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/analytics')} title={isCollapsed ? 'Analytics' : ''}>
                  {icons.analytics}
                  {!isCollapsed && <span className="whitespace-nowrap">Analytics</span>}
                </Link>
              )}

              {canSeeOrgs && (
                <Link href={orgPath} onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/organizations')} title={isCollapsed ? 'Organizations' : ''}>
                  {icons.orgs}
                  {!isCollapsed && <span className="whitespace-nowrap">Organizations</span>}
                </Link>
              )}

              {canSeeEmployees && (
                <Link href="/dashboard/employees" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/employees')} title={isCollapsed ? 'Employees' : ''}>
                  {icons.employees}
                  {!isCollapsed && <span className="whitespace-nowrap">Employees</span>}
                </Link>
              )}

              {/* ── Chat (admin + captain only) ── */}
              {canSeeChat && (
                <Link href="/dashboard/chat" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/chat')} title={isCollapsed ? 'Chat' : ''}>
                  {icons.chat}
                  {!isCollapsed && <span className="whitespace-nowrap">Chat</span>}
                </Link>
              )}

              {/* ── Group Chat — admin only; locked for captain ── */}
              {canSeeGroupChat ? (
                <Link href="/dashboard/group-chat" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/group-chat')} title={isCollapsed ? 'Group Chat' : ''}>
                  {icons.groupChat}
                  {!isCollapsed && <span className="whitespace-nowrap">Group Chat</span>}
                </Link>
              ) : (isCaptain && !isCollapsed) ? (
                <LockedItem icon={icons.groupChat} label="Group Chat" title="Lead matching — Admin only" />
              ) : null}

              {/* ── CRM — admin only; locked for captain ── */}
              {canSeeCRM ? (
                <Link href="/dashboard/crm" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/crm')} title={isCollapsed ? 'CRM' : ''}>
                  {icons.crm}
                  {!isCollapsed && <span className="whitespace-nowrap">CRM</span>}
                </Link>
              ) : (isCaptain && !isCollapsed) ? (
                <LockedItem icon={icons.crm} label="CRM" title="CRM — Admin only" />
              ) : null}
            </>
          )}

          {/* ── Employee-specific ── */}
          {isEmployee && (
            <Link href="/dashboard/employee/history" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/employee/history')} title={isCollapsed ? 'Archive' : ''}>
              {icons.history}
              {!isCollapsed && <span className="whitespace-nowrap">Archive</span>}
            </Link>
          )}

          {/* ── User role: show locked feature pills as a hint ── */}
          {isUser && !isCollapsed && (
            <div className="mt-4 mx-1 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
              <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Available on upgrade</p>
              {['Marketplace', 'Analytics', 'CRM', 'Projects', 'Chat'].map((f) => (
                <div key={f} className="flex items-center gap-1.5 py-1 text-xs text-[#C4B5A0]">
                  <Lock className="w-3 h-3" />
                  {f}
                </div>
              ))}
            </div>
          )}

          {/* ── Profile (all roles) ── */}
          {!isCollapsed && <p className="px-2 mb-1 mt-3 text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Account</p>}
          <Link href="/dashboard/profile" onClick={() => setSidebarOpen(false)} className={linkCls('/dashboard/profile')} title={isCollapsed ? 'Profile' : ''}>
            {icons.profile}
            {!isCollapsed && <span className="whitespace-nowrap">Profile</span>}
          </Link>
        </nav>

        {/* Sign out */}
        <div className="border-t border-gray-200 pt-4 pb-2 lg:pb-2 pb-20">
          <button
            onClick={() => { logout(); window.location.href = '/dashboard-login'; }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309] group ${isCollapsed ? 'justify-center px-0' : ''}`}
            title={isCollapsed ? 'Sign Out' : ''}
          >
            <svg className="flex-shrink-0 w-6 h-6 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} px-0 pb-0 pt-16 lg:pt-0`}>
        {children}
      </main>
    </div>
  );
}
