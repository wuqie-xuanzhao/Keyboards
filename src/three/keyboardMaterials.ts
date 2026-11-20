import * as THREE from 'three';
import { computeLayoutBounds } from '../core/keyboardLayouts';
import { resolveKeycapLegend } from '../core/scancodes';
import type {
  KeyboardModelId,
  KeyboardModelSpec,
  KeycapLegendMode,
  KeyDef,
  MaterialFinishId,
} from '../core/types';

export interface FinishPalette {
  id: MaterialFinishId;
  name: string;
  swatchHex: string;
  swatchGradient?: string;
  rainbowMode?: 'pastel';
  caseColor: number;
  caseMetalness: number;
  caseRoughness: number;
  caseClearcoat: number;
  plateColor: number;
  plateMetalness: number;
  plateRoughness: number;
  alphaCapHex: string;
  alphaLegendHex: string;
  modCapHex: string;
  modLegendHex: string;
  accentCapHex: string;
  accentLegendHex: string;
  boundBarHex: string;
  switchStemColor: number;
  pcbColor: number;
  brassColor: number;
  underglowHex: number;
}

export const FINISH_PALETTES: Record<MaterialFinishId, FinishPalette> = {
  obsidian: {
    id: 'obsidian',
    name: '阳极曜石黑',
    swatchHex: '#1A1E26',
    caseColor: 0x1a1e26,
    caseMetalness: 0.86,
    caseRoughness: 0.24,
    caseClearcoat: 0.15,
    plateColor: 0xb99345,
    plateMetalness: 0.9,
    plateRoughness: 0.24,
    alphaCapHex: '#252A34',
    alphaLegendHex: '#DFE4EC',
    modCapHex: '#1B1F28',
    modLegendHex: '#A6B1C2',
    accentCapHex: '#C2741A',
    accentLegendHex: '#FFF6EB',
    boundBarHex: '#E59524',
    switchStemColor: 0xd95632,
    pcbColor: 0x13201a,
    brassColor: 0xc9a04c,
    underglowHex: 0xffa63b,
  },
  titanium: {
    id: 'titanium',
    name: 'CNC 钛空银',
    swatchHex: '#A8B1BE',
    caseColor: 0xaab3c0,
    caseMetalness: 0.9,
    caseRoughness: 0.2,
    caseClearcoat: 0.22,
    plateColor: 0x2b323f,
    plateMetalness: 0.8,
    plateRoughness: 0.28,
    alphaCapHex: '#D5DAE2',
    alphaLegendHex: '#1E242E',
    modCapHex: '#3A4252',
    modLegendHex: '#DCE2EC',
    accentCapHex: '#2D66A8',
    accentLegendHex: '#F0F6FC',
    boundBarHex: '#3B82F6',
    switchStemColor: 0x3b82f6,
    pcbColor: 0x142130,
    brassColor: 0xc4a45e,
    underglowHex: 0x7ab8ff,
  },
  retro: {
    id: 'retro',
    name: '复古工业米灰',
    swatchHex: '#C9C1B2',
    caseColor: 0xc8bfb0,
    caseMetalness: 0.14,
    caseRoughness: 0.54,
    caseClearcoat: 0.08,
    plateColor: 0x6f685d,
    plateMetalness: 0.7,
    plateRoughness: 0.34,
    alphaCapHex: '#DCD5C7',
    alphaLegendHex: '#262421',
    modCapHex: '#A69E8E',
    modLegendHex: '#24211E',
    accentCapHex: '#A63D29',
    accentLegendHex: '#F7F3EA',
    boundBarHex: '#C25624',
    switchStemColor: 0xa63d29,
    pcbColor: 0x1a3526,
    brassColor: 0xb6934e,
    underglowHex: 0xffbe73,
  },
  tactical: {
    id: 'tactical',
    name: '军工橄榄灰',
    swatchHex: '#3C463E',
    caseColor: 0x343e36,
    caseMetalness: 0.72,
    caseRoughness: 0.32,
    caseClearcoat: 0.12,
    plateColor: 0x1f2421,
    plateMetalness: 0.78,
    plateRoughness: 0.3,
    alphaCapHex: '#2E342F',
    alphaLegendHex: '#D2DBD0',
    modCapHex: '#232824',
    modLegendHex: '#9BA999',
    accentCapHex: '#C9821E',
    accentLegendHex: '#151814',
    boundBarHex: '#E59524',
    switchStemColor: 0xc9821e,
    pcbColor: 0x19221b,
    brassColor: 0xbf9744,
    underglowHex: 0xf2a538,
  },
  sakuraDoll: {
    id: 'sakuraDoll',
    name: '樱花洋娃娃粉',
    swatchHex: '#EBAFC2',
    swatchGradient: 'linear-gradient(135deg, #F6CDD9 0%, #E087A8 100%)',
    caseColor: 0xe6afc1,
    caseMetalness: 0.24,
    caseRoughness: 0.26,
    caseClearcoat: 0.56,
    plateColor: 0xdda7a0,
    plateMetalness: 0.84,
    plateRoughness: 0.24,
    alphaCapHex: '#F4E8EC',
    alphaLegendHex: '#6E324B',
    modCapHex: '#E5A8BE',
    modLegendHex: '#592038',
    accentCapHex: '#D96F96',
    accentLegendHex: '#FFF6FA',
    boundBarHex: '#D94B82',
    switchStemColor: 0xee8bb0,
    pcbColor: 0x2c1b26,
    brassColor: 0xe4b09d,
    underglowHex: 0xff85b8,
  },
  sweetMacaron: {
    id: 'sweetMacaron',
    name: '奶油洋娃娃',
    swatchHex: '#EED8D2',
    swatchGradient: 'linear-gradient(135deg, #F8EFEA 0%, #E6A9B8 55%, #D98E9A 100%)',
    caseColor: 0xe8ded7,
    caseMetalness: 0.16,
    caseRoughness: 0.3,
    caseClearcoat: 0.5,
    plateColor: 0xdcb4a2,
    plateMetalness: 0.82,
    plateRoughness: 0.26,
    alphaCapHex: '#F3EAE4',
    alphaLegendHex: '#5D3C4A',
    modCapHex: '#DCB7CC',
    modLegendHex: '#4E2D45',
    accentCapHex: '#DF8B97',
    accentLegendHex: '#FFF8F7',
    boundBarHex: '#D85E7A',
    switchStemColor: 0xe895a0,
    pcbColor: 0x291e24,
    brassColor: 0xe2b79c,
    underglowHex: 0xffa6b8,
  },
  lilacDream: {
    id: 'lilacDream',
    name: '薰衣草星梦',
    swatchHex: '#C2B1DF',
    swatchGradient: 'linear-gradient(135deg, #DDD2F2 0%, #A993D8 100%)',
    caseColor: 0xbdaed9,
    caseMetalness: 0.42,
    caseRoughness: 0.28,
    caseClearcoat: 0.45,
    plateColor: 0xc8bfd8,
    plateMetalness: 0.84,
    plateRoughness: 0.24,
    alphaCapHex: '#EBE6F5',
    alphaLegendHex: '#463466',
    modCapHex: '#BFB0DD',
    modLegendHex: '#352454',
    accentCapHex: '#D67EB5',
    accentLegendHex: '#FFF6FC',
    boundBarHex: '#9A63DB',
    switchStemColor: 0xb788eb,
    pcbColor: 0x1e1930,
    brassColor: 0xddd1e6,
    underglowHex: 0xc299ff,
  },
  pastelRainbow: {
    id: 'pastelRainbow',
    name: '马卡龙彩虹',
    swatchHex: '#F0A8C8',
    swatchGradient:
      'linear-gradient(135deg, #F29EBD 0%, #F5BF98 22%, #EFE299 44%, #9CE0C2 66%, #95C8F5 84%, #C8A6F2 100%)',
    rainbowMode: 'pastel',
    caseColor: 0xe4e6ec,
    caseMetalness: 0.22,
    caseRoughness: 0.24,
    caseClearcoat: 0.62,
    plateColor: 0xd9dce6,
    plateMetalness: 0.78,
    plateRoughness: 0.22,
    alphaCapHex: '#EFE8F0',
    alphaLegendHex: '#312942',
    modCapHex: '#E0D6EB',
    modLegendHex: '#2C223D',
    accentCapHex: '#E37BA8',
    accentLegendHex: '#FFF8FB',
    boundBarHex: '#D9468F',
    switchStemColor: 0xee85c4,
    pcbColor: 0x201d2e,
    brassColor: 0xe2d4cc,
    underglowHex: 0xffa6e8,
  },
};

export const FINISH_LIST: FinishPalette[] = [
  FINISH_PALETTES.obsidian,
  FINISH_PALETTES.titanium,
  FINISH_PALETTES.retro,
  FINISH_PALETTES.tactical,
  FINISH_PALETTES.sakuraDoll,
  FINISH_PALETTES.sweetMacaron,
  FINISH_PALETTES.lilacDream,
  FINISH_PALETTES.pastelRainbow,
];

const PASTEL_RAINBOW_STOPS = [
  new THREE.Color('#EEA2BD'), // Blush Sakura Pink
  new THREE.Color('#F2B996'), // Sweet Apricot Peach
  new THREE.Color('#ECE09B'), // Buttercream Lemon
  new THREE.Color('#A0DEC2'), // Mint Matcha
  new THREE.Color('#99C8F2'), // Baby Sky Blue
  new THREE.Color('#C5A8F0'), // Wisteria Lilac
];

const _tmpRainbowCol = new THREE.Color();

export function samplePastelRainbowColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (PASTEL_RAINBOW_STOPS.length - 1);
  const idx = Math.min(PASTEL_RAINBOW_STOPS.length - 2, Math.floor(scaled));
  const frac = scaled - idx;
  return _tmpRainbowCol.copy(PASTEL_RAINBOW_STOPS[idx]).lerp(PASTEL_RAINBOW_STOPS[idx + 1], frac).clone();
}

export function resolveKeycapColors(
  key: KeyDef,
  palette: FinishPalette,
  layoutNormX = 0.5,
): { capHex: string; legendHex: string; boundBarHex: string } {
  if (palette.rainbowMode === 'pastel') {
    const c = samplePastelRainbowColor(layoutNormX);
    if (key.category === 'accent') {
      // Richer candy-berry accent on Esc / Enter / Arrows while matching the rainbow side
      const accentCol = layoutNormX < 0.5 ? new THREE.Color('#E0729D') : new THREE.Color('#9A7BE0');
      return {
        capHex: `#${accentCol.getHexString()}`,
        legendHex: '#FFF8FC',
        boundBarHex: '#FFF2F8',
      };
    }
    if (key.category === 'modifier' || key.category === 'function' || key.category === 'nav') {
      c.multiplyScalar(0.91);
    } else {
      // Slightly creamier/airier alpha center for high contrast dark plum legends
      c.lerp(new THREE.Color('#F8F4F8'), 0.24);
    }
    return {
      capHex: `#${c.getHexString()}`,
      legendHex: '#312642',
      boundBarHex: '#C93884',
    };
  }

  const capHex =
    key.category === 'accent'
      ? palette.accentCapHex
      : key.category === 'modifier' || key.category === 'function' || key.category === 'nav'
        ? palette.modCapHex
        : palette.alphaCapHex;

  const legendHex =
    key.category === 'accent'
      ? palette.accentLegendHex
      : key.category === 'modifier' || key.category === 'function' || key.category === 'nav'
        ? palette.modLegendHex
        : palette.alphaLegendHex;

  return { capHex, legendHex, boundBarHex: palette.boundBarHex };
}

let cachedBrushedBump: THREE.CanvasTexture | null = null;
let cachedPbtGrainBump: THREE.CanvasTexture | null = null;
let cachedPcbTexture: THREE.CanvasTexture | null = null;
let cachedRainbowDiffuser: THREE.CanvasTexture | null = null;
let cachedRgbLedHalo: THREE.CanvasTexture | null = null;

/**
 * Generates a soft diffused rounded-square LED glow halo texture for per-key RGB simulation.
 * Bright ring around the switch perimeter bleeds cleanly through keycap gaps under AdditiveBlending.
 */
export function getRgbLedHaloTexture(): THREE.CanvasTexture {
  if (cachedRgbLedHalo) return cachedRgbLedHalo;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  // Soft outer perimeter bleed so light visibly wraps around the base of each keycap skirt
  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.14,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.56, 'rgba(255, 255, 255, 0.88)');
  grad.addColorStop(0.82, 'rgba(255, 255, 255, 0.42)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedRgbLedHalo = tex;
  return tex;
}

export function getRainbowDiffuserTexture(): THREE.CanvasTexture {
  if (cachedRainbowDiffuser) return cachedRainbowDiffuser;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0.0, '#FF8FB8');
  grad.addColorStop(0.2, '#FFB585');
  grad.addColorStop(0.4, '#F5E482');
  grad.addColorStop(0.6, '#7EE3BC');
  grad.addColorStop(0.8, '#82C3FF');
  grad.addColorStop(1.0, '#C596FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedRainbowDiffuser = tex;
  return tex;
}

/**
 * Generates a tileable grayscale brushed-aluminum micro-grain bump texture.
 */
export function getBrushedMetalBumpTexture(): THREE.CanvasTexture {
  if (cachedBrushedBump) return cachedBrushedBump;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const streak = 120 + Math.floor(Math.sin(y * 1.9) * 7 + (Math.random() - 0.5) * 16);
    ctx.fillStyle = `rgb(${streak},${streak},${streak})`;
    ctx.fillRect(0, y, 256, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  cachedBrushedBump = tex;
  return tex;
}

/**
 * Generates a fine matte PBT frosted micro-grain texture for tactile keycap realism.
 */
export function getPbtGrainBumpTexture(): THREE.CanvasTexture {
  if (cachedPbtGrainBump) return cachedPbtGrainBump;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 114 + Math.floor(Math.random() * 28);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  cachedPbtGrainBump = tex;
  return tex;
}

/**
 * Generates a procedural matte PCB texture with fine gold copper traces and hot-swap pads.
 */
export function getPcbAlbedoTexture(baseColorHex = '#14211b'): THREE.CanvasTexture {
  if (cachedPcbTexture) return cachedPcbTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = baseColorHex;
  ctx.fillRect(0, 0, 512, 256);

  ctx.strokeStyle = 'rgba(186, 158, 92, 0.30)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 28; i++) {
    const y = 12 + i * 8.5;
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.lineTo(140 + (i % 5) * 28, y);
    ctx.lineTo(160 + (i % 5) * 28, y + (i % 2 === 0 ? 12 : -12));
    ctx.lineTo(504, y + (i % 2 === 0 ? 12 : -12));
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(220, 180, 88, 0.56)';
  for (let gx = 24; gx < 490; gx += 30) {
    for (let gy = 26; gy < 236; gy += 40) {
      ctx.beginPath();
      ctx.arc(gx - 5, gy, 3.2, 0, Math.PI * 2);
      ctx.arc(gx + 5, gy + 4, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  cachedPcbTexture = tex;
  return tex;
}

/**
 * Bakes per-key ambient occlusion shadows and subtle optional backlight glow halos
 * directly onto the switch mounting plate texture — creating genuine deep shadow cavities
 * between every single keycap just like commercial studio photography.
 */
export function createPlateAoTexture(
  spec: KeyboardModelSpec,
  palette: FinishPalette,
  backlightEnabled: boolean,
): THREE.CanvasTexture {
  const bounds = computeLayoutBounds(spec);
  const wPx = 512;
  const hPx = Math.max(192, Math.round((bounds.depthU / Math.max(1, bounds.widthU)) * wPx));

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;
  const ctx = canvas.getContext('2d')!;

  // Base metallic plate color
  const baseCol = new THREE.Color(palette.plateColor);
  ctx.fillStyle = `#${baseCol.getHexString()}`;
  ctx.fillRect(0, 0, wPx, hPx);

  // Subtle brushed horizontal sheen across plate
  for (let y = 0; y < hPx; y += 2) {
    ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, y, wPx, 1);
  }

  // Soft recessed perimeter shadow from CNC bezel walls
  const edgeShadow = ctx.createLinearGradient(0, 0, 0, 26);
  edgeShadow.addColorStop(0, 'rgba(0,0,0,0.62)');
  edgeShadow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = edgeShadow;
  ctx.fillRect(0, 0, wPx, 26);

  const scaleX = wPx / bounds.widthU;
  const scaleY = hPx / bounds.depthU;
  const glowColor = new THREE.Color(palette.underglowHex);
  const glowR = Math.round(glowColor.r * 255);
  const glowG = Math.round(glowColor.g * 255);
  const glowB = Math.round(glowColor.b * 255);

  for (const key of spec.keys) {
    const kh = key.h ?? 1;
    const kx = (key.x - bounds.minX) * scaleX;
    const ky = (key.y - bounds.minY) * scaleY;
    const kw = key.w * scaleX;
    const khPx = kh * scaleY;
    const cx = kx + kw / 2;
    const cy = ky + khPx / 2;

    // Optional refined diffused switch-well backlight spill around keycap perimeter
    if (backlightEnabled) {
      let r = glowR;
      let g = glowG;
      let b = glowB;
      if (palette.rainbowMode === 'pastel') {
        const normX = Math.max(
          0,
          Math.min(1, (key.x + key.w / 2 - bounds.minX) / Math.max(1, bounds.widthU)),
        );
        const rc = samplePastelRainbowColor(normX);
        r = Math.round(rc.r * 255);
        g = Math.round(rc.g * 255);
        b = Math.round(rc.b * 255);
      }
      const glow = ctx.createRadialGradient(
        cx,
        cy,
        Math.min(kw, khPx) * 0.24,
        cx,
        cy,
        Math.max(kw, khPx) * 0.68,
      );
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.62)`);
      glow.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.22)`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(kx - 10, ky - 10, kw + 20, khPx + 20);
    }

    // Deep realistic keycap-skirt contact AO shadow on the switch plate
    const ao = ctx.createRadialGradient(
      cx,
      cy,
      Math.min(kw, khPx) * 0.12,
      cx,
      cy,
      Math.max(kw, khPx) * 0.56,
    );
    ao.addColorStop(0, 'rgba(0, 0, 0, 0.82)');
    ao.addColorStop(0.72, 'rgba(0, 0, 0, 0.52)');
    ao.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = ao;
    ctx.fillRect(kx - 4, ky - 4, kw + 8, khPx + 8);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function drawVectorArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  dir: 'up' | 'down' | 'left' | 'right',
  color: string,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  const angle =
    dir === 'up' ? 0 : dir === 'right' ? Math.PI / 2 : dir === 'down' ? Math.PI : -Math.PI / 2;
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2.5, size * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const half = size * 0.42;
  const head = size * 0.28;
  ctx.beginPath();
  ctx.moveTo(0, half);
  ctx.lineTo(0, -half);
  ctx.moveTo(-head, -half + head);
  ctx.lineTo(0, -half);
  ctx.lineTo(head, -half + head);
  ctx.stroke();
  ctx.restore();
}

export interface DynamicKeycapPaintOptions {
  layoutId?: KeyboardModelId;
  legendMode?: KeycapLegendMode;
  layoutNormX?: number;
  isBound: boolean;
  bindHint?: string;
  isSelected: boolean;
  maxAnisotropy: number;
}

/**
 * Dynamically paints crisp, scancode-driven keycap typography directly onto a keycap's
 * offscreen Canvas2D surface and flags its Three.js CanvasTexture for immediate GPU upload.
 * Automatically measures text width via Canvas2D metrics so no legend ever clips or garbles.
 */
export function paintDynamicKeycapTexture(
  canvas: HTMLCanvasElement,
  texture: THREE.CanvasTexture,
  key: KeyDef,
  palette: FinishPalette,
  options: DynamicKeycapPaintOptions,
): void {
  const kh = key.h ?? 1;
  const width = canvas.width;
  const height = canvas.height;
  const unitPx = height / kh;
  const ctx = canvas.getContext('2d')!;

  const legend = resolveKeycapLegend(key.code, {
    keyWidthU: key.w,
    keyHeightU: kh,
    layoutId: options.layoutId,
    legendMode: options.legendMode ?? 'standard',
  });

  const { capHex: bgHex, legendHex: fgHex, boundBarHex } = resolveKeycapColors(
    key,
    palette,
    options.layoutNormX ?? 0.5,
  );

  // Base double-shot PBT tone
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  // Subtle cylindrical dish shading (darker concave valley center, soft rim highlight)
  const dishGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.54,
    Math.min(width, height) * 0.05,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.74,
  );
  dishGrad.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
  dishGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.02)');
  dishGrad.addColorStop(1, 'rgba(255, 255, 255, 0.09)');
  ctx.fillStyle = dishGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle sculpted top-edge catchlight
  const topLip = ctx.createLinearGradient(0, 0, 0, height);
  topLip.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  topLip.addColorStop(0.14, 'rgba(255, 255, 255, 0.0)');
  topLip.addColorStop(0.88, 'rgba(0, 0, 0, 0.0)');
  topLip.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
  ctx.fillStyle = topLip;
  ctx.fillRect(0, 0, width, height);

  const pad = Math.round(unitPx * 0.16);
  const barThickness = Math.max(4, Math.round(unitPx * 0.036));

  // Selected rim highlight or subtle bound LED indicator bar
  if (options.isSelected) {
    const borderInset = Math.round(unitPx * 0.085);
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = Math.max(6, Math.round(unitPx * 0.048));
    ctx.strokeRect(
      borderInset,
      borderInset,
      width - borderInset * 2,
      height - borderInset * 2,
    );
  } else if (options.isBound) {
    ctx.fillStyle = boundBarHex;
    ctx.fillRect(pad, height - Math.round(unitPx * 0.13), width - pad * 2, barThickness);
  }

  // Primary dynamic legend (resolved directly from scancodes.ts + auto-fitted via measureText!)
  const maxTextW = Math.max(24, width - pad * 2 - (legend.secondary || legend.secondaryArrowDir ? unitPx * 0.24 : 0));
  const isMonoMode = options.legendMode === 'glfw' || options.legendMode === 'cfg';
  const fontFamily = isMonoMode
    ? '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
    : '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  if (legend.isSpaceBar && !isMonoMode) {
    ctx.fillStyle = options.isBound ? boundBarHex : fgHex;
    ctx.globalAlpha = options.isBound ? 0.92 : 0.28;
    ctx.fillRect(width * 0.38, height * 0.47, width * 0.24, barThickness);
    ctx.globalAlpha = 1;
  } else if (legend.arrowDir && !isMonoMode) {
    // Crisp vector arrow icon (zero OS font glyph mismatches)
    drawVectorArrow(ctx, width * 0.5, height * 0.46, unitPx * 0.34, legend.arrowDir, fgHex);
  } else {
    const labelText = legend.primary;
    const len = labelText.length;
    let fontSize = Math.round(
      unitPx *
        (isMonoMode
          ? len >= 8
            ? 0.125
            : len >= 5
              ? 0.155
              : 0.21
          : len >= 6
            ? 0.185
            : len >= 3
              ? 0.22
              : len === 2
                ? 0.275
                : 0.315),
    );
    ctx.font = `700 ${fontSize}px ${fontFamily}`;
    const measured = ctx.measureText(labelText).width;
    if (measured > maxTextW && measured > 0) {
      fontSize = Math.max(14, Math.floor(fontSize * (maxTextW / measured)));
      ctx.font = `700 ${fontSize}px ${fontFamily}`;
    }

    ctx.fillStyle = fgHex;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(labelText, pad, pad);
  }

  // Secondary sub-legend (shift symbol or numpad nav label/vector arrow from scancodes.ts)
  if (legend.secondaryArrowDir) {
    ctx.save();
    ctx.globalAlpha = 0.56;
    drawVectorArrow(
      ctx,
      width - pad - unitPx * 0.08,
      pad + unitPx * 0.09,
      unitPx * 0.18,
      legend.secondaryArrowDir,
      fgHex,
    );
    ctx.restore();
  } else if (legend.secondary) {
    ctx.fillStyle = fgHex;
    ctx.globalAlpha = 0.56;
    const subSize = Math.round(unitPx * 0.125);
    ctx.font = `600 ${subSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(legend.secondary, width - pad, pad);
    ctx.globalAlpha = 1;
  }

  // Bound command micro-tag along bottom
  if (options.isBound && options.bindHint) {
    const cleanHint = options.bindHint.replace(/^\+/, '').slice(0, key.w >= 1.5 ? 14 : 9);
    const hintMaxW = Math.max(24, width - pad * 2);
    let hintSize = Math.round(unitPx * 0.115);
    ctx.font = `600 ${hintSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
    const hintMeasured = ctx.measureText(cleanHint).width;
    if (hintMeasured > hintMaxW && hintMeasured > 0) {
      hintSize = Math.max(11, Math.floor(hintSize * (hintMaxW / hintMeasured)));
      ctx.font = `600 ${hintSize}px "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`;
    }
    ctx.fillStyle = boundBarHex;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(cleanHint, pad, height - Math.round(unitPx * 0.18));
  }

  texture.anisotropy = Math.max(1, options.maxAnisotropy);
  texture.needsUpdate = true;
}

/**
 * Allocates a persistent 1:1 physical-aspect dynamic Canvas2D + CanvasTexture pair for a keycap
 * so legends, selection highlights, scancode modes, and binds repaint cleanly in-place.
 */
export function createDynamicKeycapCanvas(
  key: KeyDef,
  palette: FinishPalette,
  options: DynamicKeycapPaintOptions,
): { canvas: HTMLCanvasElement; texture: THREE.CanvasTexture } {
  const kh = key.h ?? 1;
  const KEY_UNIT = 0.56;
  const KEY_GAP = 0.042;
  const physW = key.w * KEY_UNIT - KEY_GAP;
  const physD = kh * KEY_UNIT - KEY_GAP;
  const topW = Math.max(0.16, physW - Math.min(0.115, physW * 0.14));
  const topD = Math.max(0.16, physD - Math.min(0.125, physD * 0.16));
  const physAspect = topW / topD;

  const baseUnitPx = 224;
  let height = Math.round(baseUnitPx * kh);
  let width = Math.round(height * physAspect);
  if (width > 1024) {
    const down = 1024 / width;
    width = 1024;
    height = Math.max(96, Math.round(height * down));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  paintDynamicKeycapTexture(canvas, texture, key, palette, options);
  return { canvas, texture };
}

/**
 * Generates a crisp double-shot PBT keycap top CanvasTexture using dynamic scancode resolution.
 */
export function createKeycapTopTexture(
  key: KeyDef,
  palette: FinishPalette,
  options: DynamicKeycapPaintOptions,
): THREE.CanvasTexture {
  return createDynamicKeycapCanvas(key, palette, options).texture;
}

/**
 * Generates a refined matte OLED status display texture (75% & Numpad).
 */
export function createOledTexture(selectedLabel: string, boundCount: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#080A0E';
  ctx.fillRect(0, 0, 256, 96);

  ctx.strokeStyle = 'rgba(229, 149, 36, 0.38)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 88);

  ctx.fillStyle = '#E59524';
  ctx.font = '600 19px "JetBrains Mono", monospace';
  ctx.fillText('KEYFORGE', 16, 32);

  ctx.fillStyle = '#E5E7EB';
  ctx.font = '600 24px "JetBrains Mono", monospace';
  ctx.fillText(`KEY: ${selectedLabel.slice(0, 7)}`, 16, 68);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`${boundCount} BINDS`, 240, 32);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
