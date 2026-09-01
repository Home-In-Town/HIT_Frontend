'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Where the referral code is stashed so the register form can pick it up.
export const REFERRAL_STORAGE_KEY = 'hit_referral_code';

function JoinRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const ref = (params.get('ref') || '').trim();
    if (ref) {
      try {
        sessionStorage.setItem(REFERRAL_STORAGE_KEY, ref);
      } catch {
        // storage blocked — the register screen also reads ?ref= as a fallback
      }
    }
    // Send them into the auth flow; carry ?ref= through so the form can read it directly too.
    router.replace(ref ? `/login?ref=${encodeURIComponent(ref)}` : '/login');
  }, [params, router]);

  return (
    <main className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-[#B45309] rounded-2xl flex items-center justify-center text-white font-serif font-bold text-2xl shadow-lg">H</div>
      <div className="flex items-center gap-2 text-[#57534E] text-sm font-semibold">
        <span className="w-4 h-4 border-2 border-[#B45309]/30 border-t-[#B45309] rounded-full animate-spin" />
        Taking you to sign up…
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#FAF7F2]" />}>
      <JoinRedirect />
    </Suspense>
  );
}
