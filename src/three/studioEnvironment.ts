import * as THREE from 'three';
import type { StudioLightingPreset } from '../core/types';

export interface StudioPresetConfig {
  id: StudioLightingPreset;
  label: string;
  bgHex: number;
  fogDensity: number;
  exposure: number;
  keyColor: number;
  keyIntensity: number;
  keyPos: [number, number, number];
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  rimColor: number;
  rimIntensity: number;
  rimPos: [number, number, number];
  fillColor: number;
  fillIntensity: number;
  softboxTopColor: number;
  softboxTopIntensity: number;
  softboxSideColor: number;
  softboxSideIntensity: number;
  deskBaseHex: string;
  deskSpotlightRgba: string;
}

export const STUDIO_LIGHTING_PRESETS: Record<StudioLightingPreset, StudioPresetConfig> = {
  studio: {
    id: 'studio',
    label: '商业影棚',
    bgHex: 0x0e1117,
    fogDensity: 0.022,
    exposure: 1.02,
    keyColor: 0xfff4e6,
    keyIntensity: 2.15,
    keyPos: [6.5, 11.5, 6.0],
    hemiSky: 0xd0e2ff,
    hemiGround: 0x181c24,
    hemiIntensity: 0.55,
    rimColor: 0x8fbaff,
    rimIntensity: 1.45,
    rimPos: [-8.0, 5.5, -7.5],
    fillColor: 0xffe4c4,
    fillIntensity: 0.55,
    softboxTopColor: 0xfff8f0,
    softboxTopIntensity: 3.4,
    softboxSideColor: 0xbad6ff,
    softboxSideIntensity: 2.2,
    deskBaseHex: '#12151c',
    deskSpotlightRgba: 'rgba(60, 74, 96, 0.24)',
  },
  dramatic: {
    id: 'dramatic',
    label: '暗调曜黑',
    bgHex: 0x080a0e,
    fogDensity: 0.028,
    exposure: 0.96,
    keyColor: 0xfff0dd,
    keyIntensity: 2.45,
    keyPos: [8.0, 9.0, 4.5],
    hemiSky: 0x7da4d9,
    hemiGround: 0x0d1016,
    hemiIntensity: 0.32,
    rimColor: 0x6ba6ff,
    rimIntensity: 2.1,
    rimPos: [-7.5, 4.2, -8.5],
    fillColor: 0xf0b26a,
    fillIntensity: 0.42,
    softboxTopColor: 0xfff2e0,
    softboxTopIntensity: 2.6,
    softboxSideColor: 0x7eb4ff,
    softboxSideIntensity: 3.1,
    deskBaseHex: '#0b0d12',
    deskSpotlightRgba: 'rgba(42, 54, 74, 0.20)',
  },
  warmdesk: {
    id: 'warmdesk',
    label: '暖光桌面',
    bgHex: 0x141210,
    fogDensity: 0.021,
    exposure: 1.05,
    keyColor: 0xffe4be,
    keyIntensity: 2.25,
    keyPos: [-5.5, 10.5, 6.5],
    hemiSky: 0xffe9cc,
    hemiGround: 0x211a14,
    hemiIntensity: 0.58,
    rimColor: 0xffc68a,
    rimIntensity: 1.25,
    rimPos: [8.0, 5.0, -7.0],
    fillColor: 0xc2d8f2,
    fillIntensity: 0.45,
    softboxTopColor: 0xffebd2,
    softboxTopIntensity: 3.5,
    softboxSideColor: 0xffcfa0,
    softboxSideIntensity: 2.0,
    deskBaseHex: '#181512',
    deskSpotlightRgba: 'rgba(110, 84, 58, 0.22)',
  },
  softday: {
    id: 'softday',
    label: '柔光白棚',
    bgHex: 0xebe6eb,
    fogDensity: 0.015,
    exposure: 0.96,
    keyColor: 0xfff8f5,
    keyIntensity: 1.75,
    keyPos: [5.8, 12.0, 6.8],
    hemiSky: 0xffffff,
    hemiGround: 0xd8ccd6,
    hemiIntensity: 0.78,
    rimColor: 0xffd9ec,
    rimIntensity: 1.05,
    rimPos: [-7.5, 5.5, -7.5],
    fillColor: 0xe3efff,
    fillIntensity: 0.52,
    softboxTopColor: 0xffffff,
    softboxTopIntensity: 2.6,
    softboxSideColor: 0xffe4f0,
    softboxSideIntensity: 1.8,
    deskBaseHex: '#e7e1e6',
    deskSpotlightRgba: 'rgba(255, 250, 253, 0.55)',
  },
};

export const STUDIO_PRESET_LIST: StudioPresetConfig[] = [
  STUDIO_LIGHTING_PRESETS.studio,
  STUDIO_LIGHTING_PRESETS.dramatic,
  STUDIO_LIGHTING_PRESETS.warmdesk,
  STUDIO_LIGHTING_PRESETS.softday,
];

/**
 * Generates a high-contrast commercial product-photography light-tent environment map
 * using PMREMGenerator. Produces authentic elongated softbox specular reflections across
 * anodized CNC aluminum bevels, brushed brass, and sculpted PBT keycap shoulders.
 */
export function createCommercialStudioEnvMap(
  renderer: THREE.WebGLRenderer,
  presetId: StudioLightingPreset,
): THREE.WebGLRenderTarget {
  const cfg = STUDIO_LIGHTING_PRESETS[presetId];
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(presetId === 'softday' ? 0xd8d2da : 0x090b10);

  // Studio enclosure (dark studio vs soft blush-ivory daylight cyclorama)
  const roomGeo = new THREE.BoxGeometry(28, 16, 28);
  const roomMat = new THREE.MeshBasicMaterial({
    color:
      presetId === 'softday'
        ? 0xe8e2e8
        : presetId === 'warmdesk'
          ? 0x16120f
          : 0x0d1017,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(roomGeo, roomMat));

  // 1. Primary elongated overhead studio softbox strip
  const topPanelGeo = new THREE.PlaneGeometry(16, 4.8);
  const topPanelMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.softboxTopColor).multiplyScalar(2.6),
    side: THREE.DoubleSide,
  });
  const topPanel = new THREE.Mesh(topPanelGeo, topPanelMat);
  topPanel.position.set(0, 7.6, -1.0);
  topPanel.rotation.x = Math.PI / 2;
  envScene.add(topPanel);

  // 2. Front-top grazing catchlight strip (illuminates chamfered keycap top lips!)
  const frontStripGeo = new THREE.PlaneGeometry(18, 2.2);
  const frontStripMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.keyColor).multiplyScalar(1.9),
    side: THREE.DoubleSide,
  });
  const frontStrip = new THREE.Mesh(frontStripGeo, frontStripMat);
  frontStrip.position.set(2, 5.2, 10.5);
  frontStrip.lookAt(0, 0, 0);
  envScene.add(frontStrip);

  // 3. Cool left rim softbox strip (carves sharp silhouette edge)
  const leftRimGeo = new THREE.PlaneGeometry(14, 3.2);
  const leftRimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.softboxSideColor).multiplyScalar(2.2),
    side: THREE.DoubleSide,
  });
  const leftRim = new THREE.Mesh(leftRimGeo, leftRimMat);
  leftRim.position.set(-11.5, 4.0, -4.0);
  leftRim.lookAt(0, 0, 0);
  envScene.add(leftRim);

  // 4. Subtle warm right bounce card (brings brass rotary knob and plate to life)
  const rightFillGeo = new THREE.PlaneGeometry(10, 4.0);
  const rightFillMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cfg.fillColor).multiplyScalar(1.35),
    side: THREE.DoubleSide,
  });
  const rightFill = new THREE.Mesh(rightFillGeo, rightFillMat);
  rightFill.position.set(11.0, 3.5, 3.0);
  rightFill.lookAt(0, 0, 0);
  envScene.add(rightFill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envRT = pmrem.fromScene(envScene, 0.035);
  pmrem.dispose();

  roomGeo.dispose();
  roomMat.dispose();
  topPanelGeo.dispose();
  topPanelMat.dispose();
  frontStripGeo.dispose();
  frontStripMat.dispose();
  leftRimGeo.dispose();
  leftRimMat.dispose();
  rightFillGeo.dispose();
  rightFillMat.dispose();

  return envRT;
}

/**
 * Generates a realistic dark studio felt / architectural desk mat albedo texture
 * with subtle radial spotlight pool and fine micro-weave grain.
 */
export function createStudioDeskMatTexture(presetId: StudioLightingPreset): THREE.CanvasTexture {
  const cfg = STUDIO_LIGHTING_PRESETS[presetId];
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base dark felt / leatherette fill
  ctx.fillStyle = cfg.deskBaseHex;
  ctx.fillRect(0, 0, size, size);

  // Overhead studio softbox spotlight falloff on the desk surface
  const spot = ctx.createRadialGradient(
    size * 0.5,
    size * 0.48,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.44,
  );
  const isLight = presetId === 'softday';
  spot.addColorStop(0, cfg.deskSpotlightRgba);
  spot.addColorStop(0.55, isLight ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)');
  spot.addColorStop(1, isLight ? 'rgba(176, 162, 174, 0.34)' : 'rgba(0, 0, 0, 0.48)');
  ctx.fillStyle = spot;
  ctx.fillRect(0, 0, size, size);

  // Subtle felt / woven deskmat micro-grain
  ctx.fillStyle = isLight ? 'rgba(120, 102, 118, 0.028)' : 'rgba(255, 255, 255, 0.018)';
  for (let i = 0; i < 6500; i++) {
    const x = (i * 197.3) % size;
    const y = (i * 353.7) % size;
    ctx.fillRect(x, y, 2, 1);
  }

  // Ultra-subtle desk mat stitched border frame + precision measurement ticks
  const pad = 150;
  ctx.strokeStyle = isLight ? 'rgba(130, 112, 128, 0.14)' : 'rgba(255, 255, 255, 0.045)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(pad, pad + 60, size - pad * 2, size - (pad + 60) * 2);
  ctx.setLineDash([]);

  // Minimal hairline drafting crosshairs far outside keyboard footprint
  ctx.strokeStyle = isLight ? 'rgba(130, 112, 128, 0.09)' : 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let gx = pad; gx <= size - pad; gx += 64) {
    ctx.beginPath();
    ctx.moveTo(gx, pad + 52);
    ctx.lineTo(gx, pad + 60);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a rich double-falloff soft contact shadow texture to ground the CNC keyboard chassis.
 */
export function createSoftContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 512, 512);

  // Soft wide ambient penumbra
  const outer = ctx.createRadialGradient(256, 256, 60, 256, 256, 245);
  outer.addColorStop(0, 'rgba(0, 0, 0, 0.88)');
  outer.addColorStop(0.55, 'rgba(0, 0, 0, 0.52)');
  outer.addColorStop(0.82, 'rgba(0, 0, 0, 0.16)');
  outer.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = outer;
  ctx.fillRect(0, 0, 512, 512);

  // Crisp core umbra directly beneath chassis footprint
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.beginPath();
  ctx.roundRect(104, 118, 304, 276, 36);
  ctx.fill();

  return new THREE.CanvasTexture(canvas);
}
