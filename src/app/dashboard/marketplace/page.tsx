'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/authContext';
import { marketplaceApi, projectsApi, MarketplaceListing } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PlusIcon,
  MapPinIcon,
  BanknotesIcon,
  TagIcon,
  EyeIcon,
  ArrowUpRightIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  NoSymbolIcon,
  ShareIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-50 text-emerald-700 border-zinc-200',
  Paused: 'bg-amber-50 text-amber-700 border-zinc-200',
  Sold: 'bg-blue-50 text-blue-700 border-zinc-200',
  Closed: 'bg-zinc-100 text-zinc-500 border-zinc-200',
};

/* helper to parse project detail safely */
function getProjectDetails(item: MarketplaceListing | any) {
  // Check if it's a standalone buying listing without a project
  if (item?.listingType === 'buying' && !item?.project) {
    // Extract location from description if it was saved like "TARGET LOCATION: Nagpur\n\n..."
    let location = 'Any Location';
    let cleanDesc = item.description || '';
    if (cleanDesc.startsWith('TARGET LOCATION: ')) {
      const newLineIndex = cleanDesc.indexOf('\n');
      if (newLineIndex !== -1) {
        location = cleanDesc.substring('TARGET LOCATION: '.length, newLineIndex).trim();
      } else {
        location = cleanDesc.substring('TARGET LOCATION: '.length).trim();
      }
    }

    return {
      _id: item._id || item.id,
      name: `Requirement: ${location}`,
      city: getBaseCity(location),
      location: location,
      price: item.expectedValue || 0,
      pricePerSqFt: 0,
      area: '',
      media: null,
      listedBy: item.listedBy?.name || item.listedBy?.companyName || 'Owner',
      listedByPhone: (item.listedBy as any)?.phone || '',
      role: item.listedBy?.role || 'Collaborator',
      type: 'requirement'
    };
  }

  // item can be a MarketplaceListing (with .project) or a direct Project object.
  const project = item?.project || item || {};

  // Robust ID extraction
  const idValue = project._id || project.id || item?._id || item?.id;
  const id = idValue ? String(idValue) : Math.random().toString(36).substr(2, 9);

  // Consistent name extraction
  const name = project.projectName || project.name || 'Untitled Project';

  // Consistent images: handle both raw (media.coverImage.url) and transformed (coverImage.url)
  let imageUrl = null;
  if (project.media?.coverImage?.url) {
    imageUrl = project.media.coverImage.url;
  } else if (project.coverImage?.url) {
    imageUrl = project.coverImage.url;
  } else if (typeof project.coverImage === 'string') {
    imageUrl = project.coverImage;
  }

  // Consistent pricing
  const price = project.pricing?.startingPrice || project.startingPrice || item?.expectedValue || 0;
  const pricePerSqFt = project.pricing?.pricePerSqFt || project.pricePerSqFt || 0;

  // Consistent area
  const area =
    project.configuration?.carpetAreaRange ||
    project.configuration?.plotSizeRange ||
    project.carpetAreaRange ||
    project.plotSizeRange ||
    project.projectArea ||
    '';

  // Listed By information
  const listedBy = item.listedBy?.name || item.listedBy?.companyName || project.owner?.name || 'Owner';
  const listedByPhone = (item.listedBy as any)?.phone || (project.owner as any)?.phone || (item as any).listedByPhone || '';
  const role = item.listedBy?.role || project.owner?.role || 'Owner';

  return {
    _id: id,
    name,
    city: project.city || 'Unknown City',
    location: project.location || '',
    price,
    pricePerSqFt,
    area,
    media: imageUrl,
    listedBy,
    listedByPhone,
    role,
    type: project.projectType || project.type || 'flat',
    slug: project.slug || ''
  };
}

const getBaseCity = (cityStr: string) => {
  if (!cityStr || cityStr === 'Unknown City') return cityStr;
  const parts = cityStr.split(',').map(s => s.trim()).filter(Boolean);
  const nonNumeric = parts.filter(p => !/\d/.test(p));
  return nonNumeric[nonNumeric.length - 1] || parts[0] || '';
};

export default function MarketplacePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellAndEarn, setSellAndEarn] = useState(false);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<MarketplaceListing | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'listings' | 'admin'>('browse');
  const [activeView, setActiveView] = useState<'All' | 'Buy' | 'Sell'>('All');
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [adminActions, setAdminActions] = useState<any[]>([]);
  const [updatingActionId, setUpdatingActionId] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Form State
  const [formData, setFormData] = useState({
    project: '',
    listingType: 'selling' as 'selling' | 'buying',
    commissionType: 'percentage' as 'percentage' | 'fixed',
    commissionValue: '2.5',
    description: '',
    expectedValue: '',
    location: '',
  });

  const fetchAdminActions = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const actions = await marketplaceApi.getAllActions();
      setAdminActions(actions);
    } catch (err) {
      console.error('[Marketplace] Error fetching admin actions:', err);
    }
  }, [isAdmin]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [listingsData, projectsData, actionsData] = await Promise.all([
          marketplaceApi.getListings(),
          projectsApi.getAll(),
          marketplaceApi.getAllActions()
        ]);
        setListings(listingsData);
        setProjects(projectsData);
        setAdminActions(actionsData);
      } else {
        const [listingsData, publicProjects, myProjects] = await Promise.all([
          marketplaceApi.getListings(),
          projectsApi.getAllPublic(),
          projectsApi.getAll()
        ]);
        setListings(listingsData);
        
        // Merge uniquely
        const merged = [...publicProjects];
        myProjects.forEach(p => {
           if (!merged.find(item => String(item.id || (item as any)._id) === String(p.id || (p as any)._id))) {
             merged.push(p);
           }
        });
        setProjects(merged);
      }
    } catch (err: any) {
      console.error('[Marketplace] Error fetching data:', err);
      toast.error('Failed to sync marketplace data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const cities = useMemo(() => {
    const list = new Set(['All Cities']);
    projects.forEach(p => {
      const clean = getBaseCity(p.city || '');
      if (clean) list.add(clean);
    });
    listings.forEach(l => {
      const details = getProjectDetails(l);
      const clean = getBaseCity(details.city || '');
      if (clean) list.add(clean);
    });
    return Array.from(list).sort();
  }, [projects, listings]);

  const unlistedProjects = useMemo(() => {
    const listedProjectIds = new Set(listings.map(l => {
      const projId = typeof l.project === 'object' ? (l.project as any)?._id : l.project;
      return projId ? String(projId) : null;
    }).filter(Boolean));

    const currentUserId = user?.id || (user as any)?._id;

    return projects.filter(p => {
      const ownerId = typeof p.owner === 'object' ? (p.owner as any)?._id || (p.owner as any)?.id : p.owner;
      const isMine = ownerId && currentUserId && String(ownerId) === String(currentUserId);
      return isMine && !listedProjectIds.has(String(p.id));
    });
  }, [projects, listings, user]);

  const myListedProjects = useMemo(() => {
    return listings.filter(l => {
      const ownerId = typeof l.listedBy === 'object' ? (l.listedBy as any)?._id || (l.listedBy as any)?.id : l.listedBy;
      const currentUserId = user?.id || (user as any)?._id;
      return ownerId && currentUserId && String(ownerId) === String(currentUserId);
    });
  }, [listings, user]);

  useEffect(() => {
    const filterAndProcessItems = () => {
      // 1. Select source
      let sourceItems = [];
      if (activeTab === 'browse') {
        // Start with all published projects
        const baseProjects = [...projects];

        // Ensure projects referenced in selling listings are included (even if NOT published)
        // This satisfies "only published and listed" - a listed project is NOT a draft in this context.
        listings.forEach(l => {
          if (l.listingType === 'selling' && l.project && typeof l.project === 'object') {
            const projId = (l.project as any)._id || (l.project as any).id;
            if (!baseProjects.find(p => String(p._id || p.id) === String(projId))) {
              baseProjects.push(l.project);
            }
          }
        });

        sourceItems = baseProjects;

        // ALSO include stand-alone listings (Requirements) that aren't tied to a project in 'projects'
        const standaloneRequirements = listings.filter(l => {
          if (l.listingType !== 'buying') return false;
          const projId = typeof l.project === 'object' ? (l.project as any)?._id : l.project;
          return !projId || !baseProjects.find(p => String(p._id || p.id) === String(projId));
        });
        sourceItems = [...sourceItems, ...standaloneRequirements];
      } else {
        sourceItems = myListedProjects;
      }

      // 2. Map to UI format
      let processed = sourceItems.map(item => {
        // If it's already a listing object, use it. Otherwise find it.
        const listing = item.listingType ? item : listings.find(l => {
          const projId = typeof l.project === 'object' ? (l.project as any)?._id : l.project;
          const currentId = item._id || item.id;
          return projId && currentId && String(projId) === String(currentId);
        });

        const details = getProjectDetails(listing || item);

        return {
          ...item,
          ...details,
          isListing: !!listing,
          listingType: listing?.listingType || item.listingType || (item.projectName ? 'selling' : undefined),
          commissionType: listing?.commissionType || item.commissionType,
          commissionValue: listing?.commissionValue || item.commissionValue,
          viewsCount: listing?.viewsCount || item.viewsCount
        };
      });

      // 3. Filter by Buy/Sell/All (Market Perspective)
      if (activeTab === 'browse') {
        if (activeView === 'Buy') {
          // User: "the listed will show in 'buy' tab"
          // ONLY show selling listings that are explicitly in the marketplace
          processed = processed.filter(item => item.isListing && item.listingType === 'selling');
        } else if (activeView === 'Sell') {
          // Show listings that are for PURCHASE (so users can sell to them / requirements)
          processed = processed.filter(item => item.listingType === 'buying');
        } else if (activeView === 'All') {
          // User: "only published projects and listed project... not draft"
          // Show standard properties (published) + listed properties
          // Hides: unpublished drafts that aren't listed, and buying requirements
          processed = processed.filter(item => {
            const isProperty = item.listingType !== 'buying';
            const isVisible = item.isPublished || item.isListing;
            return isProperty && isVisible;
          });
        }
      }


      // 5. Sell & Earn
      if (sellAndEarn) {
        processed = processed.filter(item => item.isListing);
      }

      // 5. City
      if (selectedCity !== 'All Cities') {
        processed = processed.filter(item => getBaseCity(item.city) === selectedCity);
      }

      // 6. Search
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        processed = processed.filter(item =>
          item.name.toLowerCase().includes(lowerSearch) ||
          item.city.toLowerCase().includes(lowerSearch) ||
          item.location.toLowerCase().includes(lowerSearch) ||
          item.listedBy.toLowerCase().includes(lowerSearch)
        );
      }

      setFilteredItems(processed);
    };

    filterAndProcessItems();
  }, [activeTab, activeView, searchTerm, selectedCity, sellAndEarn, listings, projects, user, myListedProjects]);

  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetchAdminActions();
    }
  }, [activeTab, isAdmin, fetchAdminActions]);

  const handleCreateListing = async () => {
    // Validation
    if (formData.listingType === 'selling' && !formData.project) {
      return toast.error('Please select a project to sell');
    }
    if (formData.listingType === 'buying' && !formData.location) {
      return toast.error('Please enter the target location');
    }

    const payload = {
      project: formData.listingType === 'buying' ? undefined : formData.project,
      listingType: formData.listingType,
      commissionType: formData.commissionType,
      commissionValue: Number(formData.commissionValue),
      description: formData.listingType === 'buying'
        ? `TARGET LOCATION: ${formData.location}\n\n${formData.description}`
        : formData.description,
      expectedValue: Number(formData.expectedValue) || 0,
    };

    console.log('[Marketplace] Publishing:', payload);

    try {
      const response = await marketplaceApi.createListing(payload);
      console.log('[Marketplace] Publish success:', response);
      toast.success(formData.listingType === 'selling' ? 'Project published' : 'Requirement posted');
      setShowCreateModal(false);
      setFormData({
        project: '',
        listingType: 'selling',
        commissionType: 'percentage',
        commissionValue: '2.5',
        description: '',
        expectedValue: '',
        location: ''
      });
      fetchAll();
    } catch (err: any) {
      console.error('[Marketplace] Publish error:', err);
      toast.error(err.message || 'Error publishing listing');
    }
  };

  const updateActionStatus = async (actionId: string, status: string) => {
    try {
      setUpdatingActionId(actionId);
      await marketplaceApi.updateActionStatus(actionId, status);
      toast.success(`Commission status updated to ${status}`);
      fetchAdminActions();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdatingActionId(null);
    }
  };

  const handleAction = async (listingId: string, type: string) => {
    try {
      await marketplaceApi.trackAction(listingId, type);
      toast.success(`Action "${type.toUpperCase().replace('_', ' ')}" recorded!`);
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleChat = (listing: MarketplaceListing | any) => {
    if (!listing) return;

    // Extract ownerId and projectId - handles both Listing and raw Project types
    let ownerId = null;
    if (listing.listedBy) {
      ownerId = typeof listing.listedBy === 'object' ? listing.listedBy._id : String(listing.listedBy);
    } else if (listing.owner) {
      ownerId = typeof listing.owner === 'object' ? listing.owner._id : String(listing.owner);
    }

    let projectId = null;
    if (listing.project) {
      projectId = typeof listing.project === 'object' ? (listing.project._id || listing.project.id) : String(listing.project);
    } else {
      projectId = listing._id || listing.id;
    }

    if (ownerId === (user?.id || user?._id)) {
      toast.error("You cannot chat with yourself");
      return;
    }

    if (!ownerId) {
      toast.error("Owner information unavailable for this project");
      return;
    }

    // Redirect to chat with partnerId and projectId params 
    router.push(`/dashboard/chat?partnerId=${ownerId}${projectId ? `&projectId=${projectId}` : ''}`);
  };

  const handleShareProject = (e: React.MouseEvent, details: any) => {
    e.stopPropagation();
    if (!details.slug) {
      toast.error("Sharing not available for this listing");
      return;
    }
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/visit/${details.slug}`;

    navigator.clipboard.writeText(shareUrl)
      .then(() => toast.success("Project link copied!"))
      .catch((err) => {
        console.error('Copy failed', err);
        toast.error("Failed to copy link");
      });
  };

  const formatPrice = (price: number) => {
    if (!price || price === 0) return 'Price O/R';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lacs`;
    return `₹${price.toLocaleString('en-IN')}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#1C1917] pb-20 w-full max-w-[100vw] overflow-x-hidden relative">
      {/* Banner */}
      <div className="bg-[#B45309] text-white py-1.5 md:py-3 px-4 md:px-6 relative overflow-hidden shrink-0 w-full">
        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-white/10 rounded-full blur-3xl opacity-50" />
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 relative z-10 w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <div className="p-1 md:p-1.5 bg-white/20 rounded font-bold backdrop-blur-md shrink-0">
              <SparklesIcon className="w-4 h-4 md:w-6 md:h-6 text-white" />
            </div>
            <div className="min-w-0 overflow-hidden">
              <h2 className="text-[10px] md:text-sm font-bold tracking-tight truncate">Earning Opportunities are Live</h2>
              <p className="text-[8px] md:text-[11px] text-white/80 font-medium tracking-tight truncate">Sell properties & connect with builders to earn commissions.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSellAndEarn(true);
              window.scrollTo({ top: 600, behavior: 'smooth' });
            }}
            className="px-3 md:px-5 py-1 bg-white text-[#B45309] rounded font-bold text-[9px] md:text-[11px] shadow-sm hover:bg-stone-50 transition-colors shrink-0 whitespace-nowrap"
          >
            Start Earning
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[1850px] mx-auto px-2 md:px-6 pt-2 md:pt-4 space-y-4 md:space-y-6">

        {/* New Marketplace Header UI from Screenshot */}
        <section className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 min-h-fit">
          <div className="flex flex-col items-center md:items-start">
            <h1 className="text-2xl md:text-4xl font-black text-[#1C1917] font-serif tracking-tight">Marketplace</h1>
            <p className="text-zinc-500 text-[10px] md:text-xs font-medium mt-0.5">Browse verified listings and opportunities</p>
          </div>

          <div className="flex items-center justify-center gap-1.5 md:gap-4 overflow-x-auto no-scrollbar w-full max-w-full md:w-auto pb-1 md:pb-0 px-1">
            <div className="flex bg-[#FAF9F8] p-0.5 rounded-lg md:p-0.5 md:rounded-lg border border-[#E7E5E4] shadow-sm shrink-0">
              <button
                onClick={() => setActiveTab('browse')}
                className={`px-2.5 md:px-4 py-1.5 md:py-1.5 rounded-md md:rounded-md text-[10px] md:text-[11px] font-bold transition-all ${activeTab === 'browse' ? 'bg-white text-[#1C1917] shadow-sm' : 'text-zinc-500 hover:text-[#B45309]'}`}
              >
                Browse
              </button>
              <button
                onClick={() => setActiveTab('listings')}
                className={`px-2.5 md:px-4 py-1.5 md:py-1.5 rounded-md md:rounded-md text-[10px] md:text-[11px] font-bold transition-all ${activeTab === 'listings' ? 'bg-white text-[#1C1917] shadow-sm' : 'text-zinc-500 hover:text-[#B45309]'}`}
              >
                <span className="hidden xs:inline">My </span>Listings
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-2.5 md:px-4 py-1.5 md:py-1.5 rounded-md md:rounded-md text-[10px] md:text-[11px] font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-[#1C1917] shadow-sm border border-[#E7E5E4]' : 'text-zinc-500 hover:text-[#B45309]'}`}
                >
                  Admin
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setFormData({ project: '', listingType: 'selling', commissionType: 'percentage', commissionValue: '2.5', description: '', expectedValue: '', location: '' });
                setShowCreateModal(true);
              }}
              className="px-2.5 md:px-5 py-1.5 md:py-2 bg-[#B45309] text-white rounded-lg md:rounded-lg font-bold text-[10px] md:text-[11px] shadow-lg shadow-orange-900/10 hover:bg-[#92400E] active:scale-95 transition-all flex items-center gap-1 md:gap-1.5 shrink-0"
            >
              <PlusIcon className="w-3.5 md:w-4 h-3.5 md:h-4" />
              Publish
            </button>
            <button
              onClick={() => {
                setFormData({ project: '', listingType: 'buying', commissionType: 'percentage', commissionValue: '0', description: '', expectedValue: '', location: '' });
                setShowCreateModal(true);
              }}
              className="px-2.5 md:px-5 py-1.5 md:py-2 bg-[#1C1917] text-white rounded-lg md:rounded-lg font-bold text-[10px] md:text-[11px] shadow-lg shadow-black/10 hover:bg-black active:scale-95 transition-all flex items-center gap-1 md:gap-1.5 shrink-0"
            >
              <BanknotesIcon className="w-3.5 md:w-4 h-3.5 md:h-4" />
              Requirement
            </button>
          </div>
        </section>

        {/* Filter Row - Only for Browse Tab */}
        {activeTab === 'browse' && (
          <section className="bg-white/80 backdrop-blur-xl p-1.5 md:p-2 rounded-2xl md:rounded-[1.25rem] border border-[#E7E5E4] shadow-xl shadow-orange-900/5 -mt-1 md:-mt-4 mx-auto max-w-5xl relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-1.5 md:gap-3">
              {/* Layout Switcher */}
              <div className="flex bg-[#FAF9F8] p-0.5 rounded-lg border border-[#E7E5E4] w-full md:w-auto shadow-inner h-fit">
                {['All', 'Buy', 'Sell'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view as any)}
                    className={`flex-1 md:flex-none px-4 md:px-6 py-1.5 md:py-2 rounded-md text-[10px] font-black tracking-widest transition-all ${activeView === view ? 'bg-white text-[#B45309] shadow-sm border border-[#E7E5E4]' : 'text-zinc-400 hover:text-[#1C1917]'}`}
                  >
                    {view.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="flex-1 w-full relative group">
                <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 md:w-4.5 h-4 md:h-4.5 text-zinc-300 group-focus-within:text-[#B45309] transition-colors" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-[#FAF9F8] border border-[#E7E5E4] rounded-lg text-xs md:text-sm focus:ring-2 focus:ring-[#B45309]/5 focus:border-[#B45309] transition-all outline-none placeholder:text-zinc-300 font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* City & Toggle Row */}
              <div className="flex flex-row items-center gap-1.5 w-full md:w-auto h-fit">
                <div className="relative group flex-1">
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 md:py-2.5 bg-[#FAF9F8] border border-[#E7E5E4] rounded-lg text-[10px] md:text-xs font-bold focus:ring-2 focus:ring-[#B45309]/5 focus:border-[#B45309] outline-none w-full md:w-36 transition-all hover:bg-white cursor-pointer"
                  >
                    {['All Cities', 'Nagpur', 'Pune', 'Mumbai'].map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-300 pointer-events-none" />
                </div>

                <label className="flex items-center gap-2 px-3 py-2 md:py-2.5 bg-[#FAF9F8] border border-[#E7E5E4] rounded-lg cursor-pointer hover:border-[#B45309]/30 transition-all group shrink-0 shadow-sm active:scale-95">
                  <div className="relative w-3.5 h-3.5">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={sellAndEarn}
                      onChange={() => setSellAndEarn(!sellAndEarn)}
                    />
                    <div className="w-3.5 h-3.5 bg-white rounded flex items-center justify-center border border-[#E7E5E4] peer-checked:bg-[#B45309] peer-checked:border-[#B45309] transition-all">
                      <CheckCircleIcon className="w-2.5 h-2.5 text-white scale-0 peer-checked:scale-100 transition-all" />
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase text-zinc-400 peer-checked:text-[#B45309] transition-colors select-none tracking-widest">Earn</span>
                </label>
              </div>
            </div>
          </section>
        )}

        {/* Section 1: All Projects (Opportunity Grid) */}
        {activeTab === 'browse' && (
          <section className="space-y-2 md:space-y-3">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-[#1C1917] font-serif leading-tight">Verified Opportunities</h2>
              <p className="text-gray-500 mt-0 md:mt-1 text-[10px] md:text-xs font-medium max-w-2xl">
                {sellAndEarn ? 'Verified properties with referral commissions enabled.' : 'Discover all prime real estate projects in your region.'}
              </p>
            </div>

            <div className={activeView === 'Sell' ? "space-y-3" : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"}>
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, idx) => {
                  const details = getProjectDetails(item);
                  const isListing = item.isListing;
                  return (
                    <motion.div
                      key={(item as any)._id || `opportunity-${idx}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                      className={activeView === 'Sell'
                        ? `group bg-white rounded-xl border border-[#E7E5E4] p-3 transition-all flex items-center gap-4 ${details.type === 'requirement' ? 'cursor-not-allowed opacity-80' : 'hover:shadow-[0_20px_40px_-12px_rgba(180,83,9,0.12)] hover:border-[#B45309]/30 cursor-pointer'}`
                        : "group bg-white rounded-xl border border-[#E7E5E4] overflow-hidden hover:shadow-[0_40px_80px_-15px_rgba(28,25,23,0.1)] hover:-translate-y-1 transition-all duration-700 flex flex-row md:flex-col relative"
                      }
                      onClick={() => {
                        if (details.type === 'requirement') {
                          // handleChat(item);
                        } else if (isListing) {
                          setShowDetailModal(item as MarketplaceListing);
                        }
                      }}
                    >
                      {activeView === 'Sell' ? (
                        <>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-[#1C1917] leading-tight group-hover:text-[#B45309] transition-colors">{details.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-bold mt-1 uppercase tracking-widest">{details.location} • {details.city}</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className="text-sm font-black text-[#B45309]">{formatPrice(details.price)}</span>
                            {isListing && item.listingType !== 'buying' && (
                              <span className="text-[9px] font-black text-white bg-[#B45309] px-2 py-0.5 rounded-lg leading-none shrink-0 shadow-sm">
                                {item.commissionType === 'percentage' ? `${item.commissionValue}%` : `₹${item.commissionValue.toLocaleString()}`}
                              </span>
                            )}
                          </div>
                          {details.slug && (
                            <button
                              onClick={(e) => handleShareProject(e, details)}
                              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-[#FAF9F8] text-[#B45309] hover:bg-[#B45309] hover:text-white transition-all border border-[#E7E5E4] active:scale-95 shadow-sm"
                              title="Copy Visit Link"
                            >
                              <ShareIcon className="w-5 h-5" />
                            </button>
                          )}
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${details.type === 'requirement' ? 'bg-zinc-50 text-zinc-300 border border-zinc-100' : 'bg-[#FAF9F8] text-[#B45309] border border-[#E7E5E4] group-hover:bg-[#B45309] group-hover:text-white group-hover:border-[#B45309]'}`}>
                            {details.type === 'requirement' ? <ChatBubbleLeftEllipsisIcon className="w-5 h-5" /> : <ArrowUpRightIcon className="w-5 h-5" />}
                          </div>
                        </>
                      ) : (
                        // Redesigned Heritage Modern Card Layout - Responsive List/Card
                        <>
                          {/* Image Container - Width Expanded on Mobile */}
                          <div className="w-[110px] xs:w-1/4 md:w-auto h-auto md:h-[135px] overflow-hidden relative m-1 md:m-1.5 rounded-lg shrink-0">
                            {details.media ? (
                              <img
                                src={details.media}
                                alt={details.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                              />
                            ) : (
                              <div className="w-full h-full bg-[#FAF9F8] flex items-center justify-center">
                                <BanknotesIcon className="w-12 h-12 md:w-16 md:h-16 text-[#B45309]/5" />
                              </div>
                            )}

                            {/* Badges - Simplified for Mobile */}
                            <div className="absolute top-1.5 left-1.5 md:top-4 md:left-4">
                              <span className={`px-1.5 py-0.5 md:px-4 md:py-1.5 rounded-full text-[6px] md:text-[8px] font-black tracking-widest md:tracking-[0.2em] uppercase backdrop-blur-md border border-white/30 shadow-sm
                                ${details.type === 'requirement' ? 'bg-indigo-600/80 text-white' :
                                  (isListing ? 'bg-[#10B981] text-white' : 'bg-white/80 text-[#1C1917]')}`}
                              >
                                {details.type === 'requirement' ? 'Req' : (isListing ? 'LISTED' : 'STD')}
                              </span>
                            </div>

                            {isListing && (item as any).listingType !== 'buying' && (
                              <div className="absolute top-2 right-2 md:top-4 md:right-4 hidden xs:block">
                                <div className="bg-[#B45309]/90 backdrop-blur-md px-1.5 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl border border-white/20 text-white font-black text-[7px] md:text-[9px] tracking-widest flex items-center gap-1 shadow-lg">
                                  <SparklesIcon className="w-2 md:w-2.5 h-2 md:h-2.5" />
                                  {(item as any).commissionType === 'percentage' ? `${(item as any).commissionValue || 0}%` : `₹${((item as any).commissionValue || 0).toLocaleString()}`}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="py-1 px-2.5 md:px-3 md:pb-3 flex-1 flex flex-col min-w-0">
                            {/* Title & Top Actions Row */}
                            <div className="flex items-start justify-between gap-2 mb-1.5 md:mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-base md:text-sm font-black text-[#1C1917] font-serif leading-none tracking-tight group-hover:text-[#B45309] transition-colors mb-1 md:mb-1 line-clamp-1">
                                  {details.name}
                                </h3>
                                <div className="text-sm md:text-xs font-black text-[#B45309] tracking-tight leading-none truncate">
                                  {formatPrice(details.price)}
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
                                {details.slug && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleShareProject(e, details); }}
                                    className="w-5 h-5 md:w-6 md:h-6 rounded-md border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-[#B45309] active:scale-90 bg-[#FAF9F8]"
                                  >
                                    <ShareIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 md:w-6 md:h-6 rounded-md border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-[#B45309] active:scale-90 bg-[#FAF9F8]"
                                >
                                  <ChatBubbleLeftEllipsisIcon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Metadata Row */}
                            <div className="flex items-center flex-nowrap gap-x-1 text-[#1C1917]/60 text-[8px] md:text-[9px] font-medium tracking-tight mb-1.5 md:mb-2 overflow-hidden whitespace-nowrap">
                              <span className="capitalize shrink-0">{details.type || 'Flat'}</span>
                              <span className="text-zinc-200 shrink-0">|</span>
                              <div className="truncate flex-1 min-w-0">
                                {(details.location.split(',').find((part: string) => !part.includes('+')) || details.location.split(',')[0]).trim()}, {details.city.split(',')[0].trim()}
                              </div>
                              <span className="text-zinc-200 shrink-0">|</span>
                              <span className="shrink-0">{details.area || 'TBA'}</span>
                            </div>

                            {/* Bottom Actions: Builder & View Button */}
                            <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E7E5E4]/40 pt-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden bg-[#FAF9F8] border border-[#E7E5E4] shrink-0">
                                  <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${details.listedBy}`}
                                    alt={details.listedBy}
                                    className="w-full h-full object-cover grayscale opacity-80"
                                  />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[6px] font-bold text-zinc-400 leading-none mb-0.5">Builder</span>
                                  <span className="text-[8px] font-black text-[#1C1917] leading-none uppercase tracking-wide truncate max-w-[60px] md:max-w-none">{details.listedBy}</span>
                                </div>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isListing && details.type !== 'requirement') {
                                    setShowDetailModal(item as MarketplaceListing);
                                  } else if (details.slug) {
                                    window.open(`/visit/${details.slug}`, '_blank');
                                  }
                                }}
                                className={`flex-1 max-w-[90px] flex items-center justify-center gap-1 px-2.5 py-1.5 md:py-1.5 rounded-md text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm
                                  ${isListing && details.type !== 'requirement'
                                    ? 'bg-[#B45309] text-white hover:bg-[#92400E]'
                                    : 'bg-white border border-[#E7E5E4] text-[#1C1917] hover:bg-zinc-50'}`}
                              >
                                {isListing && details.type !== 'requirement' ? 'VIEW' : 'VISIT'}
                                <ChevronRightIcon className="w-2.5 h-2.5 ml-0.5" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Section 3: Admin Marketplace View */}
        {activeTab === 'admin' && isAdmin && (
          <section className="space-y-4 md:space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-xl md:text-2xl font-black text-[#1C1917] font-serif leading-tight">Admin Claims Center</h2>
                <p className="text-gray-500 mt-1 md:mt-1.5 text-[10px] md:text-xs font-medium">Review and manage all marketplace referrals and claims.</p>
              </div>
              <div className="flex gap-2 bg-[#FAF7F5] p-1 md:p-1.5 rounded-2xl md:rounded-3xl border border-[#E7E5E4]">
                <div className="px-4 md:px-6 py-2 md:py-3 bg-white rounded-xl md:rounded-2xl shadow-sm border border-[#E7E5E4] text-center">
                  <p className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 tracking-widest mb-0.5 md:mb-1">Total Admin Claims</p>
                  <p className="text-lg md:text-xl font-black text-[#B45309]">{adminActions.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl md:rounded-[3rem] border border-[#E7E5E4] overflow-hidden shadow-2xl shadow-black/5">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#FAF7F5] border-b border-[#E7E5E4]">
                      <th className="px-4 md:px-8 py-3 md:py-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400">Project</th>
                      <th className="px-4 md:px-8 py-3 md:py-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400">Collaborator</th>
                      <th className="px-4 md:px-8 py-3 md:py-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400">Action Type</th>
                      <th className="px-4 md:px-8 py-3 md:py-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400">Commission Status</th>
                      <th className="px-4 md:px-8 py-3 md:py-6 text-[9px] md:text-[11px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4]">
                    {adminActions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-24 text-center">
                          <div className="max-w-xs mx-auto text-center space-y-4">
                            <div className="w-16 h-16 bg-[#FAF7F5] rounded-2xl mx-auto flex items-center justify-center">
                              <SparklesIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">No claims data found. Market activity will appear here once users start interacting.</p>
                          </div>
                        </td>
                      </tr>
                    ) : adminActions.map((action, idx) => {
                      const listing = action.listing as unknown as MarketplaceListing;
                      const project = (listing && typeof listing.project === 'object') ? (listing.project as any) : null;
                      const actor = action.performedBy && typeof action.performedBy === 'object' ? (action.performedBy as any) : { name: 'Unknown' };
                      const status = action.status || 'pending';

                      return (
                        <tr key={action._id || `admin-action-${idx}`} className="hover:bg-[#FAF7F5]/50 transition-colors group">
                          <td className="px-8 py-7">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-[#FAF7F5] rounded-xl flex items-center justify-center flex-shrink-0">
                                <MapPinIcon className="w-5 h-5 text-[#B45309]/50" />
                              </div>
                              <div>
                                <p className="font-black text-sm text-[#1C1917] hover:text-[#B45309] transition-colors">
                                  {project?.projectName || (typeof listing?.project === 'string' ? `Project ID: ${listing.project.substring(0, 8)}...` : 'Deleted Project')}
                                </p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                  {project?.city || (listing?.description ? `Note: ${listing.description.substring(0, 20)}...` : 'N/A')}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-7">
                            <div>
                              <p className="font-black text-sm text-[#1C1917]">{actor?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">{actor?.role || 'user'}</p>
                            </div>
                          </td>
                          <td className="px-8 py-7">
                            <span className="px-4 py-1.5 bg-white border border-[#E7E5E4] rounded-full text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm group-hover:border-[#B45309]/30 transition-all">
                              {action.actionType?.toUpperCase().replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-8 py-7">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${status === 'approved' ? 'bg-emerald-500' :
                                status === 'paid' ? 'bg-blue-500' :
                                  status === 'rejected' ? 'bg-rose-500' :
                                    'bg-amber-400 animate-pulse'
                                }`} />
                              <span className={`text-[11px] font-black uppercase tracking-widest ${status === 'approved' ? 'text-emerald-600' :
                                status === 'paid' ? 'text-blue-600' :
                                  status === 'rejected' ? 'text-rose-600' :
                                    'text-amber-600'
                                }`}>
                                {status}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 md:px-8 py-4 md:py-7 text-right">
                            {updatingActionId === action._id ? (
                              <div className="inline-flex h-10 items-center px-4 bg-[#FAF7F5] rounded-xl text-[10px] font-black text-gray-400 animate-pulse">
                                UPDATING...
                              </div>
                            ) : (
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => updateActionStatus(action._id, 'approved')}
                                  className="p-2.5 bg-white hover:bg-emerald-50 text-emerald-600 rounded-xl border border-[#E7E5E4] hover:border-emerald-200 transition-all shadow-sm active:scale-95"
                                  title="Approve Commission"
                                ><CheckCircleIcon className="w-5 h-5" /></button>
                                <button
                                  onClick={() => updateActionStatus(action._id, 'rejected')}
                                  className="p-2.5 bg-white hover:bg-rose-50 text-rose-600 rounded-xl border border-[#E7E5E4] hover:border-rose-200 transition-all shadow-sm active:scale-95"
                                  title="Reject Commission"
                                ><NoSymbolIcon className="w-5 h-5" /></button>
                                <button
                                  onClick={() => updateActionStatus(action._id, 'paid')}
                                  className="p-2.5 bg-white hover:bg-blue-50 text-blue-600 rounded-xl border border-[#E7E5E4] hover:border-blue-200 transition-all shadow-sm active:scale-95"
                                  title="Mark as Paid"
                                ><BanknotesIcon className="w-5 h-5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

              </div>
            </div>
          </section>
        )}

        {/* Section 2: Manage My Listings */}
        {activeTab === 'listings' && (
          <section className="space-y-2 md:space-y-4">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl md:text-2xl font-black text-[#1C1917] font-serif">My Listings</h2>
              <p className="text-gray-500 text-[10px] md:text-xs font-medium mt-0.5">Track your listings and approve commission payouts.</p>
            </div>

            {myListedProjects.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#E7E5E4] rounded-2xl md:rounded-[2.5rem] p-6 md:p-16 text-center space-y-4 md:space-y-6">
                <div className="w-14 h-14 md:w-24 md:h-24 bg-[#FAF7F5] rounded-2xl md:rounded-[2rem] mx-auto flex items-center justify-center">
                  <TagIcon className="w-7 h-7 md:w-12 md:h-12 text-gray-300" />
                </div>
                <div className="max-w-xs mx-auto">
                  <h3 className="text-lg font-bold">No listed projects found</h3>
                  <p className="text-sm text-gray-400">Put your projects on the marketplace to let others sell them for you.</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-8 py-3 bg-[#1C1917] text-white rounded-2xl font-bold text-sm"
                >
                  Create Listing
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                {myListedProjects.map((l, idx) => {
                  const d = getProjectDetails(l);
                  return (
                    <div key={(l as any)._id || `my-listing-${idx}`} className="bg-white p-3 md:p-5 rounded-2xl border border-[#E7E5E4] hover:shadow-xl hover:shadow-black/5 transition-all flex gap-4 md:gap-6">
                      <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-[#FAF9F8] border border-[#E7E5E4]">
                        {d.media ? <img src={d.media} className="w-full h-full object-cover" /> : <BanknotesIcon className="w-full h-full p-4 md:p-6 text-[#E7E5E4]" />}
                      </div>
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-base">{d.name}</h4>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${STATUS_COLORS[l.status] || STATUS_COLORS.Active}`}>
                              {l.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-medium">
                            {d.city} {l.listingType !== 'buying' && (
                              <>
                                • Commission: <span className="text-[#B45309] font-bold">{l.commissionType === 'percentage' ? `${l.commissionValue || 0}%` : `₹${(l.commissionValue || 0).toLocaleString()}`}</span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[9px] uppercase font-bold tracking-wider text-[#B45309] pt-2">
                          <span className="flex items-center gap-1"><EyeIcon className="w-3.5 h-3.5" /> {l.viewsCount} Views</span>
                          {d.slug && (
                            <button className="hover:underline flex items-center gap-1" onClick={(e) => handleShareProject(e, d)}>
                              <ShareIcon className="w-3 h-3" /> Share Link
                            </button>
                          )}
                          <button className="hover:underline flex items-center gap-1" onClick={() => setShowDetailModal(l)}>Analytics <ArrowUpRightIcon className="w-2.5 h-2.5" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#1C1917]/80 backdrop-blur-xl"
              onClick={() => setShowDetailModal(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="bg-white w-full max-w-xl max-h-[95vh] md:max-h-[80vh] rounded-t-xl md:rounded-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col md:flex-row"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-full md:w-1/3 relative h-40 md:h-auto bg-[#B45309]/10">
                {getProjectDetails(showDetailModal).media ? (
                  <img src={getProjectDetails(showDetailModal).media!} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><BanknotesIcon className="w-24 h-24 text-[#B45309]/20" /></div>
                )}
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-lg text-[#B45309] text-sm font-black shadow-xl">
                    {formatPrice(getProjectDetails(showDetailModal).price)}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-2/3 p-3 md:p-4 flex flex-col">
                {(() => {
                  const details = getProjectDetails(showDetailModal);
                  return (
                    <>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h2 className="text-base md:text-lg font-black font-serif leading-tight">{details.name}</h2>
                          <p className="text-gray-400 text-[9px] font-bold flex items-center gap-1 mt-0.5">
                            <MapPinIcon className="w-2.5 h-2.5" /> {details.location}, {details.city}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {details.slug && (
                            <button
                              onClick={() => window.open(`/projects/${details.slug}`, '_blank')}
                              className="px-3 py-1.5 bg-[#FAF7F5] text-[#1C1917] border border-[#E7E5E4] rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-white transition-all active:scale-95 shadow-sm"
                            >
                              Visit Project
                            </button>
                          )}
                          <button onClick={() => setShowDetailModal(null)} className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-1.5 mb-3">
                        {showDetailModal?.listingType === 'selling' && (
                          <div className="px-3 py-1.5 bg-[#B45309]/5 rounded-xl border border-[#B45309]/20 text-[#B45309] font-black text-[10px]">
                            {(showDetailModal as any)?.commissionType === 'percentage' ? `${(showDetailModal as any)?.commissionValue || 0}% Commission` : `₹${((showDetailModal as any)?.commissionValue || 0).toLocaleString()} Fixed`}
                          </div>
                        )}
                        <div className="px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-100 text-gray-500 font-bold text-[10px]">
                          {showDetailModal?.status}
                        </div>
                        {showDetailModal?.listingType === 'buying' && (
                          <div className="px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-600 font-black text-[9px] uppercase tracking-widest">
                            Requirement
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <div>
                          <h4 className="text-[8px] uppercase tracking-[0.1em] font-black text-gray-400 mb-1.5">Pitch / Description</h4>
                          <p className="text-gray-600 leading-relaxed text-[10px] font-medium bg-[#FAF7F5] p-2 rounded-xl whitespace-pre-line">{showDetailModal?.description || 'No pitch provided for this project.'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-white border border-[#E7E5E4] rounded-2xl">
                            <p className="text-[9px] font-black uppercase text-gray-400 mb-1.5">Listed By</p>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#1C1917] text-white flex items-center justify-center text-xs font-black border-2 border-white shadow-lg">
                                {details.listedBy[0]}
                              </div>
                              <div className="flex flex-col">
                                <div className="text-[11px] font-black text-[#1C1917] leading-none mb-0.5">{details.listedBy}</div>
                                <div className="text-[9px] font-bold text-stone-400 uppercase tracking-widest leading-none">{details.role}</div>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 bg-white border border-[#E7E5E4] rounded-2xl">
                            <p className="text-[9px] font-black uppercase text-gray-400 mb-1.5">Value</p>
                            <div className="flex items-center gap-1.5">
                              <BanknotesIcon className="w-4 h-4 text-[#B45309]" />
                              <p className="text-xs font-black text-[#1C1917]">{formatPrice(details.price)}</p>
                            </div>
                          </div>
                        </div>

                        {details.listedByPhone && (
                          <div className="p-5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-[2rem] flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Direct Contact</p>
                              <p className="text-sm font-black text-emerald-700">{details.listedByPhone}</p>
                            </div>
                            <button
                              onClick={() => window.open(`tel:${details.listedByPhone}`)}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                            >
                              Call Now
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-1 text-emerald-600 font-black text-[8px] uppercase tracking-tighter">
                          <CheckBadgeIcon className="w-3 h-3" /> Verified Opportunity
                        </div>
                        <div className="flex gap-1.5">
                          {((typeof showDetailModal?.listedBy === 'object' ? (showDetailModal?.listedBy as any)?._id : showDetailModal?.listedBy) !== (user?.id || (user as any)?._id)) ? (
                            <div
                              onClick={() => handleChat(showDetailModal)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1917] text-white rounded-lg font-black text-[9px] uppercase tracking-widest opacity-90 transition-all hover:bg-black cursor-pointer"
                            >
                              <ChatBubbleLeftEllipsisIcon className="w-3 h-3" />
                              Chat
                            </div>
                          ) : (
                            <div className="text-[8px] font-bold text-gray-400 italic">You listed this</div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-md" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-[95%] max-w-md rounded-2xl md:rounded-3xl shadow-2xl relative z-10 overflow-hidden mx-auto my-auto" onClick={e => e.stopPropagation()}>
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-center mb-4 md:mb-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-black font-serif">
                      {formData.listingType === 'selling' ? 'Marketplace Listing' : 'Listing Requirement'}
                    </h2>
                    <p className="text-[10px] md:text-xs text-gray-400 font-medium leading-tight mt-0.5">
                      {formData.listingType === 'selling' ? 'Earn more by opening your projects to others.' : 'Looking for something? Find partners to fulfill your need.'}
                    </p>
                  </div>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 bg-gray-50 rounded-xl"><XMarkIcon className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4">
                  {formData.listingType === 'selling' ? (
                    <div>
                      <label className="text-[9px] uppercase font-black text-gray-400 mb-1.5 block tracking-widest pl-1.5">Select Unlisted Project</label>
                      <select
                        className="w-full px-4 py-2.5 bg-[#FAF7F5] border border-transparent focus:border-[#B45309]/30 transition-all rounded-xl outline-none text-[11px] font-bold"
                        value={formData.project}
                        onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                      >
                        <option value="">Choose from your collection...</option>
                        {unlistedProjects.map((p, pIdx) => <option key={p.id || `unlisted-${pIdx}`} value={p.id}>{p.name}</option>)}
                      </select>
                      {unlistedProjects.length === 0 && <p className="text-[9px] text-[#B45309] font-bold mt-1.5 pl-1.5">All projects listed.</p>}
                    </div>
                  ) : (
                    <div>
                      <label className="text-[9px] uppercase font-black text-gray-400 mb-1.5 block tracking-widest pl-1.5">Target Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Bandra West, Mumbai"
                        className="w-full px-4 py-2.5 bg-[#FAF7F5] border border-transparent focus:border-[#B45309]/30 transition-all rounded-xl outline-none text-[11px] font-bold"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] uppercase font-black text-gray-400 mb-1.5 block tracking-widest pl-1.5">Expected Deal Value</label>
                    <input
                      type="number"
                      placeholder="e.g. 50,00,000"
                      className="w-full px-4 py-2.5 bg-[#FAF7F5] border border-transparent focus:border-[#B45309]/30 transition-all rounded-xl outline-none text-[11px] font-bold"
                      value={formData.expectedValue}
                      onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                    />
                  </div>

                  {formData.listingType === 'selling' && (
                    <div className="bg-[#FAF7F5] p-4 rounded-xl border border-transparent hover:border-[#B45309]/10 transition-all">
                      <div className="flex items-center justify-between mb-2.5">
                        <label className="text-[8px] md:text-[9px] uppercase font-black text-zinc-400 tracking-widest pl-1">Commission Offer</label>
                        <div className="flex bg-white rounded-lg p-0.5 shadow-sm border border-[#E7E5E4]">
                          <button
                            onClick={() => setFormData({ ...formData, commissionType: 'percentage' })}
                            className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${formData.commissionType === 'percentage' ? 'bg-[#B45309] text-white' : 'text-gray-400'}`}
                          >PERCENT</button>
                          <button
                            onClick={() => setFormData({ ...formData, commissionType: 'fixed' })}
                            className={`px-2 py-1 text-[8px] font-black rounded-md transition-all ${formData.commissionType === 'fixed' ? 'bg-[#B45309] text-white' : 'text-gray-400'}`}
                          >FIXED ₹</button>
                        </div>
                      </div>
                      <input
                        type="number"
                        placeholder={formData.commissionType === 'percentage' ? '2.5%' : 'e.g. 50,000'}
                        className="w-full px-4 py-2.5 bg-white border border-[#E7E5E4] rounded-lg outline-none text-base font-black text-[#B45309]"
                        value={formData.commissionValue}
                        onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] uppercase font-black text-zinc-400 mb-1.5 block tracking-widest pl-1.5">
                      {formData.listingType === 'selling' ? 'Sales pitch' : 'Requirement Details'}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={formData.listingType === 'selling' ? 'Why should others help you sell this?...' : 'Specific preferences...'}
                      className="w-full px-4 py-2.5 bg-[#FAF7F5] border border-transparent focus:border-[#B45309]/30 transition-all rounded-xl outline-none text-[11px] font-bold resize-none"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                  <button
                    onClick={handleCreateListing}
                    disabled={
                      formData.listingType === 'selling'
                        ? (!formData.project || !formData.commissionValue)
                        : (!formData.location || !formData.expectedValue)
                    }
                    className="w-full py-3.5 bg-[#B45309] text-white rounded-xl font-black tracking-widest uppercase text-xs shadow-xl shadow-[#B45309]/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    Confirm & {formData.listingType === 'selling' ? 'Publish' : 'Post Requirement'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
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
          background: #D6D3D1;
        }
      `}</style>
    </div>
  );
}
