/**
 * Property Category & Type Configuration
 *
 * Single source of truth for property categories and their associated property types.
 * All components consuming category or property type data should reference this config.
 */

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
