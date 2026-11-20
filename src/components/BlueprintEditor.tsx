import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  FileCode2,
  Flame,
  FolderTree,
  GitBranch,
  Keyboard,
  Link2,
  Maximize2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { buildCfgIncludeTree, compileCfgFile } from '../core/cfgEngine';
import { ROOT_CFG_ID } from '../core/defaultCfgProject';
import { getEffectiveTriggerFrequency, getThermalKeyStyle } from '../core/heatmapAnalytics';
import { ALL_SCANCODES, getScancode } from '../core/scancodes';
import type {
  BlueprintEdge,
  BlueprintNode,
  BlueprintNodeType,
  CfgFile,
  CfgIncludeTreeNode,
  KeyboardModelId,
  ResolvedKeyBind,
  RgbLightingProfile,
  TriggerMode,
} from '../core/types';
import { BlueprintHeatmapView } from './BlueprintHeatmapView';

interface BlueprintEditorProps {
  cfgFiles: CfgFile[];
  activeCfgId: string;
  selectedNodeId: string | null;
  cycleWarnings: string[];
  modelId: KeyboardModelId;
  bindsByKey: Record<string, ResolvedKeyBind>;
  rgbProfile: RgbLightingProfile;
  onModelChange: (id: KeyboardModelId) => void;
  onSelectCfg: (cfgId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateCfgFile: (cfgId: string, updater: (file: CfgFile) => CfgFile) => void;
  onCreateCfgFile: (filename: string, description: string) => void;
  onDeleteCfgFile: (cfgId: string) => void;
  onFocusKeyIn3D: (keyCode: string) => void;
}

const NODE_WIDTH = 210;
const NODE_HEADER_H = 34;

const NODE_META: Record<
  BlueprintNodeType,
  { label: string; headerBg: string; accent: string; hasIn: boolean; hasOut: boolean }
> = {
  key_input: {
    label: '按键触发',
    headerBg: '#3A2A14',
    accent: '#E59524',
    hasIn: false,
    hasOut: true,
  },
  modifier_gate: {
    label: '条件/修饰门',
    headerBg: '#27233A',
    accent: '#9A8AE8',
    hasIn: true,
    hasOut: true,
  },
  alias_macro: {
    label: '宏 / Alias',
    headerBg: '#362318',
    accent: '#D97B48',
    hasIn: true,
    hasOut: true,
  },
  command: {
    label: '游戏指令',
    headerBg: '#19293D',
    accent: '#4C9AFF',
    hasIn: true,
    hasOut: true,
  },
  delay: {
    label: '延时 Wait',
    headerBg: '#192F32',
    accent: '#4DB6AC',
    hasIn: true,
    hasOut: true,
  },
  exec_cfg: {
    label: '嵌套 Exec CFG',
    headerBg: '#173026',
    accent: '#34B38A',
    hasIn: true,
    hasOut: true,
  },
};

function getPortPosition(node: BlueprintNode, side: 'in' | 'out'): { x: number; y: number } {
  return {
    x: side === 'in' ? node.x : node.x + NODE_WIDTH,
    y: node.y + NODE_HEADER_H + 22,
  };
}

function makeBezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.max(55, Math.abs(x2 - x1) * 0.55);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export const BlueprintEditor: React.FC<BlueprintEditorProps> = ({
  cfgFiles,
  activeCfgId,
  selectedNodeId,
  cycleWarnings,
  modelId,
  bindsByKey,
  rgbProfile,
  onModelChange,
  onSelectCfg,
  onSelectNode,
  onUpdateCfgFile,
  onCreateCfgFile,
  onDeleteCfgFile,
  onFocusKeyIn3D,
}) => {
  const activeFile = cfgFiles.find((f) => f.id === activeCfgId) ?? cfgFiles[0];
  const selectedNode = activeFile?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  const [centerView, setCenterView] = useState<'graph' | 'heatmap'>('graph');
  const [heatmapSelectedKey, setHeatmapSelectedKey] = useState<string | null>('KeyW');

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState({ x: 32, y: 28 });
  const [zoom, setZoom] = useState(1);

  // Dragging states
  const [draggingNode, setDraggingNode] = useState<{
    id: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const [panning, setPanning] = useState<{
    startClientX: number;
    startClientY: number;
    origPanX: number;
    origPanY: number;
  } | null>(null);

  const [connecting, setConnecting] = useState<{
    fromNodeId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isRecordingKey, setIsRecordingKey] = useState(false);
  const [copiedCfg, setCopiedCfg] = useState(false);

  // New CFG modal/inline state
  const [creatingCfg, setCreatingCfg] = useState(false);
  const [newCfgName, setNewCfgName] = useState('');
  const [newCfgDesc, setNewCfgDesc] = useState('');
  const [newCfgError, setNewCfgError] = useState('');

  const includeTree = useMemo(
    () => buildCfgIncludeTree(ROOT_CFG_ID, cfgFiles),
    [cfgFiles],
  );

  const compiledCfgText = useMemo(
    () => (activeFile ? compileCfgFile(activeFile, cfgFiles, rgbProfile) : ''),
    [activeFile, cfgFiles, rgbProfile],
  );

  // Convert client coordinates into world graph coordinates
  const clientToGraph = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  };

  // Global pointer move/up for node dragging, panning, and wire creation
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (draggingNode && activeFile) {
        const dx = (e.clientX - draggingNode.startClientX) / zoom;
        const dy = (e.clientY - draggingNode.startClientY) / zoom;
        const nextX = Math.round((draggingNode.origX + dx) / 8) * 8;
        const nextY = Math.round((draggingNode.origY + dy) / 8) * 8;
        onUpdateCfgFile(activeFile.id, (f) => ({
          ...f,
          nodes: f.nodes.map((n) => (n.id === draggingNode.id ? { ...n, x: nextX, y: nextY } : n)),
        }));
      } else if (panning) {
        setPan({
          x: panning.origPanX + (e.clientX - panning.startClientX),
          y: panning.origPanY + (e.clientY - panning.startClientY),
        });
      } else if (connecting) {
        const pt = clientToGraph(e.clientX, e.clientY);
        setConnecting((prev) => (prev ? { ...prev, mouseX: pt.x, mouseY: pt.y } : null));
      }
    };

    const onUp = () => {
      if (draggingNode) setDraggingNode(null);
      if (panning) setPanning(null);
      if (connecting) setConnecting(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [draggingNode, panning, connecting, zoom, activeFile, onUpdateCfgFile]);

  // Physical key recording for key_input node
  useEffect(() => {
    if (!isRecordingKey || !selectedNode || !activeFile) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const sc = getScancode(e.code);
      onUpdateCfgFile(activeFile.id, (f) => ({
        ...f,
        nodes: f.nodes.map((n) =>
          n.id === selectedNode.id
            ? {
                ...n,
                title: `按键触发 · ${sc.displayLabel}`,
                data: { ...n.data, keyCode: e.code },
              }
            : n,
        ),
      }));
      setIsRecordingKey(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isRecordingKey, selectedNode, activeFile, onUpdateCfgFile]);

  const handleAddNode = (type: BlueprintNodeType) => {
    if (!activeFile) return;
    const id = `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const offsetCount = activeFile.nodes.length;
    const baseX = Math.round((120 + (offsetCount % 3) * 260 - pan.x) / zoom);
    const baseY = Math.round((90 + Math.floor(offsetCount / 3) * 145 - pan.y) / zoom);

    let newNode: BlueprintNode;
    if (type === 'key_input') {
      newNode = {
        id,
        type,
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: '按键触发 · T',
        data: { keyCode: 'KeyT', triggerMode: 'press', triggerFrequency: 15 },
      };
    } else if (type === 'modifier_gate') {
      newNode = {
        id,
        type,
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: '条件门 · 修饰判断',
        data: { condition: 'input.shift_held == true' },
      };
    } else if (type === 'alias_macro') {
      newNode = {
        id,
        type,
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: '宏别名 · +custom_macro',
        data: { aliasName: '+custom_macro', note: '复合指令宏' },
      };
    } else if (type === 'delay') {
      newNode = {
        id,
        type,
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: '延时等待',
        data: { delayMs: 20 },
      };
    } else if (type === 'exec_cfg') {
      const other = cfgFiles.find((f) => f.id !== activeFile.id) ?? cfgFiles[0];
      newNode = {
        id,
        type,
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: `嵌套加载 · ${other.filename}`,
        data: { targetCfgId: other.id, note: '执行子配置文件' },
      };
    } else {
      newNode = {
        id,
        type: 'command',
        x: Math.max(40, baseX),
        y: Math.max(40, baseY),
        title: '执行游戏指令',
        data: { commandText: 'say_team "Action Triggered"' },
      };
    }

    onUpdateCfgFile(activeFile.id, (f) => ({
      ...f,
      nodes: [...f.nodes, newNode],
    }));
    onSelectNode(id);
  };

  const handleCompleteConnection = (toNodeId: string) => {
    if (!connecting || !activeFile) return;
    if (connecting.fromNodeId === toNodeId) {
      setConnecting(null);
      return;
    }
    const exists = activeFile.edges.some(
      (e) => e.fromNodeId === connecting.fromNodeId && e.toNodeId === toNodeId,
    );
    if (!exists) {
      const edge: BlueprintEdge = {
        id: `edge_${Date.now().toString(36)}`,
        fromNodeId: connecting.fromNodeId,
        fromPort: 'exec_out',
        toNodeId,
        toPort: 'exec_in',
      };
      onUpdateCfgFile(activeFile.id, (f) => ({
        ...f,
        edges: [...f.edges, edge],
      }));
    }
    setConnecting(null);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!activeFile) return;
    onUpdateCfgFile(activeFile.id, (f) => ({
      ...f,
      nodes: f.nodes.filter((n) => n.id !== nodeId),
      edges: f.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    }));
    if (selectedNodeId === nodeId) onSelectNode(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    if (!activeFile) return;
    onUpdateCfgFile(activeFile.id, (f) => ({
      ...f,
      edges: f.edges.filter((e) => e.id !== edgeId),
    }));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
  };

  const handleUpdateNodeFrequency = (fileId: string, nodeId: string, frequency: number) => {
    const safeFreq = Math.max(0, Math.min(200, Math.round(frequency)));
    onUpdateCfgFile(fileId, (f) => ({
      ...f,
      nodes: f.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, triggerFrequency: safeFreq } } : n,
      ),
    }));
  };

  const handleCreateNodeForHeatmapKey = (keyCode: string) => {
    const targetFile = activeFile ?? cfgFiles[0];
    if (!targetFile) return;
    const sc = getScancode(keyCode);
    const stamp = Date.now().toString(36);
    const keyNodeId = `nk_${stamp}`;
    const cmdNodeId = `nc_${stamp}`;
    const yPos = 60 + (targetFile.nodes.length % 5) * 120;

    onUpdateCfgFile(targetFile.id, (f) => ({
      ...f,
      nodes: [
        ...f.nodes,
        {
          id: keyNodeId,
          type: 'key_input',
          x: 80,
          y: yPos,
          title: `按键触发 · ${sc.displayLabel}`,
          data: { keyCode, triggerMode: 'press', triggerFrequency: 18 },
        },
        {
          id: cmdNodeId,
          type: 'command',
          x: 360,
          y: yPos,
          title: `执行指令 · ${sc.displayLabel}`,
          data: { commandText: `action_${sc.cfgName}` },
        },
      ],
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
    }));
    setHeatmapSelectedKey(keyCode);
    onSelectNode(keyNodeId);
  };

  const handleSubmitNewCfg = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newCfgName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    if (!cleaned) {
      setNewCfgError('请输入合法的英文文件名');
      return;
    }
    const finalName = cleaned.endsWith('.cfg') ? cleaned : `${cleaned}.cfg`;
    if (cfgFiles.some((f) => f.filename.toLowerCase() === finalName)) {
      setNewCfgError('该 .cfg 文件已存在');
      return;
    }
    onCreateCfgFile(finalName, newCfgDesc.trim() || '自定义嵌套按键配置');
    setNewCfgName('');
    setNewCfgDesc('');
    setNewCfgError('');
    setCreatingCfg(false);
  };

  const handleCopyCompiled = async () => {
    try {
      await navigator.clipboard.writeText(compiledCfgText);
      setCopiedCfg(true);
      setTimeout(() => setCopiedCfg(false), 1800);
    } catch {
      // ignore clipboard denial in headless context
    }
  };

  const renderTreeNode = (treeNode: CfgIncludeTreeNode) => {
    const isActive = treeNode.fileId === activeFile?.id;
    return (
      <div key={`${treeNode.fileId}_${treeNode.depth}_${treeNode.isCycle ? 'cyc' : 'ok'}`}>
        <button
          type="button"
          onClick={() => onSelectCfg(treeNode.fileId)}
          style={{ paddingLeft: `${12 + treeNode.depth * 14}px` }}
          className={`w-full flex items-center justify-between gap-2 pr-2.5 py-1.5 text-left text-xs rounded transition-colors ${
            isActive
              ? 'bg-[#262C38] text-[#F8FAFC] font-medium'
              : 'text-[#9CA7B8] hover:bg-[#1E222B] hover:text-[#E5E7EB]'
          }`}
        >
          <span className="flex items-center gap-1.5 truncate font-mono">
            {treeNode.isCycle ? (
              <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
            ) : (
              <FileCode2 className="w-3.5 h-3.5 text-[#34B38A] shrink-0" />
            )}
            <span className="truncate">{treeNode.filename}</span>
          </span>
          <span className="text-[11px] text-[#64748B] tabular-nums shrink-0">
            {treeNode.isCycle ? '循环!' : `${treeNode.bindCount} 键`}
          </span>
        </button>
        {treeNode.children.map((child) => renderTreeNode(child))}
      </div>
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#111317]" data-testid="blueprint-editor">
      {/* LEFT SIDEBAR: CFG Files & Recursive Nesting Tree */}
      <aside className="w-[244px] shrink-0 border-r border-[#242934] bg-[#15181F] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#242934]">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-[#E59524]" />
            <h2 className="text-xs font-semibold text-[#E5E7EB]">CFG 文件与嵌套树</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setCreatingCfg((v) => !v);
              setNewCfgError('');
            }}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[#E59524] hover:bg-[#232833] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建 CFG</span>
          </button>
        </div>

        {/* Inline New CFG Creator */}
        {creatingCfg && (
          <form onSubmit={handleSubmitNewCfg} className="p-3 border-b border-[#242934] bg-[#1A1E27] space-y-2">
            <label className="block text-[11px] text-[#94A3B8]" htmlFor="new-cfg-name">
              文件名（自动补全 .cfg）
            </label>
            <input
              id="new-cfg-name"
              type="text"
              value={newCfgName}
              onChange={(e) => {
                setNewCfgName(e.target.value);
                setNewCfgError('');
              }}
              placeholder="例如: buy_binds"
              className="w-full rounded border border-[#323948] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#F3F4F6] focus:border-[#E59524] focus:outline-none"
            />
            <input
              type="text"
              value={newCfgDesc}
              onChange={(e) => setNewCfgDesc(e.target.value)}
              placeholder="用途说明（可选）"
              aria-label="配置文件用途说明"
              className="w-full rounded border border-[#323948] bg-[#11141A] px-2.5 py-1.5 text-xs text-[#F3F4F6] focus:border-[#E59524] focus:outline-none"
            />
            {newCfgError && <p className="text-[11px] text-[#F87171]">{newCfgError}</p>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCreatingCfg(false)}
                className="px-2.5 py-1 text-xs text-[#94A3B8] hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded bg-[#E59524] px-2.5 py-1 text-xs font-semibold text-[#111317] hover:bg-[#F0A435]"
              >
                创建
              </button>
            </div>
          </form>
        )}

        {/* Section 1: Nested Exec Hierarchy */}
        <div className="p-2.5 border-b border-[#242934]">
          <div className="px-1.5 pb-1.5 text-[11px] font-medium text-[#7F8A9C]">
            Exec 嵌套执行树（从入口解析）
          </div>
          <div className="space-y-0.5 max-h-[210px] overflow-y-auto">
            {includeTree && renderTreeNode(includeTree)}
          </div>
          {cycleWarnings.length > 0 && (
            <div className="mt-2 rounded border border-[#7F1D1D] bg-[#2B1619] p-2 text-[11px] text-[#FCA5A5]">
              {cycleWarnings.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: All CFG Files */}
        <div className="flex-1 overflow-y-auto p-2.5">
          <div className="px-1.5 pb-1.5 text-[11px] font-medium text-[#7F8A9C]">
            全部配置文件（{cfgFiles.length}）
          </div>
          <div className="space-y-1">
            {cfgFiles.map((file) => {
              const active = file.id === activeFile?.id;
              return (
                <div
                  key={file.id}
                  className={`group flex items-center justify-between rounded-md px-2.5 py-2 transition-colors ${
                    active ? 'bg-[#252B37] text-[#F8FAFC]' : 'text-[#9CA7B8] hover:bg-[#1C2029]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCfg(file.id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-medium truncate">{file.filename}</span>
                      {file.isRoot && (
                        <span className="text-[10px] text-[#E59524] font-medium shrink-0">入口</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#737E90] truncate mt-0.5">{file.description}</p>
                  </button>
                  {!file.isRoot && (
                    <button
                      type="button"
                      onClick={() => onDeleteCfgFile(file.id)}
                      aria-label={`删除 ${file.filename}`}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-[#F87171] transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* CENTER: Interactive Blueprint Node Canvas OR Global Key Frequency Heatmap */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* View Switcher + Node Palette & Canvas Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#242934] bg-[#161921] px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Primary Center View Mode Switcher */}
            <div
              className="flex items-center gap-0.5 rounded-md border border-[#2C3342] bg-[#101319] p-0.5 shrink-0"
              role="tablist"
              aria-label="蓝图工作区视图切换"
            >
              <button
                type="button"
                role="tab"
                aria-selected={centerView === 'graph'}
                onClick={() => setCenterView('graph')}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  centerView === 'graph'
                    ? 'bg-[#262C38] text-[#F8FAFC]'
                    : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-[#E59524]" />
                <span>蓝图节点图</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={centerView === 'heatmap'}
                onClick={() => {
                  setCenterView('heatmap');
                  if (selectedNode?.type === 'key_input' && selectedNode.data.keyCode) {
                    setHeatmapSelectedKey(selectedNode.data.keyCode);
                  }
                }}
                className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  centerView === 'heatmap'
                    ? 'bg-[#262C38] text-[#F8FAFC]'
                    : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-[#F57C36]" />
                <span>全局热力图</span>
              </button>
            </div>

            {centerView === 'graph' && (
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    'key_input',
                    'modifier_gate',
                    'alias_macro',
                    'command',
                    'delay',
                    'exec_cfg',
                  ] as BlueprintNodeType[]
                ).map((nodeType) => {
                  const meta = NODE_META[nodeType];
                  return (
                    <button
                      key={nodeType}
                      type="button"
                      onClick={() => handleAddNode(nodeType)}
                      className="inline-flex items-center gap-1 rounded-md border border-[#2C3342] bg-[#1D222C] px-1.5 py-1 text-[11px] font-medium text-[#E5E7EB] hover:border-[#4B5568] hover:bg-[#242A36] transition-colors whitespace-nowrap shrink-0"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-xs shrink-0"
                        style={{ backgroundColor: meta.accent }}
                      />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {centerView === 'graph' ? (
            <div className="flex items-center gap-1 shrink-0">
              {selectedEdgeId && (
                <button
                  type="button"
                  onClick={() => handleDeleteEdge(selectedEdgeId)}
                  className="inline-flex items-center gap-1 rounded border border-[#7F1D1D] bg-[#2B1619] px-2 py-1 text-[11px] text-[#FCA5A5] hover:bg-[#3B1D22] whitespace-nowrap"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>断开连线</span>
                </button>
              )}
              <div className="flex items-center gap-0.5 rounded-md border border-[#2A303E] bg-[#11141A] p-0.5">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.55, Number((z - 0.1).toFixed(2))))}
                  aria-label="缩小蓝图画布"
                  className="p-1 text-[#94A3B8] hover:text-white"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 font-mono text-[11px] text-[#CBD5E1] tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(1.5, Number((z + 0.1).toFixed(2))))}
                  aria-label="放大蓝图画布"
                  className="p-1 text-[#94A3B8] hover:text-white"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPan({ x: 32, y: 28 });
                    setZoom(1);
                  }}
                  aria-label="重置画布视图"
                  title="重置画布视图"
                  className="p-1 text-[#94A3B8] hover:text-white"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <span className="text-xs text-[#8E98A8] whitespace-nowrap">
              点击键盘按键实时调整触发频率，评估操控动线与手指负荷
            </span>
          )}
        </div>

        {centerView === 'heatmap' ? (
          <BlueprintHeatmapView
            cfgFiles={cfgFiles}
            activeFile={activeFile}
            modelId={modelId}
            onModelChange={onModelChange}
            bindsByKey={bindsByKey}
            selectedKeyCode={heatmapSelectedKey}
            onSelectKey={(keyCode, fileId, nodeId) => {
              setHeatmapSelectedKey(keyCode);
              if (fileId && nodeId) {
                if (fileId !== activeCfgId) onSelectCfg(fileId);
                onSelectNode(nodeId);
              } else {
                onSelectNode(null);
              }
            }}
            onJumpToNode={(fileId, nodeId) => {
              if (fileId !== activeCfgId) onSelectCfg(fileId);
              onSelectNode(nodeId);
              setCenterView('graph');
            }}
            onCreateKeyNode={handleCreateNodeForHeatmapKey}
            onUpdateNodeFrequency={handleUpdateNodeFrequency}
            onFocusKeyIn3D={onFocusKeyIn3D}
          />
        ) : (
          /* Graph Canvas Surface */
          <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden blueprint-grid select-none cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvasBg === '1') {
              onSelectNode(null);
              setSelectedEdgeId(null);
              setPanning({
                startClientX: e.clientX,
                startClientY: e.clientY,
                origPanX: pan.x,
                origPanY: pan.y,
              });
            }
          }}
        >
          {/* Current File Watermark-free Header Strip */}
          <div className="pointer-events-none absolute top-3 left-4 z-10 flex items-center gap-2 text-xs text-[#8E98A8]">
            <span className="font-mono font-semibold text-[#E5E7EB]">{activeFile?.filename}</span>
            <span aria-hidden="true">·</span>
            <span>拖拽节点右侧引脚连线 · 双击嵌套 CFG 节点进入子图</span>
          </div>

          {/* Transformed Graph Layer */}
          <div
            data-canvas-bg="1"
            className="absolute inset-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* SVG Edges Layer */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none"
              width="4000"
              height="4000"
            >
              {activeFile?.edges.map((edge) => {
                const fromNode = activeFile.nodes.find((n) => n.id === edge.fromNodeId);
                const toNode = activeFile.nodes.find((n) => n.id === edge.toNodeId);
                if (!fromNode || !toNode) return null;
                const p1 = getPortPosition(fromNode, 'out');
                const p2 = getPortPosition(toNode, 'in');
                const path = makeBezierPath(p1.x, p1.y, p2.x, p2.y);
                const isSelected = selectedEdgeId === edge.id;
                const wireColor = isSelected ? '#F59E0B' : NODE_META[fromNode.type].accent;
                return (
                  <g key={edge.id} className="pointer-events-auto cursor-pointer">
                    {/* Invisible wide hit-area */}
                    <path
                      d={path}
                      fill="none"
                      stroke="transparent"
                      strokeWidth={14}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdgeId(edge.id);
                        onSelectNode(null);
                      }}
                    />
                    <path
                      d={path}
                      fill="none"
                      stroke={wireColor}
                      strokeWidth={isSelected ? 3.2 : 2.2}
                      strokeOpacity={isSelected ? 1 : 0.85}
                    />
                  </g>
                );
              })}

              {/* Active Dragging Wire Preview */}
              {connecting && activeFile && (() => {
                const fromNode = activeFile.nodes.find((n) => n.id === connecting.fromNodeId);
                if (!fromNode) return null;
                const p1 = getPortPosition(fromNode, 'out');
                const path = makeBezierPath(p1.x, p1.y, connecting.mouseX, connecting.mouseY);
                return (
                  <path
                    d={path}
                    fill="none"
                    stroke="#E59524"
                    strokeWidth={2.4}
                    strokeDasharray="6 4"
                  />
                );
              })()}
            </svg>

            {/* Blueprint Nodes */}
            {activeFile?.nodes.map((node) => {
              const meta = NODE_META[node.type];
              const isSelected = selectedNodeId === node.id;
              const targetCfg =
                node.type === 'exec_cfg' && node.data.targetCfgId
                  ? cfgFiles.find((f) => f.id === node.data.targetCfgId)
                  : undefined;

              return (
                <div
                  key={node.id}
                  data-testid={`bp-node-${node.id}`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: NODE_WIDTH,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectNode(node.id);
                    setSelectedEdgeId(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (node.type === 'exec_cfg' && node.data.targetCfgId) {
                      onSelectCfg(node.data.targetCfgId);
                    }
                  }}
                  className={`absolute rounded-lg border bg-[#1B1F28] shadow-lg transition-shadow ${
                    isSelected
                      ? 'border-[#E59524] ring-1 ring-[#E59524]/45 z-20'
                      : 'border-[#2E3545] hover:border-[#475166] z-10'
                  }`}
                >
                  {/* Node Header (Drag Handle) */}
                  <div
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onSelectNode(node.id);
                      setDraggingNode({
                        id: node.id,
                        startClientX: e.clientX,
                        startClientY: e.clientY,
                        origX: node.x,
                        origY: node.y,
                      });
                    }}
                    style={{ backgroundColor: meta.headerBg }}
                    className="flex items-center justify-between px-3 h-[34px] rounded-t-[7px] border-b border-[#2C3342] cursor-move"
                  >
                    <span className="text-xs font-semibold text-[#F3F4F6] truncate pr-2">
                      {node.title}
                    </span>
                    <span
                      className="text-[10px] font-medium shrink-0"
                      style={{ color: meta.accent }}
                    >
                      {meta.label}
                    </span>
                  </div>

                  {/* Node Body + Execution Pins */}
                  <div className="relative px-3 py-2.5 text-xs space-y-1.5">
                    {/* Input Pin */}
                    {meta.hasIn && (
                      <button
                        type="button"
                        aria-label={`连接到 ${node.title} 输入引脚`}
                        onPointerUp={(e) => {
                          e.stopPropagation();
                          handleCompleteConnection(node.id);
                        }}
                        className="absolute -left-[9px] top-[14px] w-[18px] h-[18px] rounded-full border-2 border-[#1B1F28] flex items-center justify-center hover:scale-125 transition-transform"
                        style={{ backgroundColor: connecting ? '#E59524' : '#94A3B8' }}
                        title="执行流输入 (Exec In)"
                      />
                    )}

                    {/* Output Pin */}
                    {meta.hasOut && (
                      <button
                        type="button"
                        aria-label={`从 ${node.title} 拖出连线`}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          const pt = clientToGraph(e.clientX, e.clientY);
                          setConnecting({
                            fromNodeId: node.id,
                            mouseX: pt.x,
                            mouseY: pt.y,
                          });
                        }}
                        className="absolute -right-[9px] top-[14px] w-[18px] h-[18px] rounded-full border-2 border-[#1B1F28] flex items-center justify-center hover:scale-125 transition-transform cursor-crosshair"
                        style={{ backgroundColor: meta.accent }}
                        title="按住拖拽连接至下一个节点 (Exec Out)"
                      />
                    )}

                    {/* Node-Specific Summary Readout */}
                    {node.type === 'key_input' && (() => {
                      const freq = getEffectiveTriggerFrequency(node);
                      const heat = getThermalKeyStyle(Math.min(1, freq / 60), freq);
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="text-[#94A3B8]">Scancode</span>
                            <span className="text-[#E59524] font-semibold">
                              {node.data.keyCode ? getScancode(node.data.keyCode).displayLabel : '未指定'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#8E98A8]">
                            <span>触发模式</span>
                            <span className="font-mono text-[#CBD5E1]">{node.data.triggerMode ?? 'press'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-[#8E98A8]">
                            <span>触发频率</span>
                            <span
                              style={{ color: freq > 0 ? heat.subText : '#64748B' }}
                              className="font-mono font-semibold tabular-nums"
                            >
                              {freq} 次/分
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {node.type === 'modifier_gate' && (
                      <div className="font-mono text-[11px] text-[#C4B5FD] bg-[#141720] rounded px-2 py-1 border border-[#282E3D] truncate">
                        if ({node.data.condition || 'true'})
                      </div>
                    )}

                    {node.type === 'alias_macro' && (
                      <div className="space-y-1">
                        <div className="font-mono text-[11px] text-[#FDBA74] bg-[#141720] rounded px-2 py-1 border border-[#282E3D] truncate">
                          alias {node.data.aliasName || '+macro'}
                        </div>
                        {node.data.note && (
                          <p className="text-[11px] text-[#7F8A9C] truncate">{node.data.note}</p>
                        )}
                      </div>
                    )}

                    {node.type === 'command' && (
                      <div className="space-y-1">
                        <div className="font-mono text-[11px] text-[#93C5FD] bg-[#141720] rounded px-2 py-1 border border-[#282E3D] truncate">
                          {node.data.commandText || '(空指令)'}
                        </div>
                        {node.data.releaseCommand && (
                          <div className="font-mono text-[10px] text-[#7F8A9C] truncate">
                            松开: {node.data.releaseCommand}
                          </div>
                        )}
                      </div>
                    )}

                    {node.type === 'delay' && (
                      <div className="font-mono text-[11px] text-[#5EEAD4] bg-[#141720] rounded px-2 py-1 border border-[#282E3D]">
                        wait {node.data.delayMs ?? 16} ms
                      </div>
                    )}

                    {node.type === 'exec_cfg' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px] text-[#6EE7B7] bg-[#141720] rounded px-2 py-1 border border-[#282E3D]">
                          <span className="truncate">
                            exec &quot;{targetCfg?.filename ?? '未选择'}&quot;
                          </span>
                          <Link2 className="w-3 h-3 shrink-0 ml-1" />
                        </div>
                        {node.data.note && (
                          <p className="text-[11px] text-[#7F8A9C] truncate">{node.data.note}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {/* RIGHT SIDEBAR: Node Property Inspector + Live Compiled CFG Preview */}
      <aside className="w-[308px] shrink-0 border-l border-[#242934] bg-[#15181F] flex flex-col overflow-hidden">
        {/* Top Half: Selected Node Inspector */}
        <div className="flex-1 overflow-y-auto p-4 border-b border-[#242934]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-[#E5E7EB]">节点属性检查器</h2>
            {selectedNode && (
              <button
                type="button"
                onClick={() => handleDeleteNode(selectedNode.id)}
                className="inline-flex items-center gap-1 text-xs text-[#F87171] hover:text-[#FCA5A5]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>删除节点</span>
              </button>
            )}
          </div>

          {selectedNode && activeFile ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="node-title-input" className="block text-[11px] text-[#94A3B8] mb-1">
                  节点名称
                </label>
                <input
                  id="node-title-input"
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => {
                    const val = e.target.value;
                    onUpdateCfgFile(activeFile.id, (f) => ({
                      ...f,
                      nodes: f.nodes.map((n) => (n.id === selectedNode.id ? { ...n, title: val } : n)),
                    }));
                  }}
                  className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs text-[#F3F4F6] focus:border-[#E59524] focus:outline-none"
                />
              </div>

              {selectedNode.type === 'key_input' && (
                <>
                  <div>
                    <label htmlFor="node-key-select" className="block text-[11px] text-[#94A3B8] mb-1">
                      绑定物理键位
                    </label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        id="node-key-select"
                        value={selectedNode.data.keyCode ?? 'KeyW'}
                        onChange={(e) => {
                          const code = e.target.value;
                          const sc = getScancode(code);
                          onUpdateCfgFile(activeFile.id, (f) => ({
                            ...f,
                            nodes: f.nodes.map((n) =>
                              n.id === selectedNode.id
                                ? {
                                    ...n,
                                    title: `按键触发 · ${sc.displayLabel}`,
                                    data: { ...n.data, keyCode: code },
                                  }
                                : n,
                            ),
                          }));
                        }}
                        className="flex-1 min-w-0 rounded border border-[#2E3545] bg-[#11141A] px-2 py-1.5 text-xs font-mono text-[#F3F4F6] focus:border-[#E59524] focus:outline-none truncate"
                      >
                        {ALL_SCANCODES.map((sc) => (
                          <option key={sc.code} value={sc.code}>
                            {sc.displayLabel} ({sc.glfw})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setIsRecordingKey((v) => !v)}
                        className={`px-2.5 py-1.5 rounded border text-xs font-medium whitespace-nowrap ${
                          isRecordingKey
                            ? 'border-[#E59524] bg-[#E59524] text-[#111317]'
                            : 'border-[#2E3545] bg-[#1E232D] text-[#E5E7EB] hover:border-[#4B5568]'
                        }`}
                      >
                        {isRecordingKey ? '请按键...' : '按键录入'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="node-trigger-select" className="block text-[11px] text-[#94A3B8] mb-1">
                      触发模式
                    </label>
                    <select
                      id="node-trigger-select"
                      value={selectedNode.data.triggerMode ?? 'press'}
                      onChange={(e) => {
                        const mode = e.target.value as TriggerMode;
                        onUpdateCfgFile(activeFile.id, (f) => ({
                          ...f,
                          nodes: f.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, data: { ...n.data, triggerMode: mode } }
                              : n,
                          ),
                        }));
                      }}
                      className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs text-[#F3F4F6] focus:border-[#E59524] focus:outline-none"
                    >
                      <option value="press">Press（单次按下）</option>
                      <option value="hold">Hold（按住持续 +cmd / -cmd）</option>
                      <option value="release">Release（松开触发）</option>
                      <option value="toggle">Toggle（开关切换）</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="node-freq-input" className="text-[11px] text-[#94A3B8]">
                        触发频率（次/分钟）
                      </label>
                      <span className="font-mono text-[11px] font-semibold text-[#E59524] tabular-nums">
                        {getEffectiveTriggerFrequency(selectedNode)} 次/分
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        aria-label="触发频率滑块"
                        value={Math.min(100, getEffectiveTriggerFrequency(selectedNode))}
                        onChange={(e) =>
                          handleUpdateNodeFrequency(
                            activeFile.id,
                            selectedNode.id,
                            Number(e.target.value),
                          )
                        }
                        className="flex-1 accent-[#E59524] cursor-pointer"
                      />
                      <input
                        id="node-freq-input"
                        type="number"
                        min={0}
                        max={200}
                        value={getEffectiveTriggerFrequency(selectedNode)}
                        onChange={(e) =>
                          handleUpdateNodeFrequency(
                            activeFile.id,
                            selectedNode.id,
                            Number(e.target.value) || 0,
                          )
                        }
                        className="w-16 rounded border border-[#2E3545] bg-[#11141A] px-2 py-1 text-xs font-mono text-[#F3F4F6] text-right tabular-nums focus:border-[#E59524] focus:outline-none"
                      />
                    </div>
                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                      {[
                        { label: '低 5', val: 5 },
                        { label: '中 20', val: 20 },
                        { label: '高 45', val: 45 },
                        { label: '核心 70', val: 70 },
                      ].map((p) => {
                        const active = getEffectiveTriggerFrequency(selectedNode) === p.val;
                        return (
                          <button
                            key={p.val}
                            type="button"
                            onClick={() =>
                              handleUpdateNodeFrequency(activeFile.id, selectedNode.id, p.val)
                            }
                            className={`rounded border py-1 text-[10px] font-mono tabular-nums transition-colors ${
                              active
                                ? 'border-[#E59524] bg-[#2D2417] text-[#FCD38D]'
                                : 'border-[#2A3140] bg-[#191E28] text-[#94A3B8] hover:text-[#F8FAFC]'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {selectedNode.data.keyCode && (
                    <button
                      type="button"
                      onClick={() => onFocusKeyIn3D(selectedNode.data.keyCode!)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#343C4D] bg-[#1D222C] px-3 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#E59524] transition-colors"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-[#E59524]" />
                      <span>在 3D 键盘上高亮预览此键</span>
                    </button>
                  )}
                </>
              )}

              {selectedNode.type === 'command' && (
                <>
                  <div>
                    <label htmlFor="node-cmd-input" className="block text-[11px] text-[#94A3B8] mb-1">
                      主执行指令（Engine Command）
                    </label>
                    <input
                      id="node-cmd-input"
                      type="text"
                      value={selectedNode.data.commandText ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateCfgFile(activeFile.id, (f) => ({
                          ...f,
                          nodes: f.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, data: { ...n.data, commandText: val } }
                              : n,
                          ),
                        }));
                      }}
                      placeholder="例如: +forward 或 slot1"
                      className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#93C5FD] focus:border-[#E59524] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="node-rel-input" className="block text-[11px] text-[#94A3B8] mb-1">
                      松开指令（可选，用于 Hold / Alias）
                    </label>
                    <input
                      id="node-rel-input"
                      type="text"
                      value={selectedNode.data.releaseCommand ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        onUpdateCfgFile(activeFile.id, (f) => ({
                          ...f,
                          nodes: f.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? { ...n, data: { ...n.data, releaseCommand: val } }
                              : n,
                          ),
                        }));
                      }}
                      placeholder="例如: -forward"
                      className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#CBD5E1] focus:border-[#E59524] focus:outline-none"
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'alias_macro' && (
                <div>
                  <label htmlFor="node-alias-input" className="block text-[11px] text-[#94A3B8] mb-1">
                    Alias 宏标识符
                  </label>
                  <input
                    id="node-alias-input"
                    type="text"
                    value={selectedNode.data.aliasName ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateCfgFile(activeFile.id, (f) => ({
                        ...f,
                        nodes: f.nodes.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, aliasName: val } }
                            : n,
                        ),
                      }));
                    }}
                    className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#FDBA74] focus:border-[#E59524] focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === 'modifier_gate' && (
                <div>
                  <label htmlFor="node-cond-input" className="block text-[11px] text-[#94A3B8] mb-1">
                    条件表达式
                  </label>
                  <input
                    id="node-cond-input"
                    type="text"
                    value={selectedNode.data.condition ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdateCfgFile(activeFile.id, (f) => ({
                        ...f,
                        nodes: f.nodes.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, condition: val } }
                            : n,
                        ),
                      }));
                    }}
                    className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#C4B5FD] focus:border-[#E59524] focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === 'delay' && (
                <div>
                  <label htmlFor="node-delay-input" className="block text-[11px] text-[#94A3B8] mb-1">
                    等待时长（毫秒 ms）
                  </label>
                  <input
                    id="node-delay-input"
                    type="number"
                    min={1}
                    max={5000}
                    value={selectedNode.data.delayMs ?? 16}
                    onChange={(e) => {
                      const ms = Math.max(1, Number(e.target.value) || 1);
                      onUpdateCfgFile(activeFile.id, (f) => ({
                        ...f,
                        nodes: f.nodes.map((n) =>
                          n.id === selectedNode.id
                            ? { ...n, data: { ...n.data, delayMs: ms } }
                            : n,
                        ),
                      }));
                    }}
                    className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#5EEAD4] focus:border-[#E59524] focus:outline-none"
                  />
                </div>
              )}

              {selectedNode.type === 'exec_cfg' && (
                <>
                  <div>
                    <label htmlFor="node-exec-select" className="block text-[11px] text-[#94A3B8] mb-1">
                      嵌套引用的目标 .cfg 文件
                    </label>
                    <select
                      id="node-exec-select"
                      value={selectedNode.data.targetCfgId ?? ''}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const target = cfgFiles.find((cf) => cf.id === targetId);
                        onUpdateCfgFile(activeFile.id, (f) => ({
                          ...f,
                          nodes: f.nodes.map((n) =>
                            n.id === selectedNode.id
                              ? {
                                  ...n,
                                  title: target ? `嵌套加载 · ${target.filename}` : n.title,
                                  data: { ...n.data, targetCfgId: targetId },
                                }
                              : n,
                          ),
                        }));
                      }}
                      className="w-full rounded border border-[#2E3545] bg-[#11141A] px-2.5 py-1.5 text-xs font-mono text-[#6EE7B7] focus:border-[#E59524] focus:outline-none"
                    >
                      {cfgFiles.map((cf) => (
                        <option key={cf.id} value={cf.id}>
                          {cf.filename}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedNode.data.targetCfgId && (
                    <button
                      type="button"
                      onClick={() => onSelectCfg(selectedNode.data.targetCfgId!)}
                      className="w-full rounded-md border border-[#2D4D42] bg-[#172B24] px-3 py-1.5 text-xs font-medium text-[#6EE7B7] hover:bg-[#1E382F] transition-colors"
                    >
                      进入目标子图编辑
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#7F8A9C] leading-relaxed">
              点击画布中的任意节点以修改键位、触发条件、指令文本或嵌套引用的 .cfg 文件。拖拽右侧彩色圆点到另一节点左侧即可建立执行连线。
            </p>
          )}
        </div>

        {/* Bottom Half: Live Compiled .cfg Preview */}
        <div className="h-[46%] flex flex-col bg-[#12151B]">
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-[#242934] bg-[#161921]">
            <span className="font-mono text-xs font-medium text-[#CBD5E1]">
              实时编译 · {activeFile?.filename}
            </span>
            <button
              type="button"
              onClick={handleCopyCompiled}
              className="inline-flex items-center gap-1 text-xs text-[#94A3B8] hover:text-white"
            >
              {copiedCfg ? <Check className="w-3.5 h-3.5 text-[#34B38A]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCfg ? '已复制' : '复制'}</span>
            </button>
          </div>
          <pre
            data-testid="compiled-cfg-preview"
            className="flex-1 overflow-auto p-3.5 font-mono text-[11px] leading-relaxed text-[#B8C4D4] whitespace-pre"
          >
            {compiledCfgText}
          </pre>
        </div>
      </aside>
    </div>
  );
};
