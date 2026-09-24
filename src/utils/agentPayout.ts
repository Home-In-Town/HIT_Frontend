/**
 * Utilities for the agent payout shown on project cards.
 *
 * A project's owner (builder/captain) sets an `agentPayoutPercentage` at upload
 * time. The payout an agent can earn is derived from the project's starting
 * price: price * percentage / 100. These helpers keep the computation and the
 * card/label formatting identical everywhere it is shown.
 */

/** Compute the payout amount (in ₹) from a price and a percentage. */
export function computeAgentPayout(
  price?: number | null,
  percentage?: number | null
): number | null {
  if (!price || !Number.isFinite(price) || price <= 0) return null;
  if (!percentage || !Number.isFinite(percentage) || percentage <= 0) return null;
  const amount = (price * percentage) / 100;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

/** Format a ₹ amount compactly, e.g. "₹3L", "₹1.25Cr", "₹75K". */
export function formatPayout(amount?: number | null): string {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return '';
  if (amount >= 10000000) return `\u20B9${trim(amount / 10000000)}Cr`;
  if (amount >= 100000) return `\u20B9${trim(amount / 100000)}L`;
  if (amount >= 1000) return `\u20B9${trim(amount / 1000)}K`;
  return `\u20B9${Math.round(amount).toLocaleString('en-IN')}`;
}

/**
 * Build the full agent-payout label for a card, e.g. "Earn ₹3L at 2.5%".
 * Returns null when there's no valid payout to show.
 */
export function formatAgentPayoutLabel(
  price?: number | null,
  percentage?: number | null
): string | null {
  const amount = computeAgentPayout(price, percentage);
  if (amount === null) return null;
  return `Earn ${formatPayout(amount)} at ${percentage}%`;
}

/** Drop a trailing ".0" and round to 2 decimals (e.g. 3.0 -> "3", 1.25 -> "1.25"). */
function trim(value: number): string {
  return parseFloat(value.toFixed(2)).toString();
}
