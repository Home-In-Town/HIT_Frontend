// Public visiting card at homeintown.in/card/<code> (src/app/card/[code]).
//
// Server component: the card, contact buttons and projects are plain HTML, so
// they render without JS and WhatsApp/Google see the full page. Only Save
// contact and Share need the browser and live in CardActions ('use client').
//
// The three templates copy HIT_Mobile src/components/card/VisitingCard.tsx
// (PALETTES, accent bar / top line, centred Minimal, avatar = logo then photo)
// so the card a buyer opens matches the one the agent designed in the app.
//
// Images are plain <img>: photo/logo/cover URLs come from user uploads on
// hosts that next.config.ts images.remotePatterns may not list, and next/image
// throws on an unlisted host.
/* eslint-disable @next/next/no-img-element */
import { BadgeCheck, Facebook, Globe, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import Link from 'next/link';
import { FaWhatsapp } from 'react-icons/fa';
import { safeHttpUrl, telHref, whatsAppUrl } from '@/lib/vcard.mjs';
import CardActions from './CardActions';

export type CardTemplate = 'classic' | 'dark' | 'minimal';

export interface PublicCardProject {
  slug: string;
  projectName: string;
  city: string | null;
  location: string | null;
  propertyType: string | null;
  projectStatus: string | null;
  coverImage: string | null;
  startingPrice: number | null;
  bhkOptions: string[];
}

/** HIT_Backend controllers/cardController.js toPublicCard. */
export interface PublicCardData {
  code: string;
  template: CardTemplate;
  name: string;
  designation: string | null;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  reraAgentNo: string | null;
  social: { instagram: string | null; facebook: string | null; youtube: string | null } | null;
  photoUrl: string | null;
  logoUrl: string | null;
  address: { line: string | null; city: string | null; state: string | null; pinCode: string | null } | null;
  verified: boolean;
  projects: PublicCardProject[];
}

interface Palette { bg: string; border: string; name: string; sub: string; text: string; icon: string; accent: string; divider: string }

// HIT_Mobile src/theme.ts colours: brand #B45309, ink #2A2A2A, night #1C1917,
// night2 #292524, line #E7E5E4, muted2 #57534E.
const PALETTES: Record<CardTemplate, Palette> = {
  classic: { bg: '#FFFFFF', border: '#E7E5E4', name: '#2A2A2A', sub: '#57534E', text: '#2A2A2A', icon: '#B45309', accent: '#B45309', divider: '#E7E5E4' },
  dark: { bg: '#1C1917', border: '#292524', name: '#FFFFFF', sub: 'rgba(255,255,255,0.65)', text: '#FFFFFF', icon: '#B45309', accent: '#B45309', divider: 'rgba(255,255,255,0.15)' },
  minimal: { bg: '#FFFFFF', border: '#E7E5E4', name: '#2A2A2A', sub: '#57534E', text: '#2A2A2A', icon: '#57534E', accent: '#2A2A2A', divider: '#E7E5E4' },
};

const VERIFIED_GREEN = '#16A34A';

const clean = (v: string | null | undefined) => String(v ?? '').trim();

/** ₹ in lakh / crore, en-IN grouping: 4500000 → "₹45 Lakh", 12500000 → "₹1.25 Cr". */
export function formatInrPrice(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  const fmt = (x: number) => x.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (n >= 1e7) return `₹${fmt(n / 1e7)} Cr`;
  if (n >= 1e5) return `₹${fmt(n / 1e5)} Lakh`;
  return `₹${fmt(n)}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cardAddress(card: Pick<PublicCardData, 'address'>): string {
  const a = card.address;
  return a ? [a.line, a.city, a.state, a.pinCode].map(clean).filter(Boolean).join(', ') : '';
}

export default function PublicCard({ card, shareUrl }: { card: PublicCardData; shareUrl: string }) {
  const template: CardTemplate = PALETTES[card.template] ? card.template : 'classic';
  const p = PALETTES[template];
  const centered = template === 'minimal';

  const name = clean(card.name) || 'HomeInTown member';
  const designation = clean(card.designation);
  const company = clean(card.companyName);
  const address = cardAddress(card);
  const rera = clean(card.reraAgentNo);
  const email = EMAIL_RE.test(clean(card.email)) ? clean(card.email) : '';
  const website = safeHttpUrl(card.website);
  const tel = telHref(card.phone);
  const wa = whatsAppUrl(card.phone);
  const avatarUrl = safeHttpUrl(card.logoUrl) || safeHttpUrl(card.photoUrl);

  const rows: { key: string; Icon: typeof Phone; value: string; href?: string }[] = [
    { key: 'phone', Icon: Phone, value: clean(card.phone), href: tel || undefined },
    { key: 'email', Icon: Mail, value: email, href: email ? `mailto:${email}` : undefined },
    { key: 'website', Icon: Globe, value: website ? website.replace(/^https?:\/\//, '').replace(/\/$/, '') : '', href: website || undefined },
    { key: 'address', Icon: MapPin, value: address },
  ].filter((r) => r.value);

  const socials = [
    { key: 'instagram', label: 'Instagram', Icon: Instagram, href: safeHttpUrl(card.social?.instagram) },
    { key: 'facebook', label: 'Facebook', Icon: Facebook, href: safeHttpUrl(card.social?.facebook) },
    { key: 'youtube', label: 'YouTube', Icon: Youtube, href: safeHttpUrl(card.social?.youtube) },
  ].filter((s): s is typeof s & { href: string } => !!s.href);

  const projects = (card.projects || []).filter((pr) => clean(pr.slug));

  const btn = 'flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition active:scale-[0.98]';
  const btnPrimary = `${btn} bg-[#B45309] text-white hover:bg-[#92400E]`;
  const btnOutline = `${btn} border border-[#E7E5E4] bg-white text-[#2A2A2A] hover:border-[#B45309]/50 hover:text-[#B45309]`;

  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <section
          data-template={template}
          className="relative overflow-hidden rounded-2xl border shadow-sm"
          style={{ backgroundColor: p.bg, borderColor: p.border }}
        >
          {template === 'classic' && <div className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: p.accent }} />}
          {template === 'dark' && <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: p.accent }} />}

          <div className={template === 'classic' ? 'p-5 pl-7' : 'p-5'}>
            <div className={centered ? 'flex flex-col items-center gap-3 text-center' : 'flex items-center gap-3'}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
              ) : (
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold text-white"
                  style={{ backgroundColor: p.accent }}
                  aria-hidden
                >
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={centered ? 'min-w-0' : 'min-w-0 flex-1'}>
                <h1 className={`flex items-center gap-1.5 ${centered ? 'justify-center' : ''}`}>
                  <span className="truncate text-xl font-extrabold" style={{ color: p.name }}>{name}</span>
                  {card.verified && (
                    <BadgeCheck data-verified className="h-5 w-5 shrink-0" color={VERIFIED_GREEN} aria-label="Verified" />
                  )}
                </h1>
                {!!designation && <p className="text-sm font-semibold" style={{ color: p.sub }}>{designation}</p>}
                {!!company && (
                  <p className="text-sm font-bold" style={{ color: template === 'dark' ? p.accent : p.text }}>{company}</p>
                )}
              </div>
            </div>

            {(rows.length > 0 || !!rera) && (
              <>
                <div className="my-4 h-px" style={{ backgroundColor: p.divider }} />
                <ul className={`flex flex-col gap-2 ${centered ? 'items-center text-center' : ''}`}>
                  {rows.map(({ key, Icon, value, href }) => (
                    <li key={key} className="flex items-start gap-2 text-sm" style={{ color: p.text }}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" color={p.icon} aria-hidden />
                      {href ? (
                        <a href={href} className="break-words hover:underline" target={key === 'website' ? '_blank' : undefined} rel={key === 'website' ? 'noopener noreferrer' : undefined}>
                          {value}
                        </a>
                      ) : (
                        <span className="break-words">{value}</span>
                      )}
                    </li>
                  ))}
                  {!!rera && (
                    <li className="text-xs font-semibold" style={{ color: p.sub }}>RERA Agent No: {rera}</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </section>

        <nav aria-label="Contact" className="grid grid-cols-2 gap-2">
          {tel && <a href={tel} className={btnPrimary}><Phone className="h-4 w-4" aria-hidden /> Call</a>}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#16A34A] text-white hover:bg-[#15803D]`}>
              <FaWhatsapp className="h-4 w-4" aria-hidden /> WhatsApp
            </a>
          )}
          {email && <a href={`mailto:${email}`} className={btnOutline}><Mail className="h-4 w-4" aria-hidden /> Email</a>}
          {website && (
            <a href={website} target="_blank" rel="noopener noreferrer" className={btnOutline}>
              <Globe className="h-4 w-4" aria-hidden /> Website
            </a>
          )}
          <CardActions
            card={{
              code: card.code, name: card.name, designation: card.designation, companyName: card.companyName,
              phone: card.phone, email: card.email, website: card.website, reraAgentNo: card.reraAgentNo, address: card.address,
            }}
            shareUrl={shareUrl}
            className={btnOutline}
          />
        </nav>

        {socials.length > 0 && (
          <div className="flex justify-center gap-3">
            {socials.map(({ key, label, Icon, href }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E7E5E4] bg-white text-[#57534E] hover:border-[#B45309]/50 hover:text-[#B45309]"
              >
                <Icon className="h-5 w-5" aria-hidden />
              </a>
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <section aria-labelledby="card-projects">
            <h2 id="card-projects" className="mb-3 text-base font-extrabold text-[#2A2A2A]">Projects</h2>
            <div className="grid grid-cols-2 gap-3">
              {projects.map((pr) => {
                const cover = safeHttpUrl(pr.coverImage);
                const price = formatInrPrice(pr.startingPrice);
                const place = clean(pr.city) || clean(pr.location);
                return (
                  <Link
                    key={pr.slug}
                    href={`/visit/${encodeURIComponent(pr.slug)}`}
                    data-project={pr.slug}
                    className="overflow-hidden rounded-xl border border-[#E7E5E4] bg-white shadow-sm transition hover:border-[#B45309]/50"
                  >
                    {cover ? (
                      <img src={cover} alt={pr.projectName} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-[#FAF7F2] text-2xl font-extrabold text-[#B45309]">
                        {clean(pr.projectName).charAt(0).toUpperCase() || '·'}
                      </div>
                    )}
                    <div className="p-2.5">
                      <p className="truncate text-sm font-bold text-[#2A2A2A]">{pr.projectName}</p>
                      {!!place && <p className="truncate text-xs text-[#57534E]">{place}</p>}
                      {price && <p className="mt-1 text-xs font-bold text-[#B45309]">Starting {price}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <p className="pt-2 text-center text-xs text-[#A8A29E]">
          Digital visiting card on <Link href="/" className="font-semibold text-[#B45309]">HomeInTown</Link>
        </p>
      </div>
    </main>
  );
}
