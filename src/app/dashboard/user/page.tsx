'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { projectsApi, type Project } from '@/lib/api';
import {
  Building2, MapPin, ArrowUpRight, Lock, BarChart3,
  ShoppingBag, MessageCircle, Phone, Eye, Star,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

/* ── Locked feature card shown as a teaser ── */
function LockedFeatureCard({ icon: Icon, label, desc }: { icon: React.ElementType; label: string; desc: string }) {
  return (
    <div className="relative p-5 rounded-2xl border border-[#E7E5E4] bg-white overflow-hidden group">
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 rounded-2xl">
        <Lock className="w-5 h-5 text-[#A8A29E] mb-1" />
        <span className="text-xs font-bold text-[#A8A29E]">Admin / Captain only</span>
      </div>
      <div className="opacity-30 pointer-events-none select-none">
        <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] flex items-center justify-center text-[#B45309] mb-3">
          <Icon className="w-5 h-5" />
        </div>
        <p className="font-bold text-sm text-[#2A2A2A]">{label}</p>
        <p className="text-xs text-[#78716C] mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

/* ── Tiny stat pill ── */
function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center px-4 py-3 rounded-2xl" style={{ backgroundColor: `${color}0D` }}>
      <span className="text-lg font-bold" style={{ color }}>{value}</span>
      <span className="text-[10px] font-semibold text-[#78716C] uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

export default function UserOverviewPage() {
  const { user, status } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);

  // Guard: only 'user' role
  useEffect(() => {
    if (status === 'loading') return;
    if (!user) { router.replace('/dashboard-login'); return; }
    if (user.role !== 'user') { router.replace('/dashboard'); }
  }, [user, status, router]);

  // Load public projects to browse
  useEffect(() => {
    projectsApi.getAllPublic()
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoadingProjects(false));
  }, []);

  if (status === 'loading' || !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-[#FAF7F2]">

      {/* ── Hero header ── */}
      <div className="bg-gradient-to-br from-[#1C1917] to-[#2A2A2A] px-6 py-8 lg:px-10 lg:py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <p className="text-[#B45309] text-xs font-bold uppercase tracking-widest mb-1">{greeting}</p>
          <h1 className="text-2xl lg:text-3xl font-bold text-white font-serif tracking-tight mb-1">
            {user.name || 'Welcome'}
          </h1>
          <p className="text-[#A8A29E] text-sm">Browse available projects and enquire directly with builders.</p>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-3 mt-5">
            <StatPill label="Projects" value={projects.length} color="#B45309" />
            <StatPill label="Role" value="User" color="#3F6212" />
            <StatPill label="Access" value="Read-only" color="#0369A1" />
          </div>
        </motion.div>
      </div>

      <div className="px-6 py-6 lg:px-10 lg:py-8 space-y-8 max-w-5xl">

        {/* ── Locked features teaser ── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-[#2A2A2A]">Platform Features</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#A8A29E]/10 text-[#A8A29E] uppercase tracking-wide">
              Upgrade to unlock
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <LockedFeatureCard icon={BarChart3} label="Analytics" desc="Track views, leads & CTAs per project" />
            <LockedFeatureCard icon={ShoppingBag} label="Marketplace" desc="List & discover properties" />
            <LockedFeatureCard icon={MessageCircle} label="CRM & Chat" desc="Full lead pipeline & deal rooms" />
            <LockedFeatureCard icon={Building2} label="Project Manager" desc="Create and publish listings" />
          </div>
        </section>

        {/* ── Browse public projects ── */}
        <section>
          <h2 className="text-base font-bold text-[#2A2A2A] mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#B45309]" />
            Browse Projects
            {!loadingProjects && (
              <span className="ml-auto text-xs font-semibold text-[#78716C]">{projects.length} live</span>
            )}
          </h2>

          {loadingProjects ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 rounded-2xl bg-[#E7E5E4] animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-[#A8A29E] text-sm">No projects available yet.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="bg-white rounded-2xl border border-[#E7E5E4] overflow-hidden hover:shadow-lg hover:shadow-[#B45309]/5 hover:-translate-y-0.5 transition-all duration-300 group"
                >
                  {/* Cover image or placeholder */}
                  <div className="relative h-36 bg-gradient-to-br from-[#FAF7F2] to-[#E7E5E4] overflow-hidden">
                    {project.coverImage ? (
                      <img
                        src={typeof project.coverImage === 'string' ? project.coverImage : (project.coverImage as any).url}
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-10 h-10 text-[#D6D3D1]" />
                      </div>
                    )}
                    {/* Type badge */}
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-lg bg-[#1C1917]/70 text-white backdrop-blur-sm">
                      {project.type || 'Flat'}
                    </span>
                    {/* RERA badge */}
                    {project.reraApproved && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] font-bold rounded-lg bg-[#3F6212]/80 text-white backdrop-blur-sm flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-white" /> RERA
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-[#2A2A2A] text-sm truncate">{project.name}</h3>

                    {project.startingPrice > 0 && (
                      <p className="text-[#B45309] font-bold text-sm mt-0.5">
                        ₹{(project.startingPrice / 100000).toFixed(1)} Lac
                        {project.pricePerSqFt > 0 && (
                          <span className="text-[#A8A29E] font-normal text-[11px] ml-1">
                            · ₹{project.pricePerSqFt.toLocaleString()}/sqft
                          </span>
                        )}
                      </p>
                    )}

                    <div className="flex items-center gap-1 mt-1.5 text-[11px] text-[#78716C]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{[project.location, project.city].filter(Boolean).join(', ')}</span>
                    </div>

                    {project.bhkOptions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.bhkOptions.slice(0, 3).map((b) => (
                          <span key={b} className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-[#FAF7F2] text-[#57534E] border border-[#E7E5E4]">{b}</span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-3">
                      {project.slug ? (
                        <Link
                          href={`/visit/${project.slug}`}
                          className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-xl bg-[#B45309] text-white hover:bg-[#92400E] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Link>
                      ) : (
                        <button disabled className="flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-bold rounded-xl bg-[#FAF7F2] text-[#A8A29E] cursor-not-allowed">
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                      )}
                      {project.whatsappNumber && (
                        <a
                          href={`https://wa.me/${project.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, I'm interested in ${project.name}`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 px-3 py-2 text-[11px] font-bold rounded-xl bg-[#22C55E]/10 text-[#16A34A] hover:bg-[#22C55E]/20 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {project.callNumber && (
                        <a
                          href={`tel:${project.callNumber}`}
                          className="flex items-center justify-center gap-1 px-3 py-2 text-[11px] font-bold rounded-xl bg-[#0369A1]/10 text-[#0369A1] hover:bg-[#0369A1]/20 transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* ── Upgrade CTA ── */}
        <section>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#B45309] to-[#92400E] p-6 text-white">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:20px_20px]" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg font-serif">Want full access?</p>
                <p className="text-white/70 text-sm mt-0.5">Contact your Admin to get promoted to Captain or Agent role.</p>
              </div>
              <Link
                href="/"
                className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 bg-white text-[#B45309] font-bold text-sm rounded-xl hover:bg-[#FAF7F2] transition-colors"
              >
                Learn More <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
