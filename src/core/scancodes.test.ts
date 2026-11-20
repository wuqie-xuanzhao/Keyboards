import test from 'node:test';
import assert from 'node:assert/strict';
import { getScancode, resolveKeycapLegend } from './scancodes';
import { KEYBOARD_MODEL_LIST } from './keyboardLayouts';

test('resolves keycap legends dynamically from scancode registry across key sizes and layouts', () => {
  const enterMain = resolveKeycapLegend('Enter', { keyWidthU: 2.25, layoutId: 'pro75' });
  assert.equal(enterMain.primary, 'Enter');

  const shiftLeft = resolveKeycapLegend('ShiftLeft', { keyWidthU: 2.25, layoutId: 'pro75' });
  assert.equal(shiftLeft.primary, 'Shift');

  const bkspFull = resolveKeycapLegend('Backspace', { keyWidthU: 2, layoutId: 'full104' });
  assert.equal(bkspFull.primary, 'Backspace');

  const bkspNumpad = resolveKeycapLegend('Backspace', { keyWidthU: 1, layoutId: 'numpad21' });
  assert.equal(bkspNumpad.primary, 'Bksp');

  const numEnterTall = resolveKeycapLegend('NumpadEnter', {
    keyWidthU: 1,
    keyHeightU: 2,
    layoutId: 'numpad21',
  });
  assert.equal(numEnterTall.primary, 'Enter');

  const num1 = resolveKeycapLegend('Numpad1', { keyWidthU: 1, layoutId: 'numpad21' });
  assert.equal(num1.primary, '1');
  assert.equal(num1.secondary, 'End');

  const arrowUp = resolveKeycapLegend('ArrowUp', { keyWidthU: 1, layoutId: 'pro75' });
  assert.equal(arrowUp.arrowDir, 'up');

  // Dynamic GLFW & CFG modes
  const enterGlfw = resolveKeycapLegend('Enter', { keyWidthU: 2.25, legendMode: 'glfw' });
  assert.equal(enterGlfw.primary, 'ENTER');

  const num1Cfg = resolveKeycapLegend('Numpad1', { keyWidthU: 1, legendMode: 'cfg' });
  assert.equal(num1Cfg.primary, 'kp_end');
});

test('every physical key across all 6 keyboard layouts maps cleanly to a scancode entry', () => {
  for (const model of KEYBOARD_MODEL_LIST) {
    for (const key of model.keys) {
      const sc = getScancode(key.code);
      assert.ok(sc.glfw.startsWith('GLFW_KEY_'), `${model.id} ${key.code} has valid GLFW code`);
      const resolved = resolveKeycapLegend(key.code, {
        keyWidthU: key.w,
        keyHeightU: key.h ?? 1,
        layoutId: model.id,
        legendMode: 'standard',
      });
      assert.ok(resolved.primary.length > 0, `${model.id} ${key.code} resolved non-empty legend`);
    }
  }
});
