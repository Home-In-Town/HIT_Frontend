'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { profileApi, crmBridgeApi, projectsApi, ApiError, CrmStatus, AuthUser } from '@/lib/api';

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

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

/** Read-only info chip */
function InfoBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E]">{label}</span>
      <span className="text-sm font-medium text-[#2A2A2A]">{value}</span>
    </div>
  );
}

/** Stat card for activity summary */
function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | number;
  loading: boolean;
}) {
  return (
    <div className="bg-white border border-[#E7E5E4] rounded-2xl p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] mb-1">{label}</p>
      {loading ? (
        <div className="h-7 w-16 bg-gray-100 animate-pulse rounded" />
      ) : (
        <p className="text-2xl font-bold text-[#2A2A2A] font-serif">{value}</p>
      )}
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
    if (!user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  /* ---------- Seed edit-profile form from user ---------- */
  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? '');
      setProfileEmail(user.email ?? '');
      setProfileCompany(user.companyName ?? '');
    }
  }, [user]);

  /* ---------- Fetch CRM status (CRM roles only) ---------- */
  useEffect(() => {
    if (!user || !hasCrmAccess(user.role)) return;
    setCrmLoading(true);
    setCrmError(null);
    crmBridgeApi
      .getStatus()
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
    )
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .catch(() => null);

    const projectsPromise = projectsApi
      .getAll()
      .then((projects) => projects.filter((p) => p.isPublished).length)
      .catch(() => null);

    Promise.all([analyticsPromise, projectsPromise]).then(
      ([analytics, published]) => {
        setOwnerAnalytics(analytics);
        setPublishedCount(published);
        setAnalyticsLoading(false);
      }
    );
  }, [user]);

  /* ----------------------------------------------------------------
   * Handlers
   * ---------------------------------------------------------------- */

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      const updated: AuthUser = await profileApi.update({
        name: profileName.trim() || undefined,
        email: profileEmail.trim() || undefined,
        companyName: profileCompany.trim() || undefined,
      });
      setUser(updated);
      setProfileSuccess(true);
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
      setCrmStatus({
        linked: true,
        connectedEmail: result.ownerEmail,
        connectedPhone: result.ownerPhone,
      });
      setShowSwitchForm(false);
      setSwitchInput('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setSwitchError('That OneEmployee account is already connected to another HIT user.');
        } else if (err.status === 404) {
          setSwitchError('No matching OneEmployee account found for those credentials.');
        } else {
          setSwitchError('Failed to switch account. Please try again.');
        }
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

  const maskedPhone =
    crmStatus?.connectedPhone
      ? `••••${crmStatus.connectedPhone.slice(-4)}`
      : '—';

  /* ----------------------------------------------------------------
   * Render
   * ---------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-[#FAF7F2] pb-20">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-[#E7E5E4] px-6 py-6 shadow-sm shadow-[#B45309]/5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-[#2A2A2A] font-serif tracking-tight">
            My Profile
          </h1>
          <p className="mt-1 text-[#57534E] text-sm">
            Manage your account details, CRM connection, and activity summary.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1 — Edit Profile
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E7E5E4]">
            <h2 className="text-base font-bold text-[#2A2A2A] font-serif">Edit Profile</h2>
            <p className="text-xs text-[#A8A29E] mt-0.5">Update your name, email, and company name.</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="px-6 py-6 space-y-5">

            {/* Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5"
              >
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5"
              >
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
              />
            </div>

            {/* Company Name */}
            <div>
              <label
                htmlFor="profile-company"
                className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5"
              >
                Company Name
              </label>
              <input
                id="profile-company"
                type="text"
                value={profileCompany}
                onChange={(e) => setProfileCompany(e.target.value)}
                placeholder="Your company"
                className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-[#FAF7F2] text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
              />
            </div>

            {/* Phone — read-only */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#57534E] mb-1.5">
                Phone Number
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="tel"
                  value={user.phone}
                  readOnly
                  aria-readonly="true"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-gray-50 text-sm text-[#A8A29E] cursor-not-allowed"
                />
                <Link
                  href="/auth/forgot-mpin"
                  className="shrink-0 text-xs font-semibold text-[#B45309] hover:underline focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 rounded"
                >
                  Change phone number
                </Link>
              </div>
              <p className="text-[10px] text-[#A8A29E] mt-1">
                Phone changes require OTP verification via the forgot-MPIN flow.
              </p>
            </div>

            {/* Error / success feedback */}
            {profileError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                Profile updated successfully.
              </div>
            )}

            <button
              type="submit"
              disabled={profileSaving}
              className="w-full sm:w-auto px-6 py-2.5 bg-[#B45309] text-white text-sm font-semibold rounded-xl hover:bg-[#92400E] disabled:opacity-60 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
            >
              {profileSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2 — CRM Integration  (admin / builder / agent only)
        ═══════════════════════════════════════════════════════════ */}
        {hasCrmAccess(user.role) && (
          <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E7E5E4]">
              <h2 className="text-base font-bold text-[#2A2A2A] font-serif">CRM Integration</h2>
              <p className="text-xs text-[#A8A29E] mt-0.5">
                Connect your OneEmployee account to manage leads from HomeInTown.
              </p>
            </div>

            <div className="px-6 py-6">

              {/* Loading skeleton */}
              {crmLoading && (
                <div className="space-y-3">
                  <div className="h-5 w-32 bg-gray-100 animate-pulse rounded" />
                  <div className="h-4 w-48 bg-gray-100 animate-pulse rounded" />
                </div>
              )}

              {/* Error */}
              {!crmLoading && crmError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {crmError}
                </div>
              )}

              {/* Not linked */}
              {!crmLoading && crmStatus && !crmStatus.linked && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-600 uppercase tracking-widest">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      Not Connected
                    </span>
                  </div>
                  <Link
                    href="/dashboard/crm"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#B45309] text-white text-sm font-semibold rounded-xl hover:bg-[#92400E] transition focus:outline-none focus:ring-2 focus:ring-[#B45309]/40"
                  >
                    Connect OneEmployee Account
                  </Link>
                </div>
              )}

              {/* Linked */}
              {!crmLoading && crmStatus && crmStatus.linked && (
                <div className="space-y-5">

                  {/* Status badge + account details */}
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-xs font-bold text-green-700 uppercase tracking-widest border border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Connected
                    </span>
                    {crmStatus.connectedEmail && (
                      <InfoBadge label="Email" value={crmStatus.connectedEmail} />
                    )}
                    {crmStatus.connectedPhone && (
                      <InfoBadge label="Phone" value={maskedPhone} />
                    )}
                    {crmStatus.degraded && (
                      <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                        Limited data (service degraded)
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  {!showSwitchForm && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleDisconnect}
                        disabled={crmActionLoading}
                        className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed transition focus:outline-none focus:ring-2 focus:ring-red-300"
                      >
                        {crmActionLoading ? 'Disconnecting…' : 'Disconnect'}
                      </button>
                      <button
                        onClick={() => {
                          setShowSwitchForm(true);
                          setSwitchError(null);
                          setSwitchInput('');
                        }}
                        className="px-4 py-2 text-sm font-semibold text-[#B45309] bg-[#FAF7F2] border border-[#B45309]/20 rounded-xl hover:border-[#B45309]/40 transition focus:outline-none focus:ring-2 focus:ring-[#B45309]/30"
                      >
                        Switch Account
                      </button>
                      <Link
                        href="/dashboard/crm"
                        className="px-4 py-2 text-sm font-semibold text-[#57534E] bg-[#FAF7F2] border border-[#E7E5E4] rounded-xl hover:border-[#B45309]/30 hover:text-[#B45309] transition"
                      >
                        Open CRM Dashboard →
                      </Link>
                    </div>
                  )}

                  {/* Switch Account inline form */}
                  {showSwitchForm && (
                    <form onSubmit={handleSwitch} className="space-y-3 p-4 bg-[#FAF7F2] rounded-2xl border border-[#E7E5E4]">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#57534E]">
                        Enter your new OneEmployee phone or email
                      </p>
                      <input
                        type="text"
                        value={switchInput}
                        onChange={(e) => setSwitchInput(e.target.value)}
                        placeholder="Phone number or email"
                        autoFocus
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E7E5E4] bg-white text-sm text-[#2A2A2A] focus:outline-none focus:ring-2 focus:ring-[#B45309]/30 focus:border-[#B45309] transition"
                      />
                      {switchError && (
                        <p className="text-xs text-red-600">{switchError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={switchLoading || !switchInput.trim()}
                          className="px-4 py-2 text-sm font-semibold text-white bg-[#B45309] rounded-xl hover:bg-[#92400E] disabled:opacity-60 disabled:cursor-not-allowed transition"
                        >
                          {switchLoading ? 'Connecting…' : 'Connect'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowSwitchForm(false);
                            setSwitchError(null);
                          }}
                          className="px-4 py-2 text-sm font-semibold text-[#57534E] bg-white border border-[#E7E5E4] rounded-xl hover:border-[#B45309]/30 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3 — Activity Summary
        ═══════════════════════════════════════════════════════════ */}
        <section className="bg-white border border-[#E7E5E4] rounded-3xl shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E7E5E4]">
            <h2 className="text-base font-bold text-[#2A2A2A] font-serif">Activity Summary</h2>
            <p className="text-xs text-[#A8A29E] mt-0.5">Your last 30 days across projects and visitors.</p>
          </div>

          <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Published Projects"
              value={publishedCount ?? '—'}
              loading={analyticsLoading}
            />
            <StatCard
              label="Total CRM Leads"
              value={ownerAnalytics?.uniqueLeads ?? '—'}
              loading={analyticsLoading}
            />
            <StatCard
              label="Unique Visitors"
              value={ownerAnalytics?.totalVisits ?? '—'}
              loading={analyticsLoading}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
