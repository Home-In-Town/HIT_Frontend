// Pure project-category logic (contract "property-schema/1"). Plain .mjs so
// `node --test` covers it without React. The backend (services/propertySchema.js)
// and mobile keep their own copies; all three run the same shared fixture
// (src/lib/__fixtures__/property-schema-fixture.json).
//
// Previous behaviour: ProjectForm decided "is this a plot?" with substring
// checks on the property type label and always asked BHK / carpet / floor for
// everything else. There was no field config, so a plot project was forced
// through a flat-style form. Now one config (FAMILY_FIELDS) says which field
// groups each family shows, and the form only renders what it lists.

// label (lower case) -> category kept on Project.category (enum is unchanged).
export const PLOT_TYPES = Object.freeze({
  'residential plot': 'Residential',
  'na plot': 'Residential',
  'farm land': 'Residential',
  'commercial plot / land': 'Commercial',
  'industrial plot': 'Commercial',
  'residential + commercial plot': 'Mixed Use',
});

const RESIDENTIAL_TYPES = new Set([
  'apartment / flat', 'villa', 'row house', 'independent house', 'township',
  'farm house', 'studio', 'penthouse', 'duplex', 'serviced apartment',
]);

export const DEVELOPMENT_STATUSES = ['plotting-open', 'roads-done', 'fully-developed', 'ready-possession'];
export const DEVELOPMENT_STATUS_TEXT = {
  'plotting-open': 'Plotting open',
  'roads-done': 'Roads done',
  'fully-developed': 'Fully developed',
  'ready-possession': 'Ready for possession',
};
export const PLOT_AMENITY_OPTIONS = ['Compound Wall', 'Internal Roads', 'Street Lights', 'Water Supply', 'Drainage', 'Garden', 'Temple', 'Club House', 'Security'];
export const LAYOUT_TYPE_SUGGESTIONS = ['NA', 'RERA', 'Gunthewari', 'TP Approved', 'DTCP', 'Other'];
export const ROAD_WIDTH_SUGGESTIONS = [20, 24, 30, 40, 60];

export const SQFT_PER = Object.freeze({ sqft: 1, sqyd: 9, sqm: 10.7639, acre: 43560 });

/**
 * Field groups per family. The form renders a group only when it is listed in
 * `show`; hidden groups keep their state but are never sent (the server keeps
 * the stored values, so switching category on edit loses nothing).
 * Same shape as fieldsByFamily in the shared fixture (pinned by a test).
 */
export const FAMILY_FIELDS = Object.freeze({
  plot: {
    show: ['landArea', 'totalPlots', 'plotSize', 'pricePerSqFtRange', 'plotPrice', 'facing', 'roadWidthsFt', 'layoutTypes', 'reraNumber', 'naOrderNumber', 'tpApproval', 'plotAmenities', 'developmentStatus', 'projectStatus', 'gatedCommunity'],
    hide: ['bhkOptions', 'carpetAreaRange', 'floorRange', 'unitSetup'],
    required: ['plotDetails.plotSize.minSqft'],
  },
  residential: {
    show: ['bhkOptions', 'carpetAreaRange', 'floorRange', 'facing', 'gatedCommunity', 'unitSetup', 'amenities'],
    hide: ['plotDetails'],
    required: [],
  },
  commercial: {
    show: ['carpetAreaRange', 'floorRange', 'facing', 'amenities'],
    hide: ['plotDetails'],
    required: [],
  },
  mixed_use: {
    show: ['bhkOptions', 'carpetAreaRange', 'floorRange', 'facing', 'amenities'],
    hide: [],
    required: [],
  },
});

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Exact-label plot test, mirroring the server's isPlotProject() rules 2 and 3
 * (no regex, so 'Landmark Tower', 'Plotted Development' and 'Farm House' stay
 * false). The server also uses a normalizer for odd legacy labels; the server
 * sends projectType 'plot' for those, which rule 2 here reads.
 * When a propertyType is present it is the authority, so a stale hidden
 * projectType 'plot' next to 'Apartment / Flat' does not keep the plot family.
 * @param {{ propertyType?: unknown; projectType?: unknown } | null | undefined} p
 */
export function isPlotFamily(p) {
  if (!p) return false;
  const label = typeof p.propertyType === 'string' ? p.propertyType.trim().toLowerCase() : '';
  if (label) return has(PLOT_TYPES, label) || label === 'plot' || label === 'land';
  return String(p.projectType ?? '').toLowerCase() === 'plot';
}

/** @returns {'plot' | 'residential' | 'commercial' | 'mixed_use'} */
export function familyOf(p) {
  if (isPlotFamily(p)) return 'plot';
  const t = String(p?.propertyType ?? '').trim().toLowerCase();
  if (RESIDENTIAL_TYPES.has(t)) return 'residential';
  if (p?.category === 'Commercial') return 'commercial';
  if (p?.category === 'Mixed Use') return 'mixed_use';
  return 'residential';
}

/** @param {unknown} propertyType */
export function categoryForPlotType(propertyType) {
  return PLOT_TYPES[String(propertyType ?? '').trim().toLowerCase()] || null;
}

/** Does this family show the field group? @param {string} family @param {string} field */
export function showsField(family, field) {
  const f = FAMILY_FIELDS[/** @type {keyof typeof FAMILY_FIELDS} */ (family)] || FAMILY_FIELDS.residential;
  return f.show.includes(field);
}

// ── units ───────────────────────────────────────────────────────────────────
/** @param {number} value @param {string} unit */
export function toSqft(value, unit) {
  if (!isNum(value) || !has(SQFT_PER, unit)) return null;
  return value * SQFT_PER[/** @type {keyof typeof SQFT_PER} */ (unit)];
}
/** Display only, never stored. sqft rounds to 0 decimals, the rest to 1. */
export function fromSqft(sqft, unit) {
  if (!isNum(sqft) || !has(SQFT_PER, unit)) return null;
  const v = sqft / SQFT_PER[/** @type {keyof typeof SQFT_PER} */ (unit)];
  return Number(v.toFixed(unit === 'sqft' ? 0 : 1));
}

/** "1200 - 2400 sqft", "1,200 to 2,400", "1500" -> { minSqft, maxSqft } or null. */
export function parsePlotSizeRange(raw) {
  if (typeof raw !== 'string') return null;
  const nums = (raw.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n > 0);
  if (!nums.length) return null;
  const min = Math.min(nums[0], nums[1] ?? nums[0]);
  const max = Math.max(nums[0], nums[1] ?? nums[0]);
  return { minSqft: min, maxSqft: max };
}

const fmt = (n) => String(Number(Number(n).toFixed(2)));
export const rangeText = (min, max) => (min === max ? `${fmt(min)}` : `${fmt(min)} - ${fmt(max)}`);

// ── validation ──────────────────────────────────────────────────────────────
const posNum = (v) => isNum(v) && v > 0;

function checkRange(pd, key, minKey, maxKey, errs, { positive }) {
  if (!has(pd, key) || pd[key] === null) return;
  const r = pd[key];
  const p = `plotDetails.${key}`;
  if (!isObj(r)) { errs[p] = 'Range object hona chahiye'; return; }
  const lo = r[minKey];
  const hi = r[maxKey];
  const ok = positive ? posNum : (v) => isNum(v) && v >= 0;
  if (!ok(lo)) errs[`${p}.${minKey}`] = positive ? 'Minimum 0 se bada number hona chahiye' : 'Minimum 0 ya usse bada hona chahiye';
  if (!ok(hi)) errs[`${p}.${maxKey}`] = positive ? 'Maximum 0 se bada number hona chahiye' : 'Maximum 0 ya usse bada hona chahiye';
  if (ok(lo) && ok(hi) && hi < lo) errs[`${p}.${maxKey}`] = 'Maximum, minimum se kam nahi ho sakta';
}

function checkStringList(pd, key, { max, itemMax }, errs) {
  if (!has(pd, key) || pd[key] === null) return;
  const v = pd[key];
  const p = `plotDetails.${key}`;
  if (!Array.isArray(v) || v.length < 1 || v.length > max) { errs[p] = `1 se ${max} items chahiye`; return; }
  if (!v.every((s) => typeof s === 'string' && s.trim().length >= 1 && s.length <= itemMax)) errs[p] = `Har item 1 se ${itemMax} akshar ka hona chahiye`;
}

/** @returns {Record<string, string>} path -> message. Only keys present in `pd` are checked. */
export function validatePlotDetails(pd) {
  const errs = {};
  if (pd === undefined) return errs;
  if (!isObj(pd)) return { plotDetails: 'plotDetails object hona chahiye' };
  if (has(pd, 'landArea') && pd.landArea !== null) {
    const la = pd.landArea;
    if (!isObj(la)) errs['plotDetails.landArea'] = 'landArea object hona chahiye';
    else {
      if (!posNum(la.value)) errs['plotDetails.landArea.value'] = 'Land area 0 se bada number hona chahiye';
      if (!['acre', 'sqft'].includes(la.unit)) errs['plotDetails.landArea.unit'] = 'Unit acre ya sqft hona chahiye';
    }
  }
  if (has(pd, 'totalPlots') && pd.totalPlots !== null) {
    if (!Number.isInteger(pd.totalPlots) || pd.totalPlots < 1 || pd.totalPlots > 100000) errs['plotDetails.totalPlots'] = 'Plots ki sankhya 1 se 100000 ke beech honi chahiye';
  }
  checkRange(pd, 'plotSize', 'minSqft', 'maxSqft', errs, { positive: true });
  checkRange(pd, 'plotPrice', 'minRupees', 'maxRupees', errs, { positive: false });
  checkRange(pd, 'pricePerSqFtRange', 'min', 'max', errs, { positive: false });
  if (has(pd, 'roadWidthsFt') && pd.roadWidthsFt !== null) {
    const v = pd.roadWidthsFt;
    if (!Array.isArray(v) || v.length < 1 || v.length > 8 || !v.every((n) => isNum(n) && n >= 1 && n <= 500)) {
      errs['plotDetails.roadWidthsFt'] = 'Road width 1 se 500 ft ke beech, zyada se zyada 8 values';
    }
  }
  checkStringList(pd, 'layoutTypes', { max: 5, itemMax: 40 }, errs);
  if (has(pd, 'naOrderNumber') && pd.naOrderNumber !== null && (typeof pd.naOrderNumber !== 'string' || pd.naOrderNumber.length > 60)) {
    errs['plotDetails.naOrderNumber'] = 'NA order number 60 akshar tak ho sakta hai';
  }
  if (has(pd, 'tpApproval') && pd.tpApproval !== null && (typeof pd.tpApproval !== 'string' || pd.tpApproval.length > 120)) {
    errs['plotDetails.tpApproval'] = 'TP approval 120 akshar tak ho sakta hai';
  }
  if (has(pd, 'developmentStatus') && pd.developmentStatus !== null && !DEVELOPMENT_STATUSES.includes(pd.developmentStatus)) {
    errs['plotDetails.developmentStatus'] = 'Development status galat hai';
  }
  return errs;
}

/**
 * Same rules as the server so the form shows the message before a round trip.
 * Update validates ONLY the fields supplied. Residential / commercial / mixed
 * gain no new requirement.
 * @returns {{ errors: string[], fields: Record<string, string> }}
 */
export function validateProjectBody(body, { isCreate = false } = {}) {
  const b = body || {};
  const fields = { ...validatePlotDetails(b.plotDetails) };
  if (isCreate && isPlotFamily(b)) {
    const hasSize = isNum(b.plotDetails?.plotSize?.minSqft) && b.plotDetails.plotSize.minSqft > 0;
    if (!hasSize && !parsePlotSizeRange(b.configuration?.plotSizeRange) && !fields['plotDetails.plotSize.minSqft']) {
      fields['plotDetails.plotSize.minSqft'] = 'Plot size (minimum) zaroori hai';
    }
  }
  return { errors: [...new Set(Object.values(fields))], fields };
}

// ── derivation (mirror of the server, used only to predict what it will store) ──
/**
 * Returns a NEW body; never touches the other family's stored values.
 * @returns {{ body: any, familyChange: { from: string; to: string } | null }}
 */
export function deriveProjectFields(body, { stored = null, isCreate = false } = {}) {
  const out = { ...body };
  let familyChange = null;
  const nowPlot = isCreate ? isPlotFamily(body) : (body.propertyType ? isPlotFamily({ propertyType: body.propertyType }) : isPlotFamily(stored));
  const wasPlot = isCreate ? false : isPlotFamily(stored);
  if (isCreate) {
    if (nowPlot) out.projectType = 'plot';
    else if (String(body.projectType ?? '').toLowerCase() === 'plot') out.projectType = 'flat';
  } else if (body.propertyType && nowPlot !== wasPlot) {
    familyChange = { from: wasPlot ? 'plot' : 'other', to: nowPlot ? 'plot' : 'other' };
    if (nowPlot) out.projectType = 'plot';
    else out.projectType = body.projectType && String(body.projectType).toLowerCase() !== 'plot' ? body.projectType : 'flat';
  } else if (has(body, 'projectType')) {
    const asPlot = String(body.projectType ?? '').toLowerCase() === 'plot';
    if (asPlot !== nowPlot && (nowPlot || asPlot)) delete out.projectType;
  }
  if (nowPlot && body.propertyType) {
    const cat = categoryForPlotType(body.propertyType);
    if (cat) out.category = cat;
  }
  const pd = body.plotDetails;
  if (isObj(pd)) {
    const next = { ...pd };
    delete next.landAreaSqft;
    if (has(pd, 'landArea')) next.landAreaSqft = pd.landArea ? Math.round(toSqft(pd.landArea.value, pd.landArea.unit) ?? 0) : null;
    out.plotDetails = next;
    if (has(pd, 'plotSize') && pd.plotSize === null) out.configuration = { ...(out.configuration || {}), plotSizeRange: null };
    if (isObj(pd.plotSize)) out.configuration = { ...(out.configuration || {}), plotSizeRange: `${rangeText(pd.plotSize.minSqft, pd.plotSize.maxSqft)} sqft` };
    if (isObj(pd.pricePerSqFtRange) && !(isObj(body.pricing) && isNum(body.pricing.pricePerSqFt))) {
      out.pricing = { ...(out.pricing || {}), pricePerSqFt: pd.pricePerSqFtRange.min };
    }
  } else if (has(body, 'plotDetails')) {
    delete out.plotDetails;
  }
  return { body: out, familyChange };
}

// ── display ─────────────────────────────────────────────────────────────────
/**
 * One-line card summary. Plot: "N plots · min - max sqft · land · facing".
 * Residential: "BHK · carpet". Empty string when there is nothing to show, so
 * a card never renders an empty line. Land projects ignore stale BHK/carpet.
 */
export function summaryLine(project) {
  if (!project) return '';
  if (isPlotFamily(project)) {
    const pd = project.plotDetails || {};
    const size = pd.plotSize && isNum(pd.plotSize.minSqft) ? pd.plotSize : parsePlotSizeRange(project.configuration?.plotSizeRange);
    const parts = [];
    if (pd.totalPlots) parts.push(`${pd.totalPlots} plots`);
    if (size) parts.push(`${rangeText(size.minSqft, size.maxSqft)} sqft`);
    if (pd.landArea && isNum(pd.landArea.value)) parts.push(`${fmt(pd.landArea.value)} ${pd.landArea.unit === 'acre' ? 'acre' : 'sqft'}`);
    const facing = project.configuration?.facingOptions;
    if (Array.isArray(facing) && facing.length) parts.push(facing.join('/'));
    return parts.join(' · ');
  }
  const c = project.configuration || {};
  const bhk = Array.isArray(c.bhkOptions) && c.bhkOptions.length ? c.bhkOptions.join(', ') : '';
  return [bhk, c.carpetAreaRange || ''].filter(Boolean).join(' · ');
}

/**
 * Label / value rows for the project detail page of a plot project. Empty when
 * there is nothing to say. Same facts and order as the backend's plotFactLines.
 * @returns {[string, string][]}
 */
export function plotDetailRows(project) {
  const pd = project?.plotDetails;
  if (!isObj(pd)) return [];
  const out = [];
  if (pd.totalPlots) out.push(['Total Plots', String(pd.totalPlots)]);
  if (isObj(pd.landArea) && isNum(pd.landArea.value)) out.push(['Land Area', `${fmt(pd.landArea.value)} ${pd.landArea.unit === 'acre' ? 'acre' : 'sqft'}`]);
  if (isObj(pd.plotSize) && isNum(pd.plotSize.minSqft)) out.push(['Plot Size', `${rangeText(pd.plotSize.minSqft, pd.plotSize.maxSqft)} sqft`]);
  if (isObj(pd.plotPrice) && isNum(pd.plotPrice.minRupees)) out.push(['Plot Price', `Rs ${rangeText(pd.plotPrice.minRupees, pd.plotPrice.maxRupees)}`]);
  if (isObj(pd.pricePerSqFtRange) && isNum(pd.pricePerSqFtRange.min)) out.push(['Price / sq ft', `Rs ${rangeText(pd.pricePerSqFtRange.min, pd.pricePerSqFtRange.max)}`]);
  if (Array.isArray(pd.roadWidthsFt) && pd.roadWidthsFt.length) out.push(['Road Width', `${pd.roadWidthsFt.join(', ')} ft`]);
  if (Array.isArray(pd.layoutTypes) && pd.layoutTypes.length) out.push(['Layout Type', pd.layoutTypes.join(', ')]);
  if (pd.naOrderNumber) out.push(['NA Order', pd.naOrderNumber]);
  if (pd.tpApproval) out.push(['TP Approval', pd.tpApproval]);
  if (pd.developmentStatus) out.push(['Development', DEVELOPMENT_STATUS_TEXT[pd.developmentStatus] || pd.developmentStatus]);
  return out;
}
