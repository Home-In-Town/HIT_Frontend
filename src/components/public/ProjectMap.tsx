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
} from '@react-google-maps/api';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { projectsApi } from '@/lib/api';
import { Project } from '@/types/project';
import SearchFiltersPanel from "./SearchFiltersPanel";
import ProjectsBottomDrawer from './ProjectBottomDrawer';
import { DrawingManager } from '@react-google-maps/api';

type PlotInventory = {
  id: string;
  status: "available" | "sold" | "reserved";
  price: string;
  area: string;
  path: google.maps.LatLngLiteral[];
};


type MapOverlay =
  | google.maps.Polygon
  | google.maps.Rectangle
  | google.maps.Circle
  | google.maps.Polyline;

type Props = {
  lat: number;
  lng: number;
  focusOnly?:boolean;
  logo?: string;
  sqft?: string;
  bhk?: string;
  onMarkerClick?: () => void;
  onDrawerData?: (data: {
    projects: Project[];
    selectedId: string | null;
    open: boolean;
  }) => void;
};

const containerStyle = {
  width: '100%',
  height: '100%',
};


const ProjectMap = forwardRef(({ lat, lng, focusOnly, logo, sqft, bhk, onMarkerClick, onDrawerData }: Props, ref) => {
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
const overlayBounds = {
  north: lat + 0.001,
  south: lat - 0.001,
  east: lng + 0.001,
  west: lng - 0.001,
};

const plotInventory: PlotInventory[] = [
  {
    id: "Plot 7",
    status: "available",
    price: "₹12L",
    area: "1200 sqft",
    path: [
      { lat: lat + 0.0001, lng: lng - 0.0001 },
      { lat: lat + 0.0001, lng: lng },
      { lat: lat, lng: lng },
      { lat: lat, lng: lng - 0.0001 },
    ],
  },
  {
    id: "Plot 12",
    status: "sold",
    price: "₹14L",
    area: "1350 sqft",
    path: [
      { lat: lat, lng: lng },
      { lat: lat, lng: lng + 0.0001 },
      { lat: lat - 0.0001, lng: lng + 0.0001 },
      { lat: lat - 0.0001, lng: lng },
    ],
  },
];
const [selectedPlot, setSelectedPlot] = useState<PlotInventory | null>(null);

const [layoutBounds, setLayoutBounds] = useState<any>(null);

const sourceIcon = 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'; // big map pin
const destinationIcon = 'https://maps.google.com/mapfiles/ms/icons/red-flag.png'; // flag

  const [neighborhoodType, setNeighborhoodType] = useState<string | null>(null);
  const neighborhoodMarkersRef = useRef<google.maps.Marker[]>([]);
const clientMarkerRef = useRef<google.maps.Marker | null>(null);
const projectMarkerRef = useRef<google.maps.Marker | null>(null);
const routePolylineRef = useRef<google.maps.Polyline | null>(null);
const [drawMenuOpen, setDrawMenuOpen] = useState(false);

  const [drawingMode, setDrawingMode] =
  useState<google.maps.drawing.OverlayType | null>(null);

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
const onOverlayComplete = (
  e: google.maps.drawing.OverlayCompleteEvent
) => {
  if (e.type === "polygon") {
  const poly = e.overlay as google.maps.Polygon;

  const path = poly
    .getPath()
    .getArray()
    .map(p => p.toJSON());

  const bounds = getPolygonBounds(path);

  setLayoutBounds({ ...bounds });

}

  const shape = e.overlay as MapOverlay;

  drawingsRef.current.push(shape);

  setSelection(shape);
  setDrawingMode(null);

  shape.addListener('click', () => setSelection(shape));
};


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
    libraries: ['places', 'drawing'],
  });

useEffect(() => {
  projectsApi.getAllPublic().then((data) => {
    setAllProjects(data);

    if (focusOnly) {
      const match = data.find(
        p => p.latitude === lat && p.longitude === lng
      );

      if (match) {
        setFocusedProject(match);
        setVisibleProjects([match]);

        // center map
        mapRef.current?.panTo({
          lat: match.latitude!,
          lng: match.longitude!,
        });

        mapRef.current?.setZoom(17);
      }
    }
  });
}, [focusOnly, lat, lng]);


useEffect(() => {
  if (!focusOnly || allProjects.length === 0) return;

  const match = allProjects.find(
    p => p.latitude === lat && p.longitude === lng
  );

  if (!match) return;

  setFocusedProject(match);
  setVisibleProjects([match]);

  setSelectedProjectId(match.id);
  // force camera sync
  if (mapRef.current) {
    mapRef.current.panTo({
      lat: match.latitude!,
      lng: match.longitude!,
    });
    mapRef.current.setZoom(17);
  }

}, [focusOnly, lat, lng, allProjects]);

useEffect(() => {
  onDrawerData?.({
    projects: showDrawer ? visibleProjects : [],
    selectedId: selectedProjectId,
    open: showDrawer,
  });
}, [showDrawer, visibleProjects, selectedProjectId]);


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


  

  // 🔹 Conditional render only for map, hooks always run
  if (!isLoaded) return <div>Loading map…</div>;

    
  const serializeDrawings = () => {
  return drawingsRef.current.map(shape => {
    if (shape instanceof google.maps.Circle) {
      return {
        type: "circle",
        center: shape.getCenter()?.toJSON(),
        radius: shape.getRadius(),
      };
    }

    if (shape instanceof google.maps.Rectangle) {
      return {
        type: "rectangle",
        bounds: shape.getBounds()?.toJSON(),
      };
    }

    if (shape instanceof google.maps.Polygon) {
      return {
        type: "polygon",
        path: shape.getPath().getArray().map(p => p.toJSON()),
      };
    }

    if (shape instanceof google.maps.Polyline) {
      return {
        type: "polyline",
        path: shape.getPath().getArray().map(p => p.toJSON()),
      };
    }

    return null;
  });
};
const restoreDrawings = (data: any[]) => {
  if (!mapRef.current) return;

  clearAllDrawings();

  data.forEach(item => {
    let shape: MapOverlay | null = null;

    if (item.type === "circle") {
      shape = new google.maps.Circle({
        map: mapRef.current!,
        center: item.center,
        radius: item.radius,
        editable: true,
      });
    }

    if (item.type === "rectangle") {
      shape = new google.maps.Rectangle({
        map: mapRef.current!,
        bounds: item.bounds,
        editable: true,
      });
    }

    if (item.type === "polygon") {
      shape = new google.maps.Polygon({
        map: mapRef.current!,
        paths: item.path,
        editable: true,
      });
    }

    if (item.type === "polyline") {
      shape = new google.maps.Polyline({
        map: mapRef.current!,
        path: item.path,
        editable: true,
      });
    }

    if (shape) {
      drawingsRef.current.push(shape);
      shape.addListener("click", () => setSelection(shape));
    }
  });
};
const saveDrawings = () => {
  const data = serializeDrawings();
  localStorage.setItem("mapDrawings", JSON.stringify(data));
  alert("Drawings saved!");
};
const loadDrawings = () => {
  const raw = localStorage.getItem("mapDrawings");
  if (!raw) return alert("No saved drawings");

  restoreDrawings(JSON.parse(raw));
};
const shareDrawings = async () => {
  const data = JSON.stringify(serializeDrawings());

  try {
    await navigator.clipboard.writeText(data);
    alert("Drawing copied — share anywhere!");
  } catch {
    alert(data);
  }
};

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
    onClick={() => setDrawMenuOpen(v => !v)}
    className="
      bg-[#3E5F16] text-white
      px-4 py-2 rounded-full
      shadow-lg text-sm font-semibold
      hover:opacity-90 transition
    "
  >
    ✏ Draw
  </button>

  {/* Dropdown */}
  {drawMenuOpen && (
    <div
      className="
        mt-2 w-44
        bg-white rounded-xl shadow-xl
        p-2 flex flex-col gap-1
      "
    >

      <button onClick={() => setDrawingMode(google.maps.drawing.OverlayType.POLYGON)}>
        Polygon
      </button>

      <button onClick={() => setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE)}>
        Rectangle
      </button>

      <button onClick={() => setDrawingMode(google.maps.drawing.OverlayType.CIRCLE)}>
        Circle
      </button>

      <button onClick={() => setDrawingMode(google.maps.drawing.OverlayType.POLYLINE)}>
        Line
      </button>

      <hr />

      <button onClick={deleteSelectedShape}>Delete Selected</button>
      <button onClick={clearAllDrawings}>Clear All</button>

      <hr />

      <button onClick={saveDrawings}>Save</button>
      <button onClick={loadDrawings}>Load</button>
      <button onClick={shareDrawings}>Share</button>

    </div>
  )}
</div>

   
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={{ lat, lng }}
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
                        gestureHandling:"greedy",
                        draggable: true,

                      tilt: 45,
                    }}
                    

                  >
                 {layoutBounds && (
  <GroundOverlay
    url="/sc.png"
    bounds={layoutBounds}
    opacity={0.8}
  />
)}
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
{selectedPlot && (
  <OverlayView
    position={selectedPlot.path[0]}
    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
  >
    <div className="
      bg-white rounded-xl shadow-xl
      p-3 text-xs w-40
      -translate-x-1/2 -translate-y-full
    ">
      <p className="font-semibold">{selectedPlot.id}</p>
      <p>{selectedPlot.area}</p>
      <p>{selectedPlot.price}</p>

      <p className={`
        mt-1 font-medium
        ${
          selectedPlot.status === "sold"
            ? "text-red-600"
            : selectedPlot.status === "reserved"
            ? "text-yellow-600"
            : "text-green-600"
        }
      `}>
        {selectedPlot.status.toUpperCase()}
      </p>

      <button
        onClick={() => setSelectedPlot(null)}
        className="mt-2 text-gray-500 text-[10px]"
      >
        Close
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
