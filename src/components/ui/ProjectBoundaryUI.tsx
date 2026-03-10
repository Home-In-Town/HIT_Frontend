'use client';

import { OverlayView } from '@react-google-maps/api';

type Props = {
  show: boolean;
  boundaryTopLeft: google.maps.LatLngLiteral | null;
  boundaryBottom: google.maps.LatLngLiteral | null;
  focusedProject: any;
};

export default function ProjectBoundaryUI({
  show,
  boundaryTopLeft,
  boundaryBottom,
  focusedProject,
}: Props) {
  if (!show) return null;

  return (
    <>
      {/* Plot Status Legend */}
      {boundaryTopLeft && (
        <OverlayView
          position={boundaryTopLeft}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            style={{ transform: "translate(-10%, -110%)" }}
            className="bg-white/95 backdrop-blur w-[100px] shadow-lg border border-gray-200 rounded-xl p-3 text-xs"
          >
            <div className="font-semibold text-gray-700 mb-2">
              Plot Status
            </div>

            <div className="flex flex-col gap-1.5">

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
                <span>Available</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-yellow-500"></div>
                <span>On Hold</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                <span>Booked</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <span>Sold</span>
              </div>

            </div>
          </div>
        </OverlayView>
      )}

      {/* Project Card */}
      {boundaryBottom && (
        <OverlayView
          position={boundaryBottom}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
        >
          <div
            style={{ transform: "translate(-50%, 20px)" }}
            className="w-[260px] bg-white shadow-xl border overflow-hidden"
          >
            <div className="h-[120px] w-full bg-gray-200">
              {focusedProject?.coverImage && (
                <img
                  src={
                    typeof focusedProject.coverImage === "object"
                      ? focusedProject.coverImage.url
                      : focusedProject.coverImage
                  }
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="p-3">
              <div className="text-sm text-center font-semibold text-gray-800">
                {focusedProject?.builderName || "Builder Name"}
              </div>

              <div className="text-xs text-center text-gray-500 mt-1">
                {focusedProject?.city || "Builder Address"}
              </div>
            </div>
          </div>
        </OverlayView>
      )}
    </>
  );
}