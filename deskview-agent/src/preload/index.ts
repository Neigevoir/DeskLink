import { contextBridge, ipcRenderer } from 'electron';

interface ScreenSource {
  id: string;
  name: string;
  appIcon?: string;
}

interface ScreenSize {
  width: number;
  height: number;
}

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenSources: (): Promise<ScreenSource[]> => ipcRenderer.invoke('get-screen-sources'),
  getScreenSize: (): Promise<ScreenSize> => ipcRenderer.invoke('get-screen-size'),
  mouseMove: (ratioX: number, ratioY: number) =>
    ipcRenderer.invoke('control-mouse-move', ratioX, ratioY),
  mouseToggle: (action: 'down' | 'up', button: string) =>
    ipcRenderer.invoke('control-mouse-toggle', action, button),
  mouseClick: (button: string) =>
    ipcRenderer.invoke('control-mouse-click', button),
  mouseScroll: (deltaX: number, deltaY: number) =>
    ipcRenderer.invoke('control-mouse-scroll', deltaX, deltaY),
  keyToggle: (code: string, key: string, action: 'down' | 'up',
    shiftKey?: boolean, ctrlKey?: boolean, altKey?: boolean, metaKey?: boolean) =>
    ipcRenderer.invoke('control-key-toggle', code, key, action, shiftKey, ctrlKey, altKey, metaKey),
});
