/**
 * Property Category & Type Configuration
 *
 * Single source of truth for property categories and their associated property types.
 * All components consuming category or property type data should reference this config.
 */

import { isPlotFamily } from "./propertySchema.mjs";

export const PROPERTY_CATEGORIES = ["Residential", "Commercial", "Mixed Use"] as const;

export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export const CATEGORY_PROPERTY_TYPES: Readonly<Record<PropertyCategory, readonly string[]>> = Object.freeze({
  Residential: Object.freeze([
    "Apartment / Flat",
    "Villa",
    "Independent House",
    "Row House",
    "Township",
    "Residential Plot",
    "Farm House",
    "Farm Land",
    "Studio Apartment",
    "Penthouse",
    "Duplex",
    "Serviced Apartment",
    "Other",
  ] as const),
  Commercial: Object.freeze([
    "Office Space",
    "Retail",
    "Showroom",
    "Commercial Plot / Land",
    "Industry",
    "Co-working Space",
    "Warehouse / Storage",
    "Hospitality",
    "Other",
  ] as const),
  "Mixed Use": Object.freeze([
  "Residential + Retail",
  "Residential + Office",
  "Residential + Commercial Complex",
  "Mixed-Use Tower",
  "Mixed-Use Township",
  "Residential + Hospitality",
  "Residential + Commercial Plot",
  "Integrated Development",
  "Other",
] as const),
});

/**
 * The plot / land family has its own type list (and derives the stored category from the type), so a
 * plot type is no longer buried inside the Residential / Commercial / Mixed Use lists. Order and labels
 * are pinned by the shared fixture (`types`). Previous behaviour: "Residential Plot" sat in the
 * Residential list, "Commercial Plot / Land" in Commercial, and the form guessed "is this a plot?" from
 * substrings of the label.
 */
export const PLOT_PROPERTY_TYPES: readonly string[] = Object.freeze([
  "Residential Plot",
  "NA Plot",
  "Farm Land",
  "Commercial Plot / Land",
  "Industrial Plot",
  "Residential + Commercial Plot",
]);

export type PropertyFamilyChoice = "plot" | "residential" | "commercial" | "mixed_use";

/** What the first chip row of the project form offers. `category` is what that choice stores (plot: derived from the type). */
export const FAMILY_CHOICES: readonly { key: PropertyFamilyChoice; label: string; category: PropertyCategory | null }[] = Object.freeze([
  { key: "plot", label: "Plot / Land", category: null },
  { key: "residential", label: "Residential", category: "Residential" },
  { key: "commercial", label: "Commercial", category: "Commercial" },
  { key: "mixed_use", label: "Mixed Use", category: "Mixed Use" },
]);

/** The type chips of a non-plot category: the old list minus the plot labels, which now live under Plot / Land. */
export function nonPlotTypesFor(category: PropertyCategory): readonly string[] {
  return CATEGORY_PROPERTY_TYPES[category].filter((t) => !isPlotFamily({ propertyType: t }));
}
