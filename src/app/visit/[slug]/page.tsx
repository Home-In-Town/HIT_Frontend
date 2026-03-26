

//sales-website-private-dev\frontend\src\app\visit\[slug]\page.tsx
'use client';
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import DesktopVisit from './DesktopVisit';
import { useParams, notFound } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import ProjectMap from '@/components/public/ProjectMap';
import { Project } from '@/types/project';
import { projectsApi } from '@/lib/api'; // adjust path if needed
import { useTracking } from '@/hooks/useTracking';

import { FaWhatsapp } from "react-icons/fa";
import { MapPin, Map, Eye, MapPinCheckIcon, MapPinIcon } from 'lucide-react';
import {
  Dumbbell,
  Waves,
  Trees,
  ShieldCheck,
  Car,
  Home,
  Baby,
  Zap,
} from 'lucide-react';
import ProjectsBottomDrawer from '@/components/public/ProjectBottomDrawer';
import EnquiryModal from '@/components/public/EnquiryModal';
import SubNavbar from "@/components/public/SubNavbar";
import BrochureSection from "@/components/public/BrochureSection";
import AmenitiesSection from "@/components/public/AmenitiesSection";
import { buildMediaItems } from "@/utils/buildMediaItems";
import MediaGallery from "@/components/public/MediaGallery";


export default function VisitProjectPage() {
  const params = useParams();

  const scrollRef = useRef<HTMLDivElement | null>(null);

const sectionRefs = {
  details: useRef<HTMLDivElement>(null),
  facilities: useRef<HTMLDivElement>(null),
  floor: useRef<HTMLDivElement>(null),
  booking: useRef<HTMLDivElement>(null),
  sellers: useRef<HTMLDivElement>(null),
  brochure: useRef<HTMLDivElement>(null),
};

  const rawSlug = Array.isArray(params.slug)
    ? params.slug[0]
    : params.slug;

  const slug = rawSlug
    ? decodeURIComponent(rawSlug).toLowerCase().trim()
    : null;

  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: '',
    interest: '',
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [drawerProjects, setDrawerProjects] = useState<Project[]>([]);
  const [drawerSelected, setDrawerSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [isCalling, setIsCalling] = useState(false);
  const [callId, setCallId] = useState<string | null>(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [showNeighborhoodMenu, setShowNeighborhoodMenu] = useState(false);
  const neighborhoodBtnRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const [viewerOpen, setViewerOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);
const startY = useRef(0);
const currentY = useRef(0);
const isDragging = useRef(false);
const mediaItems = buildMediaItems(project);
  const mapRef = useRef<any>(null); // Ref to ProjectMap
  useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (
      showPriceBreakdown &&
      priceRef.current &&
      !priceRef.current.contains(e.target as Node)
    ) {
      setShowPriceBreakdown(false);
    }
  }

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showPriceBreakdown]);
  // 🔥 Fetch project by slug
  const priceRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!slug) return;

    const fetchProject = async () => {
      try {
        const data = await projectsApi.getBySlug(slug);
        setProject(data);
      } catch (error) {
        console.error('Failed to fetch project:', error);
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [slug]);

  const [isDesktop, setIsDesktop] = useState(false);

useEffect(() => {
  const checkScreen = () => {
    setIsDesktop(window.innerWidth >= 1024); // Tailwind lg breakpoint
  };

  checkScreen();
  window.addEventListener("resize", checkScreen);

  return () => window.removeEventListener("resize", checkScreen);
}, []);




  // Call useTracking unconditionally with a safe projectId
const { handleCallClick, handleWhatsAppClick, handleFormSubmit } = useTracking({
  projectId: project?.id || '', // empty string until project loads
});

// ===== Stable Map Handlers =====
const handleDirections = useCallback(() => {
  mapRef.current?.getDirections();
}, []);

const handleMapView = useCallback(() => {
  mapRef.current?.setMapView();
}, []);

const handleSatelliteView = useCallback(() => {
  mapRef.current?.setSatelliteView();
}, []);

const handle3DView = useCallback(() => {
  mapRef.current?.set3DView();
}, []);

const handleStreetView = useCallback(() => {
  mapRef.current?.toggleStreetView();
}, []);

const handleDrawerData = useCallback((data: { projects: Project[]; selectedId: string | null; open: boolean }) => {
  setDrawerProjects(data.projects);
  setDrawerSelected(data.selectedId);
  setDrawerOpen(data.open);
}, []);

const mapHashes = [
  "direction",
  "map",
  "satellite",
  "threeD",
  "street",
  "hospital",
  "market",
  "restaurant",
  "metro",
  "school",
  "petrol",
  "bus",
  "railway",
];
useEffect(() => {
  if (!project) return;

  const hash = window.location.hash.replace("#", "").split("?")[0]; // strip any leaked query params

  const isMapAction = mapHashes.includes(hash);

  if (!isMapAction) {
    setOpen(true); // normal behaviour
  } else {
    setOpen(false); // map link → keep closed
  }
}, [project]);
useEffect(() => {
  const scrollToHash = () => {
    const hash = window.location.hash.replace("#", "").split("?")[0]; // strip any leaked query params
    if (!hash) return;

    const container = scrollRef.current;
    if (!container) return;

    const el = container.querySelector(`#${hash}`) as HTMLElement;
    if (!el) return;

    container.scrollTo({
      top: el.offsetTop - 60, // offset for navbar
      behavior: "smooth",
    });
  };

  // wait until drawer opens
  if (open) {
    setTimeout(scrollToHash, 300);
  }

  window.addEventListener("hashchange", scrollToHash);

  return () => {
    window.removeEventListener("hashchange", scrollToHash);
  };
}, [project, open]);
const handleMapHash = () => {
  if (!mapRef.current) return;

  const hash = window.location.hash.replace("#", "").split("?")[0]; // strip any leaked query params

  switch (hash) {
    case "direction":
      mapRef.current?.getDirections();
      break;

    case "map":
      mapRef.current?.setMapView();
      break;

    case "satellite":
      mapRef.current?.setSatelliteView();
      break;

    case "threeD":
      mapRef.current?.set3DView();
      break;

    case "street":
      mapRef.current?.toggleStreetView();
      break;

    case "hospital":
    case "market":
    case "restaurant":
    case "metro":
    case "school":
    case "petrol":
    case "bus":
    case "railway":
      mapRef.current?.setNeighborhoodFilter(hash);
      break;
  }
};
useEffect(() => {
  if (!project) return;

  setTimeout(() => {
    handleMapHash();
  }, 600); // wait for map to mount
}, [project, mapDrawerOpen]);
  // ⏳ Loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading project…
      </div>
    );
  }

  // ❌ Not found
  if (!project) {
    return notFound();
  }

  const hasCoordinates =
  typeof project.latitude === 'number' &&
  typeof project.longitude === 'number';


  const downloadBrochure = async () => {
  if (!project?.brochureUrl) return;

  const brochureUrl = typeof project.brochureUrl === 'string' ? project.brochureUrl : project.brochureUrl?.url;
  if (!brochureUrl) return;

  const res = await fetch(brochureUrl);
  const blob = await res.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Project_Brochure.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const handleWhatsApp = () => {
  handleWhatsAppClick?.();

  if (!project.whatsappNumber) {
    alert('WhatsApp not available');
    return;
  }

  // If backend already gives a WhatsApp URL, respect it
  if (project.whatsappNumber.startsWith('http')) {
    window.open(project.whatsappNumber, '_blank', 'noopener,noreferrer');
    return;
  }

  const cleanNumber = project.whatsappNumber.replace(/\D/g, '');

  const message = encodeURIComponent(
    `Hi, I'm interested in ${project.name} at ${project.location}, ${project.city}. Please share more details.`
  );

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = `whatsapp://send?phone=${cleanNumber}&text=${message}`;
  } else {
    window.open(
      `https://web.whatsapp.com/send?phone=${cleanNumber}&text=${message}`,
      '_blank'
    );
  }
};

const handleCall = () => {
  handleCallClick?.();

  if (!project.callNumber && !project.whatsappNumber) {
    alert('Call not available');
    return;
  }

  const toNumber = (project.callNumber || project.whatsappNumber || '')
    .replace(/\D/g, '');

  if (!toNumber) {
    alert('Invalid phone number');
    return;
  }

  // Use native phone dialer
  window.location.href = `tel:+91${toNumber}`;
};

const handleFormOpen = () => setShowFormModal(true);

const handleFormClose = () => {
  setShowFormModal(false);
  setFormData({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    description: '',
    interest: '',
  });
  setFormSubmitted(false);
};



const formatStatus = (status: string) =>
  status
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatRera = (rera?: string) => {
  if (!rera) return "RERA Approved";
  return rera;
};

const openProjectDetails = () => {
  setOpen(true);

  // optional: scroll details to top on open
  requestAnimationFrame(() => {
    document
      .querySelector('#project-details-scroll')
      ?.scrollTo({ top: 0, behavior: 'smooth' });
  });
};

const closeProjectDetails = () => {
  requestAnimationFrame(() => setOpen(false));
};



const CTAButtons = (
  <div
    className="bg-white p-1.5 mb-2 mt-2
               shadow-[0_-4px_12px_rgba(0,0,0,0.06)]
               pb-[env(safe-area-inset-bottom)]"
  >
    <div className="grid grid-cols-3 gap-1.5">

      {/* CALL */}
      <button
        onClick={handleCall}
        disabled={isCalling}
        className="rounded-md border border-[#3E5F16] py-1.5
                   text-[10px] font-semibold text-[#3E5F16]
                   transition disabled:opacity-60"
      >
        {isCalling ? "Calling…" : "Call"}
      </button>

      {/* WHATSAPP */}
      <button
        onClick={handleWhatsApp}
        className="flex items-center justify-center gap-1
                   rounded-md border border-[#3E5F16]
                   bg-white py-1.5 px-2
                   text-[10px] font-semibold text-[#3E5F16]
                   hover:bg-[#25D366]/10
                   transition"
      >
        <FaWhatsapp className="text-sm" />
        WhatsApp
      </button>

      {/* BOOK SITE VISIT */}
      <button
        onClick={handleFormOpen}
        className="rounded-md bg-[#3E5F16] py-1.5
                   text-[10px] font-semibold text-white
                   transition"
      >
        {project.ctaButtonText || "Book Visit"}
      </button>

    </div>
  </div>
);

const isPlot = project.type === "plot";
type FloorPlan = {
  title: string;
  area: string;
  price: string;
  image?: string;
  possession?: string; 
};


const getImageUrl = (val: any) => typeof val === 'object' && val !== null ? val.url : val;

const floorPlans: FloorPlan[] = isPlot
  ? [
      {
        title: "Residential Plot",
        area: project.plotSizeRange || "1200 – 2400 sq.ft",
        price: "₹ 25 L onwards",
        image: getImageUrl(project.coverImage),
      },
      {
        title: "Corner Plot",
        area: "1800 sq.ft",
        price: "₹ 32 L onwards",
        image: getImageUrl(project.coverImage),
      },
    ]
  : [
      {
        title: "2 BHK",
        area: "1050 sq.ft",
        possession: "Dec 2027",
        price: "₹ 78 L onwards",
        image: getImageUrl(project.coverImage),
      },
      {
        title: "3 BHK",
        area: "1350 sq.ft",
        possession: "Dec 2027",
        price: "₹ 98 L onwards",
        image: getImageUrl(project.coverImage),
      },
    ];


 if (isDesktop) {
  return (
    <>
    <DesktopVisit
      project={project}
      floorPlans={floorPlans}
      onCallClick={handleCall}
      onWhatsAppClick={handleWhatsApp}
      onEnquireClick={handleFormOpen}

      // 🔥 MAP CONTROL
      mapRef={mapRef}
      hasCoordinates={hasCoordinates}
      onMarkerClick={openProjectDetails}

        // 🔥 MAP ACTION BUTTONS
        onDirections={handleDirections}   
        onMapView={handleMapView}
        on3DView={handle3DView}
        onSatelliteView={handleSatelliteView}
        onStreetView={handleStreetView}
        

      // 🔥 DRAWER SYNC
      drawerProjects={drawerProjects}
      drawerSelected={drawerSelected}
      drawerOpen={drawerOpen}
      onDrawerData={handleDrawerData}

      
    />

     <EnquiryModal
        open={showFormModal}
        onClose={handleFormClose}
        onSubmitTracking={handleFormSubmit}
        project={{
          id: project.id,
          name: project.name,
        }}
      />
    </>
  );
}


  return (
    <div className="
     relative bg-white">
      {/* MAP */}
      {/* <div className="relative h-[90vh] w-full lg:h-screen"> */}
  {/* MAP */}
<div className="relative h-screen w-full"> 
  {hasCoordinates ? (
    <ProjectMap
    projectId={project.id}
    ref={mapRef}
      lat={project.latitude!}
      lng={project.longitude!}
      logo={getImageUrl(project.coverImage)}
      focusOnly
      onMarkerClick={openProjectDetails}
      onDrawerData={handleDrawerData}
    />
    
  ) : (
    <div className="flex h-full items-center justify-center bg-gray-200 text-sm text-gray-600">
      Map location not available
    </div>
  )}
 {/* MOBILE CTA + DETAILS BUTTON — VISIT MODE ONLY */}
{!drawerOpen && (
  <div className=" fixed bottom-0 left-0 right-0 z-[60] bg-white">

    {/* View details toggle */}
    <button
      onClick={() => setOpen(true)}
      className="w-full py-3 text-sm font-semibold  bg-white"
    >
      View Project Details
    </button>
  </div>
)}
</div>    
      <div >
      {drawerOpen && (
        <ProjectsBottomDrawer
          projects={drawerProjects}
          selectedProjectId={drawerSelected}
        />
      )}

      {open && (
      <div
        ref={sheetRef}
        className={`
          fixed bottom-0 left-0 right-0 z-[60]
          bg-white shadow-2xl
          rounded-t-2xl
          transition-transform duration-300
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
     
         <div
            ref={scrollRef}
            id="project-details-scroll"
            className="overflow-y-auto overflow-x-visible  max-h-[90vh] "

          >
           <div className="px-4">
            {/* TOP SECTION: DETAILS */}
            <div className="relative pl-4 mt-3 flex justify-start">
            {/* SHARE BUTTON — add this just before the close button */}
{/* SHARE BUTTON */}
<button
  onClick={async () => {
  const pageUrl = window.location.href;
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── COLORS ──────────────────────────────────────
  const C = {
    green:      '#3E5F16',
    greenLight: '#EEF3E8',
    greenMid:   '#6B8F3E',
    white:      '#FFFFFF',
    gray50:     '#F9FAFB',
    gray100:    '#F3F4F6',
    gray200:    '#E5E7EB',
    gray500:    '#6B7280',
    gray700:    '#374151',
    gray900:    '#111827',
    blue:       '#2563EB',
    amber:      '#D97706',
    red:        '#DC2626',
  };

  const hex2rgb = (hex: string) => ({
    r: parseInt(hex.slice(1,3),16),
    g: parseInt(hex.slice(3,5),16),
    b: parseInt(hex.slice(5,7),16),
  });
  const fillBg  = (h: string) => { const {r,g,b}=hex2rgb(h); doc.setFillColor(r,g,b); };
  const setTxt  = (h: string) => { const {r,g,b}=hex2rgb(h); doc.setTextColor(r,g,b); };
  const setDrw  = (h: string) => { const {r,g,b}=hex2rgb(h); doc.setDrawColor(r,g,b); };

  const checkPage = (needed = 12) => {
    if (y + needed > pageH - 16) { doc.addPage(); y = 16; }
  };

  // ── PILL (no emoji) ──────────────────────────────
  const pill = (text: string, bgH: string, txtH: string, x: number, py: number) => {
    doc.setFontSize(7); doc.setFont('helvetica','bold');
    const w = doc.getTextWidth(text) + 7;
    fillBg(bgH); setDrw(bgH);
    doc.roundedRect(x, py - 4, w, 6, 1.5, 1.5, 'F');
    setTxt(txtH);
    doc.text(text, x + 3.5, py + 0.3);
    return w + 3;
  };

  // ── SECTION HEADING BAR ──────────────────────────
  const sectionHead = (title: string) => {
    checkPage(14);
    fillBg(C.green);
    doc.roundedRect(margin, y, contentW, 9, 2, 2, 'F');
    setTxt(C.white);
    doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    doc.text(title.toUpperCase(), margin + 5, y + 6.2);
    y += 13;
  };

  // ── INFO ROW ─────────────────────────────────────
  const infoRow = (label: string, value: string, valColor = C.gray900) => {
    checkPage(8);
    setTxt(C.gray500); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
    doc.text(label, margin + 3, y);
    setTxt(valColor); doc.setFontSize(8); doc.setFont('helvetica','bold');
    // Wrap long values
    const maxValW = contentW - 68;
    const lines = doc.splitTextToSize(String(value || '-'), maxValW);
    doc.text(lines, margin + 68, y);
    y += Math.max(lines.length * 5, 6.5);
  };

  // ── PROGRESS BAR ─────────────────────────────────
  const progressBar = (pct: number, px: number, py: number, pw: number) => {
    fillBg(C.gray200); setDrw(C.gray200);
    doc.roundedRect(px, py, pw, 4, 1, 1, 'F');
    fillBg(C.green); setDrw(C.green);
    doc.roundedRect(px, py, pw * (pct / 100), 4, 1, 1, 'F');
  };

  // ── STAT TILE ────────────────────────────────────
  const statTile = (label: string, value: string, x: number, tw: number, ty: number) => {
    fillBg(C.gray50); setDrw(C.gray200);
    doc.roundedRect(x, ty, tw, 17, 2, 2, 'FD');
    setTxt(C.gray500); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.text(label, x + 4, ty + 6);
    setTxt(C.green); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    const valLines = doc.splitTextToSize(value, tw - 8);
    doc.text(valLines[0], x + 4, ty + 13);
  };

  // ── CLICKABLE CTA BUTTON ─────────────────────────
  const ctaBtn = (label: string, sub: string, bgH: string, x: number, bw: number, by: number, url: string) => {
    fillBg(bgH); setDrw(bgH);
    doc.roundedRect(x, by, bw, 14, 2.5, 2.5, 'F');
    setTxt(C.white);
    doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text(label, x + bw / 2, by + 6, { align: 'center' });
    doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.text(sub, x + bw / 2, by + 10.5, { align: 'center' });
    // Invisible clickable link over the button
    doc.link(x, by, bw, 14, { url });
  };

  // ════════════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════════════
  fillBg(C.green); doc.rect(0, 0, pageW, 50, 'F');

  // Decorative accent circle (no emoji, pure geometry)
  fillBg(C.greenMid); doc.circle(pageW - 18, 8, 30, 'F');
  fillBg(C.green);    doc.circle(pageW - 10, 4, 24, 'F');

  // Project name
  setTxt(C.white);
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  const nameLines = doc.splitTextToSize(project.name, 135);
  doc.text(nameLines, margin, 17);

  // Location
  setTxt('#c8dfa8');
  doc.setFontSize(8.5); doc.setFont('helvetica','normal');
  doc.text(`${project.location}, ${project.city}`, margin, 17 + nameLines.length * 9);

  y = 56;

  // Pills row
  let px = margin;
  px += pill(formatStatus(project.projectStatus), C.greenLight, C.green, px, y);
  if (project.reraApproved) px += pill('RERA Approved', C.greenLight, C.green, px, y);
  if (project.bankLoanAvailable) pill('Bank Loan Available', C.greenLight, C.green, px, y);
  y += 11;

  // Stat tiles
  const tileW = (contentW - 6) / 3;
  statTile('Starting Price', 'Rs. 65 L+', margin, tileW, y);
  statTile('Saleable Area', '850-1200 sq.ft', margin + tileW + 3, tileW, y);
  statTile(
    isPlot ? 'Plot Size' : 'Configuration',
    isPlot ? (project.plotSizeRange || '-') : (project.bhkOptions?.join(' / ') || '-'),
    margin + (tileW + 3) * 2, tileW, y
  );
  y += 23;

  // CTA BUTTONS — clickable links
  const bw = (contentW - 6) / 3;
  const callNum = (project.callNumber || project.whatsappNumber || '').replace(/\D/g,'');
  const waNum   = (project.whatsappNumber || project.callNumber || '').replace(/\D/g,'');
  const waMsg   = encodeURIComponent(`Hi, I'm interested in ${project.name} at ${project.location}, ${project.city}. Please share more details.`);

  ctaBtn('Call Now', callNum ? `+91 ${callNum}` : 'Tap to Call', C.green,
    margin, bw, y, callNum ? `tel:+91${callNum}` : pageUrl);
  ctaBtn('WhatsApp', 'Quick Response', '#25A244',
    margin + bw + 3, bw, y, waNum ? `https://wa.me/91${waNum}?text=${waMsg}` : pageUrl);
  ctaBtn(project.ctaButtonText || 'Book Site Visit', 'Schedule Now', C.amber,
    margin + (bw + 3) * 2, bw, y, pageUrl);
  y += 20;

  // ── Try embed cover image ──
  const coverSrc = getImageUrl(project.coverImage);
  if (coverSrc) {
    try {
      const imgUrl = coverSrc.startsWith('http')
        ? coverSrc
        : `${process.env.NEXT_PUBLIC_API_URL}${coverSrc}`;
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      const b64: string = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const ext = blob.type.includes('png') ? 'PNG' : 'JPEG';
      checkPage(55);
      doc.addImage(b64, ext, margin, y, contentW, 52);
      // Clickable overlay on image → opens page
      doc.link(margin, y, contentW, 52, { url: pageUrl });
      y += 56;
    } catch {
      // image failed to load — skip silently
    }
  }

  // ════════════════════════════════════════════════
  // MEDIA GALLERY IMAGES
  // ════════════════════════════════════════════════
  const galleryImages = mediaItems.filter((m) => m.type === 'image').slice(0, 6);

  if (galleryImages.length > 0) {
    sectionHead('Project Gallery');

    const cols = 2;
    const imgW = (contentW - (cols - 1) * 4) / cols;
    const imgH = imgW * 0.6;

    for (let i = 0; i < galleryImages.length; i++) {
      const col = i % cols;
      const fx  = margin + col * (imgW + 4);

      if (col === 0) checkPage(imgH + 6);

      // Pre-fetch all gallery images, collect only successful ones
      type FetchedImg = { b64: string; ext: string };
      const fetchedImgs: FetchedImg[] = [];

      for (const gImg of galleryImages) {
        try {
          const src = gImg.src;
          const imgUrl = src.startsWith('http')
            ? src
            : `${process.env.NEXT_PUBLIC_API_URL}${src}`;
          const res  = await fetch(imgUrl);
          const blob = await res.blob();
          const b64: string = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(blob);
          });
          fetchedImgs.push({ b64, ext: blob.type.includes('png') ? 'PNG' : 'JPEG' });
        } catch {
          // skip failed images entirely — no placeholder
        }
      }

      for (let i = 0; i < fetchedImgs.length; i++) {
        const col = i % cols;
        const fx  = margin + col * (imgW + 4);
        if (col === 0) checkPage(imgH + 6);
        doc.addImage(fetchedImgs[i].b64, fetchedImgs[i].ext, fx, y, imgW, imgH);
        doc.link(fx, y, imgW, imgH, { url: pageUrl });
        if (col === cols - 1 || i === fetchedImgs.length - 1) y += imgH + 5;
      }
    }
    y += 4;
  }

  // ════════════════════════════════════════════════
  // PROJECT OVERVIEW
  // ════════════════════════════════════════════════
  sectionHead('Project Overview');
  infoRow('Project Name',   project.name);
  infoRow('Location',       `${project.location}, ${project.city}`);
  infoRow('Status',         formatStatus(project.projectStatus), C.green);
  if (project.type)               infoRow('Property Type',  project.type.charAt(0).toUpperCase() + project.type.slice(1));
  if (project.bhkOptions?.length) infoRow('BHK Options',    project.bhkOptions.join(' / '));
  if (project.floorRange)         infoRow('Total Floors',   project.floorRange);
  if (project.carpetAreaRange)    infoRow('Carpet Area',    project.carpetAreaRange);
  if (project.plotSizeRange)      infoRow('Plot Size Range',project.plotSizeRange);
  if (project.facingOptions?.length) infoRow('Facing',      project.facingOptions.join(', '));
  if (typeof project.gatedCommunity === 'boolean')
    infoRow('Gated Community', project.gatedCommunity ? 'Yes' : 'No',
      project.gatedCommunity ? C.green : C.gray700);
  infoRow('Bank Loan', project.bankLoanAvailable ? 'Available' : 'Not Available',
    project.bankLoanAvailable ? C.green : C.red);
  y += 4;

  // ════════════════════════════════════════════════
  // PRICING BREAKDOWN
  // ════════════════════════════════════════════════
  sectionHead('Pricing Breakdown');

  const priceData = [
    ['MRP (Rs. / sq.ft)', 'Rs. 5,200'],
    ['GST (5%)',           'Rs. 3,25,000'],
    ['Registration',       'Rs. 1,10,000'],
    ['Other Charges',      'Rs. 85,000'],
    ['Government Charges', 'Rs. 75,000'],
    ['Legal Charges',      'Rs. 50,000'],
  ] as const;

  const labelColW = contentW * 0.62;
  const valColW   = contentW - labelColW;

  priceData.forEach(([label, val], i) => {
    checkPage(9);
    if (i % 2 === 0) { fillBg(C.gray50); doc.rect(margin, y - 2.5, contentW, 8, 'F'); }
    setTxt(C.gray700); doc.setFontSize(8); doc.setFont('helvetica','normal');
    doc.text(label, margin + 4, y + 3);
    setTxt(C.gray900); doc.setFont('helvetica','bold');
    doc.text(val, margin + labelColW + valColW - 3, y + 3, { align: 'right' });
    y += 8;
  });

  // Total bar
  checkPage(12);
  fillBg(C.green); doc.rect(margin, y, contentW, 10, 'F');
  setTxt(C.white); doc.setFontSize(9); doc.setFont('helvetica','bold');
  doc.text('TOTAL COST', margin + 5, y + 7);
  doc.text('Rs. 72,45,000', margin + contentW - 4, y + 7, { align: 'right' });
  y += 15;

  // EMI hint card
  checkPage(10);
  fillBg(C.greenLight); setDrw(C.green);
  doc.roundedRect(margin, y, contentW, 9, 2, 2, 'FD');
  setTxt(C.green); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('EMI from approx. Rs. 48,000/month  |  Bank finance available', margin + 5, y + 6);
  y += 14;

  
  // ════════════════════════════════════════════════
  // FLOOR PLANS & PRICING — fixed layout
  // ════════════════════════════════════════════════
  sectionHead('Floor Plans & Pricing');

  const cardW   = (contentW - 5) / 2;
  const cardH   = 32;
  const priceW  = 52; // reserved right column for price

  for (let i = 0; i < floorPlans.length; i++) {
    const plan = floorPlans[i];
    const col  = i % 2;
    if (col === 0) checkPage(cardH + 4);
    const fx = margin + col * (cardW + 5);
    const fy = y;

    // Card background
    fillBg(C.gray50); setDrw(C.gray200);
    doc.roundedRect(fx, fy, cardW, cardH, 2, 2, 'FD');

    // Tag pill
    doc.setFontSize(6.5); doc.setFont('helvetica','bold');
    const tagText = isPlot ? 'Plot' : 'New Launch';
    const tagW    = doc.getTextWidth(tagText) + 6;
    fillBg(C.green); setDrw(C.green);
    doc.roundedRect(fx + 3, fy + 3, tagW, 5.5, 1, 1, 'F');
    setTxt(C.white); doc.text(tagText, fx + 6, fy + 7.2);

    // Title — constrained to left portion
    const titleMaxW = cardW - priceW - 6;
    setTxt(C.gray900); doc.setFontSize(8); doc.setFont('helvetica','bold');
    const titleLines = doc.splitTextToSize(plan.title, titleMaxW);
    doc.text(titleLines, fx + 4, fy + 14);

    // Area
    setTxt(C.gray500); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(`Area: ${plan.area}`, fx + 4, fy + 20);

    // Possession
    if (!isPlot && plan.possession) {
      doc.text(`Possession: ${plan.possession}`, fx + 4, fy + 25.5);
    }

    // Price — right aligned, constrained to right column
    setTxt(C.green); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
    const priceLines = doc.splitTextToSize(plan.price, priceW - 4);
    doc.text(priceLines, fx + cardW - 4, fy + 21, { align: 'right' });

    // Call Now link on each card
    setTxt(C.blue); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.textWithLink('Call Now', fx + 4, fy + cardH - 3, { url: callNum ? `tel:+91${callNum}` : pageUrl });

    if (col === 1 || i === floorPlans.length - 1) y += cardH + 5;
  }
  y += 2;

  // ════════════════════════════════════════════════
  // BOOKING STATUS
  // ════════════════════════════════════════════════
  checkPage(55);
  sectionHead(isPlot ? 'Plot Booking Status' : 'Flat Booking Status');

  // Available badge
  checkPage(10);
  fillBg(C.greenLight); setDrw(C.green);
  doc.roundedRect(margin, y, contentW, 9, 2, 2, 'FD');
  setTxt(C.green); doc.setFontSize(8.5); doc.setFont('helvetica','bold');
  doc.text('Available for Booking', margin + 5, y + 6.2);
  y += 13;

  infoRow(isPlot ? 'Plots Available' : 'Units Available',
    isPlot ? '8 vacant / 20 total' : '12 vacant / 30 total', C.green);
  y += 2;

  // Progress
  checkPage(14);
  setTxt(C.gray700); doc.setFontSize(7.5); doc.setFont('helvetica','normal');
  doc.text('Booking Progress', margin + 3, y);
  setTxt(C.green); doc.setFont('helvetica','bold');
  doc.text('60% Sold', margin + contentW - 3, y, { align: 'right' });
  y += 5;
  progressBar(60, margin, y, contentW);
  y += 9;

  // Note card
  checkPage(12);
  fillBg(C.gray50); setDrw(C.gray200);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'FD');
  setTxt(C.amber); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
  const noteText = isPlot
    ? 'Limited premium plots available. Early booking recommended.'
    : 'Only a few premium flats remain. Price lock available.';
  doc.text(noteText, margin + 5, y + 7);
  y += 15;

  // ════════════════════════════════════════════════
  // AMENITIES
  // ════════════════════════════════════════════════
  if (project.amenities?.length) {
    sectionHead('Amenities & Facilities');
    const amenityNames: string[] = project.amenities.map((a: any) =>
      typeof a === 'string' ? a : (a.name || a.label || ''));

    let ax = margin;
    amenityNames.forEach((name) => {
      checkPage(12);
      doc.setFontSize(7); doc.setFont('helvetica','normal');
      const chipW = Math.min(doc.getTextWidth(`  ${name}  `) + 6, 88);
      if (ax + chipW > pageW - margin) { y += 9; ax = margin; }
      fillBg(C.greenLight); setDrw(C.green);
      doc.roundedRect(ax, y, chipW, 7, 1.5, 1.5, 'FD');
      setTxt(C.green);
      doc.text(name, ax + chipW / 2, y + 4.8, { align: 'center' });
      ax += chipW + 3;
    });
    y += 12;
  }

  // ════════════════════════════════════════════════
  // BUILDER INFO
  // ════════════════════════════════════════════════
  sectionHead('Builder Information');
  infoRow('Builder Name', project.owner?.companyName || project.owner?.name || 'Builder Name');
  infoRow('Address', 'Skyline Developers Pvt. Ltd., 4th Floor, Landmark Business Plaza, Ring Road, Civil Lines, Nagpur - 440001');
  y += 4;

  // Contact cards — side by side
  checkPage(18);
  const colW2 = (contentW - 4) / 2;

  fillBg(C.gray50); setDrw(C.gray200);
  doc.roundedRect(margin, y, colW2, 15, 2, 2, 'FD');
  setTxt(C.gray500); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
  doc.text('Legal Contact', margin + 4, y + 5.5);
  setTxt(C.blue); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.textWithLink('+91 98765 43210', margin + 4, y + 11, { url: 'tel:+919876543210' });

  fillBg(C.gray50); setDrw(C.gray200);
  doc.roundedRect(margin + colW2 + 4, y, colW2, 15, 2, 2, 'FD');
  setTxt(C.gray500); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
  doc.text('Bank Finance Desk', margin + colW2 + 8, y + 5.5);
  setTxt(C.blue); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.textWithLink('+91 91234 56789', margin + colW2 + 8, y + 11, { url: 'tel:+919123456789' });
  y += 20;

  // ── Page link card ──
  checkPage(12);
  fillBg(C.green); setDrw(C.green);
  doc.roundedRect(margin, y, contentW, 10, 2, 2, 'F');
  setTxt(C.white); doc.setFontSize(7.5); doc.setFont('helvetica','bold');
  doc.text('View full project online:', margin + 5, y + 4.5);
  setTxt('#c8dfa8'); doc.setFontSize(7); doc.setFont('helvetica','normal');
  doc.textWithLink(pageUrl, margin + 5, y + 8.5, { url: pageUrl });
  y += 14;

  // ════════════════════════════════════════════════
  // FOOTER — every page
  // ════════════════════════════════════════════════
  const totalPages: number = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    fillBg(C.green);
    doc.rect(0, pageH - 11, pageW, 11, 'F');
    setTxt(C.white); doc.setFontSize(6.5); doc.setFont('helvetica','normal');
    doc.textWithLink(pageUrl, margin, pageH - 4, { url: pageUrl });
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-IN')}  |  Page ${p} of ${totalPages}`,
      pageW - margin, pageH - 4, { align: 'right' }
    );
  }

  // ════════════════════════════════════════════════
  // SHARE
  // ════════════════════════════════════════════════
  const pdfBlob = doc.output('blob');
  const safeName = project.name.replace(/\s+/g,'_');
  const pdfFile  = new File([pdfBlob], `${safeName}_Details.pdf`, { type: 'application/pdf' });

  const shareText = [
    project.name,
    `${project.location}, ${project.city}`,
    project.bhkOptions?.length ? project.bhkOptions.join(', ') : '',
    'Starting Rs. 65L onwards',
    project.projectStatus ? formatStatus(project.projectStatus) : '',
    'RERA Approved',
    pageUrl,
  ].filter(Boolean).join('\n');

  const canShareFiles = navigator.canShare?.({ files: [pdfFile] });
  if (navigator.share && canShareFiles) {
    try { await navigator.share({ title: project.name, text: shareText, files: [pdfFile] }); return; }
    catch (e: any) { if (e?.name === 'AbortError') return; }
  }
  if (navigator.share) {
    try { await navigator.share({ title: project.name, text: shareText, url: pageUrl }); return; }
    catch (e: any) { if (e?.name === 'AbortError') return; }
  }
  doc.save(`${safeName}_Details.pdf`);
  try { await navigator.clipboard.writeText(shareText); alert('PDF downloaded & link copied!'); }
  catch { alert('PDF downloaded. Share the link manually.'); }
}}
  className="absolute right-10 top-2 p-1.5 rounded-full hover:bg-gray-100 transition"
  title="Share project"
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-4 h-4 text-gray-700"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
</button>
              {/* CLOSE BUTTON */}
              <button
                onClick={closeProjectDetails}
                className="absolute right-2 top-2 p-1.5 rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-4 h-4 text-gray-700" />
              </button>

              <div className="w-full max-w-md mr-3 text-left">
              <p className="mt-1 text-[11px] sm:text-[12px] font-medium text-gray-700">
                  {formatStatus(project.projectStatus)}
                </p> 
              <h1 className="text-[20px]  font-bold leading-tight">
                {project.name}
              </h1>

             <p className="mt-0.5 text-[11px] sm:text-[12px] ">
              <MapPin className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-gray-600" />
              {project.location}, {project.city}
            </p>


              {/* BHK + AREA */}
              <div className="">
                {(project.bhkOptions ?? ['1 BHK', '2 BHK', '3 BHK']).map(
                  (bhk, index, arr) => (
                    <span
                      key={bhk}
                      className="text-[11px] sm:text-[12px]  font-medium text-gray-700"
                    >
                      {bhk}
                      {index < arr.length - 1 && ','}
                    </span>
                  )
                )}

               
              </div>
                
            </div>              
            
          </div>
          </div>
         
          <div className="px-4">
          {/* PRICE CARD */}
          <div ref={priceRef} className="mt-0.5 relative">

            {/* SOFT DIVIDER */}
            <div className="h-px bg-gray-100 mx-1 lg:mx-2" />

            {/* PRICE CONTENT */}
            <div className="p-2.5 flex items-start  gap-20">

              {/* LEFT — PRICE */}
              <div className="text-left pl-2">
                <p className="text-[11px] text-gray-500">
                  Price starting from
                </p>

                <p className="text-[15px] font-semibold text-gray-900">
                  ₹ 65 L onwards
                </p>

                <button
                  type="button"
                  onClick={() => setShowPriceBreakdown(prev => !prev)}
                  className="mt-1 inline-flex items-center gap-1
                            text-[10px] font-medium
                            text-blue-600 hover:underline"
                >
                  See price details
                  <span
                    className={`inline-block transition-transform duration-200 ${
                      showPriceBreakdown ? "rotate-90" : ""
                    }`}
                  >
                    &gt;
                  </span>
                </button>
              </div>

              {/* RIGHT — AREA */}
              <div className="text-left pl-3 pt-3 shrink-0">
                <p className="text-[11px] text-gray-500">
                  Saleable area
                </p>

                <p className="text-[12px] font-semibold text-gray-900">
                  850 – 1200 sq.ft
                </p>
              </div>

            </div>

            {/* DROPDOWN */}
            {showPriceBreakdown && (
              <div
                className="  absolute left-0 right-0 top-full z-50
                mx-02 mr-33 lg:mx-3 mt-2
                rounded-lg bg-gray-50
                p-2 lg:p-4
                text-[11px]
                text-gray-700
                space-y-1.5 lg:space-y-2
                shadow-xl border border-gray-200"
              >
                
                {/* CLOSE BUTTON */}
                <button
                  onClick={() => setShowPriceBreakdown(false)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>

                <div className="pt-4 space-y-1.5 lg:space-y-2">
                  {[
                    ['MRP (₹ / sq.ft)', '₹ 5,200'],
                    ['GST', '₹ 3,25,000'],
                    ['Registration', '₹ 1,10,000'],
                    ['Other Charges', '₹ 85,000'],
                    ['Government Charges', '₹ 75,000'],
                    ['Legal Charges', '₹ 50,000'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between">
                      <span>{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}

                  <div className="h-px bg-gray-200 my-2" />

                  <div className="flex justify-between font-semibold text-gray-900 ">
                    <span>Total</span>
                    <span>₹ 72,45,000</span>
                  </div>

                  {/* BANK LOAN */}
                  <p
                    className={`pt-1 text-[10px]  ${
                      project.bankLoanAvailable
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    Bank loan{" "}
                    {project.bankLoanAvailable ? "available" : "not available"}
                  </p>

                  {/* EMI CALCULATOR CTA */}
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1.5
                              text-[10px] font-medium
                              text-blue-600 hover:underline"
                  >
                    {/* ICON */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-3.5 h-3.5 "
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <rect x="4" y="2" width="16" height="20" rx="2" />
                      <line x1="8" y1="6" x2="16" y2="6" />
                      <line x1="8" y1="10" x2="8" y2="10" />
                      <line x1="12" y1="10" x2="12" y2="10" />
                      <line x1="16" y1="10" x2="16" y2="10" />
                      <line x1="8" y1="14" x2="8" y2="14" />
                      <line x1="12" y1="14" x2="12" y2="14" />
                      <line x1="16" y1="14" x2="16" y2="14" />
                    </svg>

                    Calculate EMI
                  </button>
                  {/* LEGAL & FINANCE INFO */}
                  <div className="pt-2 border-t border-gray-200 space-y-1 text-[10px]">

                    {/* LEGAL CONTACT */}
                    <a
                      href="tel:+919876543210"
                      className="flex justify-between items-center
                                text-gray-600 hover:text-[#3E5F16]
                                transition"
                    >
                      <span>Legal Contact</span>

                      <span className="font-medium text-blue-600">
                        +91 98765 43210
                      </span>
                    </a>

                    {/* BANK FINANCE */}
                    <a
                      href="tel:+919123456789"
                      className="flex justify-between items-center
                                text-gray-600 hover:text-[#3E5F16]
                                transition"
                    >
                      <span>Bank Finance Desk</span>

                      <span className="font-medium text-blue-600">
                        +91 91234 56789
                      </span>
                    </a>

                  </div>


                </div>
              </div>
            )}
          </div>
        

            {/* MAP ACTION BUTTONS */}
            <div className="relative mt-4 mb-4">
             <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {/* DIRECTIONS */}
              <button
                onClick={() =>  {
                closeProjectDetails();
                mapRef.current?.getDirections();}}
                className="flex shrink-0 items-center gap-1
                rounded-full bg-[#3E5F16]
                px-2.5 h-5
                text-[10px] font-medium
                text-white
                hover:bg-[#2f4711]
                transition"
              >
                {/* <MapPinIcon className="h-3 w-3" /> */}
                Directions
              </button>

              {/* MAP VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails();
                  mapRef.current?.setMapView();
                }}
                className="flex shrink-0 items-center gap-1
                rounded-full bg-[#3E5F16]
                px-2.5 h-5
                text-[10px] font-medium
                text-white
                hover:bg-[#2f4711]
                transition"
              >
                {/* <Map className="h-3 w-3" /> */}
                Geographic
              </button>

              {/* SATELLITE VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails();
                  mapRef.current?.setSatelliteView();
                }}
                className="flex shrink-0 items-center gap-1
                rounded-full bg-[#3E5F16]
                px-2.5 h-5
                text-[10px] font-medium
                text-white
                hover:bg-[#2f4711]
                transition"
              >
                {/* <Map className="h-3 w-3" /> */}
                Satellite
              </button>


              {/* 3D VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails()
                  mapRef.current?.set3DView()}}
                className="flex shrink-0 items-center gap-1
                rounded-full bg-[#3E5F16]
                px-2.5 h-5
                text-[10px] font-medium
                text-white
                hover:bg-[#2f4711]
                transition"
              >
                {/* <Map className="h-3 w-3" /> */}
                3D View
              </button>

              {/* VIRTUAL / STREET VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails()
                  mapRef.current?.toggleStreetView()}}
                className="flex shrink-0 items-center gap-1
                rounded-full bg-[#3E5F16]
                px-2.5 h-5
                text-[10px] font-medium
                text-white
                hover:bg-[#2f4711]
                transition"
              >
                {/* <Eye className="h-3 w-3 " /> */}
                Virtual View
              </button>
              
                {/* SUB NAVBAR BUTTONS */}
                <SubNavbar
                  scrollContainerRef={scrollRef}
                  sectionRefs={sectionRefs}
                />

            </div>

            


        </div>
        <div id="gallery">
          <MediaGallery items={mediaItems} project={project} variant="mobile" />
        </div>
    
       {/* ✅ CTA ALWAYS visible */}
          {CTAButtons}  

  
            <div ref={sectionRefs.facilities} id="amenities">
          <AmenitiesSection          
            amenities={project.amenities}
            variant="mobile"
          />
            </div>

            {/* OTHER DETAILS —   CARPET + FLOORS */}
                  {(project.carpetAreaRange || project.floorRange) && (
                    <div ref={sectionRefs.details} className="mt-4 rounded-xl p-4"
                     id="details">

                      {/* Heading */}
                      <p className="mb-2 text-sm font-semibold text-gray-900">
                        Other Details
                      </p>

                      {/* CARPET + FLOORS */}
                      <div className="flex items-stretch gap-3">

                        {project.carpetAreaRange && (
                          <div className="flex-1 rounded-lg bg-white px-3 py-2">
                            <p className="text-[11px] text-gray-500">
                              Carpet Area
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {project.carpetAreaRange}
                            </p>
                          </div>
                        )}

                        {/* divider */}
                        {project.carpetAreaRange && project.floorRange && (
                          <div className="w-px bg-gray-200 rounded-full" />
                        )}

                        {project.floorRange && (
                          <div className="flex-1 rounded-lg bg-white px-3 py-2">
                            <p className="text-[11px] text-gray-500">
                              Floors
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {project.floorRange}
                            </p>
                          </div>
                        )}

                      </div>
                    </div>
                  )}
                  {/* FLOOR PLANS & PRICING */}
                  <div ref={sectionRefs.floor} className="mt-5" id="floor-plans">
                    <p className="mb-3 text-sm font-semibold text-gray-900">
                      Floor Plans & Pricing
                    </p>

                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">

                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {floorPlans.map((plan, i) => (
                        <div
                          key={i}
                          className="min-w-[210px] rounded-xl bg-white shadow-sm overflow-hidden flex flex-col"
                        >
                          {/* IMAGE */}
                          <div className="relative h-32 w-full">
                            <Image
                              src={plan.image || "/placeholder.jpg"}
                              alt="plan"
                              fill
                              className="object-cover"
                            />

                            <span className="absolute top-2 left-2 bg-[#3E5F16] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                              {isPlot ? "Plot" : "New Launch"}
                            </span>
                          </div>

                          {/* CONTENT */}
                          <div className="p-3 flex flex-col gap-1">
                            <p className="text-xs font-semibold text-gray-900">
                              {plan.title} • {plan.area}
                            </p>

                            {!isPlot && plan.possession && (
                              <p className="text-[11px] text-gray-500">
                                Possession: {plan.possession}
                              </p>
                            )}

                            <p className="text-sm font-bold text-[#3E5F16]">
                              {plan.price}
                            </p>

                            <button
                              onClick={handleCall}
                              className="mt-2 rounded-md border border-[#3E5F16] py-1.5 text-[11px] font-semibold text-[#3E5F16] hover:bg-[#3E5F16]/10 transition"
                            >
                              Call Now
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    </div>
                  </div>
                  {/* BOOKING STATUS */}
                  <div
                    ref={sectionRefs.booking}
                    className="mt-5 rounded-xl bg-white p-4 shadow-sm"
                    id="booking-status"
                  >
                    <p className="mb-3 text-sm font-semibold text-gray-900">
                      {isPlot ? "Plot Booking Status" : "Flat Booking Status"}
                    </p>

                    <div className="space-y-3 text-xs">

                      {/* Availability */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Availability</span>

                        <span className="flex items-center gap-2 font-medium text-green-600">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          Available
                        </span>
                      </div>

                      {/* Units */}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          {isPlot ? "Plots" : "Units"}
                        </span>

                        <span className="font-medium text-gray-800">
                          {isPlot
                            ? "8 vacant / 20 total"
                            : "12 vacant / 30 total"}
                        </span>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex justify-between mb-1 text-gray-600">
                          <span>Booking Progress</span>
                          <span>
                            {isPlot ? "60% Sold" : "60% Sold"}
                          </span>
                        </div>

                        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-[#3E5F16]"
                            style={{ width: "60%" }}
                          />
                        </div>
                      </div>

                      {/* Note */}
                      <div className="rounded-md bg-gray-50 p-2 text-gray-600">
                        {isPlot
                          ? "Limited premium plots available. Early booking recommended."
                          : "Only a few premium flats remain. Price lock available."}
                      </div>

                      {/* CTA */}
                      <p className="text-gray-500">
                        Contact sales team to reserve this {isPlot ? "plot" : "flat"}.
                      </p>

                    </div>
                  </div>
           
                  {/* PLOT DETAILS */}
                  <div ref={sectionRefs.details} id="details">
                  {project.type === 'plot' && (
                    <div className="mt-4  p-4">
                        <p className="mb-2 text-sm font-semibold">Plot Details</p>
                        <div className="text-sm space-y-1 text-gray-700">
                          {project.plotSizeRange && (
                            <p><strong>Plot Size:</strong> {project.plotSizeRange}</p>
                          )}
                          {project.facingOptions && (
                            <p><strong>Facing:</strong> {project.facingOptions.join(', ')}</p>
                          )}
                          {typeof project.gatedCommunity === 'boolean' && (
                            <p>
                              <strong>Gated Community:</strong>{' '}
                              {project.gatedCommunity ? 'Yes' : 'No'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    {/* BUILDER ADDRESS */}
                  <div
                    ref={sectionRefs.sellers}
                    id="builder-info"
                    className="mt-5 mb-10 rounded-xl p-4"
                    >
                    <p className="mb-2 text-sm font-semibold text-gray-900">
                      Builder Address
                    </p>

                    <div className="text-xs text-gray-700 space-y-1">

                      {/* Builder name (dynamic) */}
                      <p className="font-medium text-gray-800">
                        {project.owner?.name || "Builder Name"}
                      </p>

                      {/* Static address placeholder */}
                      <p>
                        Skyline Developers Pvt. Ltd.
                        4th Floor, Landmark Business Plaza
                        Ring Road, Civil Lines
                        Nagpur, Maharashtra – 440001
                      </p>

                    </div>
                  </div>

                    {/* ✅ BROCHURE SECTION */}
                    {project.brochureUrl && (
                      <div ref={sectionRefs.brochure} className="mt-4" id="brochure">
                        <BrochureSection 
                         pdfUrl={
                            project.brochureUrl
                              ? `${process.env.NEXT_PUBLIC_API_URL}${project.brochureUrl}`
                              : ""
                          } />
                      </div>
                    )}

                    </div>
                   
              </div>
              </div>
            )}
        </div>
                   
          


       <EnquiryModal
          open={showFormModal}
          onClose={handleFormClose}
          onSubmitTracking={handleFormSubmit}
          project={{
            id: project.id,
            name: project.name,
          }}
        />

        
  
  </div>
);
}
