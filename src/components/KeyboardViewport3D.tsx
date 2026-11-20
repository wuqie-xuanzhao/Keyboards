import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  ChevronDown,
  ChevronUp,
  GitBranch,
  Layers,
  Lightbulb,
  Palette,
  Plus,
  RotateCcw,
  Sparkles,
  Type,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { KEYBOARD_MODELS, KEYBOARD_MODEL_LIST } from '../core/keyboardLayouts';
import { hasAnimatedRgbEffect } from '../core/rgbLighting';
import { getScancode } from '../core/scancodes';
import type {
  CameraPresetId,
  KeyboardModelId,
  KeycapLegendMode,
  MaterialFinishId,
  ResolvedKeyBind,
  RgbLightingProfile,
  StudioLightingPreset,
} from '../core/types';
import {
  buildKeyboardAssembly,
  type BuiltKeyboardAssembly,
  refreshKeycapTexture,
} from '../three/keyboardBuilder';
import { createOledTexture, FINISH_LIST, FINISH_PALETTES } from '../three/keyboardMaterials';
import { soundEngine } from '../three/soundEngine';
import {
  createCommercialStudioEnvMap,
  createSoftContactShadowTexture,
  createStudioDeskMatTexture,
  STUDIO_LIGHTING_PRESETS,
  STUDIO_PRESET_LIST,
} from '../three/studioEnvironment';
import { RgbLightingSidebar } from './RgbLightingSidebar';

interface KeyboardViewport3DProps {
  modelId: KeyboardModelId;
  onModelChange: (id: KeyboardModelId) => void;
  finishId: MaterialFinishId;
  onFinishChange: (id: MaterialFinishId) => void;
  bindsByKey: Record<string, ResolvedKeyBind>;
  selectedKeyCode: string | null;
  onSelectKey: (keyCode: string) => void;
  onEditKeyInBlueprint: (keyCode: string) => void;
  rgbProfile: RgbLightingProfile;
  onRgbProfileChange: (next: RgbLightingProfile) => void;
}

const CAMERA_PRESETS: Array<{
  id: CameraPresetId;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}> = [
  { id: 'isometric', label: '等轴侧', pos: [4.9, 7.6, 9.5], target: [0, -0.05, 0.72] },
  { id: 'top', label: '正俯视', pos: [0, 12.6, 1.8], target: [0, 0.0, 0.65] },
  { id: 'front', label: '低仰角', pos: [0, 2.9, 10.8], target: [0, 0.22, 0.45] },
  { id: 'side', label: '侧轮廓', pos: [11.2, 3.6, 3.4], target: [0, 0.2, 0.35] },
];

const LEGEND_MODES: Array<{ id: KeycapLegendMode; label: string }> = [
  { id: 'standard', label: '标准' },
  { id: 'glfw', label: 'GLFW' },
  { id: 'cfg', label: 'CFG' },
];

const TRIGGER_LABELS: Record<string, string> = {
  press: '按下触发',
  hold: '按住持续',
  release: '松开触发',
  toggle: '开关切换',
};

// Reusable scratch vectors outside animation loop (zero GC in render tick)
const _camGoalPos = new THREE.Vector3();
const _camGoalTarget = new THREE.Vector3();
const _pointerNdc = new THREE.Vector2();

function computeDistScale(boundingWidth: number, boundingDepth: number): number {
  // Fit both compact 4U numpad21 (w≈2.8, d≈3.5) and wide 23U full104 (w≈13.5, d≈4.4)
  const effectiveSpan = Math.max(boundingWidth, boundingDepth * 1.65);
  return Math.max(0.62, Math.min(1.52, effectiveSpan / 8.7));
}

export const KeyboardViewport3D: React.FC<KeyboardViewport3DProps> = ({
  modelId,
  onModelChange,
  finishId,
  onFinishChange,
  bindsByKey,
  selectedKeyCode,
  onSelectKey,
  onEditKeyInBlueprint,
  rgbProfile,
  onRgbProfileChange,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [exploded, setExploded] = useState(0);
  const [activeCamera, setActiveCamera] = useState<CameraPresetId>('isometric');
  const [lightingPreset, setLightingPreset] = useState<StudioLightingPreset>('studio');
  const [legendMode, setLegendMode] = useState<KeycapLegendMode>('standard');
  const [backlightEnabled, setBacklightEnabled] = useState(true);
  const [rgbSidebarOpen, setRgbSidebarOpen] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hoveredKeyCode, setHoveredKeyCode] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Mutable refs so WebGL scene stays mounted cleanly without teardown on React state updates
  const bindsRef = useRef(bindsByKey);
  bindsRef.current = bindsByKey;

  const selectedKeyRef = useRef(selectedKeyCode);
  selectedKeyRef.current = selectedKeyCode;

  const finishRef = useRef(finishId);
  finishRef.current = finishId;

  const modelIdRef = useRef(modelId);
  modelIdRef.current = modelId;

  const lightingPresetRef = useRef(lightingPreset);
  lightingPresetRef.current = lightingPreset;

  const legendModeRef = useRef(legendMode);
  legendModeRef.current = legendMode;

  const backlightEnabledRef = useRef(backlightEnabled);
  backlightEnabledRef.current = backlightEnabled;

  const explodedTargetRef = useRef(exploded);
  explodedTargetRef.current = exploded;

  const onSelectKeyRef = useRef(onSelectKey);
  onSelectKeyRef.current = onSelectKey;

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const rgbProfileRef = useRef(rgbProfile);
  rgbProfileRef.current = rgbProfile;

  // Imperative bridge into the Three.js instance
  const sceneBridgeRef = useRef<{
    rebuildKeyboard: () => void;
    syncKeyTextures: () => void;
    applyLightingPreset: (presetId: StudioLightingPreset) => void;
    pressKeyVisual: (code: string) => void;
    triggerCameraPreset: (presetId: CameraPresetId) => void;
    requestRender: () => void;
  } | null>(null);

  // 1. Mount WebGLRenderer + Commercial Studio Scene ONCE
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: isSoftwareGl,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.dataset.testid = 'keyboard-3d-canvas';
    container.appendChild(renderer.domElement);

    const initialPreset = STUDIO_LIGHTING_PRESETS[lightingPresetRef.current];
    renderer.toneMappingExposure = initialPreset.exposure;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(initialPreset.bgHex);
    scene.fog = new THREE.FogExp2(initialPreset.bgHex, initialPreset.fogDensity);

    // Commercial product-photography light-tent environment reflections
    let envRT: THREE.WebGLRenderTarget = createCommercialStudioEnvMap(
      renderer,
      lightingPresetRef.current,
    );
    scene.environment = envRT.texture;

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 100);
    camera.position.set(4.0, 5.7, 7.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.enablePan = true;
    controls.minDistance = 2.6;
    controls.maxDistance = 22;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.target.set(0, 0.08, 0.42);
    controls.update();

    // Commercial 4-Point Studio Rig + GPU Area Softboxes
    const hemiLight = new THREE.HemisphereLight(
      initialPreset.hemiSky,
      initialPreset.hemiGround,
      initialPreset.hemiIntensity,
    );
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(initialPreset.keyColor, initialPreset.keyIntensity);
    keyLight.position.set(...initialPreset.keyPos);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 28;
    const d = 10.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.018;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(initialPreset.rimColor, initialPreset.rimIntensity);
    rimLight.position.set(...initialPreset.rimPos);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(initialPreset.fillColor, initialPreset.fillIntensity);
    fillLight.position.set(8.5, 4.2, 6.2);
    scene.add(fillLight);

    // Real GPU RectAreaLight softboxes for elongated metallic specular highlights
    let softboxTop: THREE.RectAreaLight | null = null;
    let softboxSide: THREE.RectAreaLight | null = null;
    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      softboxTop = new THREE.RectAreaLight(
        initialPreset.softboxTopColor,
        initialPreset.softboxTopIntensity,
        14,
        4.2,
      );
      softboxTop.position.set(0, 6.8, -0.6);
      softboxTop.lookAt(0, 0, 0);
      scene.add(softboxTop);

      softboxSide = new THREE.RectAreaLight(
        initialPreset.softboxSideColor,
        initialPreset.softboxSideIntensity,
        10,
        2.6,
      );
      softboxSide.position.set(-8.5, 3.4, -4.5);
      softboxSide.lookAt(0, 0.2, 0);
      scene.add(softboxSide);
    }

    // Woven Studio Felt Desk Mat + Soft Double-Falloff Contact Shadow
    let deskTex = createStudioDeskMatTexture(lightingPresetRef.current);
    deskTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const deskGeo = new THREE.PlaneGeometry(42, 42);
    deskGeo.rotateX(-Math.PI / 2);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: deskTex,
      roughness: 0.92,
      metalness: 0.03,
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.y = -0.025;
    deskMesh.receiveShadow = true;
    scene.add(deskMesh);

    const shadowTex = createSoftContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = -0.004;
    scene.add(contactShadow);

    // State inside WebGL closure
    let assembly: BuiltKeyboardAssembly | null = null;
    let currentExploded = 0;
    let isCameraAnimating = false;
    const rgbStartTime = performance.now();
    let lastTime = rgbStartTime;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;
    let appliedW = width;
    let appliedH = height;
    let pendingW = width;
    let pendingH = height;

    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame((now) => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
        lastTime = now;

        let needsMoreFrames = false;

        // 1. Smoothly damp exploded mechanical layers
        const expTarget = explodedTargetRef.current;
        if (assembly && Math.abs(currentExploded - expTarget) > 0.001) {
          currentExploded = isSoftwareGl
            ? expTarget
            : THREE.MathUtils.damp(currentExploded, expTarget, 9, dt);
          if (Math.abs(currentExploded - expTarget) <= 0.001) currentExploded = expTarget;
          else needsMoreFrames = true;

          assembly.pcbLayer.position.y = currentExploded * 0.42;
          assembly.plateLayer.position.y = currentExploded * 0.85;
          assembly.switchLayer.position.y = currentExploded * 1.28;
          assembly.keycapLayer.position.y = currentExploded * 1.85;
        }

        // 2. Smooth keycap depression spring kinematics
        if (assembly) {
          assembly.keyHandles.forEach((handle) => {
            if (handle.targetPress > 0 || handle.currentPress > 0.001) {
              if (isSoftwareGl) {
                handle.currentPress = handle.targetPress;
                handle.targetPress = 0;
              } else {
                handle.currentPress = THREE.MathUtils.damp(
                  handle.currentPress,
                  handle.targetPress,
                  24,
                  dt,
                );
                if (handle.targetPress > 0 && Math.abs(handle.currentPress - handle.targetPress) < 0.015) {
                  handle.targetPress = 0;
                }
                if (handle.currentPress > 0.001 || handle.targetPress > 0) {
                  needsMoreFrames = true;
                } else {
                  handle.currentPress = 0;
                }
              }
              handle.group.position.y = handle.baseY - handle.currentPress * 0.13;
            }
          });
        }

        // 2.5. Real-time per-zone RGB LED lighting simulator (zero-GC update)
        if (assembly) {
          const elapsedSec = (now - rgbStartTime) / 1000;
          assembly.updateRgbLighting(rgbProfileRef.current, elapsedSec);
          if (hasAnimatedRgbEffect(rgbProfileRef.current)) {
            needsMoreFrames = true;
          }
        }

        // 3. Smooth camera preset transitions
        if (isCameraAnimating) {
          if (isSoftwareGl) {
            camera.position.copy(_camGoalPos);
            controls.target.copy(_camGoalTarget);
            isCameraAnimating = false;
          } else {
            const alpha = 1 - Math.exp(-8 * dt);
            camera.position.lerp(_camGoalPos, alpha);
            controls.target.lerp(_camGoalTarget, alpha);
            if (
              camera.position.distanceTo(_camGoalPos) < 0.02 &&
              controls.target.distanceTo(_camGoalTarget) < 0.02
            ) {
              camera.position.copy(_camGoalPos);
              controls.target.copy(_camGoalTarget);
              isCameraAnimating = false;
            } else {
              needsMoreFrames = true;
            }
          }
        }

        if (controls.enableDamping) {
          controls.update();
        } else {
          camera.lookAt(controls.target);
        }

        if (pendingW !== appliedW || pendingH !== appliedH) {
          appliedW = pendingW;
          appliedH = pendingH;
          camera.aspect = appliedW / appliedH;
          camera.updateProjectionMatrix();
          renderer.setSize(appliedW, appliedH, false);
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty || needsMoreFrames) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const applyLightingPreset = (presetId: StudioLightingPreset) => {
      const cfg = STUDIO_LIGHTING_PRESETS[presetId];
      renderer.toneMappingExposure = cfg.exposure;
      scene.background = new THREE.Color(cfg.bgHex);
      scene.fog = new THREE.FogExp2(cfg.bgHex, cfg.fogDensity);

      const nextEnv = createCommercialStudioEnvMap(renderer, presetId);
      const prevEnv = envRT;
      envRT = nextEnv;
      scene.environment = envRT.texture;
      prevEnv.dispose();

      hemiLight.color.setHex(cfg.hemiSky);
      hemiLight.groundColor.setHex(cfg.hemiGround);
      hemiLight.intensity = cfg.hemiIntensity;

      keyLight.color.setHex(cfg.keyColor);
      keyLight.intensity = cfg.keyIntensity;
      keyLight.position.set(...cfg.keyPos);

      rimLight.color.setHex(cfg.rimColor);
      rimLight.intensity = cfg.rimIntensity;
      rimLight.position.set(...cfg.rimPos);

      fillLight.color.setHex(cfg.fillColor);
      fillLight.intensity = cfg.fillIntensity;

      if (softboxTop && softboxSide) {
        softboxTop.color.setHex(cfg.softboxTopColor);
        softboxTop.intensity = cfg.softboxTopIntensity;
        softboxSide.color.setHex(cfg.softboxSideColor);
        softboxSide.intensity = cfg.softboxSideIntensity;
      }

      const nextDeskTex = createStudioDeskMatTexture(presetId);
      nextDeskTex.anisotropy = maxAnisotropy;
      const prevDeskTex = deskTex;
      deskTex = nextDeskTex;
      deskMat.map = deskTex;
      deskMat.needsUpdate = true;
      prevDeskTex.dispose();

      requestRender();
    };

    const rebuildKeyboard = () => {
      if (assembly) {
        scene.remove(assembly.root);
        assembly.dispose();
        assembly = null;
      }
      const spec = KEYBOARD_MODELS[modelIdRef.current];
      assembly = buildKeyboardAssembly(
        spec,
        finishRef.current,
        bindsRef.current,
        selectedKeyRef.current,
        maxAnisotropy,
        backlightEnabledRef.current,
        legendModeRef.current,
      );
      scene.add(assembly.root);

      // Fit double-falloff contact shadow snugly to keyboard footprint
      contactShadow.scale.set(assembly.boundingWidth * 1.38, 1, assembly.boundingDepth * 1.52);

      // Preserve exploded layer offsets immediately
      assembly.pcbLayer.position.y = currentExploded * 0.42;
      assembly.plateLayer.position.y = currentExploded * 0.85;
      assembly.switchLayer.position.y = currentExploded * 1.28;
      assembly.keycapLayer.position.y = currentExploded * 1.85;

      // Apply current RGB lighting profile immediately before first frame paint
      assembly.updateRgbLighting(
        rgbProfileRef.current,
        (performance.now() - rgbStartTime) / 1000,
      );

      // Auto-frame camera cleanly for all form factors (4U numpad -> 23U 100% full-size)
      const distScale = computeDistScale(assembly.boundingWidth, assembly.boundingDepth);
      const preset = CAMERA_PRESETS[0];
      _camGoalPos.set(
        preset.pos[0] * distScale,
        preset.pos[1] * distScale,
        preset.pos[2] * distScale,
      );
      _camGoalTarget.set(
        preset.target[0],
        preset.target[1],
        preset.target[2] * Math.min(1.1, distScale),
      );
      isCameraAnimating = true;

      requestRender();
    };

    const syncKeyTextures = () => {
      if (!assembly) return;
      assembly.keyHandles.forEach((handle, code) => {
        refreshKeycapTexture(
          handle,
          finishRef.current,
          bindsRef.current[code],
          selectedKeyRef.current === code,
          maxAnisotropy,
          legendModeRef.current,
        );
      });
      if (assembly.oledMesh) {
        const mat = assembly.oledMesh.material as THREE.MeshStandardMaterial;
        const sc = selectedKeyRef.current ? getScancode(selectedKeyRef.current).displayLabel : 'READY';
        const nextTex = createOledTexture(sc, Object.keys(bindsRef.current).length);
        const old = assembly.oledTexture;
        mat.map = nextTex;
        mat.emissiveMap = nextTex;
        mat.needsUpdate = true;
        assembly.oledTexture = nextTex;
        old?.dispose();
      }
      requestRender();
    };

    const pressKeyVisual = (code: string) => {
      if (!assembly) return;
      const handle = assembly.keyHandles.get(code);
      if (handle) {
        handle.targetPress = 1;
        if (soundEnabledRef.current) {
          soundEngine.enabled = true;
          soundEngine.playSwitchThock(0.92 + (handle.def.w > 1.5 ? -0.14 : Math.random() * 0.14));
        }
        requestRender();
      }
    };

    const triggerCameraPreset = (presetId: CameraPresetId) => {
      const preset = CAMERA_PRESETS.find((p) => p.id === presetId) ?? CAMERA_PRESETS[0];
      const distScale = assembly
        ? computeDistScale(assembly.boundingWidth, assembly.boundingDepth)
        : 1;
      _camGoalPos.set(
        preset.pos[0] * distScale,
        preset.pos[1] * distScale,
        preset.pos[2] * distScale,
      );
      _camGoalTarget.set(
        preset.target[0],
        preset.target[1],
        preset.target[2] * Math.min(1.1, distScale),
      );
      isCameraAnimating = true;
      requestRender();
    };

    sceneBridgeRef.current = {
      rebuildKeyboard,
      syncKeyTextures,
      applyLightingPreset,
      pressKeyVisual,
      triggerCameraPreset,
      requestRender,
    };

    // Initial build + immediate synchronous first paint so canvas is never blank
    rebuildKeyboard();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    if (isCameraAnimating && isSoftwareGl) {
      camera.position.copy(_camGoalPos);
      controls.target.copy(_camGoalTarget);
      camera.lookAt(controls.target);
      isCameraAnimating = false;
    }
    renderer.render(scene, camera);

    // Repaint dynamic Canvas2D keycap legends cleanly once web fonts finish loading
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!disposed) syncKeyTextures();
      });
    }

    const onControlStart = () => {
      isCameraAnimating = false;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('change', onControlChange);

    // Raycasting: discriminate drag vs click (< 6px travel) + throttled hover
    const raycaster = new THREE.Raycaster();
    let downX = 0;
    let downY = 0;
    let lastHoverTime = 0;

    const raycastKey = (clientX: number, clientY: number): string | null => {
      if (!assembly) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_pointerNdc, camera);
      const hits = raycaster.intersectObjects(assembly.clickableMeshes, false);
      if (hits.length > 0) {
        const code = hits[0].object.userData.keyCode;
        return typeof code === 'string' ? code : null;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;
      const hitCode = raycastKey(e.clientX, e.clientY);
      if (hitCode) {
        pressKeyVisual(hitCode);
        onSelectKeyRef.current(hitCode);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      const hitCode = raycastKey(e.clientX, e.clientY);
      renderer.domElement.style.cursor = hitCode ? 'pointer' : 'grab';
      setHoveredKeyCode((prev) => (prev === hitCode ? prev : hitCode));
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.repeat) return;
      if (assembly && assembly.keyHandles.has(e.code)) {
        pressKeyVisual(e.code);
        onSelectKeyRef.current(e.code);
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
      requestRender();
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);
    window.addEventListener('keydown', onKeyDown);

    const resizeObserver = new ResizeObserver(() => {
      if (!container || disposed) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(240, container.clientHeight);
      if (w === pendingW && h === pendingH) return;
      pendingW = w;
      pendingH = h;
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('change', onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      window.removeEventListener('keydown', onKeyDown);
      if (assembly) assembly.dispose();
      deskGeo.dispose();
      deskMat.dispose();
      deskTex.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTex.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneBridgeRef.current = null;
    };
  }, []);

  // Skip initial mount duplicate runs (useEffect(..., []) already built initial scene once)
  const didInitModelRef = useRef(false);
  useEffect(() => {
    if (!didInitModelRef.current) {
      didInitModelRef.current = true;
      return;
    }
    sceneBridgeRef.current?.rebuildKeyboard();
  }, [modelId, finishId, backlightEnabled]);

  const didInitLightingRef = useRef(false);
  useEffect(() => {
    if (!didInitLightingRef.current) {
      didInitLightingRef.current = true;
      return;
    }
    sceneBridgeRef.current?.applyLightingPreset(lightingPreset);
  }, [lightingPreset]);

  const didInitTexturesRef = useRef(false);
  useEffect(() => {
    if (!didInitTexturesRef.current) {
      didInitTexturesRef.current = true;
      return;
    }
    sceneBridgeRef.current?.syncKeyTextures();
  }, [selectedKeyCode, bindsByKey, legendMode]);

  const didInitExplodedRef = useRef(false);
  useEffect(() => {
    if (!didInitExplodedRef.current) {
      didInitExplodedRef.current = true;
      return;
    }
    sceneBridgeRef.current?.requestRender();
  }, [exploded]);

  const didInitRgbRef = useRef(false);
  useEffect(() => {
    if (!didInitRgbRef.current) {
      didInitRgbRef.current = true;
      return;
    }
    sceneBridgeRef.current?.requestRender();
  }, [rgbProfile]);

  const currentModel = KEYBOARD_MODELS[modelId];
  const currentFinish = FINISH_PALETTES[finishId];
  const isLightBackdrop = lightingPreset === 'softday';
  const selectedBind = selectedKeyCode ? bindsByKey[selectedKeyCode] : undefined;
  const selectedScancode = selectedKeyCode ? getScancode(selectedKeyCode) : null;
  const hoveredScancode = hoveredKeyCode ? getScancode(hoveredKeyCode) : null;
  const boundKeysCount = currentModel.keys.filter((k) => Boolean(bindsByKey[k.code])).length;
  const sampleKeyCode = modelId === 'numpad21' ? 'Numpad1' : 'KeyW';
  const sampleKeyLabel = modelId === 'numpad21' ? 'Num 1' : 'W';

  return (
    <div
      className={`flex w-full h-full overflow-hidden ${isLightBackdrop ? 'bg-[#ebe6eb]' : 'bg-[#0e1117]'}`}
      data-testid="viewport-3d-shell"
    >
      {/* Left Flex Pane: 3D WebGL Viewport + HUD + Bottom Dock */}
      <div className="relative flex-1 min-w-0 h-full overflow-hidden">
        {/* Dedicated isolated WebGL canvas container (zero React children inside) */}
        <div ref={canvasMountRef} className="w-full h-full" />

        {contextLost && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0e1117]/95">
            <div className="max-w-sm border border-[#2a303c] bg-[#181c23] p-6 text-center rounded-lg">
              <p className="text-sm font-medium text-[#E5E7EB]">WebGL 渲染上下文已暂停</p>
              <p className="mt-2 text-xs text-[#94A3B8]">请刷新页面恢复 3D 视口。</p>
            </div>
          </div>
        )}

        {/* Minimal Top-Left Model Spec Readout */}
        <div className="pointer-events-none absolute top-4 left-5 z-10 flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <h1
              className={`text-base font-semibold tracking-tight ${
                isLightBackdrop ? 'text-[#23202B]' : 'text-[#F3F4F6]'
              }`}
            >
              {currentModel.name}
            </h1>
            <span
              className={`text-xs tabular-nums ${
                isLightBackdrop ? 'text-[#5C5368]' : 'text-[#94A3B8]'
              }`}
            >
              {currentModel.formFactor} · {currentFinish.name} · 已绑定 {boundKeysCount} 键
            </span>
          </div>
          <p className={`text-xs ${isLightBackdrop ? 'text-[#6A6075]' : 'text-[#7F8A9C]'}`}>
            左键拖拽旋转 · 右键平移 · 滚轮缩放 · 点击 3D 按键或敲击实体键盘查看 Bind
            {hoveredScancode && (
              <span
                className={`ml-2 font-mono font-medium ${
                  isLightBackdrop ? 'text-[#B84374]' : 'text-[#E59524]'
                }`}
              >
                悬停: {hoveredScancode.displayLabel} ({hoveredScancode.glfw})
              </span>
            )}
          </p>
        </div>

        {/* Re-open RGB Sidebar Button when collapsed */}
        {!rgbSidebarOpen && (
          <div className="absolute top-4 right-4 z-20">
            <button
              type="button"
              data-testid="open-rgb-sidebar-btn"
              onClick={() => setRgbSidebarOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2D3443] bg-[#151922] px-3 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#E59524]/70 hover:text-white shadow-lg transition-colors"
            >
              <Palette className="w-3.5 h-3.5 text-[#E59524]" />
              <span>RGB 灯光模拟器</span>
            </button>
          </div>
        )}

        {/* Unified Collapsible Bottom Control Dock (scoped to 3D viewport pane) */}
        <div className="pointer-events-none absolute bottom-4 inset-x-0 z-20 flex justify-center px-3">
          <div
            className="w-[min(1080px,98%)] transition-transform duration-200 ease-out"
            style={{
              transform: dockCollapsed ? 'translateY(calc(100% - 28px))' : 'translateY(0)',
            }}
          >
          {/* Collapse / Expand Handle */}
          <div className="flex justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setDockCollapsed((v) => !v)}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-t-md border border-b-0 border-[#2D3340] bg-[#151820] px-3.5 py-1 text-xs font-medium text-[#B6C0CF] hover:text-white transition-colors"
              aria-label={dockCollapsed ? '展开 3D 控制栏' : '收起 3D 控制栏'}
            >
              {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{dockCollapsed ? '展开控制与键位面板' : '收起控制栏'}</span>
            </button>
          </div>

          <div className="pointer-events-auto rounded-xl border border-[#2A303D] bg-[#141820]/96 shadow-2xl overflow-hidden">
            {/* Row 1: Selected Key Bind Inspection Strip */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222834] bg-[#191E28] px-4 py-2"
              data-testid="selected-key-inspector"
            >
              {selectedKeyCode && selectedScancode ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center min-w-[44px] h-8 px-2.5 rounded-md border border-[#E59524]/60 bg-[#232834] font-mono text-sm font-semibold text-[#F8FAFC]">
                      {selectedScancode.displayLabel}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-mono">
                        <span className="text-[#E5E7EB] font-medium">{selectedScancode.glfw}</span>
                        <span aria-hidden="true">/</span>
                        <span>{selectedScancode.sdl2}</span>
                        <span aria-hidden="true">/</span>
                        <span>cfg: &quot;{selectedScancode.cfgName}&quot;</span>
                      </div>
                      {selectedBind ? (
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-[#E59524] font-medium">
                            {selectedBind.summary}
                          </span>
                          <span className="text-[#64748B]" aria-hidden="true">·</span>
                          <span className="text-[#94A3B8]">
                            {TRIGGER_LABELS[selectedBind.triggerMode] ?? selectedBind.triggerMode}
                          </span>
                          <span className="text-[#64748B]" aria-hidden="true">·</span>
                          <span className="font-mono text-[#68B598]" title="嵌套 CFG 加载路径">
                            {selectedBind.includeChain.join(' → ')}
                          </span>
                        </div>
                      ) : (
                        <div className="mt-0.5 text-xs text-[#7F8A9C]">
                          当前键位尚未在蓝图中绑定指令
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditKeyInBlueprint(selectedKeyCode)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#E59524] px-3 py-1.5 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] transition-colors whitespace-nowrap shrink-0"
                  >
                    {selectedBind ? (
                      <>
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>在蓝图中编辑流程</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>在蓝图中绑定此键</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="flex items-center justify-between w-full text-xs text-[#94A3B8]">
                  <span>点击 3D 键盘上任意按键（带橙色底条为已绑定键位），查看对应的 C++ 键码与嵌套 .cfg 执行链。</span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectKey(sampleKeyCode);
                      sceneBridgeRef.current?.pressKeyVisual(sampleKeyCode);
                    }}
                    className="text-[#E59524] hover:underline font-medium whitespace-nowrap shrink-0 ml-4"
                  >
                    示例：选中 {sampleKeyLabel} 键
                  </button>
                </div>
              )}
            </div>

            {/* Row 2: 6 Keyboard Models + Material Finishes */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#202632] px-4 py-2">
              <div className="flex items-center gap-1 bg-[#0F1218] p-1 rounded-lg border border-[#222834] overflow-x-auto">
                {KEYBOARD_MODEL_LIST.map((m) => {
                  const active = m.id === modelId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onModelChange(m.id)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#262C38] text-[#F8FAFC]'
                          : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                      }`}
                    >
                      {m.shortName}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-4">
                {/* Material Finishes */}
                <div className="flex items-center gap-2" role="group" aria-label="材质涂装切换">
                  <span className="text-xs text-[#8E98A8] whitespace-nowrap">涂装</span>
                  <div className="flex items-center gap-1.5">
                    {FINISH_LIST.map((f) => {
                      const active = f.id === finishId;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => onFinishChange(f.id)}
                          title={f.name}
                          aria-label={`材质涂装：${f.name}`}
                          className={`w-5 h-5 rounded-md border transition-transform ${
                            active
                              ? 'border-[#E59524] scale-115 ring-1 ring-[#E59524]/70'
                              : 'border-[#3A4252] hover:border-[#8B95A8]'
                          }`}
                          style={{ background: f.swatchGradient ?? f.swatchHex }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Backlight Diffuser Toggle */}
                <button
                  type="button"
                  onClick={() => setBacklightEnabled((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    backlightEnabled
                      ? 'border-[#E59524]/50 bg-[#252018] text-[#F5B958]'
                      : 'border-[#2B313E] bg-[#161A22] text-[#8E98A8] hover:text-[#E5E7EB]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>柔光背光</span>
                </button>

                {/* RGB Lighting Simulator Sidebar Toggle */}
                <button
                  type="button"
                  data-testid="toggle-rgb-sidebar-btn"
                  onClick={() => setRgbSidebarOpen((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    rgbSidebarOpen
                      ? 'border-[#E59524]/60 bg-[#252018] text-[#F5B958]'
                      : 'border-[#2B313E] bg-[#161A22] text-[#8E98A8] hover:text-[#E5E7EB]'
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>RGB 灯光</span>
                </button>
              </div>
            </div>

            {/* Row 3: Commercial Studio Lighting + Exploded Layers + Camera Presets */}
            <div className="flex flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5 px-3.5 py-1.5">
              {/* Studio Lighting Presets */}
              <div className="flex items-center gap-1.5" role="group" aria-label="影棚布光方案">
                <Lightbulb className="w-3.5 h-3.5 text-[#8E98A8] shrink-0" />
                <span className="text-[11px] text-[#8E98A8] whitespace-nowrap">光影</span>
                <div className="flex items-center gap-0.5 bg-[#0F1218] p-0.5 rounded-md border border-[#222834]">
                  {STUDIO_PRESET_LIST.map((p) => {
                    const active = p.id === lightingPreset;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setLightingPreset(p.id)}
                        className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#262C38] text-[#F8FAFC]'
                            : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Scancode Legend Mode */}
              <div className="flex items-center gap-1.5" role="group" aria-label="键帽动态字符模式">
                <Type className="w-3.5 h-3.5 text-[#8E98A8] shrink-0" />
                <span className="text-[11px] text-[#8E98A8] whitespace-nowrap">字符</span>
                <div className="flex items-center gap-0.5 bg-[#0F1218] p-0.5 rounded-md border border-[#222834]">
                  {LEGEND_MODES.map((mode) => {
                    const active = mode.id === legendMode;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setLegendMode(mode.id)}
                        className={`px-1.5 py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#262C38] text-[#F8FAFC]'
                            : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Exploded Mechanical Layers Slider */}
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#8E98A8] shrink-0" />
                <label htmlFor="exploded-slider" className="text-[11px] text-[#8E98A8] whitespace-nowrap">
                  爆炸图
                </label>
                <input
                  id="exploded-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={exploded}
                  onChange={(e) => setExploded(parseFloat(e.target.value))}
                  className="w-16 accent-[#E59524] cursor-pointer"
                  aria-label="结构爆炸视图展开比例"
                />
                <span className="w-7 text-right font-mono text-[11px] text-[#B6C0CF] tabular-nums">
                  {Math.round(exploded * 100)}%
                </span>
              </div>

              {/* Camera Presets & Audio Toggle */}
              <div className="flex items-center gap-1">
                {CAMERA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setActiveCamera(preset.id);
                      sceneBridgeRef.current?.triggerCameraPreset(preset.id);
                    }}
                    className={`px-1.5 py-1 rounded text-[11px] transition-colors whitespace-nowrap shrink-0 ${
                      activeCamera === preset.id
                        ? 'bg-[#252B36] text-[#F8FAFC]'
                        : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setExploded(0);
                    setActiveCamera('isometric');
                    sceneBridgeRef.current?.triggerCameraPreset('isometric');
                  }}
                  aria-label="重置视角与爆炸图"
                  title="重置视角"
                  className="p-1 rounded text-[#8E98A8] hover:text-[#E5E7EB] hover:bg-[#242934] transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSoundEnabled((s) => !s)}
                  aria-label={soundEnabled ? '关闭机械轴音效' : '开启机械轴音效'}
                  title={soundEnabled ? '机械轴音效：开' : '机械轴音效：关'}
                  className={`p-1 rounded transition-colors ${
                    soundEnabled
                      ? 'text-[#E59524] hover:bg-[#242934]'
                      : 'text-[#64748B] hover:text-[#E5E7EB] hover:bg-[#242934]'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Right Flex Sibling: Per-Zone RGB Lighting Simulator Sidebar */}
      {rgbSidebarOpen && (
        <RgbLightingSidebar
          profile={rgbProfile}
          onChange={onRgbProfileChange}
          onClose={() => setRgbSidebarOpen(false)}
        />
      )}
    </div>
  );
};
