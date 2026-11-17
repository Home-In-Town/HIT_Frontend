'use client';
// One tab per sheet of a multi-sheet layout. Renders nothing for a single sheet,
// so a legacy or one-image layout looks exactly as it did before sheets existed.
// Used by the owner plot map, the public /plots/<slug> page and Check & fix.
export interface SheetTab {
  idx: number;
  name: string;
  /** Short text next to the name, e.g. "12 available" or "3 check". */
  badge?: string;
  /** Colours the badge: 'warn' = needs a look, 'bad' = failed. */
  tone?: 'warn' | 'bad';
}

export default function SheetTabs({
  tabs, activeIdx, onChange, label = 'Sheets',
}: {
  tabs: SheetTab[];
  activeIdx: number;
  onChange: (idx: number) => void;
  label?: string;
}) {
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => {
        const on = t.idx === activeIdx;
        return (
          <button
            key={t.idx}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.idx)}
            className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${on ? 'border-orange-500 bg-orange-50 text-orange-900' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50'}`}
          >
            <span className="max-w-[10rem] truncate">{t.name}</span>
            {t.badge && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.tone === 'bad' ? 'bg-red-100 text-red-800' : t.tone === 'warn' ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-100 text-gray-700'}`}>
                {t.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
