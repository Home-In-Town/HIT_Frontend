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
