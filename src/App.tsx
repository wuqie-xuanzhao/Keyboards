import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { BlueprintEditor } from './components/BlueprintEditor';
import { ExportStudio } from './components/ExportStudio';
import { KeyboardViewport3D } from './components/KeyboardViewport3D';
import { resolveAllKeyBinds } from './core/cfgEngine';
import { createDefaultCfgProject, ROOT_CFG_ID } from './core/defaultCfgProject';
import { KEYBOARD_MODELS } from './core/keyboardLayouts';
import { createDefaultRgbProfile } from './core/rgbLighting';
import { getScancode } from './core/scancodes';
import type {
  BlueprintNode,
  CfgFile,
  KeyboardModelId,
  MaterialFinishId,
  RgbLightingProfile,
  WorkspaceTab,
} from './core/types';

const STORAGE_KEY = 'keyforge3d_cfg_project_v2';
const RGB_STORAGE_KEY = 'keyforge3d_rgb_profile_v1';

function loadInitialCfgFiles(): CfgFile[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CfgFile[];
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((f) => f.id === ROOT_CFG_ID)) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return createDefaultCfgProject();
}

function loadInitialRgbProfile(): RgbLightingProfile {
  try {
    const raw = window.localStorage.getItem(RGB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RgbLightingProfile;
      if (parsed && typeof parsed.enabled === 'boolean' && parsed.zones && parsed.zones.wasd) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return createDefaultRgbProfile();
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('viewport');
  const [modelId, setModelId] = useState<KeyboardModelId>('pro75');
  const [finishId, setFinishId] = useState<MaterialFinishId>('obsidian');
  const [cfgFiles, setCfgFiles] = useState<CfgFile[]>(loadInitialCfgFiles);
  const [rgbProfile, setRgbProfile] = useState<RgbLightingProfile>(loadInitialRgbProfile);
  const [activeCfgId, setActiveCfgId] = useState<string>(ROOT_CFG_ID);
  const [selectedKeyCode, setSelectedKeyCode] = useState<string | null>('KeyW');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfgFiles));
    } catch {
      // ignore quota errors
    }
  }, [cfgFiles]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RGB_STORAGE_KEY, JSON.stringify(rgbProfile));
    } catch {
      // ignore quota errors
    }
  }, [rgbProfile]);

  const { bindsByKey, cycleWarnings } = useMemo(
    () => resolveAllKeyBinds(ROOT_CFG_ID, cfgFiles),
    [cfgFiles],
  );

  const handleUpdateCfgFile = useCallback(
    (cfgId: string, updater: (file: CfgFile) => CfgFile) => {
      setCfgFiles((prev) => prev.map((f) => (f.id === cfgId ? updater(f) : f)));
    },
    [],
  );

  const handleCreateCfgFile = useCallback((filename: string, description: string) => {
    const newId = `cfg_${Date.now().toString(36)}`;
    const newFile: CfgFile = {
      id: newId,
      filename,
      description,
      nodes: [],
      edges: [],
    };
    setCfgFiles((prev) => [...prev, newFile]);
    setActiveCfgId(newId);
    setSelectedNodeId(null);
  }, []);

  const handleDeleteCfgFile = useCallback(
    (cfgId: string) => {
      if (cfgId === ROOT_CFG_ID) return;
      setCfgFiles((prev) => prev.filter((f) => f.id !== cfgId));
      if (activeCfgId === cfgId) {
        setActiveCfgId(ROOT_CFG_ID);
        setSelectedNodeId(null);
      }
    },
    [activeCfgId],
  );

  const handleEditKeyInBlueprint = useCallback(
    (keyCode: string) => {
      const existing = bindsByKey[keyCode];
      if (existing) {
        setActiveCfgId(existing.sourceFileId);
        setSelectedNodeId(existing.sourceNodeId);
        setActiveTab('blueprint');
        return;
      }

      // Create a new wired Key Input -> Command flow inside the active CFG (or autoexec.cfg)
      const targetFileId = activeCfgId || ROOT_CFG_ID;
      const sc = getScancode(keyCode);
      const stamp = Date.now().toString(36);
      const keyNodeId = `nk_${stamp}`;
      const cmdNodeId = `nc_${stamp}`;

      setCfgFiles((prev) =>
        prev.map((f) => {
          if (f.id !== targetFileId) return f;
          const yPos = 60 + (f.nodes.length % 5) * 110;
          const keyNode: BlueprintNode = {
            id: keyNodeId,
            type: 'key_input',
            x: 80,
            y: yPos,
            title: `按键触发 · ${sc.displayLabel}`,
            data: { keyCode, triggerMode: 'press', triggerFrequency: 16 },
          };
          const cmdNode: BlueprintNode = {
            id: cmdNodeId,
            type: 'command',
            x: 380,
            y: yPos,
            title: `执行指令 · ${sc.displayLabel}`,
            data: { commandText: `action_${sc.cfgName}` },
          };
          return {
            ...f,
            nodes: [...f.nodes, keyNode, cmdNode],
            edges: [
              ...f.edges,
              {
                id: `e_${stamp}`,
                fromNodeId: keyNodeId,
                fromPort: 'exec_out',
                toNodeId: cmdNodeId,
                toPort: 'exec_in',
              },
            ],
          };
        }),
      );

      setActiveCfgId(targetFileId);
      setSelectedNodeId(cmdNodeId);
      setActiveTab('blueprint');
    },
    [bindsByKey, activeCfgId],
  );

  const handleFocusKeyIn3D = useCallback((keyCode: string) => {
    setSelectedKeyCode(keyCode);
    setActiveTab('viewport');
  }, []);

  const handleModelChange = useCallback(
    (nextModelId: KeyboardModelId) => {
      setModelId(nextModelId);
      const spec = KEYBOARD_MODELS[nextModelId];
      if (!selectedKeyCode || !spec.keys.some((k) => k.code === selectedKeyCode)) {
        if (nextModelId === 'numpad21' && spec.keys.some((k) => k.code === 'Numpad1')) {
          setSelectedKeyCode('Numpad1');
          return;
        }
        const firstBound = spec.keys.find((k) => Boolean(bindsByKey[k.code]));
        setSelectedKeyCode(firstBound?.code ?? spec.keys[0]?.code ?? null);
      }
    },
    [selectedKeyCode, bindsByKey],
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#111317] text-[#E5E7EB]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="h-[52px] shrink-0 flex items-center justify-between gap-8 border-b border-[#232833] bg-[#14171E] px-5">
        {/* Zone 1: Single-element Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('viewport')}
          className="text-base font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0"
        >
          KeyForge 3D
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav aria-label="主工作区导航" className="flex items-center gap-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('viewport')}
            className={`relative py-3.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'viewport'
                ? 'text-[#F8FAFC] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#E59524]'
                : 'text-[#8E98A8] hover:text-[#E5E7EB]'
            }`}
          >
            3D 键盘建模
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('blueprint')}
            className={`relative py-3.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'blueprint'
                ? 'text-[#F8FAFC] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#E59524]'
                : 'text-[#8E98A8] hover:text-[#E5E7EB]'
            }`}
          >
            蓝图节点编辑器
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`relative py-3.5 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'export'
                ? 'text-[#F8FAFC] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#E59524]'
                : 'text-[#8E98A8] hover:text-[#E5E7EB]'
            }`}
          >
            C++ 与 CFG 导出
          </button>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#E59524] px-3.5 py-1.5 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 C++ 资产</span>
          </button>
        </div>
      </header>

      {/* Main Active Workspace */}
      <main className="flex-1 min-h-0 relative overflow-hidden">
        {activeTab === 'viewport' && (
          <KeyboardViewport3D
            modelId={modelId}
            onModelChange={handleModelChange}
            finishId={finishId}
            onFinishChange={setFinishId}
            bindsByKey={bindsByKey}
            selectedKeyCode={selectedKeyCode}
            onSelectKey={setSelectedKeyCode}
            onEditKeyInBlueprint={handleEditKeyInBlueprint}
            rgbProfile={rgbProfile}
            onRgbProfileChange={setRgbProfile}
          />
        )}

        {activeTab === 'blueprint' && (
          <BlueprintEditor
            cfgFiles={cfgFiles}
            activeCfgId={activeCfgId}
            selectedNodeId={selectedNodeId}
            cycleWarnings={cycleWarnings}
            modelId={modelId}
            bindsByKey={bindsByKey}
            rgbProfile={rgbProfile}
            onModelChange={handleModelChange}
            onSelectCfg={(id) => {
              setActiveCfgId(id);
            }}
            onSelectNode={setSelectedNodeId}
            onUpdateCfgFile={handleUpdateCfgFile}
            onCreateCfgFile={handleCreateCfgFile}
            onDeleteCfgFile={handleDeleteCfgFile}
            onFocusKeyIn3D={handleFocusKeyIn3D}
          />
        )}

        {activeTab === 'export' && (
          <ExportStudio
            modelId={modelId}
            onModelChange={handleModelChange}
            finishId={finishId}
            cfgFiles={cfgFiles}
            bindsByKey={bindsByKey}
            rgbProfile={rgbProfile}
          />
        )}
      </main>
    </div>
  );
}
