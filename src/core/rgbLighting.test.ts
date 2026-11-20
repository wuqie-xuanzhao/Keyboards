import assert from 'node:assert/strict';
import test from 'node:test';
import { compileCfgFile } from './cfgEngine';
import { createDefaultCfgProject } from './defaultCfgProject';
import {
  compileRgbCfgSection,
  createDefaultRgbProfile,
  evaluateZoneRgb,
  getKeyRgbZone,
  hasAnimatedRgbEffect,
} from './rgbLighting';

test('classifies keys accurately into the 6 RGB lighting zones', () => {
  assert.equal(getKeyRgbZone('KeyW'), 'wasd');
  assert.equal(getKeyRgbZone('KeyD'), 'wasd');
  assert.equal(getKeyRgbZone('KeyR'), 'alphas');
  assert.equal(getKeyRgbZone('Space'), 'alphas');
  assert.equal(getKeyRgbZone('ShiftLeft'), 'modifiers');
  assert.equal(getKeyRgbZone('Enter'), 'modifiers');
  assert.equal(getKeyRgbZone('Escape'), 'functionRow');
  assert.equal(getKeyRgbZone('F5'), 'functionRow');
  assert.equal(getKeyRgbZone('ArrowUp'), 'navigation');
  assert.equal(getKeyRgbZone('Home'), 'navigation');
  assert.equal(getKeyRgbZone('Numpad1'), 'numpad');
  assert.equal(getKeyRgbZone('NumLock'), 'numpad');
});

test('evaluates static, blink, breathe, and disabled zone RGB waveforms cleanly', () => {
  const profile = createDefaultRgbProfile();
  const blinkZone = { ...profile.zones.wasd, effect: 'blink' as const, blinkHz: 2.0, color: '#FF0000' };
  const onSample = evaluateZoneRgb(blinkZone, 100, 0.1, 0.2);
  const offSample = evaluateZoneRgb(blinkZone, 100, 0.35, 0.2);
  assert.ok(onSample[0] > 0.9, 'blink on-phase should emit full red');
  assert.ok(offSample[0] < 0.15, 'blink off-phase should dim sharply');

  const disabledSample = evaluateZoneRgb({ ...blinkZone, enabled: false }, 100, 0.1, 0.2);
  assert.deepEqual(disabledSample, [0, 0, 0]);
  assert.equal(hasAnimatedRgbEffect(profile), true);
});

test('exports RGB zone colors and blink frequencies into root autoexec.cfg', () => {
  const files = createDefaultCfgProject();
  const profile = createDefaultRgbProfile();
  profile.zones.wasd.color = '#00FF88';
  profile.zones.wasd.effect = 'blink';
  profile.zones.wasd.blinkHz = 3.5;

  const section = compileRgbCfgSection(profile);
  assert.ok(section.includes('rgb_zone_color "wasd" "#00FF88" 0 255 136'));
  assert.ok(section.includes('rgb_zone_blink "wasd" "blink" 3.50 1.00 1'));

  const compiledRoot = compileCfgFile(files[0], files, profile);
  assert.ok(compiledRoot.includes('// --- RGB Lighting Color & Blink Definitions ---'));
  assert.ok(compiledRoot.includes('rgb_zone_color "wasd" "#00FF88"'));

  const compiledChild = compileCfgFile(files[1], files, profile);
  assert.ok(!compiledChild.includes('rgb_zone_color'), 'only root autoexec.cfg includes global RGB block');
});
