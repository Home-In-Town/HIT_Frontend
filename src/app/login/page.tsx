'use client';

import AuthScreens from '@/components/auth/AuthScreens';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-[#B45309]/20">
      
      {/* Decorative Background Elements from Landing Page */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-[#B45309]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-[#3F6212]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Logo/Header */}
      <div className="mb-12 relative z-10">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-[#B45309] rounded-2xl flex items-center justify-center text-white font-serif font-bold text-3xl shadow-xl shadow-[#B45309]/20 transform group-hover:rotate-6 transition-transform">
            H
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[#2A2A2A] tracking-tighter font-serif leading-none">HomeInTown</span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-[#B45309] font-bold mt-1">Sales Intelligence</span>
          </div>
        </Link>
      </div>

      {/* Auth Screen Container */}
      <div className="w-full max-w-md relative z-10">
        <AuthScreens />
      </div>

      {/* Footer info */}
      <footer className="mt-16 text-center text-[#A8A29E] text-xs font-bold uppercase tracking-widest relative z-10">
        <div className="flex items-center justify-center gap-4">
          <span>© 2026 HIT Sales</span>
          <span className="w-1 h-1 bg-[#E7E5E4] rounded-full" />
          <span>Secure Authentication</span>
        </div>
      </footer>
    </main>
  );
}
