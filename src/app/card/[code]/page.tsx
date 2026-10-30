// homeintown.in/card/<code>: the public visiting card an agent or builder
// shares from the HIT app (HIT_Mobile My Card → Share link).
//
// A server component, unlike the other public pages (portfolio, projects,
// visit are 'use client'), because the WhatsApp link preview only reads the
// OpenGraph tags in the first HTML response. A client page would show the
// site-wide default title and no photo.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicCard from '@/components/card/PublicCard';
import type { PublicCardData } from '@/components/card/PublicCard';
import { CARD_CODE_RE, publicCardUrl, safeHttpUrl } from '@/lib/vcard.mjs';

// Same env var and fallback as src/app/portfolio/[builderId]/page.tsx.
// src/lib/api.ts falls back to the relative '/api' rewrite, which a server-side
// fetch cannot resolve, so it is not reused here.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sales-website-backend-624770114041.asia-south1.run.app/api';

type Params = { params: Promise<{ code: string }> };

/**
 * null for an invalid, unknown or unpublished code (the backend answers 404).
 * Any other failure throws, so a backend outage shows the error page instead
 * of a cached "not found". generateMetadata and the page call this with the
 * same URL and options, so Next runs the request once per render.
 */
async function getCard(rawCode: string): Promise<PublicCardData | null> {
  let code = '';
  try {
    code = decodeURIComponent(rawCode || '');
  } catch {
    return null; // malformed %-escape
  }
  if (!CARD_CODE_RE.test(code)) return null;
  const res = await fetch(`${API_URL}/public/cards/${code}`, { next: { revalidate: 60 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /public/cards/${code} failed: ${res.status}`);
  const body = (await res.json()) as { card?: PublicCardData };
  return body.card ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const card = await getCard(code);
  if (!card) return { title: 'Card not found | HomeInTown', robots: { index: false } };

  const name = String(card.name || '').trim() || 'HomeInTown member';
  const company = String(card.companyName || '').trim();
  const title = company ? `${name} — ${company}` : name;
  const description = [card.designation, card.address?.city].map((v) => String(v ?? '').trim()).filter(Boolean).join(' · ')
    || `Digital visiting card of ${name} on HomeInTown`;
  // The person first, so the link preview shows a face; the logo otherwise.
  const image = safeHttpUrl(card.photoUrl) || safeHttpUrl(card.logoUrl);
  const url = publicCardUrl(card.code);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      siteName: 'HomeInTown',
      title,
      description,
      url,
      ...(image ? { images: [{ url: image, alt: name }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function CardPage({ params }: Params) {
  const { code } = await params;
  const card = await getCard(code);
  if (!card) notFound();
  return <PublicCard card={card} shareUrl={publicCardUrl(card.code)} />;
}
