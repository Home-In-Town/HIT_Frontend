//app\visit\[slug]\DesktopVisit.tsx
"use client";
import { DrawerContent } from "@/components/public/ProjectBottomDrawer";
import Image from "next/image";
import { Phone, MessageCircle, Send, FileText, MapPin, Home, Banknote, Building2, Eye, Map, MapPinMinus, X, Ruler, CompassIcon, ShieldCheckIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Project } from "@/types/project";
import React, { useEffect, useRef } from "react";
import ProjectMap from "@/components/public/ProjectMap";
import {  MapPinAreaIcon } from "@phosphor-icons/react/dist/ssr";
import AmenitiesSection from "@/components/public/AmenitiesSection";
import { buildMediaItems } from "@/utils/buildMediaItems";
import MediaGallery from "@/components/public/MediaGallery";
import dynamic from "next/dynamic";
type FloorPlan = {
  title: string;
  area: string;
  price: string;
  possession?: string;
  image?: string;
};
type DesktopVisitProps = {
  project: Project & {
    images?: string[];
    status?: string;
    projectArea?: string;
    totalUnits?: string;
    possessionDate?: string;
    towers?: string;
  };
  floorPlans: FloorPlan[]
  onCallClick?: () => void;
  onWhatsAppClick?: () => void;
  onEnquireClick?: () => void;
   // map actions
  onDirections: () => void;
  onMapView: () => void;
  onSatelliteView: () => void;
  on3DView: () => void;
  onStreetView: () => void;

  //  map props
  mapRef: React.RefObject<any>;
  hasCoordinates: boolean;
  onMarkerClick: () => void;

  drawerProjects: Project[];
  drawerSelected: string | null;
  drawerOpen: boolean;
  onDrawerData: (data: {
    projects: Project[];
    selectedId: string | null;
    open: boolean;
  }) => void;
};

const formatIndianPrice = (price: number | string) => {
  const value = Number(price);
  if (!value) return "";

  const CRORE = 10000000;
  const LAKH = 100000;

  // ≥ 1 Crore → show decimal crore
  if (value >= CRORE) {
    const crore = value / CRORE;
    return `${crore.toFixed(1).replace(/\.0$/, "")} Cr`;
  }

  // ≥ 1 Lakh → show lakh
  if (value >= LAKH) {
    const lakh = value / LAKH;
    return `${lakh.toFixed(0)} Lac`;
  }

  // fallback
  return value.toLocaleString("en-IN");
};


export default function DesktopVisit({
  project,
  floorPlans,
  onCallClick,
  onWhatsAppClick,
  onEnquireClick,
  
  onDirections,
  on3DView,
  onStreetView,
  onMapView,
  onSatelliteView,

  mapRef,
  hasCoordinates,
  onMarkerClick,
  onDrawerData,

  drawerProjects,
  drawerSelected,
  drawerOpen,
}: DesktopVisitProps) {
  useEffect(() => {
  const scrollToSection = () => {
    const hash = window.location.hash;
    if (!hash || !scrollContainerRef.current) return;

    const el = document.querySelector(hash);
    if (el) {
      const container = scrollContainerRef.current;

      const top =
        (el as HTMLElement).offsetTop - 20; // adjust padding

      container.scrollTo({
        top,
        behavior: "smooth",
      });
    }
  };

  setTimeout(scrollToSection, 400);

  window.addEventListener("hashchange", scrollToSection);

  return () => {
    window.removeEventListener("hashchange", scrollToSection);
  };
}, []);
  // Support both API field names
 const mediaItems = buildMediaItems(project);
  const formatValue = (value: any) => {
    if (!value) return "—";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  };

  const isPlot = project.type === "plot";

const flatDetails = [
    { label: "Carpet Area", value: project.carpetAreaRange, icon: Home },   
    { label: "BHK Options", value: project.bhkOptions, icon: Building2 },
     { label: "Floors", value: project.floorRange, icon: Building2 },
];

const plotDetails = [
  { label: "Plot Size", value: project.plotSizeRange, icon: Ruler },
  { label: "Facing", value: project.facingOptions?.join(", "), icon: CompassIcon },
  { label: "Gated", value: project.gatedCommunity ? "Yes" : "No", icon: ShieldCheckIcon },
];
 
  const [showPriceBreakdown, setShowPriceBreakdown] = React.useState(false);
   const drawerCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
   const scrollContainerRef = useRef<HTMLDivElement>(null);
const priceBreakdown =   [
  { label: "MRP (₹ / sq.ft)", value: "₹ 5,200" },
  { label: "GST", value: "₹ 3,25,000" },
  { label: "Registration", value: "₹ 1,10,000" },
  { label: "Other Charges", value: "₹ 85,000" },
  { label: "Government Charges", value: "₹ 75,000" },
  { label: "Legal Charges", value: "₹ 50,000" },
];
const memoizedMap = React.useMemo(() => {
  if (!hasCoordinates) return null;

  return (
    <ProjectMap
      projectId={project.id}
      ref={mapRef}
      lat={project.latitude!}
      lng={project.longitude!}
      logo={typeof project.coverImage === 'object' && project.coverImage ? (project.coverImage as any).url : project.coverImage}
      focusOnly
      onMarkerClick={onMarkerClick}
      onDrawerData={onDrawerData}
    />
  );
}, [
  hasCoordinates,
  project.id,
  project.latitude,
  project.longitude,
  project.coverImage,
  onMarkerClick,
  onDrawerData,
]);

const BrochureSection = dynamic(
  () => import("@/components/public/BrochureSection"),
  { ssr: false }
);
const formatStatus = (status: string) =>
  status
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const getImageUrl = (val: any) => typeof val === 'object' && val !== null ? val.url : val;

  return (
    <div className="min-h-screen">
      <div className="mx-auto bg-white  p-5 pl-10 ">        
        {/* Layout */}
        <div className="mt-2 grid grid-cols-2 gap-8 h-[calc(100vh-120px)]">
          {/* LEFT PANEL */}
          <div 
          ref={scrollContainerRef}
          className="mt-2 overflow-y-auto pr-4 scrollbar-hide">
            {drawerOpen && drawerProjects.length > 0 ? (
              // SHOW DRAWER LIST
              <DrawerContent
                projects={drawerProjects}
                selectedProjectId={drawerSelected}
                cardRefs={drawerCardRefs} // can create a ref here
              />
            ) : (
              // SHOW CURRENT PROJECT DETAILS
              <>
                {/* Title + Status + Price */}
                
                {/* LEFT */}
          <div className="overflow-y-auto pr-4 scrollbar-hide">
           

            {/* Title */}
            {/* Status */}
            <div className="flex flex-wrap items-center gap-2 mb-3">

              {/* Status */}
              {project.projectStatus && (
                <span className="px-3 py-1 text-xs bg-[#5F7F33] rounded-full  text-white">
                  {project.projectStatus}
                </span>
              )}            

            </div>

                {/* Title + Price Row */}
            <div className="flex items-start justify-between pr-3 gap-6 mb-10">

              {/* LEFT — Title + Location (stacked) */}
              <div className="flex flex-col">
                <h1 className="text-3xl text-gray-800 font-semibold leading-tight">
                  {project.name}
                </h1>
                {project.builderName && (
                  <p className="text-sm font-medium text-gray-600 mt-1">
                    By <span className="font-medium">{project.builderName}</span>
                  </p>
                )}
                 {/* Location with Map Pin, Location + City */}
                  <p className="flex items-center gap-1 text-gray-500 text-sm mt-3">
                    <MapPin size={20} className="text-gray-400" />
                    <span>
                      {project.location || ""}
                      {project.city ? `, ${project.city}` : ""}
                    </span>
                  </p>
              </div>

              {/* RIGHT — Price + Breakdown */}
            {(project.startingPrice || project.pricePerSqFt) && (
              <div className="text-left shrink-0 relative">

                {/* Price */}
                <p className="text-xs text-[#3E5F16]">Starting at</p>

                <p className="font-semibold text-[30px] text-gray-900 leading-tight">
                  {project.startingPrice &&
                    `₹${formatIndianPrice(project.startingPrice)}`}

                  {project.pricePerSqFt && (
                    <span className="ml-1 text-[17px] font-normal text-gray-600 align-sub">
                      @ ₹{project.pricePerSqFt} / sq.ft.
                    </span>
                  )}
                </p>

                  {/* toggle button */}
                  <button
                    onClick={() => setShowPriceBreakdown(v => !v)}
                    className="mt-1 text-xs font-medium text-[#3E5F16] "
                  >
                    {showPriceBreakdown ? "Hide price details" : "See price details"}
                  </button>

                {/* FLOATING DROPDOWN */}
                {showPriceBreakdown && (
              <div
                className="
                  absolute top-full left-0 mt-2
                  w-[240px]
                  rounded-lg bg-white border border-gray-200
                  p-4 text-sm text-gray-700
                  shadow-xl z-50
                  space-y-2
                "
              >
                <button
                  onClick={() => setShowPriceBreakdown(false)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>

                <div className="pt-2 space-y-2">
                  {priceBreakdown.map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span>{item.label}</span>
                      <span>{item.value}</span>
                    </div>
                  ))}

                  <div className="h-px bg-gray-200 my-2" />

                  <div className="flex justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{project.startingPrice || "₹ —"}</span>
                  </div>

                  <p
                    className={`text-xs ${
                      project.bankLoanAvailable
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    Bank loan{" "}
                    {project.bankLoanAvailable ? "available" : "not available"}
                  </p>

                  <button className="text-xs font-medium text-blue-600 hover:underline">
                    Calculate EMI
                  </button>
                </div>
              </div>
            )}

              </div>
            )}


            </div>
                        <div id="gallery">
                        <MediaGallery
                          items={mediaItems}
                          variant="desktop"
                          project={project}
                        />   
                        </div>         
                        {/* Project Details */}
                        <div id="details" className="mt-10">
                          {/* Section Header */}
                          <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {isPlot ? "Plot Details" : "Flat Details"}
                            </h3>
                          </div>

                          {/* Cards Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {(isPlot ? plotDetails : flatDetails).map(
                              ({ label, value, icon: Icon }) => (
                                <div
                                  key={label}
                                  className="
                                    flex items-start gap-3
                                    bg-white
                                    border border-gray-200
                                    rounded-2xl
                                    p-4
                                    hover:shadow-md
                                    hover:border-[#3E5F16]/30
                                    transition-all
                                  "
                                >
                                  {/* Icon */}
                                  <div className="w-10 h-10 rounded-xl bg-[#3E5F16]/10 flex items-center justify-center">
                                    <Icon size={18} className="text-[#3E5F16]" />
                                  </div>

                                  {/* Text */}
                                  <div className="flex flex-col">
                                    <p className="text-xs text-gray-500">{label}</p>
                                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                                      {formatValue(value)}
                                    </p>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                        
                        <div id="amenities">
                       <AmenitiesSection amenities={project.amenities} />
                        </div>
                          <div id="floor-plans" className="mt-6 md:mt-8">
              <p className="mb-3 md:mb-5 text-sm md:text-lg font-semibold text-gray-900">
                Floor Plans & Pricing
              </p>

              <div className="flex gap-3 md:gap-5 overflow-x-auto pb-2 scrollbar-hide">
                {floorPlans.map((plan, i) => (
                  <div
                    key={i}
                    className="
                      min-w-[210px] md:min-w-[280px] lg:min-w-[320px]
                      rounded-xl md:rounded-2xl
                      bg-white shadow-sm hover:shadow-md
                      overflow-hidden flex flex-col transition
                    "
                  >
                    {/* Image */}
                    <div className="relative h-32 md:h-40 lg:h-48 w-full">
                      <Image
                        src={plan.image || "/placeholder.jpg"}
                        alt="plan"
                        fill
                        className="object-cover"
                      />

                      <span className="absolute top-2 left-2 bg-[#3E5F16] text-white text-[9px] md:text-xs font-semibold px-2 py-0.5 md:px-3 md:py-1 rounded-full">
                        {project.type === "plot" ? "Plot" : "New Launch"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-3 md:p-4 flex flex-col gap-1 md:gap-2">
                      <p className="text-xs md:text-sm font-semibold text-gray-900">
                        {plan.title} • {plan.area}
                      </p>

                      {plan.possession && (
                        <p className="text-[11px] md:text-xs text-gray-500">
                          Possession: {plan.possession}
                        </p>
                      )}

                      <p className="text-sm md:text-lg font-bold text-[#3E5F16]">
                        {plan.price}
                      </p>

                      <button
                        onClick={onCallClick}
                        className="
                          mt-2
                          rounded-md md:rounded-lg
                          border border-[#3E5F16]
                          py-1.5 md:py-2
                          text-[11px] md:text-sm
                          font-semibold text-[#3E5F16]
                          hover:bg-[#3E5F16]/10 transition
                        "
                      >
                        Call Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
                                      {/* ----------------------------- */}
            {/* BOOKING STATUS */}
            {/* ----------------------------- */}
            <div
            id="booking-status"
              className="mt-5 rounded-xl bg-white p-4 shadow-sm"
            >
              <p className="mb-3 text-sm font-semibold text-gray-900">
                {project.type === "plot" ? "Plot Booking Status" : "Flat Booking Status"}
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
                    {project.type === "plot" ? "Plots" : "Units"}
                  </span>
                  <span className="font-medium text-gray-800">
                    {project.type === "plot" ? "8 vacant / 20 total" : "12 vacant / 30 total"}
                  </span>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between mb-1 text-gray-600">
                    <span>Booking Progress</span>
                    <span>{project.type === "plot" ? "60% Sold" : "60% Sold"}</span>
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
                  {project.type === "plot"
                    ? "Limited premium plots available. Early booking recommended."
                    : "Only a few premium flats remain. Price lock available."}
                </div>

                {/* CTA */}
                <p className="text-gray-500">
                  Contact sales team to reserve this {project.type === "plot" ? "plot" : "flat"}.
                </p>
              </div>
            </div>

            <div 
            id="builder-info"
            className="mt-6 md:mt-8 mb-10 rounded-xl md:rounded-2xl bg-white p-4 md:p-6 shadow-sm">
              <p className="mb-2 md:mb-3 text-sm md:text-lg font-semibold text-gray-900">
                Builder Address
              </p>

              <div className="text-xs md:text-sm text-gray-700 space-y-1 md:space-y-2">
                <p className="font-medium text-gray-800 md:text-base">
                  {project.builderName || "Builder Name"}
                </p>

                <p className="leading-relaxed">
                  Skyline Developers Pvt. Ltd.
                  4th Floor, Landmark Business Plaza
                  Ring Road, Civil Lines
                  Nagpur, Maharashtra – 440001
                </p>
              </div>
            </div>
            <div id="brochure">
            <BrochureSection
              pdfUrl={
                project.brochureUrl
                  ? `${process.env.NEXT_PUBLIC_API_URL}${project.brochureUrl}`
                  : ""
              }
            /> 
            </div>                      
                              </div>
                          </>
                        )}
                      </div>

                      {/* RIGHT */}
                      <div className="space-y-6 sticky top-6 self-start">
                        {/* Header */}
                    <div className="flex  justify-end mb-6">
                      
                      {/* CTA */}
                      <div className=" grid grid-cols-3 gap-2">
                        <button
                          onClick={onCallClick}
                          className="bg-[#3E5F16] text-white py-2 rounded-lg flex items-center justify-center gap-1 text-sm font-medium"
                        >
                          <Phone size={14} /> Call
                        </button>

                        <button
                          onClick={onWhatsAppClick}
                          className="bg-white hover:bg-gray-100 text-[#3E5F16] border boerder-[#3E5F16] py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>

                        <button
                          onClick={onEnquireClick}
                          className="border border-[#3E5F16] text-[#3E5F16] py-2 px-5 rounded-lg flex items-center justify-center gap-1 text-sm font-medium hover:bg-green-50"
                        >
                          <Send size={14} /> Enquire Now
                        </button>
                        {/* SHARE BUTTON — add this just before the close button */}
{/* SHARE BUTTON */}
<button
  onClick={async () => {
  const pageUrl = window.location.href;
  const { jsPDF } = await import('jspdf');

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
  infoRow('Builder Name', project.builderName || 'Builder Name');
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
                      </div>

                    </div>
                        <div className=" border border-gray-200 overflow-hidden">
                          <div className="relative h-[calc(100vh-180px)] bg-gray-200 flex items-center justify-center text-sm text-gray-600">
                            {memoizedMap ? (
                              memoizedMap
                            ) : (
                              <div className="flex h-full items-center justify-center bg-gray-200 text-sm text-gray-600">
                                Map location not available
                              </div>
                            )}
                          </div>
                        </div>

                      {/* MAP CONTROLS */}
            {/* MAP ACTION BAR */}
            <div className=" flex items-center gap-3 mt-1
                overflow-x-auto whitespace-nowrap
                scrollbar-hide
                pb-1">

              <button
                onClick={onDirections}
                className="
                flex shrink-0 items-center justify-center gap-1.5
                rounded-full bg-[#3E5F16]
                px-4 py-2
                text-xs sm:text-sm
                font-medium text-white
                hover:bg-[#365312]
                transition shadow-sm
              "

              >
                <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Directions
              </button>

              <button
                onClick={onMapView}
                className="
                flex shrink-0 items-center justify-center gap-1.5
                rounded-full bg-[#3E5F16]
                px-4 py-2
                text-xs sm:text-sm
                font-medium text-white
                hover:bg-[#365312]
                transition shadow-sm
              "

              >
                <MapPinAreaIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Map
              </button>

              <button
                onClick={onSatelliteView}
                className="
                flex shrink-0 items-center justify-center gap-1.5
                rounded-full bg-[#3E5F16]
                px-4 py-2
                text-xs sm:text-sm
                font-medium text-white
                hover:bg-[#365312]
                transition shadow-sm
              "

              >
                <MapPinAreaIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Satellite
              </button>

              <button
                onClick={on3DView}
              className="
                  flex shrink-0 items-center justify-center gap-1.5
                  rounded-full bg-[#3E5F16]
                  px-4 py-2
                  text-xs sm:text-sm
                  font-medium text-white
                  hover:bg-[#365312]
                  transition shadow-sm
                "

              >
                <Map className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                3D View
              </button>

              <button
                onClick={onStreetView}
                  className="
                  flex shrink-0 items-center justify-center gap-1.5
                  rounded-full bg-[#3E5F16]
                  px-4 py-2
                  text-xs sm:text-sm
                  font-medium text-white
                  hover:bg-[#365312]
                  transition shadow-sm
                "

              >
                <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Virtual View
              </button>
                       
            </div>
            
   
            
      

          </div>
        </div>
    
  </div>
  </div>
)}
