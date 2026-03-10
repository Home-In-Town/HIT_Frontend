//frontend\src\components\public\ProjectMap.tsx
'use client';

import {
  GoogleMap,
  Autocomplete,
  OverlayView,
  DirectionsRenderer,
  useJsApiLoader,
  Polygon,
} from '@react-google-maps/api';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { projectsApi, saveProjectLandmarks } from '@/lib/api';
import { Landmark, Project } from '@/types/project';
import SearchFiltersPanel from "./SearchFiltersPanel";
import { DrawingManager } from '@react-google-maps/api';
import { useRouter } from 'next/navigation';
import React from 'react';
import AILayoutConfigModal from '../ui/AILayoutConfigModal';
import ProjectBoundaryUI from '../ui/ProjectBoundaryUI';
type CustomOverlay = google.maps.OverlayView & {
  div?: HTMLDivElement;
};
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
  onLandmarksChange?: (landmarks: Landmark[]) => void;
};
type MapEntityType = "project-boundary" | "subplot" | "road" | "ai-boundary" | undefined;

type PlotStatus = "available" | "booked" | "sold" | "on-hold";

type Facing = "north" | "south" | "east" | "west";
type RoadType = "lane" | "internal" | "main";

type MapEntity = {
  id: string;
  type: MapEntityType;
  geometryType: "polygon" | "polyline";
  path: google.maps.LatLngLiteral[];

  aiBoundaryId?: string; 
  deleted?: boolean;  
  roadType?: RoadType; 
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
const getPlotColor = (status?: PlotStatus) => {
  switch (status) {
    case "sold":
      return "#22c55e"; // green
    case "booked":
      return "#ef4444"; // red
    case "on-hold":
      return "#eab308"; // yellow
    default:
      return "#3b82f6"; // blue (available)
  }
};

const getPolygonCenter = (path: google.maps.LatLngLiteral[]) => {
  const lat =
    path.reduce((sum, p) => sum + p.lat, 0) / path.length;

  const lng =
    path.reduce((sum, p) => sum + p.lng, 0) / path.length;

  return { lat, lng };
};
const getPolygonTopLeft = (path: google.maps.LatLngLiteral[]) => {
  let minLng = Infinity;
  let maxLat = -Infinity;

  path.forEach((p) => {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lat > maxLat) maxLat = p.lat;
  });

  return {
    lat: maxLat,
    lng: minLng,
  };
};
const getPolygonBottomCenter = (path: google.maps.LatLngLiteral[]) => {
  let maxLat = -Infinity;
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  path.forEach((p) => {
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  });

  return {
    lat: minLat, // bottom
    lng: (minLng + maxLng) / 2, // center
  };
};
const getRoadAngle = (path: google.maps.LatLngLiteral[]) => {
  if (path.length < 2) return 0;

  // Convert to simple XY arrays
  const xs = path.map(p => p.lng);
  const ys = path.map(p => p.lat);

  const meanX = xs.reduce((a, b) => a + b) / xs.length;
  const meanY = ys.reduce((a, b) => a + b) / ys.length;

  let num = 0;
  let den = 0;

  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;

    num += 2 * dx * dy;
    den += dx * dx - dy * dy;
  }

  const angle = 0.5 * Math.atan2(num, den);

  let deg = angle * (180 / Math.PI);

  // keep text readable
  if (deg > 90) deg -= 180;
  if (deg < -90) deg += 180;

  return deg;
};
const rotatePolygon = (
  path: google.maps.LatLngLiteral[],
  angleDeg: number
) => {
  const angle = (angleDeg * Math.PI) / 180;

  const center = getPolygonCenter(path);

  return path.map((p) => {
    const x = p.lng - center.lng;
    const y = p.lat - center.lat;

    const newX = x * Math.cos(angle) - y * Math.sin(angle);
    const newY = x * Math.sin(angle) + y * Math.cos(angle);

    return {
      lat: center.lat + newY,
      lng: center.lng + newX,
    };
  });
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
      onMarkerClick,
      onDrawerData,
      onPlotSelect,
      onOpenPlotPanel,
    }: Props,
    ref
  ) => {
  // 🔹 Always run hooks first
  const mapRef = useRef<google.maps.Map | null>(null);
const getNeighborhoodIcon = (type: string): google.maps.Icon => {
  const iconPaths: Record<string, string> = {
    hospital: "M10 2h4v6h6v4h-6v6h-4v-6H4V8h6z",
    school: "M12 2L2 7l10 5 10-5-10-5zm0 7L2 4v10l10 5 10-5V4l-10 5z",
    university: "M2 10l10-5 10 5-10 5-10-5zm0 4l10 5 10-5",
    shopping_mall: "M4 6h16l-2 12H6L4 6zm4-3h8v3H8V3z",
    restaurant: "M3 2h2v10H3zM7 2h2v10H7zM11 2h2v10h-2zM15 2h2v16h-2z",
    park: "M12 2C8 2 6 6 6 8c0 2 2 4 6 4s6-2 6-4c0-2-2-6-6-6zm0 10v10",
    subway_station: "M6 2h12v12H6zM8 16l-2 4m10-4l2 4",
    gas_station: "M6 2h10v14H6zM16 6h4v10h-4",
    bus_station: "M4 4h16v10H4zM6 14l-2 4m12-4l2 4",
    train_station: "M6 2h12v12H6zM8 16l-2 4m10-4l2 4",
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
  petrol: "gas_station",
  bus: "bus_station",
  railway: "train_station",
};
const neighborhoodFilters = [
  { key: "school", label: "Schools" },
  { key: "hospital", label: "Hospitals" },
  { key: "market", label: "Malls" },
  { key: "restaurant", label: "Restaurants" },
  { key: "metro", label: "Metro" },
  { key: "petrol", label: "Petrol Pumps" },
  { key: "bus", label: "Bus Stand" },
  { key: "railway", label: "Railway" },
]
const [landmarkSearch, setLandmarkSearch] = useState("");
const [history, setHistory] = useState<MapEntity[][]>([]);
const [redoStack, setRedoStack] = useState<MapEntity[][]>([]);
 const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
const [currentDrawingType, setCurrentDrawingType] =
  useState<MapEntityType>("project-boundary");
const [mapEntities, setMapEntities] = useState<MapEntity[]>([]);
const rotateRoad = (id: string, angle: number) => {
  setMapEntities((prev) =>
    prev.map((e) =>
      e.id === id
        ? { ...e, path: rotatePolygon(e.path, angle) }
        : e
    )
  );
};
const selectedPlot =
  mapEntities.find(e => e.id === editingPlotId);

const latestAiBoundary = useMemo(() => {
  return [...mapEntities]
    .reverse()
    .find((e) => e.type === "ai-boundary");
}, [mapEntities]);
const router = useRouter();
const [mapZoom, setMapZoom] = useState(16);
const [availableLandmarks, setAvailableLandmarks] = useState<Landmark[]>([]);
const [selectedLandmarks, setSelectedLandmarksState] = useState<Landmark[]>([]);
const landmarkMarkersRef = useRef<google.maps.Marker[]>([]);
const destinationIcon = 'https://maps.google.com/mapfiles/ms/icons/red-flag.png'; // flag

  const [neighborhoodType, setNeighborhoodType] = useState<string | null>(null);
  const neighborhoodMarkersRef = useRef<google.maps.Marker[]>([]);
const clientMarkerRef = useRef<google.maps.Marker | null>(null);
const projectMarkerRef = useRef<google.maps.Marker | null>(null);
const routePolylineRef = useRef<google.maps.Polyline | null>(null);
const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const landmarkLinesRef = useRef<google.maps.Polyline[]>([]);
const landmarkLabelsRef = useRef<google.maps.OverlayView[]>([]);
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
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiEditMode, setAiEditMode] = useState(false);
  const [activeAiBoundaryId, setActiveAiBoundaryId] = useState<string | null>(null);
  const [aiConfig, setAiConfig] = useState({
    plots: 25,      // total plots user wants
    spacing: 4,     // meters
  });
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
  if (!drawingType) return;

  setCurrentDrawingType(drawingType);

  // when user starts new AI boundary
  if (drawingType === "ai-boundary") {
    setAiEditMode(false);

    // also clear selection
    setEditingPlotId(null);
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
useEffect(() => {
  if (selectedLandmarks.length > 0) {
    drawLandmarkConnections();
  }
}, [selectedLandmarks]);

 const clearNavigation = () => {
  clientMarkerRef.current?.setMap(null);
  projectMarkerRef.current?.setMap(null);
  routePolylineRef.current?.setMap(null);

  clientMarkerRef.current = null;
  projectMarkerRef.current = null;
  routePolylineRef.current = null;
};

const getRoadStyle = (type?: RoadType) => {
  switch (type) {
    case "lane":
      return {
        color: "#000000",
        opacity: 0.45,
        width: 6,
      };

    case "internal":
      return {
        color: "#000000",
        opacity: 0.55,
        width: 10,
      };

    case "main":
      return {
        color: "#000000",
        opacity: 0.65,
        width: 14,
      };

    default:
      return {
        color: "#000000",
        opacity: 0.55,
        width: 10,
      };
  }
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

  // center map on project
  map.panTo(projectLoc);
  map.setZoom(14);

  // =========================
  // NEIGHBORHOOD PLACES ONLY
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

    results.forEach((place) => {
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
};
useEffect(() => {
  if (!isLoaded || !focusedProject) return;

  const handleHash = () => {
    const hash = window.location.hash.replace("#", "");

    if (!hash) return;

    const allowed = [
      "hospital",
      "school",
      "restaurant",
      "metro",
      "market",
      "petrol",
      "bus",
      "railway",
    ];

    if (allowed.includes(hash)) {
      setTimeout(() => {
        loadNeighborhood(hash);
      }, 200);
    }
  };

  // run once when map + project ready
  handleHash();

  window.addEventListener("hashchange", handleHash);

  return () => {
    window.removeEventListener("hashchange", handleHash);
  };
}, [isLoaded, focusedProject]);

const filteredLandmarks = useMemo(() => {
  if (!landmarkSearch.trim()) return availableLandmarks;

  const query = landmarkSearch.toLowerCase();

  return availableLandmarks.filter((l) =>
    l.name.toLowerCase().includes(query) ||
    l.type.toLowerCase().includes(query) ||
    (l.address || "").toLowerCase().includes(query)
  );
}, [availableLandmarks, landmarkSearch]);
const clearLandmarkConnections = () => {
  landmarkLinesRef.current.forEach(l => l.setMap(null));
  landmarkLabelsRef.current.forEach(l => l.setMap(null));
   landmarkMarkersRef.current.forEach(m => m.setMap(null)); 
  landmarkLinesRef.current = [];
  landmarkLabelsRef.current = [];
  landmarkMarkersRef.current = []; 
};
const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  const drawLandmarkConnections = () => {
    if (!mapRef.current || !window.google) return;

    clearLandmarkConnections();

    const map = mapRef.current;

    if (!directionsServiceRef.current) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }

    const service = directionsServiceRef.current;

    const projectLoc = new google.maps.LatLng(lat, lng);

    selectedLandmarks.forEach((lm) => {
      const landmarkLoc = new google.maps.LatLng(lm.lat, lm.lng);

      const marker = new google.maps.Marker({
        position: landmarkLoc,
        map,
        title: lm.name,
        icon: {
          url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png", // 🟢 GREEN PIN
          scaledSize: new google.maps.Size(40, 40),
        },
      });

  landmarkMarkersRef.current.push(marker);
      service.route(
        {
          origin: projectLoc,
          destination: landmarkLoc,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status !== "OK" || !result) return;

          const route = result.routes[0];
          const path = route.overview_path;

          // 🔹 DRAW ROUTE LINE (WITH ARROW)
          const line = new google.maps.Polyline({
            path,
            strokeColor: "#10b981",
            strokeOpacity: 1,
            strokeWeight: 4,
            icons: [
              {
                icon: {
                  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 3,
                  strokeColor: "#059669",
                },
                repeat: "60px",
              },
            ],
            map,
          });

          landmarkLinesRef.current.push(line);

          // 🔹 DISTANCE TEXT (REAL DISTANCE)
          const leg = route.legs[0];
          const meters = leg.distance?.value || 0;

          let distanceText = "";

          if (meters < 1000) {
            distanceText = `${meters} m`;
          } else {
            distanceText = `${(meters / 1000).toFixed(1)} km`;
          }

          const text = `${distanceText} • ${lm.name}`;

          // =========================
          // 🔹 MIDPOINT (better center)
          // =========================
          const midIndex = Math.floor(path.length / 2);
          const midPoint = path[midIndex];

          // =========================
          // 🔹 LABEL
          // =========================
          const label = new google.maps.OverlayView() as CustomOverlay;

          label.onAdd = function () {
            const div = document.createElement("div");
            div.innerText = text;

            div.style.position = "absolute";
            div.style.background = "#111827";
            div.style.color = "white";
            div.style.padding = "4px 10px";
            div.style.borderRadius = "999px";
            div.style.fontSize = "11px";
            div.style.fontWeight = "500";
            div.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
            div.style.whiteSpace = "nowrap";
            div.style.transform = "translate(-50%, -50%)";

            this.div = div;

            this.getPanes()?.overlayMouseTarget.appendChild(div);
          };

          label.draw = function () {
            const projection = this.getProjection();
            if (!projection || !this.div) return;

            const pos = projection.fromLatLngToDivPixel(midPoint);

            if (pos) {
              this.div.style.left = pos.x + "px";
              this.div.style.top = pos.y + "px";
            }
          };

          label.onRemove = function () {
            if (this.div) this.div.remove();
          };

          label.setMap(map);
          landmarkLabelsRef.current.push(label);
        }
      );
    });
  };
  const generateAILayout = () => {
    setAiConfigOpen(true);
  };

 
  const runAILayout = () => {
  const boundary = [...mapEntities]
    .reverse()
    .find(e => e.type === "ai-boundary");

  if (!boundary) {
    alert("Draw AI boundary first");
    return;
  }

  const { plots, spacing } = aiConfig;
  const path = boundary.path;

  if (plots <= 0) return;

  // DETECT ORIENTATION

  const p0 = path[0];
  const p1 = path[1];

  const angle = Math.atan2(p1.lat - p0.lat, p1.lng - p0.lng);

  const rotate = (p: any, a: number) => ({
    x: p.lng * Math.cos(a) - p.lat * Math.sin(a),
    y: p.lng * Math.sin(a) + p.lat * Math.cos(a),
  });

  const unrotate = (p: any, a: number) => ({
    lng: p.x * Math.cos(a) + p.y * Math.sin(a),
    lat: -p.x * Math.sin(a) + p.y * Math.cos(a),
  });

  const rotated = path.map(p => rotate(p, -angle));

  // BOUNDING BOX IN ROTATED SPACE

  const minX = Math.min(...rotated.map(p => p.x));
  const maxX = Math.max(...rotated.map(p => p.x));
  const minY = Math.min(...rotated.map(p => p.y));
  const maxY = Math.max(...rotated.map(p => p.y));

  const width = maxX - minX;
  const height = maxY - minY;

  // GRID SIZE
  const cols = Math.ceil(Math.sqrt(plots));
  const rows = Math.ceil(plots / cols);

  const spacingDeg = spacing / 1000000;

  const plotWidth = width / cols;
  const plotHeight = height / rows;

  const newEntities: MapEntity[] = [];
  let plotNumber = 1;

  // GENERATE ROTATED GRID
  for (let r = 0; r < rows; r++) {

    for (let c = 0; c < cols; c++) {

      if (plotNumber > plots) break;

      const x = minX + c * (plotWidth + spacingDeg);
      const y = minY + r * (plotHeight + spacingDeg);

      const corners = [
        { x, y },
        { x: x + plotWidth, y },
        { x: x + plotWidth, y: y + plotHeight },
        { x, y: y + plotHeight },
      ];

      const latlng = corners.map(p => unrotate(p, -angle));

      newEntities.push({
        id: crypto.randomUUID(),
        type: "subplot",
        geometryType: "polygon",
        saved: false,
        plotNumber: `${plotNumber}`,
        status: "available",
        path: latlng,
        aiBoundaryId: boundary.id,
      });

      plotNumber++;
    }

    if (plotNumber > plots) break;
  }

  setMapEntities(prev => [...prev, ...newEntities]);

  setActiveAiBoundaryId(boundary.id);
  setAiEditMode(true);
  setCurrentDrawingType("subplot");
  setEditingPlotId(null);
  setAiConfigOpen(false);
};
const attachPolygonListeners = (poly: google.maps.Polygon, id: string) => {
  const path = poly.getPath();

  const update = () => {
    const newPath = path.getArray().map(p => ({
      lat: p.lat(),
      lng: p.lng(),
    }));

    setMapEntities(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, path: newPath }
          : e
      )
    );
  };

  path.addListener("set_at", update);
  path.addListener("insert_at", update);
  path.addListener("remove_at", update);
};
 const deleteSelectedPlot = () => {
  if (!selectedPlotId) {
    alert("Select a plot first");
    return;
  }

  setMapEntities(prev => {
    const updated = prev.map(e =>
      e.id === selectedPlotId
        ? { ...e, deleted: true }
        : e
    );

    // maintain undo history
    setHistory(h => [...h, prev]);
    setRedoStack([]);

    return updated;
  });

  setSelectedPlotId(null);
  setEditingPlotId(null);
};
  // 🔹 Expose functions via ref
  useImperativeHandle(ref, () => ({
    deleteSelectedPlot,
    saveAiLayout: () => {

    const latestAiBoundary = [...mapEntities]
      .reverse()
      .find(e => e.type === "ai-boundary");

    if (!latestAiBoundary) return;

    const updated = mapEntities.map(e => {

      if (
        (e.type === "subplot" && e.aiBoundaryId === latestAiBoundary.id) ||
        (e.type === "ai-boundary" && e.id === latestAiBoundary.id)
      ) {
        return { ...e, saved: true };
      }

      return e;
    });

    updateEntities(updated);

    // exit edit mode
    setAiEditMode(false);
    setEditingPlotId(null);
  },
    generateAILayout,
      toggleAiEditMode: (enable?: boolean) => {

        if (typeof enable === "boolean") {
          setAiEditMode(enable);
        } else {
          setAiEditMode(prev => !prev);
        }

        setEditingPlotId(null);
      },
    getFilteredLandmarks: () => filteredLandmarks,
    fetchLandmarks: () => {
      fetchNearbyLandmarks();
    },

    getAvailableLandmarks: () => availableLandmarks,

    toggleLandmarkSelection: (landmark: Landmark) => {
      const exists = selectedLandmarks.some(
        (l) => l.placeId === landmark.placeId
      );

      const updated = exists
        ? selectedLandmarks.filter((l) => l.placeId !== landmark.placeId)
        : [...selectedLandmarks, landmark];

      setSelectedLandmarksState(updated);
      return updated; 
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
        if (!selectedPlotId) {
          alert("Select a plot first");
          return;
        }

        const plot = mapEntities.find(
          e => e.id === selectedPlotId && e.type === "subplot"
        );

        if (!plot) return;

        onOpenPlotPanel?.(plot.id);
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
    if (history.length === 0) return;

    const last = history[history.length - 1];

    setRedoStack(r => [...r, mapEntities]);
    setMapEntities(last);
    setHistory(h => h.slice(0, -1));
  },
   redo: () => {
    if (redoStack.length === 0) return;

    const last = redoStack[redoStack.length - 1];

    setHistory(h => [...h, mapEntities]);
    setMapEntities(last);
    setRedoStack(r => r.slice(0, -1));
  },
    undoLastDrawing: () => {
      updateEntities(mapEntities.slice(0, -1));
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

    // USER PIN
    clientMarkerRef.current = new google.maps.Marker({
      position: clientLoc,
      map,
      title: "Your Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new google.maps.Size(40, 40),
      },
    });

    // PROJECT FLAG
    projectMarkerRef.current = new google.maps.Marker({
      position: projectLoc,
      map,
      title: "Project",
      icon: destinationIcon,
    });

    // ROUTE
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

    map.panTo(projectLoc);
    map.setZoom(14);

   
    // NEIGHBORHOOD HIGHLIGHTS
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

  const projectLoc = new google.maps.LatLng(lat, lng);

  // 🔥 Expanded types (important)
  const types: string[] = [
    "school",
    "hospital",
    "shopping_mall",
    "supermarket",
    "restaurant",
    "cafe",
    "pharmacy",
    "bank",
    "atm",
    "park",
    "gym",
    "movie_theater",
    "bus_station",
    "train_station",
    "subway_station",
    "university",
    "lodging",
  ];

  // 🔥 Keywords (for things NOT covered by types)
  const keywords: string[] = [
    "market",
    "road",
    "highway",
    "street",
    "mall",
    "clinic",
    "office",
    "commercial",
  ];

  const results: Landmark[] = [];

  // =========================
  // 🔹 TYPE SEARCH
  // =========================
  for (const type of types) {
    await new Promise<void>((resolve) => {
      service.nearbySearch(
        {
          location: projectLoc,
          radius: 2000,
          type: type as any,
        },
        (places, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && places) {
            places.forEach((place) => {
              if (!place.geometry?.location) return;

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

  // =========================
  // 🔹 KEYWORD SEARCH
  // =========================
  for (const keyword of keywords) {
    await new Promise<void>((resolve) => {
      service.textSearch(
        {
          location: projectLoc,
          radius: 2000,
          query: keyword,
        },
        (places, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && places) {
            places.forEach((place) => {
              if (!place.geometry?.location) return;

              results.push({
                placeId: place.place_id!,
                name: place.name || "",
                type: keyword,
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address || "",
              });
            });
          }
          resolve();
        }
      );
    });
  }

  // =========================
  // 🔥 REMOVE DUPLICATES
  // =========================
  const unique = Array.from(
    new Map(results.map((l) => [l.placeId, l])).values()
  );

  console.log("✅ TOTAL LANDMARKS:", unique.length);

  setAvailableLandmarks(unique);
};
  

  // 🔹 Conditional render only for map, hooks always run
  if (!isLoaded) return <div>Loading map…</div>;


  const updateEntities = (newState: MapEntity[]) => {
    setHistory(h => [...h, mapEntities]); 
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
      const path = poly.getPath().getArray().map(p => ({
        lat: p.lat(),
        lng: p.lng(),
      }));

      const entityType = currentDrawingType;
      
       
      if (entityType === "road") {
        const newEntity: MapEntity = {
          id,
          type: "road",
          geometryType: "polygon",
          path,
          roadName: "",
          roadType: "internal",
          saved: false, // important
        };

        updateEntities([...mapEntities, newEntity]);

        setEditingPlotId(id); // open editor UI
        poly.setMap(null);
        return;
      }
      //subplot
      let area: number | undefined;
      let plotNumber: string | undefined;

      if (entityType === "subplot") {
        area = google.maps.geometry.spherical.computeArea(
          path.map(p => new google.maps.LatLng(p))
        );

        const subplotCount =
          mapEntities.filter(e => e.type === "subplot").length + 1;

        // default number (user can change later)
        plotNumber = String(subplotCount);
      }
    
      const newEntity: MapEntity = {
        id,
        type: entityType,
        geometryType: "polygon",
        path,
        status: entityType === "subplot" ? "available" : undefined,
        area,
        plotNumber,
        saved: entityType === "ai-boundary" ? true : false,
      };
     updateEntities([...mapEntities, newEntity]);

      e.overlay.setMap(null);
      if (entityType === "ai-boundary") {
        setCurrentDrawingType("ai-boundary");
      }
      setDrawMenuOpen(false);
    }
   
    if (e.type === "rectangle") {
    const rect = e.overlay as google.maps.Rectangle;
    const bounds = rect.getBounds();
    if (!bounds) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();

    const path = [
      { lat: ne.lat(), lng: sw.lng() }, // NW
      { lat: ne.lat(), lng: ne.lng() }, // NE
      { lat: sw.lat(), lng: ne.lng() }, // SE
      { lat: sw.lat(), lng: sw.lng() }, // SW
    ];

    const entityType = currentDrawingType;

    // =========================
    // ROAD RECTANGLE
    // =========================
    if (entityType === "road") {
      const newEntity: MapEntity = {
        id,
        type: "road",
        geometryType: "polygon",
        path,
        roadName: "",
        roadType: "internal",
        saved: false,
      };

      updateEntities([...mapEntities, newEntity]);
      setEditingPlotId(id);

      rect.setMap(null);
      return;
    }

    // =========================
    // SUBPLOT RECTANGLE
    // =========================
    let area: number | undefined;
    let plotNumber: string | undefined;

    if (entityType === "subplot") {
      area = google.maps.geometry.spherical.computeArea(
        path.map(p => new google.maps.LatLng(p))
      );

      const subplotCount =
        mapEntities.filter(e => e.type === "subplot").length + 1;

      plotNumber = `${subplotCount}`;
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

    rect.setMap(null);
  }
};

const isBoundarySaved = mapEntities.some(
  (e) => e.type === "project-boundary" && e.saved
);
const projectBoundary = mapEntities.find(
  (e) => e.type === "project-boundary" && e.saved
);

const boundaryTopLeft =
  projectBoundary ? getPolygonTopLeft(projectBoundary.path) : null;

const boundaryBottom =
  projectBoundary ? getPolygonBottomCenter(projectBoundary.path) : null;

const REQUIRED_PROJECT_UI_ZOOM = 18;
const showProjectUI =
  isBoundarySaved &&
  mapZoom >= REQUIRED_PROJECT_UI_ZOOM;
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
 {/* Neighborhood Filters */}
<div className="absolute top-[60px] left-0 right-0 z-30 px-3">
  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">

    {/* Clear button */}
    <button
      onClick={() => {
        clearNeighborhoodMarkers();
        setNeighborhoodType(null);
      }}
      className="
        flex items-center gap-1
        px-4 py-1.5
        rounded-full
        text-sm font-medium
        bg-white text-gray-700
        border border-gray-200
        shadow-sm
        hover:bg-gray-100
        active:scale-95
        transition
        whitespace-nowrap
      "
    >
      Clear
    </button>

    {neighborhoodFilters.map((f) => (
      <button
        key={f.key}
        onClick={() => loadNeighborhood(f.key)}
        className={`
          flex items-center gap-1
          px-4 py-1.5
          rounded-full
          text-sm font-medium
          border
          shadow-sm
          whitespace-nowrap
          transition
          active:scale-95
          
          ${
            neighborhoodType === f.key
              ? "bg-black text-white border-black"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
          }
        `}
      >
        {f.label}
      </button>
    ))}

  </div>
</div>
</div>

 
                  <GoogleMap
  mapContainerStyle={containerStyle}
  center={mapCenter}
  zoom={16}
  onClick={() => setSelectedPlotId(null)}
  onLoad={(map: google.maps.Map) => {
    mapRef.current = map;
    setMapZoom(map.getZoom() || 16);
  }}
  onZoomChanged={() => {
    if (mapRef.current) {
      setMapZoom(mapRef.current.getZoom() || 16);
    }
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
  <ProjectBoundaryUI
    show={showProjectUI}
    boundaryTopLeft={boundaryTopLeft}
    boundaryBottom={boundaryBottom}
    focusedProject={focusedProject}
  />
  {mapEntities
    .filter(entity => !entity.deleted)
    .map((entity) => {
    const style = getRoadStyle(entity.roadType);
    const plotSize = Math.min(
      Math.abs(entity.path[0].lng - entity.path[1].lng),
      Math.abs(entity.path[0].lat - entity.path[2].lat)
    );
    const labelSize = Math.max(14, Math.min(28, plotSize * 200000));
    const editable =
      aiEditMode &&
      (
        entity.type === "subplot" &&
        entity.aiBoundaryId === activeAiBoundaryId
      ||
        entity.type === "ai-boundary" &&
        entity.id === activeAiBoundaryId
      );
  if (entity.geometryType === "polygon") {
    const center = getPolygonCenter(entity.path);
    return (
      <React.Fragment key={entity.id}>
        <Polygon
          paths={entity.path}
          onLoad={(poly) => {
            attachPolygonListeners(poly, entity.id);
          }}
          editable={editable}
          draggable={editable}
            options={{
            fillColor:
            entity.type === "subplot"
              ? getPlotColor(entity.status)
              : entity.type === "road"
              ? "#374151"
              : entity.type === "ai-boundary"
              ? "#887d93"
              : "#5e6166",
            fillOpacity:
              entity.type === "road"
                ? 0.7
                : entity.type === "subplot"
                ? 1
                : 0.4,
            strokeColor:
            entity.id === selectedPlotId
              ? "#000000"
              : entity.type === "subplot"
              ? getPlotColor(entity.status)
              : entity.type === "project-boundary"
              ? "#374151"
              : entity.type === "ai-boundary"
              ? "#9333ea"
              : "#6b7280",
            strokeOpacity: 1,

            strokeWeight:
              entity.id === selectedPlotId
                ? 4
                : entity.type === "project-boundary"
                ? 3
                : 2,
            zIndex:
              entity.type === "subplot" ? 30 :
              entity.type === "road" ? 20 :
              entity.type === "ai-boundary" ? 10 :
              5,
            clickable: entity.type !== "project-boundary",
          }}
          onClick={() => {

            setSelectedPlotId(entity.id);

            if (entity.type === "ai-boundary") {
              setActiveAiBoundaryId(entity.id);
            }

            if (entity.type === "subplot") {
              setSelectedPlotId(entity.id);

              if (aiEditMode) {
                setEditingPlotId(entity.id);
                setActiveAiBoundaryId(entity.aiBoundaryId || null);
              }
            }

          }}
          
          />

             {/* AUTO PLOT NUMBER LABEL */}
          {entity.type === "subplot" && entity.saved && (
          <OverlayView
            position={center}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div
              style={{
                width: `${labelSize}px`,
                height: `${labelSize}px`,
                borderRadius: "50%",
                background: "black",
                fontSize: `${labelSize * 0.4}px`,
                color: "white",
                fontWeight: 600,
                border: "1px solid #080a0f",
                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {entity.plotNumber}
            </div>
          </OverlayView>
          )}
          {entity.type === "road" && entity.roadName && (
              <OverlayView
                position={center}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    textShadow: "0 0 4px rgba(0,0,0,0.7)",
                    transform: `translate(-50%, -50%) rotate(${getRoadAngle(entity.path)}deg)`,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                  }}
                >
                  {entity.roadName}
                </div>
              </OverlayView>
            )}
                        
          </React.Fragment>
        );
      }


          return null;
          })}
               
                  
              {directions && (
                <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />
              )}

            <DrawingManager
                
              drawingMode={aiEditMode ? null : drawingMode || null}
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
              {selectedPlot && selectedPlot.type === "road" && !selectedPlot.saved && (
                <OverlayView
                  position={getPolygonCenter(selectedPlot.path)}
                  mapPaneName={OverlayView.FLOAT_PANE}
                >
                 <div
                    className="bg-white rounded-xl shadow-xl border p-4"
                    style={{
                      width: "220px",
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "auto",
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-sm font-semibold mb-2">
                      Road Configuration
                    </div>

                    <input
                      placeholder="Enter Road Name"
                      value={selectedPlot.roadName || ""}
                      onChange={(e) =>
                        updatePlotField(selectedPlot.id, "roadName", e.target.value)
                      }
                       onMouseDown={(e) => e.stopPropagation()}
                      className="border rounded-md px-2 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                     {/*  ROTATE BUTTONS */}
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <button
                        onClick={() => rotateRoad(selectedPlot.id, -10)}
                        className="border rounded-md py-2 text-xs hover:bg-gray-100"
                      >
                        ⟲ Rotate
                      </button>

                      <button
                        onClick={() => rotateRoad(selectedPlot.id, 10)}
                        className="border rounded-md py-2 text-xs hover:bg-gray-100"
                      >
                        Rotate ⟳
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        updateEntities(
                          mapEntities.map(e =>
                            e.id === selectedPlot.id
                              ? { ...e, saved: true }
                              : e
                          )
                        );
                        setEditingPlotId(null);
                      }}
                      className="mt-3 w-full bg-blue-600 text-white py-2 rounded-md text-sm hover:bg-blue-700"
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
                          src={typeof project.coverImage === 'object' ? (project.coverImage as any).url : project.coverImage}
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

          <AILayoutConfigModal
            open={aiConfigOpen}
            aiConfig={aiConfig}
            setAiConfig={setAiConfig}
            onClose={() => setAiConfigOpen(false)}
            onGenerate={runAILayout}
          />
          </div>
        );
      });

      ProjectMap.displayName = 'ProjectMap';
      export default ProjectMap;
