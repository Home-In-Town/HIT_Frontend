'use client';

import { useEffect, useRef, useState } from "react";

type SectionKey =
  | "details"
  | "facilities"
  | "floor"
  | "booking"
  | "sellers"
  | "brochure";

type Props = {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  sectionRefs: Record<
    SectionKey,
    React.RefObject<HTMLDivElement | null>
  >;
};


const navItems: { label: string; key: SectionKey }[] = [
  { label: "Details", key: "details" },
  { label: "Facilities", key: "facilities" },
  { label: "Floor Plans", key: "floor" },
  { label: "Booking", key: "booking" },
  { label: "Sellers", key: "sellers" },
  { label: "Brochure", key: "brochure" },
];

export default function SubNavbar({
  scrollContainerRef,
  sectionRefs,
}: Props) {
  const navRef = useRef<HTMLDivElement | null>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const updateArrows = () => {
    const el = navRef.current;
    if (!el) return;

    setShowLeft(el.scrollLeft > 5);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    updateArrows();
  }, []);

  const scrollNav = (dir: "left" | "right") => {
    const el = navRef.current;
    if (!el) return;

    el.scrollBy({
      left: dir === "left" ? -150 : 150,
      behavior: "smooth",
    });
  };

  const scrollToSection = (key: SectionKey) => {
    const container = scrollContainerRef.current;
    const target = sectionRefs[key]?.current;

    if (!container || !target) return;

    container.scrollTo({
      top: target.offsetTop - 60,
      behavior: "smooth",
    });
  };

  return (
    <div className="sticky top-0 z-20 bg-white mb-1 relative">

      {showLeft && (
        <button
          onClick={() => scrollNav("left")}
          className="absolute left-0 top-0 bottom-0 z-10
                     px-1 bg-gradient-to-r from-white flex items-center"
        >
          ‹
        </button>
      )}

      {showRight && (
        <button
          onClick={() => scrollNav("right")}
          className="absolute right-0 top-0 bottom-0 z-10
                     px-1 bg-gradient-to-l from-white flex items-center"
        >
          ›
        </button>
      )}

      <div
        ref={navRef}
        onScroll={updateArrows}
        className="flex gap-3 overflow-x-auto py-2
                   text-[11px] font-medium scrollbar-hide scroll-smooth"
      >
        {navItems.map(({ label, key }) => (
          <button
            key={key}
            onClick={() => scrollToSection(key)}
            className="shrink-0 px-3 py-1
                       hover:bg-[#3E5F16]
                       hover:text-white transition"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
