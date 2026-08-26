'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getLeadGenUrl, analyticsApi, projectsApi, crmBridgeApi, shareApi, leadMatchingApi } from '@/lib/api';
import {
  Zap,
  ShoppingBag,
  Users,
  BarChart3,
  PlusCircle,
  Menu,
  TrendingUp,
  Eye,
  UserCheck,
  ArrowUpRight,
  Sparkles,
  MapPin,
  ChevronUp,
  Share2,
  Download,
  QrCode,
  Images,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDerivedPricePerSqFt } from '@/utils/pricePerSqFt';

interface ProjectCard {
  id: string;
  name: string;
  city: string;
  location: string;
  price: number;
  pricePerSqFt: number;
  area: string;
  type: string;
  coverImage: string | null;
  bhkOptions: string[];
  projectStatus: string;
  reraApproved: boolean;
  slug: string;
  gatedCommunity: boolean;
  bankLoanAvailable: boolean;
  amenities: string[];
  floorRange: string;
  facingOptions: string[];
  priceRange: string;
  ownerName: string;
}

export default function BuilderDashboardPage() {
  const { user, status } = useAuth();
  const authLoading = status === 'loading';
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Dynamic stats
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalViews: 0,
    totalLeads: 0,
    crmHot: 0,
    crmTotal: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [properties, setProperties] = useState<ProjectCard[]>([]);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  // Which card's "..." overflow menu is open (only one at a time). Null = none.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'builder')) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [user, authLoading, router]);

  // Fetch real stats + projects for reels
  useEffect(() => {
    if (!user) return;
    setStatsLoading(true);

    const fetchData = async () => {
      try {
        const [projectsResult, overview, crm] = await Promise.allSettled([
          projectsApi.getAllPublic(),
          analyticsApi.getOverview(),
          crmBridgeApi.getAnalytics(),
        ]);

        const projectsList = projectsResult.status === 'fulfilled' ? projectsResult.value : [];
        const analyticsData = overview.status === 'fulfilled' ? overview.value : [];
        const crmData = crm.status === 'fulfilled' ? crm.value : null;

        const totalViews = analyticsData.reduce((sum, p) => sum + (p.totalVisits || 0), 0);
        const totalLeads = analyticsData.reduce((sum, p) => sum + (p.uniqueLeads || 0), 0);

        setStats({
          totalProjects: projectsList.length,
          totalViews,
          totalLeads,
          crmHot: crmData?.hot || 0,
          crmTotal: crmData?.total || 0,
        });

        // Map projects to card format
        const cards: ProjectCard[] = projectsList
          .filter((p: any) => p.isPublished || p.status === 'published')
          .map((p: any) => ({
            id: p.id || p._id,
            name: p.name || p.projectName || 'Untitled',
            city: p.city || '',
            location: p.location || '',
            price: p.startingPrice || p.pricing?.startingPrice || 0,
            pricePerSqFt: p.pricePerSqFt || p.pricing?.pricePerSqFt || 0,
            area: p.carpetAreaRange || p.plotSizeRange || p.configuration?.carpetAreaRange || p.configuration?.plotSizeRange || '',
            type: p.type || p.projectType || 'flat',
            coverImage: p.coverImage?.url || (typeof p.coverImage === 'string' ? p.coverImage : null) || p.media?.coverImage?.url || null,
            bhkOptions: p.bhkOptions || p.configuration?.bhkOptions || [],
            projectStatus: p.projectStatus || '',
            reraApproved: p.reraApproved || false,
            slug: p.slug || '',
            gatedCommunity: p.gatedCommunity || p.configuration?.gatedCommunity || false,
            bankLoanAvailable: p.bankLoanAvailable || p.pricing?.bankLoanAvailable || false,
            amenities: p.amenities || [],
            floorRange: p.floorRange || p.configuration?.floorRange || '',
            facingOptions: p.facingOptions || p.configuration?.facingOptions || [],
            priceRange: p.priceRange || p.pricing?.totalPriceRange || '',
            ownerName: p.owner?.name || '',
          }));
        setProperties(cards);
      } catch {
        // Silently fail
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Fetch "N buyers match" counts once projects are loaded.
  useEffect(() => {
    const ids = properties.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) return;
    let cancelled = false;
    leadMatchingApi.getMatchCounts(ids).then((counts) => {
      if (!cancelled) setMatchCounts(counts);
    });
    return () => {
      cancelled = true;
    };
  }, [properties]);

  // Close the card overflow menu on any outside click or Escape.
  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenuId(null); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  // Hide the layout's mobile header on this page
  useEffect(() => {
    const layoutHeader = document.querySelector('header.lg\\:hidden') as HTMLElement | null;
    if (layoutHeader) layoutHeader.style.display = 'none';
    return () => {
      if (layoutHeader) layoutHeader.style.display = '';
    };
  }, []);

  function handleGenerateLead() {
    const leadGenUrl = getLeadGenUrl();
    window.location.href = leadGenUrl;
  }

  function handleOpenSidebar() {
    const btn = document.querySelector('header.lg\\:hidden button[aria-label="Toggle menu"]') as HTMLButtonElement | null;
    if (btn) btn.click();
  }

  function handleShare(slug: string, name: string) {
    const url = `${window.location.origin}/visit/${slug}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied!'))
      .catch(() => toast.error('Failed to copy'));
  }

  async function handleDownloadPDF(property: ProjectCard) {
    toast.loading('Generating brochure...', { id: 'pdf' });
    try {
      // Fetch full project data for rich PDF content
      const { projectsApi, shareApi } = await import('@/lib/api');
      const { generateProjectPdf } = await import('@/utils/generateProjectPdf');

      const [fullProject, contactInfo] = await Promise.all([
        projectsApi.getById(property.id).catch(() => null),
        shareApi.getMyContact().catch(() => null),
      ]);

      // Generate share token for tracking
      const shareResult = await shareApi.generateToken(property.id, 'pdf').catch(() => null);
      const shareUrl = shareResult?.shareUrl || `https://homeintown.ai/visit/${property.slug}`;

      // Build PDF data from full project or fallback to card data
      const getImageUrl = (img: any): string | null => {
        if (!img) return null;
        if (typeof img === 'string') return img;
        return img?.url || null;
      };

      const pdfData = {
        id: property.id,
        name: property.name,
        type: property.type,
        city: property.city,
        location: property.location,
        price: property.price,
        startingPrice: property.price,
        pricePerSqFt: property.pricePerSqFt,
        priceRange: property.priceRange,
        area: property.area,
        bhkOptions: property.bhkOptions,
        amenities: property.amenities,
        coverImage: property.coverImage || getImageUrl(fullProject?.coverImage),
        galleryImages: fullProject?.galleryImages?.map((img: any) => getImageUrl(img)).filter(Boolean) as string[] || [],
        layoutImage: fullProject?.layoutImage ? getImageUrl(fullProject.layoutImage) : null,
        slug: property.slug,
        reraApproved: property.reraApproved,
        reraNumber: (fullProject as any)?.reraNumber || '',
        projectStatus: property.projectStatus,
        bankLoanAvailable: property.bankLoanAvailable,
        gatedCommunity: property.gatedCommunity,
        floorRange: property.floorRange,
        facingOptions: property.facingOptions,
        paymentPlan: (fullProject as any)?.paymentPlan || '',
        landmarks: (fullProject as any)?.landmarks || [],
      };

      // Contact info (fallback if not authenticated or API fails)
      const contact = contactInfo || {
        name: user?.name || 'HomeInTown',
        phone: user?.phone || '',
        email: null,
        companyName: user?.companyName || null,
        businessLogoUrl: null,
        businessAddress: null,
        businessCity: null,
        businessState: null,
        role: user?.role || 'builder',
      };

      await generateProjectPdf(pdfData, contact, shareUrl);
      toast.success('Brochure downloaded!', { id: 'pdf' });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate brochure', { id: 'pdf' });
    }
  }

  function handleGenerateQR(slug: string, name: string) {
    const url = `${window.location.origin}/visit/${slug}`;
    // Open QR code using a public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
    
    // Create a temporary link to download the QR code
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloading!');
  }

  async function handleDownloadGallery(id: string, name: string) {
    toast.loading('Downloading gallery...', { id: 'gallery' });
    try {
      await shareApi.downloadGallery(id, name);
      toast.success('Gallery downloaded!', { id: 'gallery' });
    } catch (err: any) {
      console.error('Gallery download error:', err);
      toast.error(err.message || 'Failed to download gallery', { id: 'gallery' });
    }
  }

  const formatPrice = (price: number) => {
    if (!price) return 'Price on Request';
    if (price >= 10000000) return `\u20B9${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `\u20B9${(price / 100000).toFixed(1)} Lac`;
    return `\u20B9${price.toLocaleString('en-IN')}`;
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (authLoading || loading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">

      {/* ============ MOBILE VIEW ============ */}
      <div className="lg:hidden flex flex-col h-[100dvh] overflow-hidden -mt-16">

        {/* Mobile Top Navbar */}
        <div className="shrink-0 bg-white/80 backdrop-blur-xl border-b border-[#E7E5E4] px-4 py-2.5 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleOpenSidebar}
                className="p-1.5 text-[#57534E] hover:text-[#B45309] transition-colors rounded-lg"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Link href="/" className="flex items-center gap-1.5">
                <div className="w-6 h-6 bg-[#B45309] rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm">H</div>
                <span className="text-sm font-bold text-[#2A2A2A] font-serif">HomeInTown</span>
              </Link>
            </div>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-1 bg-[#B45309] text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm active:scale-95 transition-transform"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Upload</span>
            </Link>
          </div>
        </div>

        {/* Welcome Card (compact) */}
        <div className="shrink-0 mx-3 mt-3 rounded-2xl bg-gradient-to-br from-[#1C1917] to-[#292524] p-4 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#B45309]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-[#B45309] text-[9px] font-bold uppercase tracking-[0.15em]">{greeting}</p>
              <h1 className="text-lg font-bold text-white font-serif tracking-tight mt-0.5">{user.name}</h1>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-white text-base font-black font-serif">{statsLoading ? '–' : stats.totalViews}</p>
                <p className="text-stone-500 text-[8px] font-bold uppercase">Views</p>
              </div>
              <div className="text-center">
                <p className="text-white text-base font-black font-serif">{statsLoading ? '–' : stats.totalLeads}</p>
                <p className="text-stone-500 text-[8px] font-bold uppercase">Leads</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions — CRM & Team (moved from bottom nav) */}
        <div className="shrink-0 mx-3 mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/dashboard/crm"
            className="relative flex items-center gap-2.5 bg-white border border-[#E7E5E4] rounded-2xl px-3 py-2.5 shadow-sm active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 bg-[#B45309]/10 rounded-xl flex items-center justify-center shrink-0">
              <BarChart3 className="w-4.5 h-4.5 text-[#B45309]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1C1917] font-serif leading-tight">CRM</p>
              <p className="text-[9px] text-[#A8A29E] font-semibold uppercase tracking-wide">Pipeline</p>
            </div>
            {stats.crmHot > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
            )}
          </Link>
          <Link
            href="https://www.oneemployee.in/"
            className="flex items-center gap-2.5 bg-white border border-[#E7E5E4] rounded-2xl px-3 py-2.5 shadow-sm active:scale-95 transition-transform"
          >
            <div className="w-9 h-9 bg-[#B45309]/10 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-4.5 h-4.5 text-[#B45309]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1C1917] font-serif leading-tight">Team</p>
              <p className="text-[9px] text-[#A8A29E] font-semibold uppercase tracking-wide">One Employee</p>
            </div>
          </Link>
        </div>

        {/* Property Reels - shows 3 at a time, scrollable */}
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory mt-3 px-3 pb-20 scrollbar-hide">
          {properties.length === 0 && !statsLoading && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-zinc-400">No properties to show</p>
            </div>
          )}
          {properties.map((property) => (
            <div
              key={property.id}
              className="snap-start bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden flex flex-row mb-2"
              style={{ height: 'calc((100dvh - 250px) / 3)' }}
            >
              {/* Image */}
              <div className="relative w-[120px] shrink-0 h-full">
                {property.coverImage ? (
                  <img src={property.coverImage} alt={property.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#B45309]/5 to-zinc-100 flex items-center justify-center">
                    <span className="text-2xl text-zinc-300 font-black">{'\u20B9'}</span>
                  </div>
                )}
                <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded text-[8px] font-bold uppercase">{property.type}</span>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-3 flex flex-col min-w-0 justify-between">

                {/* Name + Price */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[13px] font-bold text-[#1C1917] font-serif leading-tight line-clamp-1">
                        {property.name}
                      </h3>
                      <span className="text-[13px] font-black text-[#B45309]">
                        {formatPrice(property.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Location + Rate */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 text-zinc-500 min-w-0">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="text-[10px] font-medium truncate">
                      {property.location ? `${property.location.split(',')[0]}, ` : ''}
                      {property.city.split(',')[0]}
                    </span>
                  </div>
                  {formatDerivedPricePerSqFt(property.price, property.area) && (
                    <span className="text-[9px] text-zinc-400 font-semibold shrink-0">
                      {formatDerivedPricePerSqFt(property.price, property.area)}
                    </span>
                  )}
                </div>

                {/* Matching signal — the product differentiator: this isn't just a listing,
                    it knows who's actually looking. Only shown when there are live matches. */}
                {matchCounts[property.id] > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#3F6212]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#3F6212] opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#3F6212]"></span>
                    </span>
                    {matchCounts[property.id]} live {matchCounts[property.id] === 1 ? 'buyer matches' : 'buyers match'} this
                  </div>
                )}

                {/* Tags */}
                <div className="flex items-center flex-wrap gap-1">
                  {property.bhkOptions && property.bhkOptions.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[8px] font-bold border border-blue-100">{property.bhkOptions.slice(0, 2).join(', ')}</span>
                  )}
                  {property.area && (
                    <span className="px-1.5 py-0.5 bg-zinc-50 text-zinc-600 rounded text-[8px] font-bold border border-zinc-100">{property.area}</span>
                  )}
                  {property.reraApproved && (
                    <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded text-[8px] font-bold border border-green-100">RERA</span>
                  )}
                  {property.gatedCommunity && (
                    <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[8px] font-bold border border-purple-100">Gated</span>
                  )}
                  {property.bankLoanAvailable && (
                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[8px] font-bold border border-emerald-100">Loan</span>
                  )}
                  {property.projectStatus && property.projectStatus !== 'pre-launch' && (
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${property.projectStatus === 'ready-to-move' ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
                      {property.projectStatus === 'ready-to-move' ? 'Ready' : 'UC'}
                    </span>
                  )}
                </div>

                {/* View Details + Share (with all sharing options) */}
                {property.slug && (
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/visit/${property.slug}`}
                      className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[9px] md:text-[10px] font-bold transition-all active:scale-95 bg-[#1C1917] text-white hover:bg-[#B45309] shadow-sm"
                    >
                      <Eye className="w-3 h-3 md:w-3.5 md:h-3.5" />View Details
                    </Link>
                    <div className="relative flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === property.id ? null : property.id);
                        }}
                        className={`w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[9px] md:text-[10px] font-bold border transition-all active:scale-95 ${
                          openMenuId === property.id
                            ? 'border-[#B45309]/30 text-[#B45309] bg-[#FAF7F2]'
                            : 'border-[#E7E5E4] text-[#57534E] hover:text-[#B45309] bg-white'
                        }`}
                        aria-label="Share"
                      >
                        <Share2 className="w-3 h-3 md:w-3.5 md:h-3.5" />Share
                      </button>

                      {openMenuId === property.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-full mb-1 z-20 w-36 bg-white border border-[#E7E5E4] rounded-lg shadow-xl py-1 text-left"
                        >
                          <button
                            onClick={() => { setOpenMenuId(null); handleShare(property.slug, property.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]"
                          >
                            <Share2 className="w-3.5 h-3.5" /> Copy link
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDownloadPDF(property); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]"
                          >
                            <Download className="w-3.5 h-3.5" /> Download PDF
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleGenerateQR(property.slug, property.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Download QR
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDownloadGallery(property.id, property.name); }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309]"
                          >
                            <Images className="w-3.5 h-3.5" /> Download gallery
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>

        {/* Fixed Bottom Navigation — 2 primary actions (card-style, matches quick-action cards) */}
        <div className="shrink-0 fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#E7E5E4] px-3 py-2 safe-area-pb">
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard/lead-matching"
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2 active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 bg-[#B45309]/10 rounded-xl flex items-center justify-center shrink-0">
                <Zap className="w-4.5 h-4.5 text-[#B45309]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1C1917] font-serif leading-tight">Lead Matching</p>
                <p className="text-[9px] text-[#A8A29E] font-semibold uppercase tracking-wide">Match & Connect</p>
              </div>
            </Link>
            <Link
              href="/dashboard/marketplace"
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2 active:scale-95 transition-transform"
            >
              <div className="w-9 h-9 bg-[#B45309]/10 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4.5 h-4.5 text-[#B45309]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#1C1917] font-serif leading-tight">Sell & Earn</p>
                <p className="text-[9px] text-[#A8A29E] font-semibold uppercase tracking-wide">Marketplace</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ============ DESKTOP VIEW ============ */}
      <div className="hidden lg:block pb-10">
        <div className="px-8 py-8 max-w-5xl mx-auto space-y-8">

          {/* Welcome Hero */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1C1917] via-[#292524] to-[#1C1917] p-8 shadow-2xl shadow-black/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#B45309]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#B45309]/5 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4" />
            <div className="absolute top-4 right-6 opacity-10">
              <Sparkles className="w-20 h-20 text-[#B45309]" />
            </div>

            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-[#B45309] text-xs font-bold uppercase tracking-[0.2em] mb-1">{greeting}</p>
                <h1 className="text-3xl font-bold text-white font-serif tracking-tight">{user.name}</h1>
                <p className="text-sm text-stone-400 mt-1.5 max-w-md">
                  Manage leads, track performance, and grow your real estate business.
                </p>
              </div>
              <Link
                href="/dashboard/projects/new"
                className="flex items-center gap-2 bg-[#B45309] text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-[#B45309]/30 hover:shadow-xl hover:shadow-[#B45309]/40 hover:-translate-y-0.5 transition-all"
              >
                <PlusCircle className="w-5 h-5" />
                <span>Upload New Project</span>
              </Link>
            </div>

            {/* Quick Stats Row */}
            <div className="relative z-10 grid grid-cols-3 gap-3 mt-8">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-[#B45309]" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Views</span>
                </div>
                {statsLoading ? (
                  <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-black text-white font-serif">{stats.totalViews.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <UserCheck className="w-3.5 h-3.5 text-[#B45309]" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Leads</span>
                </div>
                {statsLoading ? (
                  <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-black text-white font-serif">{stats.totalLeads.toLocaleString()}</p>
                )}
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#B45309]" />
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Projects</span>
                </div>
                {statsLoading ? (
                  <div className="h-6 w-10 mx-auto bg-white/10 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-black text-white font-serif">{stats.totalProjects}</p>
                )}
              </div>
            </div>
          </div>

          {/* 4 Action Cards */}
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => window.location.href = '/dashboard/lead-matching'} className="group relative bg-white rounded-3xl border border-[#E7E5E4] p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-3xl" />
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center text-[#B45309] mb-4 shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#B45309] transition-colors">Lead Matching</h3>
                <p className="text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">Match & Connect</p>
                <div className="mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-[10px] font-bold">Open</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            </button>

            <Link href="/dashboard/marketplace" className="group relative bg-white rounded-3xl border border-[#E7E5E4] p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-3xl" />
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center text-[#B45309] mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#B45309] transition-colors">Sell & Earn</h3>
                <p className="text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">Marketplace</p>
                <div className="mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-[10px] font-bold">Open</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            </Link>

            <Link href="/dashboard/crm" className="group relative bg-white rounded-3xl border border-[#E7E5E4] p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-3xl" />
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center text-[#B45309] mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#B45309] transition-colors">CRM</h3>
                <p className="text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">Pipeline</p>
                {!statsLoading && stats.crmHot > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-100 rounded-full">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-red-600">{stats.crmHot} Hot</span>
                  </div>
                )}
              </div>
            </Link>

            <Link href="/dashboard/employees" className="group relative bg-white rounded-3xl border border-[#E7E5E4] p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-3xl" />
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center text-[#B45309] mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#B45309] transition-colors">One Employee</h3>
                <p className="text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">Team</p>
                <div className="mt-3 flex items-center gap-1 text-[#B45309] opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-[10px] font-bold">Open</span>
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          </div>

          {/* CRM Banner */}
          {!statsLoading && stats.crmTotal > 0 && (
            <Link href="/dashboard/crm" className="group block relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#B45309] to-[#92400E] p-5 shadow-lg shadow-[#B45309]/15 hover:shadow-xl hover:shadow-[#B45309]/25 hover:-translate-y-0.5 transition-all">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4" />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">CRM Pipeline</p>
                    <p className="text-white text-base font-bold">{stats.crmTotal} leads &middot; {stats.crmHot} hot</p>
                  </div>
                </div>
                <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </Link>
          )}

          {/* Tip */}
          <div className="flex items-center gap-3 p-4 bg-white border border-[#E7E5E4] rounded-2xl shadow-sm">
            <div className="w-8 h-8 bg-[#B45309]/5 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#B45309]" />
            </div>
            <p className="text-sm text-[#57534E]">
              <span className="font-bold text-[#1C1917]">Tip:</span> Upload projects with complete details and images to attract more leads.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

