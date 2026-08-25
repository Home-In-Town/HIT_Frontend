'use client';

import { useEffect, useState } from 'react';
import { projectsApi } from '@/lib/api';
import { Project, UnitTypeInventory } from '@/types/project';
import toast from 'react-hot-toast';

interface InventoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  onSaved?: (project: Project) => void;
}

type EditableUnit = UnitTypeInventory & { _key: string };

let keyCounter = 0;
const newKey = () => `ut_${Date.now()}_${keyCounter++}`;

export default function InventoryManager({ isOpen, onClose, project, onSaved }: InventoryManagerProps) {
  const [units, setUnits] = useState<EditableUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !project) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { inventory } = await projectsApi.getInventory(project.id);
        if (cancelled) return;
        const list = (inventory?.unitTypes || []).map((u) => ({ ...u, _key: newKey() }));
        setUnits(list.length ? list : [blankUnit()]);
      } catch {
        // Fall back to seeding from bhkOptions client-side
        const seed = (project.bhkOptions || []).map((label) => ({
          ...emptyCounts(label), _key: newKey(),
        }));
        setUnits(seed.length ? seed : [blankUnit()]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, project]);

  function blankUnit(): EditableUnit {
    return { ...emptyCounts(''), _key: newKey() };
  }

  function emptyCounts(label: string): UnitTypeInventory {
    return { label, totalUnits: 0, availableUnits: 0, bookedUnits: 0, soldUnits: 0, pricePerUnit: 0 };
  }

  const updateUnit = (key: string, field: keyof UnitTypeInventory, value: string) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u._key !== key) return u;
        if (field === 'label') return { ...u, label: value };
        const num = Math.max(0, Number(value) || 0);
        const next = { ...u, [field]: num };
        // Keep availableUnits sensible when total/sold/booked change
        if (field === 'totalUnits' || field === 'soldUnits' || field === 'bookedUnits') {
          const derived = next.totalUnits - next.soldUnits - next.bookedUnits;
          next.availableUnits = Math.max(0, derived);
        }
        return next;
      })
    );
  };

  const addUnit = () => setUnits((prev) => [...prev, blankUnit()]);
  const removeUnit = (key: string) => setUnits((prev) => prev.filter((u) => u._key !== key));

  const totals = units.reduce(
    (acc, u) => ({
      total: acc.total + (u.totalUnits || 0),
      available: acc.available + (u.availableUnits || 0),
      booked: acc.booked + (u.bookedUnits || 0),
      sold: acc.sold + (u.soldUnits || 0),
    }),
    { total: 0, available: 0, booked: 0, sold: 0 }
  );

  const handleSave = async () => {
    if (!project) return;
    const cleaned = units
      .filter((u) => u.label.trim())
      .map(({ _key, ...rest }) => rest);

    if (cleaned.length === 0) {
      toast.error('Add at least one unit type with a label');
      return;
    }
    setSaving(true);
    try {
      const { inventory } = await projectsApi.setInventory(project.id, cleaned);
      toast.success('Inventory saved');
      onSaved?.({ ...project, inventory });
      onClose();
    } catch {
      toast.error('Failed to save inventory');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-[#E7E5E4] rounded-[2.5rem] shadow-2xl p-8 sm:p-10">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[#2A2A2A] font-serif tracking-tight">Manage Inventory</h3>
          <p className="text-[#57534E] mt-1 text-sm">
            {project.name} &middot; Define how many units of each type exist. Counts update automatically when deals close.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#B45309]" />
          </div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[
                { label: 'Total', value: totals.total },
                { label: 'Available', value: totals.available },
                { label: 'Booked', value: totals.booked },
                { label: 'Sold', value: totals.sold },
              ].map((s) => (
                <div key={s.label} className="bg-[#FAF7F2] border border-[#E7E5E4] rounded-2xl px-3 py-3 text-center">
                  <div className="text-2xl font-bold text-[#2A2A2A] font-serif">{s.value}</div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#A8A29E] mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[1.6fr_repeat(4,1fr)_auto] gap-2 px-1 mb-2">
              {['Unit Type', 'Total', 'Available', 'Booked', 'Sold', ''].map((h, i) => (
                <div key={i} className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A29E]">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="space-y-2">
              {units.map((u) => (
                <div key={u._key} className="grid grid-cols-2 sm:grid-cols-[1.6fr_repeat(4,1fr)_auto] gap-2 items-center">
                  <input
                    value={u.label}
                    onChange={(e) => updateUnit(u._key, 'label', e.target.value)}
                    placeholder="e.g. 2BHK"
                    className="col-span-2 sm:col-span-1 px-3 py-2 text-sm bg-white border border-[#E7E5E4] rounded-xl focus:border-[#B45309]/50 focus:outline-none"
                  />
                  <NumberField value={u.totalUnits} onChange={(v) => updateUnit(u._key, 'totalUnits', v)} label="Total" />
                  <NumberField value={u.availableUnits} onChange={(v) => updateUnit(u._key, 'availableUnits', v)} label="Available" />
                  <NumberField value={u.bookedUnits} onChange={(v) => updateUnit(u._key, 'bookedUnits', v)} label="Booked" />
                  <NumberField value={u.soldUnits} onChange={(v) => updateUnit(u._key, 'soldUnits', v)} label="Sold" />
                  <button
                    onClick={() => removeUnit(u._key)}
                    className="justify-self-end sm:justify-self-center w-9 h-9 flex items-center justify-center text-[#A8A29E] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Remove unit type"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addUnit}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-xs font-bold text-[#B45309] bg-[#B45309]/5 border border-[#B45309]/20 rounded-xl hover:bg-[#B45309]/10 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Add unit type
            </button>

            <div className="flex flex-col sm:flex-row gap-3 justify-end mt-8">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#57534E] bg-white border border-[#E7E5E4] rounded-2xl hover:bg-[#FAF7F2] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-white bg-[#B45309] rounded-2xl hover:bg-[#92400E] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white" />}
                Save Inventory
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NumberField({ value, onChange, label }: { value: number; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="sm:hidden text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A29E]">{label}</label>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-white border border-[#E7E5E4] rounded-xl focus:border-[#B45309]/50 focus:outline-none"
      />
    </div>
  );
}
