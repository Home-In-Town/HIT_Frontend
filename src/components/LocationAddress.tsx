'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';

interface LocationAddressProps {
  lat: number;
  lng: number;
  savedAddress?: string | null;
  className?: string;
  icon?: boolean;
}

export function LocationAddress({ lat, lng, savedAddress, className = "", icon = true }: LocationAddressProps) {
  const [address, setAddress] = useState<string | null>(savedAddress || null);
  const [loading, setLoading] = useState(!savedAddress);

  useEffect(() => {
    if (savedAddress) {
      setAddress(savedAddress);
      setLoading(false);
      return;
    }

    const fetchAddress = async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        const data = await res.json();
        setAddress(data.display_name || "Location resolved");
      } catch {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [lat, lng, savedAddress]);

  if (loading) return <span className="animate-pulse text-[#A8A29E] normal-case tracking-normal">Resolving...</span>;

  return (
    <span className={`inline-flex items-start gap-1.5 ${className}`}>
      {icon && <MapPin className="w-3 h-3 text-[#B45309] shrink-0 mt-0.5" />}
      {/* Inline style ensures address text is ALWAYS readable - never uppercase/squished */}
      <span
        className="break-words"
        style={{ textTransform: 'none', letterSpacing: 'normal' }}
        title={address || ""}
      >
        {address || "Unknown Location"}
      </span>
    </span>
  );
}
