import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAllKeyBinds } from './cfgEngine';
import { createDefaultCfgProject, ROOT_CFG_ID } from './defaultCfgProject';
import {
  computeHeatmapAnalytics,
  getEffectiveTriggerFrequency,
  getThermalKeyStyle,
} from './heatmapAnalytics';
import { KEYBOARD_MODELS } from './keyboardLayouts';

test('aggregates global trigger frequencies across all nested CFG files', () => {
  const files = createDefaultCfgProject();
  const { bindsByKey } = resolveAllKeyBinds(ROOT_CFG_ID, files);
  const res = computeHeatmapAnalytics(files, 'global', bindsByKey, KEYBOARD_MODELS.pro75);

  assert.ok(res.activeKeyCount >= 20, 'should aggregate all default key_input nodes globally');
  assert.equal(res.rankedKeys[0].keyCode, 'KeyW', 'KeyW should rank #1 in default FPS layout');
  assert.equal(res.rankedKeys[0].frequency, 54);
  assert.equal(res.rankedKeys[0].normalized, 1);
  assert.ok(res.totalFrequency > 300);
  assert.equal(res.leftHandPct + res.rightHandPct, 100);
  assert.ok(
    res.hiddenOnLayoutKeys.some((k) => k.keyCode === 'Numpad1'),
    '75% layout should detect hidden numpad bindings from buy_numpad.cfg',
  );
});

test('supports single-file scoping and detects ergonomic warnings for overloaded pinky or far-reach high-frequency keys', () => {
  const files = createDefaultCfgProject();
  // Push F12 (far reach) to high frequency in autoexec
  files[0].nodes.push({
    id: 'test_far_hot',
    type: 'key_input',
    x: 0,
    y: 0,
    title: '按键触发 · F12',
    data: { keyCode: 'F12', triggerMode: 'press', triggerFrequency: 40 },
  });

  const { bindsByKey } = resolveAllKeyBinds(ROOT_CFG_ID, files);
  const scoped = computeHeatmapAnalytics(files, files[0].id, bindsByKey, KEYBOARD_MODELS.full104);

  assert.equal(scoped.statsByKey['F12'].frequency, 40);
  assert.equal(scoped.statsByKey['KeyW'], undefined, 'single-file scope must exclude movement.cfg');
  assert.ok(
    scoped.hints.some((h) => h.id === 'far_reach_F12' && h.severity === 'warn'),
    'should flag far-reach high-frequency F12 key',
  );
});

test('falls back cleanly for legacy nodes without triggerFrequency and maps thermal styles', () => {
  const legacyFreq = getEffectiveTriggerFrequency({
    id: 'legacy_1',
    type: 'key_input',
    x: 0,
    y: 0,
    title: '按键触发 · W',
    data: { keyCode: 'KeyW', triggerMode: 'hold' },
  });
  assert.equal(legacyFreq, 54);

  const cold = getThermalKeyStyle(0, 0);
  const hot = getThermalKeyStyle(1, 60);
  assert.equal(cold.tierLabel, '未绑定');
  assert.equal(hot.tierLabel, '极高频');
});
