/**
 * Utilities for deriving a consistent price-per-sqft rate.
 *
 * The stored `pricePerSqFt` field is hand-entered and frequently drifts out of
 * sync with `startingPrice / area` (e.g. a card shows 23,000/sqft while
 * price ÷ area works out to 7,000/sqft). To keep the number trustworthy for
 * B2B buyers, we derive the rate from price and area instead of trusting the
 * stored field.
 */

/**
 * Parse the lower bound (in sqft) from an area range string.
 *
 * Handles inputs like:
 *   "650 - 1200 sqft"  -> 650
 *   "1,000 - 2,500 sqft" -> 1000
 *   "800 sqft"          -> 800
 *   "800"               -> 800
 *
 * Returns null when no numeric area can be extracted, or when the unit is not
 * square feet (e.g. acres), since a per-sqft rate would be meaningless.
 */
export function parseAreaLowerBoundSqFt(area?: string | null): number | null {
  if (!area || typeof area !== 'string') return null;

  const lower = area.toLowerCase();

  // Reject non-sqft units where a per-sqft derivation would be wrong.
  if (/\b(acre|acres|hectare|hectares|guntha|bigha)\b/.test(lower)) {
    return null;
  }

  // Grab the first number in the string (the lower bound of any range).
  const match = lower.replace(/,/g, '').match(/\d+(\.\d+)?/);
  if (!match) return null;

  const value = parseFloat(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Derive a consistent price-per-sqft from a total price and an area range.
 *
 * Returns null when the rate cannot be reliably computed (missing price,
 * missing/unparseable area, or non-sqft units). Callers should hide the
 * per-sqft label when this returns null rather than fall back to a stored
 * value that may be inconsistent.
 */
export function derivePricePerSqFt(
  price?: number | null,
  area?: string | null
): number | null {
  if (!price || !Number.isFinite(price) || price <= 0) return null;

  const areaSqFt = parseAreaLowerBoundSqFt(area);
  if (!areaSqFt) return null;

  const rate = Math.round(price / areaSqFt);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * Format a derived per-sqft rate for display, e.g. "₹7,000/sqft".
 * Returns null when no rate can be derived.
 */
export function formatDerivedPricePerSqFt(
  price?: number | null,
  area?: string | null
): string | null {
  const rate = derivePricePerSqFt(price, area);
  if (rate === null) return null;
  return `\u20B9${rate.toLocaleString('en-IN')}/sqft`;
}

// ─── Area unit conversion (for the upload form) ─────────────────────────────

/**
 * Supported area units the seller can enter plot/land size in. The platform
 * always STORES size in sqft (so matching, price-per-sqft, and display stay
 * consistent), but sellers of land often think in acres / guntha / sq yard.
 */
export type AreaUnit = 'sqft' | 'acre' | 'guntha' | 'sqyd' | 'sqm';

export const AREA_UNIT_OPTIONS: { value: AreaUnit; label: string }[] = [
  { value: 'sqft', label: 'sq ft' },
  { value: 'acre', label: 'acre' },
  { value: 'guntha', label: 'guntha' },
  { value: 'sqyd', label: 'sq yard' },
  { value: 'sqm', label: 'sq meter' },
];

/** Multiplier from each unit to square feet. */
const AREA_TO_SQFT: Record<AreaUnit, number> = {
  sqft: 1,
  acre: 43560,
  guntha: 1089,
  sqyd: 9,
  sqm: 10.7639,
};

/** Convert a single numeric value in `unit` to square feet (rounded). */
export function convertAreaValueToSqFt(value: number, unit: AreaUnit): number {
  return Math.round(value * (AREA_TO_SQFT[unit] ?? 1));
}

/**
 * Convert an area range/value string entered in a given unit into a
 * normalized sqft string that is stored in `plotSizeRange`.
 *
 * Preserves range shape: "1 - 2" acres → "43560 - 87120 sqft".
 * A single value: "1200" sqft → "1200 sqft". A single "2" acre → "87120 sqft".
 * Returns '' when no numbers can be parsed.
 *
 * When unit is already 'sqft' we still normalize the suffix to " sqft".
 */
export function normalizeAreaRangeToSqFt(
  input: string,
  unit: AreaUnit
): string {
  if (!input || typeof input !== 'string') return '';

  const nums = input.replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) return '';

  const sqftNums = nums
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => convertAreaValueToSqFt(n, unit));

  if (sqftNums.length === 0) return '';

  if (sqftNums.length === 1) return `${sqftNums[0]} sqft`;

  // Range: use the min/max of whatever numbers were entered.
  const min = Math.min(...sqftNums);
  const max = Math.max(...sqftNums);
  return `${min} - ${max} sqft`;
}
