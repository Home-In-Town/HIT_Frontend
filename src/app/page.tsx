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
  Database,
  Users,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
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

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
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
            Real Estate Sales Suite 2.0
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-5xl sm:text-7xl font-bold text-[#2A2A2A] mb-8 leading-[1.1] font-serif tracking-tight"
          >
            The Intelligent Sales Suite for <br />
            <span className="text-[#B45309] relative inline-block">
              Modern Builders
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 100 8" preserveAspectRatio="none">
                <path d="M0 7C20 7 30 2 50 2C70 2 80 7 100 7" stroke="#B45309" strokeWidth="2" fill="none" />
              </svg>
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg sm:text-xl text-[#57534E] mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Beyond property websites. Power your entire sales funnel with 
            AI-driven lead qualification and automated buyer outreach.
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
              Get Started Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-[#2A2A2A] font-bold rounded-2xl border border-[#E7E5E4] hover:border-[#D6D3D1] transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
              Watch Demo
            </button>
          </motion.div>
        </div>
      </section>

      {/* Dual Pillar Strategy Section */}
      <section className="py-24 px-4 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Pillar 1: Identity */}
            <motion.div 
              {...fadeIn}
              className="p-10 rounded-[2.5rem] bg-[#FAF7F2] border border-[#E7E5E4] relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Globe className="w-32 h-32 text-[#B45309]" />
              </div>
              <div className="inline-flex p-3 bg-white rounded-2xl border border-[#E7E5E4] shadow-sm mb-6 text-[#B45309]">
                <Layout className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 font-serif">Dynamic Property Identity</h2>
              <p className="text-[#57534E] mb-8 leading-relaxed">
                Create premium, RERA-compliant property micro-sites in under 5 minutes. 
                Perfect for showcasing flats, plots, and commercial projects with industrial-grade aesthetics.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  'Instant SEO-ready landing pages',
                  'Standardized RERA verification badges',
                  'High-conversion property forms',
                  'Mobile-first responsive layouts'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium text-[#2A2A2A]">
                    <CheckCircle2 className="w-5 h-5 text-[#3F6212]" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="h-40 bg-white rounded-2xl border border-[#E7E5E4] shadow-inner p-4 relative overflow-hidden">
                <div className="absolute inset-x-8 top-8 h-8 bg-[#FAF7F2] rounded-md animate-pulse" />
                <div className="absolute inset-x-8 top-20 h-4 bg-[#FAF7F2] rounded-md w-2/3 animate-pulse" />
                <div className="absolute inset-x-8 top-28 h-4 bg-[#FAF7F2] rounded-md w-1/2 animate-pulse" />
              </div>
            </motion.div>

            {/* Pillar 2: Intelligence */}
            <motion.div 
              {...fadeIn}
              transition={{ delay: 0.2 }}
              className="p-10 rounded-[2.5rem] bg-[#2A2A2A] text-white border border-gray-800 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <PhoneCall className="w-32 h-32 text-[#B45309]" />
              </div>
              <div className="inline-flex p-3 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm mb-6 text-[#B45309]">
                <Activity className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-bold mb-4 font-serif">AI-Powered Lead Filtration</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Stop wasting time on cold calls. Our AI platform qualifies every lead 
                from your websites instantly through natural voice protocols.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <PhoneCall className="w-6 h-6 text-[#B45309] mb-3" />
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">Voice AI</h4>
                  <p className="text-[11px] text-gray-500">1,000+ leads qualified per hour</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                  <MessageCircle className="w-6 h-6 text-[#3F6212] mb-3" />
                  <h4 className="font-bold text-sm mb-1 uppercase tracking-tight">WhatsApp</h4>
                  <p className="text-[11px] text-gray-500">Instant routing to your agents</p>
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between group-hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-bold uppercase tracking-widest">2-Way CRM Sync</span>
                </div>
                <Zap className="w-4 h-4 text-[#B45309] fill-[#B45309]" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Section: The "Command Center" */}
      <section className="py-24 px-4 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-4 font-serif">Command Center Performance</h2>
            <p className="text-[#78716C] max-w-2xl mx-auto uppercase text-xs font-bold tracking-[0.2em]">Real-time Network Statistics</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { label: 'Leads Qualified Today', value: '12,842', trend: '+12.4% vs avg', icon: Users, color: '#B45309' },
              { label: 'System Accuracy', value: '99.2%', trend: 'CONFIDENCE: HIGH', icon: ShieldCheck, color: '#3F6212' },
              { label: 'Avg. Response Time', value: '42s', trend: 'LATENCY: 12ms', icon: Zap, color: '#0369A1' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white rounded-3xl border border-[#E7E5E4] shadow-sm flex flex-col items-center text-center group"
              >
                <div className="mb-6 p-4 rounded-2xl transition-colors group-hover:bg-[#FAF7F2]" style={{ color: stat.color, backgroundColor: `${stat.color}10` }}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <p className="text-xs font-black uppercase tracking-[0.1em] text-[#78716C] mb-2">{stat.label}</p>
                <h3 className="text-5xl font-bold text-[#2A2A2A] mb-4 font-serif">{stat.value}</h3>
                <div className="px-3 py-1 bg-[#F5F5F4] rounded-full text-[10px] font-bold text-[#57534E] uppercase tracking-tighter">
                  {stat.trend}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Lead Filtration Link Section */}
      <section className="py-16 px-4 bg-[#B45309] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:24px_24px]" />
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 font-serif leading-tight italic">
            &quot;We filtered 5,000+ leads in 4 days and closed 12 premium flats using HomeInTown AI.&quot;
          </h2>
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-full border border-white/40 flex items-center justify-center text-xl font-bold">VS</div>
            <div className="text-left">
              <p className="font-bold text-lg leading-none">Vivek Sharma</p>
              <p className="text-white/60 text-sm">Director, Skyline Builders</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] mb-4 font-serif">The Blueprint to Success</h2>
            <p className="text-[#78716C] font-medium">Simple. Scalable. Smart.</p>
          </div>
          
          <div className="relative">
            {/* Visual Line */}
            <div className="absolute left-[39px] sm:left-1/2 top-0 bottom-0 w-px bg-[#E7E5E4] hidden sm:block" />
            
            <div className="space-y-16">
              {[
                { 
                  step: '01', 
                  title: 'Build Project Identity', 
                  desc: 'Input project details and launch your premium micro-site instantly.',
                  side: 'left'
                },
                { 
                  step: '02', 
                  title: 'Activate AI Filtration', 
                  desc: 'Our AI calls every visitor from your site to qualify their budget and interest.',
                  side: 'right'
                },
                { 
                  step: '03', 
                  title: 'Close with Confidence', 
                  desc: 'Receive pre-qualified, interested buyers directly in your WhatsApp or CRM.',
                  side: 'left'
                }
              ].map((item, index) => (
                <div key={index} className={`flex items-center gap-8 ${item.side === 'right' ? 'sm:flex-row-reverse' : ''}`}>
                  <div className="flex-1 hidden sm:block" />
                  <div className="relative z-10 w-20 h-20 rounded-full bg-[#FAF7F2] border-4 border-white shadow-xl flex items-center justify-center text-2xl font-black text-[#B45309] font-serif shrink-0">
                    {item.step}
                  </div>
                  <div className="flex-1 text-left sm:text-left">
                    <h3 className="text-xl font-bold text-[#2A2A2A] mb-2 font-serif">{item.title}</h3>
                    <p className="text-[#57534E] leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-4 bg-[#2A2A2A] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-[#B45309] rounded-lg flex items-center justify-center font-serif font-bold text-xl">H</div>
                <span className="font-serif font-bold text-2xl tracking-tighter">HomeInTown</span>
              </div>
              <p className="text-[#A8A29E] max-w-sm mb-8 leading-relaxed">
                The modern operating system for real estate sales. Identity, Intelligence, and Integration combined in one suite.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" />
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" />
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" />
              </div>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-[0.2em] text-[#B45309]">Platform</h4>
              <ul className="space-y-4 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">Property Builder</li>
                <li className="hover:text-white cursor-pointer transition-colors">AI Lead Finder</li>
                <li className="hover:text-white cursor-pointer transition-colors">CRM Integration</li>
                <li className="hover:text-white cursor-pointer transition-colors">Analytics Vault</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase text-xs tracking-[0.2em] text-[#B45309]">Contact</h4>
              <ul className="space-y-4 text-sm text-[#A8A29E]">
                <li className="hover:text-white cursor-pointer transition-colors">Support Center</li>
                <li className="hover:text-white cursor-pointer transition-colors">Partnerships</li>
                <li className="hover:text-white cursor-pointer transition-colors">Media Kit</li>
                <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-[#78716C] text-xs font-bold uppercase tracking-widest">
            <p>© 2026 HomeInTown. Built for Indian Real Estate.</p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              SYSTEM_READY: ALL_PROTOCOLS_ACTIVE
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
