'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';

export default function ProjectLinksPage() {
  const params = useParams();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    if (!slug) return;

    projectsApi.getBySlug(slug).then(setProject);
  }, [slug]);

  if (!project) return <div>Loading...</div>;

  const baseUrl = `${window.location.origin}/visit/${slug}`;
 
  const links = [
    { label: 'Overview', key: '' },
    { label: 'Gallery', key: 'gallery' },
    { label: 'Amenities', key: 'amenities' },
    { label: 'Floor Plans', key: 'floor-plans' },
    { label: 'Booking Status', key: 'booking-status' },
    { label: 'Brochure', key: 'brochure' },
    { label: 'Details', key: 'details' },
     { label: 'Builder Info', key: 'builder-info' },
  ];

  const getLink = (key: string) =>
    key ? `${baseUrl}#${key}` : baseUrl;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied!');
  };

  const share = (link: string) => {
    const msg = encodeURIComponent(
      `Check ${project.name}\n\n${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const getProjectMapLinks = (slug: string) => {
  const base = `${window.location.origin}/visit/${slug}`;

  return [
    {
      label: "Directions",
      url: `${base}#direction`,
      icon: "📍",
    },
    {
      label: "Map View",
      url: `${base}#map`,
      icon: "🗺️",
    },
    {
      label: "Satellite View",
      url: `${base}#satellite`,
      icon: "🛰️",
    },
    {
      label: "3D View",
      url: `${base}#threeD`,
      icon: "🏙️",
    },
    {
      label: "Street View",
      url: `${base}#street`,
      icon: "👁️",
    },
    {
      label: "Nearby Hospitals",
      url: `${base}#hospital`,
      icon: "🏥",
    },
    {
      label: "Nearby Schools",
      url: `${base}#school`,
      icon: "🏫",
    },
    {
      label: "Nearby Metro",
      url: `${base}#metro`,
      icon:  "🚇",
    },
    {
      label: "Nearby Restaurants",
      url: `${base}#restaurant`,
      icon: "🍽️",
    },
     {
      label: "Nearby Markets",
      url: `${base}#market`,
      icon: "🛍️",
    },
    {
      label: "Nearby Petrol Pumps",
      url: `${base}#petrol`,
      icon: "⛽",
    },
    {
      label: "Nearby Bus Stand",
      url: `${base}#bus`,
      icon: "🚌",
    },
    {
      label: "Nearby Railway Station",
      url: `${base}#railway`,
      icon: "🚆",
    },
  ];
};
 const mapLinks = getProjectMapLinks(project.slug);
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">
        Share Links — {project.name}
      </h1>

      <div className="space-y-3">
        {links.map((item) => {
          const link = getLink(item.key);

          return (
            <div
              key={item.label}
              className="border rounded-lg p-3 flex flex-col gap-2"
            >
              <p className="font-medium">{item.label}</p>

              <input
                value={link}
                readOnly
                className="text-xs border p-2 rounded"
              />

              <div className="flex gap-2">
                <button
                  onClick={() => copy(link)}
                  className="text-xs px-3 py-1 bg-gray-200 rounded"
                >
                  Copy
                </button>

                <button
                  onClick={() => share(link)}
                  className="text-xs px-3 py-1 bg-green-500 text-white rounded"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          );
        })}
        
      </div>
      <h2 className="text-lg font-semibold mt-8 mb-3">
  Map Links
</h2>

<div className="space-y-3">
  {mapLinks.map((item) => (
    <div
      key={item.url}
      className="border rounded-lg p-3 flex flex-col gap-2"
    >
      <p className="font-medium flex items-center gap-2">
        <span>{item.icon}</span>
        {item.label}
      </p>

      <input
        value={item.url}
        readOnly
        className="text-xs border p-2 rounded"
      />

      <div className="flex gap-2">
        <button
          onClick={() => copy(item.url)}
          className="text-xs px-3 py-1 bg-gray-200 rounded"
        >
          Copy
        </button>

        <button
          onClick={() => share(item.url)}
          className="text-xs px-3 py-1 bg-green-500 text-white rounded"
        >
          WhatsApp
        </button>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}