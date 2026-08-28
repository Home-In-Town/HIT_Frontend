'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { referralsApi, ReferralInfo } from '@/lib/api';

// A single lesson/chapter in the course
interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  readTime: string;
  sections: { heading: string; body: string }[];
  keyTakeaways: string[];
}

// The step-wise "book" — the playbook to get leads faster
const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'Foundation — Kaun sa lead chahiye',
    subtitle: 'Define your ideal buyer before you chase anyone',
    readTime: '6 min',
    sections: [
      {
        heading: 'Ideal Customer Profile (ICP)',
        body: 'Har project ke liye ek clear buyer profile banao — budget range, family size, buying intent (self-use vs investment), aur location preference. Jab aap ICP clear rakhte ho, to aapka har message us buyer ko personally relevant lagta hai.',
      },
      {
        heading: 'Kahan milega ye buyer',
        body: 'ICP ke hisaab se channel choose karo. Investment buyers LinkedIn aur referral se aate hain; end-users Meta ads, Google search aur walk-ins se. Ek channel pe 30 din focus karo, phir measure karo.',
      },
    ],
    keyTakeaways: [
      'Ek project = ek clear buyer profile',
      'Budget, intent aur location teeno define karo',
      'Channel ko ICP se match karo, random mat spray karo',
    ],
  },
  {
    id: 2,
    title: 'Lead Magnets — Log khud aayenge',
    subtitle: 'Create irresistible reasons for buyers to raise their hand',
    readTime: '8 min',
    sections: [
      {
        heading: 'Value-first offer',
        body: 'Direct "flat lelo" pitch chalta nahi. Instead ek free value do — "Is area ke top 5 projects ka price comparison PDF", ya "EMI calculator + loan eligibility check". Log value ke liye apna number dete hain.',
      },
      {
        heading: 'Landing page + WhatsApp funnel',
        body: 'Ek simple landing page banao jahan buyer form bhare, aur turant WhatsApp pe auto-reply jaaye. Pehle 90 second sabse important — instant response se 5x zyada conversion hota hai.',
      },
    ],
    keyTakeaways: [
      'Pitch se pehle value do',
      'Free PDF / calculator = number capture',
      '90 second ke andar respond karo',
    ],
  },
  {
    id: 3,
    title: 'Outreach Engine — Roz naye leads',
    subtitle: 'A repeatable daily system so leads never dry up',
    readTime: '10 min',
    sections: [
      {
        heading: 'Daily 3-touch rule',
        body: 'Har din: 10 naye cold contacts, 10 warm follow-ups, aur 5 referral asks. Ye discipline consistency deta hai. Ek din 100 karke fir hafta band karna kaam nahi karta.',
      },
      {
        heading: 'Script + timing',
        body: 'Har touchpoint ka ek script rakho aur best time pe bhejo (subah 10-11, shaam 6-8). Personalize karo — naam, project aur unke pichle sawal use karo.',
      },
    ],
    keyTakeaways: [
      'Roz 10 cold + 10 warm + 5 referral',
      'Consistency > intensity',
      'Sahi time + personalized script',
    ],
  },
  {
    id: 4,
    title: 'Referral Machine — Leads multiply karo',
    subtitle: 'Turn every happy client into 3 new leads',
    readTime: '7 min',
    sections: [
      {
        heading: 'Referral loop',
        body: 'Har closed deal ke baad turant referral maango — jab khushi peak pe ho. "Aapke jaise 2 aur log jinko ghar chahiye?" Simple ask, right timing.',
      },
      {
        heading: 'Incentivize karo',
        body: 'Referral dene wale ko kuch do — gift card, cashback ya free consultation. Trackable referral link do taaki attribution clear rahe.',
      },
    ],
    keyTakeaways: [
      'Deal close hote hi referral maango',
      'Peak-happiness pe ask karo',
      'Incentive + trackable link',
    ],
  },
  {
    id: 5,
    title: 'Convert Faster — Lead se deal tak',
    subtitle: 'Shorten the journey from enquiry to booking',
    readTime: '9 min',
    sections: [
      {
        heading: 'Speed-to-lead',
        body: 'Jitni jaldi respond karoge, utni jaldi close hoga. Site visit 48 ghante ke andar fix karne ki koshish karo — momentum tabhi sabse zyada hota hai.',
      },
      {
        heading: 'Objection handling',
        body: 'Top 5 objections (price, location, loan, timing, trust) ke ready answers rakho. Har objection ka ek proof point ho — testimonial, data ya comparison.',
      },
    ],
    keyTakeaways: [
      'Site visit 48 ghante ke andar',
      'Top 5 objections ke ready jawab',
      'Har jawab ke saath proof do',
    ],
  },
];

type UnlockMethod = 'pay' | 'refer';

const PRICE = 25000;

export default function LeadCourse() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<UnlockMethod | null>(null);
  const [copied, setCopied] = useState(false);
  const [openChapter, setOpenChapter] = useState<number | null>(1);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await referralsApi.getMine();
      setInfo(data);
      // Auto-open the referral panel if that's the path toward unlocking
      if (!data.courseUnlocked) setMethod('refer');
    } catch {
      setLoadError('Could not load your referral details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unlocked = !!info?.courseUnlocked;
  const REFERRAL_GOAL = info?.goal ?? 10;
  const referralCount = info?.count ?? 0;

  const handleCopyLink = async () => {
    if (!info?.referralLink) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — no-op; the link is visible for manual copy
    }
  };

  const handleShareWhatsApp = () => {
    if (!info?.referralLink) return;
    const msg = `Join me on HomeInTown 🏡 — India's smart real-estate platform.\nSign up with my link: ${info.referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-8 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-56 mb-4" />
        <div className="h-24 bg-gray-100 rounded-xl mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-28 bg-gray-100 rounded-2xl" />
          <div className="h-28 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (loadError) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm p-8 text-center">
        <p className="text-sm font-semibold text-[#2A2A2A]">{loadError}</p>
        <button onClick={load} className="mt-3 text-xs font-bold text-[#B45309] hover:underline">Try again</button>
      </div>
    );
  }

  // ── Locked state: paywall / referral wall ──
  if (!unlocked) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-[#1C1917] to-[#292524] p-6 sm:p-8 md:p-10 text-white overflow-hidden">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-[#B45309]/20 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B45309]/20 border border-[#B45309]/30 text-[10px] font-bold uppercase tracking-widest text-[#F5C77E] mb-4">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Premium Course
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold font-serif tracking-tight">Learn How to Get Leads Faster</h2>
            <p className="text-xs sm:text-sm text-white/70 mt-2 leading-relaxed">
              A step-by-step playbook used by top-performing agents — from building a lead magnet to closing 3x faster.
              Unlock the full book-style course below.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 sm:mt-5 text-[11px] sm:text-xs text-white/60">
              <span className="flex items-center gap-1.5"><Dot /> {CHAPTERS.length} chapters</span>
              <span className="flex items-center gap-1.5"><Dot /> Step-by-step</span>
              <span className="flex items-center gap-1.5"><Dot /> Scripts & templates</span>
            </div>
          </div>
        </div>

        {/* Unlock options */}
        <div className="p-4 sm:p-6 md:p-8">
          <p className="text-xs font-bold text-[#A8A29E] uppercase tracking-widest mb-4 text-center">
            Choose how to unlock
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Pay option — coming soon */}
            <div className="relative text-left p-5 rounded-2xl border-2 border-[#E7E5E4] bg-[#FAF7F2]/60 opacity-80 cursor-not-allowed">
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-[#E7E5E4] text-[9px] font-bold text-[#57534E] uppercase tracking-wider">Coming soon</span>
              <div className="w-10 h-10 rounded-xl bg-[#B45309]/10 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <p className="text-lg font-bold text-[#2A2A2A]">Pay ₹{PRICE.toLocaleString('en-IN')}</p>
              <p className="text-xs text-[#A8A29E] mt-1">One-time payment for instant access. Online payment is launching soon.</p>
            </div>

            {/* Refer option */}
            <button
              onClick={() => setMethod('refer')}
              className={`text-left p-5 rounded-2xl border-2 transition-all ${
                method === 'refer' ? 'border-[#B45309] bg-[#B45309]/5' : 'border-[#E7E5E4] hover:border-[#B45309]/40'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-xl bg-[#B45309]/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87" /></svg>
                </div>
                {method === 'refer' && <CheckBadge />}
              </div>
              <p className="text-lg font-bold text-[#2A2A2A]">Refer {REFERRAL_GOAL} people</p>
              <p className="text-xs text-[#A8A29E] mt-1">Invite {REFERRAL_GOAL} people to HomeInTown. Free access when all {REFERRAL_GOAL} join.</p>
            </button>
          </div>

          {/* Referral panel — real data */}
          {method === 'refer' && info && (
            <div className="mt-6 space-y-4">
              {/* Progress */}
              <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#E7E5E4]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-[#2A2A2A]">Referral progress</span>
                  <span className="text-sm font-bold text-[#B45309]">{referralCount} / {REFERRAL_GOAL} joined</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#E7E5E4] overflow-hidden mb-3">
                  <div className="h-full bg-[#B45309] transition-all duration-300" style={{ width: `${Math.min(100, (referralCount / REFERRAL_GOAL) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-[#57534E]">
                  {info.remaining > 0
                    ? `${info.remaining} more ${info.remaining === 1 ? 'person needs' : 'people need'} to join to unlock the course for free.`
                    : 'Goal reached — unlocking your course…'}
                </p>
              </div>

              {/* Share link */}
              <div className="p-5 rounded-2xl bg-white border border-[#E7E5E4]">
                <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-2">Your referral link</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4] min-w-0">
                    <span className="text-xs font-mono text-[#57534E] truncate">{info.referralLink}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCopyLink} className="px-4 py-2.5 rounded-xl border border-[#E7E5E4] text-xs font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all">
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-opacity">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" /></svg>
                      Share
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-[#A8A29E] mt-2">Your code: <span className="font-bold text-[#57534E]">{info.referralCode}</span></p>
              </div>

              {/* Referred people history */}
              <div className="p-5 rounded-2xl bg-white border border-[#E7E5E4]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">People you referred</p>
                  <button onClick={load} className="text-[10px] font-bold text-[#B45309] hover:underline">Refresh</button>
                </div>
                {info.referrals.length === 0 ? (
                  <p className="text-xs text-[#A8A29E] italic py-4 text-center">No referrals yet. Share your link to get started.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {info.referrals.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                        <div className="w-9 h-9 rounded-full bg-[#B45309]/10 flex items-center justify-center text-xs font-bold text-[#B45309] shrink-0">
                          {r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#2A2A2A] truncate">{r.name}</p>
                          <p className="text-[11px] text-[#A8A29E]">{r.phone} · {new Date(r.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${r.joined ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                          {r.joined ? 'Joined' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!method && (
            <p className="text-xs text-[#A8A29E] text-center mt-6">Select an option above to continue.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Unlocked state: the step-wise book ──
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
      {/* Book header */}
      <div className="flex items-center gap-3 p-5 border-b border-[#E7E5E4] bg-gradient-to-r from-[#B45309]/5 to-transparent">
        <div className="w-11 h-11 rounded-xl bg-[#B45309] flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[#2A2A2A] font-serif">Get Leads Faster — The Playbook</h3>
          <p className="text-xs text-[#A8A29E]">Read step by step. {CHAPTERS.length} chapters · unlocked</p>
        </div>
      </div>

      {/* Table of contents + chapters */}
      <div className="p-5 space-y-3">
        {CHAPTERS.map((ch) => {
          const isOpen = openChapter === ch.id;
          return (
            <div key={ch.id} className={`rounded-xl border transition-all ${isOpen ? 'border-[#B45309]/30 bg-[#FAF7F2]' : 'border-[#E7E5E4] bg-white'}`}>
              {/* Chapter header */}
              <button
                onClick={() => setOpenChapter(isOpen ? null : ch.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#B45309] text-white flex items-center justify-center text-sm font-bold shrink-0">{ch.id}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#2A2A2A]">{ch.title}</p>
                  <p className="text-xs text-[#A8A29E] truncate">{ch.subtitle}</p>
                </div>
                <span className="text-[10px] font-bold text-[#A8A29E] shrink-0">{ch.readTime}</span>
                <svg className={`w-4 h-4 text-[#A8A29E] shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* Chapter body */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-[#E7E5E4] pt-4">
                  {ch.sections.map((sec, i) => (
                    <div key={i}>
                      <p className="text-sm font-bold text-[#2A2A2A] mb-1">{sec.heading}</p>
                      <p className="text-sm text-[#57534E] leading-relaxed">{sec.body}</p>
                    </div>
                  ))}

                  {/* Key takeaways */}
                  <div className="rounded-lg bg-white border border-[#E7E5E4] p-3">
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Key takeaways</p>
                    <ul className="space-y-1.5">
                      {ch.keyTakeaways.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#2A2A2A]">
                          <svg className="w-3.5 h-3.5 text-[#B45309] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Chapter nav */}
                  <div className="flex justify-between pt-1">
                    <button
                      onClick={() => setOpenChapter(ch.id > 1 ? ch.id - 1 : ch.id)}
                      disabled={ch.id === 1}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#57534E] border border-[#E7E5E4] disabled:opacity-40 hover:border-[#B45309]/40 hover:text-[#B45309] transition-all"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() => setOpenChapter(ch.id < CHAPTERS.length ? ch.id + 1 : ch.id)}
                      disabled={ch.id === CHAPTERS.length}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#B45309] disabled:opacity-40 hover:bg-[#92400E] transition-all"
                    >
                      Next chapter →
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Small helpers
function Dot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-[#B45309] inline-block" />;
}

function CheckBadge() {
  return (
    <span className="w-6 h-6 rounded-full bg-[#B45309] flex items-center justify-center">
      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
    </span>
  );
}
