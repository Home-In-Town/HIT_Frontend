// //layout-editor page for project
// 'use client';

// import { useParams } from 'next/navigation';
// import { useEffect, useRef, useState } from 'react';
// import ProjectMap from '@/components/public/ProjectMap';
// import { projectsApi, saveProjectLandmarks } from '@/lib/api';
// import { Landmark } from '@/types/project';
// function getMobileTools(tab: string) {
//     switch(tab) {
//       case "Boundary": return [
//         { icon: "🧱", label: "Draw", color: "green", onClick: () => { setDrawingType("project-boundary"); setDrawingMode('polygon'); }},
//         { icon: "💾", label: "Save", color: "gray", onClick: () => mapRef.current?.saveBoundary(projectId) },
//         { icon: "🧩", label: "Edit", color: "gray", onClick: () => mapRef.current?.editBoundary() },
//         { icon: "↩", label: "Undo", color: "gray", onClick: () => mapRef.current?.undo() },
//       ];
//       case "Roads": return [
//         { icon: "🛣", label: "Draw", color: "green", onClick: () => { setDrawingType("road"); setDrawingMode('polygon'); }},
//         { icon: "⬛", label: "Rect", color: "gray", onClick: () => { setDrawingType("road"); setDrawingMode('rectangle'); }},
//         { icon: "↩", label: "Undo", color: "gray", onClick: () => mapRef.current?.undo() },
//         { icon: "✖", label: "Exit", color: "gray", onClick: () => setDrawingMode(null) },
//       ];
//       case "Plots": return [
//         { icon: "📐", label: "Draw", color: "green", onClick: () => { setDrawingType("subplot"); setDrawingMode('polygon'); }},
//         { icon: "⬛", label: "Rect", color: "gray", onClick: () => { setDrawingType("subplot"); setDrawingMode('rectangle'); }},
//         { icon: "💾", label: "Save", color: "gray", onClick: () => mapRef.current?.openLastUnsavedPlot() },
//         { icon: "🗑", label: "Delete", color: "gray", onClick: () => mapRef.current?.deleteSelectedPlot() },
//       ];
//       case "AI": return [
//         { icon: "🟣", label: "Boundary", color: "green", onClick: () => { setDrawingType("ai-boundary"); setDrawingMode('polygon'); }},
//         { icon: "⚡", label: "Generate", color: "gray", onClick: () => mapRef.current?.generateAILayout() },
//         { icon: "✏️", label: "Edit", color: "gray", onClick: () => mapRef.current?.toggleAiEditMode(true) },
//         { icon: "💾", label: "Save", color: "gray", onClick: () => { mapRef.current?.saveAiLayout(); setDrawingMode(null); }},
//       ];
//       case "More": return [
//         { icon: "🧭", label: "Lock", color: "gray", onClick: () => mapRef.current?.lockToBoundary() },
//         { icon: "🔓", label: "Unlock", color: "gray", onClick: () => mapRef.current?.unlockCanvas() },
//         { icon: "📸", label: "Capture", color: "gray", onClick: () => mapRef.current?.captureLayoutImage() },
//         { icon: "📍", label: "Landmarks", color: "gray", onClick: () => mapRef.current?.fetchLandmarks() },
//       ];
//       default: return [];
//     }
//   }
// export default function LayoutEditorPage() {
//   const mapRef = useRef<any>(null);
//   const params = useParams<{ id: string }>();
//   const [landmarks, setLandmarks] = useState<Landmark[]>([]);
//   const [selectedLandmarks, setSelectedLandmarks] = useState<Landmark[]>([]);
//   const [panelPlotId, setPanelPlotId] = useState<string | null>(null);
//   const projectId = params.id;

//   const [project, setProject] = useState<any>(null);
//   const [search, setSearch] = useState("");
// const [filteredLandmarks, setFilteredLandmarks] = useState<Landmark[]>([]);
//   const [drawingMode, setDrawingMode] =
//     useState<google.maps.drawing.OverlayType | null>(null);

//   const [drawingType, setDrawingType] =
//     useState<"project-boundary" | "subplot" | "road" | "ai-boundary" | undefined>("project-boundary");
//     const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
//  useEffect(() => {
//   if (!projectId) return;

//   (async () => {
//     const data = await projectsApi.getById(projectId);
//     setProject(data);

//     // ✅ Get landmarks directly from project
//     const savedLandmarks = data.landmarks || [];

//     setSelectedLandmarks(savedLandmarks);

//     // Sync with map
//     if (mapRef.current) {
//       mapRef.current.setSelectedLandmarks(savedLandmarks);
//     }
//   })();
// }, [projectId]);
// useEffect(() => {
//   if (!mapRef.current) return;

//   // 🔥 pass search to map (we’ll add this function next)
//   mapRef.current.setLandmarkSearch?.(search);

//   const filtered =
//     mapRef.current?.getFilteredLandmarks?.() || [];

//   setFilteredLandmarks(filtered);
// }, [search, landmarks]);
// const [plotNumberInput, setPlotNumberInput] = useState("");

// useEffect(() => {
//   if (panelPlotId) {
//     const plot = mapRef.current?.getPlot(panelPlotId);
//     setPlotNumberInput(plot?.plotNumber || "");
//   }
// }, [panelPlotId]);
//   if (!project) return <div>Loading...</div>;
 
// function ToolButton({
//   icon,
//   label,
//   onClick,
//   disabled = false,
//   color = "gray",
// }: {
//   icon: string;
//   label: string;
//   onClick: () => void;
//   disabled?: boolean;
//   color?: string;
// }) {
//   const colorStyles: Record<string, string> = {
//     gray: "bg-gray-100 hover:bg-gray-200",
//     red: "bg-red-100 hover:bg-red-200",
//     yellow: "bg-yellow-100 hover:bg-yellow-200",
//     blue: "bg-blue-100 hover:bg-blue-200",
//     green: "bg-green-100 hover:bg-green-200",
//     indigo: "bg-indigo-100 hover:bg-indigo-200",
//     purple: "bg-purple-100 hover:bg-purple-200",
//   };
//   const [activeTab, setActiveTab] = useState<"Boundary"|"Roads"|"Plots"|"AI"|"More">("Boundary");

  
//   return (
//     <div className="relative group hover:z-50">
//       <button
//         disabled={disabled}
//         onClick={onClick}
//         className={`h-12 w-full rounded-xl text-lg transition flex items-center justify-center 
//         ${colorStyles[color]} hover:text-white disabled:opacity-40`}
//       >
//         {icon}
//       </button>

//       <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
//       bg-black text-white text-xs px-3 py-1 rounded-md
//       opacity-0 group-hover:opacity-100 transition
//       whitespace-nowrap z-50 pointer-events-none">
//         {label}
//       </span>
//     </div>
//   );
// }
//   return (
//     <div className="flex h-screen w-full bg-gray-100">
      
//        {/* Mobile top bar */}
//       <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center lg:hidden">
//         <div className="bg-white rounded-xl px-3 py-1.5 text-xs font-medium shadow-sm border border-gray-200">
//           {project.name || "Layout Editor"}
//         </div>
//         <button
//           onClick={() => setDrawingMode(null)}
//           className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-200 text-sm"
//         >
//           ✕
//         </button>
//       </div>
//       {/* MOBILE BOTTOM SHEET */}
//       <div className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl border-t border-gray-200 lg:hidden">
//         <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mt-2 mb-3" />

//         {/* Tab bar */}
//         <div className="flex gap-1.5 px-4 mb-3">
//           {(["Boundary","Roads","Plots","AI","More"] as const).map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               className={`flex-1 text-[10px] font-medium py-1.5 rounded-lg transition ${
//                 activeTab === tab
//                   ? "bg-[#3E5F16] text-white"
//                   : "bg-gray-100 text-gray-600"
//               }`}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>

//         {/* Tool buttons for active tab */}
//         <div className="grid grid-cols-4 gap-2 px-4 pb-6">
//           {getMobileTools(activeTab).map(({ icon, label, onClick, color }) => (
//             <button
//               key={label}
//               onClick={onClick}
//               className={`flex flex-col items-center gap-1 rounded-xl py-2.5 text-lg border
//                 ${color === "green" ? "bg-[#3E5F16] text-white border-transparent"
//                 : "bg-gray-50 border-gray-200 text-gray-700"}`}
//             >
//               <span>{icon}</span>
//               <span className="text-[9px] text-inherit opacity-80">{label}</span>
//             </button>
//           ))}
//         </div>
//       </div>
//         {/* LEFT TOOLBAR */}
//         <div className="hidden lg:flex w-80 bg-white shadow-xl p-4 z-30 flex flex-col gap-6 overflow-y-auto">

//   {/* ========================= */}
//   {/* 📍 SAVE LANDMARKS SECTION */}
//   {/* ========================= */}
//   <div>
//     <h2 className="text-m font-bold text-gray-500 mb-3 text-center">
//       SAVE LANDMARKS
//     </h2>

//     {/* Fetch Button */}
//     <button
//       onClick={() => {
//         mapRef.current?.fetchLandmarks();

//         setTimeout(() => {
//           const data = mapRef.current?.getAvailableLandmarks() || [];
//           setLandmarks(data);
//         }, 800);
//       }}
//       className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs mb-3"
//     >
//       📍 Fetch Nearby
//     </button>

//     {/* LANDMARK LIST (appears AFTER fetch) */}
//     {landmarks.length > 0 && (
//       <div className="border rounded-lg p-2 bg-gray-50">

//         {/* Search */}
//         <input
//           type="text"
//           placeholder="Search landmarks..."
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           className="w-full mb-2 px-2 py-1 border rounded text-xs outline-none"
//         />

//         {/* List */}
//         <div className="max-h-60 overflow-y-auto">
//           {(filteredLandmarks.length ? filteredLandmarks : landmarks).map((lm) => (
//             <div
//               key={lm.placeId}
//               className="flex items-center justify-between text-xs py-1 border-b"
//             >
//               <span className="truncate">{lm.name}</span>

//               <input
//                 type="checkbox"
//                 checked={!!selectedLandmarks?.some(
//                   (l) => l.placeId === lm.placeId
//                 )}
//                 onChange={() => {
//                   const updated =
//                     mapRef.current?.toggleLandmarkSelection(lm) || [];
//                   setSelectedLandmarks(updated);
//                 }}
//               />
//             </div>
//           ))}
//         </div>

//         {/* Save */}
//         <button
//           onClick={async () => {
//             try {
//               const toSave =
//                 mapRef.current?.getSelectedLandmarks() || selectedLandmarks;

//               await saveProjectLandmarks(projectId, toSave);
//               alert("Saved successfully");
//             } catch (err: any) {
//               alert(err.message || "Failed to save landmarks");
//             }
//           }}
//           className="mt-2 w-full bg-emerald-600 text-white py-1 rounded text-xs"
//         >
//           Save Landmarks
//         </button>
//       </div>
//     )}
//   </div>

//   {/* ========================= */}
//   {/* 🧱 LAYOUT DRAW TOOLS */}
//   {/* ========================= */}
//   <div className="space-y-5">

//     <h2 className="text-sm font-bold text-gray-600 text-center">
//       LAYOUT EDITOR
//     </h2>

//     {/* ----------------- */}
//     {/* PROJECT BOUNDARY */}
//     {/* ----------------- */}
//     <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         Project Boundary
//       </h3>

//       <div className="grid grid-cols-3 gap-2">
//         <ToolButton
//           icon="🧱"
//           label="Draw Boundary"
//           onClick={() => {
//             setDrawingType("project-boundary");
//             setDrawingMode('polygon');
//           }}
//           color="indigo"
//         />

//         <ToolButton
//           icon="💾"
//           label="Save Boundary"
//           onClick={() => mapRef.current?.saveBoundary(projectId)}
//           color="green"
//         />

//         <ToolButton
//           icon="🧩"
//           label="Edit Boundary"
//           onClick={() => mapRef.current?.editBoundary()}
//           color="blue"
//         />
//       </div>
//     </div>

//     {/* ----------------- */}
//     {/* ROAD TOOLS */}
//     {/* ----------------- */}
//     <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         Roads
//       </h3>

//       <div className="grid grid-cols-3 gap-2">
//         <ToolButton
//           icon="🛣"
//           label="Draw Road"
//           onClick={() => {
//             setDrawingType("road");
//             setDrawingMode('polygon');
//           }}
//           color="gray"
//         />
    
//         <ToolButton
//           icon="⬛"
//           label="Rectangle Road"
//           onClick={() => {
//             setDrawingType("road");
//             setDrawingMode('rectangle');
//           }}
//           color="gray"
//         />

//       </div>
//     </div>

//     {/* ----------------- */}
//     {/* PLOT TOOLS */}
//     {/* ----------------- */}
//     <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         Plots
//       </h3>

//       <div className="grid grid-cols-3 gap-2">
//         <ToolButton
//           icon="📐"
//           label="Draw Plot"
//           onClick={() => {
//             setDrawingType("subplot");
//             setDrawingMode('polygon');
//           }}
//           color="purple"
//         />
//         <ToolButton
//           icon="⬛"
//           label="Rectangle Plot"
//           onClick={() => {
//             setDrawingType("subplot");
//             setDrawingMode('rectangle');
//           }}
//           color="purple"
//         />
//         <ToolButton
//           icon="✏"
//           label="Edit Plot"
//           disabled={!panelPlotId}
//           onClick={() =>
//             panelPlotId &&
//             mapRef.current?.editPlot(panelPlotId)
//           }
//           color="blue"
//         />

//         <ToolButton
//           icon="💾"
//           label="Save Plot"
//           onClick={() => mapRef.current?.openLastUnsavedPlot()}
//           color="green"
//         />
//         <ToolButton
//           icon="🗑"
//           label="Delete Plot"
        
//           onClick={() => mapRef.current?.deleteSelectedPlot()}
//           color="red"
//         />
//       </div>
      
//     </div>
//      <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         AI Generated Plots
//       </h3>

//       <div className="grid grid-cols-3 gap-2">

//         {/* Draw AI Boundary */}
//        <ToolButton
//           icon="🟣"
//           label="Draw AI Boundary"
//           onClick={() => {
//             mapRef.current?.toggleAiEditMode(false);
//             setDrawingType("ai-boundary");
//             setDrawingMode('polygon');

//           }}
//           color="purple"
//         />
//         {/* Generate AI Layout */}
//         <ToolButton
//           icon="⚡"
//           label="Generate AI Layout"
//           onClick={() => mapRef.current?.generateAILayout()}
//           color="green"
//         />
        
//         <ToolButton
//           icon="✏️"
//           label="Edit AI Layout"
//           onClick={() => {
//             mapRef.current?.toggleAiEditMode(true);
//           }}
//           color="blue"
//         />
//         <ToolButton
//           icon="💾"
//           label="Save AI Layout"
//           onClick={() => {
//             mapRef.current?.saveAiLayout();

//             // ✅ stop drawing mode
//             setDrawingMode(null);
//             setDrawingType(undefined);
//           }}
//           color="green"
//         />
//       </div>
//     </div>

//     {/* ----------------- */}
//     {/* HISTORY */}
//     {/* ----------------- */}
//     <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         History
//       </h3>

//       <div className="grid grid-cols-3 gap-2">
//         <ToolButton
//           icon="↩"
//           label="Undo"
//           onClick={() => mapRef.current?.undo()}
//           color="yellow"
//         />

//         <ToolButton
//           icon="🔁"
//           label="Redo"
//           onClick={() => mapRef.current?.redo()}
//           color="yellow"
//         />
       
//       </div>
//     </div>

//     {/* ----------------- */}
//     {/* CANVAS */}
//     {/* ----------------- */}
//     <div>
//       <h3 className="text-xs font-semibold text-gray-400 mb-2">
//         Canvas
//       </h3>

//       <div className="grid grid-cols-3 gap-2">
//         <ToolButton
//           icon="🧭"
//           label="Lock To Boundary"
//           onClick={() => mapRef.current?.lockToBoundary()}
//           color="blue"
//         />

//         <ToolButton
//           icon="🔓"
//           label="Unlock Map"
//           onClick={() => mapRef.current?.unlockCanvas()}
//           color="gray"
//         />

//         <ToolButton
//           icon="✖"
//           label="Exit Drawing"
//           onClick={() => setDrawingMode(null)}
//           color="red"
//         />

//         <ToolButton
//           icon="💾"
//           label="Save Layout"
//           onClick={() => mapRef.current?.captureLayoutImage()}
//           color="green"
//         />

//         <ToolButton
//           icon="🗑"
//           label="Delete Layout"
//           onClick={() => mapRef.current?.deleteLayoutImage()}
//           color="red"
//         />

//       </div>
//     </div>

//   </div>

// </div>
        

//       {/* MAP AREA */}
//       <div className="flex-1 relative">

//          {/* Active tool indicator — mobile only */}
//         <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 lg:hidden">
//           {drawingMode && (
//             <div className="bg-[#3E5F16] text-white text-xs px-4 py-1.5 rounded-full shadow-md">
//               {drawingType === "subplot" ? "📐 Drawing Plot" 
//               : drawingType === "road" ? "🛣 Drawing Road" 
//               : drawingType === "project-boundary" ? "🧱 Drawing Boundary"
//               : "✏ Drawing"}
//             </div>
//           )}
//         </div>
//         <ProjectMap
//         ref={mapRef}
//         projectId={projectId}
//           lat={project.latitude}   // Replace with project lat
//           lng={project.longitude}   // Replace with project lng
//           focusOnly={true}
//           drawingMode={drawingMode}
//             drawingType={drawingType}
//             onPlotSelect={(id) => setSelectedPlotId(id)} 
//              onOpenPlotPanel={(id) => setPanelPlotId(id)} 
//         />


//       </div>
//       {panelPlotId && (
//         <>
//           <div className="hidden lg:block absolute right-4 top-24 w-72 bg-white shadow-2xl rounded-2xl p-4 z-40 space-y-4">

//             <h3 className="font-semibold text-sm border-b pb-2">
//               Plot Configuration
//             </h3>

//             {(() => {
//               const plot = mapRef.current?.getPlot(panelPlotId);
//               if (!plot) return null;

//               return (
//                 <>
//                   {/* Plot Number */}
//                   <div>
//                     <label className="text-xs text-gray-500">Plot Number</label>
//                   <input
//                       value={plotNumberInput}
//                       onChange={(e) => setPlotNumberInput(e.target.value)}
//                       onBlur={() => {
//                         mapRef.current?.updatePlotField(panelPlotId, "plotNumber", plotNumberInput);
//                       }}
//                       className="border p-2 w-full rounded text-xs"
//                     />
//                   </div>

//                   {/* Area */}
//                   <div className="text-xs text-gray-600">
//                     Area: {plot.area?.toFixed(0)} sq.m
//                   </div>

//                   {/* Status */}
//                   <div>
//                     <label className="text-xs text-gray-500">Status</label>
//                     <select
//                       value={plot.status || ""}
//                       onChange={(e) =>
//                         mapRef.current?.updatePlotField(
//                           panelPlotId,
//                           "status",
//                           e.target.value
//                         )
//                       }
//                       className="border p-2 w-full rounded text-xs"
//                     >
//                       <option value="">Select</option>
//                         <option value="available">Available</option>
//                         <option value="booked">Booked</option>
//                         <option value="sold">Sold</option>
//                         <option value="on-hold">On Hold</option>
//                     </select>
//                   </div>

//                   {/* Facing */}
//                   <div>
//                     <label className="text-xs text-gray-500">Facing</label>
//                     <select
//                       value={plot.facing || ""}
//                       onChange={(e) =>
//                         mapRef.current?.updatePlotField(
//                           panelPlotId,
//                           "facing",
//                           e.target.value
//                         )
//                       }
//                       className="border p-2 w-full rounded text-xs"
//                     >
//                       <option value="">Select</option>
//                       <option value="north">North</option>
//                       <option value="south">South</option>
//                       <option value="east">East</option>
//                       <option value="west">West</option>
//                     </select>
//                   </div>

//                   {/* Buttons */}
//                   <div className="flex justify-between">
//                     <button
//                       onClick={() => setPanelPlotId(null)}
//                       className="text-gray-500 text-xs"
//                     >
//                       Cancel
//                     </button>

//                     <button
//                       onClick={() => {
//                         mapRef.current?.confirmPlot(panelPlotId);
//                         setPanelPlotId(null);
//                       }}
//                       className="bg-emerald-600 text-white px-4 py-1 rounded text-xs"
//                     >
//                       Confirm
//                     </button>
//                   </div>
//                 </>
//               );
//             })()}

//           </div>
//           {/* Mobile: bottom sheet */}
//           <div className="fixed inset-0 z-50 lg:hidden">
//             <div className="absolute inset-0 bg-black/35" onClick={() => setPanelPlotId(null)} />
//             <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 space-y-3">
//               <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
//               <h3 className="font-medium text-sm">Plot configuration</h3>
//               {/* ...same fields as desktop panel... */}
//             </div>
//           </div>
//         </>
//       )}
      
//     </div>


    
//   );
// }





'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import ProjectMap from '@/components/public/ProjectMap';
import { ApiError, patchPlotStatus, projectsApi, saveProjectLandmarks } from '@/lib/api';
import { Landmark, LayoutEntity, PlotStatus } from '@/types/project';
import { PLOT_STATUSES, PLOT_STATUS_LABELS, plotStatusFeedback, unitRangePrefill } from '@/lib/layoutTools.mjs';
import type { OverlayDraft } from '@/lib/layoutTools.mjs';
import { OverlayAlignPanel, overlayToDraft } from '@/components/layout-editor/OverlayAlignTool';
import type { ControlPoint } from '@/components/layout-editor/GeorefPanel';
import { useProjectPermissions } from '@/components/layout-editor/useProjectPermissions';
import { useUnsavedGuard } from '@/components/layout-editor/useUnsavedGuard';
import LinkUnitsDialog from '@/components/layout-editor/LinkUnitsDialog';
import GenerateUnitsDialog from '@/components/layout-editor/GenerateUnitsDialog';

type StatusFeedback = ReturnType<typeof plotStatusFeedback>;

// ─── ToolButton ─────────────────────────────────────────────────────────────
function ToolButton({
  icon,
  label,
  onClick,
  disabled = false,
  color = "gray",
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const colorStyles: Record<string, string> = {
    gray:   "bg-gray-100 hover:bg-gray-200",
    red:    "bg-red-100 hover:bg-red-200",
    yellow: "bg-yellow-100 hover:bg-yellow-200",
    blue:   "bg-blue-100 hover:bg-blue-200",
    green:  "bg-green-100 hover:bg-green-200",
    indigo: "bg-indigo-100 hover:bg-indigo-200",
    purple: "bg-purple-100 hover:bg-purple-200",
  };

  return (
    <div className="relative group hover:z-50">
      {/* aria-label: the button shows only an emoji and the hover tooltip is a
          sibling span, so screen readers announced these buttons with no name. */}
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
        className={`h-12 w-full rounded-xl text-lg transition flex items-center justify-center
          ${colorStyles[color] ?? colorStyles.gray} disabled:opacity-40`}
      >
        {icon}
      </button>
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2
        bg-black text-white text-xs px-3 py-1 rounded-md
        opacity-0 group-hover:opacity-100 transition
        whitespace-nowrap z-50 pointer-events-none">
        {label}
      </span>
    </div>
  );
}

// ─── MobileToolButton ────────────────────────────────────────────────────────
function MobileToolButton({
  label,
  onClick,
  disabled = false,
  color = "gray",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    green:  "bg-[#3E5F16] text-white border-transparent",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    blue:   "bg-blue-100 text-blue-800 border-blue-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
    red:    "bg-red-100 text-red-800 border-red-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray:   "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl py-3 px-1 text-[11px] font-medium border leading-tight
        ${colorMap[color] ?? colorMap.gray} disabled:opacity-40 active:scale-95 transition`}
    >
      {label}
    </button>
  );
}

// ─── PlotPanelFields ─────────────────────────────────────────────────────────
function PlotPanelFields({
  panelPlotId,
  plotNumberInput,
  setPlotNumberInput,
  mapRef,
  onCancel,
  onConfirm,
  statusOverride,
  statusPending,
  statusFeedback,
  onStatusChange,
  canEdit,
  canEditStatus,
}: {
  panelPlotId: string;
  // false = status-only or read-only: no number/facing edits, no Confirm (R8.12).
  canEdit: boolean;
  canEditStatus: boolean;
  plotNumberInput: string;
  setPlotNumberInput: (v: string) => void;
  mapRef: React.RefObject<any>;
  onCancel: () => void;
  onConfirm: () => void;
  // Status the server just returned. The panel reads the plot from the map
  // ref during render, which can lag one render behind the map's state.
  statusOverride?: PlotStatus;
  statusPending: boolean;
  statusFeedback: StatusFeedback | null;
  onStatusChange: (id: string, status: PlotStatus) => void;
}) {
  const plot = mapRef.current?.getPlot(panelPlotId);
  if (!plot) return null;
  const statusId = `plot-status-${panelPlotId}`;
  const hintId = `plot-status-hint-${panelPlotId}`;
  // The PATCH needs the plot on the server. An unconfirmed plot only exists in
  // this tab, and the full PUT no longer carries status (new plots are saved
  // as available), so the select waits for Confirm.
  const canSetStatus = plot.saved === true && canEditStatus;

  return (
    <>
      <div>
        <label className="text-xs text-gray-500">Plot Number</label>
        <input
          value={plotNumberInput}
          onChange={(e) => setPlotNumberInput(e.target.value)}
          readOnly={!canEdit}
          onBlur={() => {
            if (canEdit) mapRef.current?.updatePlotField(panelPlotId, "plotNumber", plotNumberInput);
          }}
          className="border p-2 w-full rounded text-xs mt-1"
        />
      </div>

      <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded">
        Area: {plot.area?.toFixed(0)} sq.m
      </div>

      <div>
        <label htmlFor={statusId} className="text-xs text-gray-500">Status</label>
        {/* Before: onChange edited the local array and the change rode on the
            next full PUT. The backend now ignores status on that PUT (it would
            overwrite a sale made from the app), so this saves immediately via
            PATCH /plots/:entityId/status and paints what the server returned. */}
        <select
          id={statusId}
          value={statusOverride ?? plot.status ?? "available"}
          disabled={!canSetStatus || statusPending}
          aria-describedby={hintId}
          aria-busy={statusPending}
          onChange={(e) => onStatusChange(panelPlotId, e.target.value as PlotStatus)}
          className="border p-2 w-full rounded text-xs mt-1 disabled:bg-gray-100 disabled:text-gray-500"
        >
          {PLOT_STATUSES.map((s) => (
            <option key={s} value={s}>{PLOT_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <div id={hintId} role="status" aria-live="polite" className="text-[11px] mt-1 min-h-[1rem]">
          {!canSetStatus ? (
            <span className="text-gray-500">Pehle Confirm karo, phir status badlo.</span>
          ) : statusPending ? (
            <span className="text-gray-500">Saving…</span>
          ) : statusFeedback ? (
            <span className={
              statusFeedback.kind === "error" ? "text-red-700"
                : statusFeedback.kind === "success" ? "text-green-700"
                : "text-gray-600"
            }>
              {statusFeedback.message}
            </span>
          ) : null}
        </div>
      </div>

      {canEdit && (<div>
        <label className="text-xs text-gray-500">Facing</label>
        <select
          value={plot.facing || ""}
          onChange={(e) =>
            mapRef.current?.updatePlotField(panelPlotId, "facing", e.target.value)
          }
          className="border p-2 w-full rounded text-xs mt-1"
        >
          <option value="">Select</option>
          <option value="north">North</option>
          <option value="south">South</option>
          <option value="east">East</option>
          <option value="west">West</option>
        </select>
      </div>)}

      <div className="flex justify-between pt-1">
        <button onClick={onCancel} className="text-gray-500 text-xs min-h-[44px] min-w-[44px]">{canEdit ? 'Cancel' : 'Close'}</button>
        {canEdit && (
        <button
          onClick={onConfirm}
          className="bg-emerald-600 text-white px-4 py-1 rounded text-xs"
        >
          Confirm
        </button>
        )}
      </div>
    </>
  );
}

// ─── Tab types ───────────────────────────────────────────────────────────────
type TabType = "Boundary" | "Roads" | "Plots" | "Open Space" | "Grid" | "Overlay" | "Units" | "History" | "Canvas" | "Landmarks";
const TABS: TabType[] = ["Boundary", "Roads", "Plots", "Open Space", "Grid", "Overlay", "Units", "History", "Canvas", "Landmarks"];

// ─── Page ────────────────────────────────────────────────────────────────────
export default function LayoutEditorPage() {
  const mapRef    = useRef<any>(null);
  const params    = useParams<{ id: string }>();
  const projectId = params.id;

  const [project,           setProject]           = useState<any>(null);
  const [landmarks,         setLandmarks]         = useState<Landmark[]>([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState<Landmark[]>([]);
  const [filteredLandmarks, setFilteredLandmarks] = useState<Landmark[]>([]);
  const [search,            setSearch]            = useState("");
  const [panelPlotId,       setPanelPlotId]       = useState<string | null>(null);
  const [plotNumberInput,   setPlotNumberInput]   = useState("");
  const [selectedPlotId,    setSelectedPlotId]    = useState<string | null>(null);
  const [activeTab,         setActiveTab]         = useState<TabType>("Boundary");
  const [sheetExpanded,     setSheetExpanded]     = useState(false);

  const [drawingMode, setDrawingMode] =
    useState<'polygon' | 'rectangle' | 'circle' | 'polyline' | 'marker' | null>(null);
  const [drawingType, setDrawingType] =
    useState<"project-boundary" | "subplot" | "road" | "ai-boundary" | "open-space" | undefined>("project-boundary");

  // ── plot status (PATCH) ──
  const [statusOverrides, setStatusOverrides] = useState<Record<string, PlotStatus>>({});
  const [statusPending,   setStatusPending]   = useState(false);
  const [statusFeedback,  setStatusFeedback]  = useState<StatusFeedback | null>(null);

  // ── overlay align tool ──
  const [overlayDraft,      setOverlayDraft]      = useState<OverlayDraft | null>(null);
  const [overlaySaved,      setOverlaySaved]      = useState<OverlayDraft | null>(null);
  const [overlayEditing,    setOverlayEditing]    = useState(false);
  const [overlayLockAspect, setOverlayLockAspect] = useState(true);
  const [overlayLocked,     setOverlayLocked]     = useState(false);
  const [overlayDirty,      setOverlayDirty]      = useState(false);
  const [overlayCps,        setOverlayCps]        = useState<ControlPoint[]>([]);
  const [mapPickMode,       setMapPickMode]       = useState(false);
  const [mapClick,          setMapClick]          = useState<{ lat: number; lng: number; n: number } | null>(null);
  const [markerMove,        setMarkerMove]        = useState<{ index: number; lat: number; lng: number; n: number } | null>(null);
  const perms = useProjectPermissions(project);
  useUnsavedGuard(overlayDirty);

  // ── units dialogs ──
  const [linkOpen,       setLinkOpen]       = useState(false);
  const [generatePrefill, setGeneratePrefill] = useState<ReturnType<typeof unitRangePrefill> | null>(null);

  // ── load project ──
  // Bumped by 'Reload' after a 409 LAYOUT_STALE so the page re-reads the project, its layoutVersion and its overlay.
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!projectId) return;
    (async () => {
      const data = await projectsApi.getById(projectId);
      setProject(data);
      const savedLandmarks = data.landmarks || [];
      setSelectedLandmarks(savedLandmarks);
      mapRef.current?.setSelectedLandmarks(savedLandmarks);
      const savedOverlay = overlayToDraft(data.layoutOverlay);
      setOverlaySaved(savedOverlay);
      setOverlayDraft(savedOverlay);
      setOverlayCps(savedOverlay?.controlPoints ?? []);
    })();
  }, [projectId, reloadKey]);

  const closePlotPanel = () => {
    setPanelPlotId(null);
    setStatusFeedback(null);
    setStatusOverrides({});
  };

  const handlePlotStatusChange = async (id: string, status: PlotStatus) => {
    const plot = mapRef.current?.getPlot(id) as LayoutEntity | undefined;
    setStatusPending(true);
    setStatusFeedback(null);
    try {
      const r = await patchPlotStatus(projectId, id, status);
      const saved = (r.plot?.status ?? status) as PlotStatus;
      mapRef.current?.setPlotStatusLocal(id, saved);
      setStatusOverrides((o) => ({ ...o, [id]: saved }));
      setStatusFeedback(plotStatusFeedback({
        ok: true,
        changed: r.changed,
        plotNumber: r.plot?.plotNumber ?? plot?.plotNumber,
        status: saved,
      }));
      setStatusPending(false);
    } catch (err) {
      setStatusPending(false);
      const fb = plotStatusFeedback({
        ok: false,
        httpStatus: err instanceof ApiError ? err.status : 0,
        serverMessage: err instanceof Error ? err.message : null,
        plotNumber: plot?.plotNumber,
      });
      setStatusFeedback(fb);
      // The select is controlled by the map's (unchanged) status, so on error
      // it snaps back by itself; 404/409 also refresh from the server.
      if (fb.reload) {
        setStatusOverrides({});
        await mapRef.current?.reloadEntities();
      }
    }
  };

  const getOverlayPlacementHints = useCallback(() => {
    const entities = (mapRef.current?.getEntities?.() || []) as LayoutEntity[];
    const boundary = entities.find((e) => e.type === "project-boundary" && !e.deleted);
    const lat = Number(project?.latitude);
    const lng = Number(project?.longitude);
    return {
      boundaryPath: boundary?.path ?? null,
      fallbackCenter: Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null,
      mapCenter: (mapRef.current?.getMapCenter?.() ?? null) as { lat: number; lng: number } | null,
    };
  }, [project]);

  const openGenerateUnits = () => {
    setGeneratePrefill(unitRangePrefill((mapRef.current?.getEntities?.() || []) as LayoutEntity[]));
  };

  // link/generate apply changed plot statuses and unitIds on the server.
  const reloadAfterUnits = () => {
    void mapRef.current?.reloadEntities();
  };

  // ── landmark search ──
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setLandmarkSearch?.(search);
    setFilteredLandmarks(mapRef.current?.getFilteredLandmarks?.() || []);
  }, [search, landmarks]);

  // ── sync plot number when panel opens ──
  useEffect(() => {
    if (panelPlotId) {
      const plot = mapRef.current?.getPlot(panelPlotId);
      setPlotNumberInput(plot?.plotNumber || "");
    }
  }, [panelPlotId]);

  const handleConfirmPlot = () => {
    if (!panelPlotId) return;
    mapRef.current?.confirmPlot(panelPlotId);
    closePlotPanel();
  };

  const handleFetchLandmarks = () => {
    mapRef.current?.fetchLandmarks();
    setTimeout(() => {
      setLandmarks(mapRef.current?.getAvailableLandmarks() || []);
    }, 800);
  };

  const handleSaveLandmarks = async () => {
    try {
      const toSave = mapRef.current?.getSelectedLandmarks() || selectedLandmarks;
      await saveProjectLandmarks(projectId, toSave);
      alert("Saved successfully");
    } catch (err: any) {
      alert(err.message || "Failed to save landmarks");
    }
  };

  if (!project) return <div>Loading...</div>;

  // Shared by the desktop sidebar and the mobile sheet.
  function renderOverlayPanel() {
    return (
      <OverlayAlignPanel
        projectId={projectId}
        draft={overlayDraft}
        savedDraft={overlaySaved}
        editing={overlayEditing}
        lockAspect={overlayLockAspect}
        locked={overlayLocked}
        access={perms.access}
        layoutVersion={perms.layoutVersion}
        onLockedChange={setOverlayLocked}
        onLayoutVersion={perms.setLayoutVersion}
        onReload={() => { setOverlayEditing(false); setReloadKey((k) => k + 1); }}
        onAccessLost={perms.loseAccess}
        onDirtyChange={setOverlayDirty}
        onControlPointsChange={setOverlayCps}
        mapClick={mapClick}
        markerMove={markerMove}
        onMapPickModeChange={setMapPickMode}
        onDraftChange={setOverlayDraft}
        onEditingChange={(v) => {
          setOverlayEditing(v);
          // Drawing clicks and overlay drags fight over the same pointer.
          if (v) setDrawingMode(null);
        }}
        onLockAspectChange={setOverlayLockAspect}
        onSaved={(saved) => { setOverlaySaved(saved); setOverlayDraft(saved); }}
        getPlacementHints={getOverlayPlacementHints}
      />
    );
  }

  function renderUnitsButtons() {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setLinkOpen(true)}
          className="w-full border border-orange-200 bg-orange-50 text-orange-800 py-2 rounded-lg text-xs font-medium hover:bg-orange-100"
        >
          🔗 Link plots ↔ units
        </button>
        <button
          type="button"
          onClick={openGenerateUnits}
          className="w-full border border-orange-200 bg-orange-50 text-orange-800 py-2 rounded-lg text-xs font-medium hover:bg-orange-100"
        >
          ⚙ Generate units from plots
        </button>
        <p className="text-[11px] text-gray-500">
          Sirf Confirm kiye hue plots count hote hain. Pehle unsaved changes save karo.
        </p>
      </div>
    );
  }

  // ─── Mobile tab content ──────────────────────────────────────────────────
  function renderMobileTabContent(tab: TabType) {
    switch (tab) {

      case "Boundary":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton label="Draw Boundary" color="indigo"  onClick={() => { setDrawingType("project-boundary"); setDrawingMode('polygon'); }} />
            <MobileToolButton label="Save Boundary" color="purple"  onClick={() => mapRef.current?.saveBoundary(projectId)} />
            <MobileToolButton label="Edit Boundary" color="blue"   onClick={() => mapRef.current?.editBoundary()} />
          </div>
        );

      case "Roads":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton  label="Draw Road"      color="gray" onClick={() => { setDrawingType("road"); setDrawingMode('polygon'); }} />
            <MobileToolButton  label="Rectangle Road" color="gray" onClick={() => { setDrawingType("road"); setDrawingMode('rectangle'); }} />
          </div>
        );

      case "Plots":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton label="Draw Plot"      color="purple" onClick={() => { setDrawingType("subplot"); setDrawingMode('polygon'); }} />
            <MobileToolButton  label="Rect Plot"      color="purple" onClick={() => { setDrawingType("subplot"); setDrawingMode('rectangle'); }} />
            <MobileToolButton label="Edit Plot"      color="blue"   disabled={!panelPlotId} onClick={() => panelPlotId && mapRef.current?.editPlot(panelPlotId)} />
            <MobileToolButton label="Save Plot"      color="purple"  onClick={() => mapRef.current?.openLastUnsavedPlot()} />
            <MobileToolButton label="Delete Plot"    color="red"    onClick={() => mapRef.current?.deleteSelectedPlot()} />
          </div>
        );

      case "Open Space":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton label="Draw Open Space" color="green" onClick={() => { setDrawingType("open-space"); setDrawingMode('polygon'); }} />
            <MobileToolButton label="Rect Open Space" color="green" onClick={() => { setDrawingType("open-space"); setDrawingMode('rectangle'); }} />
          </div>
        );

      case "Overlay":
        return renderOverlayPanel();

      case "Units":
        return renderUnitsButtons();

      case "Grid":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton  label="Draw AI Boundary"   color="purple" onClick={() => { mapRef.current?.toggleAiEditMode(false); setDrawingType("ai-boundary"); setDrawingMode('polygon'); }} />
            <MobileToolButton label="Generate AI Layout" color="blue"  onClick={() => mapRef.current?.generateAILayout()} />
            <MobileToolButton label="Edit AI Layout"     color="purple"   onClick={() => mapRef.current?.toggleAiEditMode(true)} />
            <MobileToolButton label="Save AI Layout"     color="blue"  onClick={() => { mapRef.current?.saveAiLayout(); setDrawingMode(null); setDrawingType(undefined); }} />
          </div>
        );

      case "History":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton  label="Undo" color="yellow" onClick={() => mapRef.current?.undo()} />
            <MobileToolButton label="Redo" color="yellow" onClick={() => mapRef.current?.redo()} />
          </div>
        );

      case "Canvas":
        return (
          <div className="grid grid-cols-3 gap-2">
            <MobileToolButton  label="Lock Boundary" color="blue"  onClick={() => mapRef.current?.lockToBoundary()} />
            <MobileToolButton  label="Unlock Map"    color="gray"  onClick={() => mapRef.current?.unlockCanvas()} />
            <MobileToolButton label="Exit Drawing"  color="red"   onClick={() => setDrawingMode(null)} />
            <MobileToolButton label="Save Layout"   color="purple" onClick={() => mapRef.current?.captureLayoutImage()} />
            <MobileToolButton label="Delete Layout" color="red"   onClick={() => mapRef.current?.deleteLayoutImage()} />
          </div>
        );

      case "Landmarks":
        return (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleFetchLandmarks}
              className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs font-medium"
            >
              📍 Fetch Nearby Landmarks
            </button>
            {landmarks.length > 0 && (
              <div className="border rounded-lg p-2 bg-gray-50">
                <input
                  type="text"
                  placeholder="Search landmarks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full mb-2 px-2 py-1.5 border rounded text-xs outline-none"
                />
                <div className="max-h-36 overflow-y-auto divide-y">
                  {(filteredLandmarks.length ? filteredLandmarks : landmarks).map((lm) => (
                    <div key={lm.placeId} className="flex items-center justify-between text-xs py-1.5">
                      <span className="truncate pr-2">{lm.name}</span>
                      <input
                        type="checkbox"
                        checked={!!selectedLandmarks?.some((l) => l.placeId === lm.placeId)}
                        onChange={() => {
                          const updated = mapRef.current?.toggleLandmarkSelection(lm) || [];
                          setSelectedLandmarks(updated);
                        }}
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSaveLandmarks}
                  className="mt-2 w-full bg-emerald-600 text-white py-1.5 rounded text-xs font-medium"
                >
                  Save Selected Landmarks
                </button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="flex h-screen w-full bg-gray-100">

      {/* ── Mobile top bar ── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex justify-between items-center lg:hidden">
        <div className="bg-white rounded-xl px-3 py-1.5 text-xs font-medium shadow-sm border border-gray-200">
          {project.name || "Layout Editor"}
        </div>
        <button
          onClick={() => setDrawingMode(null)}
          className="bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-sm border border-gray-200 text-sm"
        >
          ✕
        </button>
      </div>

      {/* ── Active tool pill (mobile) ── */}
      {drawingMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 lg:hidden pointer-events-none">
          <div className="bg-[#3E5F16] text-white text-xs px-4 py-1.5 rounded-full shadow-md">
            {drawingType === "subplot"            ? "📐 Drawing Plot"
             : drawingType === "road"             ? "🛣 Drawing Road"
             : drawingType === "project-boundary" ? "🧱 Drawing Boundary"
             : drawingType === "ai-boundary"      ? "🟣 AI Boundary"
             : drawingType === "open-space"       ? "🌳 Drawing Open Space"
             : "✏ Drawing"}
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet ── */}
      {perms.canEdit && (
      <div
        className={`fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-2xl border-t border-gray-200 lg:hidden transition-all duration-300 ${
          sheetExpanded ? "max-h-[70vh]" : "max-h-[200px]"
        } flex flex-col`}
      >
        {/* Drag handle — tap to expand/collapse */}
        <button
          onClick={() => setSheetExpanded((v) => !v)}
          className="w-full flex flex-col items-center pt-2 pb-1 shrink-0"
        >
          <div className="w-9 h-1 bg-gray-300 rounded-full" />
        </button>

        {/* Horizontally scrollable tab row */}
        <div className="flex gap-1.5 px-3 mb-2 shrink-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSheetExpanded(true); }}
              className={`shrink-0 text-[10px] font-medium px-3 py-1.5 rounded-lg transition ${
                activeTab === tab
                  ? "bg-[#3E5F16] text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Scrollable tool content */}
        <div className="overflow-y-auto px-3 pb-6 flex-1">
          {renderMobileTabContent(activeTab)}
        </div>
      </div>
      )}

      {/* ── Desktop left sidebar ── */}
      {!perms.canEdit && (
        <div role="note" className="hidden lg:flex w-80 bg-white shadow-xl p-4 z-30 flex-col gap-3 text-sm text-gray-700">
          <h2 className="font-bold text-gray-600">LAYOUT</h2>
          <p>{perms.access === 'status-only' ? 'You can change plot status. Select a plot on the map.' : 'View only. You do not have permission to edit this layout.'}</p>
        </div>
      )}
      {perms.canEdit && (
      <div className="hidden lg:flex w-80 bg-white shadow-xl p-4 z-30 flex-col gap-6 overflow-y-auto">

        <div>
          <h2 className="text-m font-bold text-gray-500 mb-3 text-center">SAVE LANDMARKS</h2>
          <button
            onClick={handleFetchLandmarks}
            className="w-full bg-emerald-600 text-white py-2 rounded-lg text-xs mb-3"
          >
            📍 Fetch Nearby
          </button>
          {landmarks.length > 0 && (
            <div className="border rounded-lg p-2 bg-gray-50">
              <input
                type="text"
                placeholder="Search landmarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full mb-2 px-2 py-1 border rounded text-xs outline-none"
              />
              <div className="max-h-60 overflow-y-auto">
                {(filteredLandmarks.length ? filteredLandmarks : landmarks).map((lm) => (
                  <div key={lm.placeId} className="flex items-center justify-between text-xs py-1 border-b">
                    <span className="truncate">{lm.name}</span>
                    <input
                      type="checkbox"
                      checked={!!selectedLandmarks?.some((l) => l.placeId === lm.placeId)}
                      onChange={() => {
                        const updated = mapRef.current?.toggleLandmarkSelection(lm) || [];
                        setSelectedLandmarks(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleSaveLandmarks}
                className="mt-2 w-full bg-emerald-600 text-white py-1 rounded text-xs"
              >
                Save Landmarks
              </button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-bold text-gray-600 text-center">LAYOUT EDITOR</h2>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Project Boundary</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="🧱" label="Draw Boundary" color="indigo" onClick={() => { setDrawingType("project-boundary"); setDrawingMode('polygon'); }} />
              <ToolButton icon="💾" label="Save Boundary" color="green"  onClick={() => mapRef.current?.saveBoundary(projectId)} />
              <ToolButton icon="🧩" label="Edit Boundary" color="blue"   onClick={() => mapRef.current?.editBoundary()} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Roads</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="🛣"  label="Draw Road"      color="gray" onClick={() => { setDrawingType("road"); setDrawingMode('polygon'); }} />
              <ToolButton icon="⬛" label="Rectangle Road" color="gray" onClick={() => { setDrawingType("road"); setDrawingMode('rectangle'); }} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Plots</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="📐" label="Draw Plot"      color="purple" onClick={() => { setDrawingType("subplot"); setDrawingMode('polygon'); }} />
              <ToolButton icon="⬛" label="Rectangle Plot" color="purple" onClick={() => { setDrawingType("subplot"); setDrawingMode('rectangle'); }} />
              <ToolButton icon="✏"  label="Edit Plot"      color="blue"   disabled={!panelPlotId} onClick={() => panelPlotId && mapRef.current?.editPlot(panelPlotId)} />
              <ToolButton icon="💾" label="Save Plot"      color="green"  onClick={() => mapRef.current?.openLastUnsavedPlot()} />
              <ToolButton icon="🗑" label="Delete Plot"    color="red"    onClick={() => mapRef.current?.deleteSelectedPlot()} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Open Spaces</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="🌳" label="Draw Open Space"      color="green" onClick={() => { setDrawingType("open-space"); setDrawingMode('polygon'); }} />
              <ToolButton icon="⬛" label="Rectangle Open Space" color="green" onClick={() => { setDrawingType("open-space"); setDrawingMode('rectangle'); }} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">AI Generated Plots</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="🟣"  label="Draw AI Boundary"   color="purple" onClick={() => { mapRef.current?.toggleAiEditMode(false); setDrawingType("ai-boundary"); setDrawingMode('polygon'); }} />
              <ToolButton icon="⚡"  label="Generate AI Layout" color="green"  onClick={() => mapRef.current?.generateAILayout()} />
              <ToolButton icon="✏️" label="Edit AI Layout"     color="blue"   onClick={() => mapRef.current?.toggleAiEditMode(true)} />
              <ToolButton icon="💾"  label="Save AI Layout"     color="green"  onClick={() => { mapRef.current?.saveAiLayout(); setDrawingMode(null); setDrawingType(undefined); }} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">History</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="↩"  label="Undo" color="yellow" onClick={() => mapRef.current?.undo()} />
              <ToolButton icon="🔁" label="Redo" color="yellow" onClick={() => mapRef.current?.redo()} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Canvas</h3>
            <div className="grid grid-cols-3 gap-2">
              <ToolButton icon="🧭" label="Lock To Boundary" color="blue"  onClick={() => mapRef.current?.lockToBoundary()} />
              <ToolButton icon="🔓" label="Unlock Map"       color="gray"  onClick={() => mapRef.current?.unlockCanvas()} />
              <ToolButton icon="✖"  label="Exit Drawing"     color="red"   onClick={() => setDrawingMode(null)} />
              <ToolButton icon="💾" label="Save Layout"      color="green" onClick={() => mapRef.current?.captureLayoutImage()} />
              <ToolButton icon="🗑" label="Delete Layout"    color="red"   onClick={() => mapRef.current?.deleteLayoutImage()} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Layout Overlay</h3>
            {renderOverlayPanel()}
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Units</h3>
            {renderUnitsButtons()}
          </div>
        </div>
      </div>
      )}

      {/* ── Map area ── */}
      <div className="flex-1 relative">
        <div className="h-full pb-[220px] lg:pb-0">
          <ProjectMap
            ref={mapRef}
            projectId={projectId}
            lat={project.latitude}
            lng={project.longitude}
            focusOnly={true}
            drawingMode={perms.canEdit ? drawingMode : null}
            drawingType={drawingType}
            onPlotSelect={(id) => setSelectedPlotId(id)}
            onOpenPlotPanel={(id) => {
              setPanelPlotId(id);
              setStatusFeedback(null);
              setStatusOverrides({});
            }}
            overlay={overlayDraft}
            // While a draw tool is active the overlay must not swallow the
            // clicks that place points on top of it.
            overlayEditable={overlayEditing && !drawingMode}
            overlayLockAspect={overlayLockAspect}
            onOverlayChange={setOverlayDraft}
            overlayLocked={overlayLocked}
            overlayControlPoints={overlayCps}
            onOverlayControlPointMove={(index, geo) => setMarkerMove((m) => ({ index, ...geo, n: (m?.n ?? 0) + 1 }))}
            mapPickMode={mapPickMode}
            onMapPick={(geo) => setMapClick((m) => ({ ...geo, n: (m?.n ?? 0) + 1 }))}
            layoutVersion={perms.layoutVersion}
            onLayoutVersion={perms.setLayoutVersion}
          />
        </div>
      </div>

      {linkOpen && (
        <LinkUnitsDialog
          projectId={projectId}
          onClose={() => setLinkOpen(false)}
          onApplied={reloadAfterUnits}
        />
      )}
      {generatePrefill && (
        <GenerateUnitsDialog
          projectId={projectId}
          prefill={generatePrefill}
          onClose={() => setGeneratePrefill(null)}
          onApplied={reloadAfterUnits}
        />
      )}

      {/* ── Plot config panel ── */}
      {panelPlotId && (
        <>
          {/* Desktop */}
          <div className="hidden lg:block absolute right-4 top-24 w-72 bg-white shadow-2xl rounded-2xl p-4 z-40 space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2">Plot Configuration</h3>
            <PlotPanelFields
              panelPlotId={panelPlotId}
              plotNumberInput={plotNumberInput}
              setPlotNumberInput={setPlotNumberInput}
              mapRef={mapRef}
              onCancel={closePlotPanel}
              onConfirm={handleConfirmPlot}
              statusOverride={statusOverrides[panelPlotId]}
              statusPending={statusPending}
              statusFeedback={statusFeedback}
              onStatusChange={handlePlotStatusChange}
              canEdit={perms.canEdit}
              canEditStatus={perms.canEditStatus}
            />
          </div>

          {/* Mobile */}
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/35" onClick={closePlotPanel} />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-4 pb-8 space-y-3">
              <div className="w-9 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
              <h3 className="font-medium text-sm">Plot configuration</h3>
              <PlotPanelFields
                panelPlotId={panelPlotId}
                plotNumberInput={plotNumberInput}
                setPlotNumberInput={setPlotNumberInput}
                mapRef={mapRef}
                onCancel={closePlotPanel}
                onConfirm={handleConfirmPlot}
                statusOverride={statusOverrides[panelPlotId]}
                statusPending={statusPending}
                statusFeedback={statusFeedback}
                onStatusChange={handlePlotStatusChange}
                canEdit={perms.canEdit}
                canEditStatus={perms.canEditStatus}
              />
            </div>
          </div>
        </>
      )}

    </div>
  );
}