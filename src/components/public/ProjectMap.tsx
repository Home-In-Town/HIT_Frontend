'use client';

import {
  GoogleMap,
  Autocomplete,
  OverlayView,
  DirectionsRenderer,
  useJsApiLoader,
} from '@react-google-maps/api';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

type Props = {
  lat: number;
  lng: number;
  logo?: string;
  sqft?: string;
  bhk?: string;
};

const containerStyle = {
  width: '100%',
  height: '100%',
};

const ProjectMap = forwardRef(({ lat, lng, logo, sqft, bhk }: Props, ref) => {
  // 🔹 Always run hooks first
  const mapRef = useRef<google.maps.Map | null>(null);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const is3D = useRef(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

  // 🔹 Expose functions via ref
  useImperativeHandle(ref, () => ({
    getDirections: () => {
      navigator.geolocation.getCurrentPosition((pos) => {
        const service = new google.maps.DirectionsService();
        service.route(
          {
            origin: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            destination: { lat, lng },
            travelMode: google.maps.TravelMode.DRIVING,
          },
          (res) => res && setDirections(res)
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

     

set3DView: () => {
  if (!mapRef.current) return;

  if (!is3D.current) {
    mapRef.current.setZoom(18);
    mapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
    setTimeout(() => mapRef.current?.setTilt(45), 300);
  } else {
    mapRef.current.setTilt(0);
    mapRef.current.setZoom(16);
    mapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
  }

  is3D.current = !is3D.current;
}

    }));

  // 🔹 Conditional render only for map, hooks always run
  if (!isLoaded) return <div>Loading map…</div>;

  return (
    <div className="relative h-full w-full">
      <Autocomplete onLoad={setAutocomplete}>
        <input
          placeholder="Search area"
          className="absolute top-4 left-1/2 z-10 w-[280px] -translate-x-1/2
                     rounded-lg border bg-white px-4 py-2 text-sm shadow-md"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && autocomplete) {
              const place = autocomplete.getPlace();
              if (place.geometry?.location) {
                mapRef.current?.panTo(place.geometry.location);
                mapRef.current?.setZoom(16);
              }
            }
          }}
        />
      </Autocomplete>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat, lng }}
        zoom={16}
        onLoad={(map: google.maps.Map) => {
          mapRef.current = map;
        }}

        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          tilt: 45,
        }}
      >
        {directions && (
          <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />
        )}

        <OverlayView position={{ lat, lng }} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
          <div className="-translate-x-1/2 -translate-y-full">
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-lg">
                {logo && <img src={logo} className="h-8 w-10 rounded-md object-cover" />}
                <div className="text-[11px] font-semibold">
                  <div>{sqft}</div>
                  <div className="text-gray-500">{bhk}</div>
                </div>
              </div>
              <div className="h-2 w-2 rotate-45 bg-white shadow" />
            </div>
          </div>
        </OverlayView>
      </GoogleMap>
    </div>
  );
});

ProjectMap.displayName = 'ProjectMap';
export default ProjectMap;
