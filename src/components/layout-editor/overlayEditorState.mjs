// Reducer behind the overlay editor (design 3.1 "State model", R7, R8.8, R17.10).
//
// WHY a plain .mjs: it holds every rule about WHEN things are allowed to happen
// (Save only after all uploads, Reset is local, a second Save while one is in
// flight is ignored, 401/403 falls back to read-only, 409 keeps the draft), so
// `node --test` can pin them without React. OverlayAlignTool.tsx only
// dispatches actions and renders; it makes the requests and reports results back
// as actions.
//
// Reset changed on purpose: it used to PUT the saved image back because the
// upload had already $set layoutOverlay.image on the server. Uploads no longer
// write the project (R7.8), so Reset is purely local: draft = saved, nothing
// pending, no request (R7.4).

/** @typedef {'idle'|'picking'|'pdf-pages'|'rasterising'|'preview'|'uploading'|'aligning'|'georef'|'saving'} EditorMode */
/** @typedef {'edit'|'status-only'|'read-only'} EditorAccess */

/** Save stays disabled this long at most (R7.10). */
export const SAVE_TIMEOUT_MS = 30000;
/** The "saved" confirmation stays visible at least this long (R7.1). */
export const SAVED_NOTICE_MS = 3000;

/**
 * @param {{ saved?: any; layoutVersion?: string | null; access?: EditorAccess }} [init]
 */
export function initialEditorState(init = {}) {
  const saved = init.saved ?? null;
  return {
    saved,
    draft: saved,
    layoutVersion: init.layoutVersion ?? null,
    pending: /** @type {Record<string, any>} */ ({}),
    mode: /** @type {EditorMode} */ ('idle'),
    controlPoints: /** @type {any[]} */ (saved?.controlPoints ? [...saved.controlPoints] : []),
    lock: false,
    lockAspect: true,
    access: /** @type {EditorAccess} */ (init.access ?? 'edit'),
    saving: false,
    confirmingRemove: false,
    /** 'LAYOUT_STALE' | 'LAYOUT_CONFLICT' | null: set by a 409, cleared by Reload or a new save. */
    conflict: /** @type {string | null} */ (null),
    /** { kind, message } shown under the bar. */
    notice: /** @type {{ kind: 'success'|'error'|'info'; message: string } | null} */ (null),
  };
}

/** @typedef {ReturnType<typeof initialEditorState>} OverlayEditorState */

const sameJson = (/** @type {unknown} */ a, /** @type {unknown} */ b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** True while there is anything the user would lose by leaving (R7.6). @param {OverlayEditorState} s */
export function isDirty(s) {
  if (!sameJson(s.draft, s.saved)) return true;
  if (Object.keys(s.pending).length > 0) return true;
  return !sameJson(s.controlPoints, s.saved?.controlPoints ?? []);
}

/**
 * Save is allowed only for an Editor, with something to save, no request in
 * flight, and every upload finished (R1.5, R7.1).
 * @param {OverlayEditorState} s @param {{ uploading?: boolean }} [o]
 */
export function canSave(s, o = {}) {
  return s.access === 'edit' && !!s.draft && isDirty(s) && !s.saving && !o.uploading && s.mode !== 'saving';
}

/**
 * @param {OverlayEditorState} s
 * @param {{ type: string; [k: string]: any }} a
 * @returns {OverlayEditorState}
 */
export function overlayEditorReducer(s, a) {
  switch (a.type) {
    case 'LOAD': {
      const next = initialEditorState({ saved: a.saved, layoutVersion: a.layoutVersion, access: a.access ?? s.access });
      return { ...next, lockAspect: s.lockAspect };
    }
    case 'SET_ACCESS':
      return { ...s, access: a.access };
    case 'SET_MODE':
      return { ...s, mode: a.mode };
    case 'DRAFT':
      // Locked or not an Editor: the map must not change the draft (R4.8, R8.7).
      if (s.lock || s.access !== 'edit') return s;
      return { ...s, draft: a.draft };
    case 'UPLOADED':
      // Uploaded but NOT saved: keys wait in `pending` until Save (R7.8).
      return { ...s, pending: a.pending, draft: a.draft ?? s.draft, mode: 'aligning', notice: a.notice ?? s.notice };
    case 'SET_LOCK':
      return { ...s, lock: !!a.lock };
    case 'SET_LOCK_ASPECT':
      return { ...s, lockAspect: !!a.lockAspect };
    case 'SET_CONTROL_POINTS':
      return { ...s, controlPoints: a.controlPoints };
    case 'NOTICE':
      return { ...s, notice: a.notice };
    case 'RESET':
      // Local only (R7.4): back to the last server copy, no request.
      return {
        ...s,
        draft: s.saved,
        pending: {},
        controlPoints: s.saved?.controlPoints ? [...s.saved.controlPoints] : [],
        mode: 'idle',
        conflict: null,
        confirmingRemove: false,
        notice: null,
      };
    case 'SAVE_START':
      // A second Save while one is in flight does nothing (R7.1).
      if (s.saving || s.access !== 'edit') return s;
      return { ...s, saving: true, mode: 'saving', conflict: null, notice: null };
    case 'SAVE_OK':
      return {
        ...s,
        saved: a.saved,
        draft: a.saved,
        layoutVersion: a.layoutVersion ?? s.layoutVersion,
        pending: {},
        controlPoints: a.saved?.controlPoints ? [...a.saved.controlPoints] : [],
        saving: false,
        mode: 'idle',
        conflict: null,
        confirmingRemove: false,
        notice: { kind: 'success', message: a.message ?? 'Overlay saved' },
      };
    case 'SAVE_FAIL': {
      const status = Number(a.status) || 0;
      const base = { ...s, saving: false, mode: /** @type {EditorMode} */ (s.draft ? 'aligning' : 'idle'), confirmingRemove: false };
      // 401/403: the user cannot edit after all. Keep the draft on screen (R8.8).
      if (status === 401 || status === 403) {
        return { ...base, access: 'read-only', notice: { kind: 'error', message: a.message || 'You do not have permission to edit this layout.' } };
      }
      if (status === 409 && (a.code === 'LAYOUT_STALE' || a.code === 'LAYOUT_CONFLICT')) {
        return {
          ...base,
          conflict: a.code,
          notice: {
            kind: 'error',
            message: a.code === 'LAYOUT_STALE'
              ? 'The layout changed since you opened it. Reload to continue (your draft stays here until you reload).'
              : 'The layout was busy. Your draft is kept; try Save again.',
          },
        };
      }
      return { ...base, notice: { kind: 'error', message: a.message || 'Could not save the overlay.' } };
    }
    case 'SAVE_TIMEOUT':
      // After 30 s Save becomes available again (R7.10).
      return s.saving ? { ...s, saving: false, mode: s.draft ? 'aligning' : 'idle' } : s;
    case 'REMOVE_REQUEST':
      return s.access === 'edit' && s.saved ? { ...s, confirmingRemove: true } : s;
    case 'REMOVE_CANCEL':
      // Cancel sends nothing (R7.5).
      return { ...s, confirmingRemove: false };
    case 'REMOVE_OK':
      return {
        ...s,
        saved: null,
        draft: null,
        pending: {},
        controlPoints: [],
        layoutVersion: a.layoutVersion ?? s.layoutVersion,
        saving: false,
        confirmingRemove: false,
        mode: 'idle',
        conflict: null,
        notice: { kind: 'success', message: 'Overlay removed' },
      };
    case 'SET_VERSION':
      return { ...s, layoutVersion: a.layoutVersion ?? null };
    default:
      return s;
  }
}
