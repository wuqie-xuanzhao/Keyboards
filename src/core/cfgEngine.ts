import { getEffectiveTriggerFrequency } from './heatmapAnalytics';
import { compileRgbCfgSection } from './rgbLighting';
import { getScancode } from './scancodes';
import type {
  BlueprintNode,
  CfgFile,
  CfgIncludeTreeNode,
  CppBackend,
  ResolvedBindStep,
  ResolvedKeyBind,
  RgbLightingProfile,
} from './types';

function findOutgoingNodes(file: CfgFile, nodeId: string): BlueprintNode[] {
  const targetIds = file.edges
    .filter((e) => e.fromNodeId === nodeId)
    .map((e) => e.toNodeId);
  return targetIds
    .map((id) => file.nodes.find((n) => n.id === id))
    .filter((n): n is BlueprintNode => Boolean(n));
}

function hasIncomingEdge(file: CfgFile, nodeId: string): boolean {
  return file.edges.some((e) => e.toNodeId === nodeId);
}

/**
 * Walks downstream from a node (cycle-safe within a single file graph)
 * and collects execution steps in topological execution order.
 */
function traceNodeChain(
  file: CfgFile,
  startNode: BlueprintNode,
  fileMap: Map<string, CfgFile>,
  visitedInGraph: Set<string>,
): {
  steps: ResolvedBindStep[];
  commands: string[];
  nestedExecIds: string[];
  aliases: Array<{ name: string; pressCmd: string; releaseCmd?: string }>;
} {
  const steps: ResolvedBindStep[] = [];
  const commands: string[] = [];
  const nestedExecIds: string[] = [];
  const aliases: Array<{ name: string; pressCmd: string; releaseCmd?: string }> = [];

  const queue: BlueprintNode[] = findOutgoingNodes(file, startNode.id);

  const visit = (node: BlueprintNode, activeAlias?: { name: string; parts: string[]; releaseParts: string[] }) => {
    if (visitedInGraph.has(node.id)) return;
    visitedInGraph.add(node.id);

    if (node.type === 'modifier_gate') {
      const cond = (node.data.condition ?? '').trim() || 'condition';
      steps.push({
        kind: 'condition',
        text: `if (${cond})`,
        sourceFileId: file.id,
        sourceFilename: file.filename,
        nodeId: node.id,
      });
    } else if (node.type === 'alias_macro') {
      const aliasName = (node.data.aliasName ?? '').trim() || `+macro_${node.id.slice(-4)}`;
      steps.push({
        kind: 'alias',
        text: `alias ${aliasName}`,
        sourceFileId: file.id,
        sourceFilename: file.filename,
        nodeId: node.id,
      });
      const subAlias = { name: aliasName, parts: [] as string[], releaseParts: [] as string[] };
      const next = findOutgoingNodes(file, node.id);
      for (const n of next) {
        visit(n, subAlias);
      }
      aliases.push({
        name: aliasName,
        pressCmd: subAlias.parts.join('; ') || 'echo "empty_macro"',
        releaseCmd: subAlias.releaseParts.length > 0 ? subAlias.releaseParts.join('; ') : undefined,
      });
      commands.push(aliasName);
      return;
    } else if (node.type === 'delay') {
      const ms = Math.max(1, Number(node.data.delayMs ?? 16));
      const cmd = `wait ${ms}`;
      steps.push({
        kind: 'delay',
        text: `wait ${ms}ms`,
        sourceFileId: file.id,
        sourceFilename: file.filename,
        nodeId: node.id,
      });
      if (activeAlias) activeAlias.parts.push(cmd);
      else commands.push(cmd);
    } else if (node.type === 'command') {
      const cmd = (node.data.commandText ?? '').trim();
      const rel = (node.data.releaseCommand ?? '').trim();
      if (cmd) {
        steps.push({
          kind: 'command',
          text: rel ? `${cmd} / ${rel}` : cmd,
          sourceFileId: file.id,
          sourceFilename: file.filename,
          nodeId: node.id,
        });
        if (activeAlias) {
          activeAlias.parts.push(cmd);
          if (rel) activeAlias.releaseParts.push(rel);
        } else {
          commands.push(cmd);
        }
      }
    } else if (node.type === 'exec_cfg') {
      const target = node.data.targetCfgId ? fileMap.get(node.data.targetCfgId) : undefined;
      if (target) {
        const execCmd = `exec "${target.filename}"`;
        steps.push({
          kind: 'exec',
          text: execCmd,
          sourceFileId: file.id,
          sourceFilename: file.filename,
          nodeId: node.id,
        });
        nestedExecIds.push(target.id);
        if (activeAlias) activeAlias.parts.push(execCmd);
        else commands.push(execCmd);
      }
    }

    const next = findOutgoingNodes(file, node.id);
    for (const n of next) {
      visit(n, activeAlias);
    }
  };

  for (const node of queue) {
    visit(node);
  }

  return { steps, commands, nestedExecIds, aliases };
}

/**
 * Compiles a single Blueprint CFG file into Source / Quake / Custom C++ .cfg text.
 */
export function compileCfgFile(
  file: CfgFile,
  allFiles: CfgFile[],
  rgbProfile?: RgbLightingProfile,
): string {
  const fileMap = new Map(allFiles.map((f) => [f.id, f]));
  const lines: string[] = [];

  lines.push(`// =================================================================`);
  lines.push(`// File: ${file.filename}`);
  if (file.description) {
    lines.push(`// Desc: ${file.description}`);
  }
  lines.push(`// Generated by KeyForge 3D Blueprint Graph`);
  lines.push(`// =================================================================`);
  lines.push('');

  const aliasLines: string[] = [];
  const bindLines: string[] = [];
  const topLevelExecLines: string[] = [];

  // 1. Standalone top-level exec_cfg nodes (not triggered by a specific key)
  for (const node of file.nodes) {
    if (node.type === 'exec_cfg' && !hasIncomingEdge(file, node.id)) {
      const target = node.data.targetCfgId ? fileMap.get(node.data.targetCfgId) : undefined;
      if (target) {
        const note = node.data.note ? ` // ${node.data.note}` : '';
        topLevelExecLines.push(`exec "${target.filename}"${note}`);
      }
    }
  }

  // 2. Key Input nodes -> aliases + bind statements
  for (const node of file.nodes) {
    if (node.type !== 'key_input' || !node.data.keyCode) continue;
    const sc = getScancode(node.data.keyCode);
    const traced = traceNodeChain(file, node, fileMap, new Set([node.id]));

    for (const al of traced.aliases) {
      aliasLines.push(`alias "${al.name}" "${al.pressCmd}"`);
      if (al.releaseCmd && al.name.startsWith('+')) {
        const minusName = `-${al.name.slice(1)}`;
        aliasLines.push(`alias "${minusName}" "${al.releaseCmd}"`);
      }
    }

    if (traced.commands.length > 0) {
      const payload = traced.commands.join('; ');
      const conditionSteps = traced.steps.filter((s) => s.kind === 'condition');
      if (conditionSteps.length > 0) {
        bindLines.push(`// Guard: ${conditionSteps.map((c) => c.text).join(' && ')}`);
      }
      bindLines.push(`bind "${sc.cfgName}" "${payload}"`);
    }
  }

  if (aliasLines.length > 0) {
    lines.push('// --- Macros & Aliases ---');
    lines.push(...aliasLines);
    lines.push('');
  }

  if (bindLines.length > 0) {
    lines.push('// --- Key Bindings ---');
    lines.push(...bindLines);
    lines.push('');
  }

  if (topLevelExecLines.length > 0) {
    lines.push('// --- Nested CFG Includes ---');
    lines.push(...topLevelExecLines);
    lines.push('');
  }

  if (file.isRoot && rgbProfile) {
    lines.push(compileRgbCfgSection(rgbProfile));
    lines.push('');
  }

  if (
    aliasLines.length === 0 &&
    bindLines.length === 0 &&
    topLevelExecLines.length === 0 &&
    !(file.isRoot && rgbProfile)
  ) {
    lines.push('// (No active nodes wired in this CFG graph yet)');
  }

  return lines.join('\n');
}

/**
 * Builds the recursive CFG `exec` dependency tree starting from rootFileId,
 * guarding against circular includes.
 */
export function buildCfgIncludeTree(
  rootFileId: string,
  allFiles: CfgFile[],
): CfgIncludeTreeNode | null {
  const fileMap = new Map(allFiles.map((f) => [f.id, f]));
  const root = fileMap.get(rootFileId);
  if (!root) return null;

  const visit = (file: CfgFile, depth: number, ancestorIds: string[], ancestorNames: string[]): CfgIncludeTreeNode => {
    const bindCount = file.nodes.filter((n) => n.type === 'key_input' && Boolean(n.data.keyCode)).length;

    if (ancestorIds.includes(file.id)) {
      return {
        fileId: file.id,
        filename: file.filename,
        depth,
        isCycle: true,
        cyclePath: [...ancestorNames, file.filename],
        children: [],
        bindCount,
      };
    }

    const nextAncestors = [...ancestorIds, file.id];
    const nextNames = [...ancestorNames, file.filename];
    const execTargets: CfgFile[] = [];
    const seenChildIds = new Set<string>();

    for (const node of file.nodes) {
      if (node.type === 'exec_cfg' && node.data.targetCfgId) {
        const target = fileMap.get(node.data.targetCfgId);
        if (target && !seenChildIds.has(target.id)) {
          seenChildIds.add(target.id);
          execTargets.push(target);
        }
      }
    }

    return {
      fileId: file.id,
      filename: file.filename,
      depth,
      isCycle: false,
      children: execTargets.map((child) => visit(child, depth + 1, nextAncestors, nextNames)),
      bindCount,
    };
  };

  return visit(root, 0, [], []);
}

/**
 * Resolves every key binding reachable from the root CFG (including all nested exec files).
 * Later exec overrides earlier bindings on the same key (matching Source / C++ engine semantics).
 */
export function resolveAllKeyBinds(
  rootFileId: string,
  allFiles: CfgFile[],
): {
  bindsByKey: Record<string, ResolvedKeyBind>;
  cycleWarnings: string[];
} {
  const fileMap = new Map(allFiles.map((f) => [f.id, f]));
  const bindsByKey: Record<string, ResolvedKeyBind> = {};
  const cycleWarnings: string[] = [];

  const root = fileMap.get(rootFileId);
  if (!root) return { bindsByKey, cycleWarnings };

  const walkFile = (file: CfgFile, chainIds: string[], chainNames: string[]) => {
    if (chainIds.includes(file.id)) {
      cycleWarnings.push(`检测到循环嵌套: ${[...chainNames, file.filename].join(' → ')}`);
      return;
    }

    const nextChainIds = [...chainIds, file.id];
    const nextChainNames = [...chainNames, file.filename];

    // 1. Register key_input bindings in this file
    for (const node of file.nodes) {
      if (node.type !== 'key_input' || !node.data.keyCode) continue;
      const sc = getScancode(node.data.keyCode);
      const traced = traceNodeChain(file, node, fileMap, new Set([node.id]));
      if (traced.commands.length === 0 && traced.steps.length === 0) continue;

      const nestedExecFiles = traced.nestedExecIds
        .map((id) => fileMap.get(id)?.filename)
        .filter((name): name is string => Boolean(name));

      bindsByKey[node.data.keyCode] = {
        keyCode: node.data.keyCode,
        cfgKeyName: sc.cfgName,
        triggerMode: node.data.triggerMode ?? 'press',
        triggerFrequency: getEffectiveTriggerFrequency(node),
        sourceFileId: file.id,
        sourceFilename: file.filename,
        sourceNodeId: node.id,
        includeChain: nextChainNames,
        summary: traced.commands.join(' ; ') || traced.steps.map((s) => s.text).join(' → '),
        commands: traced.commands,
        steps: traced.steps,
        nestedExecFiles,
      };
    }

    // 2. Recursively follow top-level exec_cfg nodes
    for (const node of file.nodes) {
      if (node.type === 'exec_cfg' && !hasIncomingEdge(file, node.id) && node.data.targetCfgId) {
        const target = fileMap.get(node.data.targetCfgId);
        if (target) {
          walkFile(target, nextChainIds, nextChainNames);
        }
      }
    }
  };

  walkFile(root, [], []);
  return { bindsByKey, cycleWarnings };
}

/**
 * Generates a drop-in C++17 single header (`KeyBindRegistry.hpp`)
 * supporting GLFW, SDL2, or Win32 VK scancodes and recursive `.cfg` `exec` parsing.
 */
export function generateCppHeader(
  rootFileId: string,
  allFiles: CfgFile[],
  backend: CppBackend,
): string {
  const { bindsByKey } = resolveAllKeyBinds(rootFileId, allFiles);
  const binds = Object.values(bindsByKey).sort((a, b) => a.keyCode.localeCompare(b.keyCode));

  const includeHeader =
    backend === 'glfw'
      ? '#include <GLFW/glfw3.h>'
      : backend === 'sdl2'
        ? '#include <SDL2/SDL_scancode.h>'
        : '#include <Windows.h>';

  const keyType =
    backend === 'glfw' ? 'int' : backend === 'sdl2' ? 'SDL_Scancode' : 'uint32_t';

  const getNativeKey = (code: string) => {
    const sc = getScancode(code);
    if (backend === 'glfw') return sc.glfw;
    if (backend === 'sdl2') return sc.sdl2;
    return sc.win32;
  };

  const escapeCpp = (s: string) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  const tableRows = binds.map((b) => {
    const nativeCode = getNativeKey(b.keyCode);
    const modeEnum =
      b.triggerMode === 'hold'
        ? 'TriggerMode::Hold'
        : b.triggerMode === 'release'
          ? 'TriggerMode::Release'
          : b.triggerMode === 'toggle'
            ? 'TriggerMode::Toggle'
            : 'TriggerMode::Press';
    return `        { ${nativeCode}, "${escapeCpp(b.cfgKeyName)}", ${modeEnum}, "${escapeCpp(b.commands.join('; '))}", "${escapeCpp(b.sourceFilename)}" },`;
  });

  return `#pragma once
// KeyForge 3D — Auto-Generated C++17 KeyBind & Nested CFG Loader
// Backend: ${backend.toUpperCase()} | Bound Keys: ${binds.length} | CFG Files: ${allFiles.length}

#include <cstdint>
#include <fstream>
#include <functional>
#include <sstream>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
${includeHeader}

namespace KeyForge {

enum class TriggerMode : uint8_t {
    Press   = 0,
    Hold    = 1,
    Release = 2,
    Toggle  = 3
};

struct KeyBinding {
    ${keyType} nativeKey;
    std::string cfgKeyName;
    TriggerMode mode;
    std::string commandChain;
    std::string sourceCfg;
};

class KeyBindManager {
public:
    using CommandCallback = std::function<void(const std::string&)>;

    void LoadDefaultBindings() {
        static const std::vector<KeyBinding> kDefaults = {
${tableRows.join('\n') || '        // No key bindings defined yet'}
        };
        for (const auto& entry : kDefaults) {
            m_bindings[entry.nativeKey] = entry;
            m_cfgNameToKey[entry.cfgKeyName] = entry.nativeKey;
        }
    }

    // Recursively executes a .cfg file with cycle detection for nested "exec" statements
    bool ExecCfgFile(const std::string& filepath, std::unordered_set<std::string>& visited) {
        if (visited.count(filepath)) {
            return false; // Prevent circular exec loop
        }
        visited.insert(filepath);

        std::ifstream stream(filepath);
        if (!stream.is_open()) return false;

        std::string line;
        while (std::getline(stream, line)) {
            auto commentPos = line.find("//");
            if (commentPos != std::string::npos) line = line.substr(0, commentPos);
            std::istringstream iss(line);
            std::string verb;
            if (!(iss >> verb)) continue;

            if (verb == "exec") {
                std::string nestedPath;
                iss >> std::ws;
                if (iss.peek() == '"') {
                    iss.get();
                    std::getline(iss, nestedPath, '"');
                } else {
                    iss >> nestedPath;
                }
                if (!nestedPath.empty()) ExecCfgFile(nestedPath, visited);
            } else if (verb == "bind") {
                std::string keyName, cmd;
                iss >> std::ws;
                if (iss.peek() == '"') { iss.get(); std::getline(iss, keyName, '"'); }
                else { iss >> keyName; }
                iss >> std::ws;
                if (iss.peek() == '"') { iss.get(); std::getline(iss, cmd, '"'); }
                else { std::getline(iss, cmd); }

                auto it = m_cfgNameToKey.find(keyName);
                if (it != m_cfgNameToKey.end()) {
                    m_bindings[it->second].commandChain = cmd;
                    m_bindings[it->second].sourceCfg = filepath;
                }
            }
        }
        return true;
    }

    void OnKeyEvent(${keyType} key, bool isPressed, const CommandCallback& dispatch) const {
        auto it = m_bindings.find(key);
        if (it == m_bindings.end()) return;
        const auto& b = it->second;
        if (isPressed && (b.mode == TriggerMode::Press || b.mode == TriggerMode::Hold || b.mode == TriggerMode::Toggle)) {
            dispatch(b.commandChain);
        }
    }

    const std::unordered_map<${keyType}, KeyBinding>& GetAll() const { return m_bindings; }

private:
    std::unordered_map<${keyType}, KeyBinding> m_bindings;
    std::unordered_map<std::string, ${keyType}> m_cfgNameToKey;
};

} // namespace KeyForge
`;
}
