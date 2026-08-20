'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowRight,
  Globe,
  PhoneCall,
  MessageCircle,
  ShieldCheck,
  Layout,
  Users,
  CheckCircle2,
  Activity,
  BarChart3,
  Building2,
  MousePointerClick,
  ArrowUpRight,
  Clock,
  Sparkles,
  Target,
  Share2,
  BellRing,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Star,
  Quote,
  Zap,
  Award,
  BadgeCheck,
  MapPin,
} from 'lucide-react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/authContext';
import { cn } from '@/lib/utils';

/* ─── Animation helpers ─── */
const fadeIn = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: {},
  whileInView: { transition: { staggerChildren: 0.12 } },
  viewport: { once: true, margin: '-40px' },
};

/* ─── Animated stat counter ─── */
function AnimatedStat({
  value,
  suffix = '',
  prefix = '',
  label,
  icon: Icon,
  isText = false,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  icon: React.ElementType;
  isText?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(isText ? `${prefix}${value}${suffix}` : '0');

  useEffect(() => {
    if (!isInView || isText) {
      if (isText) setDisplay(`${prefix}${value}${suffix}`);
      return;
    }
    const duration = 1800;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(`${prefix}${Math.round(eased * value)}${suffix}`);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, value, suffix, prefix, isText]);

  return (
    <motion.div
      ref={ref}
      {...fadeIn}
      className="group relative text-center p-6 sm:p-8 rounded-2xl glass-card hover:shadow-xl hover:shadow-[#B45309]/5 transition-all duration-500 hover:-translate-y-1"
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#B45309]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative">
        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#B45309]/15 to-[#B45309]/5 text-[#B45309] flex items-center justify-center mb-4 ring-1 ring-[#B45309]/10">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-2 font-serif tracking-tight">
          {display}
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-[#78716C] uppercase tracking-wider leading-snug">
          {label}
        </p>
      </div>
    </motion.div>
  );
}

/* ─── Testimonial carousel ─── */
const testimonials = [
  {
    quote:
      'We used to waste hours on tyre-kickers. Now every enquiry gets an AI call within 30 seconds, and our agents only speak to buyers with real budgets.',
    name: 'Rajesh Mehta',
    role: 'Director, Mehta Constructions',
    location: 'Pune',
    rating: 5,
    type: 'Builder',
  },
  {
    quote:
      'Hot leads land on WhatsApp with budget, timeline, and call transcript. My conversion rate doubled because I know exactly who to call back first.',
    name: 'Priya Sharma',
    role: 'Senior Property Broker',
    location: 'Mumbai',
    rating: 5,
    type: 'Broker',
  },
  {
    quote:
      'Creating a project page took us under 2 minutes. We share the link on ads and WhatsApp - enquiries flow in and get qualified automatically.',
    name: 'Arun Krishnan',
    role: 'VP Sales, Greenfield Developers',
    location: 'Bangalore',
    rating: 5,
    type: 'Builder',
  },
];

function TestimonialCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive((i) => (i + 1) % testimonials.length), []);
  const prev = useCallback(
    () => setActive((i) => (i - 1 + testimonials.length) % testimonials.length),
    []
  );

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [paused, next]);

  const current = testimonials[active];

  return (
    <section className="py-20 sm:py-28 px-4 relative overflow-hidden">
      <div className="absolute inset-0 landing-gradient-mesh pointer-events-none" />
      <div className="max-w-4xl mx-auto relative z-10">
        <motion.div {...fadeIn} className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#B45309] bg-[#B45309]/10 border border-[#B45309]/20 mb-4">
            <Star className="w-3.5 h-3.5 fill-[#B45309]" />
            Customer Stories
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">
            Trusted by Builders & Brokers
          </h2>
          <p className="text-[#78716C] max-w-lg mx-auto">
            Real estate professionals across India use HomeInTown to qualify leads faster and close more deals.
          </p>
        </motion.div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#B45309]/20 via-transparent to-[#0369A1]/20 blur-sm" />
          <div className="relative glass-card rounded-3xl p-8 sm:p-12 shadow-2xl shadow-black/5">
            <Quote className="w-10 h-10 text-[#B45309]/20 mb-6" />
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex gap-1 mb-6">
                  {Array.from({ length: current.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#B45309] text-[#B45309]" />
                  ))}
                </div>
                <p className="text-lg sm:text-xl text-[#2A2A2A] leading-relaxed font-medium mb-8">
                  &ldquo;{current.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B45309] to-[#92400E] flex items-center justify-center text-white font-bold text-lg font-serif">
                      {current.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-[#2A2A2A]">{current.name}</p>
                      <p className="text-sm text-[#78716C]">{current.role}</p>
                      <p className="text-xs text-[#A8A29E] flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {current.location}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#B45309]/10 text-[#B45309] border border-[#B45309]/20">
                    {current.type}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E7E5E4]/60">
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActive(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    className={cn(
                      'h-2 rounded-full transition-all duration-300',
                      i === active ? 'w-8 bg-[#B45309]' : 'w-2 bg-[#D6D3D1] hover:bg-[#A8A29E]'
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={prev}
                  aria-label="Previous testimonial"
                  className="w-10 h-10 rounded-xl border border-[#E7E5E4] flex items-center justify-center hover:bg-[#FAF7F2] hover:border-[#D6D3D1] transition-all"
                >
                  <ChevronLeft className="w-5 h-5 text-[#57534E]" />
                </button>
                <button
                  onClick={next}
                  aria-label="Next testimonial"
                  className="w-10 h-10 rounded-xl border border-[#E7E5E4] flex items-center justify-center hover:bg-[#FAF7F2] hover:border-[#D6D3D1] transition-all"
                >
                  <ChevronRight className="w-5 h-5 text-[#57534E]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Trust badges ─── */
const trustBadges = [
  { icon: ShieldCheck, label: 'RERA Compliant Pages' },
  { icon: Zap, label: 'AI Lead Screening' },
  { icon: MessageCircle, label: 'WhatsApp Integration' },
  { icon: BadgeCheck, label: 'Instant Notifications' },
  { icon: Award, label: 'Made for India' },
  { icon: Globe, label: 'Mobile-First Pages' },
];

function TrustBadges() {
  return (
    <section className="py-12 px-4 border-y border-[#E7E5E4]/60 bg-white/50">
      <div className="max-w-6xl mx-auto">
        <motion.p
          {...fadeIn}
          className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-8"
        >
          Enterprise-grade infrastructure for Indian real estate
        </motion.p>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6"
        >
          {trustBadges.map((badge, i) => (
            <motion.div
              key={i}
              variants={{ initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 } }}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-[#FAF7F2]/80 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FAF7F2] to-white border border-[#E7E5E4] flex items-center justify-center text-[#B45309] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#B45309]/10 transition-all duration-300">
                <badge.icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-[#57534E] text-center leading-tight">
                {badge.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Interactive feature showcase ─── */
const featureTabs = [
  {
    id: 'website',
    label: 'Project Website',
    icon: Layout,
    title: 'Project Website Builder',
    description:
      'Create a professional, shareable webpage for each of your real estate projects. Add photos, floor plans, location, amenities, and pricing - all in one place. No coding needed. Just fill a form and your page is live.',
    features: [
      'Beautiful project pages with photos & videos',
      'RERA number display for trust & compliance',
      'Enquiry form that captures buyer info directly',
      'Works perfectly on mobile phones',
      'Custom shareable link for each project',
    ],
    variant: 'light' as const,
    accent: '#B45309',
  },
  {
    id: 'leads',
    label: 'Lead Filtration',
    icon: Activity,
    title: 'Smart Lead Filtration',
    description:
      'When someone enquires on your project page, our system automatically calls them using AI voice and asks about their budget, timeline, and interest level. Serious buyers get forwarded to your sales team via WhatsApp - fake leads get filtered out.',
    features: [
      { title: 'AI Voice Calls', desc: 'Auto-calls every lead to verify interest & budget', icon: PhoneCall },
      { title: 'WhatsApp Alerts', desc: 'Hot leads sent to your agent instantly', icon: MessageCircle },
      { title: 'Lead Scoring', desc: 'Each lead gets a quality score based on actions', icon: BarChart3 },
      { title: 'Real-time Sync', desc: 'Both systems talk to each other automatically', icon: Share2 },
    ],
    variant: 'dark' as const,
    accent: '#B45309',
  },
];

function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState<'website' | 'leads'>('website');
  const tab = featureTabs.find((t) => t.id === activeTab)!;

  return (
    <section id="features" className="py-20 sm:py-28 px-4 relative overflow-hidden">
      <div className="absolute inset-0 landing-gradient-mesh pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div {...fadeIn} className="text-center mb-12 sm:mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#0369A1] bg-[#0369A1]/10 border border-[#0369A1]/20 mb-4">
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-[#2A2A2A] mb-4 font-serif tracking-tight">
            Two Powerful Tools, One Platform
          </h2>
          <p className="text-[#78716C] max-w-xl mx-auto text-base sm:text-lg">
            Everything a builder needs - from showcasing projects to closing deals with qualified buyers.
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div {...fadeIn} className="flex justify-center mb-10 sm:mb-14">
          <div className="inline-flex p-1.5 rounded-2xl glass-card shadow-lg shadow-black/5">
            {featureTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as 'website' | 'leads')}
                className={cn(
                  'relative flex items-center gap-2.5 px-5 sm:px-8 py-3 sm:py-3.5 rounded-xl text-sm font-bold transition-all duration-300',
                  activeTab === t.id
                    ? 'text-white shadow-lg'
                    : 'text-[#57534E] hover:text-[#2A2A2A] hover:bg-white/50'
                )}
              >
                {activeTab === t.id && (
                  <motion.div
                    layoutId="feature-tab-bg"
                    className="absolute inset-0 rounded-xl bg-[#2A2A2A]"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <t.icon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className={cn(
              'rounded-[2rem] p-8 sm:p-12 relative overflow-hidden transition-colors duration-500',
              tab.variant === 'light'
                ? 'glass-card shadow-2xl shadow-black/5'
                : 'glass-card-dark text-white shadow-2xl'
            )}
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.04] pointer-events-none">
              {tab.variant === 'light' ? (
                <Globe className="w-48 h-48 text-[#B45309]" />
              ) : (
                <Target className="w-48 h-48 text-[#B45309]" />
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center relative z-10">
              <div>
                <div
                  className={cn(
                    'inline-flex p-3 rounded-2xl mb-6',
                    tab.variant === 'light'
                      ? 'bg-[#FAF7F2] border border-[#E7E5E4] text-[#B45309]'
                      : 'bg-white/10 border border-white/10 text-[#B45309]'
                  )}
                >
                  <tab.icon className="w-7 h-7" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 font-serif">{tab.title}</h3>
                <p
                  className={cn(
                    'mb-8 leading-relaxed text-base',
                    tab.variant === 'light' ? 'text-[#57534E]' : 'text-gray-400'
                  )}
                >
                  {tab.description}
                </p>

                {activeTab === 'website' ? (
                  <ul className="space-y-3.5">
                    {(tab.features as string[]).map((item, i) => (
                      <motion.li
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-start gap-3 text-sm font-medium text-[#2A2A2A]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-[#3F6212] shrink-0 mt-0.5" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {(tab.features as { title: string; desc: string; icon: React.ElementType }[]).map(
                      (item, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-[#B45309] mb-2.5" />
                          <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                          <p className="text-[11px] text-gray-500 leading-relaxed">{item.desc}</p>
                        </motion.div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Visual preview */}
              <div className="relative">
                {activeTab === 'website' ? (
                  <div className="rounded-2xl border border-[#E7E5E4] bg-[#FAF7F2] p-5 shadow-inner overflow-hidden">
                    <div className="flex gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-red-400/60" />
                      <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                      <div className="w-3 h-3 rounded-full bg-green-400/60" />
                    </div>
                    <div className="flex gap-3 items-center mb-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B45309]/20 to-[#B45309]/5" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-[#E7E5E4] rounded w-3/4" />
                        <div className="h-2 bg-[#E7E5E4]/60 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="h-20 bg-gradient-to-br from-[#E7E5E4] to-[#D6D3D1] rounded-lg"
                        />
                      ))}
                    </div>
                    <div className="h-10 rounded-xl bg-[#B45309]/90 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">Enquire Now</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[
                      { name: 'Amit K.', score: 'Hot', budget: '₹85L–1.2Cr', time: '2 min ago' },
                      { name: 'Sneha R.', score: 'Warm', budget: '₹60L–80L', time: '8 min ago' },
                      { name: 'Vikram P.', score: 'Filtered', budget: 'Low interest', time: '12 min ago' },
                    ].map((lead, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-xl border',
                          lead.score === 'Filtered'
                            ? 'bg-white/3 border-white/5 opacity-50'
                            : 'bg-white/8 border-white/10'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{lead.name}</p>
                            <p className="text-[11px] text-gray-500">{lead.budget}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={cn(
                              'text-[10px] font-bold uppercase px-2 py-0.5 rounded-full',
                              lead.score === 'Hot' && 'bg-green-500/20 text-green-400',
                              lead.score === 'Warm' && 'bg-amber-500/20 text-amber-400',
                              lead.score === 'Filtered' && 'bg-gray-500/20 text-gray-500'
                            )}
                          >
                            {lead.score}
                          </span>
                          <p className="text-[10px] text-gray-600 mt-1">{lead.time}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ─── Main page ─── */
export default function Home() {
  const { status } = useAuth();
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dashboardHref = status === 'authenticated' ? '/dashboard' : '/login';
  const ctaLabel = status === 'authenticated' ? 'Go to Dashboard' : 'Create Your Project Page';
  const navCtaLabel = status === 'authenticated' ? 'Dashboard' : 'Login';

  const navLinks = [
    { href: '#how-it-works', label: 'How It Works' },
    { href: '#features', label: 'Features' },
    { href: '#for-whom', label: 'For Whom' },
  ];

  return (
    <main className="min-h-screen landing-gradient-mesh text-[#2A2A2A] selection:bg-[#B45309]/20">
      {/* Sticky Navigation */}
      <nav
        className={cn(
          'sticky top-0 z-[100] border-b transition-all duration-300',
          navScrolled
            ? 'glass-nav-scrolled border-[#E7E5E4]/80'
            : 'glass-nav border-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg shadow-[#B45309]/25 transform group-hover:rotate-6 transition-transform">
                H
              </div>
              <div className="flex flex-col">
                <span className="text-xl sm:text-2xl font-bold text-[#2A2A2A] tracking-tighter font-serif leading-none">
                  HomeInTown
                </span>
                <span className="text-[10px] uppercase tracking-widest text-[#B45309] font-bold mt-0.5">
                  Sales Intelligence
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#57534E]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="relative hover:text-[#B45309] transition-colors after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-0.5 after:bg-[#B45309] after:transition-all hover:after:w-full"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={dashboardHref}
                className="hidden sm:inline-flex px-6 py-2.5 bg-[#2A2A2A] text-white text-sm font-semibold rounded-full hover:bg-black transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                {navCtaLabel}
              </Link>
              <button
                className="md:hidden w-10 h-10 rounded-xl border border-[#E7E5E4] flex items-center justify-center hover:bg-white/80 transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#E7E5E4]/60 overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1 bg-white/90 backdrop-blur-xl">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-[#57534E] hover:bg-[#FAF7F2] hover:text-[#B45309] transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-center bg-[#2A2A2A] text-white"
                >
                  {navCtaLabel}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 sm:pt-24 pb-20 sm:pb-32 overflow-hidden">
        <div className="absolute inset-0 landing-hero-glow pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] bg-[#B45309]/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-[#0369A1]/6 rounded-full blur-[100px]" />
          <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] bg-[#3F6212]/5 rounded-full blur-[80px]" />
        </div>

        {/* Floating decorative cards */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="hidden lg:block absolute top-32 left-[8%] glass-card rounded-2xl p-4 shadow-xl shadow-black/5 landing-float"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A2A2A]">Hot Lead Qualified</p>
              <p className="text-[10px] text-[#78716C]">Budget: ₹1.2 Cr</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="hidden lg:block absolute top-48 right-[10%] glass-card rounded-2xl p-4 shadow-xl shadow-black/5 landing-float-delayed"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#B45309]/20 flex items-center justify-center">
              <PhoneCall className="w-4 h-4 text-[#B45309]" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#2A2A2A]">AI Call Complete</p>
              <p className="text-[10px] text-[#78716C]">Score: 92/100</p>
            </div>
          </div>
        </motion.div>

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 glass-card rounded-full text-[#57534E] text-xs font-bold uppercase tracking-widest mb-8 shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B45309] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B45309]" />
            </span>
            Built for Indian Real Estate
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#2A2A2A] mb-6 leading-[1.08] font-serif tracking-tight"
          >
            Your Projects Online.
            <br />
            Your Leads{' '}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#B45309] landing-hero-glow">
              Qualified Automatically.
              <svg
                className="absolute -bottom-2 left-0 w-full"
                height="8"
                viewBox="0 0 100 8"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 7C20 7 30 2 50 2C70 2 80 7 100 7"
                  stroke="#B45309"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-base sm:text-xl text-[#57534E] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            HomeInTown helps real estate builders create professional project pages in minutes and uses
            AI-powered voice calls + WhatsApp to instantly filter serious buyers from casual browsers - so
            your sales team only talks to people who actually want to buy.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link
              href={dashboardHref}
              className="group w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#B45309] to-[#92400E] text-white font-bold rounded-2xl hover:shadow-2xl hover:shadow-[#B45309]/25 transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
            >
              {ctaLabel}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 glass-card text-[#2A2A2A] font-bold rounded-2xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              See How It Works
            </a>
          </motion.div>

          {/* Social proof strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-[#78716C]"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {['R', 'P', 'A'].map((l, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B45309] to-[#92400E] border-2 border-[#FAF7F2] flex items-center justify-center text-white text-xs font-bold"
                  >
                    {l}
                  </div>
                ))}
              </div>
              <span className="font-medium">
                <strong className="text-[#2A2A2A]">500+</strong> projects live
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-[#D6D3D1]" />
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#B45309] text-[#B45309]" />
              ))}
              <span className="font-medium ml-1">
                <strong className="text-[#2A2A2A]">4.9</strong> rating
              </span>
            </div>
            <div className="hidden sm:block w-px h-6 bg-[#D6D3D1]" />
            <span className="font-medium">
              <strong className="text-[#2A2A2A]">10,000+</strong> leads qualified
            </span>
          </motion.div>
        </div>
      </section>

      <TrustBadges />

      {/* Problem → Solution */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: '-40px' }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Building2,
                pain: 'Scattered property info?',
                solution:
                  'One clean project page with all details, photos & location - ready to share.',
                color: '#B45309',
              },
              {
                icon: PhoneCall,
                pain: 'Too many fake leads?',
                solution:
                  'AI voice calls every enquiry automatically to check budget, timeline & interest.',
                color: '#0369A1',
              },
              {
                icon: MessageCircle,
                pain: 'Leads going cold?',
                solution:
                  'WhatsApp alerts fire instantly so your agents respond in seconds, not hours.',
                color: '#3F6212',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group relative p-6 sm:p-8 rounded-2xl glass-card hover:shadow-xl hover:shadow-black/5 transition-all duration-500 hover:-translate-y-1 cursor-default overflow-hidden"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${item.color}08 0%, transparent 60%)`,
                  }}
                />
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 ring-1 ring-black/5"
                    style={{ backgroundColor: `${item.color}12`, color: item.color }}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-[#78716C] uppercase tracking-wide mb-2">
                    {item.pain}
                  </p>
                  <p className="text-[#2A2A2A] font-medium leading-relaxed">{item.solution}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <FeatureShowcase />

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 bg-white/60 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-14 sm:mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#7C3AED] bg-[#7C3AED]/10 border border-[#7C3AED]/20 mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">
              How It Works
            </h2>
            <p className="text-[#78716C] font-medium text-base sm:text-lg">
              From project setup to closing deals - in 4 simple steps.
            </p>
          </motion.div>

          <div className="space-y-0">
            {[
              {
                step: '1',
                title: 'Create Your Project Page',
                desc: 'Log in as a Builder. Fill in your project details - name, location, photos, floor plans, pricing & RERA info. Your professional project page goes live instantly with a unique shareable link.',
                icon: Building2,
                color: '#B45309',
              },
              {
                step: '2',
                title: 'Share the Link, Collect Enquiries',
                desc: 'Share your project link on WhatsApp, social media, or ads. When a potential buyer visits your page and fills the enquiry form, their details are captured automatically in your dashboard.',
                icon: MousePointerClick,
                color: '#0369A1',
              },
              {
                step: '3',
                title: 'AI Filters the Leads for You',
                desc: "Our AI system calls each new lead automatically. It asks about their budget range, when they want to buy, and what they're looking for. Based on the conversation, each lead gets a quality score (hot, warm, or cold).",
                icon: Sparkles,
                color: '#7C3AED',
              },
              {
                step: '4',
                title: 'Your Agents Get Only Hot Leads',
                desc: 'Qualified, high-score leads are instantly sent to your sales agents via WhatsApp with all the details - name, budget, interest level, and call transcript. Your agents call back and close the deal.',
                icon: UserCheck,
                color: '#3F6212',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-5 sm:gap-8 group"
              >
                <div className="flex flex-col items-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 transition-transform group-hover:scale-110 ring-4 ring-white"
                    style={{ backgroundColor: item.color }}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  {index < 3 && (
                    <div className="w-px flex-1 min-h-[24px] bg-gradient-to-b from-[#D6D3D1] to-transparent my-2" />
                  )}
                </div>
                <div className="pb-10 sm:pb-12 pt-1">
                  <span className="text-xs font-black uppercase tracking-widest text-[#78716C]">
                    Step {item.step}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-[#2A2A2A] mb-2 font-serif mt-1">
                    {item.title}
                  </h3>
                  <p className="text-[#57534E] leading-relaxed text-sm sm:text-base max-w-lg">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section id="for-whom" className="py-20 sm:py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 landing-gradient-mesh pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div {...fadeIn} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-[#3F6212] bg-[#3F6212]/10 border border-[#3F6212]/20 mb-4">
              Target Users
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">
              Built For Real Estate Professionals
            </h2>
            <p className="text-[#78716C] max-w-xl mx-auto text-base sm:text-lg">
              Whether you&apos;re building flats, selling plots, or managing agents - HomeInTown fits
              your workflow.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              {
                role: 'Builders & Developers',
                desc: 'Create beautiful pages for your projects. Get only verified interested buyers instead of wasting time on fake enquiries.',
                benefits: ['Project page in minutes', 'Auto lead qualification', 'Dashboard with analytics'],
                icon: Building2,
                color: '#B45309',
              },
              {
                role: 'Sales Agents & Brokers',
                desc: 'Receive pre-qualified leads directly on WhatsApp with buyer details, budget info, and interest scores - ready to convert.',
                benefits: ['WhatsApp lead delivery', 'Lead call transcripts', 'Share project links easily'],
                icon: Users,
                color: '#0369A1',
              },
              {
                role: 'Admin & Sales Managers',
                desc: 'Track all leads, agents, and projects from one admin panel. Approve agent access, monitor performance, and manage the pipeline.',
                benefits: ['Full admin dashboard', 'Role-based access control', 'Organization-level management'],
                icon: ShieldCheck,
                color: '#3F6212',
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={{ initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="group p-6 sm:p-8 rounded-2xl glass-card hover:shadow-2xl hover:shadow-black/5 transition-all duration-500 hover:-translate-y-1"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 ring-1 ring-black/5 group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: `${item.color}12`, color: item.color }}
                >
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#2A2A2A] mb-2 font-serif">{item.role}</h3>
                <p className="text-sm text-[#57534E] mb-5 leading-relaxed">{item.desc}</p>
                <ul className="space-y-2.5">
                  {item.benefits.map((b, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#2A2A2A] font-medium">
                      <ChevronRight className="w-4 h-4 text-[#B45309]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <TestimonialCarousel />

      {/* Animated Statistics */}
      <section className="py-16 sm:py-20 px-4 bg-white/60">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] font-serif">
              Built for Speed & Scale
            </h2>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <AnimatedStat value={2} prefix="< " suffix=" min" label="To Create a Project Page" icon={Clock} isText />
            <AnimatedStat value={30} prefix="< " suffix="s" label="Lead Gets First AI Call" icon={PhoneCall} isText />
            <AnimatedStat value={100} suffix="%" label="Enquiries Get Auto-Screened" icon={ShieldCheck} />
            <motion.div
              {...fadeIn}
              className="group relative text-center p-6 sm:p-8 rounded-2xl glass-card hover:shadow-xl hover:shadow-[#B45309]/5 transition-all duration-500 hover:-translate-y-1"
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#B45309]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-[#B45309]/15 to-[#B45309]/5 text-[#B45309] flex items-center justify-center mb-4 ring-1 ring-[#B45309]/10">
                  <BellRing className="w-5 h-5" />
                </div>
                <h3 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-2 font-serif tracking-tight">
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, type: 'spring' }}
                  >
                    Instant
                  </motion.span>
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-[#78716C] uppercase tracking-wider leading-snug">
                  Hot Leads on WhatsApp
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 sm:py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#B45309] via-[#C2410C] to-[#92400E]" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-black/10 rounded-full blur-3xl" />

        <div className="max-w-3xl mx-auto text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold mb-4 font-serif leading-tight">
              Stop Chasing Leads. Let Them Come to You - Pre-Qualified.
            </h2>
            <p className="text-white/80 mb-10 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
              Join builders across India who use HomeInTown to showcase their projects and automatically
              filter every enquiry before it reaches their sales team.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#B45309] font-bold rounded-2xl hover:bg-[#FAF7F2] transition-all shadow-2xl hover:-translate-y-1 hover:shadow-white/20 group"
            >
              Get Started - It&apos;s Free
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-20 px-4 bg-[#1C1917] text-white relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#B45309]/40 to-transparent" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid md:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-lg flex items-center justify-center font-serif font-bold text-xl">
                  H
                </div>
                <span className="font-serif font-bold text-2xl tracking-tighter">HomeInTown</span>
              </div>
              <p className="text-[#A8A29E] max-w-sm mb-6 leading-relaxed text-sm">
                Home In Town is a real estate lead generation and CRM platform operated by Anikit and
                Team. Create project pages, qualify leads with AI, and close deals faster - all from one
                platform.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-5 uppercase text-xs tracking-[0.2em] text-[#B45309]">
                Platform
              </h4>
              <ul className="space-y-3 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">Project Pages</li>
                <li className="hover:text-white cursor-pointer transition-colors">Lead Filtration</li>
                <li className="hover:text-white cursor-pointer transition-colors">Agent Dashboard</li>
                <li className="hover:text-white cursor-pointer transition-colors">Admin Panel</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-5 uppercase text-xs tracking-[0.2em] text-[#B45309]">
                Company
              </h4>
              <ul className="space-y-3 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
                <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[#78716C] text-xs font-bold uppercase tracking-widest">
            <p>© 2026 HomeInTown. Owned and Operated by ANIKIT and Team.</p>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
