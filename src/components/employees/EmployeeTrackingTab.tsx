'use client';

import { useState, useEffect } from 'react';
import { employeeApi, AuthUser } from '@/lib/api';
import { useAuth } from '@/lib/authContext';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  UserPlus, 
  MapPin, 
  ClipboardList, 
  Users, 
  Clock, 
  ChevronRight, 
  X, 
  Phone, 
  Activity, 
  Map,
  Target,
  ShieldCheck,
  Smartphone,
  ArrowRight,
  History as HistoryIcon,
  Plus,
  Zap,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { getDistanceMeters, reverseGeocodeOSM } from '@/lib/geo';
import Link from 'next/link';

export default function EmployeeTrackingTab() {
    const [searchPhone, setSearchPhone] = useState('');
    const [searchResults, setSearchResults] = useState<AuthUser | null>(null);
    const [myEmployees, setMyEmployees] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
    const [history, setHistory] = useState<any>(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
    const [filter, setFilter] = useState<'all' | 'own' | 'partners'>('all');
    const { user } = useAuth();

    const [isAddingMode, setIsAddingMode] = useState(false);

    const canManageEmployees = user?.role === 'builder' || user?.role === 'admin';

    useEffect(() => {
        fetchMyEmployees();
    }, []);

    const fetchMyEmployees = async () => {
        try {
            const data = await employeeApi.getMyEmployees();
            setMyEmployees(data);
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = myEmployees.filter(emp => {
        if (filter === 'all') return true;
        const empEmployerIdString = typeof emp.employerId === 'object' 
            ? (emp.employerId._id || (emp.employerId as any).id) 
            : emp.employerId;

        if (filter === 'own') return empEmployerIdString === user?.id;
        if (filter === 'partners') return empEmployerIdString !== user?.id;
        return true;
    });

    const handleSearch = async () => {
        if (!searchPhone) return;
        try {
            const result = await employeeApi.search(searchPhone);
            setSearchResults(result);
        } catch (error: any) {
            setSearchResults(null);
            toast.error(error.message || 'Employee not found');
        }
    };

    const handleRequest = async () => {
        if (!searchResults) return;
        try {
            await employeeApi.requestAssignment(searchResults.id || searchResults._id || '');
            toast.success('Assignment request sent!');
            setSearchResults(null);
            setSearchPhone('');
            setIsAddingMode(false);
            fetchMyEmployees();
        } catch (error: any) {
            toast.error(error.message || 'Failed to send request');
        }
    };

    const resolvePlaceName = async (lat: number, lng: number) => {
        const key = `${lat},${lng}`;
        if (placeNames[key]) return;

        try {
            // Respect Nominatim rate limits (1 req/sec) by adding a random jitter
            await new Promise(r => setTimeout(r, Math.random() * 1000));
            
            const place = await reverseGeocodeOSM(lat, lng);
            setPlaceNames(prev => ({ ...prev, [key]: place }));
        } catch (error) {
            console.error('Failed to resolve place name:', error);
        }
    };

    const fetchHistory = async (id: string) => {
        setSelectedEmployee(id);
        setLoadingHistory(true);
        try {
            const data = await employeeApi.getHistory(id);
            setHistory(data);
            
            if (data.meetings) {
                data.meetings.forEach((m: any) => {
                    if (m.location?.latitude && !m.location.placeName) {
                        resolvePlaceName(m.location.latitude, m.location.longitude);
                    }
                });
            }
            if (data.locations) {
                data.locations.slice(0, 5).forEach((l: any) => {
                    if (!l.placeName) {
                        resolvePlaceName(l.latitude, l.longitude);
                    }
                });
            }
            
            // Scroll to the history view
            setTimeout(() => {
                document.getElementById('employee-history-view')?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            
        } catch (error: any) {
            toast.error('Failed to load history');
        } finally {
            setLoadingHistory(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Top Row: Enterprise & Recruitment Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                {/* Enterprise Stats Card */}
                <div className="bg-white rounded-2xl border border-[#E7E5E4] p-4 shadow-sm shadow-[#B45309]/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 text-[#B45309] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                        <ShieldCheck className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[9px] font-bold text-[#B45309] uppercase tracking-widest mb-3">Enterprise Assets</p>
                        <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-xl flex items-center justify-center text-white text-base font-bold font-serif shadow-lg shadow-[#B45309]/20">
                                {user?.name?.charAt(0).toUpperCase() || 'B'}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-[#2A2A2A] font-serif leading-tight">{user?.name}</h2>
                                <p className="text-[10px] font-mono font-bold text-[#A8A29E] uppercase tracking-widest mt-1">Master Controller</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mt-4">
                        <div className="bg-[#FAF7F2]/50 p-2.5 rounded-xl border border-[#E7E5E4]/60">
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest leading-none">Total Force</p>
                            <p className="mt-1 text-xl font-bold text-[#2A2A2A] font-mono tracking-tighter">{myEmployees.length}</p>
                        </div>
                        <div className="bg-[#FAF7F2]/50 p-2.5 rounded-xl border border-[#E7E5E4]/60">
                            <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest leading-none">Agent Status</p>
                            <div className="mt-1 flex items-center gap-1.5 font-mono">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-xs font-bold text-[#2A2A2A]">Active</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recruitment Portal */}
                <div className="bg-white rounded-2xl border border-orange-100 p-4 shadow-sm shadow-[#B45309]/10 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-1.5 bg-orange-50 rounded-xl text-orange-600 border border-orange-100">
                                <UserPlus className="w-4 h-4" />
                            </div>
                            <h3 className="text-sm font-bold text-[#2A2A2A] font-serif uppercase tracking-tight">Recruit Force</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider ml-1">Phone Protocol</label>
                                <div className="relative">
                                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                                    <input
                                        placeholder="Identifier Source"
                                        className="w-full h-9 pl-10 pr-4 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] outline-none transition-all placeholder:text-[#A8A29E]/50"
                                        value={searchPhone}
                                        onChange={(e) => setSearchPhone(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSearch}
                                className="w-full h-9 bg-[#2A2A2A] text-white hover:bg-black rounded-xl font-bold text-[11px] uppercase tracking-widest group shadow-lg shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                            >
                                Find Employee <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            {searchResults && (
                                <div className="mt-6 p-4 rounded-2xl bg-orange-50 border border-orange-100 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 border border-orange-200 shadow-sm font-serif font-bold text-base">
                                            {searchResults.name?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-widest leading-none">
                                                {searchResults.isAlreadyAssigned ? 'Already Assigned' : 'Profile Located'}
                                            </p>
                                            <h4 className="font-bold text-[#2A2A2A] font-serif mt-1">{searchResults.name}</h4>
                                            <p className="text-[9px] font-mono font-bold text-[#A8A29E] tracking-tight">{searchResults.phone}</p>
                                        </div>
                                    </div>
                                    {!searchResults.isAlreadyAssigned && (
                                        <button
                                            onClick={handleRequest}
                                            className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-md shadow-orange-600/20 active:scale-95 transition-all"
                                        >
                                            Instate Agent Association
                                        </button>
                                    )}
                                    <p className="text-[9px] text-orange-600/70 leading-relaxed font-medium italic">
                                        * Security verification required. The agent must authorize association from their secure terminal.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row: Active Workforce List Full Width */}
            <div className="w-full">
                <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm shadow-[#B45309]/5 overflow-hidden flex flex-col">
                    <div className="px-5 py-3.5 border-b border-[#E7E5E4] bg-[#FAF7F2]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-[#B45309]/10 rounded-xl text-[#B45309] border border-[#B45309]/10">
                                <Target className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#2A2A2A] font-serif uppercase tracking-tight leading-none">Active Field Agents</h3>
                                <p className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest mt-1.5">Verified Workforce Units</p>
                            </div>
                        </div>

                        {user?.role === 'admin' && (
                            <div className="flex bg-[#FAF7F2] p-1 rounded-xl border border-[#E7E5E4] self-start md:self-auto">
                                <button 
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-[#B45309] shadow-sm' : 'text-[#A8A29E] hover:text-[#57534E]'}`}
                                >
                                    Total Force
                                </button>
                                <button 
                                    onClick={() => setFilter('own')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'own' ? 'bg-white text-[#B45309] shadow-sm' : 'text-[#A8A29E] hover:text-[#57534E]'}`}
                                >
                                    Own Operatives
                                </button>
                                <button 
                                    onClick={() => setFilter('partners')}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'partners' ? 'bg-white text-[#B45309] shadow-sm' : 'text-[#A8A29E] hover:text-[#57534E]'}`}
                                >
                                    Partner Workforce
                                </button>
                            </div>
                        )}

                        <div className="px-3 py-1.5 bg-white border border-[#E7E5E4] rounded-xl shadow-sm self-end md:self-auto">
                            <span className="text-[10px] font-bold text-[#57534E] font-mono whitespace-nowrap">VIEWING: {filteredEmployees.length}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-x-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
                                <p className="mt-4 text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Syncing Force Data...</p>
                            </div>
                        ) : filteredEmployees.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 p-6 text-center">
                                <div className="mx-auto w-14 h-14 bg-[#FAF7F2] rounded-2xl flex items-center justify-center border border-[#E7E5E4] mb-5 opacity-40">
                                    <Users className="w-8 h-8 text-[#A8A29E]" />
                                </div>
                                <p className="text-base font-bold text-[#2A2A2A] font-serif italic text-balance">The selected field is empty.</p>
                                <p className="text-xs text-[#A8A29E] mt-2 font-medium">Try changing the filter protocol.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#E7E5E4]/40 max-h-[480px] overflow-y-auto custom-scrollbar">
                                {filteredEmployees.map((emp) => (
                                    <div 
                                        key={emp.id || emp._id} 
                                        className={`p-4 hover:bg-[#FAF7F2]/40 transition-all group relative ${selectedEmployee === (emp.id || emp._id) ? 'bg-[#FAF7F2]/60' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 bg-white border border-[#E7E5E4] rounded-xl flex items-center justify-center text-[#B45309] text-lg font-bold font-serif group-hover:border-[#B45309]/30 transition-all shadow-sm group-hover:shadow-[#B45309]/10 group-hover:-translate-y-0.5">
                                                    {emp.name?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-base font-bold text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">{emp.name}</h4>
                                                        {!emp.isEmployerConfirmed ? (
                                                            <span className="text-[8px] font-bold h-4 bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-widest px-1.5 flex items-center rounded-sm">Pending</span>
                                                        ) : (
                                                            <span className="text-[8px] font-bold h-4 bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest px-1.5 flex items-center rounded-sm">Active</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-3">
                                                        <p className="text-[10px] font-mono font-bold text-[#A8A29E] tracking-tight">{emp.phone}</p>
                                                        <span className="w-1 h-1 rounded-full bg-[#E7E5E4]" />
                                                        {user?.role === 'admin' && emp.employerId ? (
                                                            <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-wider">
                                                                Employer: {typeof emp.employerId === 'object' ? emp.employerId.name : 'Unknown'}
                                                            </p>
                                                        ) : (
                                                            <p className="text-[10px] font-bold text-[#57534E] uppercase tracking-wider">Field Operative</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => fetchHistory(emp.id || emp._id || '')}
                                                className="flex items-center gap-2 px-4 h-9 bg-white border border-[#E7E5E4] rounded-xl text-[10px] font-bold text-[#2A2A2A] uppercase tracking-widest hover:border-[#B45309] hover:text-[#B45309] hover:bg-white transition-all group/btn shadow-sm active:scale-95"
                                            >
                                                <HistoryIcon className="w-3 h-3" />
                                                <span>Logs</span>
                                                <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tracking & History HUD */}
            {selectedEmployee && (
                <div id="employee-history-view" className="bg-white border border-[#E7E5E4] rounded-2xl shadow-2xl shadow-[#B45309]/10 overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <div className="px-5 py-3 border-b border-[#E7E5E4]/50 bg-gradient-to-r from-[#FAF7F2] to-white flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white border border-[#E7E5E4] flex items-center justify-center text-[#B45309] text-lg font-serif font-bold shadow-sm">
                                {history?.employee?.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-[#2A2A2A] font-serif leading-none flex items-center gap-2">
                                    Ground Activity: {history?.employee?.name}
                                    <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shadow-sm">Live Pulse</span>
                                </h3>
                                <p className="text-[9px] text-[#A8A29E] font-bold uppercase tracking-[0.12em] mt-1.5">Operational history and real-time telemetry</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedEmployee(null)}
                            className="p-2 text-[#A8A29E] hover:text-[#B45309] hover:bg-[#B45309]/5 rounded-xl transition-all border border-transparent hover:border-[#E7E5E4]"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-[#E7E5E4]/50 min-h-[400px]">
                        {/* Meeting Logs */}
                        <div className="p-4">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-[#B45309] text-white rounded-lg shadow-lg shadow-[#B45309]/20">
                                        <ClipboardList className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="font-bold text-[#2A2A2A] text-sm font-serif uppercase tracking-tight">Operational Logs</h4>
                                </div>
                                <span className="text-[9px] font-bold text-[#A8A29E] uppercase tracking-widest bg-[#FAF7F2] border border-[#E7E5E4] px-2.5 py-1 rounded-full">{history?.meetings?.length || 0} Records</span>
                            </div>
                            
                            <div className="max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                {loadingHistory ? (
                                    <div className="space-y-4">
                                        {[1,2,3].map(i => <div key={i} className="h-32 bg-[#FAF7F2] rounded-3xl animate-pulse" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {history?.meetings?.length === 0 ? (
                                            <div className="py-16 text-center bg-[#FAF7F2]/30 rounded-2xl border border-dashed border-[#E7E5E4]">
                                                <ClipboardList className="w-8 h-8 mx-auto mb-3 text-[#A8A29E] opacity-20" />
                                                <p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-widest">No meeting records synthesized</p>
                                            </div>
                                        ) : (
                                            history?.meetings?.map((m: any) => (
                                                <div key={m._id || m.id} className="p-3 rounded-xl border border-[#E7E5E4] bg-white shadow-sm hover:border-[#B45309]/30 hover:shadow-xl hover:shadow-[#B45309]/5 transition-all group overflow-hidden relative">
                                                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                                        <ClipboardList className="w-12 h-12 text-[#B45309]" />
                                                    </div>
                                                    <div className="flex justify-between items-start gap-4 relative z-10">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-bold text-base text-[#2A2A2A] font-serif group-hover:text-[#B45309] transition-colors">{m.withWhom}</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                            </div>
                                                            <p className="text-xs text-[#57534E] font-medium leading-relaxed italic border-l-2 border-orange-100 pl-3 mb-3">"{m.description}"</p>
                                                            
                                                            {(m.projectName || m.projectLocation || m.projectPrice) && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#E7E5E4]/40">
                                                                    {m.projectName && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] font-black text-[#A8A29E] uppercase tracking-widest">Project Name</span>
                                                                            <span className="text-[10px] font-bold text-[#2A2A2A]">{m.projectName}</span>
                                                                        </div>
                                                                    )}
                                                                    {m.projectPrice && (
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[8px] font-black text-[#A8A29E] uppercase tracking-widest">Project Price</span>
                                                                            <span className="text-[10px] font-bold text-[#B45309]">{m.projectPrice}</span>
                                                                        </div>
                                                                    )}
                                                                    {m.projectLocation && (
                                                                        <div className="flex flex-col sm:col-span-2">
                                                                            <span className="text-[8px] font-black text-[#A8A29E] uppercase tracking-widest">Project Location</span>
                                                                            <span className="text-[10px] font-bold text-[#2A2A2A]">{m.projectLocation}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2.5 shrink-0">
                                                            <div className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-[#A8A29E] bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E7E5E4]">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(m.createdAt).toLocaleDateString()} • {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                            {m.location?.latitude && (
                                                                <div className="flex items-start gap-1.5 text-[10px] text-[#B45309] font-bold max-w-[200px] text-right justify-end bg-orange-50/50 px-2.5 py-1.5 rounded-xl border border-orange-100">
                                                                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                                    <span
                                                                        className="leading-snug"
                                                                        title={m.location.placeName || placeNames[`${m.location.latitude},${m.location.longitude}`] || ''}
                                                                    >
                                                                        {m.location.placeName ||
                                                                         placeNames[`${m.location.latitude},${m.location.longitude}`] ||
                                                                         `${m.location.latitude.toFixed(4)}, ${m.location.longitude.toFixed(4)}`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Location History */}
                        <div className="p-4 bg-[#FAF7F2]/20">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-[#2A2A2A] text-white rounded-lg shadow-lg shadow-black/10">
                                        <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <h4 className="font-bold text-[#2A2A2A] text-sm font-serif uppercase tracking-tight">Tracking Breadcrumbs</h4>
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-emerald-100 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-widest">Digital Tether Active</span>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                {loadingHistory ? (
                                    <div className="space-y-4">
                                        {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-white rounded-2xl animate-pulse border border-[#E7E5E4]" />)}
                                    </div>
                                ) : history?.locations?.length === 0 ? (
                                    <div className="text-center py-20 bg-white/50 rounded-2xl border border-dashed border-[#E7E5E4]">
                                        <Map className="w-10 h-10 mx-auto mb-4 text-[#A8A29E] opacity-10" />
                                        <p className="text-[10px] text-[#A8A29E] font-bold uppercase tracking-[0.2em]">No telemetry data ingested</p>
                                    </div>
                                ) : (
                                    <div className="relative pl-8 space-y-6 pb-4">
                                        {/* Advanced Path Line */}
                                        <div className="absolute left-[13px] top-4 bottom-4 w-1 bg-[#E7E5E4] rounded-full overflow-hidden">
                                            <div className="w-full h-1/3 bg-gradient-to-b from-[#B45309] to-transparent" />
                                        </div>
                                        
                                        {history?.locations?.map((l: any, idx: number) => (
                                            <div key={l._id || l.id} className="relative flex items-center justify-between p-3 rounded-2xl bg-white border border-[#E7E5E4] shadow-sm hover:border-[#B45309]/30 hover:shadow-lg hover:shadow-[#B45309]/5 transition-all group">
                                                {/* Timeline Node */}
                                                <div className={`absolute -left-[27px] w-5 h-5 rounded-full border-4 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-125 ${idx === 0 ? 'bg-[#B45309]' : 'bg-[#D6D3D1]'}`}>
                                                    {idx === 0 && <div className="w-full h-full rounded-full bg-orange-400 animate-ping opacity-50" />}
                                                </div>

                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className={`p-2 rounded-xl transition-all ${idx === 0 ? 'bg-[#B45309]/10 text-[#B45309]' : 'bg-[#FAF7F2] text-[#A8A29E] group-hover:text-[#B45309]'}`}>
                                                        <Map className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">{idx === 0 ? 'Latest Coordinate' : `Checkpoint ${history.locations.length - idx}`}</span>
                                                            {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                                                        </div>
                                                        <span
                                                            className="text-xs text-[#2A2A2A] font-bold leading-snug block"
                                                            title={l.placeName || placeNames[`${l.latitude},${l.longitude}`] || ''}
                                                        >
                                                            {l.placeName ||
                                                             placeNames[`${l.latitude},${l.longitude}`] ||
                                                             `${l.latitude.toFixed(5)}, ${l.longitude.toFixed(5)}`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[#57534E] font-mono bg-[#FAF7F2] px-2.5 py-1.5 rounded-xl border border-[#E7E5E4]">
                                                        <Clock className="w-3.5 h-3.5 text-[#B45309]" /> 
                                                        {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>

                                                {/* Inset metadata for first item */}
                                                {idx === 0 && (
                                                    <div className="absolute -bottom-2 -right-2 px-2 py-0.5 bg-black text-white text-[7px] font-black uppercase tracking-tighter rounded-sm rotate-1 flex items-center gap-1">
                                                        <Activity className="w-2 h-2" /> Real-time Ingestion
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E7E5E4;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #B45309;
                }
                @font-face {
                    font-family: 'DM Serif Display';
                    src: url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap');
                }
            `}</style>
        </div>
    );
}
