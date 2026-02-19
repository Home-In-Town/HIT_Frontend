//app\visit\[slug]\DesktopVisit.tsx
"use client";
import {
  SwimmingPool,
  Barbell,
  Car,
  TreePalm,
  ShieldCheck,
  Basketball,
  Elevator,
  Lightning,
  HouseLine,
  Users,
  Park,
  FirstAid,
  WifiHigh,
  Storefront,
} from "@phosphor-icons/react";

import { DrawerContent } from "@/components/public/ProjectBottomDrawer";
import Image from "next/image";
import { Phone, MessageCircle, Send, FileText, MapPin, Home, Banknote, Building2, Eye, Map, MapPinMinus } from "lucide-react";
import { motion } from "framer-motion";
import { Project } from "@/types/project";
import React, { useRef } from "react";
import EnquiryModal from "@/components/public/EnquiryModal";
import ProjectMap from "@/components/public/ProjectMap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MapPinAreaIcon } from "@phosphor-icons/react/dist/ssr";

type DesktopVisitProps = {
  project: Project & {
    images?: string[];
    status?: string;
    projectArea?: string;
    totalUnits?: string;
    possessionDate?: string;
    towers?: string;
  };
  onCallClick?: () => void;
  onWhatsAppClick?: () => void;
  onEnquireClick?: () => void;
   // map actions
  onDirections: () => void;
  onMapView: () => void;
  onSatelliteView: () => void;
  on3DView: () => void;
  onStreetView: () => void;
  onNeighborhoodView: () => void;

   // 🔥 map props
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
function AutoMediaSlider({ items }: { items: any[] }) {
  const [index, setIndex] = React.useState(0);

  const goNext = React.useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = React.useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);

  // auto change
  React.useEffect(() => {
    if (items.length <= 1) return;
    const id = setInterval(goNext, 3500);
    return () => clearInterval(id);
  }, [goNext, items.length]);

  const item = items[index];

  return (
    <div className="mt-10 mb-6 ml-40 relative w-[400px] h-[400px] rounded-xl overflow-hidden bg-gray-100 group">
      <motion.div
        key={index}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full h-full"
      >
        {item.type === "image" && (
          <Image src={item.src} alt="media" fill className="object-cover" />
        )}

        {item.type === "video" && (
          <video
            src={item.src}
            autoPlay
            muted
            loop
            className="w-full h-full object-cover"
          />
        )}

        {item.type === "brochure" && (
          <a
            href={item.src}
            target="_blank"
            className="flex flex-col items-center justify-center w-full h-full bg-blue-50 hover:bg-blue-100 transition"
          >
            <FileText size={36} className="text-blue-600 mb-2" />
            <p className="font-medium text-blue-700">Open Brochure</p>
          </a>
        )}
      </motion.div>

      {/* arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronLeft size={18} />
          </button>

          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

const getAmenityVisual = (amenity: string) => {
  const name = amenity.toLowerCase();

  const map = [
    { match: ["pool", "swim"], icon: SwimmingPool, bg: "bg-cyan-100", color: "text-cyan-600" },
    { match: ["gym", "fitness"], icon: Barbell, bg: "bg-rose-100", color: "text-rose-600" },
    { match: ["parking", "car"], icon: Car, bg: "bg-indigo-100", color: "text-indigo-600" },
    { match: ["garden", "park", "landscape"], icon: TreePalm, bg: "bg-green-100", color: "text-green-600" },
    { match: ["security"], icon: ShieldCheck, bg: "bg-emerald-100", color: "text-emerald-600" },
    { match: ["sports", "court"], icon: Basketball, bg: "bg-orange-100", color: "text-orange-600" },
    { match: ["lift", "elevator"], icon: Elevator, bg: "bg-gray-100", color: "text-gray-700" },
    { match: ["power", "backup"], icon: Lightning, bg: "bg-yellow-100", color: "text-yellow-600" },
    { match: ["club", "community"], icon: Users, bg: "bg-purple-100", color: "text-purple-600" },
    { match: ["wifi", "internet"], icon: WifiHigh, bg: "bg-sky-100", color: "text-sky-600" },
    { match: ["medical"], icon: FirstAid, bg: "bg-red-100", color: "text-red-600" },
    { match: ["shop", "retail"], icon: Storefront, bg: "bg-pink-100", color: "text-pink-600" },
  ];

  const found = map.find(item =>
    item.match.some(keyword => name.includes(keyword))
  );

  return (
    found || {
      icon: HouseLine,
      bg: "bg-gray-100",
      color: "text-gray-600",
    }
  );
};

export default function DesktopVisit({
  project,
  onCallClick,
  onWhatsAppClick,
  onEnquireClick,
  
  onDirections,
  on3DView,
  onStreetView,
  onMapView,
  onSatelliteView,
  onNeighborhoodView,
  mapRef,
  hasCoordinates,
  onMarkerClick,
  onDrawerData,

  drawerProjects,
  drawerSelected,
  drawerOpen,
}: DesktopVisitProps) {
  // Support both API field names
  const gallery = project.images || project.galleryImages || [];
  const videos = project.videos || [];

  // Combine images + videos + brochure into one media feed
  const mediaItems = [
    ...gallery.map((src) => ({ type: "image", src })),
    ...videos.map((src) => ({ type: "video", src })),
    ...(project.brochureUrl
      ? [{ type: "brochure", src: project.brochureUrl }]
      : []),
  ];

  const formatValue = (value: any) => {
    if (!value) return "—";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  };

  const detailItems = [
    //{ label: "Project Area", value: project.projectArea, icon: MapPin },
    { label: "Carpet Area", value: project.carpetAreaRange, icon: Home },   
    { label: "BHK Options", value: project.bhkOptions, icon: Building2 },
     { label: "Floors", value: project.floorRange, icon: Building2 },
    // { label: "Facing", value: project.facingOptions, icon: MapPin },
    //{ label: "Bank Loan", value: project.bankLoanAvailable, icon: Banknote },
    //{ label: "Gated Community", value: project.gatedCommunity, icon: Home },
     
    
  ];

  const [showPriceBreakdown, setShowPriceBreakdown] = React.useState(false);
   const drawerCardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
const priceBreakdown =   [
  { label: "MRP (₹ / sq.ft)", value: "₹ 5,200" },
  { label: "GST", value: "₹ 3,25,000" },
  { label: "Registration", value: "₹ 1,10,000" },
  { label: "Other Charges", value: "₹ 85,000" },
  { label: "Government Charges", value: "₹ 75,000" },
  { label: "Legal Charges", value: "₹ 50,000" },
];



  return (
    <div className="min-h-screen">
      <div className="mx-auto bg-white  p-5 pl-10 ">
        

      
        {/* Layout */}
        <div className="mt-2 grid grid-cols-2 gap-8 h-[calc(100vh-120px)]">
          {/* LEFT PANEL */}
          <div className="mt-2 overflow-y-auto pr-4 scrollbar-hide">
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
            {/* Status + RERA badges */}
            <div className="flex flex-wrap items-center gap-2 mb-3">

              {/* Status */}
              {project.projectStatus && (
                <span className="px-3 py-1 text-xs bg-[#5F7F33] rounded-full  text-white">
                  {project.projectStatus}
                </span>
              )}

              {/* RERA combined */}
              {project.reraApproved && (
                <span className="px-3 py-1 text-xs font-medium rounded-full border border-[#5F7F33] bg-white text-[#5F7F33]">
                  RERA Approved
                  {project.reraNumber && (
                    <span className="ml-2 bg-white text-[#5F7F33]">
                      {project.reraNumber}
                    </span>
                  )}
                </span>
              )}

            </div>


                {/* Title + Price Row */}
            <div className="flex items-start justify-between gap-6 mb-10">

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
                <p className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin size={14} className="text-gray-400" />
                  {project.location}
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
                        {/* Project Details */}

                        <div className="grid grid-cols-3 gap-3">
                          {detailItems.map(({ label, value, icon: Icon }) => (
                            <div
                              key={label}
                              className="flex gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-sm transition"
                            >
                              <Icon size={18} className="text-[#5F7F33] mt-1" />

                              <div>
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="font-medium text-sm">
                                  {formatValue(value)}
                                </p>
                              </div>
                            </div>
                          ))}             
                        </div> 

                        {/* Media Auto Slider — Images + Videos + Brochure */}
                        {/* <h3 className="font-medium mb-3">Media</h3> */}

                        {mediaItems.length === 0 ? (
                          <div className="mb-10 border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                            <p className="text-sm font-medium text-gray-700">
                              No media available
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Request photos & videos from our team
                            </p>
                          </div>
                        ) : (
                          <AutoMediaSlider items={mediaItems} />
                        )}

                        

                        {/* Amenities Section */}
            {project.amenities?.length > 0 && (
              <div className="mt-10">
                <h3 className="text-lg font-semibold mb-5 text-gray-900">
                  Amenities
                </h3>

                <div className="grid grid-cols-2 gap-2">
                  {project.amenities.map((amenity: string, i: number) => {
                    const visual = getAmenityVisual(amenity);
                    const Icon = visual.icon;

                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 bg-white  rounded-xl p-4 transition"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center ${visual.bg}`}
                        >
                          <Icon
                            size={22}
                            weight="duotone"
                            className={visual.color}
                          />
                        </div>

                        <p className="text-sm font-medium text-gray-800">
                          {amenity}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
               {hasCoordinates ? (
                <ProjectMap
                  ref={mapRef}
                  lat={project.latitude!}
                  lng={project.longitude!}
                  logo={project.coverImage}
                  focusOnly
                  onMarkerClick={onMarkerClick}
                  onDrawerData={onDrawerData}
                />
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
  <button
    onClick={onNeighborhoodView}
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
    Neighborhood
  </button>

</div>


          </div>
        </div>
    
  </div>
  </div>
)}
