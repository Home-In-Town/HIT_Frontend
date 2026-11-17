'use client';
// The plot / land fields of the project form (family "plot", see propertySchema.mjs).
// Previous behaviour: a plot project got the flat-style form with BHK / carpet / floor hidden and ONE
// free-text "Plot Size Range", so total plots, land area, road width, layout type, NA order, TP approval
// and development status could not be entered at all.
//
// Everything is stored in sq ft / rupees; sq yd and sq m are display-only conversions (fixture
// `conversions`). Inputs keep their own text while typing, so "1." or "2.5" is not rewritten under the
// cursor; the parsed number goes up through onChange only when it is a number.
import { useState } from 'react';
import type { PlotDetails } from '@/types/project';
import {
  DEVELOPMENT_STATUSES, DEVELOPMENT_STATUS_TEXT, LAYOUT_TYPE_SUGGESTIONS, ROAD_WIDTH_SUGGESTIONS, fromSqft, toSqft,
} from '@/lib/propertySchema.mjs';

type SizeUnit = 'sqft' | 'sqyd' | 'sqm';
const SIZE_UNITS: { value: SizeUnit; label: string }[] = [
  { value: 'sqft', label: 'sq ft' },
  { value: 'sqyd', label: 'sq yd' },
  { value: 'sqm', label: 'sq m' },
];

const inputCls = (err?: string) => `w-full px-3 py-2.5 bg-white rounded-lg text-[#2A2A2A] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:border-transparent ${err ? 'border border-red-500 ring-1 ring-red-500 focus:ring-red-500' : 'border border-[#D6D3D1] focus:ring-[#B45309]'}`;
const chipCls = (on: boolean) => `px-3 py-2 border rounded-lg text-sm transition-all ${on ? 'border-[#B45309] bg-orange-50 text-[#B45309] font-medium ring-1 ring-[#B45309]' : 'border-[#D6D3D1] text-[#57534E] hover:border-[#A8A29E] bg-white'}`;
const labelCls = 'block text-sm font-medium text-[#57534E] mb-1.5';

/** "" -> undefined, a finite number -> number, anything else -> NaN (kept as text, flagged by validation). */
const num = (t: string): number | undefined => {
  const s = t.trim().replace(/,/g, '');
  if (s === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
};
const show = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(Number(v.toFixed(2))) : '');

function FieldError({ text }: { text?: string }) {
  return text ? <p className="mt-1 text-sm text-red-600">{text}</p> : null;
}

export default function PlotDetailsSection({
  value, onChange, errors, fieldRefs,
}: {
  value: PlotDetails | undefined;
  onChange: (next: PlotDetails) => void;
  /** Contract paths ("plotDetails.plotSize.minSqft") -> message. */
  errors: Record<string, string>;
  fieldRefs?: React.MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  const pd = value ?? {};
  const set = (patch: Partial<PlotDetails>) => onChange({ ...pd, ...patch });

  // Text state per input (see the file comment). Seeded once from the stored value.
  const [landText, setLandText] = useState(show(pd.landArea?.value));
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('sqft');
  const [minText, setMinText] = useState(show(pd.plotSize?.minSqft));
  const [maxText, setMaxText] = useState(show(pd.plotSize?.maxSqft));
  const [priceMin, setPriceMin] = useState(show(pd.plotPrice?.minRupees));
  const [priceMax, setPriceMax] = useState(show(pd.plotPrice?.maxRupees));
  const [rateMin, setRateMin] = useState(show(pd.pricePerSqFtRange?.min));
  const [rateMax, setRateMax] = useState(show(pd.pricePerSqFtRange?.max));
  const [plotsText, setPlotsText] = useState(show(pd.totalPlots));
  const [customRoad, setCustomRoad] = useState('');
  const [customLayout, setCustomLayout] = useState('');

  const landUnit = pd.landArea?.unit ?? 'acre';
  const setLand = (text: string, unit: 'acre' | 'sqft') => {
    setLandText(text);
    const n = num(text);
    set({ landArea: n === undefined ? null : { value: n, unit } });
  };

  const setSize = (min: string, max: string, unit: SizeUnit) => {
    setMinText(min);
    setMaxText(max);
    const a = num(min);
    const b = num(max);
    if (a === undefined && b === undefined) { set({ plotSize: null }); return; }
    // A single number means "this size only": max defaults to min until the owner types one.
    const lo = a === undefined ? (b as number) : a;
    const hi = b === undefined ? lo : b;
    const toSq = (v: number) => (Number.isNaN(v) ? v : Number((toSqft(v, unit) as number).toFixed(2)));
    set({ plotSize: { minSqft: toSq(lo), maxSqft: toSq(hi) } });
  };
  const changeUnit = (unit: SizeUnit) => {
    setSizeUnit(unit);
    // Re-show the stored sq ft values in the new unit instead of reinterpreting the typed digits.
    const sz = pd.plotSize;
    if (sz) {
      setMinText(show(fromSqft(sz.minSqft, unit)));
      setMaxText(show(fromSqft(sz.maxSqft, unit)));
    }
  };

  const setRange = (key: 'plotPrice' | 'pricePerSqFtRange', min: string, max: string) => {
    const a = num(min);
    const b = num(max);
    const [minKey, maxKey] = key === 'plotPrice' ? (['minRupees', 'maxRupees'] as const) : (['min', 'max'] as const);
    if (a === undefined && b === undefined) { set({ [key]: null } as Partial<PlotDetails>); return; }
    const lo = a === undefined ? (b as number) : a;
    const hi = b === undefined ? lo : b;
    set({ [key]: { [minKey]: lo, [maxKey]: hi } } as Partial<PlotDetails>);
  };

  const roads = pd.roadWidthsFt ?? [];
  const toggleRoad = (w: number) => set({ roadWidthsFt: roads.includes(w) ? roads.filter((x) => x !== w) : [...roads, w].sort((x, y) => x - y) });
  const addRoad = () => {
    const n = num(customRoad);
    if (n === undefined || Number.isNaN(n) || roads.includes(n)) { setCustomRoad(''); return; }
    set({ roadWidthsFt: [...roads, n].sort((x, y) => x - y) });
    setCustomRoad('');
  };

  const layouts = pd.layoutTypes ?? [];
  const toggleLayout = (t: string) => set({ layoutTypes: layouts.includes(t) ? layouts.filter((x) => x !== t) : [...layouts, t] });
  const addLayout = () => {
    const t = customLayout.trim();
    if (t && !layouts.includes(t)) set({ layoutTypes: [...layouts, t] });
    setCustomLayout('');
  };

  const minSqft = pd.plotSize?.minSqft;
  const maxSqft = pd.plotSize?.maxSqft;
  const conv = (v: number | undefined, unit: 'sqyd' | 'sqm') => (typeof v === 'number' && Number.isFinite(v) ? fromSqft(v, unit) : null);
  const landSqft = pd.landArea && Number.isFinite(pd.landArea.value) ? Math.round(toSqft(pd.landArea.value, pd.landArea.unit) ?? 0) : null;
  const ref = (key: string) => (el: HTMLElement | null) => { if (fieldRefs) fieldRefs.current[key] = el; };

  return (
    <div className="md:col-span-2 grid grid-cols-1 gap-6 md:grid-cols-2" aria-label="Plot ki details">
      <div>
        <label className={labelCls} htmlFor="pd-land">Land area</label>
        <div className="flex gap-2">
          <input id="pd-land" inputMode="decimal" value={landText} placeholder="jaise 2.5" onChange={(e) => setLand(e.target.value, landUnit)} className={inputCls(errors['plotDetails.landArea.value'])} />
          <select aria-label="Land area unit" value={landUnit} onChange={(e) => setLand(landText, e.target.value as 'acre' | 'sqft')} className="w-28 px-2 py-2 border border-[#D6D3D1] rounded-lg bg-white text-[#292524]">
            <option value="acre">acre</option>
            <option value="sqft">sq ft</option>
          </select>
        </div>
        {landSqft ? <p className="mt-1 text-xs text-[#78716C]">= {landSqft.toLocaleString('en-IN')} sq ft</p> : null}
        <FieldError text={errors['plotDetails.landArea.value'] || errors['plotDetails.landArea.unit'] || errors['plotDetails.landArea']} />
      </div>

      <div>
        <label className={labelCls} htmlFor="pd-total">Total plots</label>
        <input
          id="pd-total"
          inputMode="numeric"
          value={plotsText}
          placeholder="jaise 40"
          onChange={(e) => {
            setPlotsText(e.target.value);
            const n = num(e.target.value);
            set({ totalPlots: n === undefined ? null : n });
          }}
          className={inputCls(errors['plotDetails.totalPlots'])}
        />
        <FieldError text={errors['plotDetails.totalPlots']} />
      </div>

      <div className="md:col-span-2">
        <label className={labelCls}>Plot size (min - max) <span className="text-red-500">*</span></label>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Plot size minimum" ref={ref('plotDetails.plotSize.minSqft')} inputMode="decimal" value={minText} placeholder="min, jaise 1000" onChange={(e) => setSize(e.target.value, maxText, sizeUnit)} className={`${inputCls(errors['plotDetails.plotSize.minSqft'] || errors['plotDetails.plotSize'])} flex-1 min-w-[8rem]`} />
          <input aria-label="Plot size maximum" inputMode="decimal" value={maxText} placeholder="max, jaise 2400" onChange={(e) => setSize(minText, e.target.value, sizeUnit)} className={`${inputCls(errors['plotDetails.plotSize.maxSqft'])} flex-1 min-w-[8rem]`} />
          <select aria-label="Plot size unit" value={sizeUnit} onChange={(e) => changeUnit(e.target.value as SizeUnit)} className="w-28 px-2 py-2 border border-[#D6D3D1] rounded-lg bg-white text-[#292524]">
            {SIZE_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        {minSqft !== undefined && Number.isFinite(minSqft) && (
          <p className="mt-1 text-xs text-[#78716C]">
            Stored: {show(minSqft)}{maxSqft !== minSqft ? ` - ${show(maxSqft)}` : ''} sq ft · {conv(minSqft, 'sqyd')}{maxSqft !== minSqft ? ` - ${conv(maxSqft, 'sqyd')}` : ''} sq yd · {conv(minSqft, 'sqm')}{maxSqft !== minSqft ? ` - ${conv(maxSqft, 'sqm')}` : ''} sq m
          </p>
        )}
        <FieldError text={errors['plotDetails.plotSize.minSqft'] || errors['plotDetails.plotSize.maxSqft'] || errors['plotDetails.plotSize']} />
      </div>

      <div>
        <label className={labelCls}>Price per sq ft (₹, min - max)</label>
        <div className="flex gap-2">
          <input aria-label="Price per sq ft minimum" inputMode="decimal" value={rateMin} placeholder="min" onChange={(e) => { setRateMin(e.target.value); setRange('pricePerSqFtRange', e.target.value, rateMax); }} className={inputCls(errors['plotDetails.pricePerSqFtRange.min'])} />
          <input aria-label="Price per sq ft maximum" inputMode="decimal" value={rateMax} placeholder="max" onChange={(e) => { setRateMax(e.target.value); setRange('pricePerSqFtRange', rateMin, e.target.value); }} className={inputCls(errors['plotDetails.pricePerSqFtRange.max'])} />
        </div>
        <FieldError text={errors['plotDetails.pricePerSqFtRange.min'] || errors['plotDetails.pricePerSqFtRange.max']} />
      </div>

      <div>
        <label className={labelCls}>Plot price (₹, min - max)</label>
        <div className="flex gap-2">
          <input aria-label="Plot price minimum" inputMode="numeric" value={priceMin} placeholder="min" onChange={(e) => { setPriceMin(e.target.value); setRange('plotPrice', e.target.value, priceMax); }} className={inputCls(errors['plotDetails.plotPrice.minRupees'])} />
          <input aria-label="Plot price maximum" inputMode="numeric" value={priceMax} placeholder="max" onChange={(e) => { setPriceMax(e.target.value); setRange('plotPrice', priceMin, e.target.value); }} className={inputCls(errors['plotDetails.plotPrice.maxRupees'])} />
        </div>
        <FieldError text={errors['plotDetails.plotPrice.minRupees'] || errors['plotDetails.plotPrice.maxRupees']} />
      </div>

      <div className="md:col-span-2">
        <label className={labelCls}>Road width (ft)</label>
        <div className="flex flex-wrap items-center gap-2">
          {[...new Set([...ROAD_WIDTH_SUGGESTIONS, ...roads])].sort((a, b) => a - b).map((w) => (
            <button key={w} type="button" aria-pressed={roads.includes(w)} onClick={() => toggleRoad(w)} className={chipCls(roads.includes(w))}>{roads.includes(w) ? '✓ ' : ''}{w} ft</button>
          ))}
          <input aria-label="Road width custom" inputMode="numeric" value={customRoad} placeholder="aur width" onChange={(e) => setCustomRoad(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRoad(); } }} className="w-28 px-3 py-2 border border-[#D6D3D1] rounded-lg text-sm" />
          <button type="button" onClick={addRoad} disabled={!customRoad.trim()} className="px-3 py-2 bg-[#B45309] text-white text-sm rounded-lg disabled:opacity-40">+ Add</button>
        </div>
        <FieldError text={errors['plotDetails.roadWidthsFt']} />
      </div>

      <div className="md:col-span-2">
        <label className={labelCls}>Layout type / approval</label>
        <div className="flex flex-wrap items-center gap-2">
          {[...new Set([...LAYOUT_TYPE_SUGGESTIONS, ...layouts])].map((t) => (
            <button key={t} type="button" aria-pressed={layouts.includes(t)} onClick={() => toggleLayout(t)} className={chipCls(layouts.includes(t))}>{layouts.includes(t) ? '✓ ' : ''}{t}</button>
          ))}
          <input aria-label="Layout type custom" value={customLayout} maxLength={40} placeholder="aur type" onChange={(e) => setCustomLayout(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLayout(); } }} className="w-32 px-3 py-2 border border-[#D6D3D1] rounded-lg text-sm" />
          <button type="button" onClick={addLayout} disabled={!customLayout.trim()} className="px-3 py-2 bg-[#B45309] text-white text-sm rounded-lg disabled:opacity-40">+ Add</button>
        </div>
        <FieldError text={errors['plotDetails.layoutTypes']} />
      </div>

      <div>
        <label className={labelCls} htmlFor="pd-na">NA order number</label>
        <input id="pd-na" value={pd.naOrderNumber ?? ''} maxLength={60} placeholder="jaise NA/12/2024" onChange={(e) => set({ naOrderNumber: e.target.value })} className={inputCls(errors['plotDetails.naOrderNumber'])} />
        <FieldError text={errors['plotDetails.naOrderNumber']} />
      </div>

      <div>
        <label className={labelCls} htmlFor="pd-tp">TP approval</label>
        <input id="pd-tp" value={pd.tpApproval ?? ''} maxLength={120} placeholder="jaise TP-77" onChange={(e) => set({ tpApproval: e.target.value })} className={inputCls(errors['plotDetails.tpApproval'])} />
        <FieldError text={errors['plotDetails.tpApproval']} />
      </div>

      <div className="md:col-span-2">
        <label className={labelCls}>Development status</label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Development status">
          {DEVELOPMENT_STATUSES.map((s: string) => (
            <button key={s} type="button" role="radio" aria-checked={pd.developmentStatus === s} onClick={() => set({ developmentStatus: pd.developmentStatus === s ? null : (s as PlotDetails['developmentStatus']) })} className={chipCls(pd.developmentStatus === s)}>
              {pd.developmentStatus === s ? '✓ ' : ''}{DEVELOPMENT_STATUS_TEXT[s as keyof typeof DEVELOPMENT_STATUS_TEXT]}
            </button>
          ))}
        </div>
        <FieldError text={errors['plotDetails.developmentStatus']} />
      </div>
    </div>
  );
}
