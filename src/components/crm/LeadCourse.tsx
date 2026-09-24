'use client';
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { referralsApi, ReferralInfo } from '@/lib/api';
import { useAuth } from '@/lib/authContext';

// A single lesson/chapter in the course
interface Chapter {
  id: number;
  title: string;
  subtitle: string;
  readTime: string;
  sections: { heading: string; body: string }[];
  keyTakeaways: string[];
}

// The step-wise "book" — the playbook to get leads faster (initial/default content)
const DEFAULT_CHAPTERS: Chapter[] = [
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

const FULL_PRICE = 100000;   // ₹1 lakh course fee
const PREBOOK_PRICE = 10000; // ₹10k to prebook a seat

// Format an amount in Indian rupees (e.g. 100000 -> "₹1,00,000")
const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function LeadCourse() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [method, setMethod] = useState<UnlockMethod | null>(null);
  const [copied, setCopied] = useState(false);
  const [openChapter, setOpenChapter] = useState<number | null>(1);

  // Editable course content (admin can edit; changes held in state)
  const [chapters, setChapters] = useState<Chapter[]>(DEFAULT_CHAPTERS);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    // Admins get free access — no need to fetch referral state.
    if (isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await referralsApi.getMine();
      setInfo(data);
    } catch {
      setLoadError('Could not load your referral details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  // Admins get the course for free (always unlocked); others need referral/payment.
  const unlocked = isAdmin || !!info?.courseUnlocked;
  const REFERRAL_GOAL = info?.goal ?? 10;
  const referralCount = info?.count ?? 0;

  // ── Editing helpers (admin) ──
  const updateChapterField = (id: number, field: 'title' | 'subtitle' | 'readTime', value: string) => {
    setChapters(prev => prev.map(c => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const updateSection = (chId: number, idx: number, field: 'heading' | 'body', value: string) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, sections: c.sections.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
      : c));
  };
  const addSection = (chId: number) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, sections: [...c.sections, { heading: 'New section', body: '' }] }
      : c));
  };
  const removeSection = (chId: number, idx: number) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, sections: c.sections.filter((_, i) => i !== idx) }
      : c));
  };
  const updateTakeaway = (chId: number, idx: number, value: string) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, keyTakeaways: c.keyTakeaways.map((t, i) => (i === idx ? value : t)) }
      : c));
  };
  const addTakeaway = (chId: number) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, keyTakeaways: [...c.keyTakeaways, 'New takeaway'] }
      : c));
  };
  const removeTakeaway = (chId: number, idx: number) => {
    setChapters(prev => prev.map(c => c.id === chId
      ? { ...c, keyTakeaways: c.keyTakeaways.filter((_, i) => i !== idx) }
      : c));
  };
  const addChapter = () => {
    setChapters(prev => {
      const nextId = prev.length ? Math.max(...prev.map(c => c.id)) + 1 : 1;
      const next: Chapter = { id: nextId, title: 'New Chapter', subtitle: 'Add a subtitle', readTime: '5 min', sections: [{ heading: 'Section', body: '' }], keyTakeaways: ['Key takeaway'] };
      return [...prev, next];
    });
  };
  const removeChapter = (id: number) => {
    setChapters(prev => prev.filter(c => c.id !== id));
    if (openChapter === id) setOpenChapter(null);
  };

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

  // ── Locked state: "Earn 1 Cr Per Year" landing page ──
  if (!unlocked) {
    const scrollToUnlock = () => {
      document.getElementById('earn-unlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
      <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
        {/* ═══ HERO ═══ */}
        <div className="relative bg-gradient-to-br from-[#1C1917] via-[#231C15] to-[#292524] px-5 py-12 sm:px-10 sm:py-16 text-white overflow-hidden text-center">
          {/* Animated glow blobs */}
          <motion.div
            className="absolute -top-16 -right-10 w-72 h-72 bg-[#B45309]/25 rounded-full blur-3xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute -bottom-20 -left-10 w-72 h-72 bg-[#F5C77E]/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <div className="relative z-10 max-w-3xl mx-auto">
            {/* Coming soon badge — pulsing */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F5C77E]/15 border border-[#F5C77E]/40 text-[11px] font-bold uppercase tracking-widest text-[#F5C77E] mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C77E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5C77E]" />
              </span>
              Coming Soon
            </motion.div>

            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="block mx-auto w-fit items-center gap-1.5 px-3 py-1 rounded-full bg-[#B45309]/20 border border-[#B45309]/30 text-[10px] font-bold uppercase tracking-widest text-[#F5C77E] mb-5"
            >
              HomeInTown Masterclass
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="text-3xl sm:text-5xl font-bold font-serif tracking-tight leading-[1.1]"
            >
              Earn{' '}
              <motion.span
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#F5C77E] via-[#E5A94E] to-[#B45309]"
                style={{ backgroundSize: '200% auto' }}
                animate={{ backgroundPosition: ['0% center', '200% center'] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              >
                ₹1 Crore
              </motion.span>{' '}
              Per Year
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.28 }}
              className="text-sm sm:text-lg text-white/75 mt-4 leading-relaxed max-w-2xl mx-auto"
            >
              The exact real-estate lead &amp; sales system top agents use to close ₹1 Cr+ in commissions every year — turned into a step-by-step course you can start today.
            </motion.p>

            {/* Headline stats — staggered */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 max-w-lg mx-auto">
              {[
                { big: '₹1 Cr+', small: 'Yearly earning potential' },
                { big: `${chapters.length}`, small: 'Step-by-step modules' },
                { big: '3x', small: 'Faster deal closing' },
              ].map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 + i * 0.12 }}
                  whileHover={{ y: -4, scale: 1.03 }}
                  className="rounded-2xl bg-white/5 border border-white/10 py-3 px-2"
                >
                  <p className="text-lg sm:text-2xl font-bold text-[#F5C77E]">{s.big}</p>
                  <p className="text-[9px] sm:text-[11px] text-white/60 mt-1 leading-tight">{s.small}</p>
                </motion.div>
              ))}
            </div>

            <motion.button
              onClick={scrollToUnlock}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="mt-8 inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-sm font-bold shadow-lg shadow-[#B45309]/30 transition-colors"
            >
              Get Started
              <motion.svg
                className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </motion.svg>
            </motion.button>
            <p className="text-[10px] text-white/40 mt-3 uppercase tracking-widest">Scroll to see how to unlock</p>
          </div>
        </div>

        {/* ═══ LAUNCHING SOON BANNER ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="relative overflow-hidden bg-[#171310] border-y border-[#B45309]/25"
        >
          {/* Top accent line — animated sweep */}
          <div className="h-0.5 w-full bg-[#B45309]/20 overflow-hidden">
            <motion.div
              className="h-full w-1/3 bg-gradient-to-r from-transparent via-[#F5C77E] to-transparent"
              animate={{ x: ['-100%', '400%'] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Shimmer sweep across the strip */}
          <motion.div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-[#F5C77E]/10 to-transparent"
            animate={{ x: ['-120%', '120%'] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '60%' }}
          />

          <div className="relative z-10 flex items-center justify-center gap-2.5 sm:gap-3 flex-wrap px-5 py-3.5 text-center">
            {/* Live pill */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F5C77E]/15 border border-[#F5C77E]/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5C77E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F5C77E]" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#F5C77E]">Launching Soon</span>
            </span>

            <p className="text-xs sm:text-sm font-semibold text-white/85">
              Prebook now to lock your seat &amp; the <span className="text-[#F5C77E] font-bold">early-bird price</span>.
            </p>
          </div>
        </motion.div>

        {/* ═══ WHAT YOU'LL MASTER ═══ */}
        <div className="px-5 py-10 sm:px-10 sm:py-14 bg-[#FAF7F2]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <p className="text-[10px] font-bold text-[#B45309] uppercase tracking-widest mb-2">Course Overview</p>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] font-serif">Your Roadmap to ₹1 Crore</h3>
            <p className="text-sm text-[#57534E] mt-2 max-w-xl mx-auto">Everything is broken into simple, actionable modules — from finding the right buyer to closing the deal and multiplying your leads.</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {chapters.map((ch, i) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
                whileHover={{ y: -3, borderColor: 'rgba(180,83,9,0.4)' }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E7E5E4]"
              >
                <div className="w-8 h-8 rounded-full bg-[#B45309] text-white flex items-center justify-center text-sm font-bold shrink-0">{i + 1}</div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#2A2A2A]">{ch.title}</p>
                  <p className="text-xs text-[#78716C] mt-0.5 leading-relaxed">{ch.subtitle}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto mt-6">
            {[
              { t: 'Ready-to-use scripts', d: 'WhatsApp + call scripts that convert cold leads into site visits.' },
              { t: 'Daily lead system', d: 'A repeatable routine so your pipeline never runs dry.' },
              { t: 'Referral multiplier', d: 'Turn every happy client into 3 more high-intent leads.' },
            ].map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                className="p-4 rounded-2xl bg-white border border-[#E7E5E4]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#B45309]/10 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-sm font-bold text-[#2A2A2A]">{v.t}</p>
                <p className="text-xs text-[#78716C] mt-1 leading-relaxed">{v.d}</p>
              </motion.div>
            ))}
          </div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto mt-8 p-5 rounded-2xl bg-gradient-to-r from-[#B45309]/10 to-transparent border border-[#B45309]/20"
          >
            <div className="flex items-center gap-1 mb-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.svg
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.15 + i * 0.08, type: 'spring' }}
                  className="w-4 h-4 text-[#B45309]" fill="currentColor" viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.966a1 1 0 00.95.69h4.17c.969 0 1.371 1.24.588 1.81l-3.375 2.454a1 1 0 00-.363 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.376-2.454a1 1 0 00-1.175 0l-3.376 2.454c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.363-1.118L2.98 9.393c-.783-.57-.38-1.81.588-1.81h4.17a1 1 0 00.951-.69l1.286-3.966z" />
                </motion.svg>
              ))}
            </div>
            <p className="text-sm text-[#2A2A2A] italic leading-relaxed">&ldquo;I followed this system for 8 months and crossed ₹1.1 Cr in commissions. The referral module alone doubled my pipeline.&rdquo;</p>
            <p className="text-xs font-bold text-[#57534E] mt-2">— Rohit Deshmukh, Property Consultant, Pune</p>
          </motion.div>
        </div>

        {/* ═══ UNLOCK OPTIONS (after scroll) ═══ */}
        <div id="earn-unlock" className="px-5 py-10 sm:px-10 sm:py-14 border-t border-[#E7E5E4]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#B45309]/10 border border-[#B45309]/20 text-[10px] font-bold uppercase tracking-widest text-[#B45309] mb-3">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B45309] opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#B45309]" />
              </span>
              Coming Soon — Reserve Now
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] font-serif">Choose how to unlock the course</h3>
            <p className="text-sm text-[#57534E] mt-2 max-w-lg mx-auto">The course launches soon. Prebook to lock your seat, or unlock it for free by referring 10 people.</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl mx-auto items-start">
            {/* ── Option 1: Prebook ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className={`relative p-6 rounded-2xl border-2 transition-all ${method === 'pay' ? 'border-[#B45309] bg-[#B45309]/5' : 'border-[#E7E5E4] hover:border-[#B45309]/40'}`}
            >
              <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#B45309] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">Most popular</span>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#B45309]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2A2A2A]">Prebook your seat</p>
                  <p className="text-[11px] text-[#78716C]">Lock the full course at a fraction of the price</p>
                </div>
              </div>

              <div className="flex items-end gap-2 mb-1">
                <span className="text-3xl font-bold text-[#2A2A2A]">{inr(PREBOOK_PRICE)}</span>
                <span className="text-sm text-[#A8A29E] line-through mb-1">{inr(FULL_PRICE)}</span>
              </div>
              <p className="text-xs text-[#57534E] mb-4">
                Full course fee is <span className="font-bold text-[#2A2A2A]">{inr(FULL_PRICE)}</span>. Prebook now for just <span className="font-bold text-[#B45309]">{inr(PREBOOK_PRICE)}</span> and the rest is adjusted when the course opens.
              </p>

              <ul className="space-y-2 mb-5">
                {['Priority seat when the course opens', 'Prebook amount adjusted in full fee', 'Locked-in early-bird price'].map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#2A2A2A]">
                    <svg className="w-3.5 h-3.5 text-[#B45309] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    {t}
                  </li>
                ))}
              </ul>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-[#B45309] hover:bg-[#92400E] text-white text-sm font-bold shadow-sm transition-colors"
              >
                Prebook for {inr(PREBOOK_PRICE)}
              </motion.button>
              <p className="text-[10px] text-[#A8A29E] mt-2 text-center">Course &amp; online payment launching soon — prebooking reserves your seat at the early-bird price.</p>
            </motion.div>

            {/* ── Option 2: Refer 10 people ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`p-6 rounded-2xl border-2 transition-all ${method === 'refer' ? 'border-[#B45309] bg-[#B45309]/5' : 'border-[#E7E5E4] hover:border-[#B45309]/40'}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-[#B45309]/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#B45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 00-3-3.87" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-[#2A2A2A]">Refer {REFERRAL_GOAL} people — get it free</p>
                  <p className="text-[11px] text-[#78716C]">Invite {REFERRAL_GOAL} people to HomeInTown</p>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                <p className="text-xs text-[#57534E] leading-relaxed">
                  <span className="font-bold text-[#2A2A2A]">Priya from Mumbai</span> unlocked the full course for free by referring 10 people in a week. You can too — share your link below.
                </p>
              </div>

              {!method || method === 'pay' ? (
                <button
                  onClick={() => setMethod('refer')}
                  className="w-full py-3 rounded-xl border-2 border-[#B45309] text-[#B45309] hover:bg-[#B45309]/5 text-sm font-bold transition-all"
                >
                  Start referring
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#2A2A2A]">Referral progress</span>
                      <span className="text-xs font-bold text-[#B45309]">{referralCount} / {REFERRAL_GOAL} joined</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[#E7E5E4] overflow-hidden">
                      <div className="h-full bg-[#B45309] transition-all duration-300" style={{ width: `${Math.min(100, (referralCount / REFERRAL_GOAL) * 100)}%` }} />
                    </div>
                    <p className="text-[11px] text-[#57534E] mt-2">
                      {info && info.remaining > 0
                        ? `${info.remaining} more ${info.remaining === 1 ? 'person needs' : 'people need'} to join to unlock for free.`
                        : 'Goal reached — unlocking your course…'}
                    </p>
                  </div>

                  {/* Share link */}
                  {info && (
                    <div>
                      <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest mb-1.5">Your referral link</p>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 flex items-center px-3 py-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4] min-w-0">
                          <span className="text-xs font-mono text-[#57534E] truncate">{info.referralLink}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={handleCopyLink} className="px-3 py-2.5 rounded-xl border border-[#E7E5E4] text-xs font-bold text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309] transition-all">
                            {copied ? 'Copied!' : 'Copy'}
                          </button>
                          <button onClick={handleShareWhatsApp} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:opacity-90 transition-opacity">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884" /></svg>
                            Share
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#A8A29E] mt-2">Your code: <span className="font-bold text-[#57534E]">{info.referralCode}</span></p>
                    </div>
                  )}

                  {/* Referred people */}
                  {info && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-widest">People you referred</p>
                        <button onClick={load} className="text-[10px] font-bold text-[#B45309] hover:underline">Refresh</button>
                      </div>
                      {info.referrals.length === 0 ? (
                        <p className="text-xs text-[#A8A29E] italic py-3 text-center">No referrals yet. Share your link to get started.</p>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto">
                          {info.referrals.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7E5E4]">
                              <div className="w-8 h-8 rounded-full bg-[#B45309]/10 flex items-center justify-center text-[10px] font-bold text-[#B45309] shrink-0">
                                {r.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#2A2A2A] truncate">{r.name}</p>
                                <p className="text-[10px] text-[#A8A29E]">{r.phone} · {new Date(r.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${r.joined ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {r.joined ? 'Joined' : 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // ── Unlocked state: the step-wise book ──
  return (
    <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-sm overflow-hidden">
      {/* Book header */}
      <div className="flex items-center gap-3 p-5 border-b border-[#E7E5E4] bg-gradient-to-r from-[#B45309]/5 to-transparent">
        <div className="w-11 h-11 rounded-xl bg-[#B45309] flex items-center justify-center shadow-sm shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-[#2A2A2A] font-serif">Get Leads Faster — The Playbook</h3>
          <p className="text-xs text-[#A8A29E]">
            Read step by step. {chapters.length} chapters
            {isAdmin ? ' · admin access' : ' · unlocked'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsEditing(v => !v)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isEditing ? 'bg-[#B45309] text-white shadow-sm' : 'border border-[#E7E5E4] text-[#57534E] hover:border-[#B45309]/40 hover:text-[#B45309]'}`}
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* Table of contents + chapters */}
      <div className="p-5 space-y-3">
        {chapters.map((ch, chIndex) => {
          const isOpen = openChapter === ch.id;
          return (
            <div key={ch.id} className={`rounded-xl border transition-all ${isOpen ? 'border-[#B45309]/30 bg-[#FAF7F2]' : 'border-[#E7E5E4] bg-white'}`}>
              {/* Chapter header */}
              <div className="w-full flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-full bg-[#B45309] text-white flex items-center justify-center text-sm font-bold shrink-0">{chIndex + 1}</div>
                <button onClick={() => setOpenChapter(isOpen ? null : ch.id)} className="flex-1 min-w-0 text-left">
                  {isEditing ? (
                    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                      <input value={ch.title} onChange={(e) => updateChapterField(ch.id, 'title', e.target.value)} className="w-full text-sm font-bold text-[#2A2A2A] bg-white border border-[#E7E5E4] rounded-md px-2 py-1 focus:outline-none focus:border-[#B45309]/40" />
                      <input value={ch.subtitle} onChange={(e) => updateChapterField(ch.id, 'subtitle', e.target.value)} className="w-full text-xs text-[#57534E] bg-white border border-[#E7E5E4] rounded-md px-2 py-1 focus:outline-none focus:border-[#B45309]/40" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-[#2A2A2A]">{ch.title}</p>
                      <p className="text-xs text-[#A8A29E] truncate">{ch.subtitle}</p>
                    </>
                  )}
                </button>
                {isEditing ? (
                  <input value={ch.readTime} onChange={(e) => updateChapterField(ch.id, 'readTime', e.target.value)} className="w-16 text-[10px] font-bold text-[#57534E] bg-white border border-[#E7E5E4] rounded-md px-1.5 py-1 shrink-0 focus:outline-none focus:border-[#B45309]/40" />
                ) : (
                  <span className="text-[10px] font-bold text-[#A8A29E] shrink-0">{ch.readTime}</span>
                )}
                {isEditing && (
                  <button onClick={() => removeChapter(ch.id)} className="p-1 text-red-500 hover:text-red-600 shrink-0" title="Delete chapter">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                <button onClick={() => setOpenChapter(isOpen ? null : ch.id)} className="shrink-0">
                  <svg className={`w-4 h-4 text-[#A8A29E] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Chapter body */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-[#E7E5E4] pt-4">
                  {ch.sections.map((sec, i) => (
                    <div key={i}>
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <input value={sec.heading} onChange={(e) => updateSection(ch.id, i, 'heading', e.target.value)} className="flex-1 text-sm font-bold text-[#2A2A2A] bg-white border border-[#E7E5E4] rounded-md px-2 py-1 focus:outline-none focus:border-[#B45309]/40" />
                            <button onClick={() => removeSection(ch.id, i)} className="p-1 text-red-500 hover:text-red-600" title="Remove section">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <textarea value={sec.body} onChange={(e) => updateSection(ch.id, i, 'body', e.target.value)} rows={3} className="w-full text-sm text-[#57534E] bg-white border border-[#E7E5E4] rounded-md px-2 py-1.5 resize-none focus:outline-none focus:border-[#B45309]/40" />
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-[#2A2A2A] mb-1">{sec.heading}</p>
                          <p className="text-sm text-[#57534E] leading-relaxed whitespace-pre-line">{sec.body}</p>
                        </>
                      )}
                    </div>
                  ))}

                  {isEditing && (
                    <button onClick={() => addSection(ch.id)} className="w-full py-2 rounded-lg border-2 border-dashed border-[#B45309]/30 text-[#B45309] text-xs font-bold hover:border-[#B45309] hover:bg-[#B45309]/5 transition-all">
                      + Add section
                    </button>
                  )}

                  {/* Key takeaways */}
                  <div className="rounded-lg bg-white border border-[#E7E5E4] p-3">
                    <p className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider mb-2">Key takeaways</p>
                    <ul className="space-y-1.5">
                      {ch.keyTakeaways.map((t, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#2A2A2A]">
                          <svg className="w-3.5 h-3.5 text-[#B45309] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          {isEditing ? (
                            <span className="flex-1 flex items-center gap-2">
                              <input value={t} onChange={(e) => updateTakeaway(ch.id, i, e.target.value)} className="flex-1 bg-white border border-[#E7E5E4] rounded-md px-2 py-1 focus:outline-none focus:border-[#B45309]/40" />
                              <button onClick={() => removeTakeaway(ch.id, i)} className="text-red-500 hover:text-red-600" title="Remove">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </span>
                          ) : (
                            <span>{t}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {isEditing && (
                      <button onClick={() => addTakeaway(ch.id)} className="mt-2 text-[10px] font-bold text-[#B45309] hover:underline">+ Add takeaway</button>
                    )}
                  </div>

                  {/* Chapter nav (hidden while editing) */}
                  {!isEditing && (
                    <div className="flex justify-between pt-1">
                      <button
                        onClick={() => setOpenChapter(chIndex > 0 ? chapters[chIndex - 1].id : ch.id)}
                        disabled={chIndex === 0}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#57534E] border border-[#E7E5E4] disabled:opacity-40 hover:border-[#B45309]/40 hover:text-[#B45309] transition-all"
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={() => setOpenChapter(chIndex < chapters.length - 1 ? chapters[chIndex + 1].id : ch.id)}
                        disabled={chIndex === chapters.length - 1}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#B45309] disabled:opacity-40 hover:bg-[#92400E] transition-all"
                      >
                        Next chapter →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add chapter (admin, editing) */}
        {isEditing && (
          <button onClick={addChapter} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-[#B45309]/30 text-[#B45309] text-xs font-bold hover:border-[#B45309] hover:bg-[#B45309]/5 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Add chapter
          </button>
        )}
      </div>
    </div>
  );
}


