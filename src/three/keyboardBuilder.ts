import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { computeLayoutBounds } from '../core/keyboardLayouts';
import { evaluateZoneRgb, getKeyRgbZone } from '../core/rgbLighting';
import type {
  KeyboardModelId,
  KeyboardModelSpec,
  KeycapLegendMode,
  KeyDef,
  MaterialFinishId,
  ResolvedKeyBind,
  RgbLightingProfile,
  RgbZoneId,
} from '../core/types';
import {
  createDynamicKeycapCanvas,
  createOledTexture,
  createPlateAoTexture,
  FINISH_PALETTES,
  getBrushedMetalBumpTexture,
  getPbtGrainBumpTexture,
  getPcbAlbedoTexture,
  getRainbowDiffuserTexture,
  getRgbLedHaloTexture,
  paintDynamicKeycapTexture,
  resolveKeycapColors,
} from './keyboardMaterials';

// Reusable scratch color outside animation tick (zero GC)
const _rgbTmpCol = new THREE.Color();

/** 1 key unit in Three.js world units (1U ≈ 19.05mm -> 0.56 world units) */
export const KEY_UNIT = 0.56;
const KEY_GAP = 0.042;

export interface KeyMeshHandle {
  code: string;
  layoutId: KeyboardModelId;
  layoutNormX: number;
  rgbZone: RgbZoneId;
  instanceIndex: number;
  def: KeyDef;
  group: THREE.Group;
  capMesh: THREE.Mesh;
  baseY: number;
  currentPress: number;
  targetPress: number;
  topCanvas: HTMLCanvasElement;
  topTexture: THREE.CanvasTexture;
  topMaterial: THREE.MeshStandardMaterial;
}

export interface BuiltKeyboardAssembly {
  root: THREE.Group;
  tiltGroup: THREE.Group;
  caseLayer: THREE.Group;
  pcbLayer: THREE.Group;
  plateLayer: THREE.Group;
  switchLayer: THREE.Group;
  keycapLayer: THREE.Group;
  keyHandles: Map<string, KeyMeshHandle>;
  clickableMeshes: THREE.Object3D[];
  oledMesh?: THREE.Mesh;
  oledTexture?: THREE.CanvasTexture;
  rotaryKnobGroup?: THREE.Group;
  underglowMesh?: THREE.Mesh;
  plateMesh?: THREE.Mesh;
  rgbHaloMesh: THREE.InstancedMesh;
  updateRgbLighting: (profile: RgbLightingProfile, timeSec: number) => void;
  boundingWidth: number;
  boundingDepth: number;
  dispose: () => void;
}

/**
 * Builds a rounded-rectangle THREE.Shape centered at (cx, cy).
 */
function createRoundedRectShape(
  width: number,
  height: number,
  radius: number,
  cx = 0,
  cy = 0,
): THREE.Shape {
  const s = new THREE.Shape();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw * 0.45, hh * 0.45);

  s.moveTo(cx - hw + r, cy - hh);
  s.lineTo(cx + hw - r, cy - hh);
  s.quadraticCurveTo(cx + hw, cy - hh, cx + hw, cy - hh + r);
  s.lineTo(cx + hw, cy + hh - r);
  s.quadraticCurveTo(cx + hw, cy + hh, cx + hw - r, cy + hh);
  s.lineTo(cx - hw + r, cy + hh);
  s.quadraticCurveTo(cx - hw, cy + hh, cx - hw, cy + hh - r);
  s.lineTo(cx - hw, cy - hh + r);
  s.quadraticCurveTo(cx - hw, cy - hh, cx - hw + r, cy - hh);
  return s;
}

/**
 * Builds a rounded-rectangle THREE.Path hole (wound clockwise) for seamless unibody CNC bezels.
 */
function createRoundedRectHole(width: number, height: number, radius: number): THREE.Path {
  const p = new THREE.Path();
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw * 0.4, hh * 0.4);

  p.moveTo(-hw + r, -hh);
  p.quadraticCurveTo(-hw, -hh, -hw, -hh + r);
  p.lineTo(-hw, hh - r);
  p.quadraticCurveTo(-hw, hh, -hw + r, hh);
  p.lineTo(hw - r, hh);
  p.quadraticCurveTo(hw, hh, hw, hh - r);
  p.lineTo(hw, -hh + r);
  p.quadraticCurveTo(hw, -hh, hw - r, -hh);
  p.lineTo(-hw + r, -hh);
  return p;
}

/**
 * Generates perimeter points around a rounded rectangle in the XZ plane (CCW from +Y view).
 */
function sampleRoundedRectRing(
  width: number,
  depth: number,
  radius: number,
  cornerSegs: number,
): Array<[number, number]> {
  const hw = width / 2;
  const hd = depth / 2;
  const r = Math.min(radius, hw * 0.45, hd * 0.45);
  const pts: Array<[number, number]> = [];

  // 4 corners in CCW order when looking down from +Y (right-handed: +X right, +Z front)
  const corners: Array<[number, number, number, number]> = [
    [hw - r, hd - r, 0, Math.PI / 2], // front-right (+X, +Z)
    [-hw + r, hd - r, Math.PI / 2, Math.PI], // front-left (-X, +Z)
    [-hw + r, -hd + r, Math.PI, (Math.PI * 3) / 2], // back-left (-X, -Z)
    [hw - r, -hd + r, (Math.PI * 3) / 2, Math.PI * 2], // back-right (+X, -Z)
  ];

  for (const [cx, cz, a0, a1] of corners) {
    for (let i = 0; i <= cornerSegs; i++) {
      const a = a0 + ((a1 - a0) * i) / cornerSegs;
      pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
    }
  }
  return pts;
}

export function computeKeycapTopDimensions(
  wU: number,
  hU: number,
): { width: number; depth: number; topW: number; topD: number } {
  const width = wU * KEY_UNIT - KEY_GAP;
  const depth = hU * KEY_UNIT - KEY_GAP;
  const topShrinkX = Math.min(0.115, width * 0.14);
  const topShrinkZ = Math.min(0.125, depth * 0.16);
  const topW = Math.max(0.16, width - topShrinkX);
  const topD = Math.max(0.16, depth - topShrinkZ);
  return { width, depth, topW, topD };
}

/**
 * Creates a true commercial-grade molded double-shot PBT keycap BufferGeometry:
 * - Multi-ring rounded-corner tapered loft (smooth rounded skirts + chamfered top shoulder)
 * - 100% watertight concentric rounded-rect concave finger dish matching the top lip perimeter
 * - Exact orthographic planar world-space UV projection (zero corner shear or glyph warping!)
 * - Two material groups: group 0 = sculpted PBT skirt & shoulder, group 1 = top dish with legend
 */
function createSculptedKeycapGeometry(
  width: number,
  depth: number,
  height: number,
  rowProfile: 1 | 2 | 3 | 4,
): THREE.BufferGeometry {
  const cornerSegs = 3;
  const tiltSlope = rowProfile === 1 ? 0.045 : rowProfile === 2 ? 0.025 : rowProfile === 3 ? 0.0 : -0.02;

  const topShrinkX = Math.min(0.115, width * 0.14);
  const topShrinkZ = Math.min(0.125, depth * 0.16);
  const topW = Math.max(0.16, width - topShrinkX);
  const topD = Math.max(0.16, depth - topShrinkZ);
  const topCornerR = 0.044;

  // 4 vertical rings from skirt base -> mid belly -> bevel shoulder -> top lip
  const ringDefs: Array<{ w: number; d: number; r: number; y: number; slopeScale: number }> = [
    { w: width, d: depth, r: 0.042, y: 0.0, slopeScale: 0.0 },
    { w: width - topShrinkX * 0.42, d: depth - topShrinkZ * 0.42, r: 0.048, y: height * 0.56, slopeScale: 0.4 },
    { w: topW + 0.022, d: topD + 0.022, r: 0.052, y: height * 0.9, slopeScale: 0.92 },
    { w: topW, d: topD, r: topCornerR, y: height, slopeScale: 1.0 },
  ];

  const rings = ringDefs.map((rd) =>
    sampleRoundedRectRing(rd.w, rd.d, rd.r, cornerSegs).map(([x, z]) => {
      const zTilt = (-z / Math.max(0.01, rd.d / 2)) * tiltSlope * rd.slopeScale;
      return [x, rd.y + zTilt, z] as [number, number, number];
    }),
  );

  const ringLen = rings[0].length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const skirtIndices: number[] = [];
  const topIndices: number[] = [];

  // Push side-ring vertices (Group 0: skirt + beveled shoulder)
  for (let r = 0; r < rings.length; r++) {
    const vCoord = r / (rings.length - 1);
    for (let i = 0; i < ringLen; i++) {
      const [x, y, z] = rings[r][i];
      positions.push(x, y, z);
      uvs.push(i / ringLen, vCoord);
    }
  }

  // Connect adjacent rings for smooth sculpted skirts + chamfered shoulders (CCW outward)
  for (let r = 0; r < rings.length - 1; r++) {
    const baseA = r * ringLen;
    const baseB = (r + 1) * ringLen;
    for (let i = 0; i < ringLen; i++) {
      const next = (i + 1) % ringLen;
      const a0 = baseA + i;
      const a1 = baseA + next;
      const b0 = baseB + i;
      const b1 = baseB + next;
      skirtIndices.push(a0, b0, a1);
      skirtIndices.push(a1, b0, b1);
    }
  }

  // Build 100% watertight concentric rounded-rect concave top dish (Group 1: crisp planar UV!)
  // Outer ring (s = 1.0) matches ringDefs[3] perimeter vertex-for-vertex -> ZERO corner gaps!
  const dishScales = [1.0, 0.84, 0.62, 0.36];
  const halfTopW = topW / 2;
  const halfTopD = topD / 2;
  const dishRingBase: number[] = [];

  for (const s of dishScales) {
    dishRingBase.push(positions.length / 3);
    const rw = topW * s;
    const rd = topD * s;
    const rr = topCornerR * s;
    const pts = sampleRoundedRectRing(rw, rd, rr, cornerSegs);
    for (const [x, z] of pts) {
      const nx = Math.max(-1, Math.min(1, x / Math.max(0.001, halfTopW)));
      const nz = Math.max(-1, Math.min(1, z / Math.max(0.001, halfTopD)));
      // Smooth concave finger scoop (exact 0 along outer rim s=1.0 -> seamless watertight join!)
      const scoop = s >= 0.999 ? 0 : (1 - nx * nx) * (1 - nz * nz) * 0.022;
      const zTilt = (-z / Math.max(0.001, halfTopD)) * tiltSlope;
      const y = height + zTilt - scoop;

      positions.push(x, y, z);
      // Exact orthographic world-space UV: 0% corner distortion, razor-sharp legends everywhere!
      const u = (x + halfTopW) / topW;
      const v = 1 - (z + halfTopD) / topD;
      uvs.push(u, v);
    }
  }

  // Center vertex at deepest point of the concave finger dish
  const centerIdx = positions.length / 3;
  positions.push(0, height - 0.022, 0);
  uvs.push(0.5, 0.5);

  // Stitch concentric dish rings with upward (+Y) CCW winding:
  // Along +Z front edge: (i0 - o0) = -k, (o1 - o0) = -i => (-k) x (-i) = +(k x i) = +j (+Y UPWARD!)
  for (let r = 0; r < dishScales.length - 1; r++) {
    const outerBase = dishRingBase[r];
    const innerBase = dishRingBase[r + 1];
    for (let i = 0; i < ringLen; i++) {
      const next = (i + 1) % ringLen;
      const o0 = outerBase + i;
      const o1 = outerBase + next;
      const i0 = innerBase + i;
      const i1 = innerBase + next;
      topIndices.push(o0, i0, o1);
      topIndices.push(o1, i0, i1);
    }
  }

  // Stitch innermost ring to center vertex with upward (+Y) winding
  const innerMostBase = dishRingBase[dishScales.length - 1];
  for (let i = 0; i < ringLen; i++) {
    const next = (i + 1) % ringLen;
    topIndices.push(innerMostBase + i, centerIdx, innerMostBase + next);
  }

  const allIndices = [...skirtIndices, ...topIndices];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(allIndices);
  geo.addGroup(0, skirtIndices.length, 0);
  geo.addGroup(skirtIndices.length, topIndices.length, 1);
  geo.computeVertexNormals();

  // Replace center-fan averaged normals on top dish vertices with exact smooth analytical concave normals
  // Eliminates any X-shaped facet shading on wide/tall keys (BKSP, ENTER, SPACE, Numpad+)
  const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
  const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
  const topStart = dishRingBase[0];
  const tmpN = new THREE.Vector3();
  const invHalfW = 1 / Math.max(0.05, halfTopW);
  const invHalfD = 1 / Math.max(0.05, halfTopD);
  const dishDepth = 0.018;
  for (let vi = topStart; vi < posAttr.count; vi++) {
    const px = posAttr.getX(vi);
    const pz = posAttr.getZ(vi);
    const nx = Math.max(-1, Math.min(1, px * invHalfW));
    const nz = Math.max(-1, Math.min(1, pz * invHalfD));
    // Partial derivatives of y(x,z) = height - (z / halfTopD)*tiltSlope - (1 - nx^2)*(1 - nz^2)*dishDepth
    const dydx = 2 * nx * invHalfW * (1 - nz * nz) * dishDepth;
    const dydz = -tiltSlope * invHalfD + 2 * nz * invHalfD * (1 - nx * nx) * dishDepth;
    tmpN.set(-dydx, 1, -dydz).normalize();
    normAttr.setXYZ(vi, tmpN.x, tmpN.y, tmpN.z);
  }
  normAttr.needsUpdate = true;

  return geo;
}

/**
 * Creates a machined fluted/knurled CNC rotary encoder barrel geometry.
 */
function createKnurledKnobGeometry(radius: number, height: number, flutes = 26): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const steps = flutes * 2;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = i % 2 === 0 ? radius : radius * 0.935;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  return geo;
}

/**
 * Builds a commercial-grade composite multi-layer 3D mechanical keyboard ready for
 * studio PBR WebGL rendering AND direct .glb / .obj export to C++ game engines.
 */
export function buildKeyboardAssembly(
  spec: KeyboardModelSpec,
  finishId: MaterialFinishId,
  bindsByKey: Record<string, ResolvedKeyBind>,
  selectedKeyCode: string | null,
  maxAnisotropy: number,
  backlightEnabled = true,
  legendMode: KeycapLegendMode = 'standard',
): BuiltKeyboardAssembly {
  const palette = FINISH_PALETTES[finishId];
  const bounds = computeLayoutBounds(spec);
  const disposables: Array<{ dispose: () => void }> = [];

  const innerW = bounds.widthU * KEY_UNIT;
  const innerD = bounds.depthU * KEY_UNIT;
  const caseW = innerW + spec.casePaddingX * 2 * KEY_UNIT;
  const caseD = innerD + spec.casePaddingY * 2 * KEY_UNIT;
  const caseH = 0.46;

  const root = new THREE.Group();
  root.name = `KeyForge_${spec.id}`;

  // Tilt group anchored so bottom front sits cleanly on the desk plane (y = 0)
  const tiltGroup = new THREE.Group();
  tiltGroup.name = 'KeyboardChassisTilt';
  const tiltRad = THREE.MathUtils.degToRad(spec.tiltDegrees);
  tiltGroup.rotation.x = tiltRad;
  tiltGroup.position.y = Math.sin(tiltRad) * (caseD * 0.5) + 0.055;
  root.add(tiltGroup);

  // Hierarchical layers for smooth exploded-view inspection & clean C++ scene graph
  const caseLayer = new THREE.Group();
  caseLayer.name = 'Layer_01_CNC_Case';
  const pcbLayer = new THREE.Group();
  pcbLayer.name = 'Layer_02_Hotswap_PCB';
  const plateLayer = new THREE.Group();
  plateLayer.name = 'Layer_03_Switch_Plate';
  const switchLayer = new THREE.Group();
  switchLayer.name = 'Layer_04_Mechanical_Switches';
  const keycapLayer = new THREE.Group();
  keycapLayer.name = 'Layer_05_PBT_Keycaps';

  tiltGroup.add(caseLayer, pcbLayer, plateLayer, switchLayer, keycapLayer);

  // --- Shared Commercial PBR Materials ---
  const bumpTex = getBrushedMetalBumpTexture();
  const pbtBumpTex = getPbtGrainBumpTexture();

  const caseMat = new THREE.MeshPhysicalMaterial({
    color: palette.caseColor,
    metalness: palette.caseMetalness,
    roughness: palette.caseRoughness,
    clearcoat: palette.caseClearcoat,
    clearcoatRoughness: 0.25,
    bumpMap: bumpTex,
    bumpScale: 0.003,
  });

  // Slightly deeper lower chassis for luxury two-tone CNC undercut silhouette
  const lowerScale = palette.caseClearcoat > 0.35 ? 0.84 : 0.74;
  const lowerCaseCol = new THREE.Color(palette.caseColor).multiplyScalar(lowerScale);
  const lowerCaseMat = new THREE.MeshStandardMaterial({
    color: lowerCaseCol,
    metalness: Math.min(0.92, palette.caseMetalness + 0.05),
    roughness: Math.min(0.85, palette.caseRoughness + 0.14),
    bumpMap: bumpTex,
    bumpScale: 0.004,
  });

  const brassMat = new THREE.MeshPhysicalMaterial({
    color: palette.brassColor,
    metalness: 0.94,
    roughness: 0.18,
    clearcoat: 0.25,
    clearcoatRoughness: 0.15,
    bumpMap: bumpTex,
    bumpScale: 0.0025,
  });

  // Baked per-key AO + optional diffused backlight plate texture
  const plateAoTex = createPlateAoTexture(spec, palette, backlightEnabled);
  plateAoTex.anisotropy = Math.max(1, maxAnisotropy);
  disposables.push(plateAoTex);

  const plateEmissiveColor = backlightEnabled
    ? new THREE.Color(palette.rainbowMode === 'pastel' ? 0xffffff : palette.underglowHex)
    : new THREE.Color(0x000000);
  const plateMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: plateAoTex,
    metalness: palette.plateMetalness * 0.72,
    roughness: palette.plateRoughness + 0.14,
    emissive: plateEmissiveColor,
    emissiveMap: backlightEnabled ? plateAoTex : null,
    emissiveIntensity: backlightEnabled ? (palette.rainbowMode === 'pastel' ? 0.34 : 0.22) : 0,
  });

  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: getPcbAlbedoTexture(),
    metalness: 0.18,
    roughness: 0.56,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x16181e,
    metalness: 0.02,
    roughness: 0.88,
    bumpMap: pbtBumpTex,
    bumpScale: 0.004,
  });

  const switchHousingMat = new THREE.MeshStandardMaterial({
    color: 0x1c2028,
    metalness: 0.06,
    roughness: 0.48,
  });

  const switchStemMat = new THREE.MeshStandardMaterial({
    color: palette.switchStemColor,
    metalness: 0.04,
    roughness: 0.36,
  });

  const usbPortMat = new THREE.MeshStandardMaterial({
    color: 0x9aa3b2,
    metalness: 0.92,
    roughness: 0.22,
  });

  const rainbowDiffuserTex =
    palette.rainbowMode === 'pastel' && backlightEnabled ? getRainbowDiffuserTexture() : null;
  const underglowMat = new THREE.MeshStandardMaterial({
    color: rainbowDiffuserTex ? 0xffffff : backlightEnabled ? palette.underglowHex : 0x252a33,
    map: rainbowDiffuserTex,
    emissive: rainbowDiffuserTex ? 0xffffff : backlightEnabled ? palette.underglowHex : 0x000000,
    emissiveMap: rainbowDiffuserTex,
    emissiveIntensity: backlightEnabled ? (rainbowDiffuserTex ? 1.05 : 1.15) : 0,
    roughness: 0.3,
    metalness: 0.05,
  });

  const ledOnMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: palette.underglowHex,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  });

  disposables.push(
    caseMat,
    lowerCaseMat,
    brassMat,
    plateMat,
    pcbMat,
    rubberMat,
    switchHousingMat,
    switchStemMat,
    usbPortMat,
    underglowMat,
    ledOnMat,
  );

  // --- 1. Two-Piece Machined Unibody CNC Chassis ---
  // 1A: Lower stepped chamfered base (slightly inset undercut for floating look)
  const lowerShape = createRoundedRectShape(caseW - 0.1, caseD - 0.1, 0.2);
  const lowerGeo = new THREE.ExtrudeGeometry(lowerShape, {
    depth: caseH * 0.44,
    bevelEnabled: true,
    bevelThickness: 0.036,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
  lowerGeo.rotateX(Math.PI / 2);
  lowerGeo.translate(0, caseH * 0.44, 0);
  disposables.push(lowerGeo);

  const lowerMesh = new THREE.Mesh(lowerGeo, lowerCaseMat);
  lowerMesh.name = 'CNC_Lower_Chassis';
  lowerMesh.castShadow = true;
  lowerMesh.receiveShadow = true;
  caseLayer.add(lowerMesh);

  // 1B: Diffused frosted acrylic mid-frame accent / underglow strip
  const diffuserShape = createRoundedRectShape(caseW - 0.03, caseD - 0.03, 0.21);
  const diffuserGeo = new THREE.ExtrudeGeometry(diffuserShape, {
    depth: 0.042,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  diffuserGeo.rotateX(Math.PI / 2);
  diffuserGeo.translate(0, caseH * 0.495, 0);
  if (rainbowDiffuserTex) {
    // Map X coordinate seamlessly [0..1] across chassis width so pastel rainbow sweeps left-to-right
    const posAttr = diffuserGeo.getAttribute('position') as THREE.BufferAttribute;
    const uvAttr = diffuserGeo.getAttribute('uv') as THREE.BufferAttribute;
    const halfW = Math.max(0.01, (caseW - 0.03) * 0.5);
    for (let i = 0; i < posAttr.count; i++) {
      const u = Math.max(0, Math.min(1, (posAttr.getX(i) + halfW) / (halfW * 2)));
      uvAttr.setXY(i, u, 0.5);
    }
    uvAttr.needsUpdate = true;
  }
  disposables.push(diffuserGeo);

  const underglowMesh = new THREE.Mesh(diffuserGeo, underglowMat);
  underglowMesh.name = 'Acrylic_Diffuser_Strip';
  caseLayer.add(underglowMesh);

  // 1C: Seamless Unibody Top CNC Bezel Frame (single ExtrudeGeometry with keywell cutout hole!)
  const topFrameShape = createRoundedRectShape(caseW, caseD, 0.22);
  const wellHole = createRoundedRectHole(innerW + 0.06, innerD + 0.06, 0.06);
  topFrameShape.holes.push(wellHole);

  const bezelDepth = 0.29;
  const topFrameGeo = new THREE.ExtrudeGeometry(topFrameShape, {
    depth: bezelDepth,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.032,
    bevelSegments: 4,
  });
  topFrameGeo.rotateX(Math.PI / 2);
  topFrameGeo.translate(0, caseH * 0.52 + bezelDepth, 0);
  disposables.push(topFrameGeo);

  const topFrameMesh = new THREE.Mesh(topFrameGeo, caseMat);
  topFrameMesh.name = 'CNC_Unibody_Top_Frame';
  topFrameMesh.castShadow = true;
  topFrameMesh.receiveShadow = true;
  caseLayer.add(topFrameMesh);

  // 1D: Subtle dark inner well shadow liner around perimeter
  const rubberFootGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.055, 20);
  disposables.push(rubberFootGeo);
  const footPositions: Array<[number, number]> = [
    [-caseW * 0.42, -caseD * 0.38],
    [caseW * 0.42, -caseD * 0.38],
    [-caseW * 0.42, caseD * 0.38],
    [caseW * 0.42, caseD * 0.38],
  ];
  for (const [fx, fz] of footPositions) {
    const foot = new THREE.Mesh(rubberFootGeo, rubberMat);
    foot.position.set(fx, -0.02, fz);
    caseLayer.add(foot);
  }

  // 1E: Recessed Pinhole Status LEDs on top-right bezel edge
  const ledGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12);
  disposables.push(ledGeo);
  for (let i = 0; i < 3; i++) {
    const led = new THREE.Mesh(ledGeo, i === 0 ? ledOnMat : switchHousingMat);
    led.name = `Status_LED_${i + 1}`;
    led.position.set(
      caseW * 0.5 - 0.34 - i * 0.11,
      caseH * 0.52 + bezelDepth + 0.028,
      -caseD * 0.5 + 0.14,
    );
    caseLayer.add(led);
  }

  // 1F: Rear Machined Chamfered Brass Weight Bar + Recessed USB-C Collar
  if (spec.hasBrassWeight) {
    const weightW = Math.min(caseW * 0.48, 3.6);
    const weightShape = createRoundedRectShape(weightW, 0.12, 0.03);
    const weightGeo = new THREE.ExtrudeGeometry(weightShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.014,
      bevelSize: 0.014,
      bevelSegments: 2,
    });
    weightGeo.translate(0, caseH * 0.48, -caseD / 2 - 0.11);
    disposables.push(weightGeo);
    const weightBar = new THREE.Mesh(weightGeo, brassMat);
    weightBar.name = 'Brass_Rear_Accent';
    caseLayer.add(weightBar);
  }

  const usbCollarGeo = new THREE.BoxGeometry(0.38, 0.13, 0.14);
  const usbInnerGeo = new THREE.BoxGeometry(0.24, 0.055, 0.15);
  disposables.push(usbCollarGeo, usbInnerGeo);
  const usbHousing = new THREE.Mesh(usbCollarGeo, usbPortMat);
  usbHousing.name = 'USBC_Port_Collar';
  usbHousing.position.set(-caseW * 0.28, caseH * 0.34, -caseD / 2 - 0.01);
  const usbInner = new THREE.Mesh(usbInnerGeo, rubberMat);
  usbInner.position.set(-caseW * 0.28, caseH * 0.34, -caseD / 2 - 0.015);
  caseLayer.add(usbHousing, usbInner);

  // 1G: Ergonomic Sculpted Leatherette Wrist Rest for Left-Hand Gaming Keypad
  if (spec.hasWristRest) {
    const wristW = caseW * 0.96;
    const wristD = 1.68;
    const wristShape = createRoundedRectShape(wristW, wristD, 0.26);
    const wristGeo = new THREE.ExtrudeGeometry(wristShape, {
      depth: 0.24,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.06,
      bevelSegments: 4,
    });
    wristGeo.rotateX(Math.PI / 2);
    wristGeo.translate(0, 0.24, 0);
    disposables.push(wristGeo);

    const wristPad = new THREE.Mesh(wristGeo, rubberMat);
    wristPad.name = 'Ergonomic_Wrist_Rest';
    wristPad.position.set(0, 0.04, caseD / 2 + wristD / 2 - 0.04);
    wristPad.rotation.x = 0.065;
    wristPad.castShadow = true;
    wristPad.receiveShadow = true;
    caseLayer.add(wristPad);
  }

  // --- 2. Inner Hot-Swap PCB Layer ---
  const pcbGeo = new THREE.BoxGeometry(innerW + 0.14, 0.05, innerD + 0.14);
  disposables.push(pcbGeo);
  const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
  pcbMesh.name = 'Hotswap_PCB_Board';
  pcbMesh.position.set(0, caseH * 0.5, 0);
  pcbMesh.receiveShadow = true;
  pcbLayer.add(pcbMesh);

  // --- 3. Switch Mounting Plate Layer (with Baked Per-Key AO Shadows!) ---
  const plateGeo = new THREE.BoxGeometry(innerW + 0.08, 0.045, innerD + 0.08);
  disposables.push(plateGeo);
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.name = 'CNC_Switch_Plate';
  plateMesh.position.set(0, caseH * 0.62, 0);
  plateMesh.receiveShadow = true;
  plateLayer.add(plateMesh);

  // --- 4. Instanced Mechanical Switches (Housing + Cross Stems) + Per-Key RGB LED Halos ---
  const keyCount = spec.keys.length;
  const swHousingGeo = new THREE.BoxGeometry(0.32, 0.15, 0.32);
  const swStemGeo = new THREE.BoxGeometry(0.13, 0.12, 0.13);
  const rgbHaloGeo = new THREE.PlaneGeometry(1, 1);
  rgbHaloGeo.rotateX(-Math.PI / 2);
  const rgbHaloMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: getRgbLedHaloTexture(),
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposables.push(swHousingGeo, swStemGeo, rgbHaloGeo, rgbHaloMat);

  const housingInst = new THREE.InstancedMesh(swHousingGeo, switchHousingMat, keyCount);
  housingInst.name = 'Switch_Housings_Instanced';
  const stemInst = new THREE.InstancedMesh(swStemGeo, switchStemMat, keyCount);
  stemInst.name = 'Switch_Stems_Instanced';
  const rgbHaloInst = new THREE.InstancedMesh(rgbHaloGeo, rgbHaloMat, keyCount);
  rgbHaloInst.name = 'PerKey_RGB_LED_Halos';
  rgbHaloInst.renderOrder = 2;
  rgbHaloInst.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const originX = -((bounds.minX + bounds.maxX) / 2) * KEY_UNIT;
  const originZ = -((bounds.minY + bounds.maxY) / 2) * KEY_UNIT;

  // --- 5. Molded Sculpted Double-Shot PBT Keycaps ---
  const keyHandles = new Map<string, KeyMeshHandle>();
  const clickableMeshes: THREE.Object3D[] = [];

  const skirtMatCache = new Map<string, THREE.MeshStandardMaterial>();
  const getSkirtMat = (keyDef: KeyDef, layoutNormX: number) => {
    const { capHex } = resolveKeycapColors(keyDef, palette, layoutNormX);
    const existing = skirtMatCache.get(capHex);
    if (existing) return existing;
    // Slightly deeper skirt tone for natural self-occlusion contrast against the top shoulder
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(capHex).multiplyScalar(0.92),
      roughness: 0.62,
      metalness: 0.04,
      bumpMap: pbtBumpTex,
      bumpScale: 0.0025,
    });
    skirtMatCache.set(capHex, mat);
    disposables.push(mat);
    return mat;
  };

  const capGeoCache = new Map<string, THREE.BufferGeometry>();
  const getCapGeo = (wU: number, hU: number, profile: KeyDef['rowProfile']) => {
    const k = `${wU}_${hU}_${profile}`;
    const existing = capGeoCache.get(k);
    if (existing) return existing;
    const capW = wU * KEY_UNIT - KEY_GAP;
    const capD = hU * KEY_UNIT - KEY_GAP;
    const profileHeight =
      profile === 1 ? 0.305 : profile === 2 ? 0.265 : profile === 3 ? 0.245 : 0.275;
    const geo = createSculptedKeycapGeometry(capW, capD, profileHeight, profile);
    capGeoCache.set(k, geo);
    disposables.push(geo);
    return geo;
  };

  spec.keys.forEach((keyDef, idx) => {
    const hU = keyDef.h ?? 1;
    const wx = originX + (keyDef.x + keyDef.w / 2) * KEY_UNIT;
    const wz = originZ + (keyDef.y + hU / 2) * KEY_UNIT;
    const layoutNormX = Math.max(
      0,
      Math.min(1, (keyDef.x + keyDef.w / 2 - bounds.minX) / Math.max(1, bounds.widthU)),
    );

    // Place instanced switch housing + stem + under-key RGB LED halo pad
    dummy.position.set(wx, caseH * 0.7, wz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    housingInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(wx, caseH * 0.83, wz);
    dummy.updateMatrix();
    stemInst.setMatrixAt(idx, dummy.matrix);

    const haloW = keyDef.w * KEY_UNIT * 1.14;
    const haloD = hU * KEY_UNIT * 1.14;
    dummy.position.set(wx, caseH * 0.678, wz);
    dummy.scale.set(haloW, 1, haloD);
    dummy.updateMatrix();
    rgbHaloInst.setMatrixAt(idx, dummy.matrix);
    rgbHaloInst.setColorAt(idx, _rgbTmpCol.setRGB(0, 0, 0));

    // Build single cohesive molded keycap mesh with 2 material groups (skirt + UV-mapped dish top)
    const keyGroup = new THREE.Group();
    keyGroup.name = `Key_${keyDef.code}`;
    const baseY = caseH * 0.74;
    keyGroup.position.set(wx, baseY, wz);

    const bind = bindsByKey[keyDef.code];
    const { canvas: topCanvas, texture: topTexture } = createDynamicKeycapCanvas(keyDef, palette, {
      layoutId: spec.id,
      legendMode,
      layoutNormX,
      isBound: Boolean(bind),
      bindHint: bind?.commands[0],
      isSelected: selectedKeyCode === keyDef.code,
      maxAnisotropy,
    });
    disposables.push(topTexture);

    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: topTexture,
      roughness: 0.56,
      metalness: 0.04,
      bumpMap: pbtBumpTex,
      bumpScale: 0.002,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 1.0,
    });
    disposables.push(topMaterial);

    const capGeo = getCapGeo(keyDef.w, hU, keyDef.rowProfile);
    const capMesh = new THREE.Mesh(capGeo, [getSkirtMat(keyDef, layoutNormX), topMaterial]);
    capMesh.name = `KeyCap_${keyDef.code}`;
    capMesh.castShadow = true;
    capMesh.receiveShadow = true;
    capMesh.userData.keyCode = keyDef.code;
    keyGroup.add(capMesh);

    keycapLayer.add(keyGroup);
    clickableMeshes.push(capMesh);

    keyHandles.set(keyDef.code, {
      code: keyDef.code,
      layoutId: spec.id,
      layoutNormX,
      rgbZone: getKeyRgbZone(keyDef.code),
      instanceIndex: idx,
      def: keyDef,
      group: keyGroup,
      capMesh,
      baseY,
      currentPress: 0,
      targetPress: 0,
      topCanvas,
      topTexture,
      topMaterial,
    });
  });

  housingInst.instanceMatrix.needsUpdate = true;
  housingInst.computeBoundingSphere();
  stemInst.instanceMatrix.needsUpdate = true;
  stemInst.computeBoundingSphere();
  rgbHaloInst.instanceMatrix.needsUpdate = true;
  if (rgbHaloInst.instanceColor) rgbHaloInst.instanceColor.needsUpdate = true;
  switchLayer.add(housingInst, stemInst);
  plateLayer.add(rgbHaloInst);

  // --- 6. Machined Fluted CNC Rotary Encoder Knob + OLED Screen ---
  let rotaryKnobGroup: THREE.Group | undefined;
  if (spec.hasRotaryKnob && spec.knobPosition) {
    rotaryKnobGroup = new THREE.Group();
    rotaryKnobGroup.name = 'CNC_Rotary_Encoder_Knob';
    const kx = originX + spec.knobPosition.x * KEY_UNIT;
    const kz = originZ + spec.knobPosition.y * KEY_UNIT;
    rotaryKnobGroup.position.set(kx, caseH * 0.72, kz);

    const collarGeo = new THREE.CylinderGeometry(0.24, 0.255, 0.09, 28);
    const knurledGeo = createKnurledKnobGeometry(0.215, 0.34, 28);
    const capInlayGeo = new THREE.CylinderGeometry(0.165, 0.175, 0.035, 28);
    const indicatorTickGeo = new THREE.BoxGeometry(0.025, 0.02, 0.08);
    disposables.push(collarGeo, knurledGeo, capInlayGeo, indicatorTickGeo);

    const collar = new THREE.Mesh(collarGeo, lowerCaseMat);
    collar.position.y = 0.045;
    const knob = new THREE.Mesh(knurledGeo, brassMat);
    knob.position.y = 0.09;
    knob.castShadow = true;
    const capInlay = new THREE.Mesh(capInlayGeo, caseMat);
    capInlay.position.y = 0.44;
    const tick = new THREE.Mesh(indicatorTickGeo, brassMat);
    tick.position.set(0, 0.456, -0.09);

    rotaryKnobGroup.add(collar, knob, capInlay, tick);
    keycapLayer.add(rotaryKnobGroup);
  }

  let oledMesh: THREE.Mesh | undefined;
  let oledTexture: THREE.CanvasTexture | undefined;
  if (spec.hasOledBar && spec.oledPosition) {
    const ox = originX + spec.oledPosition.x * KEY_UNIT;
    const oz = originZ + spec.oledPosition.y * KEY_UNIT;
    const ow = spec.oledPosition.w * KEY_UNIT;

    const bezelGeo = new THREE.BoxGeometry(ow + 0.08, 0.16, 0.25);
    const oledGeo = new THREE.PlaneGeometry(ow, 0.17);
    oledGeo.rotateX(-Math.PI / 2);
    disposables.push(bezelGeo, oledGeo);

    const oledBezel = new THREE.Mesh(bezelGeo, lowerCaseMat);
    oledBezel.name = 'OLED_Bezel_Housing';
    oledBezel.position.set(ox, caseH * 0.84, oz);
    oledBezel.castShadow = true;
    oledBezel.receiveShadow = true;
    caseLayer.add(oledBezel);

    oledTexture = createOledTexture(selectedKeyCode ?? 'READY', Object.keys(bindsByKey).length);
    disposables.push(oledTexture);

    const oledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: oledTexture,
      emissive: 0xffffff,
      emissiveMap: oledTexture,
      emissiveIntensity: 0.78,
      roughness: 0.1,
      metalness: 0.18,
    });
    disposables.push(oledMat);

    oledMesh = new THREE.Mesh(oledGeo, oledMat);
    oledMesh.name = 'OLED_Status_Screen';
    oledMesh.position.set(ox, caseH * 0.84 + 0.083, oz);
    caseLayer.add(oledMesh);
  }

  const updateRgbLighting = (profile: RgbLightingProfile, timeSec: number) => {
    const active = profile.enabled && profile.masterBrightness > 0;
    rgbHaloInst.visible = active;

    if (!active) {
      keyHandles.forEach((handle) => {
        handle.topMaterial.emissive.setRGB(0, 0, 0);
      });
      if (!rainbowDiffuserTex) {
        underglowMat.color.setHex(backlightEnabled ? palette.underglowHex : 0x252a33);
        underglowMat.emissive.setHex(backlightEnabled ? palette.underglowHex : 0x000000);
        underglowMat.emissiveIntensity = backlightEnabled ? 1.15 : 0;
      }
      return;
    }

    let accumR = 0;
    let accumG = 0;
    let accumB = 0;
    let activeCount = 0;

    keyHandles.forEach((handle) => {
      const zoneCfg = profile.zones[handle.rgbZone];
      const [r, g, b] = evaluateZoneRgb(zoneCfg, profile.masterBrightness, timeSec, handle.layoutNormX);
      // Vivid additive LED spill on switch plate + restrained physical bounce tint on keycap dish
      _rgbTmpCol.setRGB(r * 0.95, g * 0.95, b * 0.95);
      rgbHaloInst.setColorAt(handle.instanceIndex, _rgbTmpCol);
      handle.topMaterial.emissive.setRGB(r * 0.16, g * 0.16, b * 0.16);

      if (r + g + b > 0.01) {
        accumR += r;
        accumG += g;
        accumB += b;
        activeCount++;
      }
    });

    if (rgbHaloInst.instanceColor) {
      rgbHaloInst.instanceColor.needsUpdate = true;
    }

    if (profile.syncUnderglow && !rainbowDiffuserTex) {
      const [ur, ug, ub] =
        activeCount > 0
          ? [accumR / activeCount, accumG / activeCount, accumB / activeCount]
          : evaluateZoneRgb(profile.zones.wasd, profile.masterBrightness, timeSec, 0.2);
      underglowMat.color.setRGB(Math.min(1, ur * 1.15), Math.min(1, ug * 1.15), Math.min(1, ub * 1.15));
      underglowMat.emissive.setRGB(ur, ug, ub);
      underglowMat.emissiveIntensity = 1.25;
    }
  };

  return {
    root,
    tiltGroup,
    caseLayer,
    pcbLayer,
    plateLayer,
    switchLayer,
    keycapLayer,
    keyHandles,
    clickableMeshes,
    oledMesh,
    oledTexture,
    rotaryKnobGroup,
    underglowMesh,
    plateMesh,
    rgbHaloMesh: rgbHaloInst,
    updateRgbLighting,
    boundingWidth: caseW,
    boundingDepth: caseD + (spec.hasWristRest ? 1.65 : 0),
    dispose: () => {
      for (const item of disposables) {
        item.dispose();
      }
    },
  };
}

/**
 * Dynamically repaints a keycap's Canvas2D legend in place (zero texture reallocation)
 * directly from scancodes.ts for the current layout, legend mode, bind, and selection state.
 */
export function refreshKeycapTexture(
  handle: KeyMeshHandle,
  finishId: MaterialFinishId,
  bind: ResolvedKeyBind | undefined,
  isSelected: boolean,
  maxAnisotropy: number,
  legendMode: KeycapLegendMode = 'standard',
): void {
  const palette = FINISH_PALETTES[finishId];
  paintDynamicKeycapTexture(handle.topCanvas, handle.topTexture, handle.def, palette, {
    layoutId: handle.layoutId,
    legendMode,
    layoutNormX: handle.layoutNormX,
    isBound: Boolean(bind),
    bindHint: bind?.commands[0],
    isSelected,
    maxAnisotropy,
  });
}

/**
 * Exports a procedurally constructed 3D keyboard assembly directly to binary .glb (glTF 2.0)
 * for immediate import into Unreal Engine, Godot, or C++ (tinygltf / Assimp).
 */
export async function exportKeyboardToGLB(
  spec: KeyboardModelSpec,
  finishId: MaterialFinishId,
  bindsByKey: Record<string, ResolvedKeyBind>,
): Promise<Blob> {
  const built = buildKeyboardAssembly(spec, finishId, bindsByKey, null, 4, true);
  built.root.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  try {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        built.root,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error('GLTFExporter did not return binary ArrayBuffer'));
        },
        (err) => reject(err),
        { binary: true },
      );
    });
    return new Blob([buffer], { type: 'model/gltf-binary' });
  } finally {
    built.dispose();
  }
}

/**
 * Exports a procedurally constructed 3D keyboard assembly directly to Wavefront .obj
 * for lightweight C++ engines (tinyobjloader / custom OpenGL/Vulkan loaders).
 */
export function exportKeyboardToOBJ(
  spec: KeyboardModelSpec,
  finishId: MaterialFinishId,
  bindsByKey: Record<string, ResolvedKeyBind>,
): Blob {
  const built = buildKeyboardAssembly(spec, finishId, bindsByKey, null, 1, false);
  built.root.updateMatrixWorld(true);
  const exporter = new OBJExporter();
  try {
    const objText = exporter.parse(built.root);
    return new Blob([objText], { type: 'text/plain;charset=utf-8' });
  } finally {
    built.dispose();
  }
}
