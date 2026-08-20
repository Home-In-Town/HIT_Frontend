'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, AuthUser } from '@/lib/api';
import toast from 'react-hot-toast';
import { UserCheck, Shield, Building2, User as UserIcon, Loader2, XCircle } from 'lucide-react';

export default function UserApprovals() {
    const [users, setUsers] = useState<AuthUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchUnassignedUsers();
    }, []);

    async function fetchUnassignedUsers() {
        try {
            setLoading(true);
            // Assuming your backend supports ?role=unassigned
            const data = await usersApi.getAll('unassigned');
            setUsers(data);
        } catch (error) {
            console.error('Failed to fetch users:', error);
            // toast.error('Failed to load pending users');
        } finally {
            setLoading(false);
        }
    }

    async function handleAssignRole(userId: string, role: string) {
        try {
            setUpdating(userId);
            await usersApi.assignRole(userId, role);
            toast.success(`Role assigned: ${role}`);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdating(null);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center p-24 bg-white/50 rounded-[2rem] border border-[#E7E5E4] border-dashed">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#B45309]" />
        </div>
    );

    if (users.length === 0) return (
        <div className="py-2 flex items-center gap-3 animate-in fade-in duration-700">
            <div className="h-px bg-[#E7E5E4] flex-1" />
            <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.25em]">No new approval</p>
            <div className="h-px bg-[#E7E5E4] flex-1" />
        </div>
    );

    return (
        <div className="overflow-hidden border border-[#E7E5E4] rounded-2xl bg-white shadow-sm">
            <table className="min-w-full divide-y divide-[#E7E5E4] text-left">
                <thead className="bg-[#FAF7F2]">
                    <tr>
                        <th className="px-5 py-3 text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] w-12">#</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">User Details</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Phone</th>
                        <th className="px-5 py-3 text-[9px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] text-right">Assign Role</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]/40">
                    {users.map((user, index) => (
                        <tr key={user.id} className="hover:bg-[#FAF7F2]/40 transition-colors group">
                            <td className="px-5 py-3.5">
                                <span className="text-[10px] font-mono font-black text-[#B45309]/40 group-hover:text-[#B45309] transition-colors tabular-nums">
                                    {(index + 1).toString().padStart(2, '0')}
                                </span>
                            </td>
                            <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#B45309]/5 flex items-center justify-center text-[#B45309] font-bold uppercase text-xs border border-[#B45309]/10 shadow-sm transition-transform group-hover:scale-105">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-[#2A2A2A] font-serif transition-colors group-hover:text-[#B45309] leading-tight">{user.name}</div>
                                        <div className="text-[9px] text-[#A8A29E] font-bold uppercase tracking-wider mt-0.5">{user.email || 'No email established'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-3.5 text-[10px] font-mono text-[#57534E] font-bold tabular-nums">
                                {user.phone}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'agent')}
                                        disabled={updating === user.id}
                                        className="h-7 px-2.5 bg-white text-[#57534E] hover:text-[#B45309] rounded-lg transition-all border border-[#E7E5E4] hover:border-[#B45309] flex items-center gap-1.5 text-[9px] font-bold shadow-sm cursor-pointer active:scale-95"
                                        title="Grant Field Access"
                                    >
                                        <UserIcon className="w-3 h-3" /> Agent
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'builder')}
                                        disabled={updating === user.id}
                                        className="h-7 px-2.5 bg-[#B45309] text-white rounded-lg transition-all border border-[#B45309]/10 hover:bg-[#92400E] flex items-center gap-1.5 text-[9px] font-bold shadow-sm cursor-pointer active:scale-95"
                                        title="Grant Administrative Access"
                                    >
                                        <Building2 className="w-3 h-3" /> Builder
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'user')}
                                        disabled={updating === user.id}
                                        className="h-7 px-2.5 hover:bg-red-50 text-[#A8A29E] hover:text-red-600 rounded-lg transition-all border border-[#E7E5E4] hover:border-red-200 flex items-center gap-1.5 text-[9px] font-bold cursor-pointer active:scale-95"
                                        title="Decline Personnel"
                                    >
                                        <XCircle className="w-3 h-3" /> Decline
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
