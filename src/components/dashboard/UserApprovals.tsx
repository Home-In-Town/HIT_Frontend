'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, MockUser } from '@/lib/api';
import toast from 'react-hot-toast';
import { UserCheck, Shield, Building2, User as UserIcon, Loader2, XCircle } from 'lucide-react';

export default function UserApprovals() {
    const [users, setUsers] = useState<MockUser[]>([]);
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
        <div className="bg-[#FAF7F2] border border-[#E7E5E4] rounded-[2.5rem] p-24 text-center shadow-inner">
            <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-[#E7E5E4]">
                <UserCheck className="w-10 h-10 text-[#B45309] opacity-30" />
            </div>
            <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">System is up to date</h3>
            <p className="text-[#57534E] font-medium mt-2">No pending user approvals at this time.</p>
        </div>
    );

    return (
        <div className="overflow-hidden border border-[#E7E5E4] rounded-[2rem] bg-white shadow-2xl shadow-[#B45309]/5">
            <table className="min-w-full divide-y divide-[#E7E5E4] text-left">
                <thead className="bg-[#FAF7F2]">
                    <tr>
                        <th className="px-6 py-5 text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">User Details</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em]">Phone</th>
                        <th className="px-6 py-5 text-[10px] font-bold text-[#A8A29E] uppercase tracking-[0.2em] text-right">Assign Role</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4]/50">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-[#FAF7F2]/30 transition-colors group">
                            <td className="px-6 py-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold uppercase text-lg border border-[#B45309]/20 shadow-sm transition-transform group-hover:scale-110">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#2A2A2A] font-serif transition-colors group-hover:text-[#B45309]">{user.name}</div>
                                        <div className="text-xs text-[#57534E] font-medium mt-0.5">{user.email || 'No email provided'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-5 text-sm font-mono text-[#57534E] font-bold">
                                {user.phone}
                            </td>
                            <td className="px-6 py-5 text-right">
                                <div className="flex items-center justify-end gap-3">
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'agent')}
                                        disabled={updating === user.id}
                                        className="px-4 py-2 hover:bg-[#FAF7F2] text-[#57534E] hover:text-[#B45309] rounded-xl transition-all border border-[#E7E5E4] hover:border-[#B45309] flex items-center gap-2 text-xs font-bold shadow-sm cursor-pointer"
                                        title="Assign Agent"
                                    >
                                        <UserIcon className="w-4 h-4" /> Agent
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'builder')}
                                        disabled={updating === user.id}
                                        className="px-4 py-2 bg-[#B45309] text-white rounded-xl transition-all border border-transparent hover:bg-[#92400E] flex items-center gap-2 text-xs font-bold shadow-md shadow-[#B45309]/20 cursor-pointer"
                                        title="Assign Builder"
                                    >
                                        <Building2 className="w-4 h-4" /> Builder
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'user')}
                                        disabled={updating === user.id}
                                        className="px-4 py-2 hover:bg-red-50 text-red-600 rounded-xl transition-all border border-red-200 hover:border-red-400 flex items-center gap-2 text-xs font-bold cursor-pointer"
                                        title="Reject User"
                                    >
                                        <XCircle className="w-4 h-4 text-red-500" /> Reject
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
