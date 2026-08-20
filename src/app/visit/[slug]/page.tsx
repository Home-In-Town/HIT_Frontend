'use client';

import { useParams } from 'next/navigation';
import { useEffect } from 'react';

export default function VisitRedirectPage() {
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    if (slug) {
      // Redirect to homeintown.ai with the same slug
      window.location.href = `https://homeintown.ai/visit/${slug}`;
    }
  }, [slug]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f9fafb' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>🏠</div>
        <p style={{ fontSize: '14px', color: '#666' }}>Redirecting to HomeInTown.ai...</p>
      </div>
    </div>
  );
}
