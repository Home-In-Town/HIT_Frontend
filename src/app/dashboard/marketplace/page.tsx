'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/authContext';
import { marketplaceApi, MarketplaceListing } from '@/lib/api';
import toast from 'react-hot-toast';

const ACTION_TYPES = [
  { key: 'viewed', label: 'View', icon: '👁️', weight: 5 },
  { key: 'inquired', label: 'Inquiry', icon: '💬', weight: 15 },
  { key: 'shared', label: 'Share', icon: '📤', weight: 10 },
  { key: 'claimed', label: 'Claim', icon: '🤝', weight: 30 },
  { key: 'deal_closed', label: 'Close Deal', icon: '✅', weight: 100 },
];

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Paused: 'bg-amber-50 text-amber-700 border-amber-200',
  Sold: 'bg-blue-50 text-blue-700 border-blue-200',
  Closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

/* helpers to safely read populated fields */
function getProjectField(listing: MarketplaceListing) {
  if (typeof listing.project === 'string') return { name: 'Project', city: '', location: '', price: 0, area: '' };
  return {
    name: listing.project?.projectName || 'Untitled Project',
    city: listing.project?.city || '',
    location: listing.project?.location || '',
    price: listing.project?.pricing?.startingPrice || listing.expectedValue || 0,
    area: listing.project?.configuration?.carpetAreaRange || '',
  };
}

function getListedBy(listing: MarketplaceListing) {
  if (typeof listing.listedBy === 'string') return { _id: listing.listedBy, name: 'Unknown', role: '' };
  return { _id: listing.listedBy._id, name: listing.listedBy.name || 'Unknown', role: listing.listedBy.role || '' };
}

export default function MarketplacePage() {
  const { user } = useAuth();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [myListings, setMyListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'mine'>('browse');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<MarketplaceListing | null>(null);
  const [formData, setFormData] = useState({
    project: '',
    listingType: 'selling' as 'selling' | 'buying',
    commissionPercentage: '2.5',
    description: '',
    expectedValue: '',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [projects, setProjects] = useState<any[]>([]);

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      const [all, mine] = await Promise.all([
        marketplaceApi.getListings(),
        marketplaceApi.getMyListings(),
      ]);
      setListings(all);
      setMyListings(mine);
    } catch (err: any) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user's projects for the create form
  const fetchProjects = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      const res = await fetch(`${API_URL}/projects`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : data.projects || []);
      }
    } catch {
      // silently fail — project list is optional
    }
  };

  useEffect(() => {
    fetchListings();
    fetchProjects();
  }, [fetchListings]);

  const handleCreate = async () => {
    if (!formData.project) {
      toast.error('Please select a project');
      return;
    }
    try {
      await marketplaceApi.createListing({
        project: formData.project,
        listingType: formData.listingType,
        commissionPercentage: Number(formData.commissionPercentage) || 2.5,
        description: formData.description,
        expectedValue: Number(formData.expectedValue) || 0,
      });
      setShowCreateModal(false);
      setFormData({ project: '', listingType: 'selling', commissionPercentage: '2.5', description: '', expectedValue: '' });
      toast.success('Listing published!');
      fetchListings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create listing');
    }
  };

  const handleTrackAction = async (listingId: string, actionType: string) => {
    try {
      await marketplaceApi.trackAction(listingId, actionType);
      toast.success(`Action "${actionType}" tracked`);
      fetchListings();
    } catch (err: any) {
      toast.error(err.message || 'Failed to track action');
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return '—';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  const renderListingCard = (listing: MarketplaceListing, showActions = true) => {
    const proj = getProjectField(listing);
    const owner = getListedBy(listing);
    const isOwnListing = owner._id === user?.id || owner._id === (user as any)?._id;

    return (
      <div
        key={listing._id}
        className="group bg-white rounded-2xl border border-[#E7E5E4] hover:border-[#B45309]/30 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer"
        onClick={() => setShowDetailModal(listing)}
      >
        {/* Image / Gradient Header */}
        <div className="h-36 bg-gradient-to-br from-[#B45309]/20 via-[#D97706]/10 to-[#F59E0B]/5 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-12 h-12 text-[#B45309]/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border ${listing.listingType === 'selling' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
              {listing.listingType === 'selling' ? 'FOR SALE' : 'WANTED'}
            </span>
          </div>
          <div className="absolute top-3 right-3">
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border ${STATUS_COLORS[listing.status] || STATUS_COLORS.Active}`}>
              {listing.status}
            </span>
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-sm font-bold text-[#B45309]">
              {formatPrice(proj.price)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-bold text-[#2A2A2A] mb-1 line-clamp-1 group-hover:text-[#B45309] transition-colors">
            {proj.name}
          </h3>
          {(proj.city || proj.location) && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {proj.location || proj.city}
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-gray-400">
            {proj.area && <span className="bg-[#FAF7F2] px-2 py-1 rounded-md font-medium">{proj.area}</span>}
            <span className="text-[#B45309] font-semibold">{listing.commissionPercentage}% comm</span>
            <span className="text-gray-400">👁️ {listing.viewsCount}</span>
          </div>

          {/* Action Buttons */}
          {showActions && !isOwnListing && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex gap-1.5 flex-wrap">
                {ACTION_TYPES.slice(0, 3).map(action => (
                  <button
                    key={action.key}
                    onClick={e => { e.stopPropagation(); handleTrackAction(listing._id, action.key); }}
                    className="px-2.5 py-1 bg-[#FAF7F2] hover:bg-[#B45309] hover:text-white text-gray-600 text-[10px] font-medium rounded-lg transition-colors"
                  >
                    {action.icon} {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Header */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#2A2A2A] font-serif">Marketplace</h1>
            <p className="text-xs text-gray-400 mt-0.5">Buy &amp; sell projects, earn commissions</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#FAF7F2] rounded-xl p-1 border border-[#E7E5E4]">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'browse' ? 'bg-[#B45309] text-white shadow-sm' : 'text-gray-500'}`}
              >
                Browse All
              </button>
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'mine' ? 'bg-[#B45309] text-white shadow-sm' : 'text-gray-500'}`}
              >
                My Listings
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#B45309] text-white rounded-xl text-sm font-medium hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#B45309] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(activeTab === 'browse' ? listings : myListings).map(l => renderListingCard(l, activeTab === 'browse'))}
            {(activeTab === 'browse' ? listings : myListings).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="text-sm font-medium">No listings found</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-[#B45309] font-medium hover:underline"
                >
                  Publish your first project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#2A2A2A] font-serif">Publish to Marketplace</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto max-h-[65vh]">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Select Project *</label>
                <select
                  value={formData.project}
                  onChange={e => setFormData(p => ({ ...p, project: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 bg-white"
                >
                  <option value="">Choose a project...</option>
                  {projects.map((proj: any) => (
                    <option key={proj._id} value={proj._id}>
                      {proj.projectName || proj.name || 'Untitled'} — {proj.city || proj.location || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Listing Type</label>
                  <select
                    value={formData.listingType}
                    onChange={e => setFormData(p => ({ ...p, listingType: e.target.value as 'selling' | 'buying' }))}
                    className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 bg-white"
                  >
                    <option value="selling">Selling</option>
                    <option value="buying">Looking to Buy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Expected Value (₹)</label>
                  <input
                    type="number"
                    value={formData.expectedValue}
                    onChange={e => setFormData(p => ({ ...p, expectedValue: e.target.value }))}
                    className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                    placeholder="5000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Commission % (default 2.5%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.commissionPercentage}
                  onChange={e => setFormData(p => ({ ...p, commissionPercentage: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20"
                  placeholder="2.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description / Pitch</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#E7E5E4] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 resize-none"
                  placeholder="Describe why this project is a great deal..."
                />
              </div>
              <button
                onClick={handleCreate}
                className="w-full px-4 py-2.5 bg-[#B45309] text-white rounded-xl text-sm font-medium hover:bg-[#92400E] transition-colors shadow-lg shadow-[#B45309]/20"
              >
                Publish Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listing Detail Modal */}
      {showDetailModal && (() => {
        const proj = getProjectField(showDetailModal);
        const owner = getListedBy(showDetailModal);
        const isOwnListing = owner._id === user?.id || owner._id === (user as any)?._id;

        return (
          <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDetailModal(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
              <div className="h-48 bg-gradient-to-br from-[#B45309]/20 via-[#D97706]/10 to-[#F59E0B]/5 relative">
                <button
                  onClick={() => setShowDetailModal(null)}
                  className="absolute top-4 right-4 p-1.5 bg-white/80 rounded-lg hover:bg-white transition-colors"
                >
                  <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-xl text-lg font-bold text-[#B45309]">
                    {formatPrice(proj.price)}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-lg border ${STATUS_COLORS[showDetailModal.status] || STATUS_COLORS.Active}`}>
                    {showDetailModal.status}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h2 className="text-xl font-bold text-[#2A2A2A] font-serif">{proj.name}</h2>
                {(proj.city || proj.location) && (
                  <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {proj.location || proj.city}
                  </div>
                )}
                {showDetailModal.description && (
                  <p className="text-sm text-gray-600 mt-3 leading-relaxed">{showDetailModal.description}</p>
                )}

                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Type</p>
                    <p className="text-sm font-bold text-[#2A2A2A] capitalize mt-0.5">{showDetailModal.listingType}</p>
                  </div>
                  <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Views</p>
                    <p className="text-sm font-bold text-[#2A2A2A] mt-0.5">{showDetailModal.viewsCount}</p>
                  </div>
                  <div className="bg-[#FAF7F2] rounded-xl p-3 text-center">
                    <p className="text-[10px] text-gray-400 uppercase font-medium">Commission</p>
                    <p className="text-sm font-bold text-[#B45309] mt-0.5">{showDetailModal.commissionPercentage}%</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B45309] to-[#D97706] flex items-center justify-center text-white text-xs font-bold">
                    {owner.name[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#2A2A2A]">{owner.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{owner.role}</p>
                  </div>
                </div>

                {/* Actions */}
                {!isOwnListing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Take Action</p>
                    <div className="flex flex-wrap gap-2">
                      {ACTION_TYPES.map(action => (
                        <button
                          key={action.key}
                          onClick={() => handleTrackAction(showDetailModal._id, action.key)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF7F2] hover:bg-[#B45309] hover:text-white text-gray-600 text-xs font-medium rounded-xl transition-colors"
                        >
                          <span>{action.icon}</span>
                          {action.label}
                          <span className="text-[10px] opacity-60">+{action.weight}%</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
