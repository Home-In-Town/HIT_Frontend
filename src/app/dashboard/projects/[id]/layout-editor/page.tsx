'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ProjectMap from '@/components/public/ProjectMap';
import { projectsApi, saveProjectLandmarks } from '@/lib/api';
import { Landmark } from '@/types/project';

export default function LayoutEditorPage() {
  const mapRef = useRef<any>(null);
  const params = useParams<{ id: string }>();
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [selectedLandmarks, setSelectedLandmarks] = useState<Landmark[]>([]);
  const [panelPlotId, setPanelPlotId] = useState<string | null>(null);
  const projectId = params.id;

  const [project, setProject] = useState<any>(null);

  const [drawingMode, setDrawingMode] =
    useState<google.maps.drawing.OverlayType | null>(null);

  const [drawingType, setDrawingType] =
    useState<"project-boundary" | "subplot" | "road">("project-boundary");
    const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
 useEffect(() => {
  if (!projectId) return;

  (async () => {
    const data = await projectsApi.getById(projectId);
    setProject(data);

    // ✅ Get landmarks directly from project
    const savedLandmarks = data.landmarks || [];

    setSelectedLandmarks(savedLandmarks);

    // Sync with map
    if (mapRef.current) {
      mapRef.current.setSelectedLandmarks(savedLandmarks);
    }
  })();
}, [projectId]);

  if (!project) return <div>Loading...</div>;
 
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
    gray: "bg-gray-100 hover:bg-gray-600",
    red: "bg-red-100 hover:bg-red-600",
    yellow: "bg-yellow-100 hover:bg-yellow-500",
    blue: "bg-blue-100 hover:bg-blue-600",
    green: "bg-green-100 hover:bg-green-600",
    indigo: "bg-indigo-100 hover:bg-indigo-600",
    purple: "bg-purple-100 hover:bg-purple-600",
  };

  return (
    <div className="relative group hover:z-50">
      <button
        disabled={disabled}
        onClick={onClick}
        className={`h-12 w-full rounded-xl text-lg transition flex items-center justify-center 
        ${colorStyles[color]} hover:text-white disabled:opacity-40`}
      >
        {icon}
      </button>

      <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-50 pointer-events-none">
        {label}
      </span>
    </div>
  );
}
  return (
    <div className="flex h-screen w-full bg-gray-100">
        {/* LEFT TOOLBAR */}
        <div className="w-44 bg-white shadow-xl p-4 z-30 flex flex-col">

        <h2 className="text-xs font-bold text-gray-500 mb-4 text-center">
            DRAW TOOLS
        </h2>

        {/* GRID BUTTON AREA */}
        <div className="grid grid-cols-2 gap-3">

            {/* Draw Boundary */}
            <ToolButton
            icon="🧱"
            label="Draw Boundary"
            onClick={() => {
                setDrawingType("project-boundary");
                setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            }}
            />

            <ToolButton
            icon="💾"
            label="Save Boundary"
            onClick={() => mapRef.current?.saveBoundary(projectId)}
            />

            <ToolButton
            icon="📐"
            label="Draw Subplot"
            onClick={() => {
                setDrawingType("subplot");
                setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            }}
            />

            <ToolButton
            icon="🛣"
            label="Draw Road"
            onClick={() => {
                setDrawingType("road");
                setDrawingMode(google.maps.drawing.OverlayType.POLYLINE);
            }}
            />

            <ToolButton
            icon="✖"
            label="Exit Drawing"
            onClick={() => setDrawingMode(null)}
            color="red"
            />

            <ToolButton
            icon="↩"
            label="Undo"
            onClick={() => mapRef.current?.undoLastDrawing()}
            color="yellow"
            />

            <ToolButton
            icon="🔁"
            label="Redo"
            onClick={() => mapRef.current?.redo()}
            color="yellow"
            />

            {/* Plot Editing */}
            <ToolButton
            icon="✏"
            label="Edit Plot"
            disabled={!panelPlotId}
            onClick={() =>
                panelPlotId &&
                mapRef.current?.editPlot(panelPlotId)
            }
            color="blue"
            />

            <ToolButton
            icon="💾"
            label="Save Plot"
            disabled={false}
            onClick={() => {
            mapRef.current?.openLastUnsavedPlot();
            }}
            color="green"
            />

            <ToolButton
            icon="🧩"
            label="Edit Boundary"
            onClick={() => mapRef.current?.editBoundary()}
            color="indigo"
            />

            <ToolButton
            icon="📦"
            label="Save Boundary"
            onClick={() => mapRef.current?.saveBoundary()}
            color="purple"
            />

            <ToolButton
            icon="🧭"
            label="Lock To Boundary"
            onClick={() => mapRef.current?.lockToBoundary()}
            color="blue"
            />

            <ToolButton
            icon="🔓"
            label="Unlock Map"
            onClick={() => mapRef.current?.unlockCanvas()}
            color="gray"
            />
            <ToolButton
              icon="📍"
              label="Fetch Nearby"
              onClick={() => {
                mapRef.current?.fetchLandmarks();
                setTimeout(() => {
                  setLandmarks(mapRef.current?.getAvailableLandmarks() || []);
                }, 1000);
              }}
              color="green"
            />
        </div>
        </div>
        

      {/* MAP AREA */}
      <div className="flex-1 relative">

        <ProjectMap
        ref={mapRef}
        projectId={projectId}
          lat={project.latitude}   // Replace with project lat
          lng={project.longitude}   // Replace with project lng
          focusOnly={true}
          drawingMode={drawingMode}
            drawingType={drawingType}
            onPlotSelect={(id) => setSelectedPlotId(id)} 
             onOpenPlotPanel={(id) => setPanelPlotId(id)} 
        />

        {/* Top Header */}
        <div className="absolute top-4 right-24 z-20 bg-white shadow-xl rounded-xl px-6 py-3">
          <h1 className="font-semibold text-lg">
            Plot Layout Editor
          </h1>
          <p className="text-xs text-gray-500">
            Project ID: {projectId}
          </p>
        </div>

      </div>
      {panelPlotId && (
        <div className="absolute right-4 top-24 w-72 bg-white shadow-2xl rounded-2xl p-4 z-40 space-y-4">

          <h3 className="font-semibold text-sm border-b pb-2">
            Plot Configuration
          </h3>

          {(() => {
            const plot = mapRef.current?.getPlot(panelPlotId);
            if (!plot) return null;

            return (
              <>
                {/* Plot Number */}
                <div>
                  <label className="text-xs text-gray-500">Plot Number</label>
                  <input
                    value={plot.plotNumber || ""}
                    onChange={(e) =>
                      mapRef.current?.updatePlotField(
                        panelPlotId,
                        "plotNumber",
                        e.target.value
                      )
                    }
                    className="border p-2 w-full rounded text-xs"
                  />
                </div>

                {/* Area */}
                <div className="text-xs text-gray-600">
                  Area: {plot.area?.toFixed(0)} sq.m
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <select
                    value={plot.status || ""}
                    onChange={(e) =>
                      mapRef.current?.updatePlotField(
                        panelPlotId,
                        "status",
                        e.target.value
                      )
                    }
                    className="border p-2 w-full rounded text-xs"
                  >
                    <option value="">Select</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                </div>

                {/* Facing */}
                <div>
                  <label className="text-xs text-gray-500">Facing</label>
                  <select
                    value={plot.facing || ""}
                    onChange={(e) =>
                      mapRef.current?.updatePlotField(
                        panelPlotId,
                        "facing",
                        e.target.value
                      )
                    }
                    className="border p-2 w-full rounded text-xs"
                  >
                    <option value="">Select</option>
                    <option value="north">North</option>
                    <option value="south">South</option>
                    <option value="east">East</option>
                    <option value="west">West</option>
                  </select>
                </div>

                {/* Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => setPanelPlotId(null)}
                    className="text-gray-500 text-xs"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={() => {
                      mapRef.current?.confirmPlot(panelPlotId);
                      setPanelPlotId(null);
                    }}
                    className="bg-emerald-600 text-white px-4 py-1 rounded text-xs"
                  >
                    Confirm
                  </button>
                </div>
              </>
            );
          })()}

        </div>
      )}
      {landmarks.length > 0 && (
        <div className="absolute right-4 bottom-6 w-80 bg-white shadow-2xl rounded-2xl p-4 z-40 max-h-[400px] overflow-y-auto">

          <h3 className="font-semibold text-sm mb-3">
            Select Nearby Landmarks
          </h3>

          {landmarks.map((lm) => (
            <div
              key={lm.placeId}
              className="flex items-center justify-between text-xs py-1 border-b"
            >
              <span>{lm.name}</span>

              <input
                type="checkbox"
                onChange={() => {
                  mapRef.current?.toggleLandmarkSelection(lm);
                  setSelectedLandmarks(
                    mapRef.current?.getSelectedLandmarks() || []
                  );
                }}
              />
            </div>
          ))}

          <button
            onClick={async () => {
              try {
                const handleSaveLandmarks = async () => {
                try {
                  console.log("💾 Manual Save:", selectedLandmarks);
                  await saveProjectLandmarks(projectId, selectedLandmarks);
                  alert("Saved successfully");
                } catch (err) {
                  console.error(err);
                  alert("Save failed");
                }
              };
              handleSaveLandmarks();
              } catch (err: any) {
                console.error(err);
                alert(err.message || 'Failed to save landmarks');
              }
            }}
            className="mt-3 w-full bg-emerald-600 text-white py-2 rounded text-xs"
          >
            Save Selected Landmarks
          </button>
        </div>
      )}
    </div>
  );
}