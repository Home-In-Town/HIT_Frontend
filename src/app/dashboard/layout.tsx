'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  // Ensure active state updates correctly on navigation

  const { user } = useAuth();

  // Fix: Strictly match /dashboard to prevent it from being active on /dashboard/analytics
  const isActive = (path: string) => {
    if (!pathname) return false;

    if (path === '/dashboard') {
      return pathname === '/dashboard' ||
            pathname.startsWith('/dashboard/admin') ||
            pathname.startsWith('/dashboard/builder') ||
            pathname.startsWith('/dashboard/agent') ||
            pathname === '/dashboard/employee';
    }

    if (path === '/dashboard/employee/history') {
        return pathname.startsWith('/dashboard/employee/history');
    }

    return pathname.startsWith(path);
  };
const orgPath = user
  ? '/dashboard/organizations'
  : '/login';



  return (
    <div className="min-h-screen bg-[#FAF7F2] font-sans text-[#2A2A2A]">

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-[#E7E5E4] px-4 py-3 shadow-sm shadow-[#B45309]/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-[#B45309] rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-[#B45309]/20">H</div>
            <span className="text-lg font-bold text-[#2A2A2A] font-serif tracking-tight">HomeInTown</span>
            </Link>
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-500 hover:text-gray-900 transition-colors"
            aria-label="Toggle menu"
          >
            {sidebarOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-full bg-white border-r border-[#E7E5E4] p-3 z-50 shadow-2xl shadow-[#B45309]/5
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
        flex flex-col
      `}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-4 text-center' : 'justify-between'} mb-8 px-2 mt-2 lg:mt-0 transition-all duration-300`}>
          <Link
            href="/"
            className={`flex items-center gap-3 group cursor-pointer overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-full'}`}
          >
            <div className="flex-shrink-0 w-10 h-10 bg-[#B45309] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#B45309]/20 transition-transform duration-300 hover:scale-105">
              H
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold text-[#2A2A2A] font-serif tracking-tight group-hover:opacity-80 whitespace-nowrap opacity-100 transition-opacity duration-300">
                HomeInTown
              </span>
            )}
          </Link>
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex p-2 rounded-xl border border-transparent hover:border-[#B45309]/10 hover:bg-[#FAF7F2] text-gray-400 hover:text-[#B45309] transition-all duration-300 ${isCollapsed ? 'mt-2' : ''}`}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>

        
        <nav className="space-y-1 flex-1">
          {!isCollapsed && (
            <div className="px-2 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap transition-all duration-300">
              Overview
            </div>
          )}
          
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
              isActive('/dashboard') 
                ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm' 
                : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
            } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
            title={isCollapsed ? "Overview" : ""}
          >
             <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
             </svg>
            {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Overview</span>}
          </Link>

          {(user?.role === 'admin' || user?.role === 'builder' || user?.role === 'agent') && (
            <Link
              href="/dashboard/marketplace"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isActive('/dashboard/marketplace')
                  ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                  : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
              } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
              title={isCollapsed ? "Marketplace" : ""}
            >
              <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Marketplace</span>}
            </Link>
          )}

          {(user?.role === 'admin' || user?.role === 'builder' || user?.role === 'agent') && (
            <>
              <Link
                href="/dashboard/projects"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive('/dashboard/projects') 
                    ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm' 
                    : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
                } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
                title={isCollapsed ? "Projects" : ""}
              >
                <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Projects</span>}
              </Link>

              <Link 
                href="/dashboard/analytics"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive('/dashboard/analytics')
                    ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                    : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
                } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
                title={isCollapsed ? "Analytics" : ""}
              >
                 <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                 </svg>
                 {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Analytics</span>}
              </Link>

              <Link
                href={orgPath}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive('/dashboard/organizations')
                    ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                    : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
                } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
                title={isCollapsed ? "Organizations" : ""}
              >
                 <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                 </svg>
                 {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Organizations</span>}
              </Link>
            </>
          )}

          {(user?.role === 'admin' || user?.role === 'builder' || user?.role === 'agent') && (
            <Link
              href="/dashboard/employees"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isActive('/dashboard/employees')
                  ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                  : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
              } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
              title={isCollapsed ? "Employees" : ""}
            >
              <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Employees</span>}
            </Link>
          )}

          {user?.role === 'employee' && (
            <Link
              href="/dashboard/employee/history"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                isActive('/dashboard/employee/history')
                  ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                  : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
              } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
              title={isCollapsed ? "Archive" : ""}
            >
              <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Archive</span>}
            </Link>
          )}

          {/* Chat Link */}
          {(user?.role === 'admin' || user?.role === 'builder' || user?.role === 'agent') && (
            <>

              <Link
                href="/dashboard/chat"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive('/dashboard/chat')
                    ? 'bg-[#FAF7F2] text-[#B45309] border border-[#B45309]/10 shadow-sm'
                    : 'text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]'
                } ${isCollapsed ? 'justify-center px-0 mx-auto w-11' : ''}`}
                title={isCollapsed ? "Chat" : ""}
              >
                <svg className="flex-shrink-0 w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {!isCollapsed && <span className="whitespace-nowrap transition-all duration-200">Chat</span>}
              </Link>
            </>
          )}



        </nav>
        
        <div className="border-t border-gray-200 pt-4 overflow-hidden">
           <div className={`px-3 py-2 mb-2 text-xs text-gray-400 font-mono text-center border border-dashed border-gray-200 rounded bg-gray-50 whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 h-0 p-0 m-0 border-0' : 'opacity-100'}`}>
             Admin Login Data
           </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'} px-0 pb-0 pt-16 lg:pt-0`}>
        {/* We generally want the dashboard page to handle its own padding/containers to allow full width headers */}
        {children}
      </main>
    </div>
  );
}
