import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Flame,
  GitBranch,
  Hand,
  Info,
  Keyboard,
  Plus,
} from 'lucide-react';
import {
  computeHeatmapAnalytics,
  FINGER_ZONE_META,
  getThermalKeyStyle,
} from '../core/heatmapAnalytics';
import {
  computeLayoutBounds,
  KEYBOARD_MODEL_LIST,
  KEYBOARD_MODELS,
} from '../core/keyboardLayouts';
import { getScancode, resolveKeycapLegend } from '../core/scancodes';
import type {
  CfgFile,
  KeyboardModelId,
  ResolvedKeyBind,
} from '../core/types';

interface BlueprintHeatmapViewProps {
  cfgFiles: CfgFile[];
  activeFile: CfgFile | undefined;
  modelId: KeyboardModelId;
  onModelChange: (id: KeyboardModelId) => void;
  bindsByKey: Record<string, ResolvedKeyBind>;
  selectedKeyCode: string | null;
  onSelectKey: (keyCode: string, fileId?: string, nodeId?: string) => void;
  onJumpToNode: (fileId: string, nodeId: string) => void;
  onCreateKeyNode: (keyCode: string) => void;
  onUpdateNodeFrequency: (fileId: string, nodeId: string, frequency: number) => void;
  onFocusKeyIn3D: (keyCode: string) => void;
}

type HeatmapScope = 'global' | 'current';
type HeatmapColorMode = 'thermal' | 'finger';

const FREQUENCY_QUICK_PRESETS = [
  { label: '低频', value: 5 },
  { label: '常规', value: 20 },
  { label: '高频', value: 45 },
  { label: '极高频', value: 70 },
];

export const BlueprintHeatmapView: React.FC<BlueprintHeatmapViewProps> = ({
  cfgFiles,
  activeFile,
  modelId,
  onModelChange,
  bindsByKey,
  selectedKeyCode,
  onSelectKey,
  onJumpToNode,
  onCreateKeyNode,
  onUpdateNodeFrequency,
  onFocusKeyIn3D,
}) => {
  const [scope, setScope] = useState<HeatmapScope>('global');
  const [colorMode, setColorMode] = useState<HeatmapColorMode>('thermal');

  const layoutSpec = KEYBOARD_MODELS[modelId];
  const bounds = useMemo(() => computeLayoutBounds(layoutSpec), [layoutSpec]);

  const effectiveScope = scope === 'global' || !activeFile ? 'global' : activeFile.id;

  const analytics = useMemo(
    () => computeHeatmapAnalytics(cfgFiles, effectiveScope, bindsByKey, layoutSpec),
    [cfgFiles, effectiveScope, bindsByKey, layoutSpec],
  );

  const selectedStat = selectedKeyCode ? analytics.statsByKey[selectedKeyCode] : undefined;
  const selectedScancode = selectedKeyCode ? getScancode(selectedKeyCode) : null;

  // Compute physical aspect ratio and comfortable stage width per form factor
  const aspectRatio = bounds.widthU / Math.max(1, bounds.depthU);
  const stageMaxWidthPx =
    bounds.widthU <= 5
      ? 250
      : bounds.widthU <= 8
        ? 410
        : bounds.widthU <= 16.5
          ? 780
          : 860;

  const renderArrowIcon = (dir: 'up' | 'down' | 'left' | 'right') => {
    const cls = 'w-3 h-3 shrink-0';
    if (dir === 'up') return <ArrowUp className={cls} />;
    if (dir === 'down') return <ArrowDown className={cls} />;
    if (dir === 'left') return <ArrowLeft className={cls} />;
    return <ArrowRight className={cls} />;
  };

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#111317]"
      data-testid="blueprint-heatmap-view"
    >
      {/* Top Filter & Mode Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242934] bg-[#141820] px-5 py-2.5 shrink-0">
        {/* Keyboard Form-Factor Selector */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-[#8E98A8] whitespace-nowrap shrink-0">配列</span>
          <div className="flex items-center gap-0.5 rounded-md border border-[#242934] bg-[#0F1218] p-0.5 overflow-x-auto">
            {KEYBOARD_MODEL_LIST.map((m) => {
              const active = m.id === modelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModelChange(m.id)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
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
        </div>

        {/* Scope & Color Mode Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="flex items-center gap-0.5 rounded-md border border-[#242934] bg-[#0F1218] p-0.5"
            role="group"
            aria-label="热力统计范围"
          >
            <button
              type="button"
              onClick={() => setScope('global')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                scope === 'global'
                  ? 'bg-[#262C38] text-[#F8FAFC]'
                  : 'text-[#8E98A8] hover:text-[#E5E7EB]'
              }`}
            >
              全局嵌套 CFG
            </button>
            <button
              type="button"
              onClick={() => setScope('current')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                scope === 'current'
                  ? 'bg-[#262C38] text-[#F8FAFC]'
                  : 'text-[#8E98A8] hover:text-[#E5E7EB]'
              }`}
            >
              仅当前文件
            </button>
          </div>

          <div
            className="flex items-center gap-0.5 rounded-md border border-[#242934] bg-[#0F1218] p-0.5"
            role="group"
            aria-label="热力着色模式"
          >
            <button
              type="button"
              onClick={() => setColorMode('thermal')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                colorMode === 'thermal'
                  ? 'bg-[#262C38] text-[#F8FAFC]'
                  : 'text-[#8E98A8] hover:text-[#E5E7EB]'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-[#F57C36]" />
              <span>触发热力</span>
            </button>
            <button
              type="button"
              onClick={() => setColorMode('finger')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                colorMode === 'finger'
                  ? 'bg-[#262C38] text-[#F8FAFC]'
                  : 'text-[#8E98A8] hover:text-[#E5E7EB]'
              }`}
            >
              <Hand className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>手指分区</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Metrics & Thermal Legend Strip (Clean Unboxed Typography) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#202632] bg-[#12151C] px-5 py-2.5 shrink-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
          <span>
            统计范围：
            <strong className="font-mono font-medium text-[#E5E7EB]">
              {scope === 'global' ? `全部 ${cfgFiles.length} 个 CFG` : activeFile?.filename}
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#3C4556]">·</span>
          <span>
            总触发负荷：
            <strong className="font-mono font-semibold text-[#F8FAFC] tabular-nums">
              {analytics.totalFrequency} 次/分
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#3C4556]">·</span>
          <span>
            热区键位：
            <strong className="font-mono font-semibold text-[#E5E7EB] tabular-nums">
              {analytics.activeKeyCount} 键
            </strong>
          </span>
          <span aria-hidden="true" className="text-[#3C4556]">·</span>
          <span>
            左右手分配：
            <strong className="font-mono font-medium text-[#E5E7EB] tabular-nums">
              左 {analytics.leftHandPct}% / 右 {analytics.rightHandPct}%
            </strong>
          </span>
        </div>

        {/* Calibrated Thermal Scale Legend */}
        {colorMode === 'thermal' ? (
          <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] shrink-0">
            <span className="font-mono tabular-nums">0</span>
            <div
              className="h-2 w-28 rounded-sm border border-[#2D3442]"
              style={{
                background:
                  'linear-gradient(90deg, #1A1F28 0%, #173242 20%, #194644 42%, #7A4C14 66%, #B54718 84%, #C82838 100%)',
              }}
              aria-hidden="true"
            />
            <span className="font-mono tabular-nums text-[#E5E7EB]">
              {analytics.maxFrequency} 次/分
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#94A3B8] shrink-0">
            {analytics.fingerLoads.map((fl) => (
              <span key={fl.zone} className="inline-flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: FINGER_ZONE_META[fl.zone].color }}
                />
                <span>{FINGER_ZONE_META[fl.zone].shortLabel}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* PRIMARY FOCAL ANCHOR: Interactive Physical Keyboard Heatmap */}
      <div className="px-5 py-5 border-b border-[#222834] flex flex-col items-center justify-center bg-[#111317]">
        {analytics.activeKeyCount === 0 ? (
          <div className="w-full max-w-lg py-10 text-center">
            <p className="text-sm font-medium text-[#E5E7EB]">当前范围内尚无已绑定的按键节点</p>
            <p className="mt-1.5 text-xs text-[#8E98A8]">
              请先在「蓝图节点图」中添加按键触发节点，或切换到「全局嵌套 CFG」查看全部文件的频率分布。
            </p>
          </div>
        ) : (
          <div
            className="w-full rounded-xl border border-[#28303E] bg-[#161A22] p-3.5 shadow-inner"
            style={{ maxWidth: `${stageMaxWidthPx}px` }}
          >
            <div
              className="relative w-full select-none"
              style={{ aspectRatio: `${aspectRatio}` }}
              role="grid"
              aria-label={`${layoutSpec.name} 按键触发频率热力图`}
            >
              {layoutSpec.keys.map((keyDef) => {
                const kh = keyDef.h ?? 1;
                const leftPct = ((keyDef.x - bounds.minX) / bounds.widthU) * 100;
                const topPct = ((keyDef.y - bounds.minY) / bounds.depthU) * 100;
                const widthPct = (keyDef.w / bounds.widthU) * 100;
                const heightPct = (kh / bounds.depthU) * 100;

                const stat = analytics.statsByKey[keyDef.code];
                const freq = stat?.frequency ?? 0;
                const norm = stat?.normalized ?? 0;
                const isSelected = selectedKeyCode === keyDef.code;

                const thermal = getThermalKeyStyle(norm, freq);
                const fingerMeta = stat ? FINGER_ZONE_META[stat.fingerZone] : null;

                const bg =
                  colorMode === 'finger' && fingerMeta && freq > 0
                    ? fingerMeta.bgTint
                    : thermal.bg;
                const border = isSelected
                  ? '#F59E0B'
                  : colorMode === 'finger' && fingerMeta && freq > 0
                    ? fingerMeta.borderTint
                    : thermal.border;
                const textColor =
                  colorMode === 'finger' && freq > 0 ? '#F8FAFC' : thermal.text;
                const subColor =
                  colorMode === 'finger' && fingerMeta && freq > 0
                    ? fingerMeta.color
                    : thermal.subText;

                const legend = resolveKeycapLegend(keyDef.code, {
                  keyWidthU: keyDef.w,
                  keyHeightU: kh,
                  layoutId: modelId,
                  legendMode: 'standard',
                });

                const compactFont =
                  bounds.widthU > 18 ? 'text-[10px]' : keyDef.w < 1.25 && legend.primary.length > 3 ? 'text-[10px]' : 'text-[11px]';

                return (
                  <button
                    key={keyDef.code}
                    type="button"
                    data-testid={`heatmap-key-${keyDef.code}`}
                    onClick={() =>
                      onSelectKey(
                        keyDef.code,
                        stat?.primaryFileId,
                        stat?.primaryNodeId,
                      )
                    }
                    title={
                      stat
                        ? `${stat.displayLabel} · ${stat.frequency} 次/分 (${stat.primaryFilename}: ${stat.commandSummary})`
                        : `${getScancode(keyDef.code).displayLabel} · 未绑定（点击可新建蓝图节点）`
                    }
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${widthPct}%`,
                      height: `${heightPct}%`,
                    }}
                    className="absolute p-[2px] group focus:outline-none"
                  >
                    <div
                      style={{
                        backgroundColor: bg,
                        borderColor: border,
                        boxShadow: isSelected
                          ? '0 0 0 1px #F59E0B, 0 0 14px rgba(245, 158, 11, 0.35)'
                          : thermal.glow,
                      }}
                      className="w-full h-full rounded-[5px] border flex flex-col justify-between p-1 transition-transform duration-150 group-hover:brightness-115 group-focus-visible:ring-2 group-focus-visible:ring-[#E59524]"
                    >
                      <div className="flex items-start justify-between gap-0.5 leading-none min-w-0">
                        <span
                          style={{ color: textColor }}
                          className={`font-semibold tracking-tight truncate ${compactFont}`}
                        >
                          {legend.arrowDir
                            ? renderArrowIcon(legend.arrowDir)
                            : legend.isSpaceBar
                              ? 'SPACE'
                              : legend.primary}
                        </span>
                        {stat && stat.nodeRefs.length > 1 && (
                          <span
                            title={`跨 ${stat.nodeRefs.length} 个蓝图节点叠加`}
                            className="font-mono text-[9px] text-[#FDE68A] shrink-0"
                          >
                            ×{stat.nodeRefs.length}
                          </span>
                        )}
                      </div>

                      <div className="flex items-end justify-between leading-none">
                        {freq > 0 ? (
                          <span
                            style={{ color: subColor }}
                            className="font-mono text-[10px] font-semibold tabular-nums ml-auto"
                          >
                            {freq}
                          </span>
                        ) : (
                          <span className="text-[9px] text-transparent select-none">0</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected Key Quick Action & Frequency Strip */}
        {selectedKeyCode && selectedScancode && (
          <div
            className="mt-4 w-full flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#28303E] bg-[#161A22] px-4 py-2.5"
            style={{ maxWidth: `${Math.max(stageMaxWidthPx, 720)}px` }}
            data-testid="heatmap-selected-strip"
          >
            <div className="flex flex-wrap items-center gap-3 min-w-0">
              <div className="flex items-center justify-center min-w-[40px] h-8 px-2 rounded border border-[#E59524]/60 bg-[#202632] font-mono text-xs font-semibold text-[#F8FAFC]">
                {selectedScancode.displayLabel}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-[#E5E7EB] font-medium">
                    {selectedScancode.glfw}
                  </span>
                  <span className="text-[#4B5563]" aria-hidden="true">·</span>
                  {selectedStat ? (
                    <>
                      <span className="font-mono text-[#E59524] font-semibold tabular-nums">
                        {selectedStat.frequency} 次/分
                      </span>
                      <span className="text-[#4B5563]" aria-hidden="true">·</span>
                      <span className="text-[#94A3B8]">
                        {FINGER_ZONE_META[selectedStat.fingerZone].label}
                      </span>
                      <span className="text-[#4B5563]" aria-hidden="true">·</span>
                      <span className="font-mono text-[#68B598] truncate max-w-[200px]">
                        {selectedStat.primaryFilename}
                      </span>
                    </>
                  ) : (
                    <span className="text-[#8E98A8]">当前键位未在蓝图中绑定</span>
                  )}
                </div>
                {selectedStat && (
                  <p className="mt-0.5 text-[11px] font-mono text-[#94A3B8] truncate max-w-[440px]">
                    {selectedStat.commandSummary}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {selectedStat ? (
                <>
                  <div className="flex items-center gap-1 mr-1">
                    {FREQUENCY_QUICK_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() =>
                          onUpdateNodeFrequency(
                            selectedStat.primaryFileId,
                            selectedStat.primaryNodeId,
                            preset.value,
                          )
                        }
                        className={`px-2 py-1 rounded border text-[11px] font-mono tabular-nums transition-colors ${
                          selectedStat.frequency === preset.value
                            ? 'border-[#E59524] bg-[#2D2417] text-[#FCD38D]'
                            : 'border-[#2D3544] bg-[#1B202A] text-[#94A3B8] hover:text-[#F8FAFC]'
                        }`}
                      >
                        {preset.label} {preset.value}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onJumpToNode(selectedStat.primaryFileId, selectedStat.primaryNodeId)
                    }
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#E59524] px-3 py-1.5 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] transition-colors whitespace-nowrap"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>跳转到蓝图节点</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onFocusKeyIn3D(selectedKeyCode)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#323A4A] bg-[#1C212B] px-2.5 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#E59524] transition-colors whitespace-nowrap"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-[#E59524]" />
                    <span>3D 预览</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onCreateKeyNode(selectedKeyCode)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[#E59524] px-3 py-1.5 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>为此键新建蓝图节点</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM ANALYTICS: 2-Column Single-Elevation Ergonomics & Top Keys Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 divide-y xl:divide-y-0 xl:divide-x divide-[#222834]">
        {/* Left Column: Finger Load Distribution + Actionable Optimization Hints */}
        <section className="p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold text-[#E5E7EB]">
              手指负荷分布与操控优化建议
            </h3>
            <span className="text-[11px] text-[#7F8A9C] tabular-nums">
              按次/分钟频次加权
            </span>
          </div>

          <div className="space-y-2.5">
            {analytics.fingerLoads.map((fl) => {
              const meta = FINGER_ZONE_META[fl.zone];
              return (
                <div key={fl.zone} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#CBD5E1] font-medium">{fl.label}</span>
                      <span className="text-[11px] text-[#64748B] truncate">
                        {fl.keyCount > 0
                          ? `${fl.keyCount} 键${fl.topKeyLabel ? ` · 主力 ${fl.topKeyLabel}` : ''}`
                          : '暂无绑定'}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#CBD5E1] tabular-nums shrink-0">
                      {fl.frequency} 次/分 ({fl.sharePct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-sm bg-[#1B202B] overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-200"
                      style={{
                        width: `${Math.min(100, fl.sharePct)}%`,
                        backgroundColor: meta.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Data-Driven Ergonomic Optimization Advice */}
          <div className="pt-2 border-t border-[#202632] space-y-2">
            {analytics.hints.map((hint) => (
              <div
                key={hint.id}
                className="flex items-start gap-2.5 rounded-md border border-[#242B38] bg-[#151922] px-3 py-2.5"
              >
                {hint.severity === 'warn' ? (
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
                ) : hint.severity === 'good' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34B38A] shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#E5E7EB]">{hint.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#8E98A8] leading-relaxed">
                    {hint.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right Column: Top Frequency Keys Ranking */}
        <section className="p-5 space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-xs font-semibold text-[#E5E7EB]">
              高频按键排行（Top 8）
            </h3>
            <span className="text-[11px] text-[#7F8A9C]">
              点击行高亮键位并编辑频率
            </span>
          </div>

          <div className="divide-y divide-[#1E2430] border-t border-b border-[#1E2430]">
            {analytics.rankedKeys.slice(0, 8).map((item, idx) => {
              const thermal = getThermalKeyStyle(item.normalized, item.frequency);
              const active = selectedKeyCode === item.keyCode;
              return (
                <button
                  key={item.keyCode}
                  type="button"
                  onClick={() =>
                    onSelectKey(item.keyCode, item.primaryFileId, item.primaryNodeId)
                  }
                  className={`w-full flex items-center gap-3 py-2 px-2 text-left transition-colors ${
                    active ? 'bg-[#1E2432]' : 'hover:bg-[#171B24]'
                  }`}
                >
                  <span className="w-4 font-mono text-[11px] text-[#64748B] tabular-nums shrink-0">
                    {idx + 1}.
                  </span>
                  <span
                    style={{
                      backgroundColor: thermal.bg,
                      borderColor: thermal.border,
                      color: thermal.text,
                    }}
                    className="min-w-[44px] text-center px-1.5 py-0.5 rounded border font-mono text-[11px] font-semibold shrink-0"
                  >
                    {item.displayLabel}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-[#CBD5E1] truncate">
                        {item.commandSummary}
                      </span>
                      <span className="font-mono text-xs font-semibold text-[#F8FAFC] tabular-nums shrink-0">
                        {item.frequency} 次/分
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-sm bg-[#1B202B] overflow-hidden">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${Math.max(4, Math.round(item.normalized * 100))}%`,
                            backgroundColor: thermal.border,
                          }}
                        />
                      </div>
                      <span className="font-mono text-[10px] text-[#64748B] shrink-0">
                        {item.primaryFilename}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
