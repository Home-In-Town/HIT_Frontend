//frontend\src\components\public\ProjectMap.tsx
'use client';

import {
  GoogleMap,
  Autocomplete,
  OverlayView,
  DirectionsRenderer,
  useJsApiLoader,
  Polygon,
  GroundOverlay,
  Polyline,
} from '@react-google-maps/api';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { projectsApi, saveProjectLandmarks } from '@/lib/api';
import { Landmark, Project } from '@/types/project';
import SearchFiltersPanel from "./SearchFiltersPanel";
import { DrawingManager } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import React from 'react';

type MapOverlay =
  | google.maps.Polygon
  | google.maps.Rectangle
  | google.maps.Circle
  | google.maps.Polyline;

type Props = {
  projectId:string;
  lat: number;
  lng: number;
  focusOnly?:boolean;
  drawingMode?: google.maps.drawing.OverlayType | null;
  drawingType?: MapEntityType;
  logo?: string;
  sqft?: string;
  bhk?: string;
  onMarkerClick?: () => void;
  onDrawerData?: (data: {
    projects: Project[];
    selectedId: string | null;
    open: boolean;
  }) => void;
  onPlotSelect?: (id: string) => void;
  onOpenPlotPanel?: (id: string) => void;
};
type MapEntityType = "project-boundary" | "subplot" | "road";

type PlotStatus = "available" | "sold" | "reserved";

type Facing = "north" | "south" | "east" | "west";

type MapEntity = {
  id: string;
  type: MapEntityType;
  geometryType: "polygon" | "polyline";
  path: google.maps.LatLngLiteral[];

  // plot specific
  status?: PlotStatus;
  plotNumber?: string;
  area?: number;
  facing?: Facing;

  // road specific
  roadName?: string;

  // control flags
  saved?: boolean;
};

const containerStyle = {
  width: '100%',
  height: '100%',
};


const ProjectMap = forwardRef(
  (
    {
      projectId,
      lat,
      lng,
      focusOnly,
      drawingMode,
      drawingType,
      logo,
      sqft,
      bhk,
      onMarkerClick,
      onDrawerData,
      onPlotSelect,
      onOpenPlotPanel,
    }: Props,
    ref
  ) => {
  // 🔹 Always run hooks first
  const mapRef = useRef<google.maps.Map | null>(null);
//   const getNeighborhoodIcon = (type: string) => {
//   switch (type) {
//     case 'hospital':
//       return 'https://maps.google.com/mapfiles/ms/icons/hospitals.png';
//     case 'school':
//       return 'https://maps.google.com/mapfiles/ms/icons/schools.png';
//     case 'supermarket':
//       return 'https://maps.google.com/mapfiles/ms/icons/shopping.png';
//     case 'park':
//       return 'https://maps.google.com/mapfiles/ms/icons/parks.png';
//     case 'restaurant':
//       return 'https://maps.google.com/mapfiles/ms/icons/restaurant.png';
//     default:
//       return 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png';
//   }
// };
const getNeighborhoodIcon = (type: string): google.maps.Icon => {
  const iconPaths: Record<string, string> = {
    hospital: "M10 2h4v6h6v4h-6v6h-4v-6H4V8h6z",
    school: "M12 2L2 7l10 5 10-5-10-5zm0 7L2 4v10l10 5 10-5V4l-10 5z",
    university: "M2 10l10-5 10 5-10 5-10-5zm0 4l10 5 10-5",
    shopping_mall: "M4 6h16l-2 12H6L4 6zm4-3h8v3H8V3z",
    restaurant: "M6 2v8M10 2v8M6 6h4M14 2v16",
    park: "M12 2C8 2 6 6 6 8c0 2 2 4 6 4s6-2 6-4c0-2-2-6-6-6zm0 10v10",
    subway_station: "M6 2h12v12H6zM8 16l-2 4m10-4l2 4",
  };

  const path = iconPaths[type] || iconPaths.park;

  const svg = `
    <svg width="28" height="40" viewBox="0 0 48 64"
         xmlns="http://www.w3.org/2000/svg">

      <!-- pin -->
      <path d="
        M24 2
        C12 2 4 10 4 22
        C4 36 24 62 24 62
        C24 62 44 36 44 22
        C44 10 36 2 24 2
        Z"
        fill="#000000"
        stroke="white"
        stroke-width="2"
      />

      <!-- white circle -->
      <circle cx="24" cy="22" r="11" fill="white"/>

      <!-- black icon -->
      <path d="${path}"
            transform="translate(14,12) scale(1)"
            fill="#000000"/>
    </svg>
  `;

  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(28, 40),
    anchor: new google.maps.Point(14, 40),
  };
};

const clearNeighborhoodMarkers = () => {
  neighborhoodMarkersRef.current.forEach(m => m.setMap(null));
  neighborhoodMarkersRef.current = [];
};

const categoryMap: Record<string, string> = {
  hospital: "hospital",
  market: "shopping_mall",
  restaurant: "restaurant",
  metro: "subway_station",
  school: "school",
};

const [history, setHistory] = useState<MapEntity[][]>([]);
const [redoStack, setRedoStack] = useState<MapEntity[][]>([]);
const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
const [currentDrawingType, setCurrentDrawingType] =
  useState<MapEntityType>("project-boundary");
const [mapEntities, setMapEntities] = useState<MapEntity[]>([]);
const selectedPlot =
  mapEntities.find(e => e.id === editingPlotId);
  const openPlotStatusEditor = (id: string) => {
  setEditingPlotId(id);
};

const updatePlotStatus = (status: PlotStatus) => {
  if (!editingPlotId) return;

  updateEntities(
    mapEntities.map(p =>
      p.id === editingPlotId ? { ...p, status } : p
    )
  );

  setEditingPlotId(null);
}
const router = useRouter();
const [availableLandmarks, setAvailableLandmarks] = useState<Landmark[]>([]);
const [selectedLandmarks, setSelectedLandmarksState] = useState<Landmark[]>([]);
useEffect(() => {
  console.log("🎯 SELECTED LANDMARKS STATE UPDATED:", selectedLandmarks);
}, [selectedLandmarks]);
const landmarkMarkersRef = useRef<google.maps.Marker[]>([]);
const [layoutBounds, setLayoutBounds] = useState<any>(null);
const sourceIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'; // big map pin
const destinationIcon = 'https://maps.google.com/mapfiles/ms/icons/red-flag.png'; // flag

  const [neighborhoodType, setNeighborhoodType] = useState<string | null>(null);
  const neighborhoodMarkersRef = useRef<google.maps.Marker[]>([]);
const clientMarkerRef = useRef<google.maps.Marker | null>(null);
const projectMarkerRef = useRef<google.maps.Marker | null>(null);
const routePolylineRef = useRef<google.maps.Polyline | null>(null);
const [drawMenuOpen, setDrawMenuOpen] = useState(false);

  const drawingsRef = useRef<MapOverlay[]>([]);
const selectedShapeRef = useRef<MapOverlay | null>(null);

  const clearSelection = () => {
  if (selectedShapeRef.current) {
    selectedShapeRef.current.setEditable(false);
    selectedShapeRef.current = null;
  }
};

const setSelection = (shape: any) => {
  clearSelection();
  selectedShapeRef.current = shape;
  shape.setEditable(true);
};
const deleteSelectedShape = () => {
  if (!selectedShapeRef.current) return;

  selectedShapeRef.current.setMap(null);

  drawingsRef.current = drawingsRef.current.filter(
    s => s !== selectedShapeRef.current
  );

  selectedShapeRef.current = null;
};
const clearAllDrawings = () => {
  drawingsRef.current.forEach(s => s.setMap(null));
  drawingsRef.current = [];
  selectedShapeRef.current = null;
};

const undoLastDrawing = () => {
    updateEntities(mapEntities.slice(0, -1));
};
  const mapCenter = useMemo(() => ({ lat, lng }), [lat, lng]);
  const hasCenteredRef = useRef(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(() => !!focusOnly);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [visibleProjects, setVisibleProjects] = useState<Project[]>([]);
  const [searchBounds, setSearchBounds] =
  useState<google.maps.LatLngBounds | null>(null);
  const [focusedProject, setFocusedProject] = useState<Project | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [forceDrawerOpen, setForceDrawerOpen] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const showDrawer =
  !isFocusMode &&
  (forceDrawerOpen || (searchAttempted && visibleProjects.length > 0));

  const pendingPlaceRef =
  useRef<google.maps.places.PlaceResult | null>(null);

  const is3D = useRef(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places', 'drawing', 'geometry'],
  });

useEffect(() => {
  projectsApi.getAllPublic().then((data) => {
    setAllProjects(data);
  });
}, []);
useEffect(() => {
  if (!focusOnly || !mapRef.current) return;
  if (hasCenteredRef.current) return;

  const match = allProjects.find(
    p => p.latitude === lat && p.longitude === lng
  );

  if (!match) return;

  setFocusedProject(match);
  setVisibleProjects([match]);
  setSelectedProjectId(match.id);

  mapRef.current.panTo({
    lat: match.latitude!,
    lng: match.longitude!,
  });

  mapRef.current.setZoom(17);

  hasCenteredRef.current = true; 
}, [focusOnly, allProjects, lat, lng]);


useEffect(() => {
  onDrawerData?.({
    projects: showDrawer ? visibleProjects : [],
    selectedId: selectedProjectId,
    open: showDrawer,
  });
}, [showDrawer, visibleProjects, selectedProjectId]);

useEffect(() => {
  if (drawingType) {
    setCurrentDrawingType(drawingType);
  }
}, [drawingType]);
  const filterProjectsInView = useCallback(() => {
     if (isFocusMode && focusedProject) {
      setVisibleProjects([focusedProject]);
      return;
    }

    if (!window.google) return;

    const bounds = searchBounds || mapRef.current?.getBounds();
    if (!bounds) return;

    let filtered = allProjects.filter((p) => {
      if (p.latitude == null || p.longitude == null) return false;

      const pos = new google.maps.LatLng(p.latitude, p.longitude);
      return bounds.contains(pos);
    });

    


    // ✅ prevent infinite loop
    setVisibleProjects((prev) => {
      if (prev.length === filtered.length &&
          prev.every((p, i) => p.id === filtered[i]?.id)) {
        return prev;
      }
      return filtered;
    });

  }, [allProjects, searchBounds, isFocusMode, selectedProjectId]);

  useEffect(() => {
  if (!mapRef.current) return;
  filterProjectsInView();
}, [filterProjectsInView]);
useEffect(() => {
  if (!projectId) return;

  const loadSavedLandmarks = async () => {
    try {
      const project = await projectsApi.getById(projectId);

      if (!project?.landmarks) return;

      setSelectedLandmarksState(
        typeof project.landmarks === "string"
          ? JSON.parse(project.landmarks as unknown as string)
          : project.landmarks
      );
    } catch (err) {
      console.error("Failed to load landmarks", err);
    }
  };

  loadSavedLandmarks();
}, [projectId]);
const isInitialLoad = useRef(true);

// useEffect(() => {
//   if (!projectId) return;

//   const save = async () => {
//     if (isInitialLoad.current) {
//       isInitialLoad.current = false;
//       return; // 🚫 skip first run
//     }

//     try {
//       console.log("💾 Saving landmarks:", selectedLandmarks);

//       await saveProjectLandmarks(projectId, selectedLandmarks);
//     } catch (err) {
//       console.error("❌ Save failed", err);
//     }
//   };

//   const debounce = setTimeout(save, 500);
//   return () => clearTimeout(debounce);

// }, [selectedLandmarks, projectId]);
 const clearNavigation = () => {
  clientMarkerRef.current?.setMap(null);
  projectMarkerRef.current?.setMap(null);
  routePolylineRef.current?.setMap(null);

  clientMarkerRef.current = null;
  projectMarkerRef.current = null;
  routePolylineRef.current = null;
};

const loadNeighborhood = (category: string) => {
  clearNavigation();

  if (!mapRef.current || !window.google || !focusedProject) return;

  const map = mapRef.current;

  clearNeighborhoodMarkers();
  setNeighborhoodType(category);

  const projectLoc = new google.maps.LatLng(
    focusedProject.latitude!,
    focusedProject.longitude!
  );

  // 👉 Get user location
  navigator.geolocation.getCurrentPosition((pos) => {
    const clientLoc = new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    // =========================
    // BIG CLIENT PIN
    // =========================
    clientMarkerRef.current = new google.maps.Marker({
      position: clientLoc,
      map,
      title: "Your Location",
      icon: {
    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    scaledSize: new google.maps.Size(40, 40),
  },
    });

    // =========================
    // PROJECT FLAG
    // =========================
    projectMarkerRef.current = new google.maps.Marker({
      position: projectLoc,
      map,
      title: "Project",
      icon: destinationIcon,
    });

    // =========================
    // ROUTE LINE
    // =========================
    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: clientLoc,
        destination: projectLoc,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result) return;

        const path = result.routes[0].overview_path;

        routePolylineRef.current = new google.maps.Polyline({
          path,
          strokeColor: "#2563eb",
          strokeWeight: 6,
          icons: [
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 4,
                strokeColor: "#1d4ed8",
              },
              repeat: "50px",
            },
          ],
          map,
        });

        const bounds = new google.maps.LatLngBounds();
        bounds.extend(clientLoc);
        bounds.extend(projectLoc);
        map.fitBounds(bounds);
      }
    );

    // =========================
    // NEIGHBORHOOD PLACES
    // =========================
    const service = new google.maps.places.PlacesService(map);

    const request: google.maps.places.PlaceSearchRequest = {
      location: projectLoc,
      radius: 2500,
      type: categoryMap[category] as any,
    };

    service.nearbySearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results)
        return;

      results.forEach(place => {
        const marker = new google.maps.Marker({
          map,
          position: place.geometry!.location!,
          title: place.name,
          icon: getNeighborhoodIcon(category),
        });

         const info = new google.maps.InfoWindow({
          content: `
            <strong>${place.name}</strong><br/>
            ${category}
          `,
        });

        marker.addListener("click", () => {
          info.open(map, marker);
        });
        neighborhoodMarkersRef.current.push(marker);
      });
    });
  });
};
  // 🔹 Expose functions via ref
  useImperativeHandle(ref, () => ({
    fetchLandmarks: () => {
      fetchNearbyLandmarks();
    },

    getAvailableLandmarks: () => availableLandmarks,

    toggleLandmarkSelection: (landmark: Landmark) => {
      setSelectedLandmarksState((prev) => {
        const exists = prev.find((l) => l.placeId === landmark.placeId);
        if (exists) {
          return prev.filter((l) => l.placeId !== landmark.placeId);
        }
        return [...prev, landmark];
      });
    },
    

    getSelectedLandmarks: () => selectedLandmarks,

    setSelectedLandmarks: (placeIds: string[]) => {
  if (availableLandmarks.length === 0) {
    console.warn("⚠️ Landmarks not loaded yet");
    return;
  }

  const fullLandmarks = availableLandmarks.filter((l) =>
    placeIds.includes(l.placeId)
  );

  setSelectedLandmarksState(fullLandmarks);
},
      openLastUnsavedPlot: () => {
        const lastUnsaved = [...mapEntities]
          .reverse()
          .find(e => e.type === "subplot" && !e.saved);

        if (!lastUnsaved) return;

        onOpenPlotPanel?.(lastUnsaved.id);
      },
      getPlot: (id: string) => {
        return mapEntities.find(e => e.id === id);
      },

      updatePlotField: (id: string, field: string, value: any) => {
        updateEntities(
          mapEntities.map(e =>
            e.id === id ? { ...e, [field]: value } : e
          )
        );
      },

    confirmPlot: (id: string) => {
        updateEntities(
          mapEntities.map(e =>
            e.id === id ? { ...e, saved: true } : e
          )
        );
      },
      editPlot: (id: string) => {
    updateEntities(
      mapEntities.map(e =>
        e.id === id ? { ...e, saved: false } : e
      )
    );
  },


editBoundary: () => {
  updateEntities(
    mapEntities.map(e =>
      e.type === "project-boundary"
        ? { ...e, saved: false }
        : e
    )
  );
},

  savePlot: async (id: string) => {
    onOpenPlotPanel?.(id); 
    const plot = mapEntities.find(e => e.id === id);
    if (!plot) return;
    onPlotSelect?.(id);
  },
   saveBoundary: async () => {
    const boundary = mapEntities.find(e => e.type === "project-boundary");
    if (!boundary) return;

    updateEntities(
      mapEntities.map(e =>
        e.id === boundary.id ? { ...e, saved: true } : e
      )
    );

    console.log("Boundary saved locally:", boundary);
  },
    undo: () => {
      setHistory(prev => {
        if (prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        setRedoStack(r => [...r, mapEntities]);
        setMapEntities(last);

        return prev.slice(0, -1);
      });
    },
    redo: () => {
      setRedoStack(prev => {
        if (prev.length === 0) return prev;

        const last = prev[prev.length - 1];
        setHistory(h => [...h, mapEntities]);
        updateEntities(last);

        return prev.slice(0, -1);
      });
    },
      undoLastDrawing: () => {
      setMapEntities(prev => prev.slice(0, -1));
    },

    clearAll: () => {
      updateEntities([]);
    },
    lockToBoundary: () => {
      if (!mapRef.current) return;

      const map = mapRef.current;

      const boundary = mapEntities.find(
        e => e.type === "project-boundary"
      );

      if (!boundary) return;

      const bounds = new google.maps.LatLngBounds();

      boundary.path.forEach(p => {
        bounds.extend(p);
      });

      map.fitBounds(bounds);

      // small delay so zoom stabilizes
      setTimeout(() => {
        const zoom = map.getZoom();

        map.setOptions({
          draggable: false,
          scrollwheel: false,
          disableDoubleClickZoom: true,
          gestureHandling: "none",
          zoomControl: false,
          minZoom: zoom,
          maxZoom: zoom,
        });
      }, 300);
    },
    unlockCanvas: () => {
      if (!mapRef.current) return;

      mapRef.current.setOptions({
        draggable: true,
        scrollwheel: true,
        disableDoubleClickZoom: false,
        gestureHandling: "greedy",
        zoomControl: true,
        minZoom: undefined,
        maxZoom: undefined,
      });
    },
    getDirections: () => {
    if (!mapRef.current || !window.google) return;

    const map = mapRef.current;

    // clear previous navigation
    clearNavigation();

    navigator.geolocation.getCurrentPosition((pos) => {
    const clientLoc = new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    const projectLoc = new google.maps.LatLng(lat, lng);

    // =====================
    // USER PIN
    // =====================
    clientMarkerRef.current = new google.maps.Marker({
      position: clientLoc,
      map,
      title: "Your Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new google.maps.Size(40, 40),
      },
    });

    // =====================
    // PROJECT FLAG
    // =====================
    projectMarkerRef.current = new google.maps.Marker({
      position: projectLoc,
      map,
      title: "Project",
      icon: destinationIcon,
    });

    // =====================
    // ROUTE
    // =====================
    const service = new google.maps.DirectionsService();

    service.route(
      {
        origin: clientLoc,
        destination: projectLoc,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result) return;

        setDirections(result);

        // zoom to fit route
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(clientLoc);
        bounds.extend(projectLoc);
        map.fitBounds(bounds);
      }
    );
  });
},

    toggleStreetView: () => {
        if (!mapRef.current) return;

        const sv = mapRef.current.getStreetView();
        const svService = new google.maps.StreetViewService();

        svService.getPanorama(
          {
            location: { lat, lng },
            radius: 100, // 🔑 find nearest available panorama
          },
          (data, status) => {
            if (
              status === google.maps.StreetViewStatus.OK &&
              data?.location?.pano
            ) {
              sv.setPano(data.location.pano);
              sv.setPov({ heading: 0, pitch: 0 });
              sv.setVisible(true);
            } else {
              alert('Street View not available at this location');
            }
          }
        );
      },

     
      setMapView: () => {
        if (!mapRef.current) return;
        mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
      },

      setSatelliteView: () => {
        if (!mapRef.current) return;
        mapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
      },


      set3DView: () => {
        if (!mapRef.current) return;

        if (!is3D.current) {
          mapRef.current.setZoom(18);
          mapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
        } else {
          mapRef.current.setTilt(0);
          mapRef.current.setZoom(16);
          mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        }

        is3D.current = !is3D.current;
      },
      setNeighborhoodView: async () => {
       clearNeighborhoodMarkers();
        clearNavigation();


  if (!mapRef.current || !window.google || !focusedProject) return;

  const map = mapRef.current;

  // Switch map mode
  map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  map.setZoom(14);

  // Clear previous overlays
  if ((window as any).neighborhoodMarkers) {
    (window as any).neighborhoodMarkers.forEach((m: any) => m.setMap(null));
  }
  (window as any).neighborhoodMarkers = [];

  // 👉 Get client current location
  navigator.geolocation.getCurrentPosition((pos) => {
    const clientLoc = new google.maps.LatLng(
      pos.coords.latitude,
      pos.coords.longitude
    );

    const projectLoc = new google.maps.LatLng(
      focusedProject.latitude!,
      focusedProject.longitude!
    );

    // =============================
    // CLIENT BIG PIN
    // =============================
    const clientMarker = new google.maps.Marker({
  position: clientLoc,
  map,
  title: "Your Location",
   icon: {
    url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    scaledSize: new google.maps.Size(40, 40),
  },
});

clientMarkerRef.current = clientMarker;


    // =============================
    // DESTINATION FLAG
    // =============================
    // =============================

    projectMarkerRef.current = new google.maps.Marker({
      position: projectLoc,
      map,
      title: "Project",
      icon: destinationIcon,
    });

    (window as any).neighborhoodMarkers.push(clientMarker, projectMarkerRef.current);


    // =============================
    // DIRECTIONS ROUTE + ARROWS
    // =============================
    const directionsService = new google.maps.DirectionsService();

    directionsService.route(
      {
        origin: clientLoc,
        destination: projectLoc,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result) return;

        const path = result.routes[0].overview_path;

        const arrowSymbol = {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 4,
          strokeColor: "#1d4ed8",
        };

        const routeLine = new google.maps.Polyline({
          path,
          strokeColor: "#2563eb",
          strokeOpacity: 1,
          strokeWeight: 6,
          icons: [
            {
              icon: arrowSymbol,
              offset: "0%",
              repeat: "50px",
            },
          ],
          map,
        });

        routePolylineRef.current = routeLine;

        (window as any).neighborhoodMarkers.push(routeLine);

        // Fit bounds
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(clientLoc);
        bounds.extend(projectLoc);
        map.fitBounds(bounds);
      }
    );

    // =============================
    // NEIGHBORHOOD HIGHLIGHTS
    // =============================
    const service = new google.maps.places.PlacesService(map);

    const placeTypes = [
      "school",
      "hospital",
      "shopping_mall",
      "restaurant",
      "park",
      "university",
    ];

    placeTypes.forEach((type) => {
      const request: google.maps.places.TextSearchRequest = {
        location: projectLoc,
        radius: 2000,
        type,
      };

      service.textSearch(request, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results)
          return;

        results.forEach((place) => {
          const marker = new google.maps.Marker({
            position: place.geometry!.location!,
            map,
            title: place.name,
            icon: getNeighborhoodIcon(type),
          });

          (window as any).neighborhoodMarkers.push(marker);

          const info = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${type}`,
          });

          marker.addListener("click", () => info.open(map, marker));
        });
      });
    });
  });
},
setNeighborhoodFilter: (category: string) => {
  loadNeighborhood(category);
},
clearNeighborhood: () => {
  setNeighborhoodType(null);
  clearNeighborhoodMarkers();
},
      }));

      const handlePlaceChanged = useCallback(() => {
        if (!autocomplete) return;

        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        // store only — do not trigger search yet
        pendingPlaceRef.current = place;

        //applySearch();
      }, [autocomplete]);


    const applySearch = () => {
    if (!pendingPlaceRef.current || !mapRef.current) return;
    clearNeighborhoodMarkers();
    clearNavigation();
    setNeighborhoodType(null);
    setDirections(null);
    const place = pendingPlaceRef.current;

    setIsFocusMode(false);
    setSelectedProjectId(null);     // ✅ reset old marker
    setForceDrawerOpen(false);

    let bounds: google.maps.LatLngBounds | null = null;

    if (place.geometry?.viewport) {
      mapRef.current.fitBounds(place.geometry.viewport);
      bounds = place.geometry.viewport;
    } else if (place.geometry?.location) {
      mapRef.current.panTo(place.geometry.location);
      mapRef.current.setZoom(14);

      bounds = new google.maps.LatLngBounds();
      bounds.extend(place.geometry.location);
    }

    setSearchBounds(bounds);
    setSearchAttempted(true);

    // 🔥 Immediately compute results for THIS search
    if (bounds && window.google) {
      const filtered = allProjects.filter((p) => {
        if (p.latitude == null || p.longitude == null) return false;

        const pos = new google.maps.LatLng(p.latitude, p.longitude);
        return bounds!.contains(pos);
      });

      setVisibleProjects(filtered);

      // ✅ UX rule
      if (filtered.length > 0) {
        setSearchOpen(false);
      } else {
        setSearchOpen(true); // keep open for message
      }
    }
  };

  const restoreFocusedProject = useCallback(() => {
    if (!focusedProject || !mapRef.current) return;

    setIsFocusMode(true);
    setSearchBounds(null);
    setSearchAttempted(false);

    setVisibleProjects([focusedProject]);

    mapRef.current.panTo({
      lat: focusedProject.latitude!,
      lng: focusedProject.longitude!,
    });

    mapRef.current.setZoom(17);
  }, [focusedProject]);

const fetchNearbyLandmarks = async () => {
  if (!mapRef.current || !window.google) return;

  const map = mapRef.current;
  const service = new google.maps.places.PlacesService(map);
  console.log("RENDER LANDMARKS:", selectedLandmarks);
  // Use project location for all searches
  const projectLoc = new google.maps.LatLng(lat, lng);

  const types: string[] = [
    "school",
    "hospital",
    "shopping_mall",
    "restaurant",
    "park",
    "university",
  ];

  const results: Landmark[] = [];

  for (const type of types) {
    await new Promise<void>((resolve) => {
      service.nearbySearch(
        {
          location: projectLoc,
          radius: 2500, // 2.5 km radius around project
          type: type as any,
        },
        (places, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && places) {
            places.forEach((place) => {
              if (
                !place.geometry?.location ||
                typeof place.geometry.location.lat !== "function" ||
                typeof place.geometry.location.lng !== "function"
              ) return;

              const latVal = place.geometry.location.lat();
              const lngVal = place.geometry.location.lng();

              if (!latVal || !lngVal) return; // safety check

              results.push({
                placeId: place.place_id!,
                name: place.name || "",
                type,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.vicinity || "",
              });
            });
           
          }
          resolve();
        }
        
      );
      
    });
  }
  const unique = Array.from(
    new Map(results.map(l => [l.placeId, l])).values()
  );
  // Update state with landmarks near the project
  setAvailableLandmarks(unique);
};
  

  // 🔹 Conditional render only for map, hooks always run
  if (!isLoaded) return <div>Loading map…</div>;


const getPolygonBounds = (
  paths: google.maps.LatLngLiteral[]
): google.maps.LatLngBoundsLiteral => {

  const bounds = new google.maps.LatLngBounds();

  paths.forEach(p => bounds.extend(p));

  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();

  return {
    north: ne.lat(),
    east: ne.lng(),
    south: sw.lat(),
    west: sw.lng(),
  };
};
const updateEntities = (newState: MapEntity[]) => {
  setHistory(prev => [...prev, mapEntities]);
  setRedoStack([]);
  setMapEntities(newState);
};
const updateEntityPath = (id: string, newPath: any[]) => {
  updateEntities(
    mapEntities.map(e =>
      e.id === id ? { ...e, path: newPath } : e
    )
  );
};
const updatePlotField = (id: string, field: string, value: any) => {
  updateEntities(
    mapEntities.map(e =>
      e.id === id ? { ...e, [field]: value } : e
    )
  );
};

const onOverlayComplete = (e: google.maps.drawing.OverlayCompleteEvent) => {
  const id = crypto.randomUUID();

  if (e.type === "polygon") {
      const poly = e.overlay as google.maps.Polygon;
      const path = poly.getPath().getArray().map(p => p.toJSON());

      const entityType = currentDrawingType;

      let area: number | undefined;
      let plotNumber: string | undefined;

      if (entityType === "subplot") {
        area = google.maps.geometry.spherical.computeArea(
          path.map(p => new google.maps.LatLng(p))
        );

        const subplotCount =
          mapEntities.filter(e => e.type === "subplot").length + 1;

        plotNumber = `P-${subplotCount}`;
      }

      const newEntity: MapEntity = {
        id,
        type: entityType,
        geometryType: "polygon",
        path,
        status: entityType === "subplot" ? "available" : undefined,
        area,
        plotNumber,
        saved: false,
      };

     updateEntities([...mapEntities, newEntity]);

      e.overlay.setMap(null);
      setDrawMenuOpen(false);
  }

  if (e.type === "polyline") {
    const line = e.overlay as google.maps.Polyline;
    const path = line.getPath().getArray().map(p => p.toJSON());

    const newEntity: MapEntity = {
      id,
      type: "road",
      geometryType: "polyline",
      path,
    }

    updateEntities([...mapEntities, newEntity]);
  }

  e.overlay.setMap(null); // remove raw overlay
};
  return (
    <div className="relative h-full w-full z-0">
      <div
  className="absolute top-4 left-1/2 z-10
             -translate-x-1/2
             w-[340px] lg:w-[420px]
             rounded-2xl bg-white shadow-xl  p-3"
>
  <Autocomplete
    onLoad={setAutocomplete}
    onPlaceChanged={handlePlaceChanged}
  >
    <div className="flex items-center">
      <input
        placeholder="Search city / locality"
        onFocus={() => setSearchOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="flex-1 text-sm outline-none bg-transparent"
      />

      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="ml-2 h-4 w-4 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    </div>
  </Autocomplete>

  <SearchFiltersPanel
    open={searchOpen}
    onClose={() => setSearchOpen(false)}
    onSearch={applySearch}
    noResults={searchAttempted && visibleProjects.length === 0}
  />
</div>

 {/* DRAW MENU */}
<div className="absolute bottom-35 left-4 z-20">
 
  {/* Main Draw Button */}
  <button
  onClick={() => {
    router.push(`/dashboard/projects/${projectId}/layout-editor`);
  }}
>
  ✏ Layout Editor
</button>
</div>
                  <GoogleMap
  mapContainerStyle={containerStyle}
  center={mapCenter}
  zoom={16}
  onLoad={(map: google.maps.Map) => {
    mapRef.current = map;
  }}
  onIdle={() => {
    if (!isFocusMode) filterProjectsInView();
  }}
  options={{
    fullscreenControl: false,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControl: true,
    gestureHandling: "greedy",
    draggable: true,
    tilt: 45,
  }}
>
  {mapEntities.map((entity) => {

  if (entity.geometryType === "polygon") {
    return (
      <React.Fragment key={entity.id}>
        <Polygon
          paths={entity.path}
          editable={!entity.saved}
          draggable={!entity.saved}
          options={{
            fillColor:
              entity.type === "project-boundary"
                ? "#111827"
                : entity.status === "sold"
                ? "#dc2626"
                : entity.status === "reserved"
                ? "#f59e0b"
                : "#16a34a",
            fillOpacity: 0.4,
            strokeWeight: 2,
          }}
          onClick={() => {
            if (entity.type === "subplot") {
              onPlotSelect?.(entity.id);
            }
          }}
        />

        {entity.type === "subplot" && entity.saved && (
          <OverlayView
            position={entity.path[0]}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="bg-white text-[10px] font-semibold pl-3 pr-12 py-1 rounded shadow -translate-x-1/2 -translate-y-full  whitespace-nowrap text-center">
              {entity.plotNumber}
              {entity.facing && (
                <div className="text-gray-500">
                  {entity.facing.toUpperCase()}
                </div>
              )}
              {entity.status}
            </div>
          </OverlayView>
        )}
      </React.Fragment>
    );
  }

  if (entity.geometryType === "polyline") {
    return (
      <Polyline
        key={entity.id}
        path={entity.path}
        editable={!entity.saved}
        draggable={!entity.saved}
        onClick={() => {
          openPlotStatusEditor(entity.id);
        }}
        options={{
          strokeColor: "#111827",
          strokeWeight: 10,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeOpacity: 1,
                scale: 4,
                strokeColor: "#ffffff",
              },
              offset: "0",
              repeat: "20px",
            },
          ],
        }}
      />
    );
  }

  return null;
})}
               
                  
                    {directions && (
                      <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />
                    )}

                    <DrawingManager
  drawingMode={drawingMode}
  onOverlayComplete={onOverlayComplete}
  options={{
    drawingControl: false, // we use custom UI
    polygonOptions: {
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      strokeWeight: 2,
      editable: true,
      clickable: true,
    },
    rectangleOptions: {
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      editable: true,
    },
    circleOptions: {
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      editable: true,
    },
    polylineOptions: {
      strokeWeight: 3,
      editable: true,
    },
  }}
/>
{selectedPlot && selectedPlot.type === "road" && (
  <OverlayView
    position={selectedPlot.path[0]}
    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
  >
    <div className="bg-white p-3 rounded-xl shadow text-xs">
      <input
        placeholder="Road Name"
        value={selectedPlot.roadName || ""}
        onChange={(e) =>
          updatePlotField(selectedPlot.id, "roadName", e.target.value)
        }
        className="border p-1 w-full"
      />

      <button
        onClick={() => {
          updateEntities(
            mapEntities.map(e =>
              e.id === selectedPlot.id ? { ...e, saved: true } : e
            )
          );
        }}
        className="mt-2 text-blue-600 text-xs"
      >
        Save Road
      </button>
    </div>
  </OverlayView>
)}

              {visibleProjects.map((project) => {
                if (project.latitude == null || project.longitude == null) return null;

              return (
                <OverlayView
                  key={project.id}
                  position={{
                    lat: project.latitude,
                    lng: project.longitude,
                  }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    className="-translate-x-1/2 -translate-y-full cursor-pointer"
                    onClick={() => {
                      // ✅ VISIT PAGE MODE
                      if (focusOnly && isFocusMode) {
                        onMarkerClick?.();
                        return;
                      }

                      // ✅ SEARCH MODE
                      setIsFocusMode(false);
                      setSelectedProjectId(project.id);
                      setSearchAttempted(true);
                      setSearchOpen(false);
                      setForceDrawerOpen(true);



                      mapRef.current?.panTo({
                        lat: project.latitude!,
                        lng: project.longitude!,
                      });
                    }}

                    >
                    <div className="flex flex-col items-center">

                    {/* Circular image marker */}
                    <div className="
                      h-12 w-12
                      rounded-full
                      overflow-hidden
                      border-2 border-white
                      shadow-lg
                      bg-gray-200
                    ">
                      {project.coverImage && (
                        <img
                          src={project.coverImage}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>

                    {/* pointer */}
                    <div className="h-2 w-2 rotate-45 bg-white shadow -mt-1" />

                    </div>

                     
                  </div>
                </OverlayView>
              );
            })}
            {focusOnly &&
              selectedLandmarks.map((landmark, index) => (
                <OverlayView
                  key={landmark.placeId || `${landmark.lat}-${landmark.lng}-${index}`}
                  position={{ lat: landmark.lat, lng: landmark.lng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div className="-translate-x-1/2 -translate-y-full">
                    <img
                      src={getNeighborhoodIcon(landmark.type).url}
                      style={{ width: 28, height: 40 }}
                    />
                  </div>
                </OverlayView>
              ))}

            </GoogleMap>
            
            {focusOnly && focusedProject && !isFocusMode && (
            <button
              onClick={restoreFocusedProject}
              className="
                absolute right-4
                bottom-[180px] sm:bottom-[160px] lg:bottom-6
                z-10
                px-4 py-2 rounded-full
                bg-emerald-700 text-white
                text-sm font-semibold
                shadow-lg hover:bg-emerald-800
                transition
              "
            >
              Return to Project
            </button>
          )}
          {/* <ProjectsBottomDrawer
            projects={showDrawer ? visibleProjects : []}
            selectedProjectId={selectedProjectId}
          /> */}

          </div>
        );
      });

      ProjectMap.displayName = 'ProjectMap';
      export default ProjectMap;
