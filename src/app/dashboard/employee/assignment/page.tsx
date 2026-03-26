'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { employeeApi } from '@/lib/api';
import { CheckCircle, XCircle, Clock, Building } from 'lucide-react';

export default function AssignmentPage() {
    const { user, setUser, checkAuth } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            await employeeApi.confirmAssignment();

            // Successfully confirmed, trigger re-check of auth to get updated user
            await checkAuth();
            router.push('/dashboard/employee');
        } catch (err: any) {
            setError(err.message || 'Failed to confirm assignment');
            setLoading(false);
        }
    };

    // If there is no employer id assigned yet
    if (!user?.employerId) {
        return (
            <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6 text-[#2A2A2A] relative overflow-hidden font-sans">
                 <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-[#B45309]/5 rounded-full blur-3xl pointer-events-none" />
                 <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-[#3F6212]/5 rounded-full blur-3xl pointer-events-none" />
                 <div className="max-w-md w-full text-center space-y-8 z-10">
                    <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-[2rem] flex items-center justify-center border border-[#B45309]/20 shadow-xl shadow-[#B45309]/5">
                        <Clock className="w-10 h-10 text-[#B45309]" />
                    </div>
                    <div className="space-y-3">
                        <h1 className="text-4xl font-bold font-serif tracking-tight">Pending <span className="text-[#B45309]">Assignment</span></h1>
                        <p className="text-[#57534E] leading-relaxed">
                            Hello <span className="text-[#2A2A2A] font-bold">{user?.name}</span>, you are currently not assigned to any employer. 
                            Please contact your manager to request an assignment.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Employer is assigned, needing confirmation
    return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6 text-[#2A2A2A] relative overflow-hidden font-sans">
             <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-[#B45309]/5 rounded-full blur-3xl pointer-events-none" />
             <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-[#3F6212]/5 rounded-full blur-3xl pointer-events-none" />
             
             <div className="max-w-md w-full text-center space-y-8 z-10">
                <div className="mx-auto w-20 h-20 bg-[#B45309]/10 rounded-[2rem] flex items-center justify-center border border-[#B45309]/20 shadow-xl shadow-[#B45309]/5">
                    <Building className="w-10 h-10 text-[#B45309]" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-4xl font-bold font-serif tracking-tight">Assignment <span className="text-[#B45309]">Request</span></h1>
                    <p className="text-[#57534E] leading-relaxed">
                        Hello <span className="text-[#2A2A2A] font-bold">{user?.name}</span>, an employer has requested to assign you to their organization.
                    </p>
                </div>

                <div className="bg-white border border-[#E7E5E4] rounded-[2rem] p-8 shadow-sm text-left">
                    <p className="font-bold text-gray-700 mb-2">Employer Details:</p>
                    <p className="text-lg text-gray-900">{typeof user.employerId === 'object' ? user.employerId.name : 'Unknown Employer'}</p>
                    <p className="text-sm text-gray-500 mt-1">Please confirm if you work for this employer.</p>
                </div>

                {error && (
                    <div className="text-red-500 text-sm mt-2">{error}</div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button 
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 bg-[#2A2A2A] text-white px-6 py-3 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Confirming...' : (
                            <>
                                <CheckCircle className="w-5 h-5 text-[#B45309]" />
                                Confirm Assignment
                            </>
                        )}
                    </button>
                    {/* Add decline functionality later if needed */}
                </div>
            </div>
        </div>
    );
}
