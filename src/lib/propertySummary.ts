// Thin typed wrapper over propertySchema.mjs for the screens that draw a project (cards, lists, details,
// PDF). Previous behaviour: each screen printed `bhkOptions.join(', ')` or `carpetAreaRange` directly, so
// a plot project showed an empty BHK line (or a stale BHK from an earlier category) and no plot facts.
import { isPlotFamily, plotDetailRows, summaryLine } from './propertySchema.mjs';
import type { PlotDetails } from '@/types/project';

/** Fields every project shape in the app (Project, public card, marketplace item) can carry. */
export interface SummarySource {
  type?: string;
  propertyType?: string;
  category?: string;
  plotDetails?: PlotDetails | null;
  bhkOptions?: string[];
  carpetAreaRange?: string;
  plotSizeRange?: string;
  facingOptions?: string[];
  configuration?: { bhkOptions?: string[]; carpetAreaRange?: string; plotSizeRange?: string; facingOptions?: string[] };
}

/** The shape propertySchema.mjs reads: flat fields are folded into `configuration`. */
function normalise(p: SummarySource) {
  const c = p.configuration ?? {};
  return {
    propertyType: p.propertyType,
    projectType: p.type,
    category: p.category,
    plotDetails: p.plotDetails ?? undefined,
    configuration: {
      bhkOptions: c.bhkOptions ?? p.bhkOptions,
      carpetAreaRange: c.carpetAreaRange ?? p.carpetAreaRange,
      plotSizeRange: c.plotSizeRange ?? p.plotSizeRange,
      facingOptions: c.facingOptions ?? p.facingOptions,
    },
  };
}

/** Plot / land project (same rule as the form and the server). */
export function isPlotSource(p: SummarySource | null | undefined): boolean {
  return !!p && isPlotFamily(normalise(p));
}

/**
 * One line for a card. Plot: "40 plots · 1000 - 2400 sqft · 2 acre · East/North". Other families:
 * "2BHK, 3BHK · 650 - 1200 sqft". Empty string when there is nothing to show, so a card draws no empty line.
 */
export function propertySummary(p: SummarySource | null | undefined): string {
  return p ? summaryLine(normalise(p)) : '';
}

/** Plot facts only: the card line for a plot project and '' for every other family, so their cards stay as they were. */
export function plotSummary(p: SummarySource | null | undefined): string {
  return p && isPlotSource(p) ? summaryLine(normalise(p)) : '';
}

/** Label / value rows for the project detail page (road width, layout type, approvals, ...). Empty for non-plot. */
export function plotRows(p: SummarySource | null | undefined): [string, string][] {
  return p && isPlotSource(p) ? (plotDetailRows(normalise(p)) as [string, string][]) : [];
}
