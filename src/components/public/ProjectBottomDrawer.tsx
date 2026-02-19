



//src\components\public\ProjectBottomDrawer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Phone, MessageCircle, Eye, LucideIcon } from "lucide-react";
import { Project } from "@/types/project";

// =============================
// Action Button
// =============================
type ActionButtonProps = {
  icon: LucideIcon;
  label?: string;
  onClick?: () => void;
  className?: string;
};
interface DrawerContentProps {
  projects: Project[];
  selectedProjectId?: string | null;
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}
function ActionButton({
  icon: Icon,
  label,
  onClick,
  className = "",
  size = "default",
}: ActionButtonProps & { size?: "default" | "compact" }) {
  const sizeStyles =
    size === "compact"
      ? "px-5.5 py-1.5 text-[11px]"
      : "px-2.5 py-1.5 text-[11px]";
  const iconSize = size === "compact" ? 14 : 14;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center gap-1
        rounded-xl text-xs font-medium
        transition active:scale-95 shadow-sm
        ${sizeStyles}
        ${className}
      `}
    >
      <Icon size={iconSize} />
      {label && <span>{label}</span>}
    </button>
  );
}

// =============================
// Mobile / default project card
// =============================
function ProjectCardMobile({
  project,
  selected,
  cardRefs,
}: {
  project: Project;
  selected: boolean;
  cardRefs: any;
}) {
  const image = project.coverImage || project.galleryImages?.[0];

  const cleanNumber = project.whatsappNumber?.replace(/\D/g, "");

  const whatsapp = () => {
    if (!cleanNumber) return;
    const msg = encodeURIComponent(`Hi, I'm interested in ${project.name}`);
    window.location.href = `whatsapp://send?phone=${cleanNumber}&text=${msg}`;
  };

  const call = () => {
    if (!project.callNumber) return;
    window.location.href = `tel:${project.callNumber}`;
  };

  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        cardRefs.current[project.id] = el;
      }}
      className={`
        rounded-2xl bg-white  transition
        ${selected ? "ring-2 ring-emerald-500" : ""}
      `}
    >
      <div className="grid grid-cols-[20%_80%] gap-3 p-3">
        {/* IMAGE */}
        <div className="relative aspect-[17/16] overflow-hidden rounded-xl bg-gray-100">
          <img
            src={image || "/placeholder.jpg"}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* DETAILS */}
        <div className="flex flex-col justify-between">
          <div className="space-y-1">
            <h3 className="text-m font-semibold leading-tight">
              {project.name}
            </h3>
            {project.bhkOptions && (
              <p className="text-xs text-blue-700">
                {project.bhkOptions.join(", ")}
              </p>
            )}
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Link href={`/visit/${project.slug ?? project.id}`} className="w-full">
              <ActionButton
                icon={Eye}
                label="View"
                className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200"
              />
            </Link>

            <ActionButton
              icon={Phone}
              label="Call"
              onClick={call}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            />

            <ActionButton
              icon={MessageCircle}
              label="WhatsApp"
              onClick={whatsapp}
              className="w-full bg-green-600 text-white hover:bg-green-700"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================
// Desktop card layout
// =============================
function ProjectCardDesktop({ project }: { project: Project }) {
  const image = project.coverImage || project.galleryImages?.[0];

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition text-sm">
      {/* Smaller card aspect ratio */}
      <div className="relative w-full aspect-[3/2]">
        <img
          src={image || "/placeholder.jpg"}
          alt={project.name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="p-3 space-y-1">
        <h3 className="text-base font-semibold">{project.name}</h3>
        {project.bhkOptions && (
          <p className="text-xs text-blue-700">{project.bhkOptions.join(", ")}</p>
        )}
        <div className="flex gap-1 mt-2 text-xs">
          <Link href={`/visit/${project.slug ?? project.id}`} className="flex-1">
            <ActionButton
              icon={Eye}
              label="View"
              className="w-full bg-[#5F7F33] text-white hover:bg-gray-200"
              size="compact"
            />
          </Link>
          <ActionButton
            icon={Phone}
            label="Call"
            className="flex-1 bg-white text-[#5F7F33] border border-[#5F7F33]"
            size="compact"
          />
          <ActionButton
            icon={MessageCircle}
            label="WhatsApp"
            className="flex-1 bg-white text-[#5F7F33] border border-[#5F7F33] "
            size="compact"
          />
        </div>
      </div>
    </div>
  );
}


// =============================
// Drawer content
// =============================
function DrawerContent({ projects, selectedProjectId, cardRefs }: DrawerContentProps) {
  const [visibleCount, setVisibleCount] = useState(4); // initially show 4 cards

  const loadMore = () => {
    setVisibleCount((prev) => prev + 4); // load 4 more each time
  };

  const visibleProjects = projects.slice(0, visibleCount);
  return (
    <div className="h-full overflow-y-auto overscroll-contain px-4 pb-4 scrollbar-hide">
      {/* MOBILE CARDS */}
      <div className="flex flex-col gap-4 pt-4 lg:hidden">
        {projects.map((project: Project, i: number) => (
          <div key={project.id}>
            <ProjectCardMobile
              project={project}
              selected={selectedProjectId === project.id}
              cardRefs={cardRefs}
            />
            {i !== projects.length - 1 && (
              <div className="mx-3 my-2 h-px bg-gray-200/70" />
            )}
          </div>
        ))}
      </div>

      {/* DESKTOP GRID */}
      <div className="hidden  lg:grid lg:grid-cols-2 gap-6 pt-4">
        {projects.map((project: Project) => (
          <ProjectCardDesktop key={project.id} project={project} />
        ))}
      </div>
      {/* Load More Button */}
      {visibleCount < projects.length && (
        <div className="hidden lg:flex justify-center mt-6">
          <button
            onClick={loadMore}
            className="px-6 py-2 rounded-lg bg-[#3E5F16] text-white font-medium hover:bg-[#365312] transition"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

// =============================
// Drawer Wrapper
// =============================
export default function ProjectsBottomDrawer({
  projects,
  selectedProjectId,
}: {
  projects: Project[];
  selectedProjectId?: string | null;
}) {
  const [open, setOpen] = useState(true);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!selectedProjectId) return;
    setOpen(true);
    requestAnimationFrame(() => {
      const el = cardRefs.current[selectedProjectId];
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [selectedProjectId]);

  return (
    <>
      {/* MOBILE DRAWER */}
      <motion.div
        initial={{ y: "70%" }}
        animate={{ y: open ? 0 : "75%" }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl lg:hidden"
        style={{ height: "80vh" }}
      >
        <div className="flex flex-col items-center py-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full mb-2" />
          <button
            onClick={() => setOpen(!open)}
            className="text-sm font-medium text-gray-700"
          >
            {open ? "Hide Projects" : "Show Projects"}
          </button>
        </div>

        <DrawerContent
          projects={projects}
          selectedProjectId={selectedProjectId}
          cardRefs={cardRefs}
        />
      </motion.div>

      {/* DESKTOP PANEL */}
      <div className="hidden  h-full w-full bg-white border-l overflow-hidden">
        <DrawerContent
          projects={projects}
          selectedProjectId={selectedProjectId}
          cardRefs={cardRefs}
        />
      </div>
    </>
  );
}

// at the bottom of ProjectBottomDrawer.tsx
export { DrawerContent }; // named export
