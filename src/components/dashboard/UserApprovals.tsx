'use client';

import React, { useEffect, useState } from 'react';
import { usersApi, MockUser } from '@/lib/api';
import toast from 'react-hot-toast';
import { UserCheck, Shield, Building2, User as UserIcon, Loader2 } from 'lucide-react';

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
        <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
    );

    if (users.length === 0) return (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-12 text-center">
            <UserCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No pending user approvals</p>
        </div>
    );

    return (
        <div className="overflow-hidden border border-gray-200 rounded-xl bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">User Details</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Phone</th>
                        <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Assign Role</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold uppercase">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{user.name}</div>
                                        <div className="text-sm text-gray-500">{user.email || 'No email provided'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-mono text-gray-600">
                                {user.phone}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'agent')}
                                        disabled={updating === user.id}
                                        className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100 flex items-center gap-1.5 text-xs font-bold"
                                        title="Assign Agent"
                                    >
                                        <UserIcon className="w-4 h-4" /> Agent
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'builder')}
                                        disabled={updating === user.id}
                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors border border-transparent hover:border-blue-100 flex items-center gap-1.5 text-xs font-bold"
                                        title="Assign Builder"
                                    >
                                        <Building2 className="w-4 h-4" /> Builder
                                    </button>
                                    <button 
                                        onClick={() => handleAssignRole(user.id, 'admin')}
                                        disabled={updating === user.id}
                                        className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors border border-transparent hover:border-orange-100 flex items-center gap-1.5 text-xs font-bold"
                                        title="Assign Admin"
                                    >
                                        <Shield className="w-4 h-4" /> Admin
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
