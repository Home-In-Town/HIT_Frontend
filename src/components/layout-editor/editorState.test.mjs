// node --test src/components/layout-editor/editorState.test.mjs
// Unit tests for the georeferencing state machine (11.3) and the overlay
// editor reducer (12.3).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { initialGeorefState, georefTransition, toControlPoints, alignOffsets, MIRROR_NOTICE } from './georefState.mjs';
import { overlayEditorReducer, initialEditorState, canSave, isDirty } from './overlayEditorState.mjs';
import { haversineM, imageToGeo } from '../../lib/layoutTools.mjs';

const SIZE = { width: 2000, height: 1000 };
const run = (s, actions) => actions.reduce((acc, a) => {
  const r = georefTransition(acc.state, a, SIZE);
  return { state: r.state, transform: r.transform ?? acc.transform, last: r };
}, { state: s, transform: null, last: null });

const A = { lat: 21.1458, lng: 79.0882 };
const B = { lat: 21.1458, lng: 79.0902 };

describe('georeferencing state machine', () => {
  test('walks pick-image-1 to solved and returns a transform', () => {
    const r = run(initialGeorefState(), [
      { type: 'PICK_IMAGE', pt: { x: 100, y: 500 } }, { type: 'PICK_MAP', geo: A },
      { type: 'PICK_IMAGE', pt: { x: 1900, y: 500 } }, { type: 'PICK_MAP', geo: B },
    ]);
    assert.equal(r.state.step, 'solved');
    assert.ok(r.transform && r.transform.widthM > 0);
    assert.ok(MIRROR_NOTICE.length > 0);
  });

  test('refusal names the failed check, keeps the points, and does not return a transform', () => {
    const r = run(initialGeorefState(), [
      { type: 'PICK_IMAGE', pt: { x: 100, y: 500 } }, { type: 'PICK_MAP', geo: A },
      { type: 'PICK_IMAGE', pt: { x: 105, y: 500 } }, { type: 'PICK_MAP', geo: B },
    ]);
    assert.equal(r.last.transform, null);
    assert.equal(r.state.refusal.check, 'IMAGE_POINTS_TOO_CLOSE');
    assert.ok(r.state.points[0].geo && r.state.points[1].image);

    const g = run(initialGeorefState(), [
      { type: 'PICK_IMAGE', pt: { x: 100, y: 500 } }, { type: 'PICK_MAP', geo: A },
      { type: 'PICK_IMAGE', pt: { x: 1900, y: 500 } }, { type: 'PICK_MAP', geo: { lat: A.lat, lng: A.lng + 0.000001 } },
    ]);
    assert.equal(g.state.refusal.check, 'GEO_POINTS_TOO_CLOSE');
  });

  test('check point is excluded from the solve', () => {
    const base = run(initialGeorefState(), [
      { type: 'PICK_IMAGE', pt: { x: 100, y: 500 } }, { type: 'PICK_MAP', geo: A },
      { type: 'PICK_IMAGE', pt: { x: 1900, y: 500 } }, { type: 'PICK_MAP', geo: B },
    ]);
    const withCheck = run(base.state, [
      { type: 'ADD_CHECK' }, { type: 'PICK_IMAGE', pt: { x: 1000, y: 100 } }, { type: 'PICK_MAP', geo: { lat: 21.2, lng: 79.2 } },
    ]);
    assert.equal(withCheck.state.step, 'solved');
    assert.equal(withCheck.transform, null); // no new transform: the far-away check point is not solved
    assert.equal(toControlPoints(withCheck.state).filter((c) => c.role === 'check').length, 1);
    assert.equal(toControlPoints(withCheck.state).filter((c) => c.role === 'align').length, 2);
  });

  test('alignment offsets are ~0 right after the solve', () => {
    const r = run(initialGeorefState(), [
      { type: 'PICK_IMAGE', pt: { x: 100, y: 500 } }, { type: 'PICK_MAP', geo: A },
      { type: 'PICK_IMAGE', pt: { x: 1900, y: 500 } }, { type: 'PICK_MAP', geo: B },
    ]);
    for (const o of alignOffsets(r.transform, SIZE, r.state)) assert.ok(o <= 0.1);
    assert.ok(haversineM(imageToGeo(r.transform, SIZE, { x: 100, y: 500 }), A) < 0.5);
  });

  test('reopening: stored points restore a solved state; moving a marker recomputes', () => {
    const cps = [
      { u: 100, v: 500, lat: A.lat, lng: A.lng, role: 'align' },
      { u: 1900, v: 500, lat: B.lat, lng: B.lng, role: 'align' },
    ];
    const s = initialGeorefState({ controlPoints: cps });
    assert.equal(s.step, 'solved');
    const moved = georefTransition(s, { type: 'MOVE_MAP', index: 1, geo: { lat: B.lat, lng: B.lng + 0.0005 } }, SIZE);
    assert.ok(moved.transform);
    assert.notEqual(moved.transform.widthM, georefTransition(s, { type: 'MOVE_MAP', index: 1, geo: B }, SIZE).transform.widthM);
  });

  test('reopen with no stored points starts at pick-image-1', () => {
    assert.equal(initialGeorefState({ controlPoints: [] }).step, 'pick-image-1');
  });
});

describe('overlay editor reducer', () => {
  const saved = { image: { url: 'u', key: 'k' }, widthM: 10, heightM: 10, center: { lat: 1, lng: 1 }, rotationDeg: 0, opacity: 1 };
  const base = () => initialEditorState({ saved, layoutVersion: 'v1' });

  test('Reset is local: draft = saved, pending cleared, no request', () => {
    let s = overlayEditorReducer(base(), { type: 'DRAFT', draft: { ...saved, widthM: 99 } });
    s = overlayEditorReducer(s, { type: 'UPLOADED', pending: { image: { key: 'n' } } });
    assert.equal(isDirty(s), true);
    s = overlayEditorReducer(s, { type: 'RESET' });
    assert.deepEqual(s.draft, saved);
    assert.deepEqual(s.pending, {});
    assert.equal(isDirty(s), false);
  });

  test('Save is ignored while one is in flight and disabled until uploads finish', () => {
    let s = overlayEditorReducer(base(), { type: 'DRAFT', draft: { ...saved, widthM: 50 } });
    assert.equal(canSave(s), true);
    assert.equal(canSave(s, { uploading: true }), false);
    s = overlayEditorReducer(s, { type: 'SAVE_START' });
    assert.equal(s.saving, true);
    assert.equal(canSave(s), false);
    assert.equal(overlayEditorReducer(s, { type: 'SAVE_START' }), s);
    assert.equal(overlayEditorReducer(s, { type: 'SAVE_TIMEOUT' }).saving, false);
  });

  test('remove dialog: Cancel changes nothing', () => {
    let s = overlayEditorReducer(base(), { type: 'REMOVE_REQUEST' });
    assert.equal(s.confirmingRemove, true);
    s = overlayEditorReducer(s, { type: 'REMOVE_CANCEL' });
    assert.equal(s.confirmingRemove, false);
    assert.deepEqual(s.saved, saved);
  });

  test('401/403 switches to read-only and keeps the draft', () => {
    for (const status of [401, 403]) {
      let s = overlayEditorReducer(base(), { type: 'DRAFT', draft: { ...saved, widthM: 50 } });
      s = overlayEditorReducer(s, { type: 'SAVE_START' });
      s = overlayEditorReducer(s, { type: 'SAVE_FAIL', status });
      assert.equal(s.access, 'read-only');
      assert.equal(s.draft.widthM, 50);
      assert.equal(overlayEditorReducer(s, { type: 'DRAFT', draft: saved }), s); // read-only ignores edits
    }
  });

  test('409 keeps the draft; STALE offers reload, CONFLICT offers retry', () => {
    for (const code of ['LAYOUT_STALE', 'LAYOUT_CONFLICT']) {
      let s = overlayEditorReducer(base(), { type: 'DRAFT', draft: { ...saved, widthM: 50 } });
      s = overlayEditorReducer(s, { type: 'SAVE_START' });
      s = overlayEditorReducer(s, { type: 'SAVE_FAIL', status: 409, code });
      assert.equal(s.conflict, code);
      assert.equal(s.access, 'edit');
      assert.equal(s.draft.widthM, 50);
    }
  });

  test('SAVE_OK replaces saved and the Layout_Version', () => {
    let s = overlayEditorReducer(base(), { type: 'DRAFT', draft: { ...saved, widthM: 50 } });
    s = overlayEditorReducer(s, { type: 'SAVE_START' });
    s = overlayEditorReducer(s, { type: 'SAVE_OK', saved: { ...saved, widthM: 50 }, layoutVersion: 'v2' });
    assert.equal(s.layoutVersion, 'v2');
    assert.equal(isDirty(s), false);
  });

  test('lock ignores map edits', () => {
    let s = overlayEditorReducer(base(), { type: 'SET_LOCK', lock: true });
    assert.equal(overlayEditorReducer(s, { type: 'DRAFT', draft: { ...saved, widthM: 5 } }), s);
  });
});
