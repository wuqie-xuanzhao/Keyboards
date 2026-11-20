import type { RgbEffectMode, RgbLightingProfile, RgbZoneConfig, RgbZoneId } from './types';

export interface RgbZoneMeta {
  id: RgbZoneId;
  label: string;
  shortDesc: string;
}

export const RGB_ZONE_ORDER: RgbZoneId[] = [
  'wasd',
  'alphas',
  'modifiers',
  'functionRow',
  'navigation',
  'numpad',
];

export const RGB_ZONE_META: Record<RgbZoneId, RgbZoneMeta> = {
  wasd: {
    id: 'wasd',
    label: 'WASD 核心移动区',
    shortDesc: 'W / A / S / D',
  },
  alphas: {
    id: 'alphas',
    label: '主字母与数字区',
    shortDesc: '字母 / 1-0 / Space',
  },
  modifiers: {
    id: 'modifiers',
    label: '功能修饰键区',
    shortDesc: 'Shift / Ctrl / Alt / Tab / Enter',
  },
  functionRow: {
    id: 'functionRow',
    label: '顶部 F 功能区',
    shortDesc: 'Esc / F1-F12 / PrtSc',
  },
  navigation: {
    id: 'navigation',
    label: '方向与导航键区',
    shortDesc: '方向键 / Home / End / Del',
  },
  numpad: {
    id: 'numpad',
    label: '小数字键盘区',
    shortDesc: 'Num 0-9 / 运算符 / NumEnter',
  },
};

export const RGB_EFFECT_LABELS: Record<RgbEffectMode, string> = {
  static: '常亮',
  breathe: '呼吸',
  blink: '闪烁',
  wave: '彩虹波浪',
};

export const RGB_QUICK_COLORS = [
  '#FF6A2B',
  '#FF3B6B',
  '#F59E0B',
  '#22C55E',
  '#06B6D4',
  '#38BDF8',
  '#A855F7',
  '#F9A8D4',
];

const WASD_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);

const FUNCTION_ROW_KEYS = new Set([
  'Escape',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'PrintScreen',
  'ScrollLock',
  'Pause',
]);

const NAVIGATION_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Insert',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

const MODIFIER_KEYS = new Set([
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'ContextMenu',
  'Fn',
  'Enter',
  'Backspace',
]);

/**
 * Classifies any physical key code into one of the 6 customizable RGB lighting zones.
 */
export function getKeyRgbZone(keyCode: string): RgbZoneId {
  if (WASD_KEYS.has(keyCode)) return 'wasd';
  if (keyCode === 'NumLock' || keyCode.startsWith('Numpad')) return 'numpad';
  if (FUNCTION_ROW_KEYS.has(keyCode)) return 'functionRow';
  if (NAVIGATION_KEYS.has(keyCode)) return 'navigation';
  if (MODIFIER_KEYS.has(keyCode)) return 'modifiers';
  return 'alphas';
}

export interface RgbPresetSpec {
  id: string;
  name: string;
  swatchGradient: string;
  profile: RgbLightingProfile;
}

export function createDefaultRgbProfile(): RgbLightingProfile {
  return {
    enabled: true,
    masterBrightness: 88,
    syncUnderglow: true,
    zones: {
      wasd: {
        id: 'wasd',
        enabled: true,
        color: '#FF6A2B',
        effect: 'breathe',
        blinkHz: 1.0,
        brightness: 100,
      },
      alphas: {
        id: 'alphas',
        enabled: true,
        color: '#38BDF8',
        effect: 'static',
        blinkHz: 0,
        brightness: 78,
      },
      modifiers: {
        id: 'modifiers',
        enabled: true,
        color: '#A855F7',
        effect: 'breathe',
        blinkHz: 0.6,
        brightness: 84,
      },
      functionRow: {
        id: 'functionRow',
        enabled: true,
        color: '#F43F5E',
        effect: 'blink',
        blinkHz: 1.8,
        brightness: 85,
      },
      navigation: {
        id: 'navigation',
        enabled: true,
        color: '#22C55E',
        effect: 'breathe',
        blinkHz: 0.8,
        brightness: 82,
      },
      numpad: {
        id: 'numpad',
        enabled: true,
        color: '#F59E0B',
        effect: 'static',
        blinkHz: 0,
        brightness: 88,
      },
    },
  };
}

export const RGB_PRESETS: RgbPresetSpec[] = [
  {
    id: 'fps_tactical',
    name: '竞技战术',
    swatchGradient: 'linear-gradient(135deg, #FF6A2B 0%, #38BDF8 55%, #A855F7 100%)',
    profile: createDefaultRgbProfile(),
  },
  {
    id: 'sakura_pastel',
    name: '樱花粉梦',
    swatchGradient: 'linear-gradient(135deg, #FF7EB6 0%, #FFB5D8 50%, #C49BFF 100%)',
    profile: {
      enabled: true,
      masterBrightness: 85,
      syncUnderglow: true,
      zones: {
        wasd: { id: 'wasd', enabled: true, color: '#FF5C9E', effect: 'breathe', blinkHz: 0.8, brightness: 100 },
        alphas: { id: 'alphas', enabled: true, color: '#FFA8CF', effect: 'static', blinkHz: 0, brightness: 76 },
        modifiers: { id: 'modifiers', enabled: true, color: '#C084FC', effect: 'breathe', blinkHz: 0.5, brightness: 86 },
        functionRow: { id: 'functionRow', enabled: true, color: '#FDBA74', effect: 'breathe', blinkHz: 0.7, brightness: 82 },
        navigation: { id: 'navigation', enabled: true, color: '#93C5FD', effect: 'breathe', blinkHz: 0.9, brightness: 84 },
        numpad: { id: 'numpad', enabled: true, color: '#F472B6', effect: 'static', blinkHz: 0, brightness: 85 },
      },
    },
  },
  {
    id: 'aurora_wave',
    name: '极光波浪',
    swatchGradient: 'linear-gradient(135deg, #22D3EE 0%, #34D399 45%, #818CF8 100%)',
    profile: {
      enabled: true,
      masterBrightness: 90,
      syncUnderglow: true,
      zones: {
        wasd: { id: 'wasd', enabled: true, color: '#22D3EE', effect: 'wave', blinkHz: 0.8, brightness: 100 },
        alphas: { id: 'alphas', enabled: true, color: '#34D399', effect: 'wave', blinkHz: 0.6, brightness: 88 },
        modifiers: { id: 'modifiers', enabled: true, color: '#818CF8', effect: 'wave', blinkHz: 0.6, brightness: 86 },
        functionRow: { id: 'functionRow', enabled: true, color: '#38BDF8', effect: 'wave', blinkHz: 0.7, brightness: 86 },
        navigation: { id: 'navigation', enabled: true, color: '#2DD4BF', effect: 'wave', blinkHz: 0.7, brightness: 88 },
        numpad: { id: 'numpad', enabled: true, color: '#A78BFA', effect: 'wave', blinkHz: 0.6, brightness: 88 },
      },
    },
  },
  {
    id: 'alert_pulse',
    name: '警戒脉冲',
    swatchGradient: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 55%, #06B6D4 100%)',
    profile: {
      enabled: true,
      masterBrightness: 92,
      syncUnderglow: true,
      zones: {
        wasd: { id: 'wasd', enabled: true, color: '#FF2D46', effect: 'blink', blinkHz: 2.5, brightness: 100 },
        alphas: { id: 'alphas', enabled: true, color: '#06B6D4', effect: 'static', blinkHz: 0, brightness: 68 },
        modifiers: { id: 'modifiers', enabled: true, color: '#F59E0B', effect: 'blink', blinkHz: 1.5, brightness: 88 },
        functionRow: { id: 'functionRow', enabled: true, color: '#EF4444', effect: 'blink', blinkHz: 3.0, brightness: 95 },
        navigation: { id: 'navigation', enabled: true, color: '#F97316', effect: 'breathe', blinkHz: 1.2, brightness: 85 },
        numpad: { id: 'numpad', enabled: true, color: '#F59E0B', effect: 'breathe', blinkHz: 1.0, brightness: 85 },
      },
    },
  },
];

export function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  if (Number.isNaN(num)) return [255, 255, 255];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function hslToRgb01(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 1) + 1) % 1;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 1 / 6) {
    r = c;
    g = x;
  } else if (hue < 2 / 6) {
    r = x;
    g = c;
  } else if (hue < 3 / 6) {
    g = c;
    b = x;
  } else if (hue < 4 / 6) {
    g = x;
    b = c;
  } else if (hue < 5 / 6) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [r + m, g + m, b + m];
}

/**
 * Evaluates a zone's instantaneous linear RGB output [r, g, b] in [0..1.5]
 * given elapsed time `timeSec` and normalized horizontal key position `normX` [0..1].
 * Pure function suitable for zero-GC animation ticks and unit testing.
 */
export function evaluateZoneRgb(
  zone: RgbZoneConfig,
  masterBrightness: number,
  timeSec: number,
  normX: number,
): [number, number, number] {
  if (!zone.enabled || masterBrightness <= 0 || zone.brightness <= 0) {
    return [0, 0, 0];
  }

  const baseGain = (masterBrightness / 100) * (zone.brightness / 100);
  const hz = Math.max(0, zone.blinkHz);

  let r = 0;
  let g = 0;
  let b = 0;

  if (zone.effect === 'wave') {
    const speed = hz > 0 ? hz * 0.45 : 0.25;
    const hue = (normX * 0.85 - timeSec * speed) % 1;
    [r, g, b] = hslToRgb01(hue, 0.88, 0.56);
    return [r * baseGain, g * baseGain, b * baseGain];
  }

  const [r255, g255, b255] = hexToRgbTuple(zone.color);
  r = r255 / 255;
  g = g255 / 255;
  b = b255 / 255;

  let mod = 1.0;
  if (zone.effect === 'breathe' && hz > 0) {
    // Smooth cosine breathing envelope [0.16 .. 1.0]
    mod = 0.16 + 0.84 * (0.5 + 0.5 * Math.cos(timeSec * Math.PI * 2 * hz));
  } else if (zone.effect === 'blink' && hz > 0) {
    // Crisp square-pulse blink with brief ramp [0.06 .. 1.0]
    const phase = (timeSec * hz) % 1;
    mod = phase < 0.52 ? 1.0 : 0.06;
  }

  const gain = baseGain * mod;
  return [r * gain, g * gain, b * gain];
}

export function hasAnimatedRgbEffect(profile: RgbLightingProfile): boolean {
  if (!profile.enabled || profile.masterBrightness <= 0) return false;
  return RGB_ZONE_ORDER.some((id) => {
    const z = profile.zones[id];
    if (!z.enabled || z.brightness <= 0) return false;
    if (z.effect === 'wave') return true;
    return (z.effect === 'breathe' || z.effect === 'blink') && z.blinkHz > 0;
  });
}

/**
 * Serializes the user's RGB zone color & blink frequency settings into clean,
 * deterministic .cfg lighting directives for C++ engines / Source-style parsers.
 */
export function compileRgbCfgSection(profile: RgbLightingProfile): string {
  const lines: string[] = [];
  lines.push('// --- RGB Lighting Color & Blink Definitions ---');
  lines.push(`rgb_enabled ${profile.enabled ? 1 : 0}`);
  lines.push(`rgb_brightness ${(profile.masterBrightness / 100).toFixed(2)}`);
  lines.push(`rgb_sync_underglow ${profile.syncUnderglow ? 1 : 0}`);

  for (const zoneId of RGB_ZONE_ORDER) {
    const z = profile.zones[zoneId];
    const [r, g, b] = hexToRgbTuple(z.color);
    const hexUpper = z.color.toUpperCase();
    const hz = z.effect === 'static' ? 0 : z.blinkHz;
    const bright = (z.brightness / 100).toFixed(2);
    lines.push(
      `rgb_zone_color "${zoneId}" "${hexUpper}" ${r} ${g} ${b} // ${RGB_ZONE_META[zoneId].label}`,
    );
    lines.push(
      `rgb_zone_blink "${zoneId}" "${z.effect}" ${hz.toFixed(2)} ${bright} ${z.enabled ? 1 : 0}`,
    );
  }

  return lines.join('\n');
}

/**
 * Generates a standalone exportable `rgb_lighting.cfg` file with header comments.
 */
export function compileStandaloneRgbCfg(profile: RgbLightingProfile): string {
  return [
    '// =================================================================',
    '// File: rgb_lighting.cfg',
    '// Desc: Per-Zone RGB Color & Blink Frequency Profile (KeyForge 3D)',
    '// Usage: exec "rgb_lighting.cfg" inside autoexec.cfg or C++ parser',
    '// =================================================================',
    '',
    compileRgbCfgSection(profile),
    '',
  ].join('\n');
}
