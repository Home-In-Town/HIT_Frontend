'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, User, ArrowRight, ArrowLeft,
  Eye, EyeOff, Phone, Lock, Building2, UserPlus, LogIn,
  Copy, Check,
} from 'lucide-react';
import { useAuth } from '@/lib/authContext';
import { authApi } from '@/lib/api';
import { toast } from 'react-hot-toast';

/* ─── Role config ─── */
// All three roles share the same demo account (admin: 8788699274/1111).
// Captain and User are separate roles — register new accounts to get their own credentials.
const ROLE_CONFIG = {
  admin: {
    label: 'Admin',
    icon: Shield,
    color: '#B45309',
    demo: { phone: '8788699274', pin: '1111' },
    canRegister: false,
  },
  captain: {
    label: 'Captain',
    icon: Users,
    color: '#0369A1',
    demo: { phone: '8788699274', pin: '1111' },
    canRegister: true,
  },
  user: {
    label: 'User',
    icon: User,
    color: '#3F6212',
    demo: { phone: '8788699274', pin: '1111' },
    canRegister: false,
  },
} as const;

type RoleKey = keyof typeof ROLE_CONFIG;
type FormStep = 'login' | 'register' | 'otp';

/* ─── Helpers ─── */
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" aria-label="Copy"
      onClick={() => { navigator.clipboard.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
      className="ml-1 p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#78716C] uppercase tracking-wider mb-1.5 pl-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl py-3.5 px-4 text-[#2A2A2A] text-sm focus:outline-none focus:ring-2 focus:ring-[#B45309]/20 focus:border-[#B45309] transition-all placeholder:text-[#A8A29E]';

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function DashboardLoginPage() {
  const { status, checkAuth } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read role from ?role= param; fall back to 'user'
  const roleParam = searchParams.get('role') as RoleKey | null;
  const role: RoleKey = roleParam && roleParam in ROLE_CONFIG ? roleParam : 'user';
  const cfg = ROLE_CONFIG[role];
  const RoleIcon = cfg.icon;

  const [step, setStep] = useState<FormStep>('login');

  // Login state
  const [phone, setPhone] = useState(cfg.demo.phone);
  const [pin, setPin] = useState(cfg.demo.pin);
  const [showPin, setShowPin] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Captain register state
  const [regBusiness, setRegBusiness] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regPinConfirm, setRegPinConfirm] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regOtp, setRegOtp] = useState('');

  // Already authenticated → go straight to dashboard
  useEffect(() => {
    if (status === 'authenticated') router.replace('/dashboard');
  }, [status, router]);

  // When role param changes (user navigates back and picks different role),
  // reset demo credentials and go back to login step
  useEffect(() => {
    setPhone(cfg.demo.phone);
    setPin(cfg.demo.pin);
    setStep('login');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  /* ── Handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !pin.trim()) { toast.error('Enter mobile number and PIN'); return; }
    try {
      setLoginLoading(true);
      const formatted = phone.startsWith('+') ? phone : `+91${phone}`;
      await authApi.login(formatted, pin);
      toast.success('Welcome back!');
      await checkAuth();
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regBusiness.trim()) { toast.error('Business name is required'); return; }
    if (!/^[6-9]\d{9}$/.test(regPhone)) { toast.error('Enter a valid 10-digit mobile number'); return; }
    if (!/^\d{4,6}$/.test(regPin)) { toast.error('PIN must be 4–6 digits'); return; }
    if (regPin !== regPinConfirm) { toast.error('PINs do not match'); return; }
    try {
      setRegLoading(true);
      await authApi.register({ name: regBusiness, phone: `+91${regPhone}`, mpin: regPin, role: 'builder' });
      setStep('otp');
      toast.success('OTP sent to your number');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regOtp.length < 6) { toast.error('Enter the 6-digit OTP'); return; }
    try {
      setRegLoading(true);
      await authApi.verifyOtp(`+91${regPhone}`, regOtp);
      toast.success('Account created! Logging you in…');
      await checkAuth();
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'OTP verification failed');
    } finally {
      setRegLoading(false);
    }
  };

  /* ── Title text per step ── */
  const titles: Record<FormStep, { heading: string; sub: string }> = {
    login: { heading: `Sign in as ${cfg.label}`, sub: 'Demo credentials are pre-filled below.' },
    register: { heading: 'Create Captain Account', sub: 'Register your business to get started.' },
    otp: { heading: 'Verify Your Number', sub: `OTP sent to +91 ${regPhone}` },
  };
  const { heading, sub } = titles[step];

  return (
    <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-[#B45309]/20">
      {/* Ambient glows */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none -translate-y-1/3 translate-x-1/4"
        style={{ backgroundColor: `${cfg.color}0A` }} />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#0369A1]/4 rounded-full blur-3xl pointer-events-none translate-y-1/3 -translate-x-1/4" />

      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 group mb-8 relative z-10">
        <div className="w-11 h-11 bg-gradient-to-br from-[#B45309] to-[#92400E] rounded-2xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg shadow-[#B45309]/25 group-hover:scale-105 transition-transform">
          H
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold text-[#2A2A2A] tracking-tighter font-serif leading-none">HomeInTown</span>
          <span className="text-[10px] uppercase tracking-widest text-[#B45309] font-bold mt-0.5">Sales Intelligence</span>
        </div>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md relative z-10 bg-white rounded-[2rem] border border-[#E7E5E4] shadow-2xl shadow-black/5 overflow-hidden">

        {/* Colour top bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg,${cfg.color},${cfg.color}88)` }} />

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-[#F5F5F4]">
          <div className="flex items-center gap-3 mb-3">
            {/* Role icon badge */}
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
              <RoleIcon style={{ width: 20, height: 20 }} strokeWidth={1.8} />
            </div>
            {/* Back to role picker */}
            <Link href="/role-select"
              className="ml-auto flex items-center gap-1.5 text-xs font-bold text-[#78716C] hover:text-[#B45309] transition-colors group">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Change role
            </Link>
          </div>
          <h1 className="text-xl font-bold text-[#2A2A2A] font-serif tracking-tight">{heading}</h1>
          <p className="text-sm text-[#78716C] mt-0.5">{sub}</p>
        </div>

        {/* Body */}
        <div className="p-7">
          <AnimatePresence mode="wait">

            {/* ── LOGIN ── */}
            {step === 'login' && (
              <motion.form key="login"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin} className="space-y-4">

                {/* Demo hint */}
                <div className="flex items-center gap-2 p-3 rounded-2xl text-[11px] font-semibold"
                  style={{ backgroundColor: `${cfg.color}0D`, color: cfg.color }}>
                  <RoleIcon style={{ width: 14, height: 14, flexShrink: 0 }} strokeWidth={2} />
                  <span>
                    Demo — Mobile:&nbsp;
                    <span className="font-mono">{cfg.demo.phone}</span>
                    <CopyBtn value={cfg.demo.phone} />
                    &nbsp;· PIN:&nbsp;
                    <span className="font-mono">{cfg.demo.pin}</span>
                    <CopyBtn value={cfg.demo.pin} />
                  </span>
                </div>

                <Field label="Mobile Number">
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                    <input type="tel" inputMode="numeric" placeholder="10-digit mobile"
                      value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`${inputCls} pl-10 font-mono`} />
                  </div>
                </Field>

                <Field label="PIN">
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                    <input type={showPin ? 'text' : 'password'} inputMode="numeric" maxLength={6}
                      placeholder="Enter PIN"
                      value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className={[inputCls, 'pl-10 pr-11 text-xl', pin ? 'tracking-[0.6em]' : ''].join(' ')} />
                    <button type="button" onClick={() => setShowPin(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E] transition-colors">
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <button type="submit" disabled={loginLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm shadow-md group disabled:opacity-60 transition-all mt-1"
                  style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}BB)` }}>
                  {loginLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing in…</>
                    : <><LogIn className="w-4 h-4" />Sign in as {cfg.label}<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /></>}
                </button>

                {cfg.canRegister && (
                  <p className="text-center text-[11px] text-[#A8A29E] pt-1">
                    New here?{' '}
                    <button type="button" onClick={() => setStep('register')}
                      className="font-bold hover:underline" style={{ color: cfg.color }}>
                      Register a Captain account
                    </button>
                  </p>
                )}
              </motion.form>
            )}

            {/* ── REGISTER ── */}
            {step === 'register' && (
              <motion.form key="register"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister} className="space-y-3.5">

                <Field label="Business Name">
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                    <input type="text" placeholder="e.g. Mehta Builders Pvt Ltd"
                      value={regBusiness} onChange={(e) => setRegBusiness(e.target.value)}
                      className={`${inputCls} pl-10`} />
                  </div>
                </Field>

                <Field label="Mobile Number">
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8A29E]" />
                    <input type="tel" inputMode="numeric" placeholder="10-digit mobile number"
                      value={regPhone} onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className={`${inputCls} pl-10 font-mono`} />
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Set PIN">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
                      <input type={showRegPin ? 'text' : 'password'} inputMode="numeric" maxLength={6}
                        placeholder="4–6 digits"
                        value={regPin} onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={[inputCls, 'pl-9 pr-8 text-lg', regPin ? 'tracking-[0.5em]' : ''].join(' ')} />
                      <button type="button" onClick={() => setShowRegPin(v => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#57534E]">
                        {showRegPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm PIN">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A8A29E]" />
                      <input type={showRegPin ? 'text' : 'password'} inputMode="numeric" maxLength={6}
                        placeholder="Re-enter"
                        value={regPinConfirm} onChange={(e) => setRegPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={[inputCls, 'pl-9 text-lg', regPinConfirm ? 'tracking-[0.5em]' : ''].join(' ')} />
                    </div>
                  </Field>
                </div>

                <button type="submit" disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm transition-all shadow-md disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}BB)` }}>
                  {regLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sending OTP…</>
                    : <><UserPlus className="w-4 h-4" />Create Captain Account</>}
                </button>

                <p className="text-center text-[11px] text-[#A8A29E]">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setStep('login')}
                    className="font-bold hover:underline" style={{ color: cfg.color }}>
                    Login instead
                  </button>
                </p>
              </motion.form>
            )}

            {/* ── OTP ── */}
            {step === 'otp' && (
              <motion.form key="otp"
                initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleOtp} className="space-y-5">

                <div className="text-center py-4 px-5 rounded-2xl"
                  style={{ backgroundColor: `${cfg.color}0D` }}>
                  <p className="text-sm font-bold" style={{ color: cfg.color }}>OTP sent to +91 {regPhone}</p>
                  <p className="text-xs text-[#78716C] mt-0.5">Enter the 6-digit code below</p>
                </div>

                <Field label="6-Digit OTP">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    placeholder="000000"
                    value={regOtp} onChange={(e) => setRegOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={[inputCls, 'text-center text-3xl font-bold tracking-[0.4em]'].join(' ')}
                    style={{ color: cfg.color }} />
                </Field>

                <button type="submit" disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-white text-sm disabled:opacity-60 transition-all"
                  style={{ background: `linear-gradient(135deg,${cfg.color},${cfg.color}BB)` }}>
                  {regLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Verifying…</>
                    : 'Verify & Create Account'}
                </button>

                <button type="button" onClick={() => setStep('register')}
                  className="w-full text-xs text-[#A8A29E] hover:text-[#57534E] transition-colors py-1">
                  ← Back to registration
                </button>
              </motion.form>
            )}

          </AnimatePresence>
        </div>
      </div>

      <footer className="mt-8 text-center text-[#A8A29E] text-[10px] font-bold uppercase tracking-widest relative z-10">
        <div className="flex items-center justify-center gap-3">
          <span>© 2026 HomeInTown</span>
          <span className="w-1 h-1 bg-[#D6D3D1] rounded-full" />
          <span>Secure Login</span>
        </div>
      </footer>
    </main>
  );
}
