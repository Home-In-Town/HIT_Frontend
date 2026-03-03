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
    </div>
  );
}