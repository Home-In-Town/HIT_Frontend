'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { profileApi, crmBridgeApi, projectsApi, ApiError, CrmStatus, AuthUser, mediaApi } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface OwnerAnalytics {
  totalVisits: number;
  uniqueLeads: number;
  totalProjects?: number;
}

const CRM_ROLES = ['admin', 'builder', 'agent'] as const;
type CrmRole = typeof CRM_ROLES[number];
function hasCrmAccess(role?: string): role is CrmRole {
  return CRM_ROLES.includes(role as CrmRole);
}

function getRoleLabel(role?: string) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    admin:    { label: 'Admin',    color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-200' },
    builder:  { label: 'Builder',  color: 'text-[#B45309]',  bg: 'bg-amber-50',   border: 'border-amber-200' },
    agent:    { label: 'Agent',    color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
    employee: { label: 'Employee', color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  };
  return map[role ?? ''] ?? { label: role ?? 'User', color: 'text-[#57534E]', bg: 'bg-[#FAF7F2]', border: 'border-[#E7E5E4]' };
}

function getInitials(name?: string) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#E7E5E4] last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <span className="text-sm font-semibold text-[#2A2A2A]">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  loading: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 transition-all group hover:shadow-lg hover:shadow-[#B45309]/5 hover:-translate-y-0.5 ${
      accent
        ? 'bg-[#B45309] border-[#B45309] text-white shadow-md shadow-[#B45309]/20'
        : 'bg-white border-[#E7E5E4]'
    }`}>
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${accent ? 'text-white' : 'text-[#B45309]'}`}>
        <div className="w-12 h-12">{icon}</div>
      </div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${accent ? 'bg-white/20' : 'bg-[#B45309]/8'}`}>
        <div className={`w-5 h-5 ${accent ? 'text-white' : 'text-[#B45309]'}`}>{icon}</div>
      </div>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${accent ? 'text-white/70' : 'text-[#A8A29E]'}`}>{label}</p>
      {loading ? (
        <div className={`h-7 w-14 rounded animate-pulse ${accent ? 'bg-white/20' : 'bg-[#E7E5E4]'}`} />
      ) : (
        <p className={`text-2xl font-bold font-serif ${accent ? 'text-white' : 'text-[#2A2A2A]'}`}>{value}</p>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-6 py-5 border-b border-[#E7E5E4] flex items-center gap-3">
      <div className="w-0.5 h-5 bg-[#B45309] rounded-full" />
      <div>
        <h2 className="text-sm font-bold text-[#2A2A2A] font-serif">{title}</h2>
        {subtitle && <p className="text-xs text-[#A8A29E] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProfilePage() {
  const { user, status, setUser } = useAuth();
  const router = useRouter();
  const authLoading = status === 'loading';

  /* ---------- Section 1: Edit Profile state ---------- */
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileCompany, setProfileCompany] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState('');

  /* ---------- Section 2: CRM Integration state ---------- */
  const [crmStatus, setCrmStatus] = useState<CrmStatus | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [crmActionLoading, setCrmActionLoading] = useState(false);
  const [crmError, setCrmError] = useState<string | null>(null);
  const [showSwitchForm, setShowSwitchForm] = useState(false);
  const [switchInput, setSwitchInput] = useState('');
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  /* ---------- Section 3: Activity Summary state ---------- */
  const [ownerAnalytics, setOwnerAnalytics] = useState<OwnerAnalytics | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* ---------- Auth guard ---------- */
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace('/login');
  }, [user, authLoading, router]);

  /* ---------- Seed edit-profile form from user ---------- */
  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? '');
      setProfileEmail(user.email ?? '');
      setProfileCompany(user.companyName ?? '');
      setLogoUrl(user.businessLogoUrl ?? '');
    }
  }, [user]);

  /* ---------- Fetch CRM status ---------- */
  useEffect(() => {
    if (!user || !hasCrmAccess(user.role)) return;
    setCrmLoading(true);
    crmBridgeApi.getStatus()
      .then(setCrmStatus)
      .catch(() => setCrmError('Failed to load CRM status.'))
      .finally(() => setCrmLoading(false));
  }, [user]);

  /* ---------- Fetch activity summary ---------- */
  useEffect(() => {
    if (!user) return;
    setAnalyticsLoading(true);
    const analyticsPromise = fetch(
      `${process.env.NEXT_PUBLIC_API_URL || '/api'}/analytics/owner`,
      { credentials: 'include' }
    ).then(r => (r.ok ? r.json() : Promise.reject())).catch(() => null);

    const projectsPromise = projectsApi.getAll()
      .then(projects => projects.filter(p => p.isPublished).length)
      .catch(() => null);

    Promise.all([analyticsPromise, projectsPromise]).then(([analytics, published]) => {
      setOwnerAnalytics(analytics);
      setPublishedCount(published);
      setAnalyticsLoading(false);
    });
  }, [user]);

  /* ----------------------------------------------------------------
   * Handlers
   * ---------------------------------------------------------------- */

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
    setProfileError("User not found.");
    return;
    }
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated: AuthUser = await profileApi.update({
        name: profileName.trim() || undefined,
        email: profileEmail.trim() || undefined,
        companyName: profileCompany.trim() || undefined,
        ...(user.role === 'captain' && { businessLogoUrl: logoUrl || undefined }),
      });
      setUser(updated);
      setProfileSuccess(true);
      setEditOpen(false);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setProfileError('That email is already registered to another account.');
      } else {
        setProfileError('Failed to save changes. Please try again.');
      }
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Logo must be JPEG, PNG, or WebP');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo must be 5 MB or smaller');
      return;
    }
    try {
      setLogoUploading(true);
      const result = await mediaApi.uploadAndSave({ file, projectId: 'captain-logo', type: 'cover' });
      setLogoUrl(result.url);
    } catch {
      alert('Logo upload failed — please try again');
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleDisconnect() {
    setCrmActionLoading(true);
    setCrmError(null);
    try {
      await crmBridgeApi.unlink();
      setCrmStatus({ linked: false });
      setShowSwitchForm(false);
    } catch {
      setCrmError('Failed to disconnect. Please try again.');
    } finally {
      setCrmActionLoading(false);
    }
  }

  async function handleSwitch(e: React.FormEvent) {
    e.preventDefault();
    if (!switchInput.trim()) return;
    setSwitchLoading(true);
    setSwitchError(null);
    try {
      const result = await crmBridgeApi.link(switchInput.trim());
      setCrmStatus({ linked: true, connectedEmail: result.ownerEmail, connectedPhone: result.ownerPhone });
      setShowSwitchForm(false);
      setSwitchInput('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setSwitchError('That OneEmployee account is already connected to another HIT user.');
        else if (err.status === 404) setSwitchError('No matching OneEmployee account found.');
        else setSwitchError('Failed to switch account. Please try again.');
      } else {
        setSwitchError('Failed to switch account. Please try again.');
      }
    } finally {
      setSwitchLoading(false);
    }
  }

  /* ----------------------------------------------------------------
   * Render guards
   * ---------------------------------------------------------------- */

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
      </div>
    );
  }

  const roleStyle = getRoleLabel(user.role);
  const maskedPhone = crmStatus?.connectedPhone
    ? `••••${crmStatus.connectedPhone.slice(-4)}`
    : '—';
  const memberSince = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20">

      {/* ── Hero Banner ── */}
      <div className="relative bg-white border-b border-[#E7E5E4] overflow-hidden">
        {/* Subtle warm mesh background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 80% at 5% 50%, rgba(180,83,9,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 60% at 95% 20%, rgba(180,83,9,0.04) 0%, transparent 50%)',
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#B45309] to-[#92400E] flex items-center justify-center shadow-xl shadow-[#B45309]/25 text-white text-2xl font-bold font-serif select-none">
                {getInitials(user.name)}
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-xl bg-green-500 border-2 border-white shadow-md flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight truncate">
                  {user.name || 'My Profile'}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${roleStyle.color} ${roleStyle.bg} ${roleStyle.border}`}>
                  {roleStyle.label}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#78716C]">
                {user.phone && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-mono font-semibold">{user.phone}</span>
                  </span>
                )}
                {user.email && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {user.email}
                  </span>
                )}
                {user.companyName && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {user.companyName}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-[#A8A29E]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Member since {memberSince}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={() => { setEditOpen(o => !o); setProfileError(null); setProfileSuccess(false); }}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#FAF7F2] border border-[#E7E5E4] hover:border-[#B45309]/40 hover:bg-white text-[#57534E] hover:text-[#B45309] text-sm font-semibold rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#B45309]/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* ── Profile success toast ── */}
        {profileSuccess && (
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-700 shadow-sm animate-in slide-in-from-top-2">
            <svg className="w-5 h-5 flex-shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold">Profile updated successfully.</span>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            EDIT PROFILE — collapsible inline form
        ══════════════════════════════════════════════════════════ */}
        {editOpen && (
          <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
            <SectionHeader title="Edit Profile" subtitle="Update your name, email, and company." />
            <form onSubmit={handleProfileSubmit} className="px-6 py-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="profile-name" className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="profile-name"
                    type="text"
                    value={profileName}
                    onChange={e => setProfileName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
                  />
                </div>
                <div>
                  <label htmlFor="profile-email" className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                    Email
                  </label>
                  <input
                    id="profile-email"
                    type="email"
                    value={profileEmail}
                    onChange={e => setProfileEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
                  />
                </div>
                <div>
                  <label htmlFor="profile-company" className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                    Company Name
                  </label>
                  <input
                    id="profile-company"
                    type="text"
                    value={profileCompany}
                    onChange={e => setProfileCompany(e.target.value)}
                    placeholder="Your company"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
                  />
                </div>
                {user.role === 'captain' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                      Business Logo
                    </label>
                    <div className="flex items-center gap-3">
                      {logoUrl && (
                        <img src={logoUrl} alt="Business logo" className="w-10 h-10 rounded-xl object-cover border border-[#E7E5E4]" />
                      )}
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={logoUploading}
                          onChange={handleLogoUpload}
                          className="w-full text-sm text-[#57534E] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-semibold file:bg-[#B45309]/10 file:text-[#B45309] hover:file:bg-[#B45309]/20 transition-all"
                        />
                        {logoUploading && <p className="text-xs text-[#B45309] mt-1">Uploading...</p>}
                        {logoUrl && !logoUploading && <p className="text-xs text-green-600 mt-1">✓ Logo ready</p>}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                    Phone Number
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="tel"
                      value={user.phone}
                      readOnly
                      aria-readonly="true"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-gray-50 text-sm text-[#A8A29E] cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[10px] text-[#A8A29E] mt-1">Phone changes require OTP via forgot-MPIN.</p>
                </div>
              </div>
              {profileError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-4">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {profileError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#B45309] text-white text-sm font-bold rounded-xl hover:bg-[#92400E] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-md shadow-[#B45309]/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
                >
                  {profileSaving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving…
                    </>
                  ) : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditOpen(false); setProfileError(null); }}
                  className="px-5 py-2.5 text-sm font-semibold text-[#57534E] bg-white border border-[#E7E5E4] rounded-xl hover:border-[#B45309]/30 hover:text-[#B45309] transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            ACTIVITY SUMMARY — stats row
        ══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Published Projects"
            value={publishedCount ?? '—'}
            loading={analyticsLoading}
            accent
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />
          <StatCard
            label="CRM Leads"
            value={ownerAnalytics?.uniqueLeads ?? '—'}
            loading={analyticsLoading}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <StatCard
            label="Unique Visitors"
            value={ownerAnalytics?.totalVisits ?? '—'}
            loading={analyticsLoading}
            icon={
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            ACCOUNT DETAILS — read-only card
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
          <SectionHeader title="Account Details" subtitle="Your identity on HomeInTown." />
          <div className="px-6 py-2">
            <InfoRow label="Full Name" value={user.name || '—'} />
            <InfoRow label="Phone" value={user.phone || '—'} />
            <InfoRow label="Email" value={user.email || '—'} />
            {user.companyName && <InfoRow label="Company" value={user.companyName} />}
            <InfoRow label="Role" value={roleStyle.label} />
            <InfoRow label="Account Status" value={user.isActive ? 'Active' : 'Inactive'} />
          </div>
          <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#E7E5E4] flex flex-wrap gap-3">
            <Link
              href="/auth/forgot-mpin"
              className="text-xs font-bold text-[#B45309] hover:underline focus:outline-none"
            >
              Change phone / MPIN →
            </Link>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            CRM INTEGRATION — admin / builder / agent only
        ══════════════════════════════════════════════════════════ */}
        {hasCrmAccess(user.role) && (
          <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
            <SectionHeader
              title="CRM Integration"
              subtitle="Connect your OneEmployee account to sync leads."
            />
            <div className="px-6 py-6">

              {/* Loading skeleton */}
              {crmLoading && (
                <div className="flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-2xl bg-[#E7E5E4]" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-32 bg-[#E7E5E4] rounded" />
                    <div className="h-3 w-48 bg-[#E7E5E4] rounded" />
                  </div>
                </div>
              )}

              {/* Error */}
              {!crmLoading && crmError && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {crmError}
                </div>
              )}

              {/* Not linked */}
              {!crmLoading && crmStatus && !crmStatus.linked && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-[#FAF7F2] rounded-2xl border border-dashed border-[#E7E5E4]">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#A8A29E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#2A2A2A]">Not Connected</p>
                    <p className="text-xs text-[#A8A29E] mt-0.5">Link your OneEmployee account to manage CRM leads.</p>
                  </div>
                  <Link
                    href="/dashboard/crm"
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-[#B45309] text-white text-sm font-bold rounded-xl hover:bg-[#92400E] transition shadow-md shadow-[#B45309]/20 active:scale-95"
                  >
                    Connect Account
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                </div>
              )}

              {/* Linked */}
              {!crmLoading && crmStatus && crmStatus.linked && !showSwitchForm && (
                <div className="space-y-4">
                  {/* Connected card */}
                  <div className="flex flex-wrap items-center gap-4 p-4 bg-green-50/50 border border-green-100 rounded-2xl">
                    <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-green-700">Connected</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {crmStatus.degraded && (
                          <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">Service degraded</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-[#57534E]">
                        {crmStatus.connectedEmail && <span>{crmStatus.connectedEmail}</span>}
                        {crmStatus.connectedPhone && <span className="font-mono">{maskedPhone}</span>}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/crm"
                      className="flex items-center gap-2 px-4 py-2 bg-[#B45309] text-white text-sm font-bold rounded-xl hover:bg-[#92400E] transition shadow-md shadow-[#B45309]/20 active:scale-95"
                    >
                      Open CRM Dashboard
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                    <button
                      onClick={() => { setShowSwitchForm(true); setSwitchError(null); setSwitchInput(''); }}
                      className="px-4 py-2 text-sm font-semibold text-[#B45309] bg-[#FAF7F2] border border-[#B45309]/20 rounded-xl hover:border-[#B45309]/50 transition active:scale-95"
                    >
                      Switch Account
                    </button>
                    <button
                      onClick={handleDisconnect}
                      disabled={crmActionLoading}
                      className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 disabled:opacity-60 transition active:scale-95"
                    >
                      {crmActionLoading ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                          Disconnecting…
                        </span>
                      ) : 'Disconnect'}
                    </button>
                  </div>
                </div>
              )}

              {/* Switch Account form */}
              {!crmLoading && crmStatus?.linked && showSwitchForm && (
                <form onSubmit={handleSwitch} className="space-y-3 p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#57534E]">Enter new OneEmployee phone or email</p>
                  <input
                    type="text"
                    value={switchInput}
                    onChange={e => setSwitchInput(e.target.value)}
                    placeholder="Phone number or email"
                    autoFocus
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-white text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
                  />
                  {switchError && <p className="text-xs text-red-600">{switchError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={switchLoading || !switchInput.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#B45309] rounded-xl hover:bg-[#92400E] disabled:opacity-60 transition active:scale-95"
                    >
                      {switchLoading ? (
                        <><span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Connecting…</>
                      ) : 'Connect'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowSwitchForm(false); setSwitchError(null); }}
                      className="px-4 py-2 text-sm font-semibold text-[#57534E] bg-white border border-[#E7E5E4] rounded-xl hover:border-[#B45309]/30 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            QUICK LINKS
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
          <SectionHeader title="Quick Navigation" subtitle="Jump to key areas of your dashboard." />
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { href: '/dashboard', label: 'Dashboard Overview', desc: 'Your main control panel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              ...(hasCrmAccess(user.role) ? [
                { href: '/dashboard/projects', label: 'Edit Projects', desc: 'Manage & update your listings', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
                { href: '/dashboard/crm', label: 'CRM Dashboard', desc: 'Leads & pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                { href: '/dashboard/analytics', label: 'Analytics', desc: 'Visitors & performance', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
              ] : []),
            ].map(({ href, label, desc, icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-4 p-4 rounded-2xl border border-[#E7E5E4] hover:border-[#B45309]/30 hover:bg-[#FAF7F2] hover:shadow-md hover:shadow-[#B45309]/5 transition-all active:scale-[0.98]"
              >
                <div className="w-9 h-9 rounded-xl bg-[#B45309]/8 flex items-center justify-center text-[#B45309] group-hover:bg-[#B45309] group-hover:text-white transition-all flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#2A2A2A] group-hover:text-[#B45309] transition-colors">{label}</p>
                  <p className="text-xs text-[#A8A29E]">{desc}</p>
                </div>
                <svg className="w-4 h-4 text-[#A8A29E] group-hover:text-[#B45309] group-hover:translate-x-0.5 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            DANGER ZONE — sign out
        ══════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
          <SectionHeader title="Account Actions" />
          <div className="px-6 py-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[#2A2A2A]">Sign out of HomeInTown</p>
              <p className="text-xs text-[#A8A29E] mt-0.5">You will be returned to the login screen.</p>
            </div>
            <button
              onClick={() => { window.location.href = '/login'; }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
