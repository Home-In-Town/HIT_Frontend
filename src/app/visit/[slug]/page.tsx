

//sales-website-private-dev\frontend\src\app\visit\[slug]\page.tsx
'use client';
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import DesktopVisit from './DesktopVisit';
import { useParams, notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

  const hash = window.location.hash.replace("#", "");

  const isMapAction = mapHashes.includes(hash);

  if (!isMapAction) {
    setOpen(true); // normal behaviour
  } else {
    setOpen(false); // map link → keep closed
  }
}, [project]);
useEffect(() => {
  const scrollToHash = () => {
    const hash = window.location.hash.replace("#", "");
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

  const hash = window.location.hash.replace("#", "");

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

  const res = await fetch(project.brochureUrl);
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
    <div className="grid gap-1.5">

      {/* ROW 1 — CALL + WHATSAPP */}
      <div className={`grid gap-1.5 ${
        project.brochureUrl ? "grid-cols-3" : "grid-cols-2"
      }`}>

        {/* CALL */}
        <button
          onClick={handleCall}
          disabled={isCalling}
          className="rounded-md border border-[#3E5F16] py-1.5
                    text-[10px] font-semibold text-[#3E5F16]
                    transition disabled:opacity-60"
        >
          {isCalling ? 'Calling…' : 'Call'}
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

        {/* BROCHURE */}
        {project.brochureUrl && (
          <button
            onClick={downloadBrochure}
            className="
              rounded-md border border-[#3E5F16]
              py-1.5 text-[10px] font-semibold
              text-[#3E5F16]
              hover:bg-[#3E5F16]/10
              transition
            "
          >
            Brochure
          </button>
        )}

      </div>
     

      {/* ROW 2 — BOOK SITE VISIT */}
      <button
        onClick={handleFormOpen}
        className="w-full rounded-md bg-[#3E5F16] py-1.5
                   text-[10px] font-semibold text-white
                   transition"
      >
        {project.ctaButtonText || 'Book Site Visit'}
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


const floorPlans: FloorPlan[] = isPlot
  ? [
      {
        title: "Residential Plot",
        area: project.plotSizeRange || "1200 – 2400 sq.ft",
        price: "₹ 25 L onwards",
        image: project.coverImage,
      },
      {
        title: "Corner Plot",
        area: "1800 sq.ft",
        price: "₹ 32 L onwards",
        image: project.coverImage,
      },
    ]
  : [
      {
        title: "2 BHK",
        area: "1050 sq.ft",
        possession: "Dec 2027",
        price: "₹ 78 L onwards",
        image: project.coverImage,
      },
      {
        title: "3 BHK",
        area: "1350 sq.ft",
        possession: "Dec 2027",
        price: "₹ 98 L onwards",
        image: project.coverImage,
      },
    ];


 if (isDesktop) {
  // ===== MAP ACTIONS =====
const handleDirections = () => {
  mapRef.current?.getDirections();
};

const handleMapView = () => {
  mapRef.current?.setMapView();
};

const handleSatelliteView = () => {
  mapRef.current?.setSatelliteView();
};

const handle3DView = () => {
  mapRef.current?.set3DView();
};

const handleStreetView = () => {
  mapRef.current?.toggleStreetView();
};


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
      onDrawerData={({ projects, selectedId, open }) => {
        setDrawerProjects(projects);
        setDrawerSelected(selectedId);
        setDrawerOpen(open);
      }}

      
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
const onDragStart = (e: React.TouchEvent | React.MouseEvent) => {
  isDragging.current = true;

  startY.current =
    "touches" in e
      ? e.touches[0].clientY
      : e.clientY;
};

const onDragMove = (e: React.TouchEvent | React.MouseEvent) => {
  if (!isDragging.current || !sheetRef.current) return;

  currentY.current =
    "touches" in e
      ? e.touches[0].clientY
      : e.clientY;

  const delta = currentY.current - startY.current;

  if (delta > 0) {
    sheetRef.current.style.transform = `translateY(${delta}px)`;
  }
};


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
      logo={project.coverImage}
      focusOnly
      onMarkerClick={openProjectDetails}
      onDrawerData={({ projects, selectedId, open }) => {
        setDrawerProjects(projects);
        setDrawerSelected(selectedId);
        setDrawerOpen(open);
      }}
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
        <div className="flex items-center justify-between px-4 pt-3 pb-1 ">
 
          <button
            onClick={closeProjectDetails}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <ChevronDown className="w-5 h-5 text-gray-700" />
          </button>
        </div>
         <div
            ref={scrollRef}
            id="project-details-scroll"
            className="overflow-y-auto overflow-x-visible  max-h-[80vh] "

          >
            <div className="px-4">
          {/* TOP SECTION: DETAILS */}
          <div className="flex justify-center">
            
            <div className="w-full max-w-md mr-3 text-center">
              <p className="mt-1 text-[11px] sm:text-[12px] font-medium text-gray-700">
                  {formatStatus(project.projectStatus)}
                </p> 
              <h1 className="text-[20px]  font-bold leading-tight">
                {project.name}
              </h1>

             <p className="mt-0.5 text-[11px] sm:text-[12px] text-center">
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
          <div className="px-4 mt-3">
          <SubNavbar
            scrollContainerRef={scrollRef}
            sectionRefs={sectionRefs}
          />
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
             <div className="flex gap-2 overflow-x-auto overflow-y-visible pb-1 scrollbar-hide relative">


              {/* DIRECTIONS */}
              <button
                onClick={() =>  {
                closeProjectDetails();
                mapRef.current?.getDirections();}}
                className="flex shrink-0 items-center justify-center gap-1
                          rounded-full bg-[#3E5F16] px-3 py-1.5
                          text-[10px] sm:text-[11px]
                          font-medium text-white
                          hover:bg-[#3E5F16] transition shadow-sm"
              >
                <MapPinIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Directions
              </button>

              {/* MAP VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails();
                  mapRef.current?.setMapView();
                }}
                className="flex shrink-0 items-center justify-center gap-1
                          rounded-full bg-[#3E5F16] px-3 py-1.5
                          text-[10px] sm:text-[11px]
                          font-medium text-white
                          hover:bg-[#3E5F16] transition shadow-sm"
              >
                <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Geographic
              </button>

              {/* SATELLITE VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails();
                  mapRef.current?.setSatelliteView();
                }}
                className="flex shrink-0 items-center justify-center gap-1
                          rounded-full bg-[#3E5F16] px-3 py-1.5
                          text-[10px] sm:text-[11px]
                          font-medium text-white
                          hover:bg-[#3E5F16] transition shadow-sm"
              >
                <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Satellite
              </button>


              {/* 3D VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails()
                  mapRef.current?.set3DView()}}
                className="flex shrink-0 items-center justify-center gap-1
                          rounded-full bg-[#3E5F16] px-3 py-1.5
                          text-[10px] sm:text-[11px]
                          font-medium text-white
                          hover:bg-[#3E5F16] transition shadow-sm"
              >
                <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                3D View
              </button>

              {/* VIRTUAL / STREET VIEW */}
              <button
                onClick={() => {
                  closeProjectDetails()
                  mapRef.current?.toggleStreetView()}}
                className="flex shrink-0 items-center justify-center gap-1
                          rounded-full bg-[#3E5F16] px-3 py-1.5
                          text-[10px] sm:text-[11px]
                          font-medium text-white
                          hover:bg-[#3E5F16] transition shadow-sm"
              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Virtual View
              </button>
              

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
                        {project.builderName || "Builder Name"}
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
