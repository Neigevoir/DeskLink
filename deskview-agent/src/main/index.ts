import { app, BrowserWindow, desktopCapturer, ipcMain } from 'electron';
import path from 'path';
import robot from 'robotjs';

let mainWindow: BrowserWindow | null = null;

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

// ---- Key code mapping: browser event.code → robotjs key name ----

const CODE_TO_ROBOT: Record<string, string> = {
  Space: 'space', Enter: 'enter', Tab: 'tab', Escape: 'escape',
  Backspace: 'backspace', Delete: 'delete',
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Home: 'home', End: 'end', PageUp: 'pageup', PageDown: 'pagedown',
  CapsLock: 'capslock', NumLock: 'numlock', ScrollLock: 'scrolllock',
  Insert: 'insert', Pause: 'pause',
  ShiftLeft: 'shift', ShiftRight: 'shift',
  ControlLeft: 'control', ControlRight: 'control',
  AltLeft: 'alt', AltRight: 'alt',
  MetaLeft: 'command', MetaRight: 'command',
};

function codeToRobotKey(code: string, key: string): string {
  if (CODE_TO_ROBOT[code]) return CODE_TO_ROBOT[code];
  // F1-F24
  if (/^F\d+$/.test(code)) return code.toLowerCase();
  // Digit/Semicolon/etc → use the actual key character
  if (key.length === 1 && key !== ' ') return key;
  // Fallback
  return key.toLowerCase();
}

// ---- IPC handlers ----

function getScreenSize(): { width: number; height: number } {
  return robot.getScreenSize();
}

function moveMouse(ratioX: number, ratioY: number): void {
  const { width, height } = robot.getScreenSize();
  const x = Math.round(ratioX * width);
  const y = Math.round(ratioY * height);
  robot.moveMouse(x, y);
}

function mouseToggle(action: 'down' | 'up', button: string): void {
  const btn = button === 'right' ? 'right' : button === 'middle' ? 'middle' : 'left';
  robot.mouseToggle(action, btn);
}

function mouseClick(button: string): void {
  const btn = button === 'right' ? 'right' : button === 'middle' ? 'middle' : 'left';
  robot.mouseClick(btn);
}

function scrollMouse(deltaX: number, deltaY: number): void {
  robot.scrollMouse(deltaX, deltaY);
}

function keyToggle(code: string, key: string, action: 'down' | 'up',
  shiftKey?: boolean, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean): void {

  // Modifier key pressed by itself
  if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
       'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(code)) {
    const modName = CODE_TO_ROBOT[code] || code.toLowerCase();
    robot.keyToggle(modName, action === 'down' ? 'down' : 'up');
    return;
  }

  const dir = action === 'down' ? 'down' : 'up';
  const rk = codeToRobotKey(code, key);

  // Press modifiers first (on key-down) or last (on key-up)
  if (action === 'down') {
    if (shiftKey) robot.keyToggle('shift', 'down');
    if (ctrlKey) robot.keyToggle('control', 'down');
    if (altKey) robot.keyToggle('alt', 'down');
    if (metaKey) robot.keyToggle('command', 'down');
  }

  try {
    robot.keyToggle(rk, dir);
  } catch {
    // Not a recognized key — try typing the character directly
    if (action === 'down' && key.length === 1 && key !== ' ') {
      robot.typeString(key);
    }
  }

  if (action === 'up') {
    if (metaKey) robot.keyToggle('command', 'up');
    if (altKey) robot.keyToggle('alt', 'up');
    if (ctrlKey) robot.keyToggle('control', 'up');
    if (shiftKey) robot.keyToggle('shift', 'up');
  }
}

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 550,
    title: 'DeskLink Agent',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
  mainWindow.on('closed', () => { mainWindow = null; });
});

ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s): ScreenSource => ({ id: s.id, name: s.name, appIcon: s.appIcon?.toDataURL() }));
});

ipcMain.handle('get-screen-size', () => getScreenSize());

ipcMain.handle('control-mouse-move', (_event, ratioX: number, ratioY: number) => {
  moveMouse(ratioX, ratioY);
});

ipcMain.handle('control-mouse-toggle', (_event, action: 'down' | 'up', button: string) => {
  mouseToggle(action, button);
});

ipcMain.handle('control-mouse-click', (_event, button: string) => {
  mouseClick(button);
});

ipcMain.handle('control-mouse-scroll', (_event, deltaX: number, deltaY: number) => {
  scrollMouse(deltaX, deltaY);
});

ipcMain.handle('control-key-toggle', (_event, code: string, key: string, action: 'down' | 'up',
  shiftKey?: boolean, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean) => {
  keyToggle(code, key, action, shiftKey, ctrlKey, altKey, metaKey);
});

app.on('window-all-closed', () => { app.quit(); });
