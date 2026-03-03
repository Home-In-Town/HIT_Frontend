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
  //  Neighborhood
  neighborhoodBtnRef: React.RefObject<HTMLDivElement | null>;
  showNeighborhoodMenu: boolean;
  dropdownPos: { top: number; left: number };
  onNeighborhoodToggle: () => void;
  onNeighborhoodSelect: (key: string) => void;
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
  
  neighborhoodBtnRef,
  showNeighborhoodMenu,
  dropdownPos,
  onNeighborhoodToggle,
  onNeighborhoodSelect,

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
      logo={project.coverImage}
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
                          {/* NEIGHBORHOOD BUTTON + DROPDOWN */}
                          <div ref={neighborhoodBtnRef} className="relative shrink-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNeighborhoodToggle();
                }}
                className="
                  flex shrink-0 items-center gap-2
                  rounded-full
                  bg-[#3E5F16]
                  px-4 py-2
                  text-xs sm:text-sm
                  font-medium text-white
                  shadow-sm
                  hover:bg-[#365312]
                  transition
                "
              >
                <MapPin className="h-4 w-4" />
                Neighborhood
              </button>
            </div>

            </div>
            {showNeighborhoodMenu && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="
                  fixed z-[9999]
                  w-40
                  bg-white
                  rounded-xl
                  shadow-2xl
                  border border-gray-200
                  p-2
                  flex flex-col gap-1
                "
                style={{
                  top: dropdownPos.top,
                  left: dropdownPos.left,
                }}
              >
                {[
                  { label: "Hospitals", key: "hospital" },
                  { label: "Market", key: "market" },
                  { label: "Restaurants", key: "restaurant" },
                  { label: "Metro", key: "metro" },
                  { label: "Schools", key: "school" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => onNeighborhoodSelect(item.key)}
                    className="
                      flex items-center justify-between
                      px-3 py-2
                      rounded-lg
                      text-sm
                      font-medium
                      text-gray-700
                      hover:bg-[#3E5F16]
                      hover:text-white
                      transition
                    "
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
   
            
      

          </div>
        </div>
    
  </div>
  </div>
)}
