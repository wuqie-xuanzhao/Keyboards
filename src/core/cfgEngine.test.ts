import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCfgIncludeTree,
  compileCfgFile,
  generateCppHeader,
  resolveAllKeyBinds,
} from './cfgEngine';
import { createDefaultCfgProject, ROOT_CFG_ID } from './defaultCfgProject';
import type { CfgFile } from './types';

test('compiles default autoexec.cfg with nested exec statements and key binds', () => {
  const files = createDefaultCfgProject();
  const autoexec = files.find((f) => f.id === ROOT_CFG_ID)!;
  const output = compileCfgFile(autoexec, files);

  assert.match(output, /exec "movement\.cfg"/);
  assert.match(output, /exec "combat\.cfg"/);
  assert.match(output, /exec "utility\.cfg"/);
  assert.match(output, /exec "buy_numpad\.cfg"/);
  assert.match(output, /bind "f1" "toggle cl_drawhud 0 1"/);
  assert.match(output, /bind "tab" "\+showscores"/);
});

test('resolves multi-level nested CFG binds (autoexec -> combat -> grenades & buy_numpad)', () => {
  const files = createDefaultCfgProject();
  const { bindsByKey, cycleWarnings } = resolveAllKeyBinds(ROOT_CFG_ID, files);

  assert.equal(cycleWarnings.length, 0);
  // KeyW from movement.cfg (depth 1)
  assert.ok(bindsByKey.KeyW);
  assert.equal(bindsByKey.KeyW.sourceFilename, 'movement.cfg');
  assert.deepEqual(bindsByKey.KeyW.includeChain, ['autoexec.cfg', 'movement.cfg']);
  assert.equal(bindsByKey.KeyW.commands[0], '+forward');

  // KeyX from grenades.cfg (depth 2 via combat.cfg)
  assert.ok(bindsByKey.KeyX);
  assert.equal(bindsByKey.KeyX.sourceFilename, 'grenades.cfg');
  assert.deepEqual(bindsByKey.KeyX.includeChain, ['autoexec.cfg', 'combat.cfg', 'grenades.cfg']);
  assert.ok(bindsByKey.KeyX.commands.includes('+jumpthrow'));

  // Numpad1 & NumpadEnter from buy_numpad.cfg
  assert.ok(bindsByKey.Numpad1);
  assert.equal(bindsByKey.Numpad1.sourceFilename, 'buy_numpad.cfg');
  assert.deepEqual(bindsByKey.Numpad1.includeChain, ['autoexec.cfg', 'buy_numpad.cfg']);
  assert.match(bindsByKey.Numpad1.summary, /buy ak47/);
  assert.ok(bindsByKey.NumpadEnter);
});

test('detects and safely breaks circular CFG exec nesting', () => {
  const cyclicFiles: CfgFile[] = [
    {
      id: 'a',
      filename: 'a.cfg',
      description: 'root',
      isRoot: true,
      nodes: [
        { id: 'na_exec', type: 'exec_cfg', x: 0, y: 0, title: 'exec b', data: { targetCfgId: 'b' } },
        { id: 'na_k', type: 'key_input', x: 0, y: 100, title: 'W', data: { keyCode: 'KeyW', triggerMode: 'hold' } },
        { id: 'na_c', type: 'command', x: 200, y: 100, title: 'fwd', data: { commandText: '+forward' } },
      ],
      edges: [{ id: 'ea1', fromNodeId: 'na_k', fromPort: 'exec_out', toNodeId: 'na_c', toPort: 'exec_in' }],
    },
    {
      id: 'b',
      filename: 'b.cfg',
      description: 'loops back to a',
      nodes: [
        { id: 'nb_exec', type: 'exec_cfg', x: 0, y: 0, title: 'exec a', data: { targetCfgId: 'a' } },
      ],
      edges: [],
    },
  ];

  const tree = buildCfgIncludeTree('a', cyclicFiles);
  assert.ok(tree);
  assert.equal(tree.children.length, 1);
  assert.equal(tree.children[0].children.length, 1);
  assert.equal(tree.children[0].children[0].isCycle, true);

  const { bindsByKey, cycleWarnings } = resolveAllKeyBinds('a', cyclicFiles);
  assert.ok(bindsByKey.KeyW);
  assert.equal(cycleWarnings.length, 1);
  assert.match(cycleWarnings[0], /a\.cfg → b\.cfg → a\.cfg/);
});

test('generates valid C++17 header for GLFW, SDL2, and Win32 backends including numpad scancodes', () => {
  const files = createDefaultCfgProject();
  const glfwHeader = generateCppHeader(ROOT_CFG_ID, files, 'glfw');
  const sdlHeader = generateCppHeader(ROOT_CFG_ID, files, 'sdl2');
  const winHeader = generateCppHeader(ROOT_CFG_ID, files, 'win32');

  assert.match(glfwHeader, /#include <GLFW\/glfw3\.h>/);
  assert.match(glfwHeader, /GLFW_KEY_W/);
  assert.match(glfwHeader, /GLFW_KEY_KP_1/);
  assert.match(glfwHeader, /ExecCfgFile/);

  assert.match(sdlHeader, /#include <SDL2\/SDL_scancode\.h>/);
  assert.match(sdlHeader, /SDL_SCANCODE_W/);
  assert.match(sdlHeader, /SDL_SCANCODE_KP_ENTER/);

  assert.match(winHeader, /#include <Windows\.h>/);
  assert.match(winHeader, /VK_SPACE/);
  assert.match(winHeader, /VK_NUMPAD1/);
});
