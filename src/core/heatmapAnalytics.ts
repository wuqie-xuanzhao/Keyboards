import { getScancode } from './scancodes';
import type {
  BlueprintNode,
  CfgFile,
  FingerZoneId,
  KeyboardModelSpec,
  ResolvedKeyBind,
  TriggerMode,
} from './types';

export interface FingerZoneMeta {
  id: FingerZoneId;
  label: string;
  shortLabel: string;
  color: string;
  bgTint: string;
  borderTint: string;
}

export const FINGER_ZONE_ORDER: FingerZoneId[] = [
  'leftPinky',
  'leftRing',
  'leftMiddle',
  'leftIndex',
  'thumb',
  'rightHand',
];

export const FINGER_ZONE_META: Record<FingerZoneId, FingerZoneMeta> = {
  leftPinky: {
    id: 'leftPinky',
    label: '左小指',
    shortLabel: '小指',
    color: '#F472B6',
    bgTint: 'rgba(244, 114, 182, 0.22)',
    borderTint: 'rgba(244, 114, 182, 0.52)',
  },
  leftRing: {
    id: 'leftRing',
    label: '左无名指',
    shortLabel: '无名指',
    color: '#A78BFA',
    bgTint: 'rgba(167, 139, 250, 0.22)',
    borderTint: 'rgba(167, 139, 250, 0.52)',
  },
  leftMiddle: {
    id: 'leftMiddle',
    label: '左中指',
    shortLabel: '中指',
    color: '#38BDF8',
    bgTint: 'rgba(56, 189, 248, 0.22)',
    borderTint: 'rgba(56, 189, 248, 0.52)',
  },
  leftIndex: {
    id: 'leftIndex',
    label: '左食指',
    shortLabel: '食指',
    color: '#34D399',
    bgTint: 'rgba(52, 211, 153, 0.22)',
    borderTint: 'rgba(52, 211, 153, 0.52)',
  },
  thumb: {
    id: 'thumb',
    label: '拇指区',
    shortLabel: '拇指',
    color: '#FBBF24',
    bgTint: 'rgba(251, 191, 36, 0.24)',
    borderTint: 'rgba(251, 191, 36, 0.55)',
  },
  rightHand: {
    id: 'rightHand',
    label: '右手 / 小键盘',
    shortLabel: '右手',
    color: '#94A3B8',
    bgTint: 'rgba(148, 163, 184, 0.2)',
    borderTint: 'rgba(148, 163, 184, 0.45)',
  },
};

const DEFAULT_FREQ_BY_KEY: Record<string, number> = {
  KeyW: 54,
  KeyA: 42,
  KeyD: 40,
  Space: 36,
  KeyQ: 32,
  KeyS: 28,
  ShiftLeft: 26,
  ControlLeft: 24,
  Digit1: 20,
  KeyR: 18,
  KeyE: 16,
  Digit2: 14,
  KeyV: 12,
  KeyC: 10,
  Tab: 9,
  KeyX: 8,
  KeyF: 7,
  Numpad1: 6,
  Numpad4: 5,
  Numpad0: 5,
  KeyG: 5,
  Numpad2: 4,
  Numpad3: 4,
  KeyB: 4,
  NumpadEnter: 4,
  KeyM: 3,
  Escape: 2,
  F1: 2,
};

/**
 * Resolves a node's effective trigger frequency (presses per minute).
 * Backward compatible with legacy saved projects that do not yet store `triggerFrequency`.
 */
export function getEffectiveTriggerFrequency(node: BlueprintNode): number {
  const raw = node.data.triggerFrequency;
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw);
  }
  const code = node.data.keyCode;
  if (code && code in DEFAULT_FREQ_BY_KEY) {
    return DEFAULT_FREQ_BY_KEY[code];
  }
  if (node.data.triggerMode === 'hold') return 24;
  if (node.data.triggerMode === 'toggle') return 5;
  return 10;
}

const LEFT_PINKY_KEYS = new Set([
  'Escape',
  'Backquote',
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ControlLeft',
  'MetaLeft',
  'KeyZ',
  'F1',
  'Digit1',
  'KeyQ',
]);

const LEFT_RING_KEYS = new Set(['F2', 'Digit2', 'KeyA', 'KeyX']);
const LEFT_MIDDLE_KEYS = new Set(['F3', 'Digit3', 'KeyW', 'KeyS', 'KeyC']);
const LEFT_INDEX_KEYS = new Set([
  'F4',
  'F5',
  'Digit4',
  'Digit5',
  'Digit6',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyV',
  'KeyB',
]);
const THUMB_KEYS = new Set(['Space', 'AltLeft', 'AltRight']);

export function getFingerZone(keyCode: string): FingerZoneId {
  if (THUMB_KEYS.has(keyCode)) return 'thumb';
  if (LEFT_MIDDLE_KEYS.has(keyCode)) return 'leftMiddle';
  if (LEFT_INDEX_KEYS.has(keyCode)) return 'leftIndex';
  if (LEFT_RING_KEYS.has(keyCode)) return 'leftRing';
  if (LEFT_PINKY_KEYS.has(keyCode)) return 'leftPinky';
  return 'rightHand';
}

const FAR_REACH_KEYS = new Set([
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
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'Minus',
  'Equal',
  'KeyY',
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyN',
  'KeyM',
  'Insert',
  'Home',
  'PageUp',
  'Delete',
  'End',
  'PageDown',
]);

export function isFarReachKey(keyCode: string): boolean {
  return FAR_REACH_KEYS.has(keyCode);
}

export interface HeatmapNodeRef {
  fileId: string;
  filename: string;
  nodeId: string;
  title: string;
  frequency: number;
  triggerMode: TriggerMode;
}

export interface HeatmapKeyStat {
  keyCode: string;
  displayLabel: string;
  frequency: number;
  normalized: number;
  fingerZone: FingerZoneId;
  commandSummary: string;
  nodeRefs: HeatmapNodeRef[];
  primaryFileId: string;
  primaryFilename: string;
  primaryNodeId: string;
}

export interface FingerLoadStat {
  zone: FingerZoneId;
  label: string;
  frequency: number;
  sharePct: number;
  keyCount: number;
  topKeyLabel?: string;
}

export interface ErgonomicHint {
  id: string;
  severity: 'warn' | 'info' | 'good';
  title: string;
  detail: string;
  relatedKeyCode?: string;
}

export interface HeatmapAnalyticsResult {
  statsByKey: Record<string, HeatmapKeyStat>;
  rankedKeys: HeatmapKeyStat[];
  maxFrequency: number;
  totalFrequency: number;
  activeKeyCount: number;
  leftHandPct: number;
  rightHandPct: number;
  fingerLoads: FingerLoadStat[];
  hints: ErgonomicHint[];
  hiddenOnLayoutKeys: HeatmapKeyStat[];
}

/**
 * Aggregates trigger frequency across all blueprint `key_input` nodes (global or single-file)
 * and computes ergonomic finger loads + actionable layout optimization hints.
 */
export function computeHeatmapAnalytics(
  cfgFiles: CfgFile[],
  scope: 'global' | string,
  bindsByKey: Record<string, ResolvedKeyBind>,
  layoutSpec?: KeyboardModelSpec,
): HeatmapAnalyticsResult {
  const targetFiles =
    scope === 'global' ? cfgFiles : cfgFiles.filter((f) => f.id === scope);

  const rawByKey = new Map<string, HeatmapNodeRef[]>();

  for (const file of targetFiles) {
    for (const node of file.nodes) {
      if (node.type !== 'key_input' || !node.data.keyCode) continue;
      const code = node.data.keyCode;
      const freq = getEffectiveTriggerFrequency(node);
      const list = rawByKey.get(code) ?? [];
      list.push({
        fileId: file.id,
        filename: file.filename,
        nodeId: node.id,
        title: node.title,
        frequency: freq,
        triggerMode: node.data.triggerMode ?? 'press',
      });
      rawByKey.set(code, list);
    }
  }

  let maxFrequency = 0;
  let totalFrequency = 0;
  const statsByKey: Record<string, HeatmapKeyStat> = {};

  for (const [keyCode, refs] of rawByKey.entries()) {
    const resolved = bindsByKey[keyCode];
    // If multiple nodes target the same key, aggregate total presses/min while pointing primary ref to the active/highest node
    const frequency = refs.reduce((acc, r) => acc + r.frequency, 0);
    const primaryRef =
      (resolved
        ? refs.find(
            (r) =>
              r.fileId === resolved.sourceFileId && r.nodeId === resolved.sourceNodeId,
          )
        : undefined) ??
      [...refs].sort((a, b) => b.frequency - a.frequency)[0];

    if (frequency > maxFrequency) maxFrequency = frequency;
    totalFrequency += frequency;

    const sc = getScancode(keyCode);
    statsByKey[keyCode] = {
      keyCode,
      displayLabel: sc.displayLabel,
      frequency,
      normalized: 0,
      fingerZone: getFingerZone(keyCode),
      commandSummary: resolved?.summary ?? primaryRef.title,
      nodeRefs: refs,
      primaryFileId: primaryRef.fileId,
      primaryFilename: primaryRef.filename,
      primaryNodeId: primaryRef.nodeId,
    };
  }

  const denom = Math.max(1, maxFrequency);
  const rankedKeys = Object.values(statsByKey)
    .map((item) => {
      item.normalized = item.frequency > 0 ? Math.min(1, item.frequency / denom) : 0;
      return item;
    })
    .sort((a, b) => b.frequency - a.frequency || a.keyCode.localeCompare(b.keyCode));

  // Finger load breakdown
  const fingerMap = new Map<
    FingerZoneId,
    { frequency: number; keyCount: number; topKey?: HeatmapKeyStat }
  >();
  for (const zone of FINGER_ZONE_ORDER) {
    fingerMap.set(zone, { frequency: 0, keyCount: 0 });
  }

  let leftTotal = 0;
  let rightTotal = 0;

  for (const stat of rankedKeys) {
    const bucket = fingerMap.get(stat.fingerZone)!;
    bucket.frequency += stat.frequency;
    bucket.keyCount += 1;
    if (!bucket.topKey || stat.frequency > bucket.topKey.frequency) {
      bucket.topKey = stat;
    }
    if (stat.fingerZone === 'rightHand') rightTotal += stat.frequency;
    else leftTotal += stat.frequency;
  }

  const safeTotal = Math.max(1, totalFrequency);
  const leftHandPct = totalFrequency > 0 ? Math.round((leftTotal / safeTotal) * 100) : 0;
  const rightHandPct = totalFrequency > 0 ? 100 - leftHandPct : 0;

  const fingerLoads: FingerLoadStat[] = FINGER_ZONE_ORDER.map((zone) => {
    const b = fingerMap.get(zone)!;
    return {
      zone,
      label: FINGER_ZONE_META[zone].label,
      frequency: b.frequency,
      sharePct: totalFrequency > 0 ? Math.round((b.frequency / safeTotal) * 100) : 0,
      keyCount: b.keyCount,
      topKeyLabel: b.topKey?.displayLabel,
    };
  });

  // Detect keys defined in blueprints that don't exist on the currently selected physical layout
  const layoutKeySet = layoutSpec ? new Set(layoutSpec.keys.map((k) => k.code)) : null;
  const hiddenOnLayoutKeys = layoutKeySet
    ? rankedKeys.filter((k) => !layoutKeySet.has(k.keyCode))
    : [];

  // Data-driven ergonomic hints (strictly derived from real node frequencies)
  const hints: ErgonomicHint[] = [];
  const pinkyLoad = fingerLoads.find((f) => f.zone === 'leftPinky');
  if (pinkyLoad && pinkyLoad.sharePct >= 24 && pinkyLoad.frequency >= 40) {
    hints.push({
      id: 'pinky_overload',
      severity: 'warn',
      title: `左小指负荷偏高（${pinkyLoad.sharePct}% · ${pinkyLoad.frequency} 次/分）`,
      detail: '建议将部分高频修饰动作（如 Shift / Ctrl / Q）分流至拇指 Alt 或鼠标侧键，降低长期操作疲劳。',
      relatedKeyCode: 'ShiftLeft',
    });
  }

  const farHighKey = rankedKeys.find(
    (k) => isFarReachKey(k.keyCode) && k.frequency >= 15,
  );
  if (farHighKey) {
    hints.push({
      id: `far_reach_${farHighKey.keyCode}`,
      severity: 'warn',
      title: `高频键「${farHighKey.displayLabel}」位于远伸区（${farHighKey.frequency} 次/分）`,
      detail: '该键离 WASD 主手区较远，高频触发易导致手掌移位；建议迁移至 E / F / C / V 等食指易达区。',
      relatedKeyCode: farHighKey.keyCode,
    });
  }

  if (hiddenOnLayoutKeys.length > 0 && layoutSpec) {
    const hiddenSample = hiddenOnLayoutKeys
      .slice(0, 3)
      .map((k) => k.displayLabel)
      .join('、');
    hints.push({
      id: 'layout_missing_keys',
      severity: 'info',
      title: `当前 ${layoutSpec.shortName} 未包含 ${hiddenOnLayoutKeys.length} 个已绑定热键`,
      detail: `例如 ${hiddenSample} 在当前精简配列上缺失，可切换 100% 全尺寸或重新映射键位。`,
      relatedKeyCode: hiddenOnLayoutKeys[0].keyCode,
    });
  }

  if (hints.length === 0 && rankedKeys.length > 0) {
    const top = rankedKeys[0];
    hints.push({
      id: 'balanced_layout',
      severity: 'good',
      title: '核心热区集中在 WASD 黄金三角区',
      detail: `最高频按键「${top.displayLabel}」（${top.frequency} 次/分）与各手指分工均衡，整体操控动线合理。`,
      relatedKeyCode: top.keyCode,
    });
  }

  return {
    statsByKey,
    rankedKeys,
    maxFrequency,
    totalFrequency,
    activeKeyCount: rankedKeys.length,
    leftHandPct,
    rightHandPct,
    fingerLoads,
    hints,
    hiddenOnLayoutKeys,
  };
}

export interface ThermalKeyStyle {
  bg: string;
  border: string;
  text: string;
  subText: string;
  glow: string;
  tierLabel: string;
}

/**
 * Maps a normalized frequency [0..1] to an industrial thermal gradient with WCAG AA text contrast.
 */
export function getThermalKeyStyle(normalized: number, frequency: number): ThermalKeyStyle {
  if (frequency <= 0 || normalized <= 0) {
    return {
      bg: '#1A1F28',
      border: '#2B3240',
      text: '#7C8798',
      subText: '#556072',
      glow: 'none',
      tierLabel: '未绑定',
    };
  }
  if (normalized < 0.2) {
    return {
      bg: '#173242',
      border: '#25607D',
      text: '#CFEAF7',
      subText: '#8CCBE8',
      glow: 'inset 0 0 12px rgba(56, 189, 248, 0.14)',
      tierLabel: '低频',
    };
  }
  if (normalized < 0.45) {
    return {
      bg: '#194644',
      border: '#2E8A7E',
      text: '#D4F7F0',
      subText: '#7EE4D3',
      glow: 'inset 0 0 14px rgba(45, 212, 191, 0.18)',
      tierLabel: '常规',
    };
  }
  if (normalized < 0.7) {
    return {
      bg: '#7A4C14',
      border: '#D98E26',
      text: '#FFF5E0',
      subText: '#FCD58B',
      glow: '0 0 12px rgba(245, 158, 11, 0.22)',
      tierLabel: '中高频',
    };
  }
  if (normalized < 0.88) {
    return {
      bg: '#B54718',
      border: '#F57C36',
      text: '#FFF8F3',
      subText: '#FFD2B5',
      glow: '0 0 16px rgba(249, 115, 22, 0.34)',
      tierLabel: '高频',
    };
  }
  return {
    bg: '#C82838',
    border: '#FF6B7B',
    text: '#FFFFFF',
    subText: '#FFD1D7',
    glow: '0 0 18px rgba(239, 68, 68, 0.45)',
    tierLabel: '极高频',
  };
}
