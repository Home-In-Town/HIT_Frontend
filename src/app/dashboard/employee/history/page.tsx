'use client';

import { useState, useEffect } from 'react';
import { employeeApi } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Clock, 
  Activity,
  Shield,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function EmployeeHistory() {
    const { user } = useAuth();
    const [myHistory, setMyHistory] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        if (user && (user.id || (user as any)._id)) {
            fetchHistory();
        }
    }, [user]);

    const fetchHistory = async () => {
        try {
            const userId = user?.id || (user as any)?._id;
            if (!userId) return;
            const data = await employeeApi.getHistory(userId);
            setMyHistory(data);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAF7F2] relative pb-24">
            {/* Header / HUD */}
            <div className="bg-white border-b border-[#E7E5E4] px-6 py-4 sticky top-0 z-30 shadow-sm shadow-[#B45309]/5">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard/employee" className="p-2 text-[#A8A29E] hover:text-[#2A2A2A] transition-colors rounded-xl hover:bg-[#FAF7F2]">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-sm font-black text-[#2A2A2A] font-serif uppercase tracking-widest leading-none">Intelligence Archive</h1>
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5 font-mono">
                                <Shield className="w-2.5 h-2.5" /> Historical Records
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Ground History Timeline */}
                <div className="bg-white rounded-[2.5rem] border border-[#E7E5E4] shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-[#E7E5E4] bg-[#FAF7F2]/30 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-black text-white rounded-xl shadow-lg shadow-black/10">
                                <Activity className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-[#2A2A2A] font-serif uppercase tracking-tight">Activity Stream</h3>
                        </div>
                    </div>

                    <div className="divide-y divide-[#E7E5E4]/40">
                        {loadingHistory ? (
                            [1,2,3,4,5].map(i => <div key={i} className="p-8 h-24 bg-white animate-pulse" />)
                        ) : myHistory?.meetings?.length === 0 ? (
                            <div className="py-24 text-center px-8">
                                <div className="w-16 h-16 bg-[#FAF7F2] rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-[#E7E5E4]">
                                    <Clock className="w-8 h-8 text-[#A8A29E] opacity-20" />
                                </div>
                                <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest">No intelligence gathered yet</p>
                            </div>
                        ) : (
                            myHistory?.meetings?.map((m: any, idx: number) => (
                                <div key={m._id || m.id} className="p-8 hover:bg-[#FAF7F2]/40 transition-all group">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="flex gap-5">
                                            <div className="w-12 h-12 bg-white border border-[#E7E5E4] rounded-2xl flex items-center justify-center text-[#B45309] shrink-0 shadow-sm group-hover:-translate-y-1 transition-transform">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h4 className="font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">{m.withWhom}</h4>
                                                    <span className="text-[8px] font-black text-[#A8A29E] uppercase tracking-widest bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E7E5E4]">Log #{myHistory.meetings.length - idx}</span>
                                                </div>
                                                <p className="text-xs text-[#57534E] leading-relaxed italic border-l-2 border-[#E7E5E4] pl-3 py-0.5 group-hover:border-[#B45309] transition-colors">{m.description}</p>
                                                {m.location?.placeName && (
                                                    <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#A8A29E]">
                                                        <MapPin className="w-3 h-3 text-[#B45309]" />
                                                        <span className="truncate max-w-md">{m.location.placeName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-[10px] font-black text-[#2A2A2A] font-mono">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-[8px] font-bold text-[#A8A29E] uppercase tracking-widest mt-1">{new Date(m.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @font-face {
                    font-family: 'DM Serif Display';
                    src: url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
                }
            `}</style>
        </div>
    );
}
