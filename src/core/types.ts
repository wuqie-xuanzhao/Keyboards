export type KeyboardModelId =
  | 'pro75'
  | 'numpad21'
  | 'full104'
  | 'compact60'
  | 'tkl80'
  | 'keypadLeft';

export type MaterialFinishId =
  | 'obsidian'
  | 'titanium'
  | 'retro'
  | 'tactical'
  | 'sakuraDoll'
  | 'sweetMacaron'
  | 'lilacDream'
  | 'pastelRainbow';

export type StudioLightingPreset = 'studio' | 'dramatic' | 'warmdesk' | 'softday';

export type KeycapLegendMode = 'standard' | 'glfw' | 'cfg';

export type CameraPresetId = 'isometric' | 'top' | 'front' | 'side';

export type WorkspaceTab = 'viewport' | 'blueprint' | 'export';

export type CppBackend = 'glfw' | 'sdl2' | 'win32';

export interface KeyDef {
  /** Standard DOM KeyboardEvent.code (e.g. "KeyW", "Space", "ShiftLeft") */
  code: string;
  /** Primary cap legend */
  label: string;
  /** Optional secondary sub-legend */
  subLabel?: string;
  /** Column start in key units (1U = 1.0) */
  x: number;
  /** Row start in key units (top row = 0) */
  y: number;
  /** Width in key units */
  w: number;
  /** Height in key units (usually 1) */
  h?: number;
  /** Sculpted keycap row profile (1=tallest top, 4=bottom) */
  rowProfile: 1 | 2 | 3 | 4;
  /** Visual category for keycap shading */
  category: 'alpha' | 'modifier' | 'accent' | 'function' | 'nav';
}

export interface KeyboardModelSpec {
  id: KeyboardModelId;
  name: string;
  shortName: string;
  formFactor: string;
  description: string;
  keyCount: number;
  tiltDegrees: number;
  hasRotaryKnob?: boolean;
  knobPosition?: { x: number; y: number };
  hasOledBar?: boolean;
  oledPosition?: { x: number; y: number; w: number };
  hasWristRest?: boolean;
  hasBrassWeight?: boolean;
  casePaddingX: number;
  casePaddingY: number;
  keys: KeyDef[];
}

export type BlueprintNodeType =
  | 'key_input'
  | 'modifier_gate'
  | 'alias_macro'
  | 'command'
  | 'delay'
  | 'exec_cfg';

export type TriggerMode = 'press' | 'hold' | 'release' | 'toggle';

export interface BlueprintNode {
  id: string;
  type: BlueprintNodeType;
  x: number;
  y: number;
  title: string;
  data: {
    /** For key_input: DOM code like "KeyW" */
    keyCode?: string;
    /** For key_input: trigger behavior */
    triggerMode?: TriggerMode;
    /** For key_input: expected trigger frequency in presses per minute (次/分钟) */
    triggerFrequency?: number;
    /** For modifier_gate: required modifier or game state condition */
    condition?: string;
    /** For alias_macro: alias identifier (e.g. "+jumpthrow") */
    aliasName?: string;
    /** For command: raw engine command (e.g. "+forward", "slot1") */
    commandText?: string;
    /** For command: optional release command for hold actions */
    releaseCommand?: string;
    /** For delay: wait duration in milliseconds or ticks */
    delayMs?: number;
    /** For exec_cfg: target CfgFile id */
    targetCfgId?: string;
    /** Optional human note */
    note?: string;
  };
}

export interface BlueprintEdge {
  id: string;
  fromNodeId: string;
  fromPort: string;
  toNodeId: string;
  toPort: string;
}

export interface CfgFile {
  id: string;
  filename: string;
  description: string;
  isRoot?: boolean;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export interface CfgIncludeTreeNode {
  fileId: string;
  filename: string;
  depth: number;
  isCycle: boolean;
  cyclePath?: string[];
  children: CfgIncludeTreeNode[];
  bindCount: number;
}

export interface ResolvedBindStep {
  kind: 'command' | 'alias' | 'delay' | 'exec' | 'condition';
  text: string;
  sourceFileId: string;
  sourceFilename: string;
  nodeId: string;
}

export interface ResolvedKeyBind {
  keyCode: string;
  cfgKeyName: string;
  triggerMode: TriggerMode;
  triggerFrequency: number;
  sourceFileId: string;
  sourceFilename: string;
  sourceNodeId: string;
  includeChain: string[];
  summary: string;
  commands: string[];
  steps: ResolvedBindStep[];
  nestedExecFiles: string[];
}

export type FingerZoneId =
  | 'leftPinky'
  | 'leftRing'
  | 'leftMiddle'
  | 'leftIndex'
  | 'thumb'
  | 'rightHand';

export type RgbZoneId =
  | 'wasd'
  | 'alphas'
  | 'modifiers'
  | 'functionRow'
  | 'navigation'
  | 'numpad';

export type RgbEffectMode = 'static' | 'breathe' | 'blink' | 'wave';

export interface RgbZoneConfig {
  id: RgbZoneId;
  enabled: boolean;
  color: string;
  effect: RgbEffectMode;
  /** Blink / breathe / wave frequency in Hz (0.0 - 6.0) */
  blinkHz: number;
  /** Per-zone brightness percentage (0 - 100) */
  brightness: number;
}

export interface RgbLightingProfile {
  enabled: boolean;
  masterBrightness: number;
  syncUnderglow: boolean;
  zones: Record<RgbZoneId, RgbZoneConfig>;
}

export interface ScancodeEntry {
  code: string;
  displayLabel: string;
  cfgName: string;
  glfw: string;
  sdl2: string;
  win32: string;
}
