import type { KeyboardModelId, KeycapLegendMode, ScancodeEntry } from './types';

export interface KeycapScancodeEntry extends ScancodeEntry {
  /** Canonical full keycap legend (e.g. "Enter", "Shift", "Backspace") */
  capLabel?: string;
  /** Compact legend used when physical key width is narrow (e.g. <= 1.25U) */
  compactCapLabel?: string;
  /** Canonical secondary shift / numpad nav legend */
  subLabel?: string;
}

const ENTRIES: KeycapScancodeEntry[] = [
  // Function Row
  { code: 'Escape', displayLabel: 'ESC', capLabel: 'Esc', cfgName: 'escape', glfw: 'GLFW_KEY_ESCAPE', sdl2: 'SDL_SCANCODE_ESCAPE', win32: 'VK_ESCAPE' },
  { code: 'F1', displayLabel: 'F1', cfgName: 'f1', glfw: 'GLFW_KEY_F1', sdl2: 'SDL_SCANCODE_F1', win32: 'VK_F1' },
  { code: 'F2', displayLabel: 'F2', cfgName: 'f2', glfw: 'GLFW_KEY_F2', sdl2: 'SDL_SCANCODE_F2', win32: 'VK_F2' },
  { code: 'F3', displayLabel: 'F3', cfgName: 'f3', glfw: 'GLFW_KEY_F3', sdl2: 'SDL_SCANCODE_F3', win32: 'VK_F3' },
  { code: 'F4', displayLabel: 'F4', cfgName: 'f4', glfw: 'GLFW_KEY_F4', sdl2: 'SDL_SCANCODE_F4', win32: 'VK_F4' },
  { code: 'F5', displayLabel: 'F5', cfgName: 'f5', glfw: 'GLFW_KEY_F5', sdl2: 'SDL_SCANCODE_F5', win32: 'VK_F5' },
  { code: 'F6', displayLabel: 'F6', cfgName: 'f6', glfw: 'GLFW_KEY_F6', sdl2: 'SDL_SCANCODE_F6', win32: 'VK_F6' },
  { code: 'F7', displayLabel: 'F7', cfgName: 'f7', glfw: 'GLFW_KEY_F7', sdl2: 'SDL_SCANCODE_F7', win32: 'VK_F7' },
  { code: 'F8', displayLabel: 'F8', cfgName: 'f8', glfw: 'GLFW_KEY_F8', sdl2: 'SDL_SCANCODE_F8', win32: 'VK_F8' },
  { code: 'F9', displayLabel: 'F9', cfgName: 'f9', glfw: 'GLFW_KEY_F9', sdl2: 'SDL_SCANCODE_F9', win32: 'VK_F9' },
  { code: 'F10', displayLabel: 'F10', cfgName: 'f10', glfw: 'GLFW_KEY_F10', sdl2: 'SDL_SCANCODE_F10', win32: 'VK_F10' },
  { code: 'F11', displayLabel: 'F11', cfgName: 'f11', glfw: 'GLFW_KEY_F11', sdl2: 'SDL_SCANCODE_F11', win32: 'VK_F11' },
  { code: 'F12', displayLabel: 'F12', cfgName: 'f12', glfw: 'GLFW_KEY_F12', sdl2: 'SDL_SCANCODE_F12', win32: 'VK_F12' },

  // Number Row
  { code: 'Backquote', displayLabel: '`', subLabel: '~', cfgName: 'toggleconsole', glfw: 'GLFW_KEY_GRAVE_ACCENT', sdl2: 'SDL_SCANCODE_GRAVE', win32: 'VK_OEM_3' },
  { code: 'Digit1', displayLabel: '1', subLabel: '!', cfgName: '1', glfw: 'GLFW_KEY_1', sdl2: 'SDL_SCANCODE_1', win32: "'1'" },
  { code: 'Digit2', displayLabel: '2', subLabel: '@', cfgName: '2', glfw: 'GLFW_KEY_2', sdl2: 'SDL_SCANCODE_2', win32: "'2'" },
  { code: 'Digit3', displayLabel: '3', subLabel: '#', cfgName: '3', glfw: 'GLFW_KEY_3', sdl2: 'SDL_SCANCODE_3', win32: "'3'" },
  { code: 'Digit4', displayLabel: '4', subLabel: '$', cfgName: '4', glfw: 'GLFW_KEY_4', sdl2: 'SDL_SCANCODE_4', win32: "'4'" },
  { code: 'Digit5', displayLabel: '5', subLabel: '%', cfgName: '5', glfw: 'GLFW_KEY_5', sdl2: 'SDL_SCANCODE_5', win32: "'5'" },
  { code: 'Digit6', displayLabel: '6', subLabel: '^', cfgName: '6', glfw: 'GLFW_KEY_6', sdl2: 'SDL_SCANCODE_6', win32: "'6'" },
  { code: 'Digit7', displayLabel: '7', subLabel: '&', cfgName: '7', glfw: 'GLFW_KEY_7', sdl2: 'SDL_SCANCODE_7', win32: "'7'" },
  { code: 'Digit8', displayLabel: '8', subLabel: '*', cfgName: '8', glfw: 'GLFW_KEY_8', sdl2: 'SDL_SCANCODE_8', win32: "'8'" },
  { code: 'Digit9', displayLabel: '9', subLabel: '(', cfgName: '9', glfw: 'GLFW_KEY_9', sdl2: 'SDL_SCANCODE_9', win32: "'9'" },
  { code: 'Digit0', displayLabel: '0', subLabel: ')', cfgName: '0', glfw: 'GLFW_KEY_0', sdl2: 'SDL_SCANCODE_0', win32: "'0'" },
  { code: 'Minus', displayLabel: '-', subLabel: '_', cfgName: '-', glfw: 'GLFW_KEY_MINUS', sdl2: 'SDL_SCANCODE_MINUS', win32: 'VK_OEM_MINUS' },
  { code: 'Equal', displayLabel: '=', subLabel: '+', cfgName: '=', glfw: 'GLFW_KEY_EQUAL', sdl2: 'SDL_SCANCODE_EQUALS', win32: 'VK_OEM_PLUS' },
  { code: 'Backspace', displayLabel: 'BKSP', capLabel: 'Backspace', compactCapLabel: 'Bksp', cfgName: 'backspace', glfw: 'GLFW_KEY_BACKSPACE', sdl2: 'SDL_SCANCODE_BACKSPACE', win32: 'VK_BACK' },

  // QWERTY Row
  { code: 'Tab', displayLabel: 'TAB', capLabel: 'Tab', cfgName: 'tab', glfw: 'GLFW_KEY_TAB', sdl2: 'SDL_SCANCODE_TAB', win32: 'VK_TAB' },
  { code: 'KeyQ', displayLabel: 'Q', cfgName: 'q', glfw: 'GLFW_KEY_Q', sdl2: 'SDL_SCANCODE_Q', win32: "'Q'" },
  { code: 'KeyW', displayLabel: 'W', cfgName: 'w', glfw: 'GLFW_KEY_W', sdl2: 'SDL_SCANCODE_W', win32: "'W'" },
  { code: 'KeyE', displayLabel: 'E', cfgName: 'e', glfw: 'GLFW_KEY_E', sdl2: 'SDL_SCANCODE_E', win32: "'E'" },
  { code: 'KeyR', displayLabel: 'R', cfgName: 'r', glfw: 'GLFW_KEY_R', sdl2: 'SDL_SCANCODE_R', win32: "'R'" },
  { code: 'KeyT', displayLabel: 'T', cfgName: 't', glfw: 'GLFW_KEY_T', sdl2: 'SDL_SCANCODE_T', win32: "'T'" },
  { code: 'KeyY', displayLabel: 'Y', cfgName: 'y', glfw: 'GLFW_KEY_Y', sdl2: 'SDL_SCANCODE_Y', win32: "'Y'" },
  { code: 'KeyU', displayLabel: 'U', cfgName: 'u', glfw: 'GLFW_KEY_U', sdl2: 'SDL_SCANCODE_U', win32: "'U'" },
  { code: 'KeyI', displayLabel: 'I', cfgName: 'i', glfw: 'GLFW_KEY_I', sdl2: 'SDL_SCANCODE_I', win32: "'I'" },
  { code: 'KeyO', displayLabel: 'O', cfgName: 'o', glfw: 'GLFW_KEY_O', sdl2: 'SDL_SCANCODE_O', win32: "'O'" },
  { code: 'KeyP', displayLabel: 'P', cfgName: 'p', glfw: 'GLFW_KEY_P', sdl2: 'SDL_SCANCODE_P', win32: "'P'" },
  { code: 'BracketLeft', displayLabel: '[', subLabel: '{', cfgName: '[', glfw: 'GLFW_KEY_LEFT_BRACKET', sdl2: 'SDL_SCANCODE_LEFTBRACKET', win32: 'VK_OEM_4' },
  { code: 'BracketRight', displayLabel: ']', subLabel: '}', cfgName: ']', glfw: 'GLFW_KEY_RIGHT_BRACKET', sdl2: 'SDL_SCANCODE_RIGHTBRACKET', win32: 'VK_OEM_6' },
  { code: 'Backslash', displayLabel: '\\', subLabel: '|', cfgName: '\\', glfw: 'GLFW_KEY_BACKSLASH', sdl2: 'SDL_SCANCODE_BACKSLASH', win32: 'VK_OEM_5' },

  // Home Row
  { code: 'CapsLock', displayLabel: 'CAPS', capLabel: 'Caps Lock', compactCapLabel: 'Caps', cfgName: 'capslock', glfw: 'GLFW_KEY_CAPS_LOCK', sdl2: 'SDL_SCANCODE_CAPSLOCK', win32: 'VK_CAPITAL' },
  { code: 'KeyA', displayLabel: 'A', cfgName: 'a', glfw: 'GLFW_KEY_A', sdl2: 'SDL_SCANCODE_A', win32: "'A'" },
  { code: 'KeyS', displayLabel: 'S', cfgName: 's', glfw: 'GLFW_KEY_S', sdl2: 'SDL_SCANCODE_S', win32: "'S'" },
  { code: 'KeyD', displayLabel: 'D', cfgName: 'd', glfw: 'GLFW_KEY_D', sdl2: 'SDL_SCANCODE_D', win32: "'D'" },
  { code: 'KeyF', displayLabel: 'F', cfgName: 'f', glfw: 'GLFW_KEY_F', sdl2: 'SDL_SCANCODE_F', win32: "'F'" },
  { code: 'KeyG', displayLabel: 'G', cfgName: 'g', glfw: 'GLFW_KEY_G', sdl2: 'SDL_SCANCODE_G', win32: "'G'" },
  { code: 'KeyH', displayLabel: 'H', cfgName: 'h', glfw: 'GLFW_KEY_H', sdl2: 'SDL_SCANCODE_H', win32: "'H'" },
  { code: 'KeyJ', displayLabel: 'J', cfgName: 'j', glfw: 'GLFW_KEY_J', sdl2: 'SDL_SCANCODE_J', win32: "'J'" },
  { code: 'KeyK', displayLabel: 'K', cfgName: 'k', glfw: 'GLFW_KEY_K', sdl2: 'SDL_SCANCODE_K', win32: "'K'" },
  { code: 'KeyL', displayLabel: 'L', cfgName: 'l', glfw: 'GLFW_KEY_L', sdl2: 'SDL_SCANCODE_L', win32: "'L'" },
  { code: 'Semicolon', displayLabel: ';', subLabel: ':', cfgName: 'semicolon', glfw: 'GLFW_KEY_SEMICOLON', sdl2: 'SDL_SCANCODE_SEMICOLON', win32: 'VK_OEM_1' },
  { code: 'Quote', displayLabel: "'", subLabel: '"', cfgName: "'", glfw: 'GLFW_KEY_APOSTROPHE', sdl2: 'SDL_SCANCODE_APOSTROPHE', win32: 'VK_OEM_7' },
  { code: 'Enter', displayLabel: 'ENTER', capLabel: 'Enter', compactCapLabel: 'Ent', cfgName: 'enter', glfw: 'GLFW_KEY_ENTER', sdl2: 'SDL_SCANCODE_RETURN', win32: 'VK_RETURN' },

  // Shift Row
  { code: 'ShiftLeft', displayLabel: 'L-SHIFT', capLabel: 'Shift', compactCapLabel: 'Shift', cfgName: 'shift', glfw: 'GLFW_KEY_LEFT_SHIFT', sdl2: 'SDL_SCANCODE_LSHIFT', win32: 'VK_LSHIFT' },
  { code: 'KeyZ', displayLabel: 'Z', cfgName: 'z', glfw: 'GLFW_KEY_Z', sdl2: 'SDL_SCANCODE_Z', win32: "'Z'" },
  { code: 'KeyX', displayLabel: 'X', cfgName: 'x', glfw: 'GLFW_KEY_X', sdl2: 'SDL_SCANCODE_X', win32: "'X'" },
  { code: 'KeyC', displayLabel: 'C', cfgName: 'c', glfw: 'GLFW_KEY_C', sdl2: 'SDL_SCANCODE_C', win32: "'C'" },
  { code: 'KeyV', displayLabel: 'V', cfgName: 'v', glfw: 'GLFW_KEY_V', sdl2: 'SDL_SCANCODE_V', win32: "'V'" },
  { code: 'KeyB', displayLabel: 'B', cfgName: 'b', glfw: 'GLFW_KEY_B', sdl2: 'SDL_SCANCODE_B', win32: "'B'" },
  { code: 'KeyN', displayLabel: 'N', cfgName: 'n', glfw: 'GLFW_KEY_N', sdl2: 'SDL_SCANCODE_N', win32: "'N'" },
  { code: 'KeyM', displayLabel: 'M', cfgName: 'm', glfw: 'GLFW_KEY_M', sdl2: 'SDL_SCANCODE_M', win32: "'M'" },
  { code: 'Comma', displayLabel: ',', subLabel: '<', cfgName: ',', glfw: 'GLFW_KEY_COMMA', sdl2: 'SDL_SCANCODE_COMMA', win32: 'VK_OEM_COMMA' },
  { code: 'Period', displayLabel: '.', subLabel: '>', cfgName: '.', glfw: 'GLFW_KEY_PERIOD', sdl2: 'SDL_SCANCODE_PERIOD', win32: 'VK_OEM_PERIOD' },
  { code: 'Slash', displayLabel: '/', subLabel: '?', cfgName: '/', glfw: 'GLFW_KEY_SLASH', sdl2: 'SDL_SCANCODE_SLASH', win32: 'VK_OEM_2' },
  { code: 'ShiftRight', displayLabel: 'R-SHIFT', capLabel: 'Shift', compactCapLabel: 'Shift', cfgName: 'rshift', glfw: 'GLFW_KEY_RIGHT_SHIFT', sdl2: 'SDL_SCANCODE_RSHIFT', win32: 'VK_RSHIFT' },

  // Bottom Row
  { code: 'ControlLeft', displayLabel: 'L-CTRL', capLabel: 'Ctrl', compactCapLabel: 'Ctrl', cfgName: 'ctrl', glfw: 'GLFW_KEY_LEFT_CONTROL', sdl2: 'SDL_SCANCODE_LCTRL', win32: 'VK_LCONTROL' },
  { code: 'MetaLeft', displayLabel: 'SUPER', capLabel: 'Win', compactCapLabel: 'Win', cfgName: 'lwin', glfw: 'GLFW_KEY_LEFT_SUPER', sdl2: 'SDL_SCANCODE_LGUI', win32: 'VK_LWIN' },
  { code: 'AltLeft', displayLabel: 'L-ALT', capLabel: 'Alt', compactCapLabel: 'Alt', cfgName: 'alt', glfw: 'GLFW_KEY_LEFT_ALT', sdl2: 'SDL_SCANCODE_LALT', win32: 'VK_LMENU' },
  { code: 'Space', displayLabel: 'SPACE', capLabel: 'Space', compactCapLabel: 'Space', cfgName: 'space', glfw: 'GLFW_KEY_SPACE', sdl2: 'SDL_SCANCODE_SPACE', win32: 'VK_SPACE' },
  { code: 'AltRight', displayLabel: 'R-ALT', capLabel: 'Alt', compactCapLabel: 'Alt', cfgName: 'ralt', glfw: 'GLFW_KEY_RIGHT_ALT', sdl2: 'SDL_SCANCODE_RALT', win32: 'VK_RMENU' },
  { code: 'Fn', displayLabel: 'FN', capLabel: 'Fn', compactCapLabel: 'Fn', cfgName: 'fn', glfw: 'GLFW_KEY_MENU', sdl2: 'SDL_SCANCODE_APPLICATION', win32: 'VK_APPS' },
  { code: 'ControlRight', displayLabel: 'R-CTRL', capLabel: 'Ctrl', compactCapLabel: 'Ctrl', cfgName: 'rctrl', glfw: 'GLFW_KEY_RIGHT_CONTROL', sdl2: 'SDL_SCANCODE_RCTRL', win32: 'VK_RCONTROL' },

  // Navigation & Arrows
  { code: 'PrintScreen', displayLabel: 'PRTSC', capLabel: 'PrtSc', compactCapLabel: 'Prt', cfgName: 'prtscr', glfw: 'GLFW_KEY_PRINT_SCREEN', sdl2: 'SDL_SCANCODE_PRINTSCREEN', win32: 'VK_SNAPSHOT' },
  { code: 'ScrollLock', displayLabel: 'SCRLK', capLabel: 'ScrLk', compactCapLabel: 'Scr', cfgName: 'scrolllock', glfw: 'GLFW_KEY_SCROLL_LOCK', sdl2: 'SDL_SCANCODE_SCROLLLOCK', win32: 'VK_SCROLL' },
  { code: 'Pause', displayLabel: 'PAUSE', capLabel: 'Pause', compactCapLabel: 'Pau', cfgName: 'pause', glfw: 'GLFW_KEY_PAUSE', sdl2: 'SDL_SCANCODE_PAUSE', win32: 'VK_PAUSE' },
  { code: 'Insert', displayLabel: 'INS', capLabel: 'Ins', cfgName: 'ins', glfw: 'GLFW_KEY_INSERT', sdl2: 'SDL_SCANCODE_INSERT', win32: 'VK_INSERT' },
  { code: 'Home', displayLabel: 'HOME', capLabel: 'Home', cfgName: 'home', glfw: 'GLFW_KEY_HOME', sdl2: 'SDL_SCANCODE_HOME', win32: 'VK_HOME' },
  { code: 'PageUp', displayLabel: 'PGUP', capLabel: 'PgUp', cfgName: 'pgup', glfw: 'GLFW_KEY_PAGE_UP', sdl2: 'SDL_SCANCODE_PAGEUP', win32: 'VK_PRIOR' },
  { code: 'Delete', displayLabel: 'DEL', capLabel: 'Del', cfgName: 'del', glfw: 'GLFW_KEY_DELETE', sdl2: 'SDL_SCANCODE_DELETE', win32: 'VK_DELETE' },
  { code: 'End', displayLabel: 'END', capLabel: 'End', cfgName: 'end', glfw: 'GLFW_KEY_END', sdl2: 'SDL_SCANCODE_END', win32: 'VK_END' },
  { code: 'PageDown', displayLabel: 'PGDN', capLabel: 'PgDn', cfgName: 'pgdn', glfw: 'GLFW_KEY_PAGE_DOWN', sdl2: 'SDL_SCANCODE_PAGEDOWN', win32: 'VK_NEXT' },
  { code: 'ArrowUp', displayLabel: '↑', capLabel: '↑', cfgName: 'uparrow', glfw: 'GLFW_KEY_UP', sdl2: 'SDL_SCANCODE_UP', win32: 'VK_UP' },
  { code: 'ArrowDown', displayLabel: '↓', capLabel: '↓', cfgName: 'downarrow', glfw: 'GLFW_KEY_DOWN', sdl2: 'SDL_SCANCODE_DOWN', win32: 'VK_DOWN' },
  { code: 'ArrowLeft', displayLabel: '←', capLabel: '←', cfgName: 'leftarrow', glfw: 'GLFW_KEY_LEFT', sdl2: 'SDL_SCANCODE_LEFT', win32: 'VK_LEFT' },
  { code: 'ArrowRight', displayLabel: '→', capLabel: '→', cfgName: 'rightarrow', glfw: 'GLFW_KEY_RIGHT', sdl2: 'SDL_SCANCODE_RIGHT', win32: 'VK_RIGHT' },

  // Numpad Keys
  { code: 'NumLock', displayLabel: 'NUM', capLabel: 'Num', cfgName: 'numlock', glfw: 'GLFW_KEY_NUM_LOCK', sdl2: 'SDL_SCANCODE_NUMLOCKCLEAR', win32: 'VK_NUMLOCK' },
  { code: 'NumpadDivide', displayLabel: '/', capLabel: '/', cfgName: 'kp_slash', glfw: 'GLFW_KEY_KP_DIVIDE', sdl2: 'SDL_SCANCODE_KP_DIVIDE', win32: 'VK_DIVIDE' },
  { code: 'NumpadMultiply', displayLabel: '*', capLabel: '*', cfgName: 'kp_multiply', glfw: 'GLFW_KEY_KP_MULTIPLY', sdl2: 'SDL_SCANCODE_KP_MULTIPLY', win32: 'VK_MULTIPLY' },
  { code: 'NumpadSubtract', displayLabel: '-', capLabel: '-', cfgName: 'kp_minus', glfw: 'GLFW_KEY_KP_SUBTRACT', sdl2: 'SDL_SCANCODE_KP_MINUS', win32: 'VK_SUBTRACT' },
  { code: 'NumpadAdd', displayLabel: '+', capLabel: '+', cfgName: 'kp_plus', glfw: 'GLFW_KEY_KP_ADD', sdl2: 'SDL_SCANCODE_KP_ADD', win32: 'VK_ADD' },
  { code: 'NumpadEnter', displayLabel: 'ENT', capLabel: 'Enter', compactCapLabel: 'Ent', cfgName: 'kp_enter', glfw: 'GLFW_KEY_KP_ENTER', sdl2: 'SDL_SCANCODE_KP_ENTER', win32: 'VK_RETURN' },
  { code: 'NumpadDecimal', displayLabel: '.', capLabel: '.', subLabel: 'Del', cfgName: 'kp_del', glfw: 'GLFW_KEY_KP_DECIMAL', sdl2: 'SDL_SCANCODE_KP_PERIOD', win32: 'VK_DECIMAL' },
  { code: 'Numpad0', displayLabel: '0', capLabel: '0', subLabel: 'Ins', cfgName: 'kp_ins', glfw: 'GLFW_KEY_KP_0', sdl2: 'SDL_SCANCODE_KP_0', win32: 'VK_NUMPAD0' },
  { code: 'Numpad1', displayLabel: '1', capLabel: '1', subLabel: 'End', cfgName: 'kp_end', glfw: 'GLFW_KEY_KP_1', sdl2: 'SDL_SCANCODE_KP_1', win32: 'VK_NUMPAD1' },
  { code: 'Numpad2', displayLabel: '2', capLabel: '2', subLabel: '↓', cfgName: 'kp_downarrow', glfw: 'GLFW_KEY_KP_2', sdl2: 'SDL_SCANCODE_KP_2', win32: 'VK_NUMPAD2' },
  { code: 'Numpad3', displayLabel: '3', capLabel: '3', subLabel: 'PgDn', cfgName: 'kp_pgdn', glfw: 'GLFW_KEY_KP_3', sdl2: 'SDL_SCANCODE_KP_3', win32: 'VK_NUMPAD3' },
  { code: 'Numpad4', displayLabel: '4', capLabel: '4', subLabel: '←', cfgName: 'kp_leftarrow', glfw: 'GLFW_KEY_KP_4', sdl2: 'SDL_SCANCODE_KP_4', win32: 'VK_NUMPAD4' },
  { code: 'Numpad5', displayLabel: '5', capLabel: '5', cfgName: 'kp_5', glfw: 'GLFW_KEY_KP_5', sdl2: 'SDL_SCANCODE_KP_5', win32: 'VK_NUMPAD5' },
  { code: 'Numpad6', displayLabel: '6', capLabel: '6', subLabel: '→', cfgName: 'kp_rightarrow', glfw: 'GLFW_KEY_KP_6', sdl2: 'SDL_SCANCODE_KP_6', win32: 'VK_NUMPAD6' },
  { code: 'Numpad7', displayLabel: '7', capLabel: '7', subLabel: 'Home', cfgName: 'kp_home', glfw: 'GLFW_KEY_KP_7', sdl2: 'SDL_SCANCODE_KP_7', win32: 'VK_NUMPAD7' },
  { code: 'Numpad8', displayLabel: '8', capLabel: '8', subLabel: '↑', cfgName: 'kp_uparrow', glfw: 'GLFW_KEY_KP_8', sdl2: 'SDL_SCANCODE_KP_8', win32: 'VK_NUMPAD8' },
  { code: 'Numpad9', displayLabel: '9', capLabel: '9', subLabel: 'PgUp', cfgName: 'kp_pgup', glfw: 'GLFW_KEY_KP_9', sdl2: 'SDL_SCANCODE_KP_9', win32: 'VK_NUMPAD9' },
];

export const SCANCODE_MAP: Record<string, KeycapScancodeEntry> = Object.fromEntries(
  ENTRIES.map((e) => [e.code, e]),
);

export const ALL_SCANCODES: KeycapScancodeEntry[] = ENTRIES;

export function getScancode(code: string): KeycapScancodeEntry {
  return (
    SCANCODE_MAP[code] ?? {
      code,
      displayLabel: code.replace(/^Key/, '').toUpperCase(),
      capLabel: code.replace(/^Key/, '').toUpperCase(),
      cfgName: code.replace(/^Key/, '').toLowerCase(),
      glfw: `GLFW_KEY_${code.replace(/^Key/, '').toUpperCase()}`,
      sdl2: `SDL_SCANCODE_${code.replace(/^Key/, '').toUpperCase()}`,
      win32: `VK_${code.replace(/^Key/, '').toUpperCase()}`,
    }
  );
}

export interface ResolvedKeycapLegend {
  primary: string;
  secondary?: string;
  arrowDir?: 'up' | 'down' | 'left' | 'right';
  secondaryArrowDir?: 'up' | 'down' | 'left' | 'right';
  isSpaceBar: boolean;
}

const ARROW_BY_CODE: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

const ARROW_BY_SYMBOL: Record<string, 'up' | 'down' | 'left' | 'right'> = {
  '↑': 'up',
  '↓': 'down',
  '←': 'left',
  '→': 'right',
};

/**
 * Dynamically resolves keycap typography directly from the canonical scancode registry,
 * adapting cleanly to key physical width/height, keyboard layout, and active legend mode.
 */
export function resolveKeycapLegend(
  code: string,
  options: {
    keyWidthU: number;
    keyHeightU?: number;
    layoutId?: KeyboardModelId;
    legendMode?: KeycapLegendMode;
  },
): ResolvedKeycapLegend {
  const entry = getScancode(code);
  const mode = options.legendMode ?? 'standard';
  const wU = options.keyWidthU;
  const hU = options.keyHeightU ?? 1;
  const isNarrow = wU <= 1.25;

  if (mode === 'glfw') {
    const shortGlfw = entry.glfw.replace(/^GLFW_KEY_/, '');
    return {
      primary: shortGlfw,
      secondary: undefined,
      isSpaceBar: false,
    };
  }

  if (mode === 'cfg') {
    return {
      primary: entry.cfgName,
      secondary: undefined,
      isSpaceBar: false,
    };
  }

  // Standard physical keycap legend mode — dynamically derived from scancode table
  const arrowDir = ARROW_BY_CODE[code];
  const isSpaceBar = code === 'Space';

  let primary = entry.capLabel ?? entry.displayLabel;
  if (isNarrow && entry.compactCapLabel) {
    // 2U tall NumpadEnter has ample vertical space for "Enter", while 1U keys use compact label (e.g. "Bksp")
    if (!(code === 'NumpadEnter' && hU >= 2)) {
      primary = entry.compactCapLabel;
    }
  } else if (code === 'CapsLock' && wU < 1.85) {
    primary = entry.compactCapLabel ?? 'Caps';
  } else if (code === 'Backspace' && wU < 1.85) {
    primary = entry.compactCapLabel ?? 'Bksp';
  }

  // On left-hand gaming keypad, omit secondary shift symbols on digits for cleaner tactical look
  const hideSubOnKeypad = options.layoutId === 'keypadLeft' && code.startsWith('Digit');
  const rawSub = hideSubOnKeypad ? undefined : entry.subLabel;
  const secondaryArrowDir = rawSub ? ARROW_BY_SYMBOL[rawSub] : undefined;

  return {
    primary,
    secondary: secondaryArrowDir ? undefined : rawSub,
    arrowDir,
    secondaryArrowDir,
    isSpaceBar,
  };
}
