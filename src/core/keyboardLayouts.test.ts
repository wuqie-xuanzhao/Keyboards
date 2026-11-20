import test from 'node:test';
import assert from 'node:assert/strict';
import { computeLayoutBounds, KEYBOARD_MODELS, KEYBOARD_MODEL_LIST } from './keyboardLayouts';

test('all 6 3D keyboard layouts (including numpad21 and full104) have unique key codes and non-overlapping key bounds', () => {
  assert.equal(KEYBOARD_MODEL_LIST.length, 6);

  for (const model of KEYBOARD_MODEL_LIST) {
    assert.equal(model.keyCount, model.keys.length, `${model.id} keyCount matches keys.length`);
    assert.ok(model.keys.length >= 20, `${model.id} has valid key count`);

    const seenCodes = new Set<string>();
    for (const key of model.keys) {
      assert.ok(!seenCodes.has(key.code), `${model.id} has duplicate key code ${key.code}`);
      seenCodes.add(key.code);
      assert.ok(key.w > 0, `${model.id} key ${key.code} width > 0`);
      assert.ok((key.h ?? 1) > 0, `${model.id} key ${key.code} height > 0`);
    }

    // Check pairwise bounding box overlap (including 2U vertical keys like NumpadAdd / NumpadEnter)
    const eps = 0.001;
    for (let i = 0; i < model.keys.length; i++) {
      const a = model.keys[i];
      const ah = a.h ?? 1;
      for (let j = i + 1; j < model.keys.length; j++) {
        const b = model.keys[j];
        const bh = b.h ?? 1;
        const overlapX = a.x + a.w > b.x + eps && b.x + b.w > a.x + eps;
        const overlapY = a.y + ah > b.y + eps && b.y + bh > a.y + eps;
        assert.equal(
          overlapX && overlapY,
          false,
          `${model.id}: keys ${a.code} and ${b.code} overlap`,
        );
      }
    }

    const bounds = computeLayoutBounds(model);
    assert.ok(bounds.widthU >= 4 && bounds.depthU >= 4, `${model.id} has valid physical bounds`);
  }

  // Verify Numpad 2U vertical keys exist on both numpad21 and full104
  for (const id of ['numpad21', 'full104'] as const) {
    const numAdd = KEYBOARD_MODELS[id].keys.find((k) => k.code === 'NumpadAdd');
    const numEnter = KEYBOARD_MODELS[id].keys.find((k) => k.code === 'NumpadEnter');
    const numZero = KEYBOARD_MODELS[id].keys.find((k) => k.code === 'Numpad0');
    assert.equal(numAdd?.h, 2, `${id} NumpadAdd is 2U tall`);
    assert.equal(numEnter?.h, 2, `${id} NumpadEnter is 2U tall`);
    assert.equal(numZero?.w, 2, `${id} Numpad0 is 2U wide`);
  }
});
