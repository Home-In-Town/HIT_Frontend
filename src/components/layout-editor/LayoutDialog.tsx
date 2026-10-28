'use client';

// Minimal accessible modal for the Layout Editor dialogs (Link units,
// Generate units): role=dialog + aria-modal + label, Escape closes, focus
// moves into the dialog on open and back to the opener on close, Tab stays
// inside. No dependency: the repo has no dialog primitive, and
// AILayoutConfigModal is a plain div without any of this.

import { useEffect, useId, useRef } from 'react';

export default function LayoutDialog({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col outline-none"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b">
          <h2 id={titleId} className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-500 hover:text-gray-800 px-2 text-lg">
            ✕
          </button>
        </div>
        <div className="px-5 py-3 overflow-y-auto text-sm flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>
  );
}
