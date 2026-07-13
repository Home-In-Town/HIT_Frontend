'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Shield, Users, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/authContext';

const ROLES = [
  {
    id: 'user',
    label: 'User',
    tag: 'Buyer / Investor',
    description: 'Search and explore real estate projects.',
    icon: User,
    color: '#3F6212',
    lightBg: '#F0FDF4',
    border: '#BBF7D0',
    shadow: '0 8px 32px rgba(63,98,18,0.13)',
    features: ['Browse Projects', 'View Listings', 'Enquire Directly'],
    demo: { phone: '8788699274', pin: '1111' },
  },
  {
    id: 'captain',
    label: 'Captain',
    tag: 'Builder / Team Lead',
    description: 'Sales executive and lead management.',
    icon: Users,
    color: '#0369A1',
    lightBg: '#F0F9FF',
    border: '#BAE6FD',
    shadow: '0 8px 32px rgba(3,105,161,0.13)',
    features: ['Manage Projects', 'Track Leads', 'Team Analytics'],
    canRegister: true,
    demo: { phone: '8788699274', pin: '1111' },
  },
  {
    id: 'admin',
    label: 'Admin',
    tag: 'Full Access',
    description: 'Manage projects, employees, analytics and system.',
    icon: Shield,
    color: '#B45309',
    lightBg: '#FFFBEB',
    border: '#FDE68A',
    shadow: '0 8px 32px rgba(180,83,9,0.13)',
    features: ['All Features', 'CRM & Lead Matching', 'System Management'],
    demo: { phone: '8788699274', pin: '1111' },
  },
] as const;

export default function RoleSelectPage() {
  const { status, logout } = useAuth();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'authenticated') {
      // Log out the existing session, then show the cards
      logout().finally(() => setReady(true));
    } else {
      setReady(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-[#B45309]" />
        <p className="text-xs text-[#A8A29E] font-medium tracking-wide">Preparing login…</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center px-4 py-14 relative overflow-hidden">

      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#B45309]/6 rounded-full blur-[120px] pointer-events-none -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#0369A1]/5 rounded-full blur-[100px] pointer-events-none translate-y-1/4 -translate-x-1/4" />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10 relative z-10"
      >
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-2xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-xl shadow-[#B45309]/25 group-hover:scale-105 transition-transform">
            H
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-[#2A2A2A] tracking-tighter font-serif leading-none">HomeInTown</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#B45309] font-bold mt-0.5">Sales Intelligence</span>
          </div>
        </Link>
      </motion.div>

      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="text-center mb-10 relative z-10 px-2"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-[#2A2A2A] font-serif tracking-tight mb-2">
          Welcome to HomeInTown
        </h1>
        <p className="text-[#78716C] text-base sm:text-lg">
          Choose how you want to continue.
        </p>
      </motion.div>

      {/* Cards */}
      <div className="w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-5 relative z-10">
        {ROLES.map((role, i) => {
          const Icon = role.icon;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="group"
            >
              <Link
                href={`/dashboard-login?role=${role.id}`}
                className="flex flex-col h-full rounded-3xl border-2 overflow-hidden transition-all duration-300 group-hover:shadow-2xl"
                style={{
                  backgroundColor: role.lightBg,
                  borderColor: role.border,
                  boxShadow: role.shadow,
                }}
              >
                {/* Colour accent bar */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ background: `linear-gradient(90deg,${role.color},${role.color}66)` }}
                />

                <div className="flex flex-col flex-1 p-6 sm:p-7">
                  {/* Icon + tag row */}
                  <div className="flex items-start justify-between mb-6">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300"
                      style={{ background: `linear-gradient(135deg,${role.color}22,${role.color}0D)`, color: role.color }}
                    >
                      <Icon strokeWidth={1.8} style={{ width: 26, height: 26 }} />
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mt-1"
                      style={{ backgroundColor: `${role.color}15`, color: role.color }}
                    >
                      {role.tag}
                    </span>
                  </div>

                  {/* Label + description */}
                  <h2 className="text-xl font-bold font-serif tracking-tight text-[#1C1917] mb-1.5">
                    {role.label}
                  </h2>
                  <p className="text-sm text-[#57534E] leading-relaxed mb-5">
                    {role.description}
                  </p>

                  {/* Feature bullets */}
                  <ul className="space-y-2 flex-1 mb-5">
                    {role.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs font-semibold text-[#44403C]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* Demo credentials */}
                  <div
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-4 text-[11px] font-mono font-bold"
                    style={{ backgroundColor: `${role.color}0E`, color: role.color }}
                  >
                    <span className="opacity-60 font-sans font-semibold text-[10px] uppercase tracking-wide">Demo</span>
                    <span>{role.demo.phone}</span>
                    <span>PIN: {role.demo.pin}</span>
                  </div>

                  {/* CTA button */}
                  <div
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white transition-all duration-200 group-hover:opacity-95 group-hover:shadow-lg"
                    style={{
                      background: `linear-gradient(135deg,${role.color},${role.color}CC)`,
                    }}
                  >
                    Continue as {role.label}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-12 text-center text-[#A8A29E] text-[10px] font-bold uppercase tracking-widest relative z-10"
      >
        <div className="flex items-center justify-center gap-3">
          <span>© 2026 HomeInTown</span>
          <span className="w-1 h-1 bg-[#D6D3D1] rounded-full" />
          <span>Secure &amp; Private</span>
        </div>
      </motion.footer>
    </main>
  );
}
