'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { getLeadGenUrl, analyticsApi, projectsApi, crmBridgeApi } from '@/lib/api';
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
  IndianRupee,
  ChevronUp,
  Share2,
  Download,
  QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
    toast.loading('Generating PDF...', { id: 'pdf' });
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pw = doc.internal.pageSize.getWidth();
      const m = 14;
      let y = 0;

      // Cover image
      if (property.coverImage) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = property.coverImage!; });
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) { ctx.drawImage(img, 0, 0); const d = canvas.toDataURL('image/jpeg', 0.8); doc.addImage(d, 'JPEG', 0, 0, pw, 100); }
        } catch { /* skip */ }
      }

      // Dark overlay
      (doc as any).setGState(new (doc as any).GState({ opacity: 0.65 }));
      doc.setFillColor(20, 18, 15);
      doc.rect(0, 60, pw, 40, 'F');
      (doc as any).setGState(new (doc as any).GState({ opacity: 1 }));

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text(property.name, m, 78);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.setTextColor(210, 210, 210);
      doc.text(`${property.location || property.city}`, m, 88);

      // Price badge
      const priceStr = formatPrice(property.price);
      doc.setFillColor(180, 83, 9);
      const bw = doc.getTextWidth(priceStr) + 12;
      doc.roundedRect(pw - bw - m, 10, bw, 10, 2, 2, 'F');
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
      doc.text(priceStr, pw - bw - m + 6, 17);

      y = 110;

      // Details
      doc.setFillColor(180, 83, 9); doc.rect(m, y, 25, 0.8, 'F'); y += 7;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 25, 23);
      doc.text('Property Overview', m, y); y += 9;

      const details: [string, string][] = [
        ['TYPE', property.type.charAt(0).toUpperCase() + property.type.slice(1)],
        ['AREA', property.area || 'On Request'],
        ['PRICE', formatPrice(property.price)],
        ['RATE', property.pricePerSqFt ? `Rs. ${property.pricePerSqFt.toLocaleString('en-IN')}/sqft` : 'On Request'],
        ['LOCATION', `${(property.location || '').split(',')[0]}, ${(property.city || '').split(',')[0]}`],
        ['BHK', property.bhkOptions.length ? property.bhkOptions.join(', ') : '-'],
      ];
      const cw = (pw - m * 2) / 3;
      details.forEach(([label, val], i) => {
        const cx = m + (i % 3) * cw;
        const cy = y + Math.floor(i / 3) * 15;
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(160, 155, 150);
        doc.text(label, cx, cy);
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 25, 23);
        doc.text(val, cx, cy + 5);
      });
      y += Math.ceil(details.length / 3) * 15 + 8;

      // Amenities
      if (property.amenities && property.amenities.length > 0) {
        doc.setFillColor(180, 83, 9); doc.rect(m, y, 25, 0.8, 'F'); y += 7;
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 25, 23);
        doc.text('Amenities', m, y); y += 7;
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
        doc.text(property.amenities.slice(0, 10).join('  •  '), m, y);
        y += 10;
      }

      // Footer
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 155, 150);
      doc.text('HomeInTown | Property Brochure', m, doc.internal.pageSize.getHeight() - 7);
      if (property.slug) {
        const url = `${window.location.origin}/visit/${property.slug}`;
        doc.setTextColor(180, 83, 9);
        doc.text(url, pw - m - doc.getTextWidth(url), doc.internal.pageSize.getHeight() - 7);
      }

      doc.save(`${property.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 25)}_Brochure.pdf`);
      toast.success('PDF downloaded!', { id: 'pdf' });
    } catch {
      toast.error('Failed to generate PDF', { id: 'pdf' });
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

  const formatPrice = (price: number) => {
    if (!price) return 'Price on Request';
    if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
    if (price >= 100000) return `₹${(price / 100000).toFixed(1)} Lac`;
    return `₹${price.toLocaleString('en-IN')}`;
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

        {/* Property Reels - Vertical Snap Scroll */}
        <div className="flex-1 overflow-y-scroll snap-y snap-mandatory mt-3 mb-0 px-3 pb-20 space-y-3 scrollbar-hide">
          {properties.length === 0 && !statsLoading && (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-zinc-400">No properties to show</p>
            </div>
          )}
          {properties.map((property) => (
            <div
              key={property.id}
              className="snap-start shrink-0 bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden"
              style={{ minHeight: 'calc(100dvh - 230px)' }}
            >
              {/* Image */}
              <div className="relative h-[55%] min-h-[180px] bg-zinc-100">
                {property.coverImage ? (
                  <img
                    src={property.coverImage}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50">
                    <IndianRupee className="w-16 h-16 text-zinc-200" />
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white rounded-lg text-[9px] font-bold uppercase tracking-wide">
                    {property.type}
                  </span>
                  {property.reraApproved && (
                    <span className="px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white rounded-lg text-[9px] font-bold">
                      RERA ✓
                    </span>
                  )}
                </div>
                {/* Price overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent pt-10 pb-3 px-4">
                  <p className="text-white text-xl font-black font-serif tracking-tight">{formatPrice(property.price)}</p>
                  {property.pricePerSqFt > 0 && (
                    <p className="text-white/70 text-[10px] font-medium">₹{property.pricePerSqFt.toLocaleString('en-IN')}/sq.ft</p>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-4 flex flex-col gap-2">
                <h3 className="text-base font-black text-[#1C1917] font-serif leading-tight">{property.name}</h3>

                <div className="flex items-center gap-1 text-zinc-500">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="text-xs font-medium truncate">{property.location ? `${property.location.split(',')[0]}, ` : ''}{property.city.split(',')[0]}</span>
                </div>

                {/* Tags */}
                <div className="flex items-center flex-wrap gap-1.5 mt-1">
                  {property.bhkOptions.length > 0 && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100">
                      {property.bhkOptions.slice(0, 2).join(' / ')}
                    </span>
                  )}
                  {property.area && (
                    <span className="px-2 py-0.5 bg-zinc-50 text-zinc-600 rounded-md text-[10px] font-bold border border-zinc-100">
                      {property.area}
                    </span>
                  )}
                  {property.projectStatus && (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                      property.projectStatus === 'ready-to-move'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : property.projectStatus === 'under-construction'
                        ? 'bg-orange-50 text-orange-700 border-orange-100'
                        : 'bg-purple-50 text-purple-700 border-purple-100'
                    }`}>
                      {property.projectStatus === 'ready-to-move' ? 'Ready to Move' : property.projectStatus === 'under-construction' ? 'Under Construction' : 'Pre-Launch'}
                    </span>
                  )}
                </div>

                {/* View button */}
                {property.slug && (
                  <Link
                    href={`/visit/${property.slug}`}
                    className="mt-2 flex items-center justify-center gap-1.5 w-full py-2.5 bg-[#1C1917] text-white rounded-xl text-xs font-bold active:scale-[0.98] transition-transform"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Property
                  </Link>
                )}

                {/* Share, PDF, QR buttons */}
                {property.slug && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleShare(property.slug, property.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-[10px] font-bold text-[#57534E] active:scale-95 transition-transform"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(property)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-[10px] font-bold text-[#57534E] active:scale-95 transition-transform"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleGenerateQR(property.slug, property.name)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl text-[10px] font-bold text-[#57534E] active:scale-95 transition-transform"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      QR Code
                    </button>
                  </div>
                )}

                {/* Additional Property Info */}
                <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5">
                  {/* Highlights Row */}
                  <div className="flex items-center flex-wrap gap-1.5">
                    {property.gatedCommunity && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[9px] font-bold border border-purple-100">
                        Gated Community
                      </span>
                    )}
                    {property.bankLoanAvailable && (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[9px] font-bold border border-emerald-100">
                        Bank Loan Available
                      </span>
                    )}
                    {property.floorRange && (
                      <span className="px-2 py-0.5 bg-zinc-50 text-zinc-600 rounded-md text-[9px] font-bold border border-zinc-100">
                        Floor: {property.floorRange}
                      </span>
                    )}
                    {property.facingOptions && property.facingOptions.length > 0 && (
                      <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md text-[9px] font-bold border border-sky-100">
                        {property.facingOptions.slice(0, 2).join(', ')} Facing
                      </span>
                    )}
                  </div>

                  {/* Price Range */}
                  {property.priceRange && (
                    <div className="flex items-center gap-2">
                      <IndianRupee className="w-3 h-3 text-zinc-400" />
                      <span className="text-[10px] text-zinc-500 font-medium">Range: <span className="text-zinc-700 font-bold">{property.priceRange}</span></span>
                    </div>
                  )}

                  {/* Amenities */}
                  {property.amenities && property.amenities.length > 0 && (
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Amenities</p>
                      <div className="flex flex-wrap gap-1">
                        {property.amenities.slice(0, 6).map((amenity, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-amber-50 text-amber-800 rounded text-[8px] font-semibold border border-amber-100">
                            {amenity}
                          </span>
                        ))}
                        {property.amenities.length > 6 && (
                          <span className="px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded text-[8px] font-semibold border border-zinc-100">
                            +{property.amenities.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Builder */}
                  {property.ownerName && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="w-5 h-5 bg-[#B45309]/10 rounded-full flex items-center justify-center">
                        <Users className="w-2.5 h-2.5 text-[#B45309]" />
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium">By <span className="text-zinc-700 font-bold">{property.ownerName}</span></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Scroll hint */}
          {properties.length > 1 && (
            <div className="flex items-center justify-center py-2 text-zinc-300">
              <ChevronUp className="w-4 h-4 animate-bounce" />
              <span className="text-[9px] font-bold uppercase tracking-widest ml-1">Scroll for more</span>
            </div>
          )}
        </div>

        {/* Fixed Bottom Navigation */}
        <div className="shrink-0 fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-[#E7E5E4] px-2 py-2 safe-area-pb">
          <div className="grid grid-cols-4 gap-1">
            <Link
              href="#"
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl active:bg-amber-50 transition-colors"
            >
              <div className="w-8 h-8 bg-[#B45309]/10 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#B45309]" />
              </div>
              <span className="text-[8px] font-bold text-[#57534E] uppercase tracking-wide">Leads</span>
            </Link>
            <Link
              href="/dashboard/marketplace"
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl active:bg-amber-50 transition-colors"
            >
              <div className="w-8 h-8 bg-[#B45309]/10 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-[#B45309]" />
              </div>
              <span className="text-[8px] font-bold text-[#57534E] uppercase tracking-wide">Sell</span>
            </Link>
            <Link
              href="/dashboard/crm"
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl active:bg-amber-50 transition-colors relative"
            >
              <div className="w-8 h-8 bg-[#B45309]/10 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-[#B45309]" />
              </div>
              {stats.crmHot > 0 && (
                <span className="absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full border border-white" />
              )}
              <span className="text-[8px] font-bold text-[#57534E] uppercase tracking-wide">CRM</span>
            </Link>
            <Link
              href="https://www.oneemployee.in/"
              className="flex flex-col items-center gap-0.5 py-1.5 rounded-xl active:bg-amber-50 transition-colors"
            >
              <div className="w-8 h-8 bg-[#B45309]/10 rounded-xl flex items-center justify-center">
                <Users className="w-4 h-4 text-[#B45309]" />
              </div>
              <span className="text-[8px] font-bold text-[#57534E] uppercase tracking-wide">Team</span>
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
            <button onClick={handleGenerateLead} className="group relative bg-white rounded-3xl border border-[#E7E5E4] p-5 shadow-sm hover:shadow-2xl hover:shadow-[#B45309]/10 hover:-translate-y-1 hover:border-[#B45309]/40 transition-all duration-300 active:scale-[0.96] overflow-hidden text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/5 group-hover:to-amber-500/10 transition-all duration-500 rounded-3xl" />
              <div className="absolute -top-3 -right-3 w-20 h-20 bg-gradient-to-br from-[#B45309]/5 to-[#B45309]/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center text-[#B45309] mb-4 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-[#1C1917] font-serif group-hover:text-[#B45309] transition-colors">Lead Matching</h3>
                <p className="text-[10px] text-[#A8A29E] mt-1 font-semibold uppercase tracking-wider">Generate Leads</p>
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
