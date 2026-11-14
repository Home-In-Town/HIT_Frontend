// Feature: interactive-plot-layout, Property 24: Undo and redo
// node --test src/components/layout-editor/p24-undo-redo.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { makeUndoStack } from './reviewState.mjs';

test('Property 24: undo after redo returns to previous state (100 runs)', () => {
  fc.assert(fc.property(
    fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 2, maxLength: 20 }),
    (patches) => {
      const stack = makeUndoStack();
      for (const p of patches) stack.apply(p);
      // Undo one, redo it, undo again — should get the same patch
      const p1 = stack.undo();
      if (!p1) return true; // stack was empty
      const p2 = stack.redo();
      const p3 = stack.undo();
      assert.deepEqual(p1, p3, 'undo→redo→undo should give the same patch');
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 24: stack cleared on save means canUndo is false (100 runs)', () => {
  fc.assert(fc.property(
    fc.array(fc.integer(), { minLength: 1, maxLength: 10 }),
    (patches) => {
      const stack = makeUndoStack();
      for (const p of patches) stack.apply(p);
      stack.clear();
      assert.ok(!stack.canUndo, 'canUndo should be false after clear');
      assert.ok(!stack.canRedo, 'canRedo should be false after clear');
      return true;
    },
  ), { numRuns: 100 });
});

test('Property 24: 51st apply drops the oldest entry (100 runs)', () => {
  fc.assert(fc.property(
    fc.constant(51),
    (n) => {
      const stack = makeUndoStack();
      for (let i = 0; i < n; i++) stack.apply(i);
      // After 51 applies, we should only be able to undo 50 times
      let count = 0;
      while (stack.canUndo) { stack.undo(); count++; }
      assert.equal(count, 50, `Expected 50 undos, got ${count}`);
      return true;
    },
  ), { numRuns: 100 });
});

test('undo from empty returns null', () => {
  const stack = makeUndoStack();
  assert.equal(stack.undo(), null);
});

test('redo from empty returns null', () => {
  const stack = makeUndoStack();
  assert.equal(stack.redo(), null);
});

test('apply clears redo branch', () => {
  const stack = makeUndoStack();
  stack.apply(1);
  stack.undo();
  assert.ok(stack.canRedo);
  stack.apply(2); // new edit clears redo
  assert.ok(!stack.canRedo);
});
