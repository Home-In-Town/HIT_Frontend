'use client';

// Warns before the user loses an unsaved overlay (R7.6): `beforeunload` for tab
// close / reload / external navigation, plus a capture-phase click guard for
// in-app links and a popstate guard for Back. The Next.js App Router has no
// built-in "block navigation" API, so in-app navigation is intercepted here.

import { useEffect } from 'react';

export const UNSAVED_MESSAGE = 'You have an unsaved overlay. Leave without saving?';

export function useUnsavedGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // beforeunload covers external links
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      if (!window.confirm(UNSAVED_MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Back/forward: push a sentinel entry so Back lands on the same page first.
    window.history.pushState({ unsavedGuard: true }, '', window.location.href);
    const onPopState = () => {
      if (window.confirm(UNSAVED_MESSAGE)) {
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        window.history.pushState({ unsavedGuard: true }, '', window.location.href);
      }
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [dirty]);
}
