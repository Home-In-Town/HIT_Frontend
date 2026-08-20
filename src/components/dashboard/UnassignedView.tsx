'use client';

import React from 'react';
import { useAuth } from '@/lib/authContext';
import { Clock, MessageSquare, LogOut } from 'lucide-react';

export default function UnassignedView() {
    const { user, logout } = useAuth();

    return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6 text-[#2A2A2A] relative overflow-hidden font-sans">
             {/* Background decorative elements */}
             <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-[#B45309]/5 rounded-full blur-3xl pointer-events-none" />
             <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-[#3F6212]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-md w-full text-center space-y-8 z-10">
                <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-[2rem] flex items-center justify-center border border-[#B45309]/20 shadow-xl shadow-[#B45309]/5">
                    <Clock className="w-10 h-10 text-[#B45309]" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-bold font-serif tracking-tight">Registration <span className="text-[#B45309]">Received</span></h1>
                    <p className="text-[#57534E] leading-relaxed">
                        Hello <span className="text-[#2A2A2A] font-bold">{user?.name}</span>, your account has been created. 
                        An administrator needs to assign you a role before you can access your customized dashboard.
                    </p>
                </div>

                <div className="bg-white border border-[#E7E5E4] rounded-[2rem] p-8 shadow-sm">
                    <div className="flex items-start gap-4 text-left">
                        <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E7E5E4]">
                            <MessageSquare className="w-6 h-6 text-[#B45309]" />
                        </div>
                        <div>
                            <p className="font-bold text-[#2A2A2A]">Need help?</p>
                            <p className="text-sm text-[#57534E] mt-1 italic">Contact support at hi@hitsales.in to expedite your approval.</p>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={() => logout()}
                    className="flex items-center justify-center gap-2 mx-auto text-[#A8A29E] hover:text-[#2A2A2A] transition-all text-sm font-bold uppercase tracking-widest group"
                >
                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform text-[#B45309]" />
                    Sign out as another user
                </button>
            </div>
        </div>
    );
}
