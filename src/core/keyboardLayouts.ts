import type { KeyboardModelId, KeyboardModelSpec, KeyDef } from './types';

function makeMainAlphas(rowOffsetY: number): KeyDef[] {
  const keys: KeyDef[] = [];
  const r1 = rowOffsetY;
  const r2 = rowOffsetY + 1;
  const r3 = rowOffsetY + 2;
  const r4 = rowOffsetY + 3;

  // Row 1: Number row (15U total)
  const numRow: Array<[string, string, string?, number?, KeyDef['category']?]> = [
    ['Backquote', '`', '~', 1, 'modifier'],
    ['Digit1', '1', '!', 1, 'alpha'],
    ['Digit2', '2', '@', 1, 'alpha'],
    ['Digit3', '3', '#', 1, 'alpha'],
    ['Digit4', '4', '$', 1, 'alpha'],
    ['Digit5', '5', '%', 1, 'alpha'],
    ['Digit6', '6', '^', 1, 'alpha'],
    ['Digit7', '7', '&', 1, 'alpha'],
    ['Digit8', '8', '*', 1, 'alpha'],
    ['Digit9', '9', '(', 1, 'alpha'],
    ['Digit0', '0', ')', 1, 'alpha'],
    ['Minus', '-', '_', 1, 'alpha'],
    ['Equal', '=', '+', 1, 'alpha'],
    ['Backspace', 'BKSP', undefined, 2, 'modifier'],
  ];
  let cx = 0;
  for (const [code, label, subLabel, w = 1, category = 'alpha'] of numRow) {
    keys.push({ code, label, subLabel, x: cx, y: r1, w, rowProfile: 1, category });
    cx += w;
  }

  // Row 2: QWERTY (15U total)
  const qwertyRow: Array<[string, string, string?, number?, KeyDef['category']?]> = [
    ['Tab', 'TAB', undefined, 1.5, 'modifier'],
    ['KeyQ', 'Q'],
    ['KeyW', 'W'],
    ['KeyE', 'E'],
    ['KeyR', 'R'],
    ['KeyT', 'T'],
    ['KeyY', 'Y'],
    ['KeyU', 'U'],
    ['KeyI', 'I'],
    ['KeyO', 'O'],
    ['KeyP', 'P'],
    ['BracketLeft', '[', '{'],
    ['BracketRight', ']', '}'],
    ['Backslash', '\\', '|', 1.5, 'modifier'],
  ];
  cx = 0;
  for (const [code, label, subLabel, w = 1, category = 'alpha'] of qwertyRow) {
    keys.push({ code, label, subLabel, x: cx, y: r2, w, rowProfile: 2, category });
    cx += w;
  }

  // Row 3: Home row (15U total)
  const homeRow: Array<[string, string, string?, number?, KeyDef['category']?]> = [
    ['CapsLock', 'CAPS', undefined, 1.75, 'modifier'],
    ['KeyA', 'A'],
    ['KeyS', 'S'],
    ['KeyD', 'D'],
    ['KeyF', 'F'],
    ['KeyG', 'G'],
    ['KeyH', 'H'],
    ['KeyJ', 'J'],
    ['KeyK', 'K'],
    ['KeyL', 'L'],
    ['Semicolon', ';', ':'],
    ['Quote', "'", '"'],
    ['Enter', 'ENTER', undefined, 2.25, 'accent'],
  ];
  cx = 0;
  for (const [code, label, subLabel, w = 1, category = 'alpha'] of homeRow) {
    keys.push({ code, label, subLabel, x: cx, y: r3, w, rowProfile: 3, category });
    cx += w;
  }

  // Row 4: Shift row
  const shiftRow: Array<[string, string, string?, number?, KeyDef['category']?]> = [
    ['ShiftLeft', 'SHIFT', undefined, 2.25, 'modifier'],
    ['KeyZ', 'Z'],
    ['KeyX', 'X'],
    ['KeyC', 'C'],
    ['KeyV', 'V'],
    ['KeyB', 'B'],
    ['KeyN', 'N'],
    ['KeyM', 'M'],
    ['Comma', ',', '<'],
    ['Period', '.', '>'],
    ['Slash', '/', '?'],
  ];
  cx = 0;
  for (const [code, label, subLabel, w = 1, category = 'alpha'] of shiftRow) {
    keys.push({ code, label, subLabel, x: cx, y: r4, w, rowProfile: 4, category });
    cx += w;
  }

  return keys;
}

function buildCompact60(): KeyboardModelSpec {
  const keys = makeMainAlphas(0);
  // Replace Backquote with ESC on 60%
  const first = keys.find((k) => k.code === 'Backquote');
  if (first) {
    first.code = 'Escape';
    first.label = 'ESC';
    first.subLabel = undefined;
    first.category = 'accent';
  }
  // Complete Shift row (2.75U Right Shift)
  keys.push({
    code: 'ShiftRight',
    label: 'SHIFT',
    x: 12.25,
    y: 3,
    w: 2.75,
    rowProfile: 4,
    category: 'modifier',
  });
  // Bottom Row (15U)
  const bottom: Array<[string, string, number, KeyDef['category']]> = [
    ['ControlLeft', 'CTRL', 1.25, 'modifier'],
    ['MetaLeft', 'WIN', 1.25, 'modifier'],
    ['AltLeft', 'ALT', 1.25, 'modifier'],
    ['Space', 'SPACE', 6.25, 'alpha'],
    ['AltRight', 'ALT', 1.25, 'modifier'],
    ['Fn', 'FN', 1.25, 'modifier'],
    ['ControlRight', 'CTRL', 2.5, 'modifier'],
  ];
  let cx = 0;
  for (const [code, label, w, category] of bottom) {
    keys.push({ code, label, x: cx, y: 4, w, rowProfile: 4, category });
    cx += w;
  }

  return {
    id: 'compact60',
    name: '60% 紧凑战术机械键盘',
    shortName: '60% 战术版',
    formFactor: '60% ANSI · 61 键',
    description: '高紧凑 6° 倾角 CNC 铝合金机身，无独立方向区，极简桌面占用，适合 FPS 竞技游戏内嵌建模。',
    keyCount: keys.length,
    tiltDegrees: 6,
    hasBrassWeight: true,
    casePaddingX: 0.42,
    casePaddingY: 0.42,
    keys,
  };
}

function buildPro75(): KeyboardModelSpec {
  const keys: KeyDef[] = [];

  // Function Row (y = 0) with ESC + F1-F12 + DEL + Rotary Knob slot at x = 15
  keys.push({ code: 'Escape', label: 'ESC', x: 0, y: 0, w: 1, rowProfile: 1, category: 'accent' });
  for (let i = 1; i <= 12; i++) {
    const gap = i <= 4 ? 0.25 : i <= 8 ? 0.5 : 0.75;
    keys.push({
      code: `F${i}`,
      label: `F${i}`,
      x: i + gap,
      y: 0,
      w: 1,
      rowProfile: 1,
      category: 'function',
    });
  }
  keys.push({ code: 'Delete', label: 'DEL', x: 14, y: 0, w: 1, rowProfile: 1, category: 'nav' });

  // Main alpha block starting at y = 1.25
  const baseAlphas = makeMainAlphas(1.25);
  keys.push(...baseAlphas);

  // Right Shift (1.75U) + ArrowUp + End on Shift row (y = 4.25)
  keys.push({ code: 'ShiftRight', label: 'SHIFT', x: 12.25, y: 4.25, w: 1.75, rowProfile: 4, category: 'modifier' });
  keys.push({ code: 'ArrowUp', label: '↑', x: 14.0, y: 4.25, w: 1, rowProfile: 4, category: 'nav' });
  keys.push({ code: 'End', label: 'END', x: 15.25, y: 4.25, w: 1, rowProfile: 4, category: 'nav' });

  // Right nav column (x = 15.25)
  keys.push({ code: 'Home', label: 'HOME', x: 15.25, y: 1.25, w: 1, rowProfile: 1, category: 'nav' });
  keys.push({ code: 'PageUp', label: 'PGUP', x: 15.25, y: 2.25, w: 1, rowProfile: 2, category: 'nav' });
  keys.push({ code: 'PageDown', label: 'PGDN', x: 15.25, y: 3.25, w: 1, rowProfile: 3, category: 'nav' });

  // Bottom Row (y = 5.25)
  const bottom: Array<[string, string, number, KeyDef['category']]> = [
    ['ControlLeft', 'CTRL', 1.25, 'modifier'],
    ['MetaLeft', 'WIN', 1.25, 'modifier'],
    ['AltLeft', 'ALT', 1.25, 'modifier'],
    ['Space', 'SPACE', 6.25, 'alpha'],
    ['AltRight', 'ALT', 1, 'modifier'],
    ['Fn', 'FN', 1, 'modifier'],
    ['ControlRight', 'CTRL', 1, 'modifier'],
  ];
  let cx = 0;
  for (const [code, label, w, category] of bottom) {
    keys.push({ code, label, x: cx, y: 5.25, w, rowProfile: 4, category });
    cx += w;
  }
  keys.push({ code: 'ArrowLeft', label: '←', x: 13.0, y: 5.25, w: 1, rowProfile: 4, category: 'nav' });
  keys.push({ code: 'ArrowDown', label: '↓', x: 14.0, y: 5.25, w: 1, rowProfile: 4, category: 'nav' });
  keys.push({ code: 'ArrowRight', label: '→', x: 15.0, y: 5.25, w: 1, rowProfile: 4, category: 'nav' });

  return {
    id: 'pro75',
    name: '75% 旋钮专业机械键盘',
    shortName: '75% 旋钮版',
    formFactor: '75% Exploded · 82 键 + 旋钮',
    description: '客制化 CNC 铝合金框架，内置滚花金属编码器旋钮、状态指示灯条与独立功能区，适合中大型 C++ 游戏调试与演示。',
    keyCount: keys.length,
    tiltDegrees: 6.5,
    hasRotaryKnob: true,
    knobPosition: { x: 15.75, y: 0.5 },
    hasOledBar: true,
    oledPosition: { x: 15.75, y: 1.05, w: 0.85 },
    hasBrassWeight: true,
    casePaddingX: 0.48,
    casePaddingY: 0.45,
    keys,
  };
}

function buildTkl80(): KeyboardModelSpec {
  const keys: KeyDef[] = [];

  // F-row (y = 0) with classic ANSI 4-4-4 clusters
  keys.push({ code: 'Escape', label: 'ESC', x: 0, y: 0, w: 1, rowProfile: 1, category: 'accent' });
  for (let i = 1; i <= 4; i++) {
    keys.push({ code: `F${i}`, label: `F${i}`, x: 1 + i, y: 0, w: 1, rowProfile: 1, category: 'function' });
  }
  for (let i = 5; i <= 8; i++) {
    keys.push({ code: `F${i}`, label: `F${i}`, x: 1.5 + i, y: 0, w: 1, rowProfile: 1, category: 'function' });
  }
  for (let i = 9; i <= 12; i++) {
    keys.push({ code: `F${i}`, label: `F${i}`, x: 2 + i, y: 0, w: 1, rowProfile: 1, category: 'function' });
  }
  keys.push({ code: 'PrintScreen', label: 'PRT', x: 15.5, y: 0, w: 1, rowProfile: 1, category: 'nav' });
  keys.push({ code: 'ScrollLock', label: 'SCR', x: 16.5, y: 0, w: 1, rowProfile: 1, category: 'nav' });
  keys.push({ code: 'Pause', label: 'PAU', x: 17.5, y: 0, w: 1, rowProfile: 1, category: 'nav' });

  // Main alpha block starting at y = 1.35
  const baseAlphas = makeMainAlphas(1.35);
  keys.push(...baseAlphas);
  keys.push({ code: 'ShiftRight', label: 'SHIFT', x: 12.25, y: 4.35, w: 2.75, rowProfile: 4, category: 'modifier' });

  // Bottom Row (y = 5.35)
  const bottom: Array<[string, string, number, KeyDef['category']]> = [
    ['ControlLeft', 'CTRL', 1.25, 'modifier'],
    ['MetaLeft', 'WIN', 1.25, 'modifier'],
    ['AltLeft', 'ALT', 1.25, 'modifier'],
    ['Space', 'SPACE', 6.25, 'alpha'],
    ['AltRight', 'ALT', 1.25, 'modifier'],
    ['Fn', 'FN', 1.25, 'modifier'],
    ['ControlRight', 'CTRL', 2.5, 'modifier'],
  ];
  let cx = 0;
  for (const [code, label, w, category] of bottom) {
    keys.push({ code, label, x: cx, y: 5.35, w, rowProfile: 4, category });
    cx += w;
  }

  // Nav 6-key cluster (x = 15.5..18.5)
  keys.push({ code: 'Insert', label: 'INS', x: 15.5, y: 1.35, w: 1, rowProfile: 1, category: 'nav' });
  keys.push({ code: 'Home', label: 'HOME', x: 16.5, y: 1.35, w: 1, rowProfile: 1, category: 'nav' });
  keys.push({ code: 'PageUp', label: 'PGUP', x: 17.5, y: 1.35, w: 1, rowProfile: 1, category: 'nav' });

  keys.push({ code: 'Delete', label: 'DEL', x: 15.5, y: 2.35, w: 1, rowProfile: 2, category: 'nav' });
  keys.push({ code: 'End', label: 'END', x: 16.5, y: 2.35, w: 1, rowProfile: 2, category: 'nav' });
  keys.push({ code: 'PageDown', label: 'PGDN', x: 17.5, y: 2.35, w: 1, rowProfile: 2, category: 'nav' });

  // Inverted-T Arrow Cluster
  keys.push({ code: 'ArrowUp', label: '↑', x: 16.5, y: 4.35, w: 1, rowProfile: 4, category: 'accent' });
  keys.push({ code: 'ArrowLeft', label: '←', x: 15.5, y: 5.35, w: 1, rowProfile: 4, category: 'accent' });
  keys.push({ code: 'ArrowDown', label: '↓', x: 16.5, y: 5.35, w: 1, rowProfile: 4, category: 'accent' });
  keys.push({ code: 'ArrowRight', label: '→', x: 17.5, y: 5.35, w: 1, rowProfile: 4, category: 'accent' });

  return {
    id: 'tkl80',
    name: '80% TKL 竞技经典键盘',
    shortName: '80% TKL 竞技版',
    formFactor: '80% TKL · 87 键',
    description: '标准 87 键电竞布局，完整保留独立功能键与倒 T 型方向区，配备阳极分隔饰条与底部黄铜配重。',
    keyCount: keys.length,
    tiltDegrees: 7,
    hasBrassWeight: true,
    casePaddingX: 0.5,
    casePaddingY: 0.48,
    keys,
  };
}

function buildKeypadLeft(): KeyboardModelSpec {
  const keys: KeyDef[] = [
    // Row 0: Escape + F1-F4
    { code: 'Escape', label: 'ESC', x: 0, y: 0, w: 1, rowProfile: 1, category: 'accent' },
    { code: 'F1', label: 'F1', x: 1.25, y: 0, w: 1, rowProfile: 1, category: 'function' },
    { code: 'F2', label: 'F2', x: 2.25, y: 0, w: 1, rowProfile: 1, category: 'function' },
    { code: 'F3', label: 'F3', x: 3.25, y: 0, w: 1, rowProfile: 1, category: 'function' },
    { code: 'F4', label: 'F4', x: 4.25, y: 0, w: 1, rowProfile: 1, category: 'function' },
    { code: 'F5', label: 'F5', x: 5.25, y: 0, w: 1, rowProfile: 1, category: 'function' },

    // Row 1: ` 1 2 3 4 5
    { code: 'Backquote', label: '`', x: 0, y: 1.2, w: 1, rowProfile: 1, category: 'modifier' },
    { code: 'Digit1', label: '1', x: 1, y: 1.2, w: 1, rowProfile: 1, category: 'alpha' },
    { code: 'Digit2', label: '2', x: 2, y: 1.2, w: 1, rowProfile: 1, category: 'alpha' },
    { code: 'Digit3', label: '3', x: 3, y: 1.2, w: 1, rowProfile: 1, category: 'alpha' },
    { code: 'Digit4', label: '4', x: 4, y: 1.2, w: 1, rowProfile: 1, category: 'alpha' },
    { code: 'Digit5', label: '5', x: 5, y: 1.2, w: 1.25, rowProfile: 1, category: 'alpha' },

    // Row 2: TAB Q W E R T
    { code: 'Tab', label: 'TAB', x: 0, y: 2.2, w: 1.25, rowProfile: 2, category: 'modifier' },
    { code: 'KeyQ', label: 'Q', x: 1.25, y: 2.2, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'KeyW', label: 'W', x: 2.25, y: 2.2, w: 1, rowProfile: 2, category: 'accent' },
    { code: 'KeyE', label: 'E', x: 3.25, y: 2.2, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'KeyR', label: 'R', x: 4.25, y: 2.2, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'KeyT', label: 'T', x: 5.25, y: 2.2, w: 1, rowProfile: 2, category: 'alpha' },

    // Row 3: CAPS A S D F G
    { code: 'CapsLock', label: 'CAPS', x: 0, y: 3.2, w: 1.25, rowProfile: 3, category: 'modifier' },
    { code: 'KeyA', label: 'A', x: 1.25, y: 3.2, w: 1, rowProfile: 3, category: 'accent' },
    { code: 'KeyS', label: 'S', x: 2.25, y: 3.2, w: 1, rowProfile: 3, category: 'accent' },
    { code: 'KeyD', label: 'D', x: 3.25, y: 3.2, w: 1, rowProfile: 3, category: 'accent' },
    { code: 'KeyF', label: 'F', x: 4.25, y: 3.2, w: 1, rowProfile: 3, category: 'alpha' },
    { code: 'KeyG', label: 'G', x: 5.25, y: 3.2, w: 1, rowProfile: 3, category: 'alpha' },

    // Row 4: SHIFT Z X C V B
    { code: 'ShiftLeft', label: 'SHIFT', x: 0, y: 4.2, w: 1.5, rowProfile: 4, category: 'modifier' },
    { code: 'KeyZ', label: 'Z', x: 1.5, y: 4.2, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'KeyX', label: 'X', x: 2.5, y: 4.2, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'KeyC', label: 'C', x: 3.5, y: 4.2, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'KeyV', label: 'V', x: 4.5, y: 4.2, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'KeyB', label: 'B', x: 5.5, y: 4.2, w: 0.75, rowProfile: 4, category: 'alpha' },

    // Row 5: Thumb cluster (CTRL, ALT, SPACE)
    { code: 'ControlLeft', label: 'CTRL', x: 0, y: 5.2, w: 1.5, rowProfile: 4, category: 'modifier' },
    { code: 'AltLeft', label: 'ALT', x: 1.5, y: 5.2, w: 1.5, rowProfile: 4, category: 'modifier' },
    { code: 'Space', label: 'SPACE', x: 3.25, y: 5.2, w: 3.0, rowProfile: 4, category: 'accent' },
  ];

  return {
    id: 'keypadLeft',
    name: '左手微操游戏单手键盘',
    shortName: '单手微操版',
    formFactor: 'FPS Keypad · 33 键 + 掌托',
    description: '专为 FPS / MOBA 与动作 C++ 游戏打造的左手单手键盘，整合一体式倾斜掌托与宽大拇指空格区。',
    keyCount: keys.length,
    tiltDegrees: 8,
    hasWristRest: true,
    hasBrassWeight: true,
    casePaddingX: 0.55,
    casePaddingY: 0.48,
    keys,
  };
}

function makeNumpadCluster(offsetX: number, offsetY: number): KeyDef[] {
  return [
    // Row 0 of Numpad
    { code: 'NumLock', label: 'NUM', x: offsetX, y: offsetY, w: 1, rowProfile: 1, category: 'modifier' },
    { code: 'NumpadDivide', label: '/', x: offsetX + 1, y: offsetY, w: 1, rowProfile: 1, category: 'modifier' },
    { code: 'NumpadMultiply', label: '*', x: offsetX + 2, y: offsetY, w: 1, rowProfile: 1, category: 'modifier' },
    { code: 'NumpadSubtract', label: '-', x: offsetX + 3, y: offsetY, w: 1, rowProfile: 1, category: 'modifier' },
    // Row 1: 7 8 9 + (2U tall)
    { code: 'Numpad7', label: '7', subLabel: 'HOME', x: offsetX, y: offsetY + 1, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'Numpad8', label: '8', subLabel: '↑', x: offsetX + 1, y: offsetY + 1, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'Numpad9', label: '9', subLabel: 'PGUP', x: offsetX + 2, y: offsetY + 1, w: 1, rowProfile: 2, category: 'alpha' },
    { code: 'NumpadAdd', label: '+', x: offsetX + 3, y: offsetY + 1, w: 1, h: 2, rowProfile: 2, category: 'modifier' },
    // Row 2: 4 5 6
    { code: 'Numpad4', label: '4', subLabel: '←', x: offsetX, y: offsetY + 2, w: 1, rowProfile: 3, category: 'alpha' },
    { code: 'Numpad5', label: '5', x: offsetX + 1, y: offsetY + 2, w: 1, rowProfile: 3, category: 'alpha' },
    { code: 'Numpad6', label: '6', subLabel: '→', x: offsetX + 2, y: offsetY + 2, w: 1, rowProfile: 3, category: 'alpha' },
    // Row 3: 1 2 3 Enter (2U tall)
    { code: 'Numpad1', label: '1', subLabel: 'END', x: offsetX, y: offsetY + 3, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'Numpad2', label: '2', subLabel: '↓', x: offsetX + 1, y: offsetY + 3, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'Numpad3', label: '3', subLabel: 'PGDN', x: offsetX + 2, y: offsetY + 3, w: 1, rowProfile: 4, category: 'alpha' },
    { code: 'NumpadEnter', label: 'ENT', x: offsetX + 3, y: offsetY + 3, w: 1, h: 2, rowProfile: 4, category: 'accent' },
    // Row 4: 0 (2U wide) .
    { code: 'Numpad0', label: '0', subLabel: 'INS', x: offsetX, y: offsetY + 4, w: 2, rowProfile: 4, category: 'alpha' },
    { code: 'NumpadDecimal', label: '.', subLabel: 'DEL', x: offsetX + 2, y: offsetY + 4, w: 1, rowProfile: 4, category: 'alpha' },
  ];
}

function buildNumpad21(): KeyboardModelSpec {
  const keys: KeyDef[] = [
    // Top Macro / Function strip (y = 0) + Rotary Knob at x = 3.5
    { code: 'Escape', label: 'ESC', x: 0, y: 0, w: 1, rowProfile: 1, category: 'accent' },
    { code: 'Tab', label: 'TAB', x: 1, y: 0, w: 1, rowProfile: 1, category: 'function' },
    { code: 'Backspace', label: 'BKSP', x: 2, y: 0, w: 1, rowProfile: 1, category: 'function' },
    ...makeNumpadCluster(0, 1.2),
  ];

  return {
    id: 'numpad21',
    name: '20 键 CNC 独立小数字键盘',
    shortName: '小数字键盘',
    formFactor: 'Numpad · 20 键 + 滚花旋钮',
    description: '客制化独立小数字宏键盘，配备 2U 竖长加号/回车键、滚花金属旋钮与底部黄铜配重，专为 FPS 快捷买枪与 C++ 宏命令设计。',
    keyCount: keys.length,
    tiltDegrees: 7,
    hasRotaryKnob: true,
    knobPosition: { x: 3.5, y: 0.5 },
    hasOledBar: true,
    oledPosition: { x: 3.5, y: 1.0, w: 0.85 },
    hasBrassWeight: true,
    casePaddingX: 0.55,
    casePaddingY: 0.5,
    keys,
  };
}

function buildFull104(): KeyboardModelSpec {
  const baseTkl = buildTkl80();
  const numpadKeys = makeNumpadCluster(19.0, 1.35);
  const keys = [...baseTkl.keys, ...numpadKeys];

  return {
    id: 'full104',
    name: '100% 全尺寸机械键盘（含数字小键盘）',
    shortName: '100% 全尺寸',
    formFactor: '100% ANSI · 104 键',
    description: '完整 104 键商业旗舰全尺寸配列，整合主键区、独立功能区、导航方向区及右侧标准 17 键小数字键盘。',
    keyCount: keys.length,
    tiltDegrees: 6.5,
    hasBrassWeight: true,
    casePaddingX: 0.52,
    casePaddingY: 0.48,
    keys,
  };
}

export const KEYBOARD_MODELS: Record<KeyboardModelId, KeyboardModelSpec> = {
  pro75: buildPro75(),
  numpad21: buildNumpad21(),
  full104: buildFull104(),
  compact60: buildCompact60(),
  tkl80: buildTkl80(),
  keypadLeft: buildKeypadLeft(),
};

export const KEYBOARD_MODEL_LIST: KeyboardModelSpec[] = [
  KEYBOARD_MODELS.pro75,
  KEYBOARD_MODELS.numpad21,
  KEYBOARD_MODELS.full104,
  KEYBOARD_MODELS.compact60,
  KEYBOARD_MODELS.tkl80,
  KEYBOARD_MODELS.keypadLeft,
];

export function computeLayoutBounds(spec: KeyboardModelSpec): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  widthU: number;
  depthU: number;
} {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const k of spec.keys) {
    const h = k.h ?? 1;
    if (k.x < minX) minX = k.x;
    if (k.x + k.w > maxX) maxX = k.x + k.w;
    if (k.y < minY) minY = k.y;
    if (k.y + h > maxY) maxY = k.y + h;
  }
  if (spec.hasRotaryKnob && spec.knobPosition) {
    maxX = Math.max(maxX, spec.knobPosition.x + 0.5);
  }
  return {
    minX,
    maxX,
    minY,
    maxY,
    widthU: maxX - minX,
    depthU: maxY - minY,
  };
}
