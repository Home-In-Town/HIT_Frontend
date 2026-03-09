'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Globe, 
  PhoneCall, 
  MessageCircle, 
  ShieldCheck, 
  Zap, 
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
  Eye,
  Target,
  Share2,
  Smartphone,
  TrendingUp,
  BellRing,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const fadeIn = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.6 }
  };

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#2A2A2A] selection:bg-[#B45309]/20">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-[#E7E5E4] sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-[#B45309] rounded-xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg shadow-[#B45309]/20 transform group-hover:rotate-6 transition-transform">
                  H
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-bold text-[#2A2A2A] tracking-tighter font-serif leading-none">HomeInTown</span>
                  <span className="text-[10px] uppercase tracking-widest text-[#B45309] font-bold mt-0.5">Sales Intelligence</span>
                </div>
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#57534E]">
              <a href="#how-it-works" className="hover:text-[#B45309] transition-colors">How It Works</a>
              <a href="#features" className="hover:text-[#B45309] transition-colors">Features</a>
              <a href="#for-whom" className="hover:text-[#B45309] transition-colors">For Whom</a>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-6 py-2.5 bg-[#2A2A2A] text-white text-sm font-semibold rounded-full hover:bg-black transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section — What We Do, Simply */}
      <section className="relative pt-16 sm:pt-24 pb-28 sm:pb-36 overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-[#B45309]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[500px] h-[500px] bg-[#3F6212]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#E7E5E4] rounded-full text-[#57534E] text-xs font-bold uppercase tracking-widest mb-8 border border-[#D6D3D1]"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B45309] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B45309]"></span>
            </span>
            Built for Indian Real Estate
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#2A2A2A] mb-6 leading-[1.1] font-serif tracking-tight"
          >
            Your Projects Online. <br />
            Your Leads{' '}
            <span className="text-[#B45309] relative inline-block">
              Qualified Automatically.
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 7C20 7 30 2 50 2C70 2 80 7 100 7" stroke="#B45309" strokeWidth="2" fill="none" />
              </svg>
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-base sm:text-lg text-[#57534E] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            HomeInTown helps real estate builders create professional project pages in minutes 
            and uses AI-powered voice calls + WhatsApp to instantly filter serious buyers 
            from casual browsers — so your sales team only talks to people who actually want to buy.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/login"
              className="group w-full sm:w-auto px-8 py-4 bg-[#B45309] text-white font-bold rounded-2xl hover:bg-[#92400E] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#B45309]/20 hover:-translate-y-1"
            >
              Create Your Project Page
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#how-it-works" 
              className="w-full sm:w-auto px-8 py-4 bg-white text-[#2A2A2A] font-bold rounded-2xl border border-[#E7E5E4] hover:border-[#D6D3D1] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              See How It Works
            </a>
          </motion.div>
        </div>
      </section>

      {/* Simple 1-2-3 Problem → Solution Statement */}
      <section className="py-16 px-4 bg-white border-t border-[#E7E5E4]">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Building2,
                pain: 'Scattered property info?',
                solution: 'One clean project page with all details, photos & location — ready to share.',
                color: '#B45309'
              },
              {
                icon: PhoneCall,
                pain: 'Too many fake leads?',
                solution: 'AI voice calls every enquiry automatically to check budget, timeline & interest.',
                color: '#0369A1'
              },
              {
                icon: MessageCircle,
                pain: 'Leads going cold?',
                solution: 'WhatsApp alerts fire instantly so your agents respond in seconds, not hours.',
                color: '#3F6212'
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="p-6 sm:p-8 rounded-2xl bg-[#FAF7F2] border border-[#E7E5E4] group hover:shadow-lg transition-all cursor-default"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${item.color}12`, color: item.color }}>
                  <item.icon className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#78716C] uppercase tracking-wide mb-2">{item.pain}</p>
                <p className="text-[#2A2A2A] font-medium leading-relaxed">{item.solution}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Two Pillars — What You Get */}
      <section id="features" className="py-20 sm:py-28 px-4 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">Two Powerful Tools, One Platform</h2>
            <p className="text-[#78716C] max-w-xl mx-auto">Everything a builder needs — from showcasing projects to closing deals with qualified buyers.</p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Pillar 1: Sales Website */}
            <motion.div 
              {...fadeIn}
              className="p-8 sm:p-10 rounded-[2rem] bg-white border border-[#E7E5E4] relative overflow-hidden group shadow-sm hover:shadow-xl transition-all"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe className="w-32 h-32 text-[#B45309]" />
              </div>
              <div className="inline-flex p-3 bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] mb-6 text-[#B45309]">
                <Layout className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-serif">Project Website Builder</h2>
              <p className="text-[#57534E] mb-8 leading-relaxed">
                Create a professional, shareable webpage for each of your real estate projects. 
                Add photos, floor plans, location, amenities, and pricing — all in one place. 
                No coding needed. Just fill a form and your page is live.
              </p>
              <ul className="space-y-3.5 mb-8">
                {[
                  'Beautiful project pages with photos & videos',
                  'RERA number display for trust & compliance',
                  'Enquiry form that captures buyer info directly',
                  'Works perfectly on mobile phones',
                  'Custom shareable link for each project'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-[#2A2A2A]">
                    <CheckCircle2 className="w-5 h-5 text-[#3F6212] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Mini preview */}
              <div className="h-32 sm:h-40 bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4] p-4 relative overflow-hidden">
                <div className="flex gap-3 items-center mb-3">
                  <div className="w-8 h-8 rounded-lg bg-[#B45309]/10" />
                  <div className="h-3 bg-[#E7E5E4] rounded w-24" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-16 bg-[#E7E5E4] rounded-lg" />
                  <div className="h-16 bg-[#E7E5E4] rounded-lg" />
                  <div className="h-16 bg-[#E7E5E4] rounded-lg" />
                </div>
              </div>
            </motion.div>

            {/* Pillar 2: Lead Filtration */}
            <motion.div 
              {...fadeIn}
              transition={{ delay: 0.2 }}
              className="p-8 sm:p-10 rounded-[2rem] bg-[#2A2A2A] text-white border border-gray-800 relative overflow-hidden group shadow-sm hover:shadow-xl transition-all"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-32 h-32 text-[#B45309]" />
              </div>
              <div className="inline-flex p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm mb-6 text-[#B45309]">
                <Activity className="w-7 h-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 font-serif">Smart Lead Filtration</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                When someone enquires on your project page, our system automatically 
                calls them using AI voice and asks about their budget, timeline, and interest level. 
                Serious buyers get forwarded to your sales team via WhatsApp — fake leads get filtered out.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <PhoneCall className="w-5 h-5 text-[#B45309] mb-2.5" />
                  <h4 className="font-bold text-sm mb-1">AI Voice Calls</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Auto-calls every lead to verify interest & budget</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <MessageCircle className="w-5 h-5 text-[#3F6212] mb-2.5" />
                  <h4 className="font-bold text-sm mb-1">WhatsApp Alerts</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Hot leads sent to your agent instantly</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <BarChart3 className="w-5 h-5 text-sky-400 mb-2.5" />
                  <h4 className="font-bold text-sm mb-1">Lead Scoring</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Each lead gets a quality score based on actions</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <Share2 className="w-5 h-5 text-amber-400 mb-2.5" />
                  <h4 className="font-bold text-sm mb-1">Real-time Sync</h4>
                  <p className="text-[11px] text-gray-500 leading-relaxed">Both systems talk to each other automatically</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works — Step by Step */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">How It Works</h2>
            <p className="text-[#78716C] font-medium">From project setup to closing deals — in 4 simple steps.</p>
          </motion.div>
          
          <div className="space-y-0">
            {[
              { 
                step: '1', 
                title: 'Create Your Project Page', 
                desc: 'Log in as a Builder. Fill in your project details — name, location, photos, floor plans, pricing & RERA info. Your professional project page goes live instantly with a unique shareable link.',
                icon: Building2,
                color: '#B45309'
              },
              { 
                step: '2', 
                title: 'Share the Link, Collect Enquiries', 
                desc: 'Share your project link on WhatsApp, social media, or ads. When a potential buyer visits your page and fills the enquiry form, their details are captured automatically in your dashboard.',
                icon: MousePointerClick,
                color: '#0369A1'
              },
              { 
                step: '3', 
                title: 'AI Filters the Leads for You', 
                desc: 'Our AI system calls each new lead automatically. It asks about their budget range, when they want to buy, and what they\'re looking for. Based on the conversation, each lead gets a quality score (hot, warm, or cold).',
                icon: Sparkles,
                color: '#7C3AED'
              },
              { 
                step: '4', 
                title: 'Your Agents Get Only Hot Leads', 
                desc: 'Qualified, high-score leads are instantly sent to your sales agents via WhatsApp with all the details — name, budget, interest level, and call transcript. Your agents call back and close the deal.',
                icon: UserCheck,
                color: '#3F6212'
              }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                {...fadeIn}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-5 sm:gap-8 group"
              >
                {/* Left: Step indicator + line */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0 transition-transform group-hover:scale-110" 
                    style={{ backgroundColor: item.color }}
                  >
                    <item.icon className="w-6 h-6" />
                  </div>
                  {index < 3 && (
                    <div className="w-px flex-1 min-h-[24px] bg-[#E7E5E4] my-2" />
                  )}
                </div>
                {/* Right: Content */}
                <div className="pb-10 sm:pb-12 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-black uppercase tracking-widest text-[#78716C]">Step {item.step}</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#2A2A2A] mb-2 font-serif">{item.title}</h3>
                  <p className="text-[#57534E] leading-relaxed text-sm sm:text-base max-w-lg">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who Is This For */}
      <section id="for-whom" className="py-20 sm:py-28 px-4 bg-[#FAF7F2]">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeIn} className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-3 font-serif">Built For Real Estate Professionals</h2>
            <p className="text-[#78716C] max-w-xl mx-auto">Whether you&apos;re building flats, selling plots, or managing agents — HomeInTown fits your workflow.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { 
                role: 'Builders & Developers',
                desc: 'Create beautiful pages for your projects. Get only verified interested buyers instead of wasting time on fake enquiries.',
                benefits: ['Project page in minutes', 'Auto lead qualification', 'Dashboard with analytics'],
                icon: Building2,
                color: '#B45309'
              },
              { 
                role: 'Sales Agents & Brokers',
                desc: 'Receive pre-qualified leads directly on WhatsApp with buyer details, budget info, and interest scores — ready to convert.',
                benefits: ['WhatsApp lead delivery', 'Lead call transcripts', 'Share project links easily'],
                icon: Users,
                color: '#0369A1'
              },
              { 
                role: 'Admin & Sales Managers',
                desc: 'Track all leads, agents, and projects from one admin panel. Approve agent access, monitor performance, and manage the pipeline.',
                benefits: ['Full admin dashboard', 'Role-based access control', 'Organization-level management'],
                icon: ShieldCheck,
                color: '#3F6212'
              }
            ].map((item, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="p-6 sm:p-8 rounded-2xl bg-white border border-[#E7E5E4] group hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ backgroundColor: `${item.color}12`, color: item.color }}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#2A2A2A] mb-2 font-serif">{item.role}</h3>
                <p className="text-sm text-[#57534E] mb-5 leading-relaxed">{item.desc}</p>
                <ul className="space-y-2">
                  {item.benefits.map((b, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-[#2A2A2A] font-medium">
                      <ChevronRight className="w-4 h-4 text-[#B45309]" />
                      {b}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Numbers / Capabilities */}
      <section className="py-16 px-4 bg-white border-t border-b border-[#E7E5E4]">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {[
              { value: '< 2 min', label: 'To Create a Project Page', icon: Clock },
              { value: '< 30s', label: 'Lead Gets First AI Call', icon: PhoneCall },
              { value: '100%', label: 'Enquiries Get Auto-Screened', icon: ShieldCheck },
              { value: 'Instant', label: 'Hot Leads on WhatsApp', icon: BellRing }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                {...fadeIn}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="text-center p-4 sm:p-6"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-[#B45309]/10 text-[#B45309] flex items-center justify-center mb-3">
                  <stat.icon className="w-5 h-5" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-[#2A2A2A] mb-1 font-serif">{stat.value}</h3>
                <p className="text-xs sm:text-sm font-medium text-[#78716C] uppercase tracking-wide">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 sm:py-20 px-4 bg-[#B45309] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10 text-white">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4 font-serif leading-tight">
            Stop Chasing Leads. Let Them Come to You — Pre-Qualified.
          </h2>
          <p className="text-white/70 mb-8 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Join builders across India who use HomeInTown to showcase their projects and 
            automatically filter every enquiry before it reaches their sales team.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#B45309] font-bold rounded-2xl hover:bg-[#FAF7F2] transition-all shadow-xl hover:-translate-y-1 hover:shadow-2xl"
          >
            Get Started — It&apos;s Free
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 sm:py-20 px-4 bg-[#2A2A2A] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 sm:gap-12 mb-12 sm:mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-10 h-10 bg-[#B45309] rounded-lg flex items-center justify-center font-serif font-bold text-xl">H</div>
                <span className="font-serif font-bold text-2xl tracking-tighter">HomeInTown</span>
              </div>
              <p className="text-[#A8A29E] max-w-sm mb-6 leading-relaxed text-sm">
                The complete sales suite for Indian real estate. 
                Create project pages, qualify leads with AI, and close deals faster — all from one platform.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-5 uppercase text-xs tracking-[0.2em] text-[#B45309]">Platform</h4>
              <ul className="space-y-3 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">Project Pages</li>
                <li className="hover:text-white cursor-pointer transition-colors">Lead Filtration</li>
                <li className="hover:text-white cursor-pointer transition-colors">Agent Dashboard</li>
                <li className="hover:text-white cursor-pointer transition-colors">Admin Panel</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-5 uppercase text-xs tracking-[0.2em] text-[#B45309]">Company</h4>
              <ul className="space-y-3 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">About Us</li>
                <li className="hover:text-white cursor-pointer transition-colors">Contact</li>
                <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[#78716C] text-xs font-bold uppercase tracking-widest">
            <p>© 2026 HomeInTown. Built for Indian Real Estate.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All Systems Operational
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
