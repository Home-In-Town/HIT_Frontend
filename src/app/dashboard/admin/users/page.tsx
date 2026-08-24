'use client';

import { useState, useEffect, useCallback } from 'react';
import { usersApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface CaptainUser {
  id: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  role: string;
  rating: number;
  ratingCount: number;
  verificationStatus: { builder?: string; agent?: string };
  businessCity?: string;
  businessLogoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [captains, setCaptains] = useState<CaptainUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingModal, setRatingModal] = useState<{ user: CaptainUser; tempRating: number } | null>(null);

  const fetchCaptains = useCallback(async () => {
    try {
      setLoading(true);
      const allUsers = await usersApi.getAll();
      // Filter captains and builders only
      const filtered = allUsers.filter((u: any) => u.role === 'captain' || u.role === 'builder');
      setCaptains(filtered as unknown as CaptainUser[]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaptains(); }, [fetchCaptains]);

  const handleSetRating = async () => {
    if (!ratingModal) return;
    try {
      await usersApi.setRating(ratingModal.user.id, ratingModal.tempRating);
      toast.success(`Rating set to ${ratingModal.tempRating} stars`);
      setRatingModal(null);
      fetchCaptains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to set rating');
    }
  };

  const handleVerify = async (userId: string, status: 'verified' | 'pending' | 'unverified') => {
    try {
      await usersApi.setVerification(userId, status);
      toast.success(`Verification status updated to "${status}"`);
      fetchCaptains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update verification');
    }
  };

  const filteredCaptains = captains.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) ||
      c.companyName?.toLowerCase().includes(term) ||
      c.phone.includes(term);
  });

  const renderStars = (rating: number, interactive?: boolean, onSelect?: (r: number) => void) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => onSelect?.(i)}
          className={`${interactive ? 'cursor-pointer hover:scale-125' : 'cursor-default'} transition-transform`}
        >
          <svg className={`w-5 h-5 ${i <= rating ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </button>
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const getVerificationBadge = (status?: string) => {
    switch (status) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          Verified
        </span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>
          Pending
        </span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-bold rounded-full border border-gray-200">
          Unverified
        </span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif">User Management</h1>
        <p className="text-sm text-[#57534E] mt-1">Manage captains — set ratings and verification status</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, company, or phone..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-2xl font-bold text-[#2A2A2A]">{captains.length}</p>
          <p className="text-xs text-[#57534E]">Total Captains</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-2xl font-bold text-emerald-600">{captains.filter(c => c.verificationStatus?.builder === 'verified').length}</p>
          <p className="text-xs text-[#57534E]">Verified</p>
        </div>
        <div className="bg-white rounded-xl border border-[#E7E5E4] p-4">
          <p className="text-2xl font-bold text-amber-600">{captains.filter(c => c.rating > 0).length}</p>
          <p className="text-xs text-[#57534E]">Rated</p>
        </div>
      </div>

      {/* Captain List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredCaptains.length === 0 ? (
        <div className="text-center py-12 text-[#57534E]">
          <p className="text-sm">No captains found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCaptains.map(captain => (
            <div key={captain.id} className="bg-white rounded-2xl border border-[#E7E5E4] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                {captain.businessLogoUrl ? (
                  <img src={captain.businessLogoUrl} alt={captain.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[#B45309] font-bold text-lg">
                    {captain.name.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#2A2A2A]">{captain.companyName || captain.name}</h3>
                    {getVerificationBadge(captain.verificationStatus?.builder)}
                  </div>
                  {captain.companyName && (
                    <p className="text-xs text-[#57534E]">{captain.name}</p>
                  )}
                  <p className="text-[11px] text-[#57534E] mt-0.5">{captain.phone} {captain.businessCity ? `· ${captain.businessCity}` : ''}</p>
                </div>

                {/* Rating */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    {renderStars(captain.rating)}
                    <span className="text-xs text-[#57534E]">{captain.rating > 0 ? captain.rating.toFixed(1) : '—'}</span>
                  </div>
                  <button
                    onClick={() => setRatingModal({ user: captain, tempRating: captain.rating || 3 })}
                    className="px-3 py-1 text-[10px] font-bold text-[#B45309] border border-[#B45309]/30 rounded-lg hover:bg-[#B45309]/5 transition-colors"
                  >
                    Set Rating
                  </button>
                </div>

                {/* Verification Actions */}
                <div className="flex flex-col items-end gap-1.5 ml-4">
                  {captain.verificationStatus?.builder !== 'verified' ? (
                    <button
                      onClick={() => handleVerify(captain.id, 'verified')}
                      className="px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      Verify
                    </button>
                  ) : (
                    <button
                      onClick={() => handleVerify(captain.id, 'unverified')}
                      className="px-3 py-1.5 text-[10px] font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setRatingModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[#E7E5E4]">
              <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Set Rating</h2>
              <p className="text-xs text-[#57534E] mt-1">{ratingModal.user.companyName || ratingModal.user.name}</p>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div className="flex items-center gap-1">
                {renderStars(ratingModal.tempRating, true, (r) => setRatingModal({ ...ratingModal, tempRating: r }))}
              </div>
              <p className="text-2xl font-bold text-[#B45309]">{ratingModal.tempRating} / 5</p>
              <div className="flex gap-3 w-full pt-2">
                <button onClick={() => setRatingModal(null)} className="flex-1 py-2.5 border border-[#E7E5E4] text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button onClick={handleSetRating} className="flex-1 py-2.5 bg-[#B45309] text-white text-sm font-bold rounded-xl hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20">Save Rating</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
