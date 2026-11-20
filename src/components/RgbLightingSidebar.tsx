import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  PanelRightClose,
  Power,
  Sparkles,
} from 'lucide-react';
import {
  compileRgbCfgSection,
  compileStandaloneRgbCfg,
  RGB_EFFECT_LABELS,
  RGB_PRESETS,
  RGB_QUICK_COLORS,
  RGB_ZONE_META,
  RGB_ZONE_ORDER,
} from '../core/rgbLighting';
import type { RgbEffectMode, RgbLightingProfile, RgbZoneConfig, RgbZoneId } from '../core/types';

interface RgbLightingSidebarProps {
  profile: RgbLightingProfile;
  onChange: (next: RgbLightingProfile) => void;
  onClose: () => void;
}

const EFFECT_LIST: RgbEffectMode[] = ['static', 'breathe', 'blink', 'wave'];

function triggerDownloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const RgbLightingSidebar: React.FC<RgbLightingSidebarProps> = ({
  profile,
  onChange,
  onClose,
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<RgbZoneId>('wasd');
  const [copiedCfg, setCopiedCfg] = useState(false);
  const [exportedNote, setExportedNote] = useState(false);

  const selectedZone = profile.zones[selectedZoneId];
  const cfgSnippet = useMemo(() => compileRgbCfgSection(profile), [profile]);

  const updateZone = (zoneId: RgbZoneId, patch: Partial<RgbZoneConfig>) => {
    onChange({
      ...profile,
      zones: {
        ...profile.zones,
        [zoneId]: {
          ...profile.zones[zoneId],
          ...patch,
        },
      },
    });
  };

  const handleCopyCfg = async () => {
    try {
      await navigator.clipboard.writeText(cfgSnippet);
      setCopiedCfg(true);
      setTimeout(() => setCopiedCfg(false), 1800);
    } catch {
      // ignore headless clipboard refusal
    }
  };

  const handleExportCfg = () => {
    const fullCfg = compileStandaloneRgbCfg(profile);
    triggerDownloadText(fullCfg, 'rgb_lighting.cfg');
    setExportedNote(true);
    setTimeout(() => setExportedNote(false), 2200);
  };

  return (
    <aside
      data-testid="rgb-lighting-sidebar"
      aria-label="RGB 灯光模拟器侧边栏"
      className="w-[318px] shrink-0 h-full border-l border-[#242934] bg-[#141820] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#242934] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#E59524] shrink-0" />
          <h2 className="text-xs font-semibold text-[#F3F4F6] truncate">RGB 灯光模拟器</h2>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => onChange({ ...profile, enabled: !profile.enabled })}
            aria-pressed={profile.enabled}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
              profile.enabled
                ? 'border-[#E59524]/60 bg-[#272015] text-[#FCD38D]'
                : 'border-[#2C3342] bg-[#1A1F28] text-[#8E98A8] hover:text-[#E5E7EB]'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{profile.enabled ? '已开启' : '已关闭'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="收起 RGB 灯光侧边栏"
            title="收起侧边栏"
            className="p-1 rounded text-[#8E98A8] hover:text-white hover:bg-[#222834] transition-colors"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable Configuration Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#222834]">
        {/* Section 1: Global Presets & Master Brightness */}
        <section className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#8E98A8]">快捷灯效预设</span>
            <span className="text-[11px] font-mono text-[#CBD5E1] tabular-nums">
              总亮度 {profile.masterBrightness}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {RGB_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange(structuredClone(preset.profile))}
                className="flex items-center gap-2 rounded-md border border-[#2A3140] bg-[#191E28] px-2.5 py-1.5 text-left text-xs font-medium text-[#E5E7EB] hover:border-[#4B5568] hover:bg-[#202633] transition-colors"
              >
                <span
                  className="w-3.5 h-3.5 rounded-sm shrink-0 border border-white/15"
                  style={{ background: preset.swatchGradient }}
                />
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              aria-label="RGB 总亮度"
              value={profile.masterBrightness}
              onChange={(e) =>
                onChange({ ...profile, masterBrightness: Number(e.target.value) })
              }
              className="w-full accent-[#E59524] cursor-pointer"
            />
            <label className="flex items-center justify-between text-xs text-[#9CA7B8] cursor-pointer">
              <span>同步机身腰线导光条</span>
              <input
                type="checkbox"
                checked={profile.syncUnderglow}
                onChange={(e) =>
                  onChange({ ...profile, syncUnderglow: e.target.checked })
                }
                className="accent-[#E59524] cursor-pointer"
              />
            </label>
          </div>
        </section>

        {/* Section 2: Selectable 6 Key Zones (2-col compact grid so Hz slider stays above fold) */}
        <section className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#8E98A8]">
              按键区域列表（点击自定义）
            </span>
            <span className="text-[11px] text-[#64748B] tabular-nums">6 区域</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {RGB_ZONE_ORDER.map((zoneId) => {
              const z = profile.zones[zoneId];
              const meta = RGB_ZONE_META[zoneId];
              const isSelected = selectedZoneId === zoneId;
              const freqLabel =
                !z.enabled
                  ? '关闭'
                  : z.effect === 'static'
                    ? '常亮'
                    : `${RGB_EFFECT_LABELS[z.effect]} ${z.blinkHz.toFixed(1)}Hz`;

              return (
                <div
                  key={zoneId}
                  data-testid={`rgb-zone-row-${zoneId}`}
                  className={`flex items-center justify-between gap-1.5 rounded-md border px-2 py-1.5 transition-colors ${
                    isSelected
                      ? 'border-[#E59524]/70 bg-[#202532]'
                      : 'border-[#222834] bg-[#181C25] hover:border-[#343C4E]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedZoneId(zoneId)}
                    className="flex-1 flex items-center gap-1.5 min-w-0 text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                      style={{
                        background:
                          z.effect === 'wave'
                            ? 'linear-gradient(135deg, #22D3EE, #34D399, #A855F7)'
                            : z.color,
                        opacity: z.enabled ? 1 : 0.28,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-[#E5E7EB] truncate">
                        {meta.label.replace('核心移动区', '移动区').replace('与数字区', '数字区').replace('键区', '区')}
                      </div>
                      <div className="text-[10px] font-mono text-[#7F8A9C] tabular-nums truncate">
                        {freqLabel}
                      </div>
                    </div>
                  </button>

                  <input
                    type="checkbox"
                    aria-label={`启用${meta.label}灯光`}
                    checked={z.enabled}
                    onChange={(e) => updateZone(zoneId, { enabled: e.target.checked })}
                    className="accent-[#E59524] cursor-pointer shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Active Zone Color & Blink Frequency Editor */}
        <section className="p-3 space-y-2.5 bg-[#161A23]" data-testid="rgb-zone-editor">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold text-[#F3F4F6] truncate">
              {RGB_ZONE_META[selectedZoneId].label}
            </h3>
            <span className="text-[10px] text-[#7F8A9C] truncate">
              {RGB_ZONE_META[selectedZoneId].shortDesc}
            </span>
          </div>

          {/* Color Picker + Quick Swatches */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
              <label htmlFor="rgb-zone-color-input">灯光颜色</label>
              <span className="font-mono text-[#E5E7EB]">{selectedZone.color.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="rgb-zone-color-input"
                type="color"
                value={selectedZone.color}
                onChange={(e) =>
                  updateZone(selectedZoneId, { color: e.target.value.toUpperCase(), enabled: true })
                }
                className="w-8 h-7 rounded border border-[#343C4D] bg-transparent cursor-pointer shrink-0"
              />
              <div className="flex flex-wrap items-center gap-1.5 flex-1">
                {RGB_QUICK_COLORS.map((hex) => {
                  const active = selectedZone.color.toUpperCase() === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`选择颜色 ${hex}`}
                      onClick={() => updateZone(selectedZoneId, { color: hex, enabled: true })}
                      className={`w-5 h-5 rounded-sm border transition-transform ${
                        active ? 'border-white scale-110' : 'border-white/15 hover:scale-105'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Effect Mode Segmented Control */}
          <div className="space-y-1.5">
            <span className="block text-[11px] text-[#94A3B8]">闪烁 / 动态模式</span>
            <div className="grid grid-cols-4 gap-1 rounded-md border border-[#28303E] bg-[#101319] p-0.5">
              {EFFECT_LIST.map((mode) => {
                const active = selectedZone.effect === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      updateZone(selectedZoneId, {
                        effect: mode,
                        blinkHz: mode === 'static' ? 0 : Math.max(0.5, selectedZone.blinkHz || 1.2),
                        enabled: true,
                      })
                    }
                    className={`py-1 rounded text-[11px] font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[#262C38] text-[#F8FAFC]'
                        : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                    }`}
                  >
                    {RGB_EFFECT_LABELS[mode]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Blink / Animation Frequency Slider (Hz) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="rgb-blink-hz-slider" className="text-[#94A3B8]">
                闪烁 / 呼吸频率 (Hz)
              </label>
              <span className="font-mono font-semibold text-[#E59524] tabular-nums">
                {selectedZone.effect === 'static' ? '0.0 Hz (常亮)' : `${selectedZone.blinkHz.toFixed(1)} Hz`}
              </span>
            </div>
            <input
              id="rgb-blink-hz-slider"
              type="range"
              min={0}
              max={6}
              step={0.1}
              value={selectedZone.effect === 'static' ? 0 : selectedZone.blinkHz}
              onChange={(e) => {
                const hz = Number(e.target.value);
                updateZone(selectedZoneId, {
                  blinkHz: hz,
                  effect:
                    hz <= 0
                      ? 'static'
                      : selectedZone.effect === 'static'
                        ? 'blink'
                        : selectedZone.effect,
                  enabled: true,
                });
              }}
              className="w-full accent-[#E59524] cursor-pointer"
            />
          </div>

          {/* Zone Brightness Slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <label htmlFor="rgb-zone-bright-slider" className="text-[#94A3B8]">
                分区独立亮度
              </label>
              <span className="font-mono text-[#CBD5E1] tabular-nums">
                {selectedZone.brightness}%
              </span>
            </div>
            <input
              id="rgb-zone-bright-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedZone.brightness}
              onChange={(e) =>
                updateZone(selectedZoneId, { brightness: Number(e.target.value) })
              }
              className="w-full accent-[#E59524] cursor-pointer"
            />
          </div>
        </section>
      </div>

      {/* Footer: Live .cfg Color Definition Preview & Direct Export */}
      <div className="border-t border-[#242934] bg-[#11141A] p-3 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-[#CBD5E1]">
            .CFG 色彩定义（已同步至 autoexec.cfg）
          </span>
        </div>

        <pre
          data-testid="rgb-cfg-preview"
          className="max-h-[96px] overflow-auto rounded border border-[#232936] bg-[#0D1015] p-2 font-mono text-[10px] leading-relaxed text-[#9FB0C6] whitespace-pre"
        >
          {cfgSnippet}
        </pre>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleExportCfg}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#E59524] px-2.5 py-1.5 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{exportedNote ? '已导出 .cfg' : '导出灯光 .cfg'}</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCfg}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#2E3545] bg-[#1A1F28] px-2.5 py-1.5 text-xs font-medium text-[#E5E7EB] hover:border-[#4B5568] transition-colors whitespace-nowrap"
          >
            {copiedCfg ? (
              <Check className="w-3.5 h-3.5 text-[#34B38A]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedCfg ? '已复制' : '复制色彩段'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
