import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PROPERTY_TYPES = [
  "Flat/Apartment",
  "Residential Land",
  // "Independent / Builder Floor",
  // "Independent House/Villa",
  // "1 RK / Studio Apartment",
  // "Farm House",
  // "Serviced Apartments",
  // "Other",
] as const;

type PropertyType = (typeof PROPERTY_TYPES)[number];

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  noResults?:boolean;
};

export default function SearchFiltersPanel({ open, onClose, onSearch, noResults }: Props) {
  const [selected, setSelected] = useState<PropertyType[]>([
    ...PROPERTY_TYPES,
  ]);

  const toggleType = (type: PropertyType) => {
    setSelected((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const clearAll = () => setSelected([]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          {/* Divider */}
          <div className="my-4 h-px bg-gray-200" />

          {/* Header */}
          <div className="flex justify-between mb-3">
            <span className="font-semibold text-sm">
              Property Types ({selected.length})
            </span>

            <button
              onClick={clearAll}
              className="text-xs text-[#3E5F16] hover:underline"
            >
              Clear all
            </button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PROPERTY_TYPES.map((type) => {
              const checked = selected.includes(type);

              return (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm cursor-pointer select-none"
                >
                  {/* Hidden checkbox */}
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleType(type)}
                    className="sr-only"
                  />

                  {/* Custom checkbox */}
                  <div
                    className={`
                      w-4 h-4 shrink-0 
                      flex items-center justify-center
                      border transition-colors
                      ${checked
                        ? "bg-[#3E5F16] border-[#3E5F16]"
                        : "border-gray-400 bg-white"}
                    `}
                  >
                    {checked && (
                      <span className="text-white text-[12px] leading-none">
                        ✓
                      </span>
                    )}
                  </div>

                  <span className="leading-tight">{type}</span>
                </label>
              );
            })}
          </div>



          {noResults && (
            <div className="mb-4 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">
              No projects available for this location
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 hover:bg-gray-100 rounded text-sm"
            >
              Cancel
            </button>

            <button
              onClick={onSearch}
              className="px-4 py-1 bg-[#3E5F16] text-white rounded text-sm"
            >
              Search
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
