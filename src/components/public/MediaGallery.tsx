"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type MediaItem = {
  type: "image" | "video" | "brochure";
  src: string;
};

type Props = {
  items: MediaItem[];
  variant?: "mobile" | "desktop";
  project?: any;
};

export default function MediaGallery({
  items,
  variant = "desktop",
  project,
}: Props) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  const isMobile = variant === "mobile";

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  }, [items.length]);
  
  // ✅ Auto slide
  useEffect(() => {
    if (items.length <= 1 || viewerOpen) return;

    const id = setInterval(goNext, 3500);
    return () => clearInterval(id);
  }, [items.length, viewerOpen, goNext]);

  if (!items?.length) return null;

  const item = items[index];
  const fullUrl =
  item.src?.startsWith("http")
    ? item.src
    : `${process.env.NEXT_PUBLIC_API_URL}${item.src}`;
  return (
    <>
      {/* ---------------- SLIDER ---------------- */}
      <div
        className={`relative overflow-hidden bg-gray-100 group ${
          isMobile
            ? "w-full h-[220px] rounded-xl"
            : "w-[690px] h-[400px] rounded-md mt-10 mb-6"
        }`}
      >
        {project?.reraApproved && (
        <div className="absolute top-3 left-3 z-10 bg-black/70 text-white text-[10px] md:text-xs px-2 py-1 rounded-md backdrop-blur-sm">
            <span className="font-semibold">RERA Approved</span>
            {project?.reraNumber && (
            <span className="ml-1 opacity-90">
                 {project.reraNumber}
            </span>
            )}
        </div>
        )}
        {/* MEDIA */}
        <div
          className="w-full h-full cursor-pointer"
          onClick={() => setViewerOpen(true)}
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
            <div className="flex flex-col items-center justify-center w-full h-full bg-green-50 text-green-700 gap-3 px-4">

              <div className="text-4xl">📄</div>

              <p className="text-sm font-semibold text-center">
                Project Brochure
              </p>

              <div className="flex gap-2">
                {/* VIEW */}
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-[#3E5F16] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#2f4711] transition"
                >
                  View
                </a>

                {/* DOWNLOAD */}
                <a
                  href={fullUrl}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="border border-[#3E5F16] text-[#3E5F16] px-4 py-2 rounded-lg text-xs font-medium hover:bg-green-100 transition"
                >
                  Download
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ARROWS */}
        {items.length > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              <ChevronLeft size={isMobile ? 18 : 22} />
            </button>

            <button
              onClick={goNext}
              className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full"
            >
              <ChevronRight size={isMobile ? 18 : 22} />
            </button>
          </>
        )}

        {/* DOTS */}
        <div className="absolute bottom-2 md:bottom-4 w-full flex justify-center gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === index
                  ? "bg-white w-5 h-1.5"
                  : "bg-white/50 w-2 h-1.5"
              }`}
            />
          ))}
        </div>
      </div>

      {/* ---------------- FULLSCREEN VIEWER ---------------- */}
      {viewerOpen && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          
          {/* CLOSE */}
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 text-white text-2xl z-50"
          >
            <X />
          </button>

          {/* CONTENT */}
          <div className="w-full h-full flex items-center justify-center">
            {item.type === "image" && (
              <Image
                src={item.src}
                alt="fullscreen"
                fill
                className="object-contain"
              />
            )}

            {item.type === "video" && (
              <video
                src={item.src}
                controls
                autoPlay
                className="max-h-full max-w-full"
              />
            )}

            {item.type === "brochure" && (
            <div className="flex flex-col items-center gap-4">
              
              <iframe
                src={fullUrl}
                className="w-[90vw] h-[80vh] rounded-lg"
              />

              <div className="flex gap-3">
                <a
                  href={fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#3E5F16] text-white px-5 py-2 rounded-lg text-sm"
                >
                  View in New Tab
                </a>

                <a
                  href={fullUrl}
                  download
                  className="border border-[#3E5F16] text-[#3E5F16] px-5 py-2 rounded-lg text-sm"
                >
                  Download
                </a>
              </div>
            </div>
)}
          </div>

          {/* NAV */}
          {items.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white"
              >
                <ChevronLeft size={30} />
              </button>

              <button
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white"
              >
                <ChevronRight size={30} />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}