import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, Download, FileCode2, Package } from 'lucide-react';
import { compileCfgFile, generateCppHeader } from '../core/cfgEngine';
import { ROOT_CFG_ID } from '../core/defaultCfgProject';
import { KEYBOARD_MODELS, KEYBOARD_MODEL_LIST } from '../core/keyboardLayouts';
import { getScancode } from '../core/scancodes';
import type {
  CfgFile,
  CppBackend,
  KeyboardModelId,
  MaterialFinishId,
  ResolvedKeyBind,
  RgbLightingProfile,
} from '../core/types';
import { exportKeyboardToGLB, exportKeyboardToOBJ } from '../three/keyboardBuilder';

interface ExportStudioProps {
  modelId: KeyboardModelId;
  onModelChange: (id: KeyboardModelId) => void;
  finishId: MaterialFinishId;
  cfgFiles: CfgFile[];
  bindsByKey: Record<string, ResolvedKeyBind>;
  rgbProfile: RgbLightingProfile;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const ExportStudio: React.FC<ExportStudioProps> = ({
  modelId,
  onModelChange,
  finishId,
  cfgFiles,
  bindsByKey,
  rgbProfile,
}) => {
  const [cppBackend, setCppBackend] = useState<CppBackend>('glfw');
  const [previewCfgId, setPreviewCfgId] = useState<string>(cfgFiles[0]?.id ?? ROOT_CFG_ID);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exporting3d, setExporting3d] = useState<'glb' | 'obj' | null>(null);
  const [copiedCpp, setCopiedCpp] = useState(false);

  const activeModel = KEYBOARD_MODELS[modelId];
  const previewCfg = cfgFiles.find((f) => f.id === previewCfgId) ?? cfgFiles[0];

  const cppCode = useMemo(
    () => generateCppHeader(ROOT_CFG_ID, cfgFiles, cppBackend),
    [cfgFiles, cppBackend],
  );

  const previewCfgText = useMemo(
    () => (previewCfg ? compileCfgFile(previewCfg, cfgFiles, rgbProfile) : ''),
    [previewCfg, cfgFiles, rgbProfile],
  );

  const resolvedList = useMemo(
    () => Object.values(bindsByKey).sort((a, b) => a.keyCode.localeCompare(b.keyCode)),
    [bindsByKey],
  );

  const handleDownloadGLB = async () => {
    setExporting3d('glb');
    setExportStatus(null);
    try {
      const blob = await exportKeyboardToGLB(activeModel, finishId, bindsByKey);
      const fname = `keyforge_${activeModel.id}_${finishId}.glb`;
      triggerDownload(blob, fname);
      setExportStatus(`已导出二进制 glTF 模型: ${fname} (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      setExportStatus(`导出 GLB 失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setExporting3d(null);
    }
  };

  const handleDownloadOBJ = () => {
    setExporting3d('obj');
    setExportStatus(null);
    try {
      const blob = exportKeyboardToOBJ(activeModel, finishId, bindsByKey);
      const fname = `keyforge_${activeModel.id}.obj`;
      triggerDownload(blob, fname);
      setExportStatus(`已导出 Wavefront OBJ 模型: ${fname} (${(blob.size / 1024).toFixed(1)} KB)`);
    } catch (err) {
      setExportStatus(`导出 OBJ 失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setExporting3d(null);
    }
  };

  const handleDownloadCppHeader = () => {
    const blob = new Blob([cppCode], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, `KeyBindRegistry_${cppBackend}.hpp`);
    setExportStatus(`已导出 C++17 头文件: KeyBindRegistry_${cppBackend}.hpp`);
  };

  const handleDownloadSingleCfg = (file: CfgFile) => {
    const content = compileCfgFile(file, cfgFiles, rgbProfile);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, file.filename);
    setExportStatus(`已导出配置文件: ${file.filename}`);
  };

  const handleDownloadAllCfgsBundle = () => {
    const sections = cfgFiles.map((f) => compileCfgFile(f, cfgFiles, rgbProfile));
    const combined = sections.join('\n\n');
    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    triggerDownload(blob, 'keyforge_all_nested_cfgs.cfg');
    setExportStatus(`已导出全部 ${cfgFiles.length} 个嵌套 .cfg 合并脚本`);
  };

  const handleCopyCpp = async () => {
    try {
      await navigator.clipboard.writeText(cppCode);
      setCopiedCpp(true);
      setTimeout(() => setCopiedCpp(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[#111317] p-6" data-testid="export-studio">
      <div className="mx-auto max-w-[1320px] space-y-6">
        {/* Top Section: 3D Mesh Export for C++ Engines */}
        <section className="rounded-xl border border-[#252B37] bg-[#161A22] p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#E59524]" />
                <h2 className="text-base font-semibold text-[#F3F4F6]">
                  导出 3D 键盘建模到 C++ 游戏引擎
                </h2>
              </div>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                所有键盘模型保留独立分层节点命名（CNC_Bottom_Chassis、Hotswap_PCB_Board、Key_KeyW 等），可直接通过 Assimp / tinygltf / Unreal / OpenGL 载入并驱动按键动画。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadGLB}
                disabled={exporting3d !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E59524] px-4 py-2 text-xs font-semibold text-[#111317] hover:bg-[#F0A435] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting3d === 'glb' ? '正在打包 .glb...' : '导出 .GLB (glTF 2.0)'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadOBJ}
                disabled={exporting3d !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#323A4A] bg-[#1E232E] px-4 py-2 text-xs font-medium text-[#E5E7EB] hover:border-[#4B5568] disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{exporting3d === 'obj' ? '正在打包 .obj...' : '导出 .OBJ (Wavefront)'}</span>
              </button>
            </div>
          </div>

          {/* Model Selector Strip */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {KEYBOARD_MODEL_LIST.map((m) => {
              const active = m.id === modelId;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModelChange(m.id)}
                  className={`rounded-lg border p-3.5 text-left transition-colors ${
                    active
                      ? 'border-[#E59524] bg-[#1F2430]'
                      : 'border-[#262C38] bg-[#13161D] hover:border-[#3A4354]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#F3F4F6]">{m.name}</span>
                    {active && <span className="text-[11px] font-medium text-[#E59524]">当前</span>}
                  </div>
                  <p className="mt-1 text-[11px] text-[#8E98A8] font-mono tabular-nums">
                    {m.formFactor} · 倾角 {m.tiltDegrees}°
                  </p>
                </button>
              );
            })}
          </div>

          {exportStatus && (
            <div
              role="status"
              className="mt-3 rounded-md border border-[#2C473C] bg-[#15251F] px-3.5 py-2 text-xs text-[#6EE7B7]"
            >
              {exportStatus}
            </div>
          )}
        </section>

        {/* Middle Split: C++17 Header + Nested CFG Bundle */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* C++17 Single-Header Generator */}
          <section className="rounded-xl border border-[#252B37] bg-[#161A22] flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242934] px-4 py-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#4C9AFF]" />
                <h3 className="text-sm font-semibold text-[#F3F4F6]">C++17 键位注册头文件</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-md border border-[#2A303E] bg-[#11141A] p-0.5">
                  {(['glfw', 'sdl2', 'win32'] as CppBackend[]).map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setCppBackend(b)}
                      className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium uppercase transition-colors ${
                        cppBackend === b
                          ? 'bg-[#262D3B] text-[#F8FAFC]'
                          : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCpp}
                  className="inline-flex items-center gap-1 rounded border border-[#2E3545] bg-[#1D222C] px-2.5 py-1 text-xs text-[#CBD5E1] hover:text-white"
                >
                  {copiedCpp ? <Check className="w-3.5 h-3.5 text-[#34B38A]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCpp ? '已复制' : '复制'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCppHeader}
                  className="inline-flex items-center gap-1 rounded bg-[#263247] px-2.5 py-1 text-xs font-medium text-[#93C5FD] hover:bg-[#2F3E57]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>下载 .hpp</span>
                </button>
              </div>
            </div>

            <pre
              data-testid="cpp-header-preview"
              className="flex-1 max-h-[420px] overflow-auto bg-[#11141A] p-4 font-mono text-[11px] leading-relaxed text-[#CBD5E1]"
            >
              {cppCode}
            </pre>
          </section>

          {/* Nested CFG Files Exporter */}
          <section className="rounded-xl border border-[#252B37] bg-[#161A22] flex flex-col overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242934] px-4 py-3">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-[#34B38A]" />
                <h3 className="text-sm font-semibold text-[#F3F4F6]">
                  嵌套 .CFG 配置文件集（{cfgFiles.length} 个文件）
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {previewCfg && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSingleCfg(previewCfg)}
                    className="inline-flex items-center gap-1 rounded border border-[#2E3545] bg-[#1D222C] px-2.5 py-1 text-xs text-[#CBD5E1] hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>下载当前 .cfg</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadAllCfgsBundle}
                  className="inline-flex items-center gap-1 rounded bg-[#1A332A] px-2.5 py-1 text-xs font-medium text-[#6EE7B7] hover:bg-[#224236]"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>导出全部 .cfg</span>
                </button>
              </div>
            </div>

            {/* File tabs */}
            <div className="flex items-center gap-1 overflow-x-auto border-b border-[#242934] bg-[#13161D] px-3 py-1.5">
              {cfgFiles.map((f) => {
                const active = f.id === previewCfg?.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPreviewCfgId(f.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap shrink-0 transition-colors ${
                      active ? 'bg-[#262C38] text-[#F8FAFC]' : 'text-[#8E98A8] hover:text-[#E5E7EB]'
                    }`}
                  >
                    {f.filename}
                  </button>
                );
              })}
            </div>

            <pre className="flex-1 max-h-[384px] overflow-auto bg-[#11141A] p-4 font-mono text-[11px] leading-relaxed text-[#B8C4D4]">
              {previewCfgText}
            </pre>
          </section>
        </div>

        {/* Bottom Table: Resolved Nested Bind Matrix */}
        <section className="rounded-xl border border-[#252B37] bg-[#161A22] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#242934] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#F3F4F6]">
              已解析全量键位绑定表（共 {resolvedList.length} 项有效绑定）
            </h3>
            <span className="text-xs text-[#8E98A8]">按嵌套 exec 加载顺序解析，后加载覆盖先加载</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#242934] bg-[#13161D] text-[#8E98A8]">
                  <th className="py-2.5 px-4 font-medium">物理键</th>
                  <th className="py-2.5 px-4 font-medium">C++ 键码 ({cppBackend.toUpperCase()})</th>
                  <th className="py-2.5 px-4 font-medium">触发模式</th>
                  <th className="py-2.5 px-4 font-medium">嵌套 CFG 来源链</th>
                  <th className="py-2.5 px-4 font-medium">执行指令链</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202530]">
                {resolvedList.map((b) => {
                  const sc = getScancode(b.keyCode);
                  const nativeCode =
                    cppBackend === 'glfw' ? sc.glfw : cppBackend === 'sdl2' ? sc.sdl2 : sc.win32;
                  return (
                    <tr key={b.keyCode} className="hover:bg-[#1B202A]">
                      <td className="py-2 px-4 font-mono font-semibold text-[#F3F4F6]">
                        {sc.displayLabel}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#94A3B8]">{nativeCode}</td>
                      <td className="py-2 px-4 font-mono text-[#CBD5E1]">{b.triggerMode}</td>
                      <td className="py-2 px-4 font-mono text-[#6EE7B7]">
                        {b.includeChain.join(' → ')}
                      </td>
                      <td className="py-2 px-4 font-mono text-[#E59524]">{b.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
