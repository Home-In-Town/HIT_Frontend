// homeintown.in/plots/<slug>: the public plot-layout page a buyer opens from a
// shared link (HIT_Mobile "Share plot layout", the visiting card tile).
//
// A server component like /card/[code], because a WhatsApp link preview reads
// only the Open Graph tags in the FIRST HTML response; a client page would show
// the site-wide default title and no image. Read-only: it makes no
// authenticated request (D11, R9.9). Nothing in homeintown.ai is touched (D16).
//
// Two viewers (D9a): a project with a published image plot map (E1 answers 200)
// gets the new SVG viewer; every other project keeps the legacy Google-Map
// viewer exactly as before, so old links and visiting cards still work.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicPlotViewer from '@/components/plots/PublicPlotViewer';
import PublicPlotMapViewer from '@/components/plotmap/PublicPlotMapViewer';
import type { PublicLayout } from '@/types/plots';
import type { PlotMapPayload } from '@/types/plotmap';
import { buildPlotMeta, parsePlotSlug, plotPageUrl } from '@/lib/plotViewer.mjs';
import { buildPlotMapMeta } from '@/lib/plotMap.mjs';
import { getPlotMap } from '@/lib/plotmapPublic';

// Matches the API's `Cache-Control: public, max-age=30`.
export const revalidate = 30;

// Same env var and fallback as src/app/card/[code]/page.tsx: src/lib/api.ts
// falls back to the relative '/api' rewrite, which a server-side fetch cannot resolve.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://sales-website-backend-624770114041.asia-south1.run.app/api';

type Params = { params: Promise<{ slug: string }> };

/**
 * The new plot map, or null when the project has none (or the server gate says
 * no: flag off, unpublished, not enabled). Any non-200 answer, including a
 * failed request, falls through to the legacy fetch: the legacy viewer is the
 * page that existed before, so an outage of the new endpoint must not take
 * every old link down with it.
 */
async function getPlotMapPayload(rawSlug: string): Promise<{ slug: string; payload: PlotMapPayload } | null> {
  const slug = parsePlotSlug(rawSlug);
  if (!slug) return null;
  const r = await getPlotMap(slug, { base: API_URL, revalidate: 30 });
  return r.kind === 'ok' ? { slug, payload: r.payload } : null;
}

/**
 * null for an invalid, unknown or unpublished slug (the backend answers 404).
 * Any other failure throws, so a backend outage shows error.tsx instead of a
 * cached "not found". generateMetadata and the page call this with the same URL
 * and options, so Next runs the request once per render.
 */
async function getLayout(rawSlug: string): Promise<{ slug: string; layout: PublicLayout } | null> {
  const slug = parsePlotSlug(rawSlug);
  if (!slug) return null;
  const res = await fetch(`${API_URL}/public/projects/${encodeURIComponent(slug)}/layout`, { next: { revalidate: 30 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET /public/projects/${slug}/layout failed: ${res.status}`);
  return { slug, layout: (await res.json()) as PublicLayout };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug: raw } = await params;
  const map = await getPlotMapPayload(raw);
  if (map) {
    const m = buildPlotMapMeta(map.payload, map.slug);
    const canonical = plotPageUrl(map.slug);
    return {
      title: m.title,
      description: m.description,
      alternates: { canonical },
      openGraph: {
        type: 'website',
        siteName: 'HomeInTown',
        title: m.title,
        description: m.description,
        url: canonical,
        ...(m.image ? { images: [{ url: m.image }] } : {}),
      },
      twitter: {
        card: m.twitterCard,
        title: m.title,
        description: m.description,
        ...(m.image ? { images: [m.image] } : {}),
      },
    };
  }
  const got = await getLayout(raw);
  const m = buildPlotMeta(got?.layout ?? null, got?.slug ?? '');
  if (m.noindex) return { title: m.title, robots: { index: false } };
  return {
    title: m.title,
    description: m.description,
    alternates: m.canonical ? { canonical: m.canonical } : undefined,
    openGraph: {
      type: 'website',
      siteName: 'HomeInTown',
      title: m.title,
      description: m.description,
      ...(m.canonical ? { url: m.canonical } : {}),
      ...(m.image ? { images: [{ url: m.image }] } : {}),
    },
    twitter: {
      card: m.twitterCard,
      title: m.title,
      description: m.description,
      ...(m.image ? { images: [m.image] } : {}),
    },
  };
}

export default async function PlotsPage({ params }: Params) {
  const { slug: raw } = await params;
  const map = await getPlotMapPayload(raw);
  if (map) {
    const imageUrl = map.payload.image.url;
    let origin: string | null = null;
    try { origin = new URL(imageUrl).origin; } catch { origin = null; }
    return (
      <>
        {origin && <link rel="preconnect" href={origin} crossOrigin="anonymous" />}
        <link rel="preload" as="image" href={imageUrl} />
        <PublicPlotMapViewer slug={map.slug} initial={map.payload} />
      </>
    );
  }
  const got = await getLayout(raw);
  if (!got) notFound();
  const previewUrl = got.layout.overlay?.previewUrl ?? null;
  let r2Origin: string | null = null;
  try { if (previewUrl) r2Origin = new URL(previewUrl).origin; } catch { r2Origin = null; }
  return (
    <>
      {/* Start the image connection and download before the map script finishes (R21.1). */}
      {r2Origin && <link rel="preconnect" href={r2Origin} crossOrigin="anonymous" />}
      {previewUrl && <link rel="preload" as="image" href={previewUrl} />}
      <PublicPlotViewer slug={got.slug} layout={got.layout} variant="full" />
    </>
  );
}
