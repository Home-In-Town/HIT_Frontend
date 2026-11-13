// Review state helpers for the Phase 2 Layout_Editor Review tab (R13.7, R13.8,
// R16.1, R16.7, R16.9). Plain .mjs so `node --test` runs these in bare Node
// without React.
//
// WHY these are separate from overlayEditorState.mjs: the review workflow has
// its own classification logic, duplicate detection and an undo stack that is
// cleared on save but NOT on overlay changes. Mixing them into the overlay
// reducer would bloat it and make both harder to test.

// ── Classification (R13.7, R13.8) ───────────────────────────────────────

/**
 * Classify a single plot for the review list.
 *
 * Rules (in priority order — first matching rule wins):
 *   'invalid'      — any entry in `plot.validationErrors` (non-empty array).
 *   'needs-check'  — boundaryConfidence OR ocrConfidence < 0.80.
 *   'needs-check'  — plot number contains O or I adjacent to a digit (R13.8).
 *   'needs-check'  — plot number is in the duplicate set.
 *   'valid'        — everything else.
 *
 * Before (Phase 1): there was no classification — every draft showed the same
 * colour and the reviewer had to eyeball individual confidence values. This
 * function centralises the rule so the map layer, the list badge and the
 * "Approve all valid" gate all agree.
 *
 * @param {{ validationErrors?: string[] | null; boundaryConfidence?: number | null; ocrConfidence?: number | null; plotNumber?: string | null }} plot
 * @param {Set<string>} [duplicateIds] — IDs of plots with duplicate plot numbers
 * @returns {'invalid' | 'needs-check' | 'valid'}
 */
export function classifyPlot(plot, duplicateIds = new Set()) {
  // 1. Any validation error → invalid.
  if (Array.isArray(plot.validationErrors) && plot.validationErrors.length > 0) {
    return 'invalid';
  }
  // 2. Low confidence → needs-check.
  const bc = Number(plot.boundaryConfidence ?? 1);
  const oc = Number(plot.ocrConfidence ?? 1);
  if (!Number.isFinite(bc) || bc < 0.80 || !Number.isFinite(oc) || oc < 0.80) {
    return 'needs-check';
  }
  // 3. O/I-digit ambiguity → needs-check.
  if (hasOIDigit(String(plot.plotNumber ?? ''))) {
    return 'needs-check';
  }
  // 4. Duplicate plot number → needs-check.
  if (plot.id && duplicateIds.has(plot.id)) {
    return 'needs-check';
  }
  return 'valid';
}

/**
 * Returns true when the normalised plot-number string contains both (O or I)
 * and a digit. These characters are visually ambiguous in many fonts (R13.8).
 * @param {string} s
 * @returns {boolean}
 */
export function hasOIDigit(s) {
  const upper = String(s ?? '').toUpperCase();
  const hasOI = /[OI]/.test(upper);
  const hasDigit = /[0-9]/.test(upper);
  return hasOI && hasDigit;
}

/**
 * Compute the set of plot IDs whose normalised plot number is shared with at
 * least one other draft-or-approved plot. Empty string is not a duplicate.
 * Re-computed synchronously on every call; the caller debounces within 1 s
 * (R16.7: duplicate flags recomputed within 1 s of an edit).
 * @param {{ id?: string; plotNumber?: string | null; saved?: boolean; provenance?: { approved?: boolean } | null; deleted?: boolean }[]} plots
 * @returns {Set<string>}
 */
export function computeDuplicateFlags(plots) {
  /** @type {Map<string, string[]>} number → [id, ...] */
  const byNumber = new Map();
  for (const p of plots) {
    if (p.deleted) continue;
    const n = normalisedForDup(p.plotNumber);
    if (!n) continue; // empty → not a duplicate
    if (!p.id) continue;
    const list = byNumber.get(n);
    if (list) list.push(p.id);
    else byNumber.set(n, [p.id]);
  }
  const dups = new Set();
  for (const ids of byNumber.values()) {
    if (ids.length > 1) for (const id of ids) dups.add(id);
  }
  return dups;
}

/** Normalise just enough to compare: uppercase, strip non-[A-Z0-9/-], empty→null. */
function normalisedForDup(raw) {
  const s = String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9\/-]/g, '');
  return s.length ? s : null;
}

// ── List sort + filter (R16.1) ────────────────────────────────────────────

/**
 * Sort and filter a list of plots for the review sidebar.
 *
 * Sort key: `Math.min(boundaryConfidence ?? 0, ocrConfidence ?? 0)` (the
 * worst of the two confidences). Missing confidences are treated as 0 so they
 * sort to the front in ascending order, drawing attention to unreviewed plots.
 *
 * Before (Phase 1): no sort control existed; plots appeared in insertion order,
 * which made finding low-confidence plots require scrolling the whole list.
 *
 * @param {{ id?: string; plotNumber?: string | null; boundaryConfidence?: number | null; ocrConfidence?: number | null; validationErrors?: string[] | null; saved?: boolean; provenance?: { approved?: boolean } | null; deleted?: boolean }[]} plots
 * @param {{ sortDir: 'asc' | 'desc'; filter: 'all' | 'valid' | 'needs-check' | 'invalid' | 'approved'; duplicateIds?: Set<string> }} options
 * @returns {typeof plots}
 */
export function sortAndFilterPlots(plots, { sortDir, filter, duplicateIds = new Set() }) {
  const minConf = (p) => Math.min(
    Number.isFinite(Number(p.boundaryConfidence)) ? Number(p.boundaryConfidence) : 0,
    Number.isFinite(Number(p.ocrConfidence)) ? Number(p.ocrConfidence) : 0,
  );
  const isApproved = (p) => p.saved === true && p.provenance?.approved === true && !p.deleted;

  let filtered = plots.filter((p) => !p.deleted);
  if (filter === 'approved') {
    filtered = filtered.filter(isApproved);
  } else if (filter !== 'all') {
    filtered = filtered.filter((p) => classifyPlot(p, duplicateIds) === filter);
  }

  return [...filtered].sort((a, b) => {
    const diff = minConf(a) - minConf(b);
    return sortDir === 'asc' ? diff : -diff;
  });
}

// ── Undo / redo stack (R16.9) ─────────────────────────────────────────────
//
// WHY inverse patches instead of full snapshots: for large layouts (~2000 plots)
// a full snapshot per edit would use hundreds of MB. An inverse patch records
// only the previous values of the changed fields, so the memory cost is
// proportional to the number of fields changed, not the layout size.
//
// WHY capped at 50: unlimited undo would let the user step back through the
// entire detection run, which is not useful and could cause confusion if the
// detection run is re-run. 50 steps covers any realistic editorial session.
//
// WHY cleared on save: once the server has the new state, an undo would put the
// client out of sync with the server. The Layout_Version CAS protects against
// that, but clearing the stack on save keeps the UX predictable.

const UNDO_STACK_MAX = 50;

/**
 * Create an undo/redo stack. Inverse patches are plain objects — the caller
 * defines their schema. apply() pushes one inverse patch and clears the redo
 * branch; undo() pops from the undo side and returns the patch to invert;
 * redo() re-applies a previously undone patch.
 *
 * @template P
 * @returns {{
 *   apply(inversePatch: P): void;
 *   undo(): P | null;
 *   redo(): P | null;
 *   clear(): void;
 *   readonly canUndo: boolean;
 *   readonly canRedo: boolean;
 * }}
 */
export function makeUndoStack() {
  /** @type {any[]} */
  const undos = [];
  /** @type {any[]} */
  const redos = [];

  return {
    /** Push an inverse patch onto the undo stack and clear the redo branch. */
    apply(inversePatch) {
      if (undos.length >= UNDO_STACK_MAX) undos.shift(); // oldest drops first
      undos.push(inversePatch);
      redos.length = 0; // any new edit clears the redo branch
    },
    /** Pop from undo stack. Returns the inverse patch (apply it to go back), or null. */
    undo() {
      if (!undos.length) return null;
      const patch = undos.pop();
      redos.push(patch);
      return patch;
    },
    /** Re-pop from redo stack. Returns the inverse-of-inverse patch, or null. */
    redo() {
      if (!redos.length) return null;
      const patch = redos.pop();
      undos.push(patch);
      return patch;
    },
    /** Clear both stacks. Called on save (R16.9). */
    clear() {
      undos.length = 0;
      redos.length = 0;
    },
    get canUndo() { return undos.length > 0; },
    get canRedo() { return redos.length > 0; },
  };
}

// Review-colour palette for the three-colour map layer (design 4.5, R16.1).
// Approved plots use PLOT_STATUS_COLORS from layoutTools.mjs.
export const REVIEW_COLORS = /** @type {const} */ ({
  invalid: '#ef4444',      // red-500 — something must be fixed
  'needs-check': '#f59e0b', // amber-500 — low confidence or ambiguous
  valid: '#10b981',        // emerald-500 — passes all checks
});
